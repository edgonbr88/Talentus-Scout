# Plan de Implementación: [TS-28] Panel Administrativo de Auditoría y Verificación de Documentación Legal y Patria Potestad (Tutor vs Atleta)

**ID Tarea:** TS-28  
**Tarjeta Trello:** [TS-28 en Trello](https://trello.com/c/330ac3c) (`6acc295aae83398a4330ac3c`)  
**Fecha:** 2026-10-13  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

### 1.1. ¿Qué problema resuelve esta tarea?
En la legislación de protección integral a la infancia y adolescencia en el ámbito deportivo (normativas FIFA sobre traspasos y exposición de menores, y leyes de protección como la LOPNNA Art. 65), se prohíbe taxativamente la exposición pública y el tratamiento de perfiles de deportistas menores de edad sin la acreditación indubitada de patria potestad o tutoría legal legítima.

En la tarea previa `TS-21`, se habilitó la carga y custodia criptográfica/segura de los documentos de identidad:
1. Del **Tutor** (Cédula de Identidad, DNI o Pasaporte en `tutor_legal_consents`).
2. Del **Menor de Edad** (Partida de Nacimiento o Cédula de Identidad en `athletes`).

Sin embargo, actualmente no existía una consola operativa para que el equipo legal y administrativo de Talentus Scout audite, coteje y contraste ambos documentos en paralelo (comprobando la concordancia de apellidos, mención de los progenitores en la partida de nacimiento y autenticidad del documento del representante) antes de avalar la titularidad jurídica de la cuenta.

### 1.2. Valor Aportado e Impacto Operativo
* **Seguridad Jurídica y Anti-Suplantación:** Blindaje total contra representantes no autorizados o intermediarios sin potestad legal sobre el atleta.
* **Salvaguarda LOPNNA / FIFA Mandatoria:** El atleta únicamente será visible en el Directorio de Scouts y en su perfil público si cuenta con su patria potestad en estado `APPROVED`.
* **Transparencia y Reversibilidad:** En caso de rechazo (`REJECTED`), el administrador registra obligatoriamente los motivos (ej. *"Partida ilegible", "Documento cortado", "No concuerda el nombre del tutor"*). El tutor recibe un correo automático con la explicación detallada y tiene habilitada la opción de re-subir el documento corregido en su panel, reabriendo automáticamente la auditoría a `PENDING_REVIEW`.

---

## 2. Alcance Técnico y Arquitectura

### 2.1. Componentes del Sistema Afectados
* **Base de Datos / Migraciones (`talentus-scout-migrations`):**
  * Nueva migración dbmate agregando las columnas `legal_verification_status`, `legal_verification_notes`, `legal_verified_by` y `legal_verified_at` a la tabla `athletes`, junto a su índice de búsqueda.
* **Backend (`talentus-scout-be` - Spring Boot 3 / Java 21 / Spring Security 6):**
  * Enum `LegalVerificationStatus` (`PENDING_REVIEW`, `APPROVED`, `REJECTED`).
  * Entidad JPA `Athlete` con mapeo de nuevos campos.
  * DTOs en `com.talentus.scout.web.dto.legal` modelados con anotaciones de Lombok y validaciones Jakarta.
  * Repositorio `AthleteRepository` con consultas optimizadas de auditoría.
  * Servicio `LegalVerificationService` con seguridad `@PreAuthorize("hasRole('ADMIN')")`.
  * Integración con `EmailService` para notificación transaccional de resolución (aprobación/rechazo).
  * Actualización en `AthleteService`: al re-subir documento tras rechazo, reajustar estado a `PENDING_REVIEW`.
  * Actualización en `AthleteSpecifications` y `ScoutDirectoryService`: filtrar obligatoriamente por `hasLegalVerificationApproved()`.
  * Actualización en `AthleteService.getPublicAthleteBySlug`: restringir visibilidad a atletas con patria potestad aprobada.
  * Controlador REST `AdminLegalVerificationController` en `/api/v1/admin/legal-verifications`.
* **Frontend (`talentus-scout-fe` - Angular 18+ Standalone):**
  * Servicio `AdminLegalVerificationService` en `core/services/`.
  * Módulo/Componente `AdminLegalVerificationComponent` (`.component.ts`, `.component.html`, `.component.css`) en `features/admin/legal-verification/`.
  * Modal interactivo Split-View (lado a lado) para inspección simultánea de documentos (Tutor vs Atleta) con zoom y soporte para PDF e imágenes (JPG/PNG).
  * Formulario de resolución: Aprobación de 1 clic y Rechazo con justificación obligatoria.
  * Rutas y Guards: `/admin/verificacion-legal` protegido con `[authGuard, adminGuard]`.
  * Navbar y navegación cruzada entre paneles administrativos (`Auditoría Scouts`, `Auditoría Pagos`, `Verificación Legal`).
  * `TutorDashboardComponent`: Insignias visuales de patria potestad (`🛡️ PATRIA POTESTAD VERIFICADA`, `⏳ REVISIÓN LEGAL PENDIENTE`, `❌ DOCUMENTACIÓN OBSERVADA`) con caja de feedback y botón para re-subir archivo si fue rechazado.

### 2.2. Dependencias con otras tareas
* **`TS-12`**: Panel de Auditoría de Scouts (reutilización de patrones de UI y seguridad).
* **`TS-21`**: Carga de Documentos de Identidad LOPNNA (fuente de datos de `id_document_file_url` en tutor y atleta).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

### 3.1. Archivo de Migración DDL
* **Ruta:** `talentus-scout-migrations/migrations/20261013140000_add_athlete_legal_verification_and_patria_potestad.sql`

```sql
-- migrate:up
-- 1. Agregar columnas de verificación legal y patria potestad en athletes
ALTER TABLE athletes
    ADD COLUMN IF NOT EXISTS legal_verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN IF NOT EXISTS legal_verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS legal_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS legal_verified_at TIMESTAMP WITH TIME ZONE;

-- 2. Crear índice para optimizar consultas de auditoría administrativa y directorio
CREATE INDEX IF NOT EXISTS idx_athletes_legal_verification_status ON athletes(legal_verification_status);

-- migrate:down
DROP INDEX IF EXISTS idx_athletes_legal_verification_status;

ALTER TABLE athletes
    DROP COLUMN IF EXISTS legal_verified_at,
    DROP COLUMN IF EXISTS legal_verified_by,
    DROP COLUMN IF EXISTS legal_verification_notes,
    DROP COLUMN IF EXISTS legal_verification_status;
```

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Paquete Canónico y Convenciones
* Raíz: `com.talentus.scout`
* **Directiva Obligatoria de Modelado:** Aplicar Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`) en todas las entidades, DTOs y modelos. Evitar getters/setters y constructores manuales extensos; instanciar mediante `.builder()`.

### 4.2. Clases y Componentes Backend a Crear o Modificar

#### A. Enum `LegalVerificationStatus`
* **Archivo:** `src/main/java/com/talentus/scout/domain/enums/LegalVerificationStatus.java`
* Valores:
  * `PENDING_REVIEW` (Documentos consignados o modificados, esperando auditoría legal).
  * `APPROVED` (Patria potestad y filiación verificadas exitosamente).
  * `REJECTED` (Documentación observada o inconsistente; requiere corrección).

#### B. Entidad JPA `Athlete` (Modificación)
* **Archivo:** `src/main/java/com/talentus/scout/domain/entity/Athlete.java`
* Nuevos campos:
  ```java
  @Enumerated(EnumType.STRING)
  @Builder.Default
  @Column(name = "legal_verification_status", nullable = false, length = 30)
  private LegalVerificationStatus legalVerificationStatus = LegalVerificationStatus.PENDING_REVIEW;

  @Column(name = "legal_verification_notes", columnDefinition = "TEXT")
  private String legalVerificationNotes;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "legal_verified_by")
  private User legalVerifiedBy;

  @Column(name = "legal_verified_at")
  private Instant legalVerifiedAt;
  ```

#### C. DTOs de Auditoría Legal
* **Paquete:** `com.talentus.scout.web.dto.legal`
* **`LegalVerificationPendingItemResponse.java`**:
  * Campos: `UUID athleteId`, `String athleteName`, `String athleteSlug`, `LocalDate birthDate`, `Integer athleteAge`, `String athleteDocType`, `String athleteDocNumber`, `String athleteDocFileUrl`, `UUID tutorId`, `String tutorName`, `String tutorEmail`, `String tutorPhone`, `String tutorDocType`, `String tutorDocNumber`, `String tutorDocFileUrl`, `Instant submittedAt`, `LegalVerificationStatus status`, `String notes`.
* **`ReviewLegalVerificationRequest.java`**:
  * Anotaciones: `@NotNull(message = "La decisión de auditoría es obligatoria") LegalVerificationStatus decision`, `String notes`.
* **`LegalVerificationReviewResponse.java`**:
  * Campos: `UUID athleteId`, `LegalVerificationStatus decision`, `String notes`, `String verifiedByEmail`, `Instant verifiedAt`, `String message`.

#### D. Actualización de `AthleteResponse.java`
* **Archivo:** `src/main/java/com/talentus/scout/web/dto/AthleteResponse.java`
* Agregar campos:
  * `LegalVerificationStatus legalVerificationStatus`
  * `String legalVerificationNotes`
  * `Instant legalVerifiedAt`
  * Actualizar constructor / builder para mapear desde `Athlete`.

#### E. Repositorio `AthleteRepository` (Modificación)
* **Archivo:** `src/main/java/com/talentus/scout/repository/AthleteRepository.java`
* Nuevas consultas:
  ```java
  @Query("SELECT a FROM Athlete a WHERE a.legalVerificationStatus = :status AND a.identityDocumentFileUrl IS NOT NULL ORDER BY a.updatedAt DESC")
  Page<Athlete> findPendingLegalVerifications(@Param("status") LegalVerificationStatus status, Pageable pageable);

  long countByLegalVerificationStatusAndIdentityDocumentFileUrlIsNotNull(LegalVerificationStatus status);
  ```

#### F. Servicio `LegalVerificationService` (Nuevo)
* **Archivo:** `src/main/java/com/talentus/scout/service/LegalVerificationService.java`
* Responsabilidades:
  * Inyectar: `AthleteRepository`, `TutorLegalConsentRepository`, `UserRepository`, `EmailService`.
  * `@Transactional(readOnly = true)`:
    * `Page<LegalVerificationPendingItemResponse> getPendingVerifications(Pageable pageable)`: Extrae los atletas en estado `PENDING_REVIEW` que tengan documento cargado, recupera el `TutorLegalConsent` más reciente del tutor con `id_document_file_url IS NOT NULL`, y ensambla el DTO de respuesta.
    * `LegalVerificationPendingItemResponse getVerificationDetail(UUID athleteId)`: Recupera el detalle completo para cotejo.
    * `Map<String, Object> getVerificationMetrics()`: Conteo de solicitudes pendientes, aprobadas y observadas.
  * `@Transactional`:
    * `LegalVerificationReviewResponse reviewVerification(UUID athleteId, ReviewLegalVerificationRequest request, String adminEmail)`:
      1. Validar existencia del atleta.
      2. Si `request.getDecision() == LegalVerificationStatus.REJECTED` y `request.getNotes() == null || request.getNotes().trim().isEmpty()`, lanzar `IllegalArgumentException("El motivo de observación/rechazo es obligatorio para notificar al representante legal.")`.
      3. Buscar al usuario administrador por `adminEmail`.
      4. Actualizar `athlete.setLegalVerificationStatus(request.getDecision())`, `athlete.setLegalVerificationNotes(request.getNotes())`, `athlete.setLegalVerifiedBy(adminUser)`, `athlete.setLegalVerifiedAt(Instant.now())`.
      5. Guardar entidad.
      6. Enviar notificación por correo al tutor: `emailService.sendLegalVerificationResolutionNotification(tutor.getEmail(), tutor.getFullName(), athlete.getFirstName() + " " + athlete.getLastName(), request.getDecision() == LegalVerificationStatus.APPROVED, request.getNotes())`.
      7. Retornar `LegalVerificationReviewResponse`.

#### G. Actualización en `AthleteService.java`
* **Archivo:** `src/main/java/com/talentus/scout/service/AthleteService.java`
* En `uploadIdentityDocument`:
  * Al subir un documento nuevo o corregido:
    ```java
    athlete.setLegalVerificationStatus(LegalVerificationStatus.PENDING_REVIEW);
    athlete.setLegalVerificationNotes(null);
    athlete.setLegalVerifiedBy(null);
    athlete.setLegalVerifiedAt(null);
    ```
* En `getPublicAthleteBySlug`:
  * Modificar condición de visibilidad:
    ```java
    if (!athlete.isPublic() || athlete.getLegalVerificationStatus() != LegalVerificationStatus.APPROVED) {
        throw new ResourceNotFoundException("El perfil del atleta no se encuentra disponible públicamente o requiere verificación de patria potestad.");
    }
    ```

#### H. Actualización en `AthleteSpecifications.java` y `ScoutDirectoryService.java`
* **Archivo:** `src/main/java/com/talentus/scout/specification/AthleteSpecifications.java`
  * Agregar método:
    ```java
    public static Specification<Athlete> hasLegalVerificationApproved() {
        return (root, query, cb) -> cb.equal(root.get("legalVerificationStatus"), LegalVerificationStatus.APPROVED);
    }
    ```
* **Archivo:** `src/main/java/com/talentus/scout/service/ScoutDirectoryService.java`
  * En `searchDirectory`:
    ```java
    Specification<Athlete> spec = Specification.where(AthleteSpecifications.isPublic())
            .and(AthleteSpecifications.hasActiveSubscription())
            .and(AthleteSpecifications.hasLegalVerificationApproved());
    ```

#### I. Actualización en `EmailService.java`
* **Archivo:** `src/main/java/com/talentus/scout/service/mail/EmailService.java`
* Agregar método `sendLegalVerificationResolutionNotification`:
  ```java
  public boolean sendLegalVerificationResolutionNotification(String toEmail, String tutorName, String athleteName, boolean approved, String reason)
  ```
  * En caso de aprobación: Notifica la emisión oficial del sello de Patria Potestad Verificada y activación en el Directorio de Scouts.
  * En caso de rechazo: Detalla el motivo redactado por el administrador y contiene un enlace directo a `https://talentus.app/dashboard` para re-subir la documentación requerida.

#### J. Controlador `AdminLegalVerificationController.java` (Nuevo)
* **Archivo:** `src/main/java/com/talentus/scout/web/controller/AdminLegalVerificationController.java`
* Rutas:
  * `@RequestMapping("/api/v1/admin/legal-verifications")`
  * `@PreAuthorize("hasRole('ADMIN')")`
  * `GET /pending`: Retorna `Page<LegalVerificationPendingItemResponse>`.
  * `GET /metrics`: Retorna métricas de verificación (`pendingCount`, `approvedCount`, `rejectedCount`).
  * `GET /{athleteId}`: Retorna `LegalVerificationPendingItemResponse`.
  * `POST /{athleteId}/review`: Procesa `ReviewLegalVerificationRequest` con `@Valid`.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)

### 5.1. Directivas de Diseño y Separación de Código
* **Directiva [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md):**
  * Paleta intencional: Dark Slate (`#0B0F19`, `#111827`, `#1F2937`), Acentos Esmeralda (`#10B981`, `#059669`) para aprobaciones y Carmesí (`#EF4444`, `#DC2626`) para rechazos y alertas.
  * Layout Bento Grid para el encabezado y métricas de auditoría.
  * Evitar modales genéricos con scroll roto: modal Split-View con altura fija (`max-height: 90vh`), scroll interno y visores con controles de zoom.
* **Separación Obligatoria de Plantillas:** Prohibido el uso de templates inline. Todo componente se estructurará con sus respectivos archivos `.component.ts`, `.component.html` y `.component.css`.

### 5.2. Componentes y Servicios Frontend

#### A. Servicio `AdminLegalVerificationService`
* **Archivo:** `src/app/core/services/admin-legal-verification.service.ts`
* Métodos:
  * `getPendingVerifications(page: number, size: number): Observable<Page<LegalVerificationItem>>`
  * `getVerificationMetrics(): Observable<VerificationMetrics>`
  * `getVerificationDetail(athleteId: string): Observable<LegalVerificationItem>`
  * `reviewVerification(athleteId: string, decision: 'APPROVED' | 'REJECTED', notes?: string): Observable<any>`

#### B. Componente `AdminLegalVerificationComponent`
* **Directorio:** `src/app/features/admin/legal-verification/`
* **Archivos:**
  * `admin-legal-verification.component.ts`
  * `admin-legal-verification.component.html`
  * `admin-legal-verification.component.css`
* **Funcionalidades:**
  * **Encabezado Bento de KPIs:** Solicitudes pendientes por auditar, atletas aprobados y observaciones emitidas.
  * **Barra de Herramientas:** Búsqueda en vivo por nombre del menor o del tutor, ordenamiento por antigüedad de solicitud, botón de recarga rápida.
  * **Tabla de Solicitudes:**
    * Fila por atleta con avatar, nombres completos, edad, fecha de envío, estado del tutor y botón "Auditar Documentos".
  * **Modal Split-View Comparativo (Lado a Lado):**
    * **Panel Izquierdo (Tutor Legal):**
      * Datos del tutor (Nombre, Correo, Teléfono, Tipo y Número de Documento).
      * Visor embebido de archivo (PDF en `<iframe>`/`<embed>` o imagen `<img>` con zoom y botón "Abrir original en pestaña").
    * **Panel Derecho (Atleta / Menor de Edad):**
      * Datos del atleta (Nombre completo, Fecha de nacimiento, Cédula/Partida, Posición).
      * Visor embebido de archivo (Partida de Nacimiento / Cédula) para corroborar nombres de los progenitores.
    * **Barra de Veredicto:**
      * Botón `Aprobar Patria Potestad` (Confirmación rápida en verde esmeralda).
      * Botón `Observar / Rechazar` (Abre panel colapsable con textarea para redactar el motivo obligatorio, con contador de caracteres y botón de confirmación en rojo carmesí).

#### C. Integración de Navegación y Navbar
* **`src/app/shared/components/navbar/navbar.component.html`**:
  * Agregar enlace administrativo:
    ```html
    @if (authService.isAdmin()) {
      <a routerLink="/admin/scouts" routerLinkActive="active" class="nav-link">Scouts</a>
      <a routerLink="/admin/pagos" routerLinkActive="active" class="nav-link">Pagos</a>
      <a routerLink="/admin/verificacion-legal" routerLinkActive="active" class="nav-link">Patria Potestad</a>
    }
    ```
* **Headers de `admin-scouts` y `admin-payments`**:
  * Añadir botón de navegación cruzada hacia `/admin/verificacion-legal`.
* **`src/app/app.routes.ts`**:
  * Registrar ruta protegida:
    ```typescript
    {
      path: 'admin/verificacion-legal',
      loadComponent: () => import('./features/admin/legal-verification/admin-legal-verification.component').then(m => m.AdminLegalVerificationComponent),
      canActivate: [authGuard, adminGuard],
      title: 'Auditoría de Patria Potestad y Documentación Legal — Talentus Scout'
    }
    ```

#### D. Actualización de `TutorDashboardComponent`
* **Archivos:**
  * `src/app/features/dashboard/tutor-dashboard.component.html`
  * `src/app/features/dashboard/tutor-dashboard.component.ts`
  * `src/app/features/dashboard/tutor-dashboard.component.css`
* **Mejoras:**
  * Nuevos badges en la tarjeta del atleta:
    * `🛡️ PATRIA POTESTAD VERIFICADA` (Verde esmeralda / `legalVerificationStatus === 'APPROVED'`).
    * `⏳ REVISIÓN LEGAL PENDIENTE` (Ámbar / `legalVerificationStatus === 'PENDING_REVIEW' && athlete.hasIdentityDocument`).
    * `❌ DOCUMENTACIÓN OBSERVADA` (Rojo carmesí / `legalVerificationStatus === 'REJECTED'`).
  * En caso de `REJECTED`:
    * Renderizar caja de alerta destacada con el motivo exacto registrado por el administrador: *"Observación del equipo legal: {{ athlete.legalVerificationNotes }}"*.
    * Mostrar botón *"Actualizar Documento del Atleta"* que reabre el modal de carga para reemplazar la partida/documento, restableciendo a `PENDING_REVIEW`.

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Automatizadas Backend (JUnit / MockMvc)
* Crear `AdminLegalVerificationControllerIntegrationTest.java`:
  * `getPendingVerifications_AsAdmin_ShouldReturn200AndPage()`
  * `getPendingVerifications_AsTutorOrScout_ShouldReturn403Forbidden()`
  * `reviewVerification_Approve_ShouldSetStatusApprovedAndAuditFields()`
  * `reviewVerification_RejectWithoutNotes_ShouldReturn400BadRequest()`
  * `reviewVerification_RejectWithNotes_ShouldSetStatusRejectedAndSendEmail()`
* Actualizar `ScoutDirectoryControllerTest`:
  * Verificar que un atleta sin `APPROVED` en `legalVerificationStatus` no aparece en los resultados de búsqueda.
* Actualizar `AthletePublicControllerTest`:
  * Verificar que un atleta sin `APPROVED` retorna `404 Not Found` en el endpoint `/api/v1/athletes/public/{slug}`.

### 6.2. Comandos cURL de Verificación Manual
```bash
# 1. Obtener cola de auditoría de patria potestad
curl -X GET "http://localhost:8080/api/v1/admin/legal-verifications/pending" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"

# 2. Rechazar sin motivo (Debe responder 400 Bad Request)
curl -X POST "http://localhost:8080/api/v1/admin/legal-verifications/<ATHLETE_UUID>/review" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "REJECTED", "notes": ""}'

# 3. Rechazar con motivo válido (Debe responder 200 OK y despachar email)
curl -X POST "http://localhost:8080/api/v1/admin/legal-verifications/<ATHLETE_UUID>/review" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "REJECTED", "notes": "La copia de la partida de nacimiento es borrosa y no permite cotejar el nombre de los padres."}'

# 4. Aprobar patria potestad (Debe responder 200 OK y despachar email)
curl -X POST "http://localhost:8080/api/v1/admin/legal-verifications/<ATHLETE_UUID>/review" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "APPROVED", "notes": "Cotejo validado con éxito."}'
```

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [ ] **Paso 1: Migración DDL dbmate**
  - [ ] Crear archivo `talentus-scout-migrations/migrations/20261013140000_add_athlete_legal_verification_and_patria_potestad.sql`.
  - [ ] Ejecutar `dbmate up` y verificar creación de columnas e índice en tabla `athletes`.
- [ ] **Paso 2: Modelos Backend y Entidades**
  - [ ] Crear enum `LegalVerificationStatus` en `domain/enums/`.
  - [ ] Modificar `Athlete.java` incorporando `legalVerificationStatus`, `legalVerificationNotes`, `legalVerifiedBy` y `legalVerifiedAt`.
  - [ ] Crear DTOs: `LegalVerificationPendingItemResponse`, `ReviewLegalVerificationRequest`, `LegalVerificationReviewResponse` en `web/dto/legal/`.
  - [ ] Actualizar `AthleteResponse.java` con los nuevos campos de auditoría.
- [ ] **Paso 3: Servicios y Repositorios Backend**
  - [ ] Modificar `AthleteRepository` con métodos de consulta para auditoría pendiente y métricas.
  - [ ] Crear `LegalVerificationService` con lógica de consulta, validación de motivos de rechazo, actualización atómica y despacho de correo.
  - [ ] Modificar `AthleteService.uploadIdentityDocument` para reiniciar estado a `PENDING_REVIEW` cuando el tutor sube un documento nuevo o corregido.
  - [ ] Modificar `AthleteService.getPublicAthleteBySlug` para exigir `APPROVED`.
  - [ ] Modificar `AthleteSpecifications` y `ScoutDirectoryService` para requerir `APPROVED` en las búsquedas de scouts.
  - [ ] Extender `EmailService` con el método `sendLegalVerificationResolutionNotification`.
- [ ] **Paso 4: Controlador REST y Seguridad**
  - [ ] Crear `AdminLegalVerificationController` en `/api/v1/admin/legal-verifications` con seguridad `hasRole('ADMIN')`.
  - [ ] Validar compilación backend con `./mvnw test-compile`.
- [ ] **Paso 5: Frontend - Servicio y Componente de Auditoría**
  - [ ] Crear `AdminLegalVerificationService` en `core/services/admin-legal-verification.service.ts`.
  - [ ] Crear `AdminLegalVerificationComponent` en `features/admin/legal-verification/` con archivos `.ts`, `.html` y `.css` independientes.
  - [ ] Diseñar el modal split-view interactivo con visor dual (Tutor vs Atleta) y botones de acción rápida.
  - [ ] Incorporar ruta en `app.routes.ts` con `[authGuard, adminGuard]`.
  - [ ] Actualizar navbar y navegación cruzada en `admin-scouts` y `admin-payments`.
- [ ] **Paso 6: Frontend - Actualización de Panel del Tutor**
  - [ ] Modificar `TutorDashboardComponent` para mostrar los badges de patria potestad.
  - [ ] Agregar panel de observación con feedback del motivo de rechazo y habilitación de re-subida de archivo.
- [ ] **Paso 7: Pruebas y Validación**
  - [ ] Crear y ejecutar `AdminLegalVerificationControllerIntegrationTest`.
  - [ ] Ejecutar suite de pruebas `./mvnw test` y `npm test`.
  - [ ] Redactar plan de pruebas en `test/TS-28-test-plan-auditoria-patria-potestad-tutor-atleta.md`.
  - [ ] Mover tarjeta en Trello de `in development` a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [ ] **DoD 1:** Migración de base de datos con dbmate ejecutada exitosamente agregando campos de auditoría legal a `athletes`.
- [ ] **DoD 2:** Endpoints `/api/v1/admin/legal-verifications/pending`, `/{athleteId}` y `/{athleteId}/review` implementados y estrictamente protegidos para administradores (`ROLE_ADMIN`).
- [ ] **DoD 3:** El rechazo de una solicitud sin motivo explícito es rechazado con `400 Bad Request`.
- [ ] **DoD 4:** Al aprobar o rechazar, el tutor recibe automáticamente un correo informativo detallando la resolución y los motivos/pasos a seguir.
- [ ] **DoD 5:** Un atleta cuya patria potestad no esté `APPROVED` queda oculto tanto en el Directorio de Scouts como en el perfil público slug.
- [ ] **DoD 6:** Al subir un documento corregido en el panel del tutor, el atleta transiciona nuevamente a `PENDING_REVIEW` y reingresa a la cola de auditoría.
- [ ] **DoD 7:** Vista Angular `/admin/verificacion-legal` implementada conforme a `fe-desing.md` con visor dual interactivo (split-view) y responsive.
- [ ] **DoD 8:** Compilación sin advertencias ni errores tanto en backend (`./mvnw clean compile`) como en frontend (`ng build`).
- [ ] **DoD 9:** Documento de pruebas redactado en `test/TS-28-test-plan-auditoria-patria-potestad-tutor-atleta.md`.
