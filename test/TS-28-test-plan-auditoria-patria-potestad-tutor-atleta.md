# Plan de Pruebas: [TS-28] Panel Administrativo de Auditoría y Verificación de Documentación Legal y Patria Potestad (Tutor vs Atleta)

**ID Tarea:** TS-28  
**Fecha:** 2026-10-13  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la integridad técnica y jurídica del nuevo módulo de auditoría de patria potestad conforme a la normativa LOPNNA (Art. 65) y directivas FIFA sobre protección integral a la infancia y adolescencia en el deporte.

### Componentes Impactados
* **Base de Datos:** Migración DDL dbmate (`20261013140000_add_athlete_legal_verification_and_patria_potestad.sql`) con columnas `legal_verification_status`, `legal_verification_notes`, `legal_verified_by`, `legal_verified_at` e índice en `athletes`.
* **Entidades y DTOs Backend:** `Athlete`, `LegalVerificationStatus`, `LegalVerificationPendingItemResponse`, `ReviewLegalVerificationRequest`, `LegalVerificationReviewResponse`, `AthleteResponse`.
* **Servicios y Repositorios Backend:** `LegalVerificationService`, `AthleteRepository`, `AthleteService`, `AthleteSpecifications`, `ScoutDirectoryService`, `EmailService`.
* **Controlador REST:** `AdminLegalVerificationController` en `/api/v1/admin/legal-verifications`.
* **Frontend Angular 18+:**
  * Servicio `AdminLegalVerificationService`.
  * Componente Standalone `AdminLegalVerificationComponent` (`.component.ts`, `.component.html`, `.component.css`).
  * Modal Split-View (lado a lado) de inspección documental con zoom interactivo.
  * Rutas y guards (`/admin/verificacion-legal`).
  * Barra de navegación y acceso cruzado en `admin-scouts` y `admin-payments`.
  * Badges y alertas de feedback en `TutorDashboardComponent`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=AdminLegalVerificationControllerIntegrationTest,AthletePublicControllerTest,ScoutDirectoryIntegrationTest
```

#### Resultados por Suite:
| Suite de Pruebas | Tests Ejecutados | Tests Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `AdminLegalVerificationControllerIntegrationTest` | 7 | 7 | 0 | PASSED |
| `AthletePublicControllerTest` | 4 | 4 | 0 | PASSED |
| `ScoutDirectoryIntegrationTest` | 9 | 9 | 0 | PASSED |
| **Total** | **20** | **20** | **0** | **100% OK** |

#### Casos de Prueba Verificados:
1. `getPendingVerifications_AsAdmin_ShouldReturn200AndPage`: Lista solicitudes de atletas en `PENDING_REVIEW` con documentos cargados.
2. `getPendingVerifications_AsTutor_ShouldReturn403Forbidden`: Valida rechazo con `403 Forbidden` ante intentos de acceso por tutores.
3. `getVerificationMetrics_AsAdmin_ShouldReturnMetrics`: Retorna conteos precisos de pendientes, aprobados y rechazados.
4. `getVerificationDetail_AsAdmin_ShouldReturnDetail`: Retorna expedientes consolidados de tutor y atleta con URLs de documentos.
5. `reviewVerification_Approve_ShouldSetStatusApprovedAndAuditFields`: Actualiza a `APPROVED`, asocia auditor y timestamp, y despacha correo.
6. `reviewVerification_RejectWithoutNotes_ShouldReturn400BadRequest`: Valida que el motivo de rechazo sea mandatorio (`400 Bad Request`).
7. `reviewVerification_RejectWithNotes_ShouldSetStatusRejectedAndAuditFields`: Actualiza a `REJECTED`, almacena notas y despacha correo informativo.
8. `getPublicAthleteBySlug_WhenLegalVerificationPending_Returns404NotFound`: Atleta sin patria potestad aprobada no se expone públicamente.
9. `getDirectory_WhenLegalVerificationNotApproved_DoesNotAppearInDirectory`: Atleta sin patria potestad aprobada queda excluido del Directorio de Scouts.

### 2.2. Frontend (Angular 18+ / Build Validation)
Comando ejecutado:
```bash
npm run build
```
* **Resultado:** Compilación exitosa de bundles cliente y servidor SSR (`main.js`, `admin-legal-verification-component`, 11 rutas prerenderizadas) con 0 errores.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Pruebas mediante API cURL

#### 1. Consultar cola de auditoría de patria potestad (Admin)
```bash
curl -X GET "http://localhost:8080/api/v1/admin/legal-verifications/pending?page=0&size=10" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
* **Respuesta Esperada (`200 OK`):**
```json
{
  "content": [
    {
      "athleteId": "1d0ceff3-3363-4555-89ff-f197091bd9ea",
      "athleteFullName": "Mateo Pérez",
      "athleteDocType": "PARTIDA_NACIMIENTO",
      "athleteDocNumber": "PN-2011-8899",
      "athleteDocFileUrl": "http://localhost:8080/uploads/identity-documents/athletes/...",
      "tutorFullName": "Carlos Pérez",
      "tutorDocType": "CEDULA",
      "tutorDocNumber": "V-18765432",
      "tutorDocFileUrl": "http://localhost:8080/uploads/identity-documents/tutors/...",
      "status": "PENDING_REVIEW"
    }
  ],
  "totalElements": 1
}
```

#### 2. Intento de auditoría por un tutor (Seguridad)
```bash
curl -X GET "http://localhost:8080/api/v1/admin/legal-verifications/pending" \
  -H "Authorization: Bearer <TUTOR_JWT_TOKEN>"
```
* **Respuesta Esperada:** `403 Forbidden`.

#### 3. Rechazar documentación sin indicar motivo (Validación de Negocio)
```bash
curl -X POST "http://localhost:8080/api/v1/admin/legal-verifications/<ATHLETE_ID>/review" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "REJECTED", "notes": ""}'
```
* **Respuesta Esperada:** `400 Bad Request` con mensaje `"El motivo de observación o rechazo es obligatorio para notificar al representante legal."`.

#### 4. Rechazar documentación con motivo legítimo
```bash
curl -X POST "http://localhost:8080/api/v1/admin/legal-verifications/<ATHLETE_ID>/review" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "REJECTED", "notes": "Copia de partida de nacimiento ilegible en la sección de filiación materna."}'
```
* **Respuesta Esperada (`200 OK`):**
```json
{
  "athleteId": "<ATHLETE_ID>",
  "decision": "REJECTED",
  "notes": "Copia de partida de nacimiento ilegible en la sección de filiación materna.",
  "message": "Solicitud de patria potestad observada y notificada al representante legal."
}
```

#### 5. Aprobar patria potestad
```bash
curl -X POST "http://localhost:8080/api/v1/admin/legal-verifications/<ATHLETE_ID>/review" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "APPROVED", "notes": "Cotejo documental de patria potestad validado."}'
```
* **Respuesta Esperada (`200 OK`):**
```json
{
  "athleteId": "<ATHLETE_ID>",
  "decision": "APPROVED",
  "message": "Patria potestad y representación legal aprobada con éxito."
}
```

### 3.2. Verificación en Interfaz de Usuario (UI / Frontend)
1. **Acceso y Navegación:**
   * Iniciar sesión como Administrador (`admin@talentus.app`).
   * Verificar en la barra superior el nuevo enlace **"Patria Potestad"** junto a Scouts y Pagos.
   * Navegar a `/admin/verificacion-legal`.
2. **Consola Bento y Tabla:**
   * Comprobar que los contadores Bento reflejan solicitudes pendientes, aprobadas y observadas.
   * Filtrar o buscar atletas en vivo por nombre o cédula.
3. **Modal Split-View de Cotejo:**
   * Hacer clic en "Auditar Documentos".
   * Verificar el despliegue del modal de pantalla completa con dos columnas:
     * **Izquierda:** Ficha del Tutor + Visor de Cédula/DNI con controles de zoom.
     * **Derecha:** Ficha del Atleta + Visor de Partida de Nacimiento con controles de zoom.
4. **Acción de Rechazo y Panel del Tutor:**
   * Hacer clic en "Observar / Rechazar", ingresar un motivo y confirmar.
   * Iniciar sesión con la cuenta del tutor afectado e ir a `/dashboard`.
   * Verificar que en la tarjeta del atleta se muestra el badge `❌ DOCUMENTACIÓN OBSERVADA` junto a la caja de alerta que contiene el motivo exacto y el botón *"Subir Documento Corregido"*.
   * Al subir un documento nuevo o corregido, comprobar que el atleta pasa a `⏳ REVISIÓN LEGAL PENDIENTE` y vuelve a ingresar a la cola administrativa.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
|---|---|---|
| **DoD 1:** Migración dbmate ejecutada agregando `legal_verification_status`, notas, auditor y fecha a `athletes`. | **CUMPLIDO** | Migración `20261013140000` aplicada en PostgreSQL. |
| **DoD 2:** Endpoint `GET /api/v1/admin/legal-verifications/pending` protegido con `ROLE_ADMIN`. | **CUMPLIDO** | Verificado con status 200 para Admin y 403 para Tutor. |
| **DoD 3:** Endpoint `POST /api/v1/admin/legal-verifications/{athleteId}/review` actualiza estado y despacha correo. | **CUMPLIDO** | Verificado en test de integración con despacho de email real/mock. |
| **DoD 4:** Rechazo sin motivo especificado retorna `400 Bad Request`. | **CUMPLIDO** | Validado con prueba unitaria e integración. |
| **DoD 5:** Acceso denegado con `403 Forbidden` para tutores o scouts en API administrativa. | **CUMPLIDO** | Validado con `@PreAuthorize("hasRole('ADMIN')")`. |
| **DoD 6:** Vista Angular 18+ `/admin/verificacion-legal` accesible exclusivamente para administradores. | **CUMPLIDO** | Protegida con `[authGuard, adminGuard]`. |
| **DoD 7:** Visor comparativo funcional para archivos PDF e imágenes de ambos documentos en simultáneo. | **CUMPLIDO** | Modal Split-View con iframe e img zoom implementado. |
| **DoD 8:** El atleta requiere patria potestad `APPROVED` para ser visible ante scouts y en público. | **CUMPLIDO** | Tests `AthletePublicControllerTest` y `ScoutDirectoryIntegrationTest` en verde. |
| **DoD 9:** Re-subida de documento por el tutor reabre la auditoría a `PENDING_REVIEW`. | **CUMPLIDO** | Implementado en `AthleteService.uploadIdentityDocument`. |
| **DoD 10:** Documentación de plan de pruebas en `test/`. | **CUMPLIDO** | Documentado en este archivo. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas
* **Intentos de suplantación de identidad:** Cualquier atleta sin resolución aprobada queda bloqueado del radar público de scouts y del perfil público slug (retornando `404 Not Found`).
* **Formatos mixtos de documentos:** El visor maneja tanto archivos PDF embebidos como imágenes rasterizadas (JPG, PNG) con manipulación de zoom sin romper la relación de aspecto.
* **Trazabilidad:** Cada resolución almacena el UUID del administrador que emitió la decisión y el timestamp UTC exacto.
