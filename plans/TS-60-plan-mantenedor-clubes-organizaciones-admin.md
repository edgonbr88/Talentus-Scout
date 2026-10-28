# Plan de Implementación: [TS-60] Mantenedor Administrativo de Clubes y Organizaciones con Auditoría, Verificación y Gestión de Integridad

**ID Tarea:** TS-60  
**Tarjeta Trello:** `https://trello.com/c/5W4JmHj8` / ID: `6adf9fc20aad94f809118801`  
**Fecha:** 2026-10-27  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Actualmente, los clubes y academias formativas son registrados en la plataforma tanto de forma oficial como dinámicamente cuando un tutor o scout selecciona la opción "Otro" (`verified_official = false`). La administración no dispone de un módulo centralizado para auditar estas organizaciones, promoverlas a clubes verificados oficiales, corregir información o eliminarlas manteniendo la integridad referencial.
- **Impacto para los actores:**
  - **Administrador:** Dispone de un centro de control operativo (`/admin/clubes`) con métricas clave (Total, Verificados, Pendientes, Atletas), buscador y filtros en tiempo real, gestión de escudos y control granular de verificación.
  - **Atletas:** En caso de que un club sea dado de baja, los atletas afiliados son desvinculados de forma segura (`currentClub = null`), pasando al estado "Independiente / Sin afiliación" sin perder su perfil público, cédula deportiva ni acceso a la plataforma.
  - **Scouts:** Si el club al que pertenece un scout es eliminado, el sistema revoca inmediatamente su acceso al Directorio de Talentos pasando su estado a `REJECTED` (subsanación requerida), impidiendo el acceso mediante `scoutGuard` y despachando una notificación por correo electrónico para que consigne nueva documentación y credencial deportiva vigente.
- **Consideraciones Legales y de Salvaguarda:**
  - Cumplimiento de LOPNNA Art. 65 y normativas FIFA de protección de menores en el fútbol base, garantizando que la desvinculación institucional no vulnere la identidad ni el derecho a la práctica deportiva de los atletas menores.
  - Prevención de falsedad de afiliación por parte de reclutadores, exigiendo acreditación vigente con clubes activos.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Base de Datos / Repositorio:** Consultas paginadas con filtros en `ClubOrganizationRepository`, conteos en `AthleteRepository` y `ScoutProfileRepository`.
  - **Backend (Spring Boot 3 / Java 21 / Spring Security 6):**
    - `AdminClubController` bajo `/api/v1/admin/clubs` con `@PreAuthorize("hasRole('ADMIN')")`.
    - `AdminClubService` con transacciones atómicas para CRUD, alternancia de verificación, carga de archivos y eliminación con integridad referencial.
    - `EmailService`: incorporación del método `sendScoutClubRevocationNotification`.
    - DTOs en `com.talentus.scout.web.dto.admin.club`: `AdminClubResponse`, `CreateClubRequest`, `UpdateClubRequest`, `ClubStatsResponse`, `ToggleVerificationRequest`.
  - **Frontend (Angular 18+ Standalone / HTML separado / Vanilla CSS):**
    - Nuevo módulo administrativo: `src/app/features/admin/clubs/` (`AdminClubsComponent`).
    - Servicio `AdminClubService` en `src/app/core/services/admin-club.service.ts`.
    - Modelos en `src/app/core/models/admin-club.model.ts`.
    - Enlace en `navbar.component.html` para administradores.
    - Enlaces cruzados de navegación rápida en pantallas de administración.
    - Ruta `/admin/clubes` en `app.routes.ts` protegida por `authGuard` y `adminGuard`.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- La tabla `clubs_organizations` ya cuenta con todas las columnas necesarias en el esquema activo:
  - `id` (UUID PK, v7)
  - `name` (VARCHAR 150, NOT NULL)
  - `federation_code` (VARCHAR 50)
  - `city` (VARCHAR 100, NOT NULL)
  - `state` (VARCHAR 100, NOT NULL)
  - `country` (VARCHAR 100, NOT NULL, default 'Venezuela')
  - `logo_url` (TEXT)
  - `verified_official` (BOOLEAN, NOT NULL, default false)
  - `created_at` (TIMESTAMPTZ, default now())
- **No se requieren migraciones DDL adicionales.**
- **Operaciones de Integridad Referencial:**
  - `UPDATE athletes SET current_club_id = NULL WHERE current_club_id = :clubId;`
  - `UPDATE scout_profiles SET verification_status = 'REJECTED', rejection_reason = :reason, reviewed_at = :now WHERE LOWER(organization_name) = LOWER(:clubName);`

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Repositorios
- **`ClubOrganizationRepository`:**
  - Agregar query con `Pageable` y filtros:
    ```java
    @Query("SELECT c FROM ClubOrganization c WHERE " +
           "(:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(c.city) LIKE LOWER(CONCAT('%', :search, '%')) " +
           " OR LOWER(c.federationCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:verified IS NULL OR c.verifiedOfficial = :verified) " +
           "ORDER BY c.verifiedOfficial DESC, c.name ASC")
    Page<ClubOrganization> findFiltered(
        @Param("search") String search,
        @Param("verified") Boolean verified,
        Pageable pageable
    );

    long countByVerifiedOfficial(boolean verifiedOfficial);
    ```
- **`AthleteRepository`:**
  - Agregar método de conteo y desvinculación:
    ```java
    long countByCurrentClubId(UUID clubId);

    @Modifying
    @Query("UPDATE Athlete a SET a.currentClub = NULL WHERE a.currentClub.id = :clubId")
    void detachClubFromAthletes(@Param("clubId") UUID clubId);

    @Query("SELECT COUNT(a) FROM Athlete a WHERE a.currentClub IS NOT NULL")
    long countTotalAffiliatedAthletes();
    ```
- **`ScoutProfileRepository`:**
  - Agregar método de búsqueda y conteo por nombre de organización:
    ```java
    List<ScoutProfile> findByOrganizationNameIgnoreCase(String organizationName);
    long countByOrganizationNameIgnoreCase(String organizationName);
    ```

### 4.2. DTOs (`com.talentus.scout.web.dto.admin.club`)
- `AdminClubResponse`: Con Lombok (`@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`):
  - `UUID id`, `String name`, `String federationCode`, `String city`, `String state`, `String country`, `String logoUrl`, `boolean verifiedOfficial`, `Instant createdAt`, `long athletesCount`, `long scoutsCount`.
- `CreateClubRequest`: Con anotaciones de Jakarta Validation (`@NotBlank`, `@Size`):
  - `name` (NotBlank, max 150), `federationCode` (max 50), `city` (NotBlank, max 100), `state` (NotBlank, max 100), `country` (NotBlank, max 100), `logoUrl` (URL opcional), `verifiedOfficial` (boolean).
- `UpdateClubRequest`:
  - `name`, `federationCode`, `city`, `state`, `country`, `logoUrl`, `verifiedOfficial`.
- `ClubStatsResponse`:
  - `long totalClubs`, `long verifiedClubs`, `long pendingClubs`, `long totalAffiliatedAthletes`.
- `ToggleVerificationRequest`:
  - `Boolean verifiedOfficial`.

### 4.3. Servicio `EmailService`
- Añadir método `sendScoutClubRevocationNotification(String toEmail, String scoutName, String clubName, String reason)`.

### 4.4. Servicio `AdminClubService`
- `@Transactional(readOnly = true) public Page<AdminClubResponse> getClubs(String search, String status, Pageable pageable);`
- `@Transactional(readOnly = true) public ClubStatsResponse getStats();`
- `@Transactional(readOnly = true) public AdminClubResponse getClubDetail(UUID id);`
- `@Transactional public AdminClubResponse createClub(CreateClubRequest request);`
- `@Transactional public AdminClubResponse updateClub(UUID id, UpdateClubRequest request);`
- `@Transactional public AdminClubResponse toggleVerification(UUID id, Boolean verifiedOfficial);`
- `@Transactional public String uploadLogo(UUID id, MultipartFile file);`
- `@Transactional public void deleteClub(UUID id);`
  - Desvincula atletas (`detachClubFromAthletes`).
  - Busca scouts asociados a `club.getName()`.
  - Actualiza a cada scout a `REJECTED` con el motivo de subsanación y notifica vía `EmailService`.
  - Elimina el club de la base de datos y borra el logo físico si existe en disco.

### 4.5. Controlador `AdminClubController`
- `@RestController`, `@RequestMapping("/api/v1/admin/clubs")`, `@PreAuthorize("hasRole('ADMIN')")`.
- Endpoints:
  - `GET /api/v1/admin/clubs` (parámetros `search`, `status`, `page`, `size`).
  - `GET /api/v1/admin/clubs/stats`.
  - `GET /api/v1/admin/clubs/{id}`.
  - `POST /api/v1/admin/clubs`.
  - `PUT /api/v1/admin/clubs/{id}`.
  - `PATCH /api/v1/admin/clubs/{id}/verify`.
  - `POST /api/v1/admin/clubs/{id}/logo` (`consumes = MediaType.MULTIPART_FORM_DATA_VALUE`).
  - `DELETE /api/v1/admin/clubs/{id}`.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)

### 5.1. Modelos y Servicio
- `src/app/core/models/admin-club.model.ts`:
  - `AdminClub`, `AdminClubPage`, `ClubStats`, `CreateClubPayload`, `UpdateClubPayload`.
- `src/app/core/services/admin-club.service.ts`:
  - Métodos HTTP reactivos con `HttpClient` (`getClubs`, `getStats`, `getClub`, `createClub`, `updateClub`, `toggleVerification`, `uploadLogo`, `deleteClub`).

### 5.2. Componente `AdminClubsComponent` (`src/app/features/admin/clubs/`)
- Separación obligatoria:
  - `admin-clubs.component.ts` (lógica, signals, reactive forms / inputs).
  - `admin-clubs.component.html` (Bento Grid, KPIs, filtros, tabla, modals).
  - `admin-clubs.component.css` (estilos premium acordes a `fe-desing.md`: paleta Slate/Emerald/Amber, micro-animaciones, badges, switches).
- **Características UI/UX:**
  - **KPIs Bento:** 4 tarjetas: Total Clubes, Verificados Oficiales, Pendientes de Verificación (inspección de 'Otro'), Atletas Vinculados.
  - **Barra de Herramientas:** Buscador con debounce reactivo + Pills de filtro de estado (`Todos`, `Verificados Oficiales`, `Pendientes`).
  - **Tabla de Clubes:**
    - Escudo con fallback elegante de monograma (iniciales con fondo degradado).
    - Nombre del club y código federativo en tag sutil.
    - Ubicación (Ciudad, Estado).
    - Métricas de atletas afiliados.
    - Switch interactivo para alternar verificación con feedback inmediato.
    - Botones de acción: Editar (`✏️`), Cargar Escudo (`🖼️`), Eliminar (`🗑️`).
  - **Modal de Creación / Edición:**
    - Formulario con validación visual.
    - Carga de escudo con zona de arrastre/dropzone y previsualización inmediata.
  - **Modal de Confirmación de Eliminación:**
    - Alerta informativa detallando:
      - Cantidad de atletas que quedarán como "Independientes".
      - Cantidad de scouts que serán revocados a subsanación y notificados por correo.
    - Confirmación segura antes de proceder.

### 5.3. Navegación y Rutas
- `app.routes.ts`: registrar `/admin/clubes` con `canActivate: [authGuard, adminGuard]`.
- `navbar.component.html`: enlace `"Clubes y Academias"` en la sección `isAdmin()`.
- Enlaces cruzados en `admin-scouts.component.html`, `admin-payments.component.html` y `admin-legal-verification.component.html`.

---

## 6. Pruebas y Verificación

### 6.1. Backend Tests
- `AdminClubControllerTest.java` / `AdminClubServiceTest.java`:
  - Verificación de permisos: solo ADMIN puede acceder a `/api/v1/admin/clubs`.
  - Paginación, búsqueda y filtros por estado.
  - Creación y edición de clubes.
  - Toggle de verificación oficial.
  - Eliminación con integridad:
    - Desvinculación de atletas (`currentClub = null`).
    - Revocación de scouts a `REJECTED` y envío de correo vía `EmailService`.
    - Eliminación física de la entidad club.
- Ejecución: `./mvnw test -Dtest=AdminClubControllerTest`.

### 6.2. Frontend Tests
- `admin-clubs.component.spec.ts`:
  - Renderizado inicial de métricas y tabla de clubes.
  - Filtrado y búsqueda reactiva.
  - Alternancia de switch de verificación.
  - Apertura de modal de confirmación de eliminación con advertencia de scouts/atletas.
- Ejecución: `npm test -- --include="src/app/features/admin/clubs/**/*.spec.ts" --watch=false`.
- Validación de compilación: `npm run build`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Extender repositorios (`ClubOrganizationRepository`, `AthleteRepository`, `ScoutProfileRepository`).
- [x] **Paso 2:** Crear DTOs en `com.talentus.scout.web.dto.admin.club`.
- [x] **Paso 3:** Extender `EmailService` con notificación de revocación de club para scouts.
- [x] **Paso 4:** Crear `AdminClubService` con toda la lógica transaccional y reglas de integridad.
- [x] **Paso 5:** Crear `AdminClubController` con endpoints REST y seguridad Spring Security.
- [x] **Paso 6:** Escribir y validar pruebas unitarias/integración en el backend (`AdminClubControllerTest`: 5/5 PASSED).
- [x] **Paso 7:** Crear servicio y modelos en Angular (`admin-club.model.ts`, `admin-club.service.ts`).
- [x] **Paso 8:** Crear componente `AdminClubsComponent` (`.ts`, `.html`, `.css`) con diseño Bento Grid, KPIs, tabla, modals y switches.
- [x] **Paso 9:** Configurar rutas en `app.routes.ts` y enlaces en `navbar.component.html` y demás vistas admin.
- [x] **Paso 10:** Escribir pruebas unitarias de frontend (`admin-clubs.component.spec.ts`: 6/6 PASSED) y verificar compilación con `npm run build`.
- [x] **Paso 11:** Generar documento de pruebas en `test/TS-60-test-plan-mantenedor-clubes-organizaciones-admin.md`.
- [x] **Paso 12:** Mover tarjeta a `in testing` en Trello con comentario resumen.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] La ruta `/admin/clubes` es accesible únicamente para usuarios con rol `ADMIN` y cuenta con su enlace en el Navbar.
- [x] El administrador puede listar, filtrar y buscar clubes, visualizando cuáles fueron creados por la comunidad (`verified_official = false`) y cuáles son oficiales.
- [x] El switch de verificación actualiza el flag en tiempo real sin recargar la página.
- [x] Es posible crear y editar clubes, así como subir el archivo del escudo/logo o indicar una URL externa.
- [x] Al eliminar un club:
  - Los atletas asociados quedan con `currentClub = null` y mantienen su navegación y uso completo de la app.
  - Los scouts asociados pasan a estado de subsanación requerida (`REJECTED`), se les bloquea el acceso al directorio (`scoutGuard`) y reciben un correo notificando la baja de su club.
- [x] Pruebas automatizadas de backend (`AdminClubControllerTest`) ejecutadas y en verde.
- [x] Pruebas automatizadas de frontend ejecutadas y en verde.
- [x] Compilación limpia en frontend (`npm run build`).
- [x] Documento de plan de pruebas generado en `test/`.
