# Plan de Implementación: [TS-75] Restringir acceso y visibilidad de Carga Masiva para el rol ADMIN (UI, rutas y backend)

**ID Tarea:** TS-75  
**Tarjeta Trello:** [https://trello.com/c/3d6YgB1e](https://trello.com/c/3d6YgB1e)  
**Fecha:** 2026-11-16  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  El rol `ADMIN` en Talentus Scout está diseñado para funciones de gobernanza, auditoría legal (LOPNNA Art. 65), verificación de identidades, conciliación de pagos y homologación institucional de clubes y scouts (según la directiva establecida en `TS-30`). Actualmente, un usuario autenticado con rol `ADMIN` visualiza el acceso a la funcionalidad operativa de **"Carga Masiva de Atletas"** en la barra de navegación (`Navbar`) y en el Directorio de Scouts, y puede ejecutar importaciones directamente. Dado que el administrador del sistema no representa a ningún club u organización deportiva particular, estas importaciones quedan asociadas a un nombre ficticio genérico (`"Organización Deportiva"`).
- **Impacto:**
  - Garantiza la separación estricta de funciones entre el rol de control y auditoría (`ADMIN`) y los roles operativos deportivos (`SCOUT`, `VERIFIER_ORG`).
  - Previene cargas de atletas huérfanos o sin respaldo institucional por parte de administradores.
  - Mantiene intacta la potestad del `ADMIN` para habilitar o revocar el permiso `bulkImportEnabled` a los scouts desde el panel de administración (`/admin/scouts`), sin mezclar la operación masiva con la administración de privilegios.
- **Restricciones legales aplicables:**
  - LOPNNA Art. 65: La responsabilidad de la tutela y representación deportiva de atletas menores recae en los clubes debidamente homologados y sus tutores legales, no en la administración de la plataforma.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Backend (`talentus-scout-be`):**
    - `com.talentus.scout.web.controller.BulkImportController`: Ajuste de `@PreAuthorize` en endpoints de importación para rechazar explícitamente el rol `ADMIN`.
    - `com.talentus.scout.service.bulkimport.BulkImportService`: Validación de seguridad en capa de servicio eliminando cualquier excepción o bypass para `ADMIN`.
    - `com.talentus.scout.web.controller.BulkImportControllerIntegrationTest` (o tests de integración/unitarios): Verificación de respuesta `403 Forbidden` ante solicitudes con rol `ADMIN`.
  - **Frontend (`talentus-scout-fe`):**
    - `src/app/core/auth/auth.service.ts`: Restricción de la señal computada `canAccessBulkImport` para excluir al rol `ADMIN`.
    - `src/app/core/auth/bulk-import.guard.ts` (Nuevo): Guard funcional para proteger la ruta `scout/bulk-import` con redirección inteligente.
    - `src/app/core/auth/bulk-import.guard.spec.ts` (Nuevo): Suite de pruebas unitarias para el nuevo guard.
    - `src/app/app.routes.ts`: Actualización de la ruta `scout/bulk-import` sustituyendo `scoutGuard` por `bulkImportGuard`.
- **Dependencias:**
  - `TS-30` (Separación de roles y control de acceso RBAC).
  - `TS-70` (Carga masiva de atletas y tutores con permisos de scouts).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Impacto en Base de Datos:**
  - **Ninguno.** No se requieren modificaciones en las tablas relacionales ni migraciones DDL de `dbmate`. Las columnas `bulk_import_enabled` en `scout_profiles` y los estados de `bulk_import_jobs` se mantienen sin alteraciones.

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Controlador REST (`BulkImportController.java`)
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/BulkImportController.java`
- **Modificaciones:**
  - Endpoints a modificar:
    1. `POST /api/v1/scout/bulk-import/upload`
    2. `POST /api/v1/scout/bulk-import/google-sheet`
    3. `GET /api/v1/scout/bulk-import/jobs/{jobId}`
    4. `GET /api/v1/scout/bulk-import/jobs`
    5. `GET /api/v1/scout/bulk-import/jobs/{jobId}/report`
  - Cambiar `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN', 'VERIFIER_ORG')")` por:
    ```java
    @PreAuthorize("hasAnyRole('SCOUT', 'VERIFIER_ORG')")
    ```
  - **Endpoint a mantener intacto:** `GET /api/v1/scout/bulk-import/template` (público / permitido para descarga general de plantillas).

### 4.2. Capa de Servicio (`BulkImportService.java`)
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/bulkimport/BulkImportService.java`
- **Modificaciones:**
  - En `startFileUploadJob` y `startGoogleSheetJob`:
    - Eliminar la excepción `if (scoutUser.getRole() != UserRole.ADMIN)`.
    - Validar explícitamente que el usuario no sea `ADMIN`:
      ```java
      if (scoutUser.getRole() == UserRole.ADMIN) {
          throw new AccessDeniedException("El rol Administrador no tiene permitido realizar operaciones de carga masiva de atletas.");
      }
      ```
    - Mantener la verificación de perfil de scout y flag de permiso:
      ```java
      Optional<ScoutProfile> optProfile = scoutProfileRepository.findByUserId(scoutUserId);
      if (optProfile.isEmpty() || !optProfile.get().isBulkImportEnabled()) {
          throw new AccessDeniedException(
                  "Tu perfil de scout no tiene habilitada la funcionalidad de carga masiva. Contacta al administrador."
          );
      }
      ```

### 4.3. Pruebas Automatizadas de Backend
- **Ruta:** `talentus-scout-be/src/test/java/com/talentus/scout/web/controller/BulkImportControllerTest.java` (o clase equivalente de tests de integración).
- Validar:
  - Intento de `uploadFile` con token `ADMIN` -> `403 Forbidden`.
  - Intento de `importGoogleSheet` con token `ADMIN` -> `403 Forbidden`.
  - Intento de `getScoutJobs` con token `ADMIN` -> `403 Forbidden`.
  - Intento de `getJobStatus` con token `ADMIN` -> `403 Forbidden`.
  - Intento de `downloadErrorReport` con token `ADMIN` -> `403 Forbidden`.
  - Intento con `SCOUT` verificado y habilitado -> `202 Accepted` / `200 OK`.
  - Comprobación de que `ADMIN` aún puede ejecutar `PATCH /api/v1/admin/scouts/{id}/bulk-import`.

---

## 5. Frontend: Angular 18+ (Standalone & Rutas)

### 5.1. Actualización de Servicio de Autenticación (`AuthService`)
- **Ruta:** `talentus-scout-fe/src/app/core/auth/auth.service.ts`
- **Modificación:**
  - Actualizar la señal computada:
    ```typescript
    readonly canAccessBulkImport = computed(() => this.isVerifiedScout() && this.currentUser()?.bulkImportEnabled === true);
    ```
  - **Efecto Inmediato:**
    - Como `navbar.component.html` y `scout-directory.component.html` ya usan `@if (authService.canAccessBulkImport())`, el enlace en el menú y el botón en el directorio desaparecen automáticamente cuando el usuario autenticado es `ADMIN`.

### 5.2. Guard de Ruta Específico (`bulk-import.guard.ts`)
- **Ruta:** `talentus-scout-fe/src/app/core/auth/bulk-import.guard.ts`
- **Lógica de Protección y Redirección:**
  ```typescript
  import { CanActivateFn, Router } from '@angular/router';
  import { inject } from '@angular/core';
  import { AuthService } from './auth.service';

  export const bulkImportGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.canAccessBulkImport()) {
      return true;
    }

    if (authService.isAdmin()) {
      router.navigate(['/admin/scouts']);
      return false;
    }

    if (authService.isVerifiedScout()) {
      router.navigate(['/scout/directory']);
      return false;
    }

    if (authService.isScout()) {
      router.navigate(['/auth/scout-pending-audit']);
      return false;
    }

    router.navigate(['/dashboard']);
    return false;
  };
  ```

### 5.3. Pruebas Unitarias del Guard (`bulk-import.guard.spec.ts`)
- **Ruta:** `talentus-scout-fe/src/app/core/auth/bulk-import.guard.spec.ts`
- **Casos de Prueba:**
  1. No autenticado -> redirige a `/login` y retorna `false`.
  2. Usuario `ADMIN` -> redirige a `/admin/scouts` y retorna `false`.
  3. Usuario `SCOUT` verificado sin permiso (`bulkImportEnabled = false`) -> redirige a `/scout/directory` y retorna `false`.
  4. Usuario `SCOUT` no verificado (`PENDING`/`REJECTED`) -> redirige a `/auth/scout-pending-audit` y retorna `false`.
  5. Usuario `TUTOR` o `ATHLETE` -> redirige a `/dashboard` y retorna `false`.
  6. Usuario `SCOUT` verificado con `bulkImportEnabled = true` -> retorna `true`.

### 5.4. Configuración de Rutas (`app.routes.ts`)
- **Ruta:** `talentus-scout-fe/src/app/app.routes.ts`
- **Modificación:**
  ```typescript
  {
    path: 'scout/bulk-import',
    loadComponent: () => import('./features/scout-bulk-import/scout-bulk-import.component').then(m => m.ScoutBulkImportComponent),
    canActivate: [authGuard, bulkImportGuard],
    title: 'Carga Masiva de Atletas y Tutores — Talentus Scout'
  },
  ```

---

## 6. Pruebas y Verificación

### 6.1. Backend
- Ejecución de suite de tests:
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=*BulkImport*
  ```

### 6.2. Frontend
- Ejecución de pruebas Jasmine/Karma:
  ```bash
  cd talentus-scout-fe && npm test -- --watch=false --browsers=ChromeHeadless
  ```
- Verificación de compilación:
  ```bash
  cd talentus-scout-fe && npm run build
  ```

### 6.3. Verificación Manual
1. Iniciar sesión como `ADMIN` (`admin@talentusscout.com`).
2. Verificar que en la barra de navegación superior **NO** aparece el enlace "Carga Masiva".
3. Navegar a `/scout/directory` y verificar que en el header **NO** aparece el botón "Carga Masiva de Atletas".
4. Intentar ingresar manualmente la URL `http://localhost:4200/scout/bulk-import` en el navegador; comprobar que el guard intercepta y redirige automáticamente a `/admin/scouts`.
5. Ejecutar una petición `POST` o `GET` con token de administrador hacia `/api/v1/scout/bulk-import/upload` o `/api/v1/scout/bulk-import/jobs` y verificar código de estado `403 Forbidden`.
6. En `/admin/scouts`, validar que el switch para activar o desactivar la carga masiva a scouts sigue funcionando correctamente.

---

## 7. Checklist Paso a Paso (Para trello_implementer)

### Paso 1: Configuración de Ramas Git
- [ ] En `talentus-scout-be`, crear y cambiar a rama `feature/TS-75-restringir-acceso-carga-masiva-admin`.
- [ ] En `talentus-scout-fe`, crear y cambiar a rama `feature/TS-75-restringir-acceso-carga-masiva-admin`.
- [ ] Recordatorio: En el repositorio orquestador raíz (`Talentus-Scout`), permanecer en `main` (no crear rama ni PR en orquestador).

### Paso 2: Implementación Backend (`talentus-scout-be`)
- [ ] En `BulkImportController.java`, remover `'ADMIN'` de la anotación `@PreAuthorize` en endpoints de subida, jobs y reporte de errores.
- [ ] En `BulkImportService.java`, eliminar la excepción de bypass para `UserRole.ADMIN` y arrojar `AccessDeniedException` si un usuario `ADMIN` intenta iniciar o consultar trabajos de carga masiva.
- [ ] Agregar o actualizar pruebas unitarias/integración para verificar que `ADMIN` recibe `403 Forbidden` al invocar los endpoints de carga masiva.
- [ ] Ejecutar `./mvnw clean test` y verificar que el 100% de las pruebas pasen.

### Paso 3: Implementación Frontend (`talentus-scout-fe`)
- [ ] En `src/app/core/auth/auth.service.ts`, actualizar `canAccessBulkImport` para excluir al `ADMIN`.
- [ ] Crear el guard `src/app/core/auth/bulk-import.guard.ts` con la lógica de redirección correspondiente.
- [ ] Crear la suite de pruebas unitarias `src/app/core/auth/bulk-import.guard.spec.ts`.
- [ ] En `src/app/app.routes.ts`, aplicar `bulkImportGuard` a la ruta `scout/bulk-import`.
- [ ] Ejecutar `npm test -- --watch=false` y `npm run build` para asegurar tipado y pruebas en verde.

### Paso 4: Generación de Plan de Pruebas y Documentación
- [ ] Redactar el documento `test/TS-75-test-plan-restringir-acceso-carga-masiva-admin.md` con los resultados de pruebas y cURL reproducibles.
- [ ] Actualizar el checklist de este plan marcando los pasos completados.

### Paso 5: Git Commit, Push y Creación de PRs (Nueva Directiva)
- [ ] En `talentus-scout-be`: `git commit`, `git push -u origin feature/TS-75-...` y `gh pr create --base main`.
- [ ] En `talentus-scout-fe`: `git commit`, `git push -u origin feature/TS-75-...` y `gh pr create --base main`.
- [ ] En el orquestador raíz `Talentus-Scout`:
  - Asegurar estar en `main` (`git checkout main && git pull origin main`).
  - Añadir planes: `git add plans/TS-75-plan-*.md test/TS-75-test-plan-*.md`.
  - Commit y push directo a `main`: `git commit -m "docs(TS-75): plan y pruebas para restringir acceso carga masiva admin" && git push origin main`.
  - **NO** crear PR en el repositorio orquestador.

### Paso 6: Transición en Trello y Reporte
- [ ] Mover la tarjeta de `in development` a `in testing` con el comentario de trazabilidad.
- [ ] Compartir los enlaces a los PRs de los submódulos y el plan de pruebas en el chat.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [ ] El rol `ADMIN` no visualiza el enlace **"Carga Masiva"** en la barra de navegación ni el botón de carga en el Directorio de Scouts.
- [ ] La navegación manual de un `ADMIN` a `/scout/bulk-import` es bloqueada por `bulkImportGuard`, redirigiendo a `/admin/scouts`.
- [ ] La navegación manual de un `SCOUT` verificado sin permiso de carga masiva (`bulkImportEnabled = false`) es redirigida a `/scout/directory`.
- [ ] Un `SCOUT` con permiso activo conserva acceso total y transparente tanto en la UI como en la ruta `/scout/bulk-import`.
- [ ] El rol `ADMIN` mantiene operativa la habilitación y revocación de permisos de carga masiva en `/admin/scouts` (`PATCH /api/v1/admin/scouts/{id}/bulk-import`).
- [ ] Los endpoints operativos de carga masiva (`/api/v1/scout/bulk-import/**`) responden `403 Forbidden` al ser invocados con rol `ADMIN`.
- [ ] Compilación limpia y 100% de tests en verde en frontend y backend.
