# Plan y Reporte de Pruebas — [TS-43] Sistema Integral de Notificaciones por Correo (Patria Potestad, Acreditación Scout e Insignias) y Limpieza de Usuarios Seed

## 1. Identificación de la Tarea
* **ID:** `TS-43`
* **Título:** Sistema Integral de Notificaciones por Correo (Patria Potestad, Acreditación Scout e Insignias) y Limpieza de Usuarios Seed
* **Trello Card:** [https://trello.com/c/E8t7Jb7B](https://trello.com/c/E8t7Jb7B) (ID: `6acfb498e565f12a5ad0fc34`)
* **Sprint:** Sprint 3
* **Fecha de Ejecución:** 2026-10-15
* **Estado:** Verificado / Listo para Testing

---

## 2. Alcance de las Pruebas

### 2.1 Base de Datos y Semillas (Neon PostgreSQL / dbmate)
* Migración DDL `migrations/20261015220000_cleanup_seed_users_and_demo_records.sql`:
  - Eliminación en cascada del usuario seed no verificado `carlos.perez@talentus.app`.
  - Preservación de `admin@talentus.app` como administrador único de pruebas.
* Refactorización de `DataInitializer.java`:
  - Remoción de inserción en runtime de `carlos.perez@talentus.app`.
  - Aplicación de `@Builder` de Lombok para `admin@talentus.app`.

### 2.2 Backend (Spring Boot 3 / Java 21)
* **Servicio de Correo (`EmailService.java` e `EmailServiceImpl.java`):**
  - Implementación de `sendScoutVerificationResolutionNotification(String toEmail, String scoutName, boolean approved, String rejectionReason)`.
  - Implementación de `sendBadgeCertificationResolutionNotification(String toEmail, String recipientName, String athleteName, String badgeName, boolean approved, String rejectionReason)`.
* **Servicio de Auditoría de Scouts (`AdminScoutService.java`):**
  - Integración del envío de correo en la revisión de solicitudes (aprobación y rechazo con observaciones).
* **Servicio de Certificaciones (`CertificationService.java`):**
  - Integración del envío de correo en certificaciones por token (aprobación) y por revisión documental de administradores (aprobación y rechazo).
* **Controlador de Remediación de Credenciales de Scout (`ScoutProfileController.java`):**
  - Endpoint `POST /api/v1/scout/re-upload-credentials` (multipart, `@PreAuthorize("hasRole('SCOUT')")`).
  - Almacenamiento de nueva credencial mediante `FileStorageService` (carpeta `credentials/`).
  - Reseteo automático de estatus a `PENDING`, limpieza de `rejectionReason`, `reviewedAt` y `reviewedByAdmin`.

### 2.3 Frontend (Angular 18+ Standalone & SSR)
* **Guards y Enrutamiento:**
  - `scout.guard.ts`: Corrección de ciclo infinito redirigiendo a `/auth/scout-pending-audit` a scouts autenticados sin acceso al directorio.
  - `login.component.ts`: Redirección condicional de scouts a `/scout/directory` (si están verificados) o a `/auth/scout-pending-audit` (si están en pendiente o rechazados).
* **Servicio de Autenticación (`auth.service.ts`):**
  - Incorporación del método `reUploadScoutCredentials(data: FormData)`.
  - Encadenamiento reactivo de `fetchCurrentUser()` tras `login()` y logins sociales.
* **Componente de Auditoría y Remediación (`scout-pending-audit`):**
  - Visualización del banner `SUBSANACIÓN REQUERIDA` con motivo de rechazo en caso de estatus `REJECTED`.
  - Dropzone interactivo de drag & drop con validaciones de formato (PDF, PNG, JPG) y tamaño (máx. 10MB).
  - Envío reactivo y retroalimentación inmediata (éxito/error) pasando el perfil a `PENDING`.
  - Soporte de estado `APPROVED` con acceso directo al directorio.

---

## 3. Pruebas Automatizadas Ejecutadas

### 3.1 Backend: Spring Boot Test Suite (`./mvnw test`)
* **Comando:** `./mvnw test`
* **Resultado:** **160 tests ejecutados, 0 fallos, 0 errores, BUILD SUCCESS** (Tiempo total: 02:13 min).
* **Suites Destacadas de la Tarea:**
  1. `ScoutProfileControllerTest`:
     - [x] `reUploadCredentials_conArchivoValido_debeActualizarPerfilYRetornarPending()`: Verifica subida multipart, almacenamiento en directorio `credentials`, reseteo de estatus a `PENDING` y eliminación de motivo previo.
     - [x] `reUploadCredentials_conArchivoVacio_debeRetornarBadRequest()`: Verifica validación de archivo vacío.
     - [x] `reUploadCredentials_conFormatoInvalido_debeRetornarBadRequest()`: Rechaza extensiones no permitidas (`.exe`, etc.).
     - [x] `reUploadCredentials_sinAutenticacion_debeRetornarForbidden()`: Garantiza protección estricta con Spring Security `@PreAuthorize("hasRole('SCOUT')")`.
  2. `AdminScoutServiceTest`:
     - [x] `reviewScout_aprobacion_debeActualizarEstadoYEnviarCorreo()`: Comprueba que `reviewScout` con `APPROVED` invoca `emailService.sendScoutVerificationResolutionNotification(..., true, null)`.
     - [x] `reviewScout_rechazo_debeGuardarMotivoYEnviarCorreo()`: Comprueba que `reviewScout` con `REJECTED` guarda el motivo e invoca `emailService.sendScoutVerificationResolutionNotification(..., false, motivo)`.
  3. `CertificationServiceTest`:
     - [x] `submitTokenCertification_exitoso()`: Valida invocación de notificación de aprobación por token.
     - [x] `adminReviewDocument_aprobacion()`: Valida invocación de notificación de aprobación documental.
     - [x] `adminReviewDocument_rechazo()`: Valida invocación de notificación de rechazo con observaciones.

### 3.2 Frontend: Jasmine / Karma (`npm test -- --watch=false --browsers=ChromeHeadless`)
* **Comando:** `npm test -- --watch=false --browsers=ChromeHeadless`
* **Resultado:** **95 tests ejecutados, 0 fallos, TOTAL: 95 SUCCESS** (Tiempo: 3.934 seg).
* **Suites Destacadas de la Tarea:**
  1. `scoutGuard`:
     - [x] Debe permitir acceso cuando el usuario está autenticado y tiene acceso al directorio.
     - [x] Debe redirigir a `/login` cuando el usuario no está autenticado.
     - [x] Debe redirigir a `/auth/scout-pending-audit` cuando el usuario es scout autenticado pero sin acceso al directorio (rompe el ciclo de redirección infinita).
     - [x] Debe redirigir a `/dashboard` cuando el usuario autenticado no es scout y no tiene acceso al directorio.
  2. `ScoutPendingAuditComponent`:
     - [x] Debe crearse y capturar queryParams de correo y organización en estado pendiente.
     - [x] Debe mostrar vista de subsanación cuando el scout está en estado `REJECTED` mostrando la observación del comité y botón de reenvío.
     - [x] Debe validar formato y tamaño al seleccionar un archivo en el dropzone (rechazando `.exe` y aceptando `.pdf`).
     - [x] Debe enviar la nueva credencial e invocar `reUploadScoutCredentials` desplegando mensaje de éxito.
     - [x] Debe mostrar vista de acreditación verificada cuando el scout está en estado `APPROVED`.

### 3.3 Compilación de Producción (`npm run build`)
* **Resultado:** Compilación exitosa en 30.11 segundos.
* **Bundles:**
  - Browser bundles generados (Initial: 1.26 MB / 309.67 kB gzip, Lazy chunk `scout-pending-audit-component`: 21.86 kB).
  - Server bundles SSR generados para 13 rutas estáticas.
  - Cero errores de TypeScript y estricta separación de plantillas HTML.

---

## 4. Guía de Verificación Manual Paso a Paso

### 4.1 Verificación de Limpieza de Usuarios Seed en Base de Datos
1. Conectarse a la base de datos Neon PostgreSQL:
   ```bash
   psql -h localhost -U postgres -d talentus_scout_dev
   ```
2. Ejecutar consulta de verificación:
   ```sql
   SELECT id, email, role, status FROM users WHERE email IN ('carlos.perez@talentus.app', 'admin@talentus.app');
   ```
3. **Resultado Esperado:**
   - La fila de `carlos.perez@talentus.app` NO existe (eliminada).
   - `admin@talentus.app` existe con rol `ADMIN` y estatus `ACTIVE`.

### 4.2 Verificación de Re-subida de Credencial de Scout Rechazado (cURL)
1. Obtener token JWT de un scout cuyo estatus sea `REJECTED`:
   ```bash
   SCOUT_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"scout.prueba@talentus.app","password":"Password123!"}' | jq -r .token)
   ```
2. Ejecutar la re-subida de credencial en multipart:
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/scout/re-upload-credentials \
     -H "Authorization: Bearer $SCOUT_TOKEN" \
     -F "credentialsFile=@test_credential.pdf;type=application/pdf"
   ```
3. **Resultado Esperado (HTTP 200 OK):**
   ```json
   {
     "message": "Credenciales actualizadas exitosamente. Tu perfil ha retornado al estado de auditoría.",
     "verificationStatus": "PENDING",
     "credentialsDocumentUrl": "uploads/credentials/..."
   }
   ```
4. Consultar `/api/v1/auth/me`:
   ```bash
   curl -s http://localhost:8080/api/v1/auth/me -H "Authorization: Bearer $SCOUT_TOKEN" | jq .
   ```
   - `scoutVerificationStatus`: `"PENDING"`
   - `rejectionReason`: `null`

### 4.3 Verificación de Notificación de Correo en Auditoría de Scouts
1. Iniciar sesión como Administrador y llamar al endpoint de auditoría de scouts:
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/admin/scouts/<scout-profile-id>/review \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"decision":"APPROVED","observations":"Credencial federativa vigente FVF validada exitosamente"}'
   ```
2. **Resultado Esperado:**
   - Estatus 200 OK.
   - En los logs del servidor backend (`talentus-scout-be`):
     ```
     [SIMULACIÓN EMAIL] Notificación de resolución de credencial enviada a: scout.prueba@talentus.app. Asunto: [Talentus Scout] Resolución de tu solicitud de acreditación como Veedor Oficial
     ```

### 4.4 Verificación en Interfaz de Usuario (Frontend)
1. Acceder con credenciales de un scout en estado `REJECTED`:
   - El sistema redirige automáticamente a `/auth/scout-pending-audit`.
   - Se muestra el badge `SUBSANACIÓN DE CREDENCIAL REQUERIDA` y el motivo exacto ingresado por el administrador.
2. Arrastrar un archivo `.pdf` o `.png` al dropzone.
3. Hacer clic en `"Reenviar Credencial para Nueva Auditoría"`.
4. El dropzone procesa el envío con spinner, muestra la alerta verde de éxito y cambia la vista al estado `PENDING` (Timeline activo en paso 2 con tiempo estimado de 24-48 horas).
5. Intentar navegar directamente en el navegador a `/scout/directory`:
   - El `scoutGuard` intercepta la navegación y redirige limpiamente a `/auth/scout-pending-audit` sin provocar bucles infinitos ni recargas continuas.

---

## 5. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Observaciones de Validación |
| :--- | :---: | :--- |
| Eliminación del usuario seed `carlos.perez@talentus.app` de Neon DB y `DataInitializer` | **CUMPLIDO** | Migración `20261015220000_cleanup_seed_users_and_demo_records.sql` ejecutada; `DataInitializer` limpiado. |
| Métodos de notificación en `EmailService` para acreditación de scouts e insignias | **CUMPLIDO** | Métodos `sendScoutVerificationResolutionNotification` y `sendBadgeCertificationResolutionNotification` implementados. |
| Invocación de correo en revisión de scouts y certificación de insignias | **CUMPLIDO** | Integrado en `AdminScoutService` y `CertificationService`, probado unitariamente con Mockito. |
| Endpoint `POST /api/v1/scout/re-upload-credentials` funcional y seguro | **CUMPLIDO** | Validado con `ScoutProfileControllerTest`, almacena archivo y resetea a `PENDING`. |
| Corrección de ciclo infinito de redirección en `scout.guard.ts` | **CUMPLIDO** | Redirige a scouts no autorizados a `/auth/scout-pending-audit` en vez de `/dashboard`. |
| Vista de subsanación y dropzone en `ScoutPendingAuditComponent` | **CUMPLIDO** | Renderiza observaciones de rechazo, valida archivos y llama a `reUploadScoutCredentials`. |
| Cumplimiento de directivas arquitectónicas (Lombok, separación de plantillas HTML) | **CUMPLIDO** | Entidades/DTOs con Lombok, templates `.html` y `.css` estrictamente separados en Angular. |
| Suite completa de pruebas automatizadas y compilación limpia | **CUMPLIDO** | 160/160 tests backend exitosos, 95/95 tests frontend exitosos, build SSR y browser exitoso. |

---

## 6. Casos Borde y Consideraciones de Seguridad Validadas
1. **Prevención de Bouncing de Correo:** Al purgar `carlos.perez@talentus.app`, ningún proceso automatizado intenta despachar correos a buzones inexistentes, protegiendo la reputación del dominio remitente.
2. **Protección LOPNNA (Art. 65) y FIFA:** Un scout en estado `REJECTED` o `PENDING` tiene estrictamente bloqueado el acceso al Directorio de Talentos (`/scout/directory`), salvaguardando los datos de contacto y fichas biométricas de los atletas menores de edad.
3. **Reseteo Transaccional de Perfil:** Al invocar `re-upload-credentials`, la credencial anterior se sustituye, el estatus vuelve a `PENDING` y se eliminan las observaciones de rechazo anteriores para que el administrador evalúe un expediente limpio.
4. **Validación de Archivos en Dos Capas:** Validación reactiva en cliente (JavaScript) y validación obligatoria en servidor (Spring Boot) restringiendo extensiones a `.pdf`, `.png`, `.jpg`, `.jpeg` y peso máximo a 10 MB.
