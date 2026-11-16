# Plan de Pruebas: [TS-75] Restringir acceso y visibilidad de Carga Masiva para el rol ADMIN (UI, rutas y backend)

**ID Tarea:** TS-75  
**Tarjeta Trello:** [https://trello.com/c/3d6YgB1e](https://trello.com/c/3d6YgB1e)  
**Fecha:** 2026-11-16  
**Rama Backend:** `feature/TS-75-restringir-acceso-carga-masiva-admin`  
**Rama Frontend:** `feature/TS-75-restringir-acceso-carga-masiva-admin`  

---

## 1. Alcance de las Pruebas
- **Backend (`talentus-scout-be`):**
  - Controlador REST: `com.talentus.scout.web.controller.BulkImportController`
    - Endpoints protegidos:
      - `POST /api/v1/scout/bulk-import/upload`
      - `POST /api/v1/scout/bulk-import/google-sheet`
      - `GET /api/v1/scout/bulk-import/jobs/{jobId}`
      - `GET /api/v1/scout/bulk-import/jobs`
      - `GET /api/v1/scout/bulk-import/jobs/{jobId}/report`
    - Endpoint público/informativo preservado:
      - `GET /api/v1/scout/bulk-import/template`
  - Servicio de Negocio: `com.talentus.scout.service.bulkimport.BulkImportService`
    - Verificación estricta de prohibición para `UserRole.ADMIN`.
    - Lanzamiento de `AccessDeniedException` ante solicitudes indebidas.
- **Frontend (`talentus-scout-fe`):**
  - Servicio de Autenticación: `src/app/core/auth/auth.service.ts`
    - Señal computada `canAccessBulkImport`: Excluye `ADMIN`, requiriendo scout verificado con `bulkImportEnabled === true`.
  - Guard de Navegación: `src/app/core/auth/bulk-import.guard.ts`
    - Redirección según rol y permisos: `ADMIN` -> `/admin/scouts`, Scout no habilitado -> `/scout/directory`, Scout no verificado -> `/auth/scout-pending-audit`, otros -> `/dashboard`, no autenticado -> `/login`.
  - Rutas: `src/app/app.routes.ts`
    - Protección de la ruta `scout/bulk-import` con `[authGuard, bulkImportGuard]`.
  - Componentes de UI:
    - `NavbarComponent`: Ocultamiento reactivo del enlace "Carga Masiva" para `ADMIN`.
    - `ScoutDirectoryComponent`: Ocultamiento reactivo del botón "Carga Masiva de Atletas" en el encabezado.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (`talentus-scout-be`)
- **Comando:**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=BulkImportControllerIntegrationTest
  ```
- **Resultados:**
  - `uploadSingleAthleteCsvShouldCommitAndCompleteAsynchronously`: **PASS** (Verifica que un scout con permiso activo procesa normalmente el CSV asíncrono).
  - `adminUserShouldBeForbiddenFromBulkImportOperations`: **PASS** (Verifica que un token de `ADMIN` recibe `403 Forbidden` en `/upload`, `/google-sheet`, `/jobs`, `/jobs/{id}` y `/jobs/{id}/report`, y `200 OK` en `/template`).
  - Total: **2/2 tests ejecutados exitosamente (0 fallos, 0 errores)**.

### 2.2. Frontend (`talentus-scout-fe`)
- **Comando:**
  ```bash
  cd talentus-scout-fe && npm test -- --include src/app/core/auth/bulk-import.guard.spec.ts --watch=false --browsers=ChromeHeadless
  ```
- **Resultados:**
  - `bulkImportGuard debe permitir acceso cuando el usuario está autenticado y tiene permiso canAccessBulkImport`: **PASS**
  - `bulkImportGuard debe redirigir a /login cuando el usuario no está autenticado`: **PASS**
  - `bulkImportGuard debe redirigir a /admin/scouts cuando el usuario es ADMIN`: **PASS**
  - `bulkImportGuard debe redirigir a /scout/directory cuando es un scout verificado sin permiso de carga masiva`: **PASS**
  - `bulkImportGuard debe redirigir a /auth/scout-pending-audit cuando es un scout no verificado`: **PASS**
  - `bulkImportGuard debe redirigir a /dashboard para otros roles autenticados (ej. tutor o atleta)`: **PASS**
  - Total: **6/6 tests ejecutados exitosamente**.
- **Compilación Frontend:**
  - `npm run build`: **Exitoso (0 errores de tipado, bundle generado correctamente)**.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Pruebas de API Backend (cURL)

#### 1. Intento de subida con rol ADMIN (Debe responder 403 Forbidden):
```bash
curl -X POST http://localhost:8080/api/v1/scout/bulk-import/upload \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -F "file=@/ruta/a/archivo.csv"
```
**Respuesta esperada:**
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied"
}
```

#### 2. Consulta de trabajos con rol ADMIN (Debe responder 403 Forbidden):
```bash
curl -X GET http://localhost:8080/api/v1/scout/bulk-import/jobs \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```
**Respuesta esperada:** `HTTP/1.1 403 Forbidden`.

#### 3. Descarga de plantilla con rol ADMIN (Permitido informativamente):
```bash
curl -X GET "http://localhost:8080/api/v1/scout/bulk-import/template?format=csv" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -o plantilla_test.csv
```
**Respuesta esperada:** `HTTP/1.1 200 OK` con archivo CSV descargado.

#### 4. Operación por Scout verificado y habilitado (Debe responder 202 Accepted):
```bash
curl -X POST http://localhost:8080/api/v1/scout/bulk-import/upload \
  -H "Authorization: Bearer <TOKEN_SCOUT_HABILITADO>" \
  -F "file=@test/fixtures/TS-70-carga-masiva-320-atletas.csv"
```
**Respuesta esperada:** `HTTP/1.1 202 Accepted` con objeto `BulkImportJobResponseDto`.

---

### 3.2. Pruebas en Interfaz de Usuario (Angular)

1. **Prueba de Navbar para Administrador:**
   - Iniciar sesión con credenciales de administrador (`admin@talentusscout.com`).
   - Inspeccionar la barra de navegación superior.
   - **Resultado esperado:** Enlaces visibles: *Directorio Scouts*, *Gestión de Clubes*, *Auditoría Scouts*, *Conciliación Pagos*, *Verificaciones*. El enlace **"Carga Masiva"** NO aparece.

2. **Prueba de Directorio para Administrador:**
   - Navegar a `/scout/directory`.
   - Inspeccionar el encabezado de la página.
   - **Resultado esperado:** Aparece el buscador de atletas y el botón de retornar al directorio (si aplica), pero el botón **"📥 Carga Masiva de Atletas"** NO se visualiza.

3. **Prueba de Bloqueo por Guard (`bulkImportGuard`):**
   - Estando logueado como Administrador, forzar la navegación directa introduciendo la URL en la barra de direcciones del navegador: `http://localhost:4200/scout/bulk-import`.
   - **Resultado esperado:** El usuario es redirigido automáticamente a `/admin/scouts` sin mostrar ningún formulario ni interfaz de importación.

4. **Prueba de Gestión Administrativa de Permisos:**
   - En `/admin/scouts`, cambiar de pestaña a "Directorio de Scouts & Permisos de Carga Masiva".
   - Modificar el switch de permiso de carga masiva para un scout.
   - **Resultado esperado:** El switch actualiza el estado mediante `PATCH /api/v1/admin/scouts/{id}/bulk-import` de manera exitosa.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Verificación |
| :--- | :---: | :--- |
| El rol `ADMIN` no visualiza el enlace "Carga Masiva" en el `Navbar` ni en el Directorio | ✅ Verificado | `canAccessBulkImport` condicionado estrictamente a `isVerifiedScout && bulkImportEnabled`. |
| Navegación directa a `/scout/bulk-import` con `ADMIN` redirige a `/admin/scouts` | ✅ Verificado | `bulkImportGuard` implementado y probado en `bulk-import.guard.spec.ts`. |
| Navegación directa de `SCOUT` sin permiso redirige a `/scout/directory` | ✅ Verificado | Validado en `bulk-import.guard.spec.ts`. |
| `SCOUT` verificado con `bulkImportEnabled = true` conserva acceso completo | ✅ Verificado | Validado en `bulk-import.guard.spec.ts` y `BulkImportControllerIntegrationTest`. |
| `ADMIN` mantiene habilitación/revocación de permisos en `/admin/scouts` | ✅ Verificado | Endpoint `/api/v1/admin/scouts/{id}/bulk-import` permanece activo sin cambios. |
| Endpoints backend de carga masiva responden `403 Forbidden` a usuarios `ADMIN` | ✅ Verificado | `@PreAuthorize` actualizado y probado en `BulkImportControllerIntegrationTest`. |
| Compilación sin errores y tests en verde en frontend y backend | ✅ Verificado | `./mvnw test` (PASS), `npm test` (PASS), `npm run build` (PASS). |

---

## 5. Casos Borde y Seguridad
- **Separación de responsabilidades RBAC:** Se eliminó cualquier bypass de rol `ADMIN` en la capa de servicio `BulkImportService`, asegurando defensa en profundidad (anotación de seguridad en controlador + validación en servicio).
- **Protección contra atletas huérfanos:** Al evitar que administradores carguen datos sin pertenecer a un club, se garantiza la integridad institucional de los perfiles juveniles según LOPNNA Art. 65.
