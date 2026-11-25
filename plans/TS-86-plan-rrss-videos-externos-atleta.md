# Plan de Implementación — [TS-86] Sección de RRSS y Plataformas de Video Externo en Ficha de Atleta (Instagram, TikTok, YouTube y Otros)

## 1. Identificación
* **ID de Tarea:** `TS-86`
* **Título:** `[TS-86] Sección de RRSS y Plataformas de Video Externo en Ficha de Atleta (Instagram, TikTok, YouTube y Otros)`
* **Enlace a Trello:** [https://trello.com/c/e6SHBBr8](https://trello.com/c/e6SHBBr8) (Card ID: `6aff2d74f19cbd40216767f7`)
* **Sprint / Módulo:** Perfil de Atleta, Panel del Tutor y Ficha Pública Bento (Scouting & Protección de Menores)
* **Ramas Git (Submódulos):** `feature/TS-86-rrss-videos-externos-atleta` en `talentus-scout-migrations`, `talentus-scout-be` y `talentus-scout-fe`.

---

## 2. Resumen y Contexto de Negocio
* **Justificación:** Muchos futbolistas juveniles y sus representantes ya publican jugadas, partidos completos y entrenamientos en redes sociales (Instagram, TikTok, YouTube) o plataformas especializadas de análisis de video (Hudl, Veo, Vimeo). Permitir registrar estos enlaces directamente en la ficha del atleta enriquece el scouting profesional y agrega valor diferencial al **Plan Pro**.
* **Reglas de Monetización (Gate de Suscripción Activa):**
  * Solo los atletas con **suscripción `ACTIVE` vigente** (`end_date > now`) pueden **agregar o modificar** cualquiera de los 5 campos de redes sociales/video externo.
  * Si la suscripción está inactiva o vencida y el propietario intenta agregar o alterar algún enlace o etiqueta, el backend responde **HTTP 403 Forbidden** (`AccessDeniedException`).
  * La edición de campos deportivos básicos (`primaryPosition`, `secondaryPosition`, `preferredFoot`, `heightCm`, `weightKg`, `bio`, `currentClubId`, etc.) sigue permitida sin suscripción activa siempre que los enlaces sociales no sean modificados.
  * Si una suscripción vence tras haber guardado enlaces, los enlaces **permanecen almacenados** en BD y visibles para scouts aprobados y administradores; únicamente se bloquea agregar o modificar enlaces hasta renovar el Plan Pro.
* **Protección del Menor y Cumplimiento Legal (LOPNNA Art. 65 / FIFA):**
  * **Aislamiento en Ficha Pública:** El objeto `socialLinks` en `GET /api/v1/athletes/public/{slug}` **SOLO** se expone a usuarios autenticados con rol `ADMIN` o `SCOUT` con verificación `APPROVED` y cuenta `ACTIVE`. Para visitantes anónimos, renderizado SSR, `TUTOR`, `ATHLETE` o scouts `PENDING`/`REJECTED`, el backend devuelve `socialLinks = null` (cero filtración en JSON ni HTML SSR).
  * **Aviso de Responsabilidad Visible (sin checkbox extra):** En el formulario de edición del tutor/atleta se muestra un aviso claro indicando que los enlaces compartidos deben ser **únicamente de carácter deportivo** y que **los tutores/representantes legales (o atletas mayores de edad) se hacen responsables de los datos y contenidos publicados en dichas plataformas externas**.
  * **Seguridad de URLs (Anti-XSS / Protocol Injection):** Se exige protocolo estricto `https://` y validación de host oficial (allowlist para Instagram, TikTok y YouTube; host válido bien formado para plataforma externa). Se rechazan `http://`, `javascript:`, `data:` o dominios no autorizados con **HTTP 400 Bad Request**.

---

## 3. Arquitectura y Modelo de Datos (`talentus-scout-migrations`)

### 3.1. Migración `dbmate`
* **Archivo:** `talentus-scout-migrations/migrations/20261125150000_add_social_video_links_to_athletes.sql`
* **DDL SQL exacto:**
```sql
-- migrate:up
ALTER TABLE public.athletes
    ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS tiktok_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS other_video_platform_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS other_video_platform_label VARCHAR(60);

-- migrate:down
ALTER TABLE public.athletes
    DROP COLUMN IF EXISTS other_video_platform_label,
    DROP COLUMN IF EXISTS other_video_platform_url,
    DROP COLUMN IF EXISTS youtube_url,
    DROP COLUMN IF EXISTS tiktok_url,
    DROP COLUMN IF EXISTS instagram_url;
```
* **Validación Obligatoria (Local PostgreSQL únicamente — NUNCA Neon):**
  * Ejecutar `dbmate up`, `dbmate down` y `dbmate up` contra `postgres://postgres:postgrespassword2026@localhost:5432/talentus_scout_dev?sslmode=disable`.

---

## 4. Especificación Backend (`talentus-scout-be` — Spring Boot 3 / Java 21 / Lombok)

### 4.1. Entidad JPA
* **`src/main/java/com/talentus/scout/domain/entity/Athlete.java`**:
  * Agregar los 5 campos con `@Column`:
    * `instagramUrl` (`instagram_url`, `length = 500`)
    * `tiktokUrl` (`tiktok_url`, `length = 500`)
    * `youtubeUrl` (`youtube_url`, `length = 500`)
    * `otherVideoPlatformUrl` (`other_video_platform_url`, `length = 500`)
    * `otherVideoPlatformLabel` (`other_video_platform_label`, `length = 60`)

### 4.2. DTOs (Lombok obligatorio)
* **`src/main/java/com/talentus/scout/web/dto/UpdateAthleteRequest.java`**:
  * Añadir:
    * `@Size(max = 500) private String instagramUrl;`
    * `@Size(max = 500) private String tiktokUrl;`
    * `@Size(max = 500) private String youtubeUrl;`
    * `@Size(max = 500) private String otherVideoPlatformUrl;`
    * `@Size(max = 60) private String otherVideoPlatformLabel;`
* **`src/main/java/com/talentus/scout/web/dto/AthleteResponse.java`**:
  * Añadir los 5 campos y mapearlos en el constructor `AthleteResponse(Athlete athlete)` para que `GET /api/v1/athletes/my-athletes`, `GET /api/v1/athletes/{id}` y `PUT /api/v1/athletes/{id}` los expongan al propietario y `ADMIN`.
* **`src/main/java/com/talentus/scout/web/dto/publicprofile/PublicSocialLinksDto.java`** (Nuevo):
  * Anotado con `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`.
  * Campos: `instagramUrl`, `tiktokUrl`, `youtubeUrl`, `otherPlatformUrl`, `otherPlatformLabel`.
* **`src/main/java/com/talentus/scout/web/dto/publicprofile/PublicAthleteResponse.java`**:
  * Añadir campo nullable `private PublicSocialLinksDto socialLinks;`.

### 4.3. Seguridad y Lógica de Negocio
* **`src/main/java/com/talentus/scout/security/ScoutSecurity.java`**:
  * Agregar método no-lanzador `boolean isApprovedScoutOrAdmin(Authentication authentication)`:
    * Retorna `true` si `hasRole(authentication, "ADMIN")`.
    * Retorna `true` si `hasRole(authentication, "SCOUT")` y `scoutProfileRepository.findByUserEmail(...)` posee `verificationStatus == APPROVED` y `user.status == ACTIVE`.
    * En cualquier otro caso (`null`, anónimo, `TUTOR`, `ATHLETE`, scout `PENDING`/`REJECTED`), retorna `false`.
* **`src/main/java/com/talentus/scout/service/AthleteService.java`**:
  * **Normalización y Validación estricta de URLs:**
    * Helper `sanitizeAndValidateSocialUrl(String rawUrl, String fieldLabel, Set<String> allowedBaseDomains)`:
      * `null` o `isBlank()` → retorna `null` (permite limpiar enlace).
      * `trim()` → valida longitud ≤ 500, `URI.create(...)`, esquema estrictamente `"https"` (case-insensitive), host no nulo ni en blanco, sin espacios y con formato de dominio válido (debe contener `.` y caracteres válidos de host; rechazar `localhost` o direcciones inválidas).
      * Allowlists:
        * Instagram: `instagram.com`, `instagr.am` (y cualquier subdominio `*.instagram.com`, `*.instagr.am`).
        * TikTok: `tiktok.com` (y subdominios `www.`, `vm.`, `vt.`, `m.`, etc. `*.tiktok.com`).
        * YouTube: `youtube.com`, `youtu.be` (y subdominios `*.youtube.com`, `*.youtu.be`).
        * Otra Plataforma: `allowedBaseDomains == null` (cualquier dominio `https://` bien formado).
      * Si falla, lanzar `IllegalArgumentException` (mapeado a **HTTP 400 Bad Request**).
    * Helper `sanitizeOptionalLabel(String rawLabel)`: `trim()`, blank → `null`, longitud ≤ 60.
  * **Gate de Suscripción Activa en `updateAthlete(UUID id, UpdateAthleteRequest request)`:**
    * Determinar valores efectivos solicitados solo para los campos presentes en `request` (`!= null` en el DTO; si viene `""` se interpreta como intento de limpiar a `null`; si viene `null` se conserva el valor actual).
    * Comparar cada uno de los 5 campos normalizados contra los almacenados actualmente en `athlete` usando `Objects.equals`.
    * Si al menos uno de los 5 campos cambia (`socialFieldsModified == true`):
      * Consultar `hasActiveSubscription(athlete.getId())`: `athleteSubscriptionRepository.findFirstByAthleteIdAndStatusOrderByEndDateDesc(athlete.getId(), SubscriptionStatus.ACTIVE)` verificando `endDate != null && endDate.isAfter(Instant.now())`.
      * Si `!hasActiveSubscription` → lanzar `AccessDeniedException("Se requiere una suscripción Plan Pro activa para agregar o modificar redes sociales y plataformas de video externo.")` (**HTTP 403 Forbidden**).
      * Si tiene suscripción activa → ejecutar la validación estricta de URLs (HTTP 400 si inválida) y persistir los cambios. Si `otherVideoPlatformUrl` queda en `null` después de la actualización, limpiar también `otherVideoPlatformLabel = null` (si el usuario intentó enviar solo label sin URL vigente, lanzar `IllegalArgumentException` o limpiar coherentemente; validaremos que si envían una etiqueta no vacía cuando no hay `otherVideoPlatformUrl`, se rechace con 400 pidiendo el enlace correspondiente, mientras que si borran la URL sin enviar label se limpie la etiqueta automáticamente).
    * Si `socialFieldsModified == false` → permitir la actualización de los campos deportivos generales normalmente, independientemente de la suscripción.
  * **Aislamiento LOPNNA en `getPublicAthleteBySlug(String slug, Authentication authentication)`:**
    * Evaluar `scoutSecurity.isApprovedScoutOrAdmin(authentication)`.
    * Solo si es `true` Y al menos una de las 4 URLs (`instagramUrl`, `tiktokUrl`, `youtubeUrl`, `otherVideoPlatformUrl`) es no nula y no vacía, construir `PublicSocialLinksDto.builder()...build()`.
    * De lo contrario `socialLinks = null`.

### 4.4. Endpoints REST
* `PUT /api/v1/athletes/{id}` (ya asegurado con `@PreAuthorize("@athleteSecurity.isOwner(#id, authentication)")`):
  * `200 OK` con `AthleteResponse` (incluye los 5 campos).
  * `400 Bad Request` si algún enlace falla la validación de esquema/dominio.
  * `403 Forbidden` si no es propietario o si intenta agregar/editar RRSS sin suscripción activa.
* `GET /api/v1/athletes/my-athletes` y `GET /api/v1/athletes/{id}`:
  * `200 OK` con `AthleteResponse` incluyendo los 5 campos.
* `GET /api/v1/athletes/public/{slug}`:
  * `200 OK` con `PublicAthleteResponse` incluyendo `socialLinks` solo para `ADMIN` o `SCOUT` (`APPROVED` + `ACTIVE`).

---

## 5. Especificación Frontend (`talentus-scout-fe` — Angular 18+ Standalone)

### 5.1. Dirección de Diseño (`fe-desing.md`)
* **Paleta deliberada (identidad nocturna de cancha Talentus Scout):**
  * `#0B1120` (Obsidian Pitch — fondos profundos de inputs y contenedores)
  * `#0F172A` (Slate Stadium — superficie principal de modal y tarjetas)
  * `#1E293B` (Touchline Border — bordes estructurales)
  * `#10B981` (Pitch Emerald — estado activo, confirmaciones y CTA principal)
  * `#38BDF8` (Floodlight Cyan — acciones de edición/identidad y enlaces técnicos)
  * `#F59E0B` (Referee Amber — aviso de responsabilidad y estado bloqueado Pro)
* **Tipografía y Copywriting:**
  * Jerarquía clara en sentence case para etiquetas y mensajes orientados al tutor/scout (sin encabezados all-caps decorativos innecesarios ni texto relleno).
  * Un único foco visual principal por sección: en el modal, el banner de responsabilidad deportiva/legal y el bloque Pro se diferencian estructuralmente por borde izquierdo de acento; en el perfil público Bento, la tarjeta "Redes y Videos Externos" presenta enlaces táctiles con íconos oficiales SVG de cada plataforma y sin sombras genéricas repetitivas.
* **Separación estricta de plantillas:** Todos los nuevos componentes usarán `.component.ts`, `.component.html` (`templateUrl`), `.component.css` (`styleUrls`) y `.component.spec.ts`.

### 5.2. Modelos y Servicios
* **`src/app/core/models/athlete.model.ts`**:
  * Agregar interfaz `PublicSocialLinks`: `{ instagramUrl?: string | null; tiktokUrl?: string | null; youtubeUrl?: string | null; otherPlatformUrl?: string | null; otherPlatformLabel?: string | null; }`.
  * Agregar interfaz `UpdateAthleteRequest` con campos deportivos editables + los 5 campos de redes sociales/video externo.
  * Extender `AthleteSummary` con `instagramUrl?`, `tiktokUrl?`, `youtubeUrl?`, `otherVideoPlatformUrl?`, `otherVideoPlatformLabel?`.
  * Extender `PublicAthleteResponse` con `socialLinks?: PublicSocialLinks | null`.
* **`src/app/core/services/athlete.service.ts`**:
  * Agregar `updateAthlete(id: string, payload: UpdateAthleteRequest): Observable<AthleteSummary>` (`PUT ${this.apiUrl}/${id}`).

### 5.3. Componente Modal de Edición de Ficha (`EditAthleteModalComponent`)
* **Archivos:**
  * `src/app/features/dashboard/edit-athlete-modal/edit-athlete-modal.component.ts`
  * `src/app/features/dashboard/edit-athlete-modal/edit-athlete-modal.component.html`
  * `src/app/features/dashboard/edit-athlete-modal/edit-athlete-modal.component.css`
  * `src/app/features/dashboard/edit-athlete-modal/edit-athlete-modal.component.spec.ts`
* **Inputs / Outputs:**
  * `@Input({ required: true }) athlete!: AthleteSummary;`
  * `@Input() initialSection: 'GENERAL' | 'SOCIAL_LINKS' = 'GENERAL';`
  * `@Output() athleteUpdated = new EventEmitter<AthleteSummary>();`
  * `@Output() closed = new EventEmitter<void>();`
  * `@Output() upgradeRequested = new EventEmitter<AthleteSummary>();`
* **Funcionalidades:**
  * Selector de pestaña/sección interna (`Datos Deportivos` / `Redes y Videos Externos`) inicializado desde `initialSection`.
  * Sección **Datos Deportivos:** `primaryPosition`, `secondaryPosition`, `preferredFoot`, `currentClubId`, `federationLicenseNumber`, `secondaryPassports`, `heightCm`, `weightKg`, `bio`, `isPublic`.
  * Sección **Redes Sociales y Plataformas de Video Externo:**
    * Banner de aviso de responsabilidad siempre visible (sin checkbox): explica que los enlaces compartidos deben contener **únicamente material deportivo** y que **los tutores/representantes legales (o atletas mayores de edad) se hacen responsables de los datos y contenidos publicados en dichas plataformas externas**.
    * Si `athlete.subscriptionStatus === 'ACTIVE'`: campos editables con validadores reactivos (`https://` obligatorio y dominios oficiales para Instagram, TikTok, YouTube; `https://` válido para Otra Plataforma + campo etiqueta `otherVideoPlatformLabel`, ej. `Hudl`, `Veo`, `Vimeo`).
    * Si `athlete.subscriptionStatus !== 'ACTIVE'`: controles deshabilitados (`disabled`), visualización en modo solo lectura de enlaces previamente guardados si existieran, aviso de restricción Pro y botón directo **"Activar Plan Pro"** que emite `upgradeRequested` (redirigiendo a `/pagos/:athleteId`).
  * Al guardar, si la suscripción NO está activa, no envía cambios en los 5 campos sociales (evitando 403 al editar únicamente datos deportivos).

### 5.4. Integración en Panel del Tutor (`TutorDashboardComponent`)
* **`src/app/features/dashboard/tutor-dashboard.component.ts` & `.html`**:
  * Importar `EditAthleteModalComponent`.
  * Agregar en la barra de acciones de cada tarjeta de atleta:
    * Botón **"✏️ Editar Ficha"** → abre `EditAthleteModalComponent` con `initialSection = 'GENERAL'`.
    * Si `athlete.subscriptionStatus === 'ACTIVE'`: botón **"🌐 Redes y Videos"** → abre `EditAthleteModalComponent` con `initialSection = 'SOCIAL_LINKS'`.
    * Si `athlete.subscriptionStatus !== 'ACTIVE'`: botón **"🔒 Redes y Videos (Requiere Pro)"** (con estilo `.btn-video-locked`) → redirige a `/pagos/:athleteId` mediante `openCheckoutModal(athlete)`.
  * Al emitirse `athleteUpdated`, actualizar notificación de éxito, cerrar modal y recargar `loadAthletes()`.

### 5.5. Tarjeta Bento en Perfil Público (`BentoProfileComponent`)
* **`src/app/features/public-profile/bento-profile.component.ts`, `.html`, `.css`**:
  * Agregar `public canViewSocialLinks = computed(...)`:
    * Verifica `isPlatformBrowser(this.platformId)`, usuario autenticado `ADMIN` o `SCOUT` (`scoutVerificationStatus === 'APPROVED'`), y que `athlete()?.socialLinks` contenga al menos una URL válida que empiece con `https://`.
  * Agregar helper `isSafeExternalUrl(url?: string | null): boolean` que exige `https://`.
  * Renderizar tarjeta **"Redes y Videos Externos"** dentro del Bento Grid solo cuando `canViewSocialLinks()` es `true`:
    * Enlaces con íconos SVG oficiales de Instagram, TikTok, YouTube y plataforma externa (mostrando `otherPlatformLabel || 'Otra Plataforma'`).
    * Todos los enlaces con `target="_blank" rel="noopener noreferrer"`.

---

## 6. Plan de Pruebas y Validación
1. **Base de Datos (Local PostgreSQL):**
   * `dbmate up && dbmate down && dbmate up` verificando columnas en `public.athletes`.
2. **Backend (`talentus-scout-be`):**
   * Nueva suite de integración `AthleteSocialLinksIntegrationTest.java`:
     * Propietario con Plan Pro activo guarda, actualiza y limpia enlaces válidos (Instagram, TikTok, YouTube, Hudl) → `200 OK`.
     * Propietario sin suscripción activa intenta agregar/modificar RRSS → `403 Forbidden`.
     * Propietario sin suscripción activa edita datos deportivos (`bio`, `heightCm`) sin tocar RRSS → `200 OK`.
     * Atleta cuya suscripción venció conserva enlaces en BD, sigue visible para scout aprobado, pero bloquea nuevas modificaciones (`403 Forbidden`).
     * Validación estricta de URLs: `http://...`, `javascript:alert(1)`, dominio incorrecto en Instagram/TikTok/YouTube, etiqueta sin URL → `400 Bad Request`.
     * Aislamiento LOPNNA en `GET /api/v1/athletes/public/{slug}`: `socialLinks` presente para `SCOUT` aprobado y `ADMIN`; `null` para anónimo, `TUTOR`, `ATHLETE` y `SCOUT` pendiente.
   * Regresión en `AthleteControllerTest` y `AthletePublicControllerTest`.
3. **Frontend (`talentus-scout-fe`):**
   * Unit tests: `edit-athlete-modal.component.spec.ts`, `tutor-dashboard.component.spec.ts`, `bento-profile.component.spec.ts`.
   * Compilación completa browser + SSR: `npm run build`.

---

## 7. Checklist de Implementación Paso a Paso
- [x] **Paso 1:** Crear y validar localmente la migración `dbmate` (`20261125150000_add_social_video_links_to_athletes.sql`) en `talentus-scout-migrations` (`up`, `down`, `up`).
- [x] **Paso 2:** Actualizar entidad `Athlete`, DTOs (`UpdateAthleteRequest`, `AthleteResponse`, `PublicSocialLinksDto`, `PublicAthleteResponse`) y `ScoutSecurity` en `talentus-scout-be`.
- [x] **Paso 3:** Implementar validación estricta de URLs, gate de suscripción activa y aislamiento LOPNNA en `AthleteService`.
- [x] **Paso 4:** Escribir y ejecutar pruebas de integración en `talentus-scout-be` (`AthleteSocialLinksIntegrationTest` y suites relacionadas).
- [x] **Paso 5:** Actualizar `athlete.model.ts` y `athlete.service.ts` en `talentus-scout-fe`.
- [x] **Paso 6:** Implementar `EditAthleteModalComponent` (`.ts`, `.html`, `.css`, `.spec.ts`) con validaciones reactivas, aviso de responsabilidad deportiva/legal y estado bloqueado Pro.
- [x] **Paso 7:** Integrar botones de edición y redes/videos en `TutorDashboardComponent` y actualizar sus pruebas unitarias.
- [x] **Paso 8:** Implementar tarjeta Bento "Redes y Videos Externos" con protección SSR/LOPNNA en `BentoProfileComponent` y sus pruebas unitarias.
- [x] **Paso 9:** Ejecutar pruebas unitarias Angular (`ng test`) y compilación de producción (`npm run build`).
- [x] **Paso 10:** Generar `test/TS-86-test-plan-rrss-videos-externos-atleta.md`, crear PRs en los 3 submódulos, publicar documentación en `main` del orquestador y mover tarjeta TS-86 a `in testing` en Trello.

---

## 8. Criterios de Aceptación (DoD)
1. Migración `dbmate` añade las 5 columnas en `public.athletes` con rollback limpio y validado en PostgreSQL local.
2. Backend bloquea con **403** la creación/modificación de RRSS cuando no hay suscripción `ACTIVE` vigente, manteniendo editable la información deportiva general.
3. Enlaces guardados con Plan Pro permanecen almacenados y visibles a scouts aprobados aunque expire la suscripción, bloqueando solo su edición hasta renovar.
4. Backend valida estrictamente `https://` y dominios oficiales (Instagram, TikTok, YouTube; host válido en otra plataforma) respondiendo **400** ante entradas inválidas o inseguras.
5. `GET /api/v1/athletes/public/{slug}` expone `socialLinks` **únicamente** a `ADMIN` y `SCOUT` verificado (`APPROVED` + `ACTIVE`), devolviendo `null` a cualquier otro rol o visitante anónimo/SSR.
6. Frontend muestra modal de edición con aviso visible de contenido deportivo y responsabilidad del tutor/atleta mayor, estado bloqueado con CTA a `/pagos/:athleteId` si no es Pro, y tarjeta Bento con íconos SVG oficiales únicamente para scouts aprobados/admin en navegador.
7. Todas las pruebas automatizadas (backend y frontend) y `npm run build` pasan al 100%, PRs abiertos en los 3 submódulos y tarjeta TS-86 movida a `in testing`.
