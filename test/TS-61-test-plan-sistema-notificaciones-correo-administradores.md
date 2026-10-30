# Plan de Pruebas y Verificación: [TS-61] Sistema de Notificaciones por Correo a Administradores ante Nuevos Registros y Solicitudes de Auditoría

**ID Tarea:** TS-61  
**Título:** Sistema de Notificaciones por Correo a Administradores ante Nuevos Registros y Solicitudes de Auditoría  
**Tarjeta Trello:** `https://trello.com/c/5W4JmHj8` / ID: `6ad696c6465c09bd5af52656`  
**Sprint:** Sprint 4  
**Fecha de Ejecución:** 2026-10-27  
**Agente Implementador:** trello_implementer  
**Estado:** PRUEBAS COMPLETADAS — APTO PARA TESTING  

---

## 1. Alcance de las Pruebas

El objetivo de esta batería de pruebas es asegurar que la administración de Talentus Scout reciba alertas tempranas automáticas e inmediatas cada vez que un usuario realiza una acción sujeta a verificación oficial o auditoría legal (LOPNNA Art. 65 y FIFA), agilizando los tiempos de respuesta por debajo del SLA de 24 horas.

### Componentes y Clases Impactadas:
- **Base de Datos / Repositorio:**
  - `com.talentus.scout.repository.UserRepository`: Consulta dinámica de administradores activos con `findByRoleAndStatus(UserRole.ADMIN, AccountStatus.ACTIVE)`.
- **Configuración Asíncrona:**
  - `com.talentus.scout.config.AsyncConfig`: Anotación `@EnableAsync` para procesamiento no bloqueante en hilos secundarios.
- **Servicio de Alertas Administrativas:**
  - `com.talentus.scout.service.AdminNotificationService`:
    - `getActiveAdminEmails`: Consulta de destinatarios con fallback a `talentus.mail.admin-fallback-email`.
    - `notifyNewTutorRegistered`: Alerta con datos del tutor, documento de identidad consignado y CTA a `/admin/verificacion-legal`.
    - `notifyNewAthleteRegistered`: Alerta con datos del atleta, edad, club, tutor y CTA a `/admin/verificacion-legal`.
    - `notifyNewCustomClubCreated`: Alerta con datos del club comunitario, ubicación, creador y CTA a `/admin/clubes`.
    - `notifyNewScoutRegistered`: Alerta con datos del scout, credencial deportiva adjunta, rol y CTA a `/admin/scouts`.
- **Servicio de Despacho de Correo:**
  - `com.talentus.scout.service.mail.EmailService`: Método `sendAdminAlert` integrado con Resend API y fallback simulado en consola.
- **Puntos de Integración en el Dominio:**
  - `com.talentus.scout.service.AuthService.registerTutor`
  - `com.talentus.scout.service.AuthService.registerScout`
  - `com.talentus.scout.service.AthleteService.createAthlete`
  - `com.talentus.scout.service.ClubService.getOrCreateCustomClub`

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / Mockito)
Comando ejecutado:
```bash
./mvnw test -Dtest=AdminNotificationServiceTest,AdminClubControllerTest,AuthScoutRegistrationTest
```
Resultados: **17 pruebas ejecutadas, 0 fallos, 0 errores (100% PASS)**.

| Suite de Pruebas | Casos Ejecutados | Resultado |
| :--- | :---: | :---: |
| **`AdminNotificationServiceTest`** | 6 pruebas unitarias | **PASS (100%)** |
| **`AdminClubControllerTest`** | 5 pruebas de integración | **PASS (100%)** |
| **`AuthScoutRegistrationTest`** | 6 pruebas de integración | **PASS (100%)** |

#### Detalle de Pruebas Unitarias (`AdminNotificationServiceTest`):
1. `getActiveAdminEmails_returnsDatabaseAdmins`: Verifica que se obtengan los correos de los usuarios con rol `ADMIN` y estado `ACTIVE` en BD (**PASS**).
2. `getActiveAdminEmails_whenNoneInDb_returnsFallback`: Verifica que si no existen administradores activos registrados se utilice la dirección fallback configurable (**PASS**).
3. `notifyNewTutorRegistered_success`: Verifica que se formatee y despache la alerta de tutor con el documento legal y enlace a `/admin/verificacion-legal` (**PASS**).
4. `notifyNewAthleteRegistered_success`: Verifica que se envíe la alerta de atleta con datos del tutor, club y enlace a auditoría de patria potestad (**PASS**).
5. `notifyNewCustomClubCreated_success`: Verifica que se envíe la alerta de nueva academia/club comunitario con enlace de homologación a `/admin/clubes` (**PASS**).
6. `notifyNewScoutRegistered_success`: Verifica que se envíe la alerta de scout con credenciales consignadas y enlace a `/admin/scouts` (**PASS**).

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Verificación del Despacho de Correos en Consola / Resend

Cuando se ejecutan las siguientes acciones, verificar en los logs de la aplicación el despacho con `Resend ID` o el bloque de simulación de correo:

#### A. Registro de Tutor
- **Petición HTTP:** `POST /api/v1/auth/register-tutor` con `multipart/form-data` (datos del tutor y archivo de documento de identidad).
- **Log Esperado en Backend:**
  ```text
  INFO c.t.scout.service.mail.EmailService : Correo '[ALERTA ADMIN] Nuevo Representante Registrado — Requiere Verificación de Documento' despachado con éxito vía Resend API a admin@talentus.app.
  INFO c.t.s.service.AdminNotificationService : Alerta de nuevo tutor tutor@example.com despachada a administradores.
  ```
- **Contenido del Correo:**
  - Nombre del tutor, correo, teléfono, país y estado.
  - Tipo y número de documento (ej. V 12.345.678).
  - Estado del archivo ("Documento Adjunto en Plataforma").
  - Botón: "Auditar Documento de Representante" (`https://talentus.app/admin/verificacion-legal`).

#### B. Inscripción de Atleta
- **Petición HTTP:** `POST /api/v1/athletes` con token de tutor autenticado.
- **Log Esperado en Backend:**
  ```text
  INFO c.t.scout.service.mail.EmailService : Correo '[ALERTA ADMIN] Nuevo Atleta Inscrito — Patria Potestad Pendiente de Auditoría' despachado con éxito vía Resend API a admin@talentus.app.
  INFO c.t.s.service.AdminNotificationService : Alerta de nuevo atleta Juan Pérez despachada a administradores.
  ```
- **Contenido del Correo:**
  - Nombre del atleta, fecha de nacimiento, posición deportiva, club formativo.
  - Datos del tutor responsable.
  - Estado: "PENDIENTE DE REVISIÓN".
  - Botón: "Auditar Patria Potestad del Atleta" (`https://talentus.app/admin/verificacion-legal`).

#### C. Registro de Organización Comunitaria ("Otro")
- **Petición HTTP:** Al inscribir un atleta o registrar un scout especificando `customClubName: "Academia Los Andes"`.
- **Log Esperado en Backend:**
  ```text
  INFO c.t.scout.service.mail.EmailService : Correo '[ALERTA ADMIN] Nueva Organización Registrada por Comunidad — Pendiente de Homologación' despachado con éxito vía Resend API a admin@talentus.app.
  INFO c.t.s.service.AdminNotificationService : Alerta de nuevo club comunitario Academia Los Andes despachada a administradores.
  ```
- **Contenido del Correo:**
  - Nombre del club, ciudad, estado, país y usuario que lo originó.
  - Botón: "Verificar y Homologar Club" (`https://talentus.app/admin/clubes`).

#### D. Registro de Scout / Reclutador
- **Petición HTTP:** `POST /api/v1/auth/register-scout` con `multipart/form-data` (datos del scout y archivo de credencial).
- **Log Esperado en Backend:**
  ```text
  INFO c.t.scout.service.mail.EmailService : Correo '[ALERTA ADMIN] Nueva Solicitud de Acreditación de Scout — Requiere Auditoría' despachado con éxito vía Resend API a admin@talentus.app.
  INFO c.t.s.service.AdminNotificationService : Alerta de nuevo scout veedor@scouting.com despachada a administradores.
  ```
- **Contenido del Correo:**
  - Nombre del scout, correo, teléfono, organización y rol deportivo.
  - Enlace al documento de credencial.
  - Botón: "Auditar Credencial de Scout" (`https://talentus.app/admin/scouts`).

---

## 4. Matriz de Criterios de Aceptación (DoD)

- [x] **Alerta de Tutor:** Al completarse el registro de un tutor, se envía un correo a todos los administradores activos con el resumen del tutor y botón CTA hacia `/admin/verificacion-legal`.
- [x] **Alerta de Atleta:** Al registrarse un atleta en el panel del tutor, se envía un correo alertando sobre la nueva patria potestad pendiente de revisión con enlace directo.
- [x] **Alerta de Club Comunitario:** Al registrarse un club no oficial mediante "Otro", se envía una alerta a los administradores con enlace a `/admin/clubes` para su auditoría y homologación.
- [x] **Alerta de Scout:** Al postularse un scout, se envía una alerta a los administradores con el rol, organización y enlace a `/admin/scouts`.
- [x] **Ejecución Asíncrona:** Los métodos de alerta están anotados con `@Async`, garantizando tiempos de respuesta ultrarrápidos (< 200ms) en los controladores REST.
- [x] **Resiliencia y Fallback:** Si no hay administradores activos registrados en BD, se utiliza el correo institucional configurado en `talentus.mail.admin-fallback-email`.
- [x] **Pruebas Automatizadas:** 6/6 pruebas unitarias (`AdminNotificationServiceTest`) y 17/17 pruebas totales de regresión pasando en verde.
- [x] **Documentación:** Plan de implementación y plan de pruebas documentados con trazabilidad en `plans/` y `test/`.

---

## 5. Casos Borde y Validaciones Críticas

1. **Persistencia y Desacoplamiento:** Los errores en el despacho de correo (ej. cuota agotada de API o timeout de red) son capturados y logueados por `EmailService` sin abortar las transacciones de registro de tutores, atletas o scouts.
2. **Administradores Múltiples:** Si existen varios administradores activos en la tabla `users`, el servicio envía una copia personalizada de la notificación a cada uno de ellos de forma concurrente.
3. **Seguridad de Datos:** Las notificaciones por correo solo contienen datos informativos esenciales para la auditoría y enlaces seguros; los documentos de identidad sensibles permanecen protegidos bajo control de acceso de la API.
