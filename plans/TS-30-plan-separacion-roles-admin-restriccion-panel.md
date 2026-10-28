# Plan de Implementación: [TS-30] Separación de Roles de Administrador: Redirección a /admin/scouts, Remoción de "Mi Panel" y Restricción de Registro de Atletas/Videos

**ID Tarea:** TS-30  
**Tarjeta Trello:** https://trello.com/c/iejdoxun  
**Fecha:** 2026-10-13  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** En Talentus Scout, el rol `ADMIN` tiene como propósito exclusivo la gobernanza, verificación y aprobación de scouts, fiscalización de certificaciones, auditoría legal de patria potestad y conciliación de transacciones de pago. Un administrador no es un tutor legal ni posee patria potestad sobre los atletas menores de edad. Permitir que un administrador registre atletas, suba videos o sea redirigido por defecto al panel del tutor (`/dashboard`) distorsiona el flujo operativo, genera perfiles huérfanos sin respaldo legal parental y debilita la seguridad de la plataforma.
- **Impacto:** Segregación clara de responsabilidades, experiencia de usuario consistente para administradores (ingreso directo a `/admin/scouts`), remoción de enlaces irrelevantes ("Mi Panel") y blindaje a nivel de API para impedir que administradores registren deportistas o suban material audiovisual.
- **Restricciones Legales (LOPNNA Art. 65 / Normas FIFA):** La patria potestad, consentimiento informado y custodia de la imagen y honor del menor corresponden ineludiblemente a sus tutores legales formalmente verificados. Separar de raíz las funciones administrativas de la representación legal deportiva protege a la organización y a los menores frente a vulnerabilidades normativas.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Backend (`talentus-scout-be`):**
    - `AthleteController.java`: Restringir `POST /api/v1/athletes` y `GET /api/v1/athletes/my-athletes` exclusivamente al rol `TUTOR` con `@PreAuthorize("hasRole('TUTOR')")`.
    - `VideoController.java`: Retirar el rol `ADMIN` de `POST /api/v1/videos/request-upload` y `POST /api/v1/videos/mock-upload/{videoId}`, dejándolos restringidos a `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`.
    - `AthleteControllerTest.java` y `VideoControllerTest.java`: Casos de prueba automatizados verificando el rechazo con `403 Forbidden` ante solicitudes con token de rol `ADMIN`.
  - **Frontend (`talentus-scout-fe`):**
    - `login.component.ts`: Redirigir a `/admin/scouts` cuando el usuario autenticado (vía formulario o social login) tenga rol `ADMIN`.
    - `navbar.component.html`: Ocultar el enlace "Mi Panel" (`/dashboard`) para el rol `ADMIN`, mostrándolo únicamente cuando `authService.isTutor()`. Asegurar la visualización de enlaces administrativos (`Auditoría Scouts`, `Auditoría Pagos`, `Patria Potestad`).
    - `tutor.guard.ts`: Crear guard funcional `tutorGuard` para `/dashboard` que redirija automáticamente a usuarios `ADMIN` hacia `/admin/scouts` y a `SCOUT` hacia `/scout/directory`.
    - `app.routes.ts`: Aplicar `tutorGuard` a la ruta `/dashboard`.
    - `tutor.guard.spec.ts`, `navbar.component.spec.ts` o `login.component.spec.ts`: Tests unitarios de Frontend.
- **Dependencias:** TS-03 (Seguridad Spring Security), TS-06 (Autenticación y Navegación Angular) y TS-28 (Auditoría Patria Potestad).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Impacto DDL:** No requiere migraciones DDL en base de datos. Los modelos `users`, `athletes` y roles del sistema ya soportan la segregación.

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Clases a Modificar:**
  1. `com.talentus.scout.web.controller.AthleteController`:
     - `createAthlete`: Cambiar anotación a `@PreAuthorize("hasRole('TUTOR')")`.
     - `getMyAthletes`: Cambiar anotación a `@PreAuthorize("hasRole('TUTOR')")`.
  2. `com.talentus.scout.web.controller.VideoController`:
     - `requestUpload`: Cambiar a `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`.
     - `mockUpload`: Cambiar a `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`.
  3. `com.talentus.scout.web.controller.AthleteControllerTest`:
     - Añadir test `createAthlete_WithAdminRole_Returns403Forbidden()`.
     - Añadir test `getMyAthletes_WithAdminRole_Returns403Forbidden()`.
  4. `com.talentus.scout.web.controller.VideoControllerTest`:
     - Actualizar test `shouldRejectUploadTicketWhenUserIsAdmin`: verificar `status().isForbidden()` (403).

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directiva de Diseño ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Mantener la sobriedad y jerarquía del Navbar oficial de Talentus Scout.
  - Eliminar ruido visual en la barra para administradores (remover "Mi Panel" que carece de sentido operativo para un auditor).
  - Enlaces directos y accesibles para las herramientas de fiscalización: `Auditoría Scouts`, `Auditoría Pagos` y `Patria Potestad`.
- **Archivos a Crear / Modificar:**
  1. `src/app/core/auth/tutor.guard.ts` (Nuevo guard funcional para proteger `/dashboard`).
  2. `src/app/core/auth/tutor.guard.spec.ts` (Pruebas unitarias del guard).
  3. `src/app/app.routes.ts` (Incorporar `tutorGuard` a la ruta `dashboard`).
  4. `src/app/features/auth/login/login.component.ts` (Redirección condicional a `/admin/scouts` para rol `ADMIN`).
  5. `src/app/shared/components/navbar/navbar.component.html` (Condicionar enlace "Mi Panel" a `authService.isTutor()`).

---

## 6. Pruebas y Verificación
- **Backend:**
  - `./mvnw test -Dtest=AthleteControllerTest,VideoControllerTest`
  - Validar códigos de respuesta HTTP:
    - 403 Forbidden al intentar crear atleta con rol `ADMIN`.
    - 403 Forbidden al intentar listar `my-athletes` con rol `ADMIN`.
    - 403 Forbidden al intentar solicitar subida de video con rol `ADMIN`.
- **Frontend:**
  - `npm test -- --watch=false --browsers=ChromeHeadless`
  - `npm run build`
  - Verificación en navegador / guards:
    - Login de usuario ADMIN navega a `/admin/scouts`.
    - Navbar para ADMIN no muestra "Mi Panel".
    - Acceso directo por URL a `/dashboard` con sesión ADMIN redirige a `/admin/scouts`.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Backend: Actualizar `AthleteController.java` para restringir `POST /api/v1/athletes` y `GET /api/v1/athletes/my-athletes` a `hasRole('TUTOR')`.
- [x] 2. Backend: Actualizar `VideoController.java` para restringir endpoints de carga a `hasAnyRole('TUTOR', 'ATHLETE')` (removiendo `ADMIN`).
- [x] 3. Backend: Actualizar `AthleteControllerTest.java` y `VideoControllerTest.java` verificando 403 Forbidden para usuarios `ADMIN`.
- [x] 4. Backend: Ejecutar pruebas backend `./mvnw test -Dtest=AthleteControllerTest,VideoControllerTest`.
- [x] 5. Frontend: Crear `src/app/core/auth/tutor.guard.ts` y sus pruebas unitarias en `tutor.guard.spec.ts`.
- [x] 6. Frontend: Configurar `tutorGuard` en la ruta `/dashboard` dentro de `src/app/app.routes.ts`.
- [x] 7. Frontend: Actualizar `login.component.ts` para redirigir a `/admin/scouts` cuando el rol sea `ADMIN`.
- [x] 8. Frontend: Actualizar `navbar.component.html` para mostrar "Mi Panel" únicamente cuando `authService.isTutor()`.
- [x] 9. Frontend: Ejecutar pruebas unitarias (`npm test`) y verificar compilación limpia (`npm run build`).
- [x] 10. Documentar Plan de Pruebas en `test/TS-30-test-plan-separacion-roles-admin.md`.
- [x] 11. Mover la tarjeta en Trello a `in testing` y actualizar checkboxes de este plan.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Al iniciar sesión con rol `ADMIN` (credenciales o social login), la vista cargada por defecto es `/admin/scouts`.
- [x] En la barra de navegación superior (Navbar), el rol `ADMIN` no visualiza el botón ni enlace a "Mi Panel" (`/dashboard`).
- [x] En la barra de navegación superior, el rol `ADMIN` visualiza enlaces directos a "Auditoría Scouts" (`/admin/scouts`) y "Auditoría Pagos" (`/admin/pagos`).
- [x] Si un usuario con sesión activa de `ADMIN` navega manualmente a `/dashboard`, es redirigido automáticamente a `/admin/scouts`.
- [x] Peticiones a `POST /api/v1/athletes` realizadas con token de rol `ADMIN` son rechazadas con `HTTP 403 Forbidden`.
- [x] Peticiones a `POST /api/v1/videos/request-upload` realizadas con token de rol `ADMIN` son rechazadas con `HTTP 403 Forbidden`.
- [x] Todas las pruebas automatizadas de backend (`./mvnw test`) y frontend (`npm test`, `npm run build`) pasan exitosamente en verde.
