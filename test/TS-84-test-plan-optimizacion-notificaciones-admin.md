# Plan de Pruebas: [TS-84] Optimización de Notificaciones Admin por Correo

**ID Tarea:** TS-84  
**Tarjeta Trello:** https://trello.com/c/hvWzOhNl  
**Fecha:** 2026-11-24  
**Plan de Implementación:** [TS-84-plan-optimizacion-notificaciones-admin.md](file:///home/edgar/Talentus%20Scout/plans/TS-84-plan-optimizacion-notificaciones-admin.md)

---

## 1. Alcance de Pruebas
- **Backend (`talentus-scout-be`):**
  - `AuthService.registerTutor(...)` y `AuthService.registerAdultAthlete(...)`.
  - `AthleteService.createAthlete(...)` y `AthleteService.uploadIdentityDocument(...)`.
  - `AdminNotificationService.notifyNewAthleteRegistered(...)` (retirado `notifyNewTutorRegistered(...)`).

---

## 2. Pruebas Automatizadas Ejecutadas
- **Comando:**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=AdminNotificationServiceTest,AdminNotificationFlowOptimizationTest,AthleteIdentityDocumentTest,AuthControllerTest,AuthAthleteRegistrationTest,AthleteControllerTest
  ```
- **Resultado:** `Tests run: 41, Failures: 0, Errors: 0, Skipped: 0` (**PASS** — incluyendo `AdminNotificationFlowOptimizationTest` (3/3), `AdminNotificationServiceTest` (5/5), `AthleteIdentityDocumentTest`, `AuthControllerTest`, `AuthAthleteRegistrationTest` y `AthleteControllerTest`).

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso
1. **Registro de tutor (`POST /api/v1/auth/register-tutor`):**
   - Verificar que el tutor recibe su correo de verificación (`/auth/verify-email?token=...`) y el administrador **no** recibe alerta.
2. **Creación de atleta menor (`POST /api/v1/athletes`):**
   - Verificar que el atleta se crea en `PENDING_REVIEW` y el administrador **no** recibe alerta aún.
3. **Carga y re-carga de documento (`POST /api/v1/athletes/{id}/identity-document`):**
   - Al subir el documento (PDF/PNG/JPG), verificar que el administrador recibe la alerta por correo con asunto *"Documento de Patria Potestad Cargado — Auditoría Legal Pendiente"*, datos del documento y enlace a `/admin/verificacion-legal`.
   - Tras un rechazo administrativo (`REJECTED`), al volver a subir el documento, verificar que se envía nuevamente la alerta al administrador.
4. **Registro de atleta mayor de edad (`POST /api/v1/auth/register-athlete`):**
   - Verificar que no dispara notificación de patria potestad al administrador.

---

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] `POST /api/v1/auth/register-tutor` envía verificación al tutor y NO envía alerta al administrador.
- [x] `POST /api/v1/athletes` NO envía alerta al administrador.
- [x] `POST /api/v1/athletes/{id}/identity-document` SÍ envía alerta al administrador (carga inicial y re-carga tras rechazo) con enlace a `/admin/verificacion-legal`.
- [x] `POST /api/v1/auth/register-athlete` NO envía alerta de patria potestad al administrador.
- [x] Alertas de scouts y clubes comunitarios sin regresiones.
- [x] Pruebas unitarias y de integración en verde.

---

## 5. Casos Borde y Validaciones Críticas
- **Prevención de `LazyInitializationException` en `@Async`:** `AthleteService.uploadIdentityDocument` pre-inicializa `tutor` (`fullName`, `email`) y `currentClub` (`name`) dentro de la transacción antes de invocar `adminNotificationService.notifyNewAthleteRegistered(updated)`.
- **LOPNNA Art. 65:** Toda carga o re-carga tras observación vuelve a colocar al atleta en `PENDING_REVIEW` y notifica oportunamente al administrador.
