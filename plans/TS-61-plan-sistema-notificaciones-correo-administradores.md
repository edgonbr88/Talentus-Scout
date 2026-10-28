# Plan de Implementación: [TS-61] Sistema de Notificaciones por Correo a Administradores ante Nuevos Registros y Solicitudes de Auditoría

**ID Tarea:** TS-61  
**Tarjeta Trello:** `https://trello.com/c/5W4JmHj8` / ID: `6ad696c6465c09bd5af52656`  
**Fecha:** 2026-10-27  
**Estado del Plan:** IMPLEMENTADO Y EN TESTING  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Cuando un representante legal se registra, inscribe a un atleta menor de edad, da de alta una organización no oficial ("Otro"), o cuando un reclutador/scout solicita acreditación, la administración no recibe una notificación proactiva inmediata. Esto puede ralentizar la auditoría de patria potestad y la validación de credenciales deportivas, demorando el cumplimiento de los Acuerdos de Nivel de Servicio (SLA < 24 horas).
- **Impacto para los actores:**
  - **Administrador:** Recibe alertas en tiempo real en su bandeja de entrada con enlaces profundos directos a los módulos de auditoría correspondientes (`/admin/verificacion-legal`, `/admin/scouts`, `/admin/clubes`), agilizando el flujo de revisión documental.
  - **Atletas y Tutores:** Reducción drástica del tiempo de espera para la aprobación de la patria potestad y activación del distintivo oficial verificado en el radar de talentos.
  - **Scouts:** Acreditación más ágil para acceder al Directorio de Talentos tras consignar sus credenciales oficiales.
- **Consideraciones Legales y de Salvaguarda:**
  - Cumplimiento riguroso del Art. 65 de la LOPNNA y lineamientos FIFA para la protección integral de menores en plataformas digitales, garantizando que todo documento legal sea puesto de inmediato a disposición del equipo auditor.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Base de Datos / Repositorio:** `UserRepository`: método `findByRoleAndStatus` para consultar dinámicamente la lista de correos de administradores activos.
  - **Backend (Spring Boot 3 / Java 21 / Resend API):**
    - `AsyncConfig` con `@EnableAsync` para ejecución no bloqueante de notificaciones.
    - `AdminNotificationService` con métodos asíncronos (`@Async`) para cada evento crítico.
    - `EmailService`: soporte general para despacho de correos administrativos institucionales.
    - Integración en flujos de negocio existentes:
      1. `AuthService.registerTutor`: Notificar nuevo tutor registrado y documento de identidad.
      2. `AthleteService.createAthlete`: Notificar nuevo atleta y patria potestad pendiente de revisión.
      3. `ClubService.getOrCreateCustomClub`: Notificar nueva academia/club comunitario creado por la comunidad con `verifiedOfficial = false`.
      4. `AuthService.registerScout`: Notificar nueva postulación de scout con credencial deportiva adjunta.
  - **Frontend:** Sin cambios de UI requeridos; el panel administrativo (`/admin/verificacion-legal`, `/admin/scouts`, `/admin/clubes`) recibe tráfico directo desde los correos de alerta.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No se requieren migraciones DDL.
- Se reutiliza la tabla `users` existente filtrando por `role = 'ADMIN'` y `status = 'ACTIVE'`.

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Repositorio `UserRepository`
- Añadir métodos para consulta de administradores:
  ```java
  List<User> findByRole(UserRole role);
  List<User> findByRoleAndStatus(UserRole role, AccountStatus status);
  ```

### 4.2. Configuración Asíncrona (`com.talentus.scout.config.AsyncConfig`)
- Clase `@Configuration` con anotación `@EnableAsync` y configuración de ThreadPoolTaskExecutor si es necesario para tareas en segundo plano.

### 4.3. Servicio `AdminNotificationService` (`com.talentus.scout.service`)
- Métodos obligatorios:
  - `List<String> getActiveAdminEmails()`: Consulta los administradores activos en BD o recurre a `talentus.mail.admin-fallback-email`.
  - `@Async public void notifyNewTutorRegistered(User tutor, TutorLegalConsent consent)`
  - `@Async public void notifyNewAthleteRegistered(Athlete athlete)`
  - `@Async public void notifyNewCustomClubCreated(ClubOrganization club, String creatorEmail)`
  - `@Async public void notifyNewScoutRegistered(ScoutProfile scout)`
- Formato de correos con branding oficial Talentus Scout (fondo `#0A0F1D`, acentos `#10B981` y `#3B82F6`, tabla de datos clave y botón CTA directo con enlace al panel).

### 4.4. Inyección en Servicios del Dominio
- `AuthService`: Invocar `adminNotificationService.notifyNewTutorRegistered` al final de `registerTutor`.
- `AuthService`: Invocar `adminNotificationService.notifyNewScoutRegistered` al final de `registerScout`.
- `AthleteService`: Invocar `adminNotificationService.notifyNewAthleteRegistered` al final de `createAthlete`.
- `ClubService`: Invocar `adminNotificationService.notifyNewCustomClubCreated` cuando se persista un nuevo club no oficial con `verifiedOfficial = false`.

---

## 5. Pruebas y Verificación

### 5.1. Backend Tests
- `AdminNotificationServiceTest.java`:
  - Verificación de consulta de administradores con fallback.
  - Verificación de formateo y despacho de cada una de las 4 alertas (Tutor, Atleta, Club, Scout).
  - Verificación de ejecución asíncrona y no bloqueo de peticiones.
- Integración en `AuthScoutRegistrationTest`, `AthleteControllerTest`, etc.
- Comando: `./mvnw test -Dtest=AdminNotificationServiceTest`.

---

## 6. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Añadir consultas por rol y estatus en `UserRepository`.
- [x] **Paso 2:** Crear clase de configuración `AsyncConfig` con `@EnableAsync`.
- [x] **Paso 3:** Implementar `AdminNotificationService` con las 4 alertas administrativas asíncronas y diseño institucional.
- [x] **Paso 4:** Conectar `AdminNotificationService` en `AuthService.registerTutor` y `registerScout`.
- [x] **Paso 5:** Conectar `AdminNotificationService` en `AthleteService.createAthlete`.
- [x] **Paso 6:** Conectar `AdminNotificationService` en `ClubService.getOrCreateCustomClub`.
- [x] **Paso 7:** Escribir y validar pruebas unitarias y de integración (`AdminNotificationServiceTest`).
- [x] **Paso 8:** Verificar compilación completa de backend (`./mvnw clean compile`).
- [x] **Paso 9:** Verificar compilación de frontend (`npm run build`).
- [x] **Paso 10:** Generar documento de pruebas en `test/TS-61-test-plan-sistema-notificaciones-correo-administradores.md`.
- [x] **Paso 11:** Mover tarjeta a `in testing` en Trello con comentario resumen.

---

## 7. Criterios de Aceptación (Definition of Done - DoD)
- [x] Al registrar un tutor, se despacha una alerta asíncrona a todos los administradores activos con el resumen y enlace a `/admin/verificacion-legal`.
- [x] Al registrar un nuevo atleta, se alerta a los administradores sobre la nueva patria potestad pendiente de revisión.
- [x] Al crearse un club no oficial mediante "Otro", se envía una alerta a los administradores con enlace a `/admin/clubes`.
- [x] Al registrar un scout, se envía una alerta a los administradores con resumen de credenciales y enlace a `/admin/scouts`.
- [x] Los correos se envían de forma asíncrona sin degradar el tiempo de respuesta de los endpoints REST.
- [x] Pruebas automatizadas en verde (`./mvnw test`).
- [x] Plan de pruebas documentado en `test/`.
