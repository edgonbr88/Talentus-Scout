# Plan y Reporte de Pruebas — [TS-42] Portal y Flujo de Registro de Scouts en Frontend (Formulario con Credenciales, Landing Page, Navbar y Vista de Auditoría Pendiente)

## 1. Identificación de la Tarea
* **ID:** `TS-42`
* **Título:** Portal y Flujo de Registro de Scouts en Frontend (Formulario con Credenciales, Landing Page, Navbar y Vista de Auditoría Pendiente)
* **Trello Card:** [https://trello.com/c/341HlE9G](https://trello.com/c/341HlE9G) (ID: `6acfafde2819c8438db8561b`)
* **Sprint:** Sprint 3
* **Fecha de Ejecución:** 2026-10-15
* **Estado:** Verificado / Listo para Testing

---

## 2. Alcance de las Pruebas
* **Frontend (Angular 18+ Standalone & SSR):**
  - Modelos TypeScript en `src/app/core/models/auth.model.ts` (`RegisterScoutRequest`, `RegisterScoutResponse`).
  - Servicio `AuthService` en `src/app/core/auth/auth.service.ts` (`registerScout(data: FormData)`).
  - Componente de Registro en `src/app/features/auth/register-scout/` (`register-scout.component.ts`, `.html`, `.css`, `.spec.ts`).
  - Componente de Auditoría Pendiente en `src/app/features/auth/scout-pending-audit/` (`scout-pending-audit.component.ts`, `.html`, `.css`, `.spec.ts`).
  - Enrutamiento en `src/app/app.routes.ts` (`/register-scout` y `/auth/scout-pending-audit`).
  - Puntos de acceso: Hero y Bento Grid en `landing.component.html`, enlace en `navbar.component.html`, y pie de página en `login.component.html`.
* **Backend (Spring Boot 3 / Java 21):**
  - Endpoint `POST /api/v1/auth/register-scout` y validación de compatibilidad `AuthScoutRegistrationTest.java`.

---

## 3. Pruebas Automatizadas Ejecutadas

### 3.1 Frontend: Jasmine / Karma (`npm test -- --watch=false --browsers=ChromeHeadless`)
* **Comando:** `npm test -- --watch=false --browsers=ChromeHeadless`
* **Resultado Global:** **91 SUCCESS / 0 FAILED** (3.489 segundos).
* **Suites de Pruebas Evaluadas:**
  1. `RegisterScoutComponent`:
     - [x] Debe crearse e inicializar el formulario inválido por defecto (`valid === false`, `selectedFile === null`).
     - [x] Validación de formato telefónico internacional E.164 (`+584121234567` válido vs `04121234567` inválido).
     - [x] Activación de campo dinámico cuando se selecciona el rol `"Otro"`.
     - [x] Rechazo estricto de archivos de credenciales mayores a 10MB con mensaje en pantalla.
     - [x] Aceptación de credenciales válidas en PDF, PNG o JPG mostrando tamaño y nombre de archivo.
     - [x] Envío reactivo del formulario generando petición multipart a `AuthService.registerScout` y redirección a `/auth/scout-pending-audit`.
     - [x] Manejo de error HTTP 409 por conflicto de correo electrónico duplicado, desplegando alerta de advertencia y enlace de inicio de sesión.
  2. `ScoutPendingAuditComponent`:
     - [x] Renderizado de datos del postulante a partir de `queryParams` (`email` y `org`).
     - [x] Visualización del timeline de auditoría de 3 pasos y plazo estimado (24 a 48 horas hábiles).
     - [x] Existencia y verificación de enlaces a `/login` y a la página de inicio `/`.

### 3.2 Compilación del Frontend (`npm run build`)
* **Resultado:** Compilación limpia de bundles de cliente y bundles de servidor (SSR) en 45.92 segundos sin errores de TypeScript ni advertencias de tipos.
* **Rutas prerenderizadas:** 13 rutas estáticas generadas exitosamente.

### 3.3 Backend: Spring Boot Test Suite (`./mvnw test`)
* **Comando:** `./mvnw test -Dtest=AuthScoutRegistrationTest,AthleteControllerTest`
* **Resultado:** **15 tests ejecutados, 0 fallos, 0 errores, BUILD SUCCESS**.

---

## 4. Guía de Pruebas Manuales / Verificación Paso a Paso

### 4.1 Flujo de Registro Completo en la Interfaz de Usuario
1. Abrir la página principal `http://localhost:4200/`.
2. Verificar el botón `"Acceso para Scouts / Clubes"` en el Hero de la Landing Page.
3. Verificar la tarjeta Bento destacada `"¿Buscas Talento Juvenil para tu Club o Academia?"` con botón de solicitud.
4. Hacer clic en cualquiera de los botones o en el enlace superior `"¿Eres Scout?"` del Navbar.
5. Confirmar que se carga la ruta `/register-scout` con el banner de salvaguarda legal LOPNNA & FIFA.
6. Probar validaciones reactivas en rojo:
   - Intentar enviar el formulario vacío -> Todos los campos requeridos se tornan con borde rojo y muestran mensaje explicativo.
   - Ingresar teléfono nacional sin prefijo internacional (ej. `04121234567`) -> Alerta de formato internacional.
   - Seleccionar rol `"Otro"` -> Aparece el input adicional para detallar el cargo deportivo.
   - Adjuntar un archivo de más de 10MB o extensión no permitida (`.txt`, `.exe`) -> Dropzone muestra mensaje de error en rojo.
7. Adjuntar credencial válida (PDF o imagen de hasta 10MB).
8. Completar los campos con datos válidos y pulsar `"Solicitar Acreditación de Scout Oficial"`.
9. Verificar que se realiza la petición HTTP `POST /api/v1/auth/register-scout` con `FormData`.
10. Confirmar redirección automática a `/auth/scout-pending-audit?email=...&org=...`.
11. Verificar que la pantalla de auditoría pendiente muestra el timeline de evaluación deportiva, los plazos de 24 a 48 horas y los botones de navegación.

### 4.2 Verificación de Conflicto de Correo (HTTP 409)
1. En `/register-scout`, completar el formulario con un correo ya existente en base de datos.
2. Enviar solicitud.
3. Verificar que aparece el banner de advertencia informando que el correo ya está registrado con enlace directo a `/login`.

### 4.3 Verificación de Acceso No Autorizado al Directorio (Guards)
1. Iniciar sesión con la cuenta de scout recién creada (en estatus `PENDING_VERIFICATION`).
2. Intentar navegar a `/scout/directory`.
3. Confirmar que `scoutGuard` bloquea el acceso redirigiendo al dashboard o login, protegiendo los datos biométricos de los menores de edad conforme al Art. 65 de la LOPNNA.

---

## 5. Matriz de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Observación |
| :--- | :---: | :--- |
| Ruta `/register-scout` accesible desde Hero, banner de captación, Navbar superior y pie de Login | **VERIFICADO** | Integrado en los cuatro touchpoints de la aplicación. |
| Formulario reactivo con validaciones en tiempo real en rojo (TS-34) | **VERIFICADO** | Alertas para requeridos, formato email, mín. 8 caracteres, formato telefónico `+58...` y credencial. |
| Selector / Dropzone de credenciales deportivas (PDF, PNG, JPG hasta 10MB) | **VERIFICADO** | Soporta arrastre y selección manual, cálculo de MB y botón de remoción. |
| Envío multipart a `/api/v1/auth/register-scout` y redirección a `/auth/scout-pending-audit` | **VERIFICADO** | Probado unitariamente y compilado en el bundle final. |
| Vista informativa de auditoría pendiente con marco legal (LOPNNA / FIFA) y plazos de 24-48h | **VERIFICADO** | Componente standalone con timeline de 3 pasos y explicaciones jurídicas. |
| Bloqueo estricto del Directorio de Scouts para perfiles en estado pendiente | **VERIFICADO** | Validado con `scoutGuard` (`canAccessDirectory()` exige `isVerifiedScout()`). |
| Manejo amigable de error por email duplicado (HTTP 409) | **VERIFICADO** | Alerta visual con sugerencia y enlace a `/login`. |
| Pruebas automatizadas y compilación sin errores | **VERIFICADO** | 91/91 tests frontend en verde, 15/15 tests backend en verde, `npm run build` exitoso. |

---

## 6. Conclusión
La implementación de la tarjeta `[TS-42]` cumple rigurosamente con los requerimientos técnicos y legales, respeta las directrices de diseño de `fe-desing.md` con separación estricta de plantillas `.component.html`, y provee al ecosistema de Talentus Scout un canal seguro y profesional de onboarding para cazatalentos.
