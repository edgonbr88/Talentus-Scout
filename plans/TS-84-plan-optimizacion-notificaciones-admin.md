# Plan de Implementación: [TS-84] Optimización de Notificaciones Admin por Correo (Desactivar Alerta de Nuevo Tutor y Notificar Atleta al Cargar Documento)

**ID Tarea:** TS-84  
**Tarjeta Trello:** https://trello.com/c/hvWzOhNl  
**Fecha:** 2026-11-24  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Optimizar la cuota de envíos de correo vía Resend y evitar alertas administrativas prematuras cuando aún no existe documentación lista para auditar.
- **Cambios de flujo:**
  1. Desactivar la alerta administrativa al registrar un nuevo tutor (`POST /api/v1/auth/register-tutor`), manteniendo intacto el correo de verificación al propio tutor (`sendEmailVerification`).
  2. Mover la alerta administrativa de atletas: deja de dispararse al crear el atleta (`POST /api/v1/athletes`) y se dispara **únicamente** cuando el representante carga o re-carga el documento de identidad/patria potestad (`POST /api/v1/athletes/{id}/identity-document`), momento en que el atleta entra en `/admin/verificacion-legal`.
- **Exclusiones confirmadas:** No se envía en `POST /api/v1/auth/register-athlete` (+18). Las alertas de scouts y clubes comunitarios se mantienen intactas.
- **Protección de Menores (LOPNNA Art. 65):** Cada carga o re-carga tras rechazo notifica inmediatamente al administrador con enlace a `/admin/verificacion-legal`.

---

## 2. Alcance Técnico y Arquitectura
- **Base de Datos (`talentus-scout-migrations`):** Sin cambios.
- **Frontend (`talentus-scout-fe`):** Sin cambios.
- **Backend (`talentus-scout-be`):**
  - `service/AuthService.java`: eliminar invocación `adminNotificationService.notifyNewTutorRegistered(savedUser, consent);` en `registerTutor(...)`.
  - `service/AthleteService.java`: eliminar invocación `adminNotificationService.notifyNewAthleteRegistered(saved);` en `createAthlete(...)`; agregarla en `uploadIdentityDocument(...)` tras persistir `updated` (pre-inicializando `tutor` y `currentClub` dentro de la transacción para evitar `LazyInitializationException` en `@Async`).
  - `service/AdminNotificationService.java`: retirar `notifyNewTutorRegistered(...)` (sin invocadores) y actualizar `notifyNewAthleteRegistered(Athlete athlete)` para reflejar la carga/actualización del documento de patria potestad (incluyendo tipo y número de documento si están presentes) con enlace a `/admin/verificacion-legal`.
  - Pruebas: actualizar `AdminNotificationServiceTest` y agregar/actualizar pruebas unitarias de `AuthService` y `AthleteService` verificando los 4 escenarios requeridos.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No requiere migraciones DDL.

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Paquete base:** `com.talentus.scout`
- **Clases a modificar:**
  1. `src/main/java/com/talentus/scout/service/AuthService.java`
  2. `src/main/java/com/talentus/scout/service/AthleteService.java`
  3. `src/main/java/com/talentus/scout/service/AdminNotificationService.java`
- **Pruebas a actualizar/crear:**
  1. `src/test/java/com/talentus/scout/service/AdminNotificationServiceTest.java`
  2. `src/test/java/com/talentus/scout/service/AdminNotificationFlowOptimizationTest.java` (pruebas unitarias enfocadas en `AuthService.registerTutor`, `AuthService.registerAdultAthlete`, `AthleteService.createAthlete` y `AthleteService.uploadIdentityDocument` — carga inicial y re-carga tras rechazo).

---

## 5. Frontend: Angular 18+
- No requiere cambios.

---

## 6. Pruebas y Verificación
- Ejecutar `./mvnw test -Dtest=AdminNotificationServiceTest,AdminNotificationFlowOptimizationTest,AthleteIdentityDocumentTest,AuthControllerTest,AuthAthleteRegistrationTest,AthleteControllerTest`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear rama `feature/TS-84-optimizacion-notificaciones-admin` en `talentus-scout-be`.
- [x] Paso 2: Eliminar llamada `notifyNewTutorRegistered` en `AuthService.registerTutor(...)` manteniendo `sendEmailVerification`.
- [x] Paso 3: Mover llamada `notifyNewAthleteRegistered` de `AthleteService.createAthlete(...)` a `AthleteService.uploadIdentityDocument(...)` asegurando hidratación de `tutor` y `currentClub` antes del dispatch `@Async`.
- [x] Paso 4: Retirar `notifyNewTutorRegistered` y actualizar asunto/cuerpo (tipo y número de documento) en `AdminNotificationService.notifyNewAthleteRegistered(...)`.
- [x] Paso 5: Actualizar `AdminNotificationServiceTest` y agregar `AdminNotificationFlowOptimizationTest`.
- [x] Paso 6: Ejecutar pruebas con `./mvnw test` y validar 100% en verde.
- [x] Paso 7: Documentar plan de pruebas en `test/TS-84-test-plan-optimizacion-notificaciones-admin.md`, marcar checkboxes en el plan, crear PR en `talentus-scout-be`, commitear docs en `main` y mover tarjeta Trello a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] `POST /api/v1/auth/register-tutor` envía verificación al tutor y NO envía alerta al administrador.
- [x] `POST /api/v1/athletes` NO envía alerta al administrador.
- [x] `POST /api/v1/athletes/{id}/identity-document` SÍ envía alerta al administrador (carga inicial y re-carga tras rechazo) con enlace a `/admin/verificacion-legal`.
- [x] `POST /api/v1/auth/register-athlete` NO envía alerta de patria potestad al administrador.
- [x] Alertas de scouts y clubes comunitarios sin regresiones.
- [x] Pruebas unitarias y de integración en verde (`./mvnw test`).
