# Plan y Reporte de Pruebas — [TS-15] Portal de Organización Verificadora y Certificaciones Multidimensionales

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-15]**, que implementa el sistema transversal y multidimensional de acreditación y certificación de méritos deportivos y biotipo para atletas juveniles en Talentus Scout.

### 1.1. Artefactos y Componentes Impactados
* **Base de Datos & Modelo Relacional (PostgreSQL):**
  * Extensión del enum `badge_type` para soportar `'SPORT_ACHIEVEMENT'` (títulos, trofeos de goleador, distinciones de torneos).
  * Creación de la tabla `certification_requests` con columnas:
    * `id`, `athlete_id`, `tutor_id`, `badge_type`, `method` (`TOKEN_LINK` / `DOCUMENT_UPLOAD`), `status` (`PENDING` / `APPROVED` / `REJECTED`).
    * `title`, `description`, `evidence_document_url`, `verification_token`, `token_expires_at`.
    * `target_email`, `target_name`, `target_organization`, `certifier_name`, `certifier_role`, `certifier_organization`, `certifier_license_number`.
    * `audit_ip`, `rejection_reason`, `created_at`, `verified_at`.
  * Índices de rendimiento: `idx_cert_req_athlete`, `idx_cert_req_token`, `idx_cert_req_status`.
* **Backend (Spring Boot 3 / Java 21 / Project Lombok):**
  * Entidad JPA: `CertificationRequest` modelada rigurosamente con anotaciones Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`).
  * Repositorio: `CertificationRequestRepository` con métodos de búsqueda por token, atleta y estado.
  * Extensión de `AthleteBadgeRepository`: método `existsByAthleteIdAndBadgeTypeAndStatus`.
  * `EmailService`: servicio de correo transaccional con plantilla HTML responsiva (`certification-invite.html`) y fallback resiliente para desarrollo (registro en consola si SMTP no está configurado).
  * `CertificationService`:
    * Generación de solicitud vía enlace con token criptográfico único (`UUID + SecureRandom`).
    * Carga de solicitud con documento probatorio para cola de auditoría de administradores.
    * Consulta pública de token sin autenticación con validación de caducidad y de un solo uso.
    * Aprobación instantánea al enviar formulario con token (generación automática de `AthleteBadge` verificado).
    * Revisión administrativa de documentos probatorios (`APPROVED` / `REJECTED`).
  * Lógica Biocertificada sin mutación de esquema:
    * `AthleteService` y `ScoutDirectoryService` detectan dinámicamente si el atleta posee insignia `MEDICAL_ANTHRO` aprobada y proyectan `medicalCertified: true` y `medicalCertifierInfo` en las respuestas DTO para scouts y público.
  * Endpoints REST:
    * `POST /api/v1/certifications/request/token` (Roles: `TUTOR`, `ADMIN`).
    * `POST /api/v1/certifications/request/document` (Roles: `TUTOR`, `ADMIN`).
    * `GET /api/v1/certifications/token/{token}` (Público, permitAll).
    * `POST /api/v1/certifications/token/{token}/submit` (Público, permitAll).
    * `GET /api/v1/certifications/athlete/{athleteId}` (Roles: `TUTOR`, `ADMIN`).
    * `GET /api/v1/admin/certifications/pending-documents` (Rol: `ADMIN`).
    * `POST /api/v1/admin/certifications/{id}/review` (Rol: `ADMIN`).
  * `SecurityConfig`: inclusión de `/api/v1/certifications/token/**` en rutas públicas de `SecurityFilterChain`.
* **Frontend (Angular 18+ / SSR):**
  * Modelos TypeScript: `certification.model.ts`, actualización en `athlete.model.ts` y `scout-directory.model.ts`.
  * Servicio: `certification.service.ts` con clientes HTTP para las rutas de tutor, pública y administración.
  * Componentes UI:
    * `PublicCertifierComponent` (`/certify/:token`): portal público standalone con validación de token, formulario para el profesional/entidad certificadora (nombre, cargo/colegiatura, institución, observaciones y declaración de fe de veracidad).
    * `RequestCertificationModalComponent`: diálogo interactivo para tutores con selector de 4 categorías y 2 vías de validación, con copiado rápido de enlace y soporte de envíos.
    * `TutorDashboardComponent`: botón "🏅 Certificar" en cada tarjeta de atleta representado y enlace directo al modal.
    * `BentoProfileComponent`: distinción de insignias de trofeo (`SPORT_ACHIEVEMENT`), insignias médicas y banner destacado de medidas corporales certificadas ("✓ Medidas Biométricas Certificadas").
    * `ScoutDirectoryComponent`: chip visible `🩺 Biometría Certificada` en las tarjetas de jugadores del radar para veedores.
  * Restricción Estricta de Diseño: **Cero presencia de la palabra "LOPNNA"** en botones, labels, badges o interfaces del usuario.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests

Comando ejecutado:
```bash
./mvnw test
```

#### Resultados del Conjunto de Pruebas:
```
[INFO] Tests run: 80, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

#### Desglose de Pruebas de Certificación:
1. **`CertificationServiceTest` (8/8 Pasadas):**
   * `requestCertificationWithToken_Success_SendsEmail`: Valida la creación de la solicitud con token, envío de correo y estado `PENDING`.
   * `requestCertificationWithDocument_Success_PendingAdmin`: Valida la persistencia de documento para cola de revisión administrativa.
   * `getPublicTokenCertification_Success_ReturnsValidDetails`: Valida la consulta pública del token y sus metadatos del atleta y tutor.
   * `getPublicTokenCertification_Expired_ThrowsException`: Valida que tokens expirados levanten `IllegalStateException` y error HTTP 400.
   * `getPublicTokenCertification_AlreadyCompleted_ThrowsException`: Valida que tokens ya utilizados no puedan ser consultados ni alterados.
   * `submitTokenCertification_Success_InstantlyApprovesAndCreatesBadge`: Valida la **aprobación instantánea** tras el envío por el certificador externo, guardando los datos de auditoría y creando la insignia `AthleteBadge`.
   * `adminReviewCertification_Approved_CreatesBadge`: Valida la revisión y aprobación por el Administrador con emisión de insignia oficial.
   * `adminReviewCertification_Rejected_UpdatesStatus`: Valida el rechazo con motivo documentado.

2. **`CertificationControllerIntegrationTest` (2/2 Pasadas):**
   * `getPublicTokenInfo_ValidToken_Returns200`: Valida el acceso no autenticado a `GET /api/v1/certifications/token/{token}`.
   * `submitTokenCertification_ValidData_Returns200`: Valida el envío exitoso de certificación externa con aprobación inmediata.

3. **Pruebas de Regresión Existentes (70/70 Pasadas):**
   * Auth, Scanners, Videos HLS, PDF, Auditoría de Scouts, Radar de Visualizaciones y Directorio mantuvieron el 100% de operatividad.

### 2.2. Frontend Build & Compilación Angular SSR

Comando ejecutado:
```bash
npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` con 0 errores de TypeScript y plantillas).
* Generación del chunk perezoso independiente `public-certifier-component` (`17.42 kB`).
* Prerenderizado de rutas completado satisfactoriamente.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Flujo A: Certificación Instantánea Vía Enlace con Token (Sin Registro)

#### Paso 1: El Tutor solicita la certificación médica
```bash
curl -s -X POST http://localhost:8080/api/v1/certifications/request/token \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "badgeType": "MEDICAL_ANTHRO",
    "title": "Evaluación Antropométrica Oficial 2026",
    "description": "Certificación de estatura 176 cm y peso 68 kg para ficha de scouting",
    "targetEmail": "dr.pediatra@clinica.com",
    "targetName": "Dr. Carlos Mendoza",
    "targetOrganization": "Centro Médico Deportivo La Trinidad"
  }' | jq .
```
*Respuesta esperada:* Objeto JSON con el token generado, enlace público y notificación de envío por correo electrónico.

#### Paso 2: El Certificador Externo abre el enlace (Simulación de `/certify/:token`)
```bash
curl -s -X GET http://localhost:8080/api/v1/certifications/token/<TOKEN_GENERADO> | jq .
```
*Respuesta esperada (HTTP 200 OK):*
```json
{
  "token": "<TOKEN_GENERADO>",
  "badgeType": "MEDICAL_ANTHRO",
  "title": "Evaluación Antropométrica Oficial 2026",
  "athleteName": "Nombre Atleta",
  "athleteAge": 15,
  "tutorName": "Nombre Tutor",
  "targetOrganization": "Centro Médico Deportivo La Trinidad",
  "expired": false,
  "alreadyCompleted": false
}
```

#### Paso 3: El Certificador envía la validación (Aprobación Instantánea)
```bash
curl -s -X POST http://localhost:8080/api/v1/certifications/token/<TOKEN_GENERADO>/submit \
  -H "Content-Type: application/json" \
  -d '{
    "certifierName": "Dr. Carlos Mendoza",
    "certifierRole": "Médico Pediatra y Deportólogo",
    "certifierOrganization": "Centro Médico Deportivo La Trinidad",
    "certifierLicenseNumber": "MPPS-89421 / CMD-1423",
    "comments": "Constato en consulta médica que el atleta presenta estatura de 176 cm y peso de 68.2 kg.",
    "affirmationStatement": true
  }' | jq .
```
*Respuesta esperada (HTTP 200 OK):* Estado `APPROVED`, marca temporal y emisión de insignia oficial en la base de datos.

#### Paso 4: Consulta del Perfil Público y Verificación de Datos Biocertificados
```bash
curl -s -X GET http://localhost:8080/api/v1/public/athletes/<SLUG_ATLETA> | jq '.metrics, .badges'
```
*Resultado verificado:*
* `metrics.medicalCertified` = `true`.
* `metrics.medicalCertifierInfo` = Contiene el nombre del médico y su número de colegiatura.
* `badges` contiene la insignia oficial de tipo `MEDICAL_ANTHRO`.

---

### 3.2. Flujo B: Certificación Deportiva / Torneo (`SPORT_ACHIEVEMENT`)

1. El tutor selecciona "Logro & Palmarés" (trofeo 🏆) y completa los datos de la liga o asociación deportiva.
2. La liga ingresa al portal con el token recibido y ratifica el premio otorgado (ej. "Campeón Distrital Sub-15" o "Máximo Goleador").
3. Al enviar la certificación, el perfil del atleta despliega la insignia con diseño dorado de trofeo y validación oficial.

---

## 4. Matriz de Cumplimiento de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Verificación |
|---|:---:|---|
| **Soporte de categorías transversales** (Médica, Logros, Federación, Club) | **CUMPLIDO** | `BadgeType` ampliado con `SPORT_ACHIEVEMENT`, modal de 4 categorías en Angular y soporte en entidades backend. |
| **Opción A: Validación con Token sin registro** | **CUMPLIDO** | Ruta `/certify/:token`, endpoints `permitAll`, verificación con token criptográfico y aprobación instantánea. |
| **Opción B: Cero mutación en tabla `athletes`** | **CUMPLIDO** | DDL intacto en `athletes`. `AthleteService` y `ScoutDirectoryService` calculan `medicalCertified` dinámicamente mediante queries optimizadas. |
| **Opción C: Nueva insignia de logros deportivos** | **CUMPLIDO** | Insignia `SPORT_ACHIEVEMENT` con diseño visual enriquecido (icono de trofeo, gradiente dorado sutil). |
| **Opción D: Servicio de correo personalizado con fallback** | **CUMPLIDO** | `EmailService` con plantilla HTML `certification-invite.html`, reemplazo de tokens y log resiliente en consola si el servidor SMTP está inactivo. |
| **Auditoría completa de certificadores** | **CUMPLIDO** | Registro de nombre, cargo, colegiatura médica/deportiva, organización, dirección IP y marca temporal en `certification_requests`. |
| **Directiva de Backend: Project Lombok estricto** | **CUMPLIDO** | Entidad `CertificationRequest` y todos los DTOs implementados con `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`. |
| **Directiva de Diseño UI: Cero uso de "LOPNNA"** | **CUMPLIDO** | Búsqueda exhaustiva confirma 0 ocurrencias en botones, etiquetas, modales y textos visibles al usuario. |
| **Compilación y suite de pruebas libre de errores** | **CUMPLIDO** | 80 pruebas de backend pasadas (0 errores), frontend compilado con éxito (0 errores). |

---

## 5. Casos Borde y Seguridad Validados

1. **Tokens de un solo uso:** Si un certificador intenta ingresar al enlace después de haberlo completado, recibe un mensaje claro de que la solicitud ya fue procesada y no puede ser modificada.
2. **Tokens vencidos (Caducidad de 15 días):** El backend rechaza peticiones sobre tokens expirados, impidiendo aprobaciones fuera de término.
3. **Seguridad y permisos de endpoints:** Rutas de tutor (`/api/v1/certifications/request/**`) exigen JWT autenticado y pertenencia de la patria potestad del atleta. Rutas administrativas (`/api/v1/admin/certifications/**`) requieren rol `ADMIN`.
4. **Resiliencia de correo en desarrollo:** Si `MAIL_ENABLED=false` o no hay credenciales SMTP en local, el sistema no aborta la transacción; registra la URL de certificación de forma segura en los logs de la aplicación.
