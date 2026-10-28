# Plan de Implementación — [TS-15] Portal de Organización Verificadora y Certificaciones Multidimensionales

## 1. Identificación de la Tarea
* **ID:** `TS-15`
* **Título:** Portal de Organización Verificadora, Certificaciones Multidimensionales y Fast-Track Asistido
* **Enlace Trello:** [https://trello.com/c/r77ZtwBw](https://trello.com/c/r77ZtwBw) (Card ID: `6abbe1fc59fa32238729a3c9`)
* **Sprint:** Sprint 4 — Verificación Dual, Monetización Día 1 y Promoción a la Nube
* **Estado:** `in development`

---

## 2. Resumen y Contexto de Negocio

### 2.1. Justificación y Propósito
En el fútbol formativo y juvenil, la veracidad de los datos es el activo más valioso tanto para los reclutadores (scouts) como para las familias de los atletas. Un reclutador internacional o nacional desconfía de fichas donde la estatura, el peso, el club o los goles anotados puedan haber sido inflados por los padres.

Este módulo transforma el esquema original de verificación en una **red transversal y multidimensional de confianza**:
1. **Certificación Médica / Antropométrica (`MEDICAL_ANTHRO`):** Un médico pediatra, deportólogo o nutricionista avala estatura, peso, masa muscular y grasa corporal con su matrícula profesional.
2. **Certificación de Ficha & Afiliación Oficial (`FEDERATION_LICENSE`, `CLUB_AFFILIATION`):** Clubes, academias o federaciones ratifican la membresía federada y categoría oficial.
3. **Certificación de Logros & Palmarés Deportivo (`SPORT_ACHIEVEMENT`):** Asociaciones de fútbol (ej. AFDC) o comités de torneos avalan campeonatos, premios de goleador o selecciones regionales.

### 2.2. Las Dos Vías de Certificación para el Tutor Legal
Para no imponer barreras de entrada ni burocracia excesiva:
* **Vía 1 (Carga de Documento / Fast-Track Asistido):** El tutor sube una foto o PDF del carnet, informe médico o diploma de premiación. El `ADMIN` de Talentus Scout audita la evidencia y aprueba la insignia.
* **Vía 2 (Enlace Seguro con Token Unilateral por Correo):** El tutor ingresa el correo y nombre del certificador (doctor, liga, club). El backend genera un token criptográfico de un solo uso y envía un correo con un enlace `https://talentus.app/certify/{token}`. El certificador entra sin necesidad de crearse una cuenta previa, llena el formulario con sus datos profesionales (matrícula, cargo, avales) y la certificación se aprueba de inmediato con auditoría estricta.
* **Vía 3 (Portal de Organización Verificadora `VERIFIER_ORG`):** Las instituciones deportivas con cuenta activa pueden listar atletas afiliados y validar sus fichas directamente desde su portal.

### 2.3. Reglas de Protección al Menor y Directiva de Vocabulario UI
* **Cero uso de la palabra "LOPNNA" en la interfaz:** Todo texto visible para el usuario empleará términos institucionales como **"Representante Legal"**, **"Salvaguarda del Menor"** o **"Consentimiento Legal Activo"**.
* El contacto del certificador es gestionado a través de la plataforma sin exponer los canales privados de mensajería del menor.

---

## 3. Arquitectura y Modelo de Datos

### 3.1. DDL y Modificaciones en Base de Datos PostgreSQL

#### 3.1.1. Ampliación del Enum `badge_type`
Se agrega el valor `SPORT_ACHIEVEMENT` al tipo enumerado existente:
```sql
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'SPORT_ACHIEVEMENT';
```

#### 3.1.2. Tabla de Solicitudes y Tokens de Certificación (`certification_requests`)
```sql
CREATE TABLE IF NOT EXISTS certification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    badge_type badge_type NOT NULL,
    request_method VARCHAR(30) NOT NULL, -- 'DOCUMENT_UPLOAD', 'TOKEN_LINK', 'DIRECT_ORGANIZATION'
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
    title VARCHAR(150) NOT NULL,
    description TEXT,
    
    -- Vía 1: Documento
    evidence_document_url TEXT,
    reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Vía 2: Enlace por Email
    target_email VARCHAR(150),
    target_name VARCHAR(150),
    target_organization VARCHAR(150),
    token_hash VARCHAR(255) UNIQUE,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Datos certificados provistos por el certificador
    certifier_full_name VARCHAR(150),
    certifier_license_id VARCHAR(100), -- Matrícula médica, código federativo o cargo
    certifier_notes TEXT,
    certifier_ip VARCHAR(50),
    certification_data_json TEXT, -- JSON con estatura, peso, goles, torneo, etc.
    
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    badge_id UUID REFERENCES athlete_badges(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_req_athlete ON certification_requests(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_cert_req_token ON certification_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_cert_req_status ON certification_requests(status);
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Configuración de Entorno y Variables de Correo
En `application.yml`:
```yaml
spring:
  mail:
    host: ${MAIL_SERVER:localhost}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

talentus:
  mail:
    enabled: ${MAIL_ENABLED:false} # En false, simula y loguea en consola para dev local
    from: ${MAIL_FROM:no-reply@talentus.app}
    frontend-certify-url: ${FRONTEND_CERTIFY_URL:http://localhost:4200/certify}
```

### 4.2. Clases Backend Obligatorias

#### 4.2.1. Entidades de Dominio
1. Modificar [`BadgeType.java`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/enums/BadgeType.java):
   * Añadir `SPORT_ACHIEVEMENT`.
2. Crear `CertificationRequest.java`:
   * Ruta: `src/main/java/com/talentus/scout/domain/entity/CertificationRequest.java`
   * Anotaciones Lombok obligatorias: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`.

#### 4.2.2. Repositorios
1. `CertificationRequestRepository.java`:
   * Ruta: `src/main/java/com/talentus/scout/repository/CertificationRequestRepository.java`
   * Métodos:
     * `Optional<CertificationRequest> findByTokenHash(String tokenHash)`
     * `List<CertificationRequest> findByAthleteIdOrderByCreatedAtDesc(UUID athleteId)`
     * `List<CertificationRequest> findByStatusOrderByCreatedAtDesc(String status)`

#### 4.2.3. DTOs (con Lombok y validación Jakarta)
* `CreateDocumentCertificationRequest`:
  * `athleteId`, `badgeType`, `title`, `description`, `evidenceDocumentUrl`.
* `CreateTokenCertificationRequest`:
  * `athleteId`, `badgeType`, `title`, `description`, `targetEmail`, `targetName`, `targetOrganization`.
* `PublicTokenCertificationResponse`:
  * Datos que ve el certificador al abrir el link (nombre del atleta, categoría deportiva, tipo de certificación solicitada, expiración).
* `SubmitTokenCertificationRequest`:
  * `certifierFullName`, `certifierLicenseId`, `certifierNotes`, `certificationDataJson` (ej. `heightCm`, `weightKg`, `bodyFatPercent`, `goalsScored`, `tournamentName`).
* `AdminReviewCertificationRequest`:
  * `decision` (`APPROVE` / `REJECT`), `adminNotes`.
* `CertificationResponse`:
  * DTO detallado de la solicitud y su estado.
* Modificar `AthleteResponse` y `AthleteDirectoryItem`:
  * Añadir banderas de telemetría médica y deportiva:
    * `boolean medicalCertifiedMetrics` (true si existe insignia `MEDICAL_ANTHRO` aprobada).
    * `String medicalCertifierInfo`.

#### 4.2.4. Servicios
1. `EmailService.java`:
   * Envío de correos transaccionales en HTML con reemplazo de variables plantilla (`##RECIPIENT_NAME##`, `##ATHLETE_NAME##`, `##BADGE_TITLE##`, `##CERTIFICATION_LINK##`, etc.).
   * Si `mail.enabled` es `false` o no hay credenciales SMTP, registra el mensaje completo y la URL generada en logs `INFO` para facilitar las pruebas locales.
2. `CertificationService.java`:
   * Creación de solicitudes vía documento o token seguro.
   * Generación y validación de tokens únicos con expiración (14 días).
   * Proceso de certificación instantánea al someter el formulario por token (Opción A).
   * Creación automática de la entidad `AthleteBadge` en estado `APPROVED`.
   * Proceso de auditoría para Admin (Fast-Track de documentos).
   * Lógica de consulta de insignias y banderas de certificación médica para el perfil del atleta.

#### 4.2.5. Controladores REST
1. `CertificationController.java` (`/api/v1/certifications`):
   * `POST /api/v1/certifications/request-document`: Tutor solicita verificación subiendo documento.
   * `POST /api/v1/certifications/request-token`: Tutor solicita verificación generando enlace para correo.
   * `GET /api/v1/certifications/athlete/{athleteId}`: Tutor o Scout consulta solicitudes del atleta.
   * `GET /api/v1/certifications/token/{token}`: **Público (sin auth)** para que el certificador externo cargue el formulario.
   * `POST /api/v1/certifications/token/{token}/submit`: **Público (sin auth)** para que el certificador confirme y selle la certificación.
2. `AdminCertificationController.java` (`/api/v1/admin/certifications`):
   * `GET /api/v1/admin/certifications/pending`: Admin lista solicitudes de documentos pendientes.
   * `POST /api/v1/admin/certifications/{id}/review`: Admin aprueba o rechaza solicitud de documento.

---

## 5. Especificación Frontend (Angular 18+ Standalone & Bento Grid)

### 5.1. Modelos & Servicios TypeScript
* `certification.model.ts`: Tipos `CertificationRequest`, `BadgeType`, DTOs de formulario.
* `certification.service.ts`: Métodos HTTP para tutor, certificador público y admin.

### 5.2. Componentes UI a Implementar/Actualizar
1. **Modal de Solicitud de Certificación (`request-certification-modal`):**
   * Integrado en el Dashboard del Tutor y en la edición del atleta.
   * Paso 1: Selección de categoría (Médica, Ficha Federativa, Logro Deportivo).
   * Paso 2: Selección de vía (Cargar Documento PDF/Foto vs Enviar Enlace por Correo).
   * Paso 3: Formulario intuitivo con retroalimentación en tiempo real.
2. **Página Pública del Certificador (`/certify/:token`):**
   * Vista standalone minimalista y de alta confianza institucional.
   * No requiere login ni registro.
   * Muestra la tarjeta del atleta menor (nombre, categoría, club) y el formulario correspondiente:
     * Si es médica: Campos numéricos de estatura, peso, grasa corporal, matrícula médica y notas.
     * Si es deportiva/logro: Torneo, galardón, goles/reconocimiento, cargo federativo.
   * Botón de confirmación con estado de éxito tras enviar.
3. **Indicador de "Dato Médico Certificado" en Perfil Bento y Directorio:**
   * En [`bento-profile.component.html`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/public-profile/bento-profile.component.html):
     * Al lado de la estatura y peso, mostrar insignia con tooltip: `✓ Medidas Certificadas Médicamente por [Dr. Nombre / Institución]`.
     * En la sección de insignias, renderizar los nuevos badges de `SPORT_ACHIEVEMENT` con icono de trofeo/diploma dorado.
   * En [`scout-directory.component.html`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.html):
     * Mini-badge de "Médicamente Certificado" en la ficha del jugador para que los scouts prioricen perfiles con biometría verídica.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Automatizadas Backend
* `CertificationServiceTest`:
  * Creación de solicitud con token único y validación de expiración.
  * Certificación instantánea mediante token público: aprobación inmediata, guardado de IP/matrícula y generación del `AthleteBadge` en estado `APPROVED`.
  * Verificación de flags médicos en `AthleteResponse` sin alterar la tabla `athletes`.
  * Auditoría de Admin para solicitudes por documento.
* `CertificationControllerIntegrationTest`:
  * Flujo completo de solicitud por tutor con autenticación JWT.
  * Flujo sin autenticación para `GET /api/v1/certifications/token/{token}` y `POST /api/v1/certifications/token/{token}/submit`.
  * Acceso denegado a endpoints de admin para usuarios no autorizados.

### 6.2. Pruebas Manuales con cURL
* Generar solicitud de token vía `POST /api/v1/certifications/request-token`.
* Obtener el token del log o base de datos y consultar el formulario público con `GET /api/v1/certifications/token/{token}`.
* Enviar la certificación médica con `POST /api/v1/certifications/token/{token}/submit`.
* Verificar que en `GET /api/v1/athletes/slug/{slug}` el perfil retorne la nueva insignia y el flag `medicalCertifiedMetrics = true`.

---

## 7. Checklist de Implementación Paso a Paso

- [ ] **1. Base de Datos & DDL:**
  - [ ] Ejecutar `ALTER TYPE badge_type ADD VALUE 'SPORT_ACHIEVEMENT'` en PostgreSQL.
  - [ ] Crear tabla `certification_requests` con sus índices y llaves foráneas.
- [ ] **2. Backend - Modelo & Persistencia:**
  - [ ] Actualizar enum `BadgeType` con `SPORT_ACHIEVEMENT`.
  - [ ] Crear entidad `CertificationRequest` con Lombok (`@Getter`, `@Setter`, `@Builder`, etc.).
  - [ ] Crear `CertificationRequestRepository`.
- [ ] **3. Backend - Servicio de Correo & Configuración:**
  - [ ] Crear plantilla HTML de correo para certificación externa en `resources/templates/mail/certification-invite.html`.
  - [ ] Implementar `EmailService` con reemplazo de tags y modo simulación/desarrollo.
  - [ ] Configurar variables de entorno de correo en `application.yml`.
- [ ] **4. Backend - Lógica de Certificaciones & DTOs:**
  - [ ] Crear DTOs para solicitudes, token público y auditoría de admin.
  - [ ] Implementar `CertificationService` (Vía 1: Documento, Vía 2: Token Link, flags médicos).
  - [ ] Actualizar `AthleteService` y DTOs de salida para computar `medicalCertifiedMetrics`.
  - [ ] Implementar controladores `CertificationController` y `AdminCertificationController`.
  - [ ] Configurar permisos en `SecurityConfig` (permitir acceso público anónimo a `/api/v1/certifications/token/**`).
- [ ] **5. Backend - Pruebas Automatizadas:**
  - [ ] Escribir pruebas unitarias en `CertificationServiceTest`.
  - [ ] Escribir pruebas de integración en `CertificationControllerIntegrationTest`.
  - [ ] Ejecutar `./mvnw test` y garantizar 100% verde.
- [ ] **6. Frontend - Modelos & Servicios:**
  - [ ] Actualizar `athlete.model.ts` con `BadgeType` e indicadores médicos.
  - [ ] Crear `certification.model.ts` y `certification.service.ts`.
- [ ] **7. Frontend - Componentes & Vistas:**
  - [ ] Diseñar vista pública `/certify/:token` para certificadores externos sin login.
  - [ ] Crear modal de solicitud de certificación para tutores.
  - [ ] Actualizar `bento-profile.component` para mostrar insignias deportivas y sello médico en métricas.
  - [ ] Actualizar `scout-directory.component` con micro-insignia de biometría certificada.
  - [ ] Verificar estricto cumplimiento: cero "LOPNNA" en botones y labels.
- [ ] **8. Frontend - Build & Prerender:**
  - [ ] Ejecutar `npm run build` y asegurar 0 errores.
- [ ] **9. Cierre & Transición de Tarea:**
  - [ ] Generar reporte de pruebas en `test/TS-15-test-plan-certificaciones-multidimensionales.md`.
  - [ ] Mover tarjeta en Trello de `in development` a `in testing` y dejar comentario de entrega.

---

## 8. Criterios de Aceptación (DoD)

1. **Soporte Multidimensional:** Admite certificaciones médicas (`MEDICAL_ANTHRO`), federativas (`FEDERATION_LICENSE`, `CLUB_AFFILIATION`) y de logros deportivos (`SPORT_ACHIEVEMENT`).
2. **Doble Vía de Tutor Operativa:**
   * Vía 1: Carga de documento para revisión de administrador.
   * Vía 2: Enlace por correo con token único para certificador externo.
3. **Flujo de Token sin Fricción:** El certificador accede mediante `/certify/:token` sin login previo y su confirmación aprueba de inmediato la insignia (Opción A).
4. **Respaldo de Métricas sin Mutar Esquema:** La lógica de backend identifica si el atleta cuenta con datos antropométricos médicamente respaldados y lo comunica al frontend.
5. **Servicio de Correo Flexible:** Soporta variables de entorno SMTP y cuenta con fallback de logueo claro en entorno de desarrollo.
6. **Diseño Visual de Excelencia:** Cumple directrices de Bento Grid, diseño deportivo contemporáneo y cero uso de la palabra "LOPNNA" en la UI.
7. **Pruebas Completas:** Todas las pruebas unitarias y de integración pasan satisfactoriamente.
