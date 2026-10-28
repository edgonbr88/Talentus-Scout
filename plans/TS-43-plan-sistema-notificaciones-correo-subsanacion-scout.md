# Plan de Implementación — [TS-43] Sistema Integral de Notificaciones por Correo (Patria Potestad, Acreditación Scout e Insignias) y Limpieza de Usuarios Seed

## 1. Identificación de la Tarea
* **ID:** `TS-43`
* **Título:** Sistema Integral de Notificaciones por Correo (Patria Potestad, Acreditación Scout e Insignias) y Limpieza de Usuarios Seed
* **Trello Card:** [https://trello.com/c/E8t7Jb7B](https://trello.com/c/E8t7Jb7B) (ID: `6acfb498e565f12a5ad0fc34`)
* **Sprint:** Sprint 3
* **Estado Actual:** `in development`
* **Dependencias:** `TS-14`, `TS-28`, `TS-30`, `TS-42`

---

## 2. Resumen y Contexto de Negocio
La comunicación oportuna, transparente y verificable es fundamental para el funcionamiento del ecosistema de Talentus Scout. Los tutores legales y veedores oficiales deben recibir notificaciones inmediatas por correo electrónico cuando los administradores o certificadores externos tomen resoluciones sobre:
1. **Auditoría de Patria Potestad y Salvaguarda Legal (LOPNNA Art. 65):** Aprobación oficial con habilitación en el Directorio o rechazo con observaciones documentadas para garantizar el derecho a subsanación.
2. **Acreditación de Scouts y Clubes (FIFA Safeguard):** Aprobación con credenciales para acceder al Directorio de Talentos Juveniles, o rechazo documentado con canal directo para consignar nuevas credenciales corregidas.
3. **Multicertificaciones e Insignias Deportivas:** Notificación al tutor cuando una insignia es avalada por un certificador externo (vía token) o auditada por la administración.

Adicionalmente, se detectó que los usuarios semilla de prueba (`carlos.perez@talentus.app`) provocan envíos a buzones inexistentes y rebotes de correo en entornos de prueba y producción. Se requiere sanear `DataInitializer.java` y la base de datos Neon mediante migración dbmate, preservando únicamente la cuenta administrativa oficial `admin@talentus.app`.

---

## 3. Modelo de Datos y Migración de Saneamiento (dbmate)

### 3.1 Archivo de Migración DML
* **Ruta:** `talentus-scout-migrations/migrations/20261015220000_cleanup_seed_users_and_demo_records.sql`
* **Script SQL:**
```sql
-- migrate:up
DELETE FROM users WHERE email = 'carlos.perez@talentus.app';

-- migrate:down
-- No se restaura usuario semilla de pruebas para evitar rebotes de correo.
```
* **Comportamiento en Cascada:**
  Gracias a las restricciones `ON DELETE CASCADE` de `tutor_legal_consents`, `athletes`, `athlete_subscriptions`, `payment_transactions` y `scout_activity_logs`, la eliminación del usuario `carlos.perez@talentus.app` purga de forma segura y consistente cualquier registro de prueba asociado sin dejar huérfanos.

---

## 4. Especificación Backend: Spring Boot 3 (Java 21)

### 4.1 Saneamiento de `DataInitializer.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/config/DataInitializer.java`
* **Cambios:**
  - Remover el bloque que crea `carlos.perez@talentus.app`.
  - Refactorizar la creación de `admin@talentus.app` aplicando el patrón Builder idiomático de Lombok (`User.builder()...build()`), conforme a las directivas de `AGENTS.md`.
  - Mantener la inicialización de los 5 clubes oficiales venezolanos.

### 4.2 Ampliación de `EmailService.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/mail/EmailService.java`
* **Nuevos Métodos:**
  1. `sendScoutVerificationResolutionNotification(String toEmail, String scoutName, boolean approved, String reason)`:
     - **Aprobado:** Asunto: `"¡Acreditación Oficial de Scout Aprobada! — Talentus Scout"`. Explica el acceso al Directorio Nacional de Atletas y provee enlace directo a `/scout/directory`.
     - **Rechazado:** Asunto: `"Actualización sobre tu Acreditación de Scout — Talentus Scout"`. Detalla las observaciones y motivos de rechazo del comité de admisiones y provee enlace para subsanar y subir una nueva credencial.
  2. `sendBadgeCertificationResolutionNotification(String toEmail, String tutorName, String athleteName, String badgeTitle, String badgeTypeLabel, boolean approved, String reason)`:
     - **Aprobado:** Asunto: `"¡Insignia Oficial Verificada para " + athleteName + "! — Talentus Scout"`.
     - **Rechazado:** Asunto: `"Actualización sobre la Certificación de Insignia para " + athleteName + " — Talentus Scout"`. Detalla el motivo de observación y pasos a seguir.
  3. Validar `sendLegalVerificationResolutionNotification` existente para asegurar consistencia estética y enlaces directos al dashboard del tutor.

### 4.3 Integración en Servicios de Negocio
1. **`AdminScoutService.java`:**
   - Inyectar `EmailService`.
   - En `reviewScout(...)`, invocar `emailService.sendScoutVerificationResolutionNotification(...)` pasando el correo del scout, su nombre, el booleano de aprobación y el motivo de rechazo si aplica.
2. **`CertificationService.java`:**
   - Inyectar `EmailService` (ya inyectado para invitaciones).
   - En `submitTokenCertification(...)`: despachar `sendBadgeCertificationResolutionNotification(..., true, null)` al tutor del atleta.
   - En `adminReviewDocument(...)`: despachar `sendBadgeCertificationResolutionNotification(..., approved, adminNotes)` al tutor del atleta.

### 4.4 Controlador y Endpoint para Subsanación de Credenciales de Scout
* **Nuevo Controlador:** `ScoutProfileController.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/ScoutProfileController.java`
* **Endpoint:** `POST /api/v1/scout/re-upload-credentials`
* **Consumes:** `multipart/form-data`
* **Seguridad:** `@PreAuthorize("hasRole('SCOUT')")`
* **Parámetros:** `@RequestParam("credentialsFile") MultipartFile credentialsFile`, `Authentication authentication`
* **Lógica:**
  - Extraer usuario autenticado a través de su email.
  - Validar archivo: no nulo, formatos `.pdf`, `.png`, `.jpg`, `.jpeg`, máx. 10MB.
  - Almacenar nuevo archivo mediante `fileStorageService.storeFile(credentialsFile, "credentials")`.
  - Actualizar `ScoutProfile`:
    - `credentialsDocumentUrl = nuevaUrl`
    - `verificationStatus = ScoutVerificationStatus.PENDING`
    - `rejectionReason = null`
    - `reviewedAt = null`
    - `reviewedByAdmin = null`
  - Guardar perfil y retornar DTO con confirmación de estado `PENDING`.

### 4.5 Pruebas Unitarias de Backend
* `AdminScoutServiceTest.java`: Verificar que `reviewScout` invoca `emailService.sendScoutVerificationResolutionNotification` tanto para aprobación como para rechazo.
* `CertificationServiceTest.java`: Verificar que `adminReviewDocument` y `submitTokenCertification` invocan `emailService.sendBadgeCertificationResolutionNotification`.
* `ScoutProfileControllerTest.java`: Probar subida de nueva credencial por scout autenticado, verificación de formato y transición a `PENDING`.

---

## 5. Especificación Frontend: Angular 18+ (Standalone, UI/UX & Flujo de Rechazo)

### 5.1 Enrutamiento y Guards (`scout.guard.ts` & `login.component.ts`)
* **Resolver Redirección Cíclica en `scout.guard.ts`:**
  - Si el usuario es `SCOUT` pero aún no tiene acceso al directorio (`!canAccessDirectory()`), redirigirlo a `/auth/scout-pending-audit` en lugar de `/dashboard` (evitando rebote con `tutorGuard`).
* **Actualizar `login.component.ts`:**
  - Si el rol es `SCOUT` y `!isVerifiedScout()`, redirigir a `/auth/scout-pending-audit`. Si ya está verificado, redirigir a `/scout/directory`.

### 5.2 Servicio `AuthService` (`src/app/core/auth/auth.service.ts`)
* Incorporar método para re-subir credenciales:
```typescript
reUploadScoutCredentials(data: FormData): Observable<{ message: string; verificationStatus: string }> {
  return this.http.post<{ message: string; verificationStatus: string }>('/api/v1/scout/re-upload-credentials', data);
}
```

### 5.3 Actualización de `ScoutPendingAuditComponent` (`src/app/features/auth/scout-pending-audit/`)
* **Detección de Estado `REJECTED`:**
  - El componente consulta el estado de la sesión (`authService.currentUser()`).
  - Si el scout se encuentra en estado `REJECTED`:
    1. Desplegar badge de advertencia: `SOLICITUD CON OBSERVACIONES / SUBSANACIÓN REQUERIDA`.
    2. Caja informativa destacada con el motivo exacto del rechazo (`rejectionReason`) emitido por el administrador.
    3. Dropzone interactivo para cargar nueva credencial corregida (PDF, PNG, JPG hasta 10MB).
    4. Botón: `"Reenviar Credencial para Nueva Auditoría"`.
    5. Al enviar, invoca `authService.reUploadScoutCredentials`, actualiza el perfil con `authService.fetchCurrentUser()` y retorna la vista al estado `PENDING` (Paso 2 del timeline activo).
  - Si el scout se encuentra en estado `PENDING`: Mantiene el timeline explicativo habitual de 3 pasos (24-48 horas).

---

## 6. Plan de Pruebas y Validación

### 6.1 Pruebas Automatizadas
* **Backend:** `./mvnw test` ejecutando `AdminScoutServiceTest`, `CertificationServiceTest`, `ScoutProfileControllerTest`.
* **Frontend:** `npm test -- --watch=false --browsers=ChromeHeadless` validando `ScoutPendingAuditComponent`, guards y login.
* **Build:** `npm run build` garantizando compilación sin errores en cliente y servidor SSR.

### 6.2 Verificación Manual Paso a Paso
1. Iniciar sesión con un scout en estado `REJECTED`.
2. Confirmar que la UI muestra la observación del administrador en rojo/ámbar.
3. Cargar nuevo archivo de credencial en el dropzone y pulsar reenviar.
4. Verificar que el estatus cambia a `PENDING` y se muestra el timeline de espera.
5. Iniciar sesión como administrador y aprobar el scout.
6. Verificar en logs el envío del correo de bienvenida `sendScoutVerificationResolutionNotification`.
7. Verificar que el scout ahora puede ingresar a `/scout/directory`.
8. En base de datos, comprobar que `carlos.perez@talentus.app` ya no existe.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Crear migración dbmate `20261015220000_cleanup_seed_users_and_demo_records.sql` para purgar a `carlos.perez@talentus.app`.
- [x] **Paso 2:** Modificar `DataInitializer.java` removiendo `carlos.perez@talentus.app` y usando Builder en `admin@talentus.app`.
- [x] **Paso 3:** Implementar nuevos métodos de notificación en `EmailService.java` (`sendScoutVerificationResolutionNotification` y `sendBadgeCertificationResolutionNotification`).
- [x] **Paso 4:** Integrar el envío de correos en `AdminScoutService.java` (`reviewScout`).
- [x] **Paso 5:** Integrar el envío de correos en `CertificationService.java` (`submitTokenCertification` y `adminReviewDocument`).
- [x] **Paso 6:** Crear controlador `ScoutProfileController.java` con endpoint `POST /api/v1/scout/re-upload-credentials`.
- [x] **Paso 7:** Añadir pruebas unitarias de backend para `AdminScoutService`, `CertificationService` y `ScoutProfileController`.
- [x] **Paso 8:** Actualizar `scout.guard.ts` y `login.component.ts` para redirigir a `/auth/scout-pending-audit` a scouts no aprobados.
- [x] **Paso 9:** Incorporar método `reUploadScoutCredentials` en `auth.service.ts`.
- [x] **Paso 10:** Actualizar `scout-pending-audit.component.ts`, `.html` y `.css` con el flujo de subsanación para scouts rechazados.
- [x] **Paso 11:** Actualizar pruebas unitarias frontend en `scout-pending-audit.component.spec.ts` y `scout.guard.spec.ts`.
- [x] **Paso 12:** Compilar backend y frontend, y ejecutar suites de pruebas automatizadas (`./mvnw test`, `npm test`, `npm run build`).
- [x] **Paso 13:** Generar plan de pruebas en `test/TS-43-test-plan-sistema-notificaciones-correo-subsanacion-scout.md`.
- [x] **Paso 14:** Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] El usuario `carlos.perez@talentus.app` es eliminado de la base de datos y removido de `DataInitializer.java`.
- [x] Al aprobar un scout en el panel admin, se envía correo notificando la habilitación de acceso al Directorio Nacional.
- [x] Al rechazar un scout en el panel admin, se envía correo detallando las observaciones del administrador y pasos de subsanación.
- [x] Un scout en estado `REJECTED` puede visualizar en la plataforma el motivo de rechazo y adjuntar una nueva credencial corregida vía `POST /api/v1/scout/re-upload-credentials`.
- [x] Al subsanar credenciales, el perfil transiciona a `PENDING` para una nueva auditoría.
- [x] Al aprobar o rechazar insignias deportivas, el tutor legal recibe el correo informativo correspondiente.
- [x] Redirecciones de login y guards blindadas sin bucles infinitos para perfiles scout pendientes o rechazados.
- [x] 100% de pruebas unitarias en verde y compilación exitosa.
