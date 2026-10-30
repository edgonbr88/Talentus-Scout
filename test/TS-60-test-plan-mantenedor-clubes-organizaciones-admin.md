# Plan de Pruebas y Verificación: [TS-60] Mantenedor Administrativo de Clubes y Organizaciones con Auditoría, Verificación y Gestión de Integridad

**ID Tarea:** TS-60  
**Título:** Mantenedor Administrativo de Clubes y Organizaciones con Auditoría, Verificación y Gestión de Integridad  
**Tarjeta Trello:** `https://trello.com/c/5W4JmHj8` / ID: `6adf9fc20aad94f809118801`  
**Sprint:** Sprint 4  
**Fecha de Ejecución:** 2026-10-27  
**Agente Implementador:** trello_implementer  
**Estado:** PRUEBAS COMPLETADAS — APTO PARA TESTING  

---

## 1. Alcance de las Pruebas

El objetivo de esta batería de pruebas es asegurar el correcto funcionamiento, seguridad y estabilidad del módulo administrativo de gestión y auditoría de clubes y organizaciones deportivas (`/admin/clubes`), cubriendo tanto el backend REST como el cliente web en Angular 18+.

### Componentes y Clases Impactadas:
- **Base de Datos / Repositorios:**
  - `com.talentus.scout.repository.ClubOrganizationRepository` (filtrado dinámico mediante Spring Data Specifications, conteo por estatus oficial).
  - `com.talentus.scout.repository.AthleteRepository` (conteo de atletas por club, conteo general de afiliados, desvinculación segura con `UPDATE athletes SET current_club_id = NULL`).
  - `com.talentus.scout.repository.ScoutProfileRepository` (búsqueda y conteo de scouts vinculados a una organización por nombre).
- **Servicios y Lógica de Negocio:**
  - `com.talentus.scout.service.AdminClubService` (orquestación CRUD, alternancia de verificación en tiempo real, carga de logos en disco, y política de eliminación transaccional con integridad referencial).
  - `com.talentus.scout.service.mail.EmailService` (método `sendScoutClubRevocationNotification` para notificación transaccional a veedores afectados).
  - `com.talentus.scout.service.storage.LocalFileStorageService` (soporte ampliado para escudos SVG, PNG, JPG, WEBP).
- **Controlador REST y Seguridad:**
  - `com.talentus.scout.web.controller.AdminClubController` (`/api/v1/admin/clubs` protegido con `@PreAuthorize("hasRole('ADMIN')")`).
  - DTOs en `com.talentus.scout.web.dto.admin.club`: `AdminClubResponse`, `CreateClubRequest`, `UpdateClubRequest`, `ClubStatsResponse`, `ToggleVerificationRequest`.
- **Frontend (Angular 18+ Standalone):**
  - `src/app/core/models/admin-club.model.ts`
  - `src/app/core/services/admin-club.service.ts`
  - `src/app/features/admin/clubs/admin-clubs.component.ts`, `.html` y `.css` (Bento Grid, KPIs, filtros, tabla con switches, modals de creación/edición y de eliminación segura).
  - Enlaces de navegación en `navbar.component.html` y pantallas de administración cruzadas (`admin-scouts`, `admin-payments`, `admin-legal-verification`).
  - Ruta `/admin/clubes` en `app.routes.ts` con `[authGuard, adminGuard]`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=AdminClubControllerTest
```
Resultados: **5 pruebas ejecutadas, 0 fallos, 0 errores (100% PASS)**.

| Caso de Prueba | Método de Test | Aserciones Clave | Resultado |
| :--- | :--- | :--- | :---: |
| **Seguridad: Petición Anónima** | `unauthorizedAccess_returns401Or403` | `status().isForbidden()` sin header `Authorization` | **PASS** |
| **Seguridad: Rol No Autorizado (TUTOR)** | `tutorAccess_returnsForbidden` | `status().isForbidden()` con token de TUTOR | **PASS** |
| **Listado y KPIs Operativos** | `getClubsAndStats_asAdmin_success` | `GET /api/v1/admin/clubs?status=VERIFIED` -> 200 OK con clubes oficiales; `GET /api/v1/admin/clubs/stats` -> 200 OK con métricas `totalClubs >= 1`, `verifiedClubs >= 1` | **PASS** |
| **Creación, Edición y Toggle** | `createAndUpdateClub_asAdmin_success` | `POST /api/v1/admin/clubs` -> 201 Created; `PUT /api/v1/admin/clubs/{id}` -> 200 OK con nuevos datos; `PATCH /api/v1/admin/clubs/{id}/verify` -> 200 OK con `verifiedOfficial = true` | **PASS** |
| **Política de Integridad en Eliminación** | `deleteClub_integrityPolicy_success` | `DELETE /api/v1/admin/clubs/{id}` -> 204 No Content; Club eliminado de BD; Atleta asociado queda con `currentClub = null`; Scout asociado pasa a `REJECTED` con motivo de baja de club y correo despachado vía Resend API | **PASS** |

### 2.2. Frontend (Karma / Jasmine / Angular Testing)
Comando ejecutado:
```bash
npm test -- --include="src/app/features/admin/clubs/**/*.spec.ts" --watch=false
```
Resultados: **6 pruebas ejecutadas, 0 fallos (100% PASS)**.

| Caso de Prueba | Aserciones Clave | Resultado |
| :--- | :--- | :---: |
| **Instanciación y Carga Inicial** | Renderiza componente, ejecuta `getStats()` y `getClubs()`, inicializa signals reactivos de clubes y métricas | **PASS** |
| **Toggle de Verificación Oficial** | Invoca `toggleVerification()`, actualiza el listado en memoria y recarga KPIs con toast de confirmación | **PASS** |
| **Filtro de Estado por Píldoras (Pills)** | Cambia `currentFilter` a `VERIFIED`, consulta servicio con filtro y actualiza tabla | **PASS** |
| **Buscador Reactivo en Tiempo Real** | Emite evento `onSearchChange()` con debounce y actualiza resultados | **PASS** |
| **Ciclo de Modales Crear/Editar** | Abre modal limpio para creación con `verifiedOfficial = true`; abre modal con datos precargados para edición; cierra y limpia formulario | **PASS** |
| **Modal y Confirmación de Eliminación** | Abre modal con resumen de atletas y scouts afectados; confirma y ejecuta `deleteClub()`, cerrando modal y notificando | **PASS** |

### 2.3. Compilación de Producción Frontend
Comando ejecutado:
```bash
npm run build
```
Resultado: **Exit Code 0 — Build Clean**. Bundle generado para navegador y servidor (SSR con 14 rutas pre-renderizadas). Lazy chunk `admin-clubs-component` generado exitosamente (43.81 kB).

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Pruebas de API REST vía cURL

#### A. Obtener Estadísticas Operativas (KPIs)
```bash
curl -X GET "http://localhost:8080/api/v1/admin/clubs/stats" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```
**Respuesta Esperada (200 OK):**
```json
{
  "totalClubs": 15,
  "verifiedClubs": 10,
  "pendingClubs": 5,
  "totalAffiliatedAthletes": 48
}
```

#### B. Listar Clubes con Búsqueda y Filtro de Estado
```bash
curl -X GET "http://localhost:8080/api/v1/admin/clubs?search=Caracas&status=VERIFIED&page=0&size=10" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```
**Respuesta Esperada (200 OK):**
```json
{
  "content": [
    {
      "id": "01a17d70-4303-726d-ab56-d3afd25e2fb0",
      "name": "Caracas Fútbol Club",
      "federationCode": "FVF-001",
      "city": "Caracas",
      "state": "Distrito Capital",
      "country": "Venezuela",
      "logoUrl": "/uploads/clubs/caracas.png",
      "verifiedOfficial": true,
      "createdAt": "2026-10-27T10:00:00Z",
      "athletesCount": 14,
      "scoutsCount": 2
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

#### C. Crear Club Oficial
```bash
curl -X POST "http://localhost:8080/api/v1/admin/clubs" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Academia Dynamo Margarita",
    "federationCode": "FVF-4421",
    "city": "Porlamar",
    "state": "Nueva Esparta",
    "country": "Venezuela",
    "verifiedOfficial": true
  }'
```
**Respuesta Esperada (201 Created):**
```json
{
  "id": "<UUID>",
  "name": "Academia Dynamo Margarita",
  "federationCode": "FVF-4421",
  "city": "Porlamar",
  "state": "Nueva Esparta",
  "country": "Venezuela",
  "verifiedOfficial": true,
  "athletesCount": 0,
  "scoutsCount": 0
}
```

#### D. Alternar Verificación Oficial (Toggle en 1 Clic)
```bash
curl -X PATCH "http://localhost:8080/api/v1/admin/clubs/<CLUB_ID>/verify" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"verifiedOfficial": false}'
```
**Respuesta Esperada (200 OK):**
```json
{
  "id": "<CLUB_ID>",
  "verifiedOfficial": false
}
```

#### E. Subir Escudo Físico (Multipart)
```bash
curl -X POST "http://localhost:8080/api/v1/admin/clubs/<CLUB_ID>/logo" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -F "file=@/ruta/a/escudo.png"
```
**Respuesta Esperada (200 OK):**
```json
{
  "logoUrl": "/uploads/clubs/<UUID>.png"
}
```

#### F. Eliminar Club con Política de Integridad
```bash
curl -X DELETE "http://localhost:8080/api/v1/admin/clubs/<CLUB_ID>" \
  -H "Authorization: Bearer <TOKEN_ADMIN>"
```
**Respuesta Esperada (204 No Content)**.

---

### 3.2. Verificación de UI / Frontend en el Navegador

1. **Acceso con Rol Administrador:**
   - Iniciar sesión con credenciales de administrador (`admin@talentus.app`).
   - Verificar que en el encabezado (Navbar superior) se visualiza el nuevo enlace **"Clubes y Academias"**.
   - Hacer clic en el enlace y comprobar la redirección a `/admin/clubes`.
2. **Dashboard Bento Grid:**
   - Confirmar el renderizado de las 4 tarjetas de métricas: Total Organizaciones, Verificados Oficiales, Pendientes de Auditoría y Atletas Vinculados.
   - Comprobar que los números coinciden con la base de datos y que las tarjetas reaccionan al hover con micro-elevación.
3. **Búsqueda y Filtros:**
   - Escribir en la barra de búsqueda `"Valencia"` o el nombre de un club específico; la tabla debe actualizarse inmediatamente sin recargar la página.
   - Presionar la píldora **"Oficiales"**; verificar que solo se muestran clubes con el distintivo verde.
   - Presionar la píldora **"Pendientes"**; verificar que solo se listan organizaciones creadas comunitariamente (`verified_official = false`).
4. **Verificación en 1 Clic (Switch):**
   - En una fila con estatus "Comunitario / Pendiente", activar el switch toggle.
   - Comprobar que el switch se ilumina en verde, el badge cambia a `"✓ Oficial"` y se despliega un toast de éxito: *"Club 'X' verificado como oficial"*.
   - Comprobar que el contador del banner de métricas superiores se actualiza en tiempo real.
5. **Modal Crear / Editar Club:**
   - Hacer clic en el botón superior **"＋ Registrar Club Oficial"**.
   - Completar el formulario, seleccionar un archivo de escudo local (PNG o JPG) y comprobar la previsualización inmediata en el recuadro.
   - Presionar **"Guardar y Publicar"**; verificar que el club aparece en el listado con su escudo y datos.
   - En la fila del nuevo club, hacer clic en el botón de edición (`✏️`); modificar la ciudad y presionar **"Actualizar Club"**.
6. **Eliminación y Política de Integridad:**
   - Seleccionar un club que cuente con atletas y scouts afiliados y hacer clic en el botón de eliminación (`🗑️`).
   - Comprobar que se abre el modal de advertencia destacando en rojo la política de integridad:
     - *"Los X atletas vinculados pasarán a estado 'Independiente / Sin afiliación'"*.
     - *"Los Y scouts registrados serán revocados a estado de Subsanación Requerida"*.
   - Hacer clic en **"Confirmar Baja Definitiva"**.
   - Verificar la desaparición del club, la actualización de las métricas y la desvinculación transparente de los atletas sin bloquear su acceso a la plataforma.

---

## 4. Matriz de Criterios de Aceptación (DoD)

- [x] **Seguridad y Acceso:** La ruta `/admin/clubes` y todos sus endpoints están protegidos exclusivamente para usuarios con rol `ADMIN` (`authGuard`, `adminGuard`, `@PreAuthorize("hasRole('ADMIN')")`).
- [x] **Navegación:** Enlace `"Clubes y Academias"` integrado en el Navbar principal y enlaces rápidos cruzados en las vistas de administración (`scouts`, `pagos`, `patria potestad`).
- [x] **Auditoría y Filtros:** El administrador puede listar, paginar y buscar clubes por texto libre y filtrar entre organizaciones verificadas y pendientes comunitarias.
- [x] **Acción Inmediata (Switch):** Alternancia del flag `verified_official` en 1 clic con persistencia transaccional y feedback visual reactivo.
- [x] **Gestión Institucional:** Creación y modificación de clubes con soporte para código federativo, ciudad, estado, país y subida física o remota del escudo.
- [x] **Política de Integridad Referencial:**
  - Los atletas asociados quedan con `currentClub = null` de forma segura, manteniéndose activos e independientes.
  - Los scouts asociados pasan a `REJECTED`, se les bloquea el acceso al directorio y reciben un correo electrónico explicativo de subsanación.
- [x] **Pruebas Automatizadas:** 5/5 pruebas de backend en verde (`AdminClubControllerTest`), 6/6 pruebas de frontend en verde (`admin-clubs.component.spec.ts`).
- [x] **Calidad Frontend:** Separación estricta de plantillas HTML y TS, conformidad total con `fe-desing.md` y compilación de producción exitosa (`npm run build`).

---

## 5. Casos Borde y Validaciones Críticas

1. **Unicidad de Nombres:** Si se intenta registrar o renombrar un club con un nombre existente (ignorando mayúsculas/minúsculas), el backend responde con un error 400 controlado y el frontend muestra el mensaje de error en el modal sin cerrar la ventana.
2. **Subida de Archivos:** Validación de tamaño máximo (5MB) y formato de archivo (PNG, JPG, WEBP, SVG). Archivos no permitidos (ej. ejecutables o scripts) son rechazados por validación previa.
3. **Múltiples Atletas/Scouts en Baja:** La transacción de eliminación desvincula masivamente todos los atletas mediante un `UPDATE` optimizado y procesa las notificaciones a los scouts en el mismo ciclo atómico. Si el despacho de correo experimenta problemas en red, no aborta la integridad de la base de datos gracias al mecanismo resiliente de `EmailService`.
