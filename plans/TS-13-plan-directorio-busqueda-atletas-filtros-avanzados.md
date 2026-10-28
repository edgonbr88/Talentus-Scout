# Plan de Implementación: [TS-13] Directorio de Búsqueda de Atletas con Filtros Avanzados para Scouts

**ID de la Tarea:** TS-13  
**Título Trello:** `[TS-13] Directorio de Búsqueda de Atletas con Filtros Avanzados para Scouts`  
**Enlace a Trello:** [https://trello.com/c/FCVIHqfM](https://trello.com/c/FCVIHqfM) (ID: `6abbe1fa9605ce715fd033ac`)  
**Sprint Asignado:** Sprint 3 — Directorio de Scouts Acreditados y Contacto Seguro WhatsApp  
**Fecha de Creación:** 8 de octubre de 2026  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Planificador:** `trello_planner`  

---

## 1. Identificación y Contexto de Negocio

### 1.1. Contexto y Justificación
Para reclutadores profesionales, secretarías técnicas de clubes nacionales e internacionales y scouts independientes, la velocidad y precisión en la identificación de talento son críticas. Un scout requiere encontrar perfiles en segundos combinando variables tácticas (posición primaria), físicas (año de categoría, pierna hábil), de proyección administrativa (pasaportes comunitarios/secundarios para fichajes en el extranjero) y evidencia técnica concreta (videos de jugadas destacados y certificaciones institucionales).

La plataforma Talentus Scout opera como vitrina digital deportiva garantizando la salvaguarda de atletas juveniles:
1. **Acceso exclusivo para scouts verificados:** Únicamente usuarios con rol `SCOUT` aprobados por administración (`ScoutVerificationStatus.APPROVED`) o usuarios con rol `ADMIN` pueden consultar este directorio, manteniendo a salvo la identidad de los jóvenes futbolistas.
2. **Protección LOPNNA (Art. 65):** Solo se publican y listan aquellos atletas cuyos tutores legales han otorgado consentimiento digital activo (`is_public = true`). Los perfiles en borrador o privados quedan estrictamente excluidos del directorio.
3. **Privacidad de contacto:** En este directorio se muestran métricas deportivas y de video; los datos de contacto directo del menor nunca se exponen al scout (el canal de contacto hacia el tutor legal vía WhatsApp con mensaje preformateado se articula en la tarea TS-14).
4. **Agilidad técnica:** Búsqueda rápida con filtros dinámicos basados en Spring Data JPA Specifications y un componente interactivo en Angular 18 con filtros por chips de categorías (Sub-15, Sub-17, Sub-20) y modal interactivo para reproducción instantánea de videos.

---

## 2. Arquitectura y Modelo de Datos

### 2.1. Estado de la Base de Datos (Neon PostgreSQL)
El modelo de datos y los índices de optimización para la búsqueda ya fueron creados en la migración fundacional de dbmate (`20260929171117_create_initial_schema.sql`):
* **Tabla `athletes`:**
  - `birth_date` (DATE) -> permite derivar año de nacimiento y categorías.
  - `primary_position` (VARCHAR 50) y `secondary_position` (VARCHAR 50).
  - `preferred_foot` (VARCHAR 20) (`DIESTRO`, `ZURDO`, `AMBIDIESTRO`).
  - `secondary_passports` (VARCHAR 150) -> evaluado para pasaportes secundarios o comunitarios (no nulo y no vacío).
  - `current_club_id` (UUID -> FK a `clubs_organizations.id`).
  - `is_public` (BOOLEAN) -> debe ser `true` para figurar en el directorio.
  - `updated_at` (TIMESTAMP WITH TIME ZONE) -> utilizado para ordenamiento.
* **Tabla `athlete_videos`:**
  - `athlete_id` (UUID -> FK a `athletes.id`).
  - `status` (`video_status`: `READY`).
  - `playback_url`, `thumbnail_url`, `title`, `sort_order`.
* **Tabla `athlete_badges`:**
  - `athlete_id` (UUID -> FK a `athletes.id`).
  - `status` (`badge_status`: `APPROVED` o `VERIFIED`).
* **Índices existentes para cumplimiento DoD (< 100ms):**
  ```sql
  CREATE INDEX idx_athletes_filter ON public.athletes USING btree (birth_date, primary_position, current_club_id);
  CREATE INDEX idx_athletes_slug ON public.athletes USING btree (slug);
  CREATE INDEX idx_badges_athlete ON public.athlete_badges USING btree (athlete_id, status);
  CREATE INDEX idx_videos_athlete ON public.athlete_videos USING btree (athlete_id, sort_order);
  ```

**Conclusión DDL:** No se requiere migración DDL adicional en PostgreSQL / dbmate; todos los campos, relaciones e índices requeridos están presentes y operativos en la base de datos.

---

## 3. Especificación Backend (Spring Boot 3 / Java 21)

### 3.1. Clases a Modificar o Crear

#### 1. Repositorio: `AthleteRepository.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/repository/AthleteRepository.java`
* **Modificación:** Extender `JpaSpecificationExecutor<Athlete>` para habilitar búsquedas dinámicas con `Specification<Athlete>` y `Pageable`.
  ```java
  public interface AthleteRepository extends JpaRepository<Athlete, UUID>, JpaSpecificationExecutor<Athlete> {
      List<Athlete> findByTutorIdOrderByCreatedAtDesc(UUID tutorId);
      Optional<Athlete> findBySlug(String slug);
      boolean existsBySlug(String slug);
  }
  ```

#### 2. DTOs para Criterios de Búsqueda y Resultados
* **Paquete:** `com.talentus.scout.web.dto`
* **Directiva Obligatoria:** Uso de Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`).

* **Archivo 1:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/AthleteFilterCriteria.java`
  ```java
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public class AthleteFilterCriteria {
      private Integer birthYear;
      private String primaryPosition;
      private String preferredFoot;
      private UUID clubId;
      private Boolean hasEuropeanPassport;
      private Boolean hasVideo;
  }
  ```

* **Archivo 2:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/ScoutDirectoryAthleteItem.java`
  ```java
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public class ScoutDirectoryAthleteItem {
      private UUID id;
      private String firstName;
      private String lastName;
      private LocalDate birthDate;
      private Integer birthYear;
      private String category; // Ej: "Sub-15", "Sub-17", "Sub-20" o calculado por año
      private String primaryPosition;
      private String secondaryPosition;
      private String preferredFoot;
      private String nationality;
      private String secondaryPassports;
      private boolean hasEuropeanPassport;
      private UUID clubId;
      private String clubName;
      private String clubLogoUrl;
      private String profilePhotoUrl;
      private String slug;
      private long verifiedBadgesCount;
      private boolean hasVideo;
      private String featuredVideoPlaybackUrl;
      private String featuredVideoThumbnailUrl;
      private String featuredVideoTitle;
      private Instant updatedAt;
  }
  ```

#### 3. Especificaciones Dinámicas: `AthleteSpecifications.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/specification/AthleteSpecifications.java`
* **Predicados con JPA Criteria API:**
  1. `isPublic()`: `cb.isTrue(root.get("isPublic"))` (estricto cumplimiento LOPNNA).
  2. `withBirthYear(Integer birthYear)`:
     - Evaluar rango de fecha: `LocalDate.of(birthYear, 1, 1)` hasta `LocalDate.of(birthYear, 12, 31)`.
     - `cb.between(root.get("birthDate"), startDate, endDate)` (aprovecha óptimamente el índice B-tree `idx_athletes_filter`).
  3. `withPrimaryPosition(String position)`:
     - `cb.equal(cb.upper(root.get("primaryPosition")), position.toUpperCase())`.
  4. `withPreferredFoot(String preferredFoot)`:
     - `cb.equal(cb.upper(root.get("preferredFoot")), preferredFoot.toUpperCase())`.
  5. `withClubId(UUID clubId)`:
     - `cb.equal(root.get("currentClub").get("id"), clubId)`.
  6. `withEuropeanPassport(Boolean hasEuropeanPassport)`:
     - Si `true`: `cb.and(cb.isNotNull(root.get("secondaryPassports")), cb.notEqual(cb.trim(root.get("secondaryPassports")), ""))`.
     - Si `false`: `cb.or(cb.isNull(root.get("secondaryPassports")), cb.equal(cb.trim(root.get("secondaryPassports")), ""))`.
  7. `withVideo(Boolean hasVideo)`:
     - Subquery `EXISTS` sobre la entidad `AthleteVideo`:
       `Subquery<UUID> subquery = query.subquery(UUID.class);`
       `Root<AthleteVideo> videoRoot = subquery.from(AthleteVideo.class);`
       `subquery.select(videoRoot.get("id")).where(cb.equal(videoRoot.get("athlete"), root), cb.equal(videoRoot.get("status"), VideoStatus.READY));`
       `hasVideo ? cb.exists(subquery) : cb.not(cb.exists(subquery))`.

#### 4. Servicio de Negocio: `ScoutDirectoryService.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/ScoutDirectoryService.java`
* **Lógica:**
  - Método `@Transactional(readOnly = true) Page<ScoutDirectoryAthleteItem> searchDirectory(AthleteFilterCriteria criteria, Pageable pageable)`
  - Ensambla la especificación combinada (`Specification.where(AthleteSpecifications.isPublic()).and(...)`).
  - Ejecuta la búsqueda paginada en `athleteRepository.findAll(spec, pageable)`.
  - Mapea cada `Athlete` a `ScoutDirectoryAthleteItem` usando el patrón Builder (`ScoutDirectoryAthleteItem.builder()...build()`):
    * Calcula categoría juvenil sugerida: si `birthYear >= 2011` -> "Sub-15", `birthYear == 2009 || birthYear == 2010` -> "Sub-17", `birthYear <= 2008` -> "Sub-20".
    * Consulta o calcula insignias verificadas (`status == BadgeStatus.APPROVED`).
    * Extrae el video destacado disponible (`VideoStatus.READY`, ordenado por `sortOrder ASC`) para poblar `featuredVideoPlaybackUrl`, `featuredVideoThumbnailUrl` y `featuredVideoTitle`.

#### 5. Controlador REST: `ScoutDirectoryController.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/ScoutDirectoryController.java`
* **Anotaciones y Seguridad:**
  - `@RestController`
  - `@RequestMapping("/api/v1/scouts")`
  - `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`
* **Endpoint Actualizado:**
  - `GET /api/v1/scouts/directory`
  - Parámetros `@RequestParam`:
    - `Integer birthYear` (opcional)
    - `String primaryPosition` (opcional)
    - `String preferredFoot` (opcional)
    - `UUID clubId` (opcional)
    - `Boolean hasEuropeanPassport` (opcional)
    - `Boolean hasVideo` (opcional)
    - `@PageableDefault(page = 0, size = 12, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable`
  - Retorna `ResponseEntity<Page<ScoutDirectoryAthleteItem>>` (200 OK).

---

## 4. Especificación Frontend (Angular 18+ Standalone)

Siguiendo la directiva de diseño de **[fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)** (skill `frontend-design`), la interfaz no usará componentes genéricos de plantillas SaaS. Adoptará una estética atlética de alto rendimiento (Bento Grid táctico, tema oscuro profundo `#0b0f17`, acentos verde neón/esmeralda `#10b981` y `#059669`, tipografía nítida Inter / Space Grotesk, micro-interacciones intencionales y feedback inmediato).

### 4.1. Guardia de Ruta para Scouts Acreditados (`scout.guard.ts`)
* **Ruta:** `talentus-scout-fe/src/app/core/auth/scout.guard.ts`
* **Comportamiento:**
  - Inyecta `AuthService` y `Router`.
  - Verifica si `authService.isAdmin()` es verdadero, o si `authService.isScout()` y el usuario posee estatus de verificación aprobado (`scoutVerificationStatus === 'APPROVED'`).
  - Si no está aprobado o no tiene rol habilitado, redirige a `/dashboard` o `/login` protegiendo el acceso al directorio.

### 4.2. Modelos TypeScript (`scout-directory.model.ts`)
* **Ruta:** `talentus-scout-fe/src/app/core/models/scout-directory.model.ts`
* **Interfaces:**
  - `ScoutDirectoryAthleteItem`: Representa la ficha resumida del atleta para scouting.
  - `ScoutDirectoryFilters`: Representa el estado de los filtros seleccionados (`birthYear`, `primaryPosition`, `preferredFoot`, `clubId`, `hasEuropeanPassport`, `hasVideo`, `page`, `size`).
  - `PageResponse<T>`: Estructura paginada estándar de Spring Data.

### 4.3. Servicio HTTP Frontend (`scout-directory.service.ts`)
* **Ruta:** `talentus-scout-fe/src/app/core/services/scout-directory.service.ts`
* **Método:**
  - `getDirectory(filters: ScoutDirectoryFilters): Observable<PageResponse<ScoutDirectoryAthleteItem>>`
  - Convierte los filtros no nulos en `HttpParams`.

### 4.4. Componente de Directorio de Scouts (`ScoutDirectoryComponent`)
* **Ruta:** `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.ts` (con `.html` y `.css`).
* **Arquitectura de Interfaz:**
  1. **Encabezado Táctico de Scouting:**
     - Título: *"Radar de Búsqueda de Talentos"*.
     - Contador dinámico en vivo: *"X atletas encontrados en el radar"*.
  2. **Barra de Chips de Categorías Rápidas:**
     - Chips de acceso rápido: `Todos`, `Sub-15 (2011-2012)`, `Sub-17 (2009-2010)`, `Sub-20 (2007-2008)`.
     - Al seleccionar un chip, actualiza reactivamente la señal de filtro `birthYear` o rango y recarga el grid.
  3. **Barra de Filtros Avanzados (Colapsable/Desplegable):**
     - Selector de Posición Primaria (Delantero Centro, Extremo, Volante, Defensa Central, Lateral, Portero).
     - Selector de Pierna Hábil (Diestro, Zurdo, Ambidiestro).
     - Toggles interactivos estilo píldora: *"Solo con Video"* y *"Pasaporte Europeo / Comunitario"*.
     - Botón de reinicio rápido de filtros.
  4. **Cuadrícula Bento de Tarjetas de Atletas:**
     - Grid responsivo (1 columna en móvil, 2 en tablet, 3-4 en desktop).
     - Tarjetas con diseño Bento:
       * Foto de perfil o avatar con gradiente atlético.
       * Badge de posición flotante con código de color táctico (Delantero: ámbar/rojo sutil, Mediocampista: azul táctico, Defensa: esmeralda oscuro, Portero: violeta).
       * Nombre completo, año de nacimiento y categoría.
       * Club actual con insignia oficial.
       * Indicador de insignias de verificación deportiva (ej. "3 certificaciones").
       * Chip de pasaporte europeo si cuenta con pasaporte secundario.
       * Botón de **"Reproducción Rápida"** (icono de play) destacado si `hasVideo === true`.
       * Botón de **"Ver Perfil Completo"** enlazando a `/atleta/${slug}`.
  5. **Modal Emergente de Reproducción Rápida (`quick-video-modal`):**
     - Modal limpio con `backdrop-filter: blur(10px)`.
     - Reproductor de video HLS / HTML5 para visualización inmediata sin abandonar la sesión de scouting.
     - Botón de cierre accesible y cierre por tecla `Escape`.
  6. **Paginación Dinámica y Estado Vacío:**
     - Controles de página siguiente/anterior accesibles.
     - Estado vacío deportivo: *"No se encontraron atletas con los criterios seleccionados. Modifica los filtros de categoría o posición."*

### 4.5. Rutas y Navegación
* **Ruta en `app.routes.ts`:**
  ```typescript
  {
    path: 'scout/directory',
    loadComponent: () => import('./features/scout-directory/scout-directory.component').then(m => m.ScoutDirectoryComponent),
    canActivate: [authGuard, scoutGuard],
    title: 'Directorio de Búsqueda de Talentos — Talentus Scout'
  }
  ```
* En el menú de navegación (`app.component.html`), mostrar el botón *"Directorio Scouts"* cuando el usuario logueado sea scout verificado (`authService.isScout()`) o administrador (`authService.isAdmin()`).

---

## 5. Plan de Pruebas y Validación

### 5.1. Backend (`ScoutDirectoryIntegrationTest.java`)
1. **Seguridad y Permisos:**
   - Petición sin token -> `401 Unauthorized` o `403 Forbidden`.
   - Petición con scout en `PENDING_VERIFICATION` -> `403 Forbidden` con mensaje de auditoría en curso (ya validado en `ScoutDirectorySecurityTest`).
   - Petición con scout `APPROVED` y con `ADMIN` -> `200 OK`.
2. **Filtro de Privacidad LOPNNA:**
   - Crear atleta con `isPublic = false` y verificar que NUNCA aparece en los resultados de búsqueda.
3. **Filtro por Año de Nacimiento (`birthYear`):**
   - Buscar `birthYear = 2010` y verificar que solo retorna atletas nacidos en ese año.
4. **Filtro por Posición Primaria (`primaryPosition`):**
   - Buscar `primaryPosition = 'DELANTERO_CENTRO'` y verificar coincidencia exacta.
5. **Filtro por Pierna Hábil (`preferredFoot`):**
   - Buscar `preferredFoot = 'ZURDO'` y verificar que solo retorna zurdos.
6. **Filtro por Pasaporte Europeo (`hasEuropeanPassport = true`):**
   - Verificar que solo retorna atletas con `secondaryPassports` no nulo ni vacío.
7. **Filtro por Video (`hasVideo = true`):**
   - Atleta con video `READY` aparece en los resultados.
   - Atleta sin videos o con video en `PENDING_UPLOAD` no aparece al filtrar por `hasVideo = true`.
8. **Paginación y Orden:**
   - Verificar `size = 2` y navegación de páginas.
9. **Rendimiento DoD (< 100ms):**
   - Medir tiempo de ejecución del endpoint con filtros en base de datos local y verificar < 100ms.

### 5.2. Frontend
1. Compilación TypeScript y Angular sin errores (`npm run build`).
2. Pruebas de guard: usuario tutor o scout no aprobado es redirigido.
3. Validación de renderizado del directorio y apertura del modal de video.

---

## 6. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Backend - Repositorio y DTOs**
  - [x] Extender `AthleteRepository` con `JpaSpecificationExecutor<Athlete>`.
  - [x] Crear DTO `AthleteFilterCriteria.java` con Lombok.
  - [x] Crear DTO `ScoutDirectoryAthleteItem.java` con Lombok.
- [x] **Paso 2: Backend - Especificaciones JPA y Servicio**
  - [x] Crear `AthleteSpecifications.java` con predicados (`isPublic`, `birthYear`, `primaryPosition`, `preferredFoot`, `clubId`, `hasEuropeanPassport`, `hasVideo`).
  - [x] Crear `ScoutDirectoryService.java` implementando `searchDirectory(criteria, pageable)` con asignación de categorías, insignias y video principal.
- [x] **Paso 3: Backend - Controlador REST**
  - [x] Actualizar `ScoutDirectoryController.java` para inyectar `ScoutDirectoryService` y recibir filtros paginados en `GET /api/v1/scouts/directory`.
- [x] **Paso 4: Backend - Pruebas Automatizadas**
  - [x] Crear `ScoutDirectoryIntegrationTest.java` cubriendo filtros, exclusión de atletas privados y tiempo de respuesta.
  - [x] Ejecutar `./mvnw test` y garantizar que todos los tests pasen al 100%.
- [x] **Paso 5: Frontend - Guardia, Servicio y Modelos**
  - [x] Crear `scout.guard.ts` y su archivo de pruebas `scout.guard.spec.ts`.
  - [x] Crear interfaces en `scout-directory.model.ts`.
  - [x] Crear servicio `ScoutDirectoryService` en `core/services/scout-directory.service.ts`.
- [x] **Paso 6: Frontend - Componente de Directorio de Scouts**
  - [x] Implementar `ScoutDirectoryComponent` (TypeScript, HTML y CSS siguiendo `fe-desing.md`).
  - [x] Implementar chips de categorías rápidas (Sub-15, Sub-17, Sub-20).
  - [x] Implementar modal interactivo para reproducción rápida de videos (`quick-video-modal`).
  - [x] Registrar la ruta `/scout/directory` en `app.routes.ts` protegida con `[authGuard, scoutGuard]`.
  - [x] Añadir enlace condicional en el navbar (`app.component.html`) para scouts verificados y admins.
  - [x] Validar compilación con `npm run build`.
- [x] **Paso 7: Documentación de Pruebas y Cierre en Trello**
  - [x] Crear el plan de pruebas en `test/TS-13-test-plan-directorio-busqueda-scouts.md`.
  - [x] Mover la tarjeta TS-13 a `in testing` en Trello y dejar comentario explicativo.

---

## 7. Criterios de Aceptación (Definition of Done - DoD)

1. **Endpoint `GET /api/v1/scouts/directory`:**
   - Retorna página de atletas que cumplen con los filtros suministrados (`birthYear`, `primaryPosition`, `preferredFoot`, `clubId`, `hasEuropeanPassport`, `hasVideo`).
   - Atletas con `is_public = false` quedan terminantemente excluidos de cualquier resultado.
   - Acceso restringido exclusivamente a `SCOUT` aprobados y `ADMIN` (los scouts pendientes reciben `403 Forbidden`).
2. **Rendimiento:**
   - Las consultas con filtros tardan menos de 100ms en entorno local gracias a los índices B-tree de PostgreSQL (`idx_athletes_filter`).
3. **Frontend Bento Grid:**
   - Componente `ScoutDirectoryComponent` operativo en la ruta `/scout/directory` con estética atlética, chips de categorías y panel de filtros.
   - Cada tarjeta de atleta muestra foto, posición, club actual, insignias deportivas y botón de reproducción rápida si tiene video.
   - El botón de reproducción rápida abre un modal interactivo con el video destacado sin redirigir al scout fuera del directorio.
4. **Calidad y Tests:**
   - 100% de tests unitarios y de integración backend exitosos (`./mvnw test`).
   - Compilación frontend impecable (`npm run build`).
   - Evidencia completa documentada en `test/TS-13-test-plan-directorio-busqueda-scouts.md`.
