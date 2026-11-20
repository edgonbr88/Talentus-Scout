# Plan de Implementación: [TS-80] Sección de Análisis Técnico de Scouts a Atletas

**ID Tarea:** TS-80  
**Tarjeta Trello:** [https://trello.com/c/Vj7GPVPN](https://trello.com/c/Vj7GPVPN)  
**Fecha:** 2026-11-20  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Los scouts acreditados que observan en terreno o evalúan a un atleta juvenil no cuentan actualmente con un espacio estructurado dentro de Talentus Scout para registrar su evaluación técnico-táctica y compartirla de forma colaborativa con otros scouts aprobados.
- **Impacto en los usuarios:**
  - **Scouts aprobados:** Pueden registrar **hasta 1 análisis técnico propio por atleta** con **Fortalezas y Virtudes Destacadas**, **Áreas de Mejora y Enfoque Formativo** (ítems dinámicos Título + Descripción inspirados en el documento de referencia `Reporte Individual de Scouting - Fabio Ciarpaglini.pdf`) y **Dictamen de Scouting**, editarlo o eliminarlo, y consultar en modo solo lectura los análisis de otros colegas sobre el mismo jugador.
  - **Administradores:** Pueden consultar y moderar/eliminar análisis que incumplan normas de salvaguarda o respeto.
  - **Atletas, Tutores y Público General:** Permanecen completamente aislados de estos reportes internos B2B.
- **Restricciones Legales y de Negocio (LOPNNA Art. 65 / FIFA):**
  - Las evaluaciones formativas y psicológicas sobre menores son inteligencia técnica sensible de uso exclusivo entre scouts acreditados y administradores.
  - **Aislamiento estricto:** Queda prohibido exponer los análisis técnicos en el endpoint público `GET /api/v1/athletes/public/{slug}`, en el renderizado SSR público de `/atleta/:slug`, o a cuentas `TUTOR`, `ATHLETE` y scouts `PENDING` / `REJECTED`.
- **Dependencias:** `TS-12` (Verificación de scouts), `TS-13` (Directorio de scouts), `TS-71` (Flujo de navegación entre directorio y `/atleta/:slug`).

---

## 2. Alcance Técnico y Arquitectura
- **Submódulos impactados:**
  1. `talentus-scout-migrations`: Nueva migración `dbmate` para `scout_technical_analyses`.
  2. `talentus-scout-be`: Nueva entidad JPA, repositorio, excepción de conflicto (`409`), DTOs con Lombok y Jakarta Validation, servicio con control estricto de autoría/acceso, controlador REST `/api/v1/scout/athletes/{athleteId}/technical-analyses` y pruebas unitarias/integración.
  3. `talentus-scout-fe`: Interfaces TypeScript, métodos HTTP en `ScoutDirectoryService`, componente standalone `ScoutTechnicalAnalysesSectionComponent` integrado en `BentoProfileComponent` (`/atleta/:slug`) con renderizado condicional exclusivo en navegador para `SCOUT` aprobado / `ADMIN`, sin modificar `/scout/directory`.
- **Fuera de alcance confirmado por el usuario:** Exportación a PDF del análisis, bloques de potenciación/psicología (págs. 3–4 del PDF de ejemplo), valoración de proyección, campos de partido/fecha de visoría, y contadores o filtros nuevos en `/scout/directory`.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL 16 / dbmate)

> [!CAUTION]
> **DIRECTIVA OBLIGATORIA DE BASE DE DATOS:** Queda terminantemente **PROHIBIDO ejecutar migraciones directamente en la base de datos productiva de NEON**. Todas las migraciones DDL/`dbmate` deben ejecutarse y validarse exclusivamente en el entorno de desarrollo local (PostgreSQL local).

- **Archivo de migración (`dbmate`):**  
  `talentus-scout-migrations/migrations/20261120100000_create_scout_technical_analyses.sql`

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS scout_technical_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strengths JSONB NOT NULL,
    improvement_areas JSONB NOT NULL,
    scouting_verdict TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_scout_technical_analyses_athlete_scout UNIQUE (athlete_id, scout_id),
    CONSTRAINT chk_scout_tech_analyses_strengths_array CHECK (
        jsonb_typeof(strengths) = 'array' AND jsonb_array_length(strengths) >= 1
    ),
    CONSTRAINT chk_scout_tech_analyses_improvements_array CHECK (
        jsonb_typeof(improvement_areas) = 'array' AND jsonb_array_length(improvement_areas) >= 1
    ),
    CONSTRAINT chk_scout_tech_analyses_verdict_nonempty CHECK (
        length(trim(scouting_verdict)) > 0
    )
);

CREATE INDEX IF NOT EXISTS idx_scout_tech_analyses_athlete
    ON scout_technical_analyses(athlete_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_scout_tech_analyses_scout
    ON scout_technical_analyses(scout_id);

-- migrate:down
DROP INDEX IF EXISTS idx_scout_tech_analyses_scout;
DROP INDEX IF EXISTS idx_scout_tech_analyses_athlete;
DROP TABLE IF EXISTS scout_technical_analyses;
```

---

## 4. Backend: Spring Boot 3 (Java 21)

- **Paquete base:** `com.talentus.scout`
- **Directiva de Modelado:** Uso obligatorio de Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`) e instanciación mediante `.builder()`.

### 4.1. Clases a crear o modificar
1. **Entidad JPA:** `domain/entity/ScoutTechnicalAnalysis.java`
   - `@Id @UuidGenerator(style = UuidGenerator.Style.VERSION_7) private UUID id;`
   - `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "athlete_id", nullable = false) private Athlete athlete;`
   - `@ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "scout_id", nullable = false) private User scout;`
   - `@JdbcTypeCode(SqlTypes.JSON) @Column(name = "strengths", columnDefinition = "JSONB", nullable = false) private String strengthsJson;`
   - `@JdbcTypeCode(SqlTypes.JSON) @Column(name = "improvement_areas", columnDefinition = "JSONB", nullable = false) private String improvementAreasJson;`
   - `@Column(name = "scouting_verdict", columnDefinition = "TEXT", nullable = false) private String scoutingVerdict;`
   - `createdAt`, `updatedAt` con `@PrePersist` y `@PreUpdate`.
   - `@Table(name = "scout_technical_analyses", uniqueConstraints = @UniqueConstraint(name = "uq_scout_technical_analyses_athlete_scout", columnNames = {"athlete_id", "scout_id"}))`.
2. **Excepción y Manejador Global:**
   - `exception/DuplicateTechnicalAnalysisException.java`
   - `web/exception/GlobalExceptionHandler.java`: Manejar `DuplicateTechnicalAnalysisException` retornando HTTP `409 Conflict` (`error: "CONFLICT"`).
3. **Repositorios:**
   - `repository/ScoutTechnicalAnalysisRepository.java`:
     - `@Query("SELECT a FROM ScoutTechnicalAnalysis a JOIN FETCH a.scout WHERE a.athlete.id = :athleteId ORDER BY a.updatedAt DESC")` `List<ScoutTechnicalAnalysis> findByAthleteIdWithScoutOrderByUpdatedAtDesc(@Param("athleteId") UUID athleteId);`
     - `Optional<ScoutTechnicalAnalysis> findByIdAndAthleteId(UUID id, UUID athleteId);`
     - `boolean existsByAthleteIdAndScoutId(UUID athleteId, UUID scoutId);`
   - `repository/ScoutProfileRepository.java`:
     - Agregar `List<ScoutProfile> findByUserIdIn(Collection<UUID> userIds);` para hidratar `scoutRole` y `organizationName` en lote sin consultas N+1.
4. **DTOs (`web/dto/`):**
   - `TechnicalAnalysisItemDto.java`:
     - `title`: `@NotBlank`, `@Size(max = 120)`
     - `description`: `@NotBlank`, `@Size(max = 600)`
   - `UpsertScoutTechnicalAnalysisRequest.java`:
     - `strengths`: `@NotEmpty`, `@Size(min = 1, max = 10)`, `@Valid List<TechnicalAnalysisItemDto>`
     - `improvementAreas`: `@NotEmpty`, `@Size(min = 1, max = 10)`, `@Valid List<TechnicalAnalysisItemDto>`
     - `scoutingVerdict`: `@NotBlank`, `@Size(max = 2000)`
   - `ScoutTechnicalAnalysisResponse.java`:
     - `id`, `athleteId`, `scoutUserId`, `scoutFullName`, `scoutRole`, `organizationName`, `strengths`, `improvementAreas`, `scoutingVerdict`, `editableByCurrentUser`, `deletableByCurrentUser`, `createdAt`, `updatedAt`.
5. **Servicio (`service/ScoutTechnicalAnalysisService.java`):**
   - Valida acceso del usuario autenticado (`ADMIN` o `SCOUT` aprobado vía `ScoutSecurity.isVerifiedScout`).
   - Valida que el atleta exista, `deletedAt == null`, y sea accesible al usuario (`isAdmin || (athlete.isPublic() && athlete.getLegalVerificationStatus() == APPROVED) || isSameClubAsScout`); de lo contrario lanza `ResourceNotFoundException` (`404`).
   - `getAnalysesForAthlete(UUID athleteId, Authentication auth)`: devuelve todos los análisis ordenando primero el del usuario actual (si existe) y el resto por `updatedAt DESC`, hidratando `scoutRole` y `organizationName` desde `ScoutProfile` (fallback `"Administrador Técnico"` / `"Talentus Scout"` si es `ADMIN` sin `ScoutProfile`).
   - `createAnalysis(UUID athleteId, UpsertScoutTechnicalAnalysisRequest req, Authentication auth)`: verifica `!existsByAthleteIdAndScoutId` (si existe lanza `DuplicateTechnicalAnalysisException` -> `409`), sanitiza `trim()`, serializa JSONB vía `ObjectMapper`, guarda y devuelve DTO con `201 Created`.
   - `updateAnalysis(UUID athleteId, UUID analysisId, UpsertScoutTechnicalAnalysisRequest req, Authentication auth)`: busca por `findByIdAndAthleteId`, valida `analysis.getScout().getId().equals(currentUser.getId())` (si difiere, incluso si es otro scout o admin, lanza `AccessDeniedException` -> `403 Forbidden`), actualiza campos y guarda.
   - `deleteAnalysis(UUID athleteId, UUID analysisId, Authentication auth)`: busca por `findByIdAndAthleteId`, valida `analysis.getScout().getId().equals(currentUser.getId()) || isAdmin` (si es otro scout, lanza `AccessDeniedException` -> `403 Forbidden`), elimina registro.
6. **Controlador REST (`web/controller/ScoutTechnicalAnalysisController.java`):**
   - Ruta base: `/api/v1/scout/athletes/{athleteId}/technical-analyses`
   - `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`:
     - `GET` -> `200 OK` (`List<ScoutTechnicalAnalysisResponse>`)
     - `POST` -> `201 Created` (`ScoutTechnicalAnalysisResponse`)
     - `PUT /{analysisId}` -> `200 OK` (`ScoutTechnicalAnalysisResponse`)
     - `DELETE /{analysisId}` -> `204 No Content`
   - Verificación explícita de que `AthleteService.getPublicAthleteBySlug` y `PublicAthleteResponse` permanecen sin ningún campo ni consulta de análisis técnicos.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)

- **Directiva de Diseño (`fe-desing.md`):**
  - **Paleta intencional:** Alineada al sistema deportivo oscuro de Talentus Scout:
    - Fondo base `#0A0F1D`, superficie principal `#141D30`, superficie elevada `#1E2B45`, bordes `#22314D`
    - Acento cancha / Fortalezas: `#10B981` (verde táctico)
    - Acento enfoque formativo / Áreas de mejora: `#F59E0B` (ámbar técnico)
    - Texto principal `#F8FAFC`, texto secundario `#94A3B8`, peligro `#EF4444`
  - **Tipografía:** `Outfit` para encabezados de sección y dictamen, `Inter` para títulos de ítems y párrafos (`max-width: 72ch` en textos narrativos). Sin all-caps decorativos, sin palabras aisladas coloreadas dentro de títulos, sin flechas `→` decorativas en botones.
  - **Concepto de Layout (Bento Technical Scouting Sheet):**
    - Módulo de ancho completo (`grid-column: span 12`) debajo de la grilla principal de `/atleta/:slug`.
    - **Jerarquía diferenciada (anti-cliché SaaS):**
      1. **Cabecera del Cuaderno Técnico:** Título, explicación concisa de confidencialidad entre scouts acreditados y botón primario (`"Redactar mi análisis"` si el usuario aún no registró uno).
      2. **Bloque Destacado "Mi Análisis Técnico":** Contenedor propio con filete lateral esmeralda, mostrando las dos columnas (**Fortalezas y Virtudes Destacadas** y **Áreas de Mejora y Enfoque Formativo**), el bloque de **Dictamen de Scouting** y acciones directas (`"Editar análisis"`, `"Eliminar"` con confirmación inline accesible).
      3. **Listado "Análisis de Otros Scouts":** Tarjetas de solo lectura claramente subordinadas (superficie `#0F172A`, cabecera con nombre, cargo y club del scout y fecha), más botón de moderación `"Eliminar"` visible únicamente para `ADMIN`.
      4. **Modal Reactivo con `FormArray`:** Formulario estructurado para añadir/quitar dinámicamente pares `{ title, description }` en Fortalezas (mín. 1, máx. 10) y Áreas de Mejora (mín. 1, máx. 10) más el campo de texto para **Dictamen de Scouting**, validaciones claras inline y actualización reactiva de la lista sin recargar la página.
- **Separación Obligatoria de Plantillas:** Todos los componentes usarán archivos `.component.ts`, `.component.html` (`templateUrl`) y `.component.css` independientes.
- **Seguridad SSR y Reactividad en Cliente:**
  - Crear `core/models/scout-technical-analysis.model.ts`.
  - Extender `core/services/scout-directory.service.ts` con `getTechnicalAnalyses`, `createTechnicalAnalysis`, `updateTechnicalAnalysis` y `deleteTechnicalAnalysis`.
  - Crear `features/public-profile/components/scout-technical-analyses/scout-technical-analyses.component.*`.
  - Integrar en `BentoProfileComponent` (`bento-profile.component.ts`, `.html`, `.css`) protegido con `canViewTechnicalAnalyses` (`isPlatformBrowser` + usuario `ADMIN` o `SCOUT` con `scoutVerificationStatus === 'APPROVED'`), asegurando que nunca se renderice en SSR ni para `TUTOR` / `ATHLETE` / scouts `PENDING` / visitantes anónimos.

---

## 6. Pruebas y Verificación
- **Base de datos local:**
  - Levantar `docker-postgresql` (`docker compose up -d docker-postgresql`) y aplicar `docker compose run --rm dbmate` sobre `talentus_scout_dev` local.
- **Backend (`./mvnw clean test`):**
  - `ScoutTechnicalAnalysisServiceTest.java`: pruebas unitarias de lógica de negocio, ordenamiento (propio primero), serialización JSONB, unicidad (`409`), edición prohibida ajena (`403`), moderación `ADMIN` y visibilidad de atleta.
  - `ScoutTechnicalAnalysisControllerIntegrationTest.java`: pruebas `@SpringBootTest` + `MockMvc` validando:
    - Creación (`201`), duplicado mismo scout (`409`), múltiples scouts sobre el mismo atleta (`200` lista con ambos).
    - Edición propia (`200`), edición por otro scout (`403`), edición por `ADMIN` sobre análisis ajeno (`403`).
    - Eliminación propia (`204`), eliminación ajena por otro scout (`403`), moderación por `ADMIN` (`204`).
    - Denegación (`401`/`403`) para anónimos, `TUTOR`, `ATHLETE` y `SCOUT` en estado `PENDING`/`REJECTED`.
    - Validación DTO (`400`) cuando faltan ítems o dictamen.
    - Verificación explícita de que `GET /api/v1/athletes/public/{slug}` no expone análisis técnicos.
- **Frontend (`npm test -- --watch=false`, `npm run build`):**
  - `scout-technical-analyses.component.spec.ts` y actualización de `bento-profile.component.spec.ts`: verificar ocultamiento para público/`TUTOR`/`ATHLETE`/`SCOUT PENDING`, renderizado para `SCOUT APPROVED` y `ADMIN`, creación/edición con `FormArray`, solo-lectura en análisis de otros scouts y eliminación con confirmación.
- **Comandos cURL de verificación manual:** Incluidos en el documento final de pruebas `test/TS-80-test-plan-analisis-tecnico-scouts-atletas.md`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear ramas `feature/TS-80-analisis-tecnico-scouts-atletas` desde `main` en `talentus-scout-migrations`, `talentus-scout-be` y `talentus-scout-fe`.
- [x] Paso 2: Crear migración `dbmate` `20261120100000_create_scout_technical_analyses.sql`, levantar PostgreSQL local y ejecutar `dbmate up` local.
- [x] Paso 3: Implementar `ScoutTechnicalAnalysis`, `DuplicateTechnicalAnalysisException`, `GlobalExceptionHandler` (`409`), `ScoutTechnicalAnalysisRepository` y `ScoutProfileRepository.findByUserIdIn`.
- [x] Paso 4: Implementar DTOs con Lombok y Jakarta Validation (`TechnicalAnalysisItemDto`, `UpsertScoutTechnicalAnalysisRequest`, `ScoutTechnicalAnalysisResponse`).
- [x] Paso 5: Implementar `ScoutTechnicalAnalysisService` y `ScoutTechnicalAnalysisController`.
- [x] Paso 6: Crear y ejecutar pruebas backend unitarias y de integración (`./mvnw clean test`).
- [x] Paso 7: Implementar modelos TS, métodos en `ScoutDirectoryService` y componente standalone `ScoutTechnicalAnalysesSectionComponent` siguiendo `fe-desing.md` y plantillas `.component.html` separadas.
- [x] Paso 8: Integrar la sección privada en `BentoProfileComponent` (solo navegador y solo `SCOUT` aprobado / `ADMIN`, sin tocar `/scout/directory`).
- [x] Paso 9: Crear/actualizar pruebas unitarias Frontend y ejecutar `npm test` + `npm run build`.
- [x] Paso 10: Redactar plan de pruebas en `test/TS-80-test-plan-analisis-tecnico-scouts-atletas.md`, marcar checkboxes `[x]`, crear PRs en submódulos, hacer push de docs a `main` en orquestador y mover tarjeta Trello a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Migración `dbmate` aplicada exitosamente en PostgreSQL local creando `scout_technical_analyses` con `UNIQUE (athlete_id, scout_id)` y columnas `JSONB`.
- [x] Compilación backend (`./mvnw clean compile`) y suite completa de pruebas (`./mvnw test`) en verde al 100%.
- [x] Compilación frontend (`npm run build`) y pruebas unitarias (`npm test`) en verde al 100%.
- [x] Aislamiento LOPNNA verificado: `GET /api/v1/athletes/public/{slug}` y el SSR público no exponen análisis; `TUTOR`, `ATHLETE`, anónimos y scouts no aprobados no pueden leer ni escribir análisis.
- [x] Un scout aprobado puede crear 1 análisis por atleta (`409` al duplicar), editar y borrar solo el propio (`403` si intenta sobre el de otro), y visualizar los análisis de otros scouts; `ADMIN` puede moderar/eliminar cualquier análisis.
- [x] Plan de pruebas generado en `test/TS-80-test-plan-analisis-tecnico-scouts-atletas.md`, PRs abiertos en GitHub para los submódulos y tarjeta `[TS-80]` movida a `in testing`.
