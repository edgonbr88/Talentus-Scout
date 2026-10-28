# Plan de Implementación: [TS-12] Panel de Auditoría y Aprobación de Scouts para Administradores

**ID de la Tarea:** TS-12  
**Título Trello:** `[TS-12] Panel de Auditoría y Aprobación de Scouts para Administradores`  
**Enlace a Trello:** [https://trello.com/c/VXpBeI6X](https://trello.com/c/VXpBeI6X) (ID: `6abbe1fa0ebb368bf92f3f04`)  
**Sprint Asignado:** Sprint 3 — Directorio de Scouts Acreditados y Contacto Seguro WhatsApp  
**Fecha de Creación:** 7 de octubre de 2026  
**Agente Planificador:** `trello_planner`  

---

## 1. Identificación y Contexto de Negocio

### 1.1. Contexto y Justificación
En cumplimiento estricto del **Artículo 65 de la LOPNNA** y las normativas FIFA sobre salvaguarda de atletas menores de edad, ningún reclutador independiente o delegado de club puede acceder al radar privado de atletas ni a sus videos de evaluación sin haber consignado credenciales oficiales y haber sido auditado por el equipo directivo de Talentus Scout.

La tarea **TS-11** implementó el registro de scouts en estado `PENDIENTE_VERIFICACION` y el almacenamiento seguro de sus credenciales. La presente tarea **TS-12** cierra el ciclo de acreditación proporcionando el **Panel de Auditoría de Scouts para Administradores**:
1. Permite a los administradores visualizar la cola de reclutadores pendientes, revisar su organización, rol y documento probatorio (carnet profesional, credencial federativa o carta oficial).
2. Permite la **aprobación en 1 solo clic**, activando inmediatamente al usuario (`AccountStatus.ACTIVE`) y habilitando su estatus de verificación (`ScoutVerificationStatus.APPROVED`) para que pueda consultar el directorio deportivo.
3. Permite el **rechazo motivado**, registrando el motivo en `rejection_reason` y manteniendo al scout en estado `PENDING_VERIFICATION` para que pueda consultar en su perfil (`/me`) la causa del rechazo y corregir su consignación.

---

## 2. Arquitectura y Modelo de Datos

### 2.1. Estado de la Base de Datos
La tabla `scout_profiles` y los tipos enumerados ya fueron creados de forma nativa en la migración fundacional `20260929171117_create_initial_schema.sql`:
```sql
CREATE TABLE scout_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(150) NOT NULL,
    scout_role VARCHAR(100) NOT NULL,
    credentials_document_url TEXT NOT NULL,
    linkedin_url TEXT,
    verification_status scout_verification_status NOT NULL DEFAULT 'PENDING',
    reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
**Conclusión DDL:** No se requiere migración DDL adicional en Neon / Flyway / dbmate para este sprint; todas las columnas de auditoría (`reviewed_by_admin_id`, `reviewed_at`, `rejection_reason`, `verification_status`) ya existen físicamente y están mapeadas en JPA.

---

## 3. Especificación Backend (Spring Boot 3 / Java 21)

### 3.1. Clases a Modificar o Crear

#### 1. Repositorio: `ScoutProfileRepository.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/repository/ScoutProfileRepository.java`
* **Modificación:** Añadir consulta paginada:
  ```java
  Page<ScoutProfile> findByVerificationStatus(ScoutVerificationStatus status, Pageable pageable);
  ```

#### 2. DTOs para Auditoría Administrativa
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/`
* **Clases con Lombok:**
  * `PendingScoutResponse.java`:
    - `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
    - Campos: `UUID scoutProfileId`, `UUID userId`, `String fullName`, `String email`, `String phoneNumber`, `String organizationName`, `String scoutRole`, `String credentialsDocumentUrl`, `String linkedinUrl`, `ScoutVerificationStatus verificationStatus`, `Instant createdAt`.
  * `ReviewScoutDecision.java` (Enum): `APPROVE`, `REJECT`.
  * `ReviewScoutRequest.java`:
    - `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
    - `@NotNull(message = "La decisión de auditoría es obligatoria") ReviewScoutDecision decision`
    - `String rejectionReason` (requerido si `decision == REJECT`)
  * `ScoutReviewResponse.java`:
    - `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
    - Campos: `UUID scoutProfileId`, `UUID userId`, `String fullName`, `ScoutVerificationStatus verificationStatus`, `AccountStatus accountStatus`, `UUID reviewedByAdminId`, `Instant reviewedAt`, `String rejectionReason`, `String message`.

#### 3. Actualización de Perfil Actual (`UserProfileResponse.java` & `AuthController.java`)
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/UserProfileResponse.java`
* Añadir campos opcionales para scouts: `ScoutVerificationStatus scoutVerificationStatus` y `String rejectionReason`.
* En `AuthController.getCurrentUser()`, enriquecer con la información del perfil del scout si `user.getRole() == UserRole.SCOUT`.

#### 4. Servicio: `AdminScoutService.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/AdminScoutService.java`
* **Responsabilidades:**
  - `@Transactional(readOnly = true) Page<PendingScoutResponse> getPendingScouts(Pageable pageable)`
  - `@Transactional ScoutReviewResponse reviewScout(UUID scoutProfileId, ReviewScoutRequest request, String adminEmail)`
  - Validaciones: Verificar que el perfil de scout exista, que el administrador autenticado exista y tenga rol `ADMIN`, y que si la decisión es `REJECT`, se proporcione una justificación válida (`rejectionReason`).
  - Actualización atómica en base de datos:
    * Si `APPROVE`: `scoutProfile.setVerificationStatus(ScoutVerificationStatus.APPROVED)`, `user.setStatus(AccountStatus.ACTIVE)`, `scoutProfile.setRejectionReason(null)`.
    * Si `REJECT`: `scoutProfile.setVerificationStatus(ScoutVerificationStatus.REJECTED)`, `user.setStatus(AccountStatus.PENDING_VERIFICATION)`, `scoutProfile.setRejectionReason(request.getRejectionReason().trim())`.
    * En ambos casos: `scoutProfile.setReviewedByAdmin(adminUser)` y `scoutProfile.setReviewedAt(Instant.now())`.

#### 5. Controlador: `AdminScoutController.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/AdminScoutController.java`
* **Anotaciones:**
  - `@RestController`
  - `@RequestMapping("/api/v1/admin/scouts")`
  - `@PreAuthorize("hasRole('ADMIN')")`
* **Endpoints:**
  1. `GET /api/v1/admin/scouts/pending`:
     - Retorna `200 OK` con `Page<PendingScoutResponse>`.
     - Parámetros: `Pageable pageable` (`page`, `size`, `sort`).
  2. `POST /api/v1/admin/scouts/{scoutProfileId}/review`:
     - Recibe `@PathVariable UUID scoutProfileId`, `@Valid @RequestBody ReviewScoutRequest request`, `Authentication authentication`.
     - Retorna `200 OK` con `ScoutReviewResponse`.

---

## 4. Especificación Frontend (Angular 18+ Standalone)

Siguiendo estrictamente las directivas de **[fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)** (skill `frontend-design`), la interfaz no usará plantillas genéricas ni sombras genéricas de SaaS; adoptará una estética atlética de alto rendimiento (Bento Grid, contrastes deliberados, tipografía limpia, estados vacíos útiles y animaciones reactivas solo a la acción del usuario).

### 4.1. Guardia de Ruta de Administrador (`admin.guard.ts`)
* **Ruta:** `talentus-scout-fe/src/app/core/auth/admin.guard.ts`
* **Comportamiento:**
  - Inyecta `AuthService` y `Router`.
  - Verifica `authService.isAdmin()`. Si no es admin o no está autenticado, redirige a `/dashboard` o `/login`.

### 4.2. Servicio de Auditoría de Scouts (`admin-scout.service.ts`)
* **Ruta:** `talentus-scout-fe/src/app/core/services/admin-scout.service.ts`
* **Métodos:**
  - `getPendingScouts(page: number, size: number): Observable<Page<PendingScoutResponse>>`
  - `reviewScout(profileId: string, payload: ReviewScoutRequest): Observable<ScoutReviewResponse>`

### 4.3. Componente de Panel de Auditoría (`AdminScoutsComponent`)
* **Ruta:** `talentus-scout-fe/src/app/features/admin/scouts/admin-scouts.component.ts` (con sus respectivos `.html` y `.css`).
* **Elementos de Diseño e Interacción:**
  - **Cabecera de Mando:** Resumen de la cola de auditoría con contador en tiempo real de scouts pendientes.
  - **Grid de Solicitudes:** Tarjetas Bento con datos del reclutador (nombre, organización, rol declarado, correo, teléfono de contacto y fecha de postulación).
  - **Visor Directo de Credencial:** Enlace interactivo y seguro para visualizar el documento probatorio (`/uploads/credentials/...`) en una pestaña nueva o modal.
  - **Botón de Aprobación en 1 Clic:** Acción inmediata con spinner de carga y mensaje de éxito tipo toast o actualización reactiva en la señal `scoutsSignal`.
  - **Modal de Rechazo con Justificación:** Si el administrador decide rechazar, se despliega un diálogo limpio solicitando el motivo (`rejectionReason`) antes de enviar la petición.
  - **Estado Vacío Intencional:** Si no hay solicitudes pendientes, mensaje motivacional y de control ("Bandeja de verificación al día: todos los reclutadores han sido auditados").

### 4.4. Rutas y Navegación
* **Ruta:** En `app.routes.ts`:
  ```typescript
  {
    path: 'admin/scouts',
    loadComponent: () => import('./features/admin/scouts/admin-scouts.component').then(m => m.AdminScoutsComponent),
    canActivate: [authGuard, adminGuard],
    title: 'Auditoría de Scouts — Talentus Scout'
  }
  ```
* En el menú principal / navegación (`app.component.html`), mostrar el botón/enlace a `Auditoría Scouts` cuando `authService.isAdmin()` sea verdadero.

---

## 5. Plan de Pruebas y Validación

### 5.1. Backend (`AdminScoutSecurityAndWorkflowTest.java`)
1. **Acceso Denegado a No Administradores:**
   - Intentar invocar `GET /api/v1/admin/scouts/pending` como anónimo -> `401 Unauthorized` o `403 Forbidden`.
   - Intentar invocar con rol `SCOUT` o `TUTOR` -> `403 Forbidden`.
2. **Listado de Scouts Pendientes:**
   - Crear scouts con status `PENDING` y verificar que el endpoint retorna la lista paginada con el enlace a su credencial.
3. **Flujo de Aprobación en 1 Clic (`APPROVE`):**
   - Enviar payload `{ decision: "APPROVE" }`.
   - Verificar `200 OK`.
   - Verificar que `scoutProfile.verificationStatus == APPROVED`.
   - Verificar que `user.status == ACTIVE`.
   - Verificar que `reviewedByAdmin` y `reviewedAt` están registrados.
4. **Flujo de Rechazo Motivado (`REJECT`):**
   - Enviar payload `{ decision: "REJECT", rejectionReason: "Credencial ilegible o vencida" }`.
   - Verificar `200 OK`.
   - Verificar que `scoutProfile.verificationStatus == REJECTED`.
   - Verificar que `user.status == PENDING_VERIFICATION`.
   - Verificar que `rejectionReason` se persistió correctamente.
5. **Validación de Motivo Vacío en Rechazo:**
   - Enviar `{ decision: "REJECT", rejectionReason: "" }` -> `400 Bad Request`.

### 5.2. Frontend
1. Validar que la compilación de Angular pasa sin errores: `npm run build`.
2. Validar protección de rutas: usuario común no puede acceder a `/admin/scouts`.

---

## 6. Checklist de Implementación Paso a Paso (Para el Agente Implementador)

- [x] **Paso 1: Backend - Repositorio y DTOs**
  - [x] Añadir `findByVerificationStatus(ScoutVerificationStatus status, Pageable pageable)` en `ScoutProfileRepository.java`.
  - [x] Crear DTOs `PendingScoutResponse.java`, `ReviewScoutDecision.java`, `ReviewScoutRequest.java`, `ScoutReviewResponse.java` con Lombok.
  - [x] Extender `UserProfileResponse.java` con campos de auditoría de scout (`scoutVerificationStatus`, `rejectionReason`).
- [x] **Paso 2: Backend - Servicio y Controlador de Administración**
  - [x] Implementar `AdminScoutService.java` con validaciones de negocio, persistencia atómica y trazabilidad de administrador.
  - [x] Implementar `AdminScoutController.java` protegido con `@PreAuthorize("hasRole('ADMIN')")`.
- [x] **Paso 3: Backend - Pruebas Automatizadas**
  - [x] Crear suite de pruebas de integración `AdminScoutWorkflowTest.java`.
  - [x] Ejecutar `./mvnw test` y asegurar 100% de tests en verde con cero regresiones.
- [x] **Paso 4: Frontend - Guardias, Servicios y Modelos**
  - [x] Crear `admin.guard.ts` para restringir acceso exclusivo a usuarios con rol `ADMIN`.
  - [x] Crear modelos TypeScript e interfaces para la auditoría de scouts.
  - [x] Crear `AdminScoutService` para interactuar con los endpoints de backend.
- [x] **Paso 5: Frontend - Componente de Auditoría de Scouts**
  - [x] Implementar `AdminScoutsComponent` en Angular 18 (Standalone) con estética intencional Bento y feedback instantáneo.
  - [x] Integrar visor de credencial y modal de rechazo con justificación.
  - [x] Registrar la ruta `/admin/scouts` en `app.routes.ts`.
  - [x] Añadir acceso condicional en la barra de navegación para administradores.
  - [x] Validar compilación con `npm run build`.
- [x] **Paso 6: Documentación de Pruebas y Cierre en Trello**
  - [x] Redactar el reporte de validación en `test/TS-12-test-plan-panel-auditoria-scouts.md`.
  - [x] Trasladar la tarjeta TS-12 a `in testing` en Trello con resumen ejecutivo y enlace al reporte.

---

## 7. Criterios de Aceptación (DoD)

1. El endpoint `GET /api/v1/admin/scouts/pending` retorna exclusivamente reclutadores con estado `PENDING` en formato paginado con sus enlaces a credenciales.
2. El endpoint `POST /api/v1/admin/scouts/{scoutProfileId}/review` permite aprobar o rechazar de forma atómica:
   - Al aprobar: `verification_status = APPROVED` y `user.status = ACTIVE`.
   - Al rechazar: `verification_status = REJECTED` y almacena `rejection_reason`.
3. Seguridad reforzada: Los endpoints administrativos devuelven `403 Forbidden` a cualquier usuario que no posea `ROLE_ADMIN`.
4. El panel en Angular permite al administrador aprobar reclutadores en 1 solo clic y visualizar su credencial probatoria.
5. El 100% de las pruebas automatizadas backend pasan con éxito (`./mvnw test`).
6. El proyecto frontend compila sin errores (`npm run build`).
7. El archivo `test/TS-12-test-plan-panel-auditoria-scouts.md` recopila toda la evidencia de ejecución.
