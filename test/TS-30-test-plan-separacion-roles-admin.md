# Plan de Pruebas: [TS-30] Separación de Roles de Administrador: Redirección a /admin/scouts, Remoción de "Mi Panel" y Restricción de Registro de Atletas/Videos

**ID Tarea:** TS-30  
**Tarjeta Trello:** https://trello.com/c/iejdoxun  
**Fecha:** 2026-10-13  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo primordial de este plan de pruebas es certificar la segregación estricta de responsabilidades del rol `ADMIN`, protegiendo la plataforma frente a accesos y operaciones no correspondientes a la gobernanza:
1. Impedir la creación de atletas por administradores (`POST /api/v1/athletes` restringido exclusivamente a `TUTOR`).
2. Impedir la consulta de atletas propios por administradores (`GET /api/v1/athletes/my-athletes` restringido exclusivamente a `TUTOR`).
3. Impedir la solicitud y subida de videos por administradores (`POST /api/v1/videos/request-upload` y `POST /api/v1/videos/mock-upload/{videoId}` restringidos a `TUTOR` y `ATHLETE`).
4. Redirigir de forma automática e inmediata al administrador hacia `/admin/scouts` tanto tras el inicio de sesión como si intenta ingresar manualmente a la ruta `/dashboard`.
5. Ocultar el enlace "Mi Panel" (`/dashboard`) en el Navbar cuando el usuario autenticado es `ADMIN`, desplegando en su lugar los accesos administrativos de fiscalización.

### Componentes Impactados
* **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  * `com.talentus.scout.web.controller.AthleteController`: `@PreAuthorize("hasRole('TUTOR')")` en `createAthlete` y `getMyAthletes`.
  * `com.talentus.scout.web.controller.VideoController`: `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")` en `requestUpload` y `mockUpload`.
  * `com.talentus.scout.service.VideoService`: Verificación de titularidad y restricción explícita para administradores.
  * `com.talentus.scout.web.controller.AthleteControllerTest`: Casos de prueba para verificar 403 Forbidden con rol ADMIN.
  * `com.talentus.scout.web.controller.VideoControllerTest`: Casos de prueba para verificar 403 Forbidden con rol ADMIN en subida de videos.
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `src/app/core/auth/tutor.guard.ts`: Guard funcional para proteger `/dashboard` redirigiendo a `ADMIN` hacia `/admin/scouts`.
  * `src/app/core/auth/tutor.guard.spec.ts`: Pruebas unitarias para `tutorGuard`.
  * `src/app/app.routes.ts`: Aplicación de `tutorGuard` a la ruta `/dashboard`.
  * `src/app/features/auth/login/login.component.ts`: Redirección tras autenticación según rol (`ADMIN` -> `/admin/scouts`).
  * `src/app/shared/components/navbar/navbar.component.html`: Ocultación de "Mi Panel" para administradores y despliegue de "Auditoría Scouts", "Auditoría Pagos" y "Patria Potestad".

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=AthleteControllerTest,VideoControllerTest
```

#### Resultados de Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `AthleteControllerTest` | 9 | 9 | 0 | **PASSED** |
| `VideoControllerTest` | 7 | 7 | 0 | **PASSED** |
| **Total Backend** | **16** | **16** | **0** | **100% OK** |

#### Casos de Prueba Verificados:
1. `createAthlete_WithAdminRole_Returns403Forbidden`: Usuario con rol `ADMIN` intentando crear un atleta recibe `HTTP 403 Forbidden`.
2. `getMyAthletes_WithAdminRole_Returns403Forbidden`: Usuario con rol `ADMIN` intentando listar atletas bajo su tutela recibe `HTTP 403 Forbidden`.
3. `shouldRejectUploadTicketWhenUserIsAdmin`: Usuario con rol `ADMIN` intentando generar ticket de carga de video recibe `HTTP 403 Forbidden`.
4. `createAthlete_WithValidData_Returns201AndGeneratedSlug`: Tutor legítimo crea atleta con éxito (201 Created).
5. `shouldRequestUploadTicketSuccessfully`: Tutor legítimo genera ticket de video para su representado (201 Created).

---

### 2.2. Frontend (Angular 18+ / Jasmine & Karma)
Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

#### Resultados de Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| Total Suites Frontend (`talentus-scout-fe`) | 42 | 42 | 0 | **100% SUCCESS** |
| `tutorGuard` | 3 | 3 | 0 | **PASSED** |

#### Casos de Prueba Verificados en `tutor.guard.spec.ts`:
1. `debe redirigir a /admin/scouts cuando el usuario tiene rol ADMIN`: Al acceder a `/dashboard`, `tutorGuard` detecta rol `ADMIN`, bloquea el acceso (`false`) y redirige a `/admin/scouts`.
2. `debe redirigir a /scout/directory cuando el usuario tiene rol SCOUT`: Bloquea acceso a `/dashboard` para scouts y redirige a su directorio deportivo.
3. `debe permitir acceso cuando el usuario tiene rol TUTOR`: Permite ingreso a `/dashboard` retornando `true` sin alterar la navegación.

---

### 2.3. Verificación de Compilación y Bundles Frontend
Comando ejecutado:
```bash
npm run build
```
Resultado:
- Generación de bundles de navegador y servidor finalizada exitosamente en 34.277 segundos.
- 11 rutas estáticas prerenderizadas correctamente.
- Cero errores de compilación TypeScript / HTML.

---

## 3. Guía de Pruebas Manuales (cURL / Verificación Paso a Paso)

### 3.1. Intento de Creación de Atleta con Token de Administrador (403 Forbidden)
```bash
curl -i -X POST http://localhost:8080/api/v1/athletes \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Atleta",
    "lastName": "Prueba",
    "birthDate": "2010-06-15",
    "primaryPosition": "DELANTERO_CENTRO",
    "preferredFoot": "DERECHO"
  }'
```
**Respuesta Esperada:**
```http
HTTP/1.1 403 Forbidden
```

### 3.2. Intento de Solicitud de Carga de Video con Token de Administrador (403 Forbidden)
```bash
curl -i -X POST http://localhost:8080/api/v1/videos/request-upload \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<UUID_ATLETA>",
    "title": "Subida no autorizada por Admin",
    "category": "HIGHLIGHTS"
  }'
```
**Respuesta Esperada:**
```http
HTTP/1.1 403 Forbidden
```

### 3.3. Comportamiento en Navegador para Usuario Administrador
1. Iniciar sesión con credenciales de usuario con rol `ADMIN`:
   - El sistema redirige automáticamente a la URL `/admin/scouts`.
2. Observar la barra de navegación superior (Navbar):
   - El enlace "Mi Panel" **NO** está presente.
   - Los enlaces "Auditoría Scouts", "Auditoría Pagos" y "Patria Potestad" están visibles y activos.
3. Escribir manualmente `http://localhost:4200/dashboard` en la barra de direcciones:
   - `tutorGuard` intercepta la navegación y redirige de forma inmediata a `/admin/scouts`.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
|---|---|---|
| Redirección inmediata a `/admin/scouts` tras login con rol `ADMIN` (credenciales y social login) | **VERIFICADO** | Lógica en `login.component.ts` bifurca según `res.role === 'ADMIN'` redirigiendo a `/admin/scouts`. |
| Remoción de "Mi Panel" en la barra de navegación para rol `ADMIN` | **VERIFICADO** | `navbar.component.html` condiciona "Mi Panel" a `@if (authService.isTutor())`. |
| Visualización de enlaces de auditoría para rol `ADMIN` en la barra de navegación | **VERIFICADO** | Enlaces a `Auditoría Scouts`, `Auditoría Pagos` y `Patria Potestad` presentes bajo `@if (authService.isAdmin())`. |
| Redirección automática a `/admin/scouts` si un `ADMIN` accede manualmente a `/dashboard` | **VERIFICADO** | `tutorGuard` activo en ruta `dashboard` dentro de `app.routes.ts`, validado en suite `tutor.guard.spec.ts`. |
| Rechazo con `HTTP 403 Forbidden` en `POST /api/v1/athletes` para rol `ADMIN` | **VERIFICADO** | Endpoint protegido con `@PreAuthorize("hasRole('TUTOR')")`, validado en `AthleteControllerTest`. |
| Rechazo con `HTTP 403 Forbidden` en `POST /api/v1/videos/request-upload` para rol `ADMIN` | **VERIFICADO** | Endpoint protegido con `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`, validado en `VideoControllerTest`. |
| Todas las pruebas automatizadas de backend y frontend pasan 100% en verde | **VERIFICADO** | 16 tests backend y 42 tests frontend en verde; `npm run build` sin errores. |

---

## 5. Salvaguardas de Cumplimiento Legal (LOPNNA Art. 65 / Normas FIFA)
* **Separación de Poderes:** El equipo administrativo y de auditoría no interfiere en la patria potestad ni genera identidades deportivas arbitrarias de menores de edad.
* **Seguridad y Custodia de Datos:** Los datos sensibles de atletas quedan bajo el control exclusivo de sus tutores legales formalmente registrados.
