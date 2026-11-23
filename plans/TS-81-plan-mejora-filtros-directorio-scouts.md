# Plan de Implementación: [TS-81] Mejora de Filtros en Directorio de Scouts (Buscador de Texto, Peso, Estatura y Año Escribible)

**ID Tarea:** TS-81  
**Tarjeta Trello:** https://trello.com/c/PzcQILwH  
**Fecha:** 2026-11-23  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Los scouts y reclutadores necesitan localizar atletas o clubes específicos de manera directa mediante búsqueda de texto libre, filtrar con precisión biométrica por rangos de estatura (cm) y peso (kg), y escribir manualmente los años de nacimiento (`Año Desde` / `Año Hasta`) sin depender de selectores rígidos ni de una barra superior de chips fijos (`Todos`, `Sub-15`, `Sub-17`, `Sub-20`).
- **Impacto en usuarios:**
  - **Scouts / Reclutadores:** Mayor velocidad para encontrar prospectos puntuales por nombre, apellido o club, mejor filtrado táctico/antropométrico y visibilidad inmediata de estatura y peso en cada tarjeta del directorio cuando estén registrados.
  - **Atletas / Clubes:** Atletas independientes (sin club asignado) siguen siendo descubribles al buscar por nombre o apellido gracias al `LEFT JOIN` sobre `currentClub`.
- **Restricciones legales y de seguridad (LOPNNA Art. 65):** El endpoint `GET /api/v1/scouts/directory` mantiene el guard `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`, operando exclusivamente sobre perfiles públicos, no eliminados, con verificación legal aprobada y suscripción activa (o pertenecientes al club del scout), sin exponer datos privados del menor.

---

## 2. Alcance Técnico y Arquitectura
- **Repositorios afectados:**
  1. `talentus-scout-migrations`: Nueva migración `dbmate` para indexar `height_cm`, `weight_kg` y búsquedas *case-insensitive* sobre `athletes` y `clubs_organizations`.
  2. `talentus-scout-be`: Actualización de `AthleteFilterCriteria`, `ScoutDirectoryController`, `AthleteSpecifications`, `ScoutDirectoryAthleteItem`, `ScoutDirectoryService` y `ScoutDirectoryIntegrationTest`.
  3. `talentus-scout-fe`: Actualización de `scout-directory.model.ts`, `scout-directory.service.ts`, `scout-directory.component.ts/.html/.css` y `scout-directory.component.spec.ts`.
- **Dependencias:** Ninguna.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Local-First)
> **Nota:** Las migraciones `dbmate` se ejecutan **exclusivamente en entorno local** (nunca directamente en Neon productivo).

- **Archivo de migración (`talentus-scout-migrations/migrations/20261123130000_add_scout_directory_filter_indexes.sql`):**
  ```sql
  -- migrate:up
  CREATE INDEX IF NOT EXISTS idx_athletes_height_cm
      ON public.athletes USING btree (height_cm)
      WHERE deleted_at IS NULL AND height_cm IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_athletes_weight_kg
      ON public.athletes USING btree (weight_kg)
      WHERE deleted_at IS NULL AND weight_kg IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_athletes_first_name_lower
      ON public.athletes USING btree (lower(first_name));

  CREATE INDEX IF NOT EXISTS idx_athletes_last_name_lower
      ON public.athletes USING btree (lower(last_name));

  CREATE INDEX IF NOT EXISTS idx_clubs_organizations_name_lower
      ON public.clubs_organizations USING btree (lower(name));

  -- migrate:down
  DROP INDEX IF EXISTS public.idx_clubs_organizations_name_lower;
  DROP INDEX IF EXISTS public.idx_athletes_last_name_lower;
  DROP INDEX IF EXISTS public.idx_athletes_first_name_lower;
  DROP INDEX IF EXISTS public.idx_athletes_weight_kg;
  DROP INDEX IF EXISTS public.idx_athletes_height_cm;
  ```

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Paquete base:** `com.talentus.scout`
- **Directiva de Modelado:** Mantener Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`) en DTOs.

### Clases a modificar:
1. **`web/dto/AthleteFilterCriteria.java`**
   - Agregar:
     - `private String query;`
     - `private BigDecimal minHeightCm;`
     - `private BigDecimal maxHeightCm;`
     - `private BigDecimal minWeightKg;`
     - `private BigDecimal maxWeightKg;`
2. **`web/dto/ScoutDirectoryAthleteItem.java`**
   - Agregar:
     - `private BigDecimal heightCm;`
     - `private BigDecimal weightKg;`
3. **`web/controller/ScoutDirectoryController.java`**
   - En `GET /api/v1/scouts/directory`, agregar `@RequestParam(required = false)`:
     - `String query`
     - `BigDecimal minHeightCm`
     - `BigDecimal maxHeightCm`
     - `BigDecimal minWeightKg`
     - `BigDecimal maxWeightKg`
   - Poblarlos en `AthleteFilterCriteria.builder()...build()`.
4. **`specification/AthleteSpecifications.java`**
   - **`withSearchQuery(String query)`:** Si `query == null || query.isBlank()`, retorna `null`. Normaliza con `trim().toLowerCase(Locale.ROOT)` y construye patrón `%<term>%`. Usa `Join<Athlete, ClubOrganization> clubJoin = root.join("currentClub", JoinType.LEFT);` para buscar en:
     - `cb.lower(root.get("firstName"))`
     - `cb.lower(root.get("lastName"))`
     - `cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), root.get("lastName")))`
     - `cb.lower(clubJoin.get("name"))`
   - **`withHeightRange(BigDecimal minHeightCm, BigDecimal maxHeightCm)`:** Si ambos son `null`, retorna `null` (no excluye atletas con `heightCm == null`). Si ambos están presentes y `minHeightCm.compareTo(maxHeightCm) > 0`, intercambia los límites. Aplica `>=`, `<=` o `between`.
   - **`withWeightRange(BigDecimal minWeightKg, BigDecimal maxWeightKg)`:** Misma lógica sobre `weightKg`.
   - **Validación segura de años (`withBirthYear`, `withBirthYearRange`):** Validar años dentro del rango seguro `[1900, 2100]` para evitar `DateTimeException` en `LocalDate.of(...)`.
5. **`service/ScoutDirectoryService.java`**
   - En `searchDirectory(...)`: aplicar `withSearchQuery`, `withHeightRange` y `withWeightRange` cuando correspondan.
   - En `mapToItem(Athlete)`: mapear `.heightCm(athlete.getHeightCm())` y `.weightKg(athlete.getWeightKg())`.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)
- **Directiva de Diseño:** Seguir [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md) (`frontend-design`). Mantener la identidad táctica oscura/esmeralda del radar de Talentus Scout, evitando clichés genéricos.
- **Separación de Plantillas:** `scout-directory.component.ts` usa `templateUrl: './scout-directory.component.html'` y `styleUrls: ['./scout-directory.component.css']`.

### Archivos a modificar:
1. **`src/app/core/models/scout-directory.model.ts`**
   - En `ScoutDirectoryAthleteItem`: agregar `heightCm?: number | null;` y `weightKg?: number | null;`.
   - En `ScoutDirectoryFilters`: agregar `query?: string | null;`, `minHeightCm?: number | null;`, `maxHeightCm?: number | null;`, `minWeightKg?: number | null;`, `maxWeightKg?: number | null;`.
2. **`src/app/core/services/scout-directory.service.ts`**
   - En `getDirectory(filters)`: serializar `query` (si `filters.query?.trim()`), `minHeightCm`, `maxHeightCm`, `minWeightKg`, `maxWeightKg` en `HttpParams`.
3. **`src/app/features/scout-directory/scout-directory.component.ts` / `.html` / `.css`**
   - **Buscador por texto:** Eliminar `categoryChips` y la barra superior de chips en `.chips-section`. Ubicar un campo de búsqueda por texto (`placeholder="Buscar por nombre, apellido o club..."`), botón de limpiar (`✕`) cuando hay texto, debounce de 350ms (`Subject` + `debounceTime(350)` + `distinctUntilChanged()` + `takeUntilDestroyed()`) y soporte para `Enter` (búsqueda inmediata).
   - **Año de nacimiento escribible:** Reemplazar `<select>` de `Año Desde` y `Año Hasta` por `<input type="number">` (`min="1900"`, `max="2100"`, placeholder `Ej. 2008` / `Ej. 2012`), validando año de 4 dígitos (o vacío para limpiar) con debounce de 350ms.
   - **Filtros de Estatura y Peso (Mín/Máx):** Agregar en `.filters-grid` del panel desplegable (`showAdvancedFilters`):
     - `Estatura mín. (cm)` / `Estatura máx. (cm)`
     - `Peso mín. (kg)` / `Peso máx. (kg)`
     con debounce de 350ms.
   - **Tarjetas del directorio:** Conservar el badge `athlete.category` en `.card-topbar`. Mostrar estatura y peso en la tarjeta cuando `athlete.heightCm != null || athlete.weightKg != null` (por ejemplo, en `.card-biometrics` o `.card-metrics` respetando la jerarquía Bento).
   - **Reiniciar filtros:** Actualizar la condición del botón `Reiniciar filtros` y `resetFilters()` para incluir `searchQuery`, `selectedBirthYearFrom`, `selectedBirthYearTo`, `minHeightCm`, `maxHeightCm`, `minWeightKg`, `maxWeightKg` y restablecer la paginación a la página `0`.

---

## 6. Pruebas y Verificación
- **Backend (`ScoutDirectoryIntegrationTest`):**
  - Búsqueda por `query` (nombre, apellido, nombre completo `firstName + " " + lastName`, nombre del club, *case-insensitive*).
  - Búsqueda por `query` retorna atletas independientes (`currentClub == null`) al coincidir nombre/apellido.
  - Filtrado por `minHeightCm` / `maxHeightCm` y `minWeightKg` / `maxWeightKg` (incluyendo inversión automática si `min > max` y preservación de atletas con `NULL` cuando no se envían filtros).
  - Verificación de `heightCm` y `weightKg` en la respuesta JSON.
  - Manejo seguro de años en `birthYear` / `birthYearFrom` / `birthYearTo`.
- **Frontend (`scout-directory.component.spec.ts`):**
  - Eliminación de chips superiores y funcionamiento del buscador por texto con debounce (~350ms) y `Enter`.
  - Conservación del badge de categoría dentro de las tarjetas.
  - Filtrado por `Año Desde` / `Año Hasta` escribibles (4 dígitos).
  - Filtrado por estatura y peso Mín/Máx con debounce.
  - Renderizado de estatura y peso en tarjetas cuando están disponibles.
  - `resetFilters()` limpia todos los filtros nuevos y vuelve a página `0`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear rama `feature/TS-81-mejora-filtros-directorio-scouts` en `talentus-scout-migrations`, crear migración `dbmate` de índices y validar localmente (nunca en Neon).
- [x] Paso 2: Crear rama `feature/TS-81-mejora-filtros-directorio-scouts` en `talentus-scout-be`, actualizar `AthleteFilterCriteria`, `ScoutDirectoryAthleteItem`, `ScoutDirectoryController`, `AthleteSpecifications` y `ScoutDirectoryService`.
- [x] Paso 3: Agregar y ejecutar pruebas en `ScoutDirectoryIntegrationTest` (`./mvnw test`).
- [x] Paso 4: Crear rama `feature/TS-81-mejora-filtros-directorio-scouts` en `talentus-scout-fe`, actualizar `scout-directory.model.ts` y `scout-directory.service.ts`.
- [x] Paso 5: Actualizar `scout-directory.component.ts`, `.html` y `.css` siguiendo `fe-desing.md` (buscador con debounce y Enter, años escribibles, estatura/peso Mín/Máx, visualización biométrica en tarjetas y reset completo).
- [x] Paso 6: Actualizar y ejecutar pruebas unitarias en `scout-directory.component.spec.ts` y compilación (`npm run build` / `npm test`).
- [x] Paso 7: Documentar el plan de pruebas en `test/TS-81-test-plan-mejora-filtros-directorio-scouts.md` y marcar checkboxes en el plan.
- [x] Paso 8: Hacer commit, push y crear PRs en `talentus-scout-migrations`, `talentus-scout-be` y `talentus-scout-fe`; commitear y pushear `plans/` y `test/` en `main` del orquestador; mover tarjeta en Trello a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Chips superiores (`Todos`, `Sub-15`, `Sub-17`, `Sub-20`) eliminados y reemplazados por buscador de texto por nombre, apellido, nombre completo y club con debounce (~350ms) y soporte `Enter`.
- [x] Badge de categoría (`Sub-15`, `Sub-17`, `Sub-20`, etc.) conservado dentro de cada tarjeta individual de atleta.
- [x] Filtros `Año Desde` y `Año Hasta` escribibles manualmente como campos numéricos y filtrando correctamente por rango o límite único.
- [x] Filtros numéricos Mín/Máx para estatura (cm) y peso (kg) conectados end-to-end entre Angular y Spring Boot.
- [x] Búsqueda textual con `LEFT JOIN` sobre el club para no excluir atletas independientes.
- [x] Tarjetas del directorio muestran estatura y peso cuando están registrados.
- [x] Botón `Reiniciar filtros` limpia todos los filtros activos y restablece la paginación a la página 0.
- [x] Compilación y pruebas automatizadas en verde en Backend y Frontend.
