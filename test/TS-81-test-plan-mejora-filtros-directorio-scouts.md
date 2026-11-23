# Plan de Pruebas: [TS-81] Mejora de Filtros en Directorio de Scouts (Buscador de Texto, Peso, Estatura y Año Escribible)

**ID Tarea:** TS-81  
**Tarjeta Trello:** https://trello.com/c/PzcQILwH  
**Fecha:** 2026-11-23  
**Plan de Implementación:** [TS-81-plan-mejora-filtros-directorio-scouts.md](file:///home/edgar/Talentus%20Scout/plans/TS-81-plan-mejora-filtros-directorio-scouts.md)

---

## 1. Alcance de Pruebas
- **Migraciones (`talentus-scout-migrations`):**
  - `migrations/20261123130000_add_scout_directory_filter_indexes.sql` (índices parciales sobre `height_cm`, `weight_kg` e índices `lower(...)` sobre `first_name`, `last_name` y `clubs_organizations.name`).
- **Backend (`talentus-scout-be`):**
  - `AthleteFilterCriteria` (`query`, `minHeightCm`, `maxHeightCm`, `minWeightKg`, `maxWeightKg`).
  - `ScoutDirectoryAthleteItem` (`heightCm`, `weightKg`).
  - `ScoutDirectoryController` (`GET /api/v1/scouts/directory`).
  - `AthleteSpecifications` (`withSearchQuery`, `withHeightRange`, `withWeightRange`, validación segura de `birthYear`/`birthYearFrom`/`birthYearTo`).
  - `ScoutDirectoryService`.
- **Frontend (`talentus-scout-fe`):**
  - `scout-directory.model.ts` y `scout-directory.service.ts`.
  - `scout-directory.component.ts`, `scout-directory.component.html`, `scout-directory.component.css`.

---

## 2. Pruebas Automatizadas Ejecutadas
### Backend
- **Comando:**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=ScoutDirectoryIntegrationTest,ScoutDirectorySecurityTest
  ```
- **Resultado:** `Tests run: 24, Failures: 0, Errors: 0, Skipped: 0` (**PASS**)
  - `ScoutDirectorySecurityTest` (4 tests)
  - `ScoutDirectoryIntegrationTest` (20 tests), incluyendo:
    - `shouldSearchByQueryOnNameFullNameAndClubAndIncludeIndependentAthletes`: búsqueda *case-insensitive* por nombre, nombre completo (`firstName + " " + lastName`), club y atletas sin club (`LEFT JOIN`).
    - `shouldFilterByHeightAndWeightRangesAndExposeMetrics`: exposición de `heightCm` / `weightKg`, rangos Mín/Máx, inversión automática cuando `min > max` y preservación de atletas con `NULL` cuando no hay filtro biométrico.
    - `shouldHandleOutOfRangeBirthYearSafely`: manejo seguro de años fuera de rango (`0`, `99999`) sin errores `500`.

### Frontend
- **Comando:**
  ```bash
  cd talentus-scout-fe && npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/features/scout-directory/scout-directory.component.spec.ts"
  ```
- **Resultado:** `TOTAL: 18 SUCCESS` (**PASS**)
  - Eliminación de chips superiores (`.chip-button` = 0) y presencia de `#directorySearchInput`.
  - Conservación del badge `.category-chip` dentro de cada tarjeta.
  - Renderizado de `.biometrics-tag` (`174 cm · 63 kg`) cuando el atleta tiene estatura/peso.
  - Buscador por texto con debounce (`350ms`), soporte `Enter` y botón limpiar.
  - Campos escribibles de `Año Desde` / `Año Hasta` validando 4 dígitos con debounce.
  - Filtros Mín/Máx de estatura y peso con debounce.
  - `resetFilters()` limpia todos los filtros y restablece `page: 0`.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Verificación API REST (`cURL`)
1. **Búsqueda textual por nombre, apellido, nombre completo o club:**
   ```bash
   curl -s -H "Authorization: Bearer <SCOUT_JWT>" \
     "http://localhost:8080/api/v1/scouts/directory?query=Alejandro%20G%C3%B3mez&page=0&size=12"
   ```
   - **Esperado:** `200 OK` con atletas coincidentes (incluyendo atletas independientes sin club) y campos `heightCm` / `weightKg` en cada item de `content[]`.

2. **Filtrado por rango de estatura y peso:**
   ```bash
   curl -s -H "Authorization: Bearer <SCOUT_JWT>" \
     "http://localhost:8080/api/v1/scouts/directory?minHeightCm=170&maxHeightCm=185&minWeightKg=60&maxWeightKg=78"
   ```
   - **Esperado:** `200 OK` con atletas dentro del rango biométrico.

3. **Rango de años escribible e inversión automática:**
   ```bash
   curl -s -H "Authorization: Bearer <SCOUT_JWT>" \
     "http://localhost:8080/api/v1/scouts/directory?birthYearFrom=2011&birthYearTo=2009"
   ```
   - **Esperado:** `200 OK` con atletas nacidos entre 2009 y 2011.

### 3.2. Verificación UI en Angular (`/directorio-scouts`)
1. Ingresar como scout aprobado al directorio (`/directorio-scouts`).
2. Confirmar que no existen los chips superiores (`Todos`, `Sub-15`, `Sub-17`, `Sub-20`) y en su lugar aparece el buscador de texto.
3. Escribir nombre, apellido o club en el buscador: tras ~350ms (o al presionar `Enter`) se actualiza el listado. Probar el botón `✕` para limpiar.
4. Abrir **Filtros tácticos**:
   - Escribir `Año Desde` (ej. `2008`) y `Año Hasta` (ej. `2012`).
   - Escribir `Estatura mín. (cm)`, `Estatura máx. (cm)`, `Peso mín. (kg)` y `Peso máx. (kg)`.
5. Confirmar que cada tarjeta conserva su chip de categoría (`Sub-15`, `Sub-17`, etc.) y muestra `📏 XXX cm · XX kg` cuando está registrado.
6. Hacer clic en **Reiniciar filtros** y comprobar que se limpian todos los campos y vuelve a página 0.

---

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] Se eliminaron los chips superiores (`Todos`, `Sub-15`, `Sub-17`, `Sub-20`) y en su lugar funciona el buscador de texto por nombre, apellido, nombre completo y club con debounce (~350ms) y soporte `Enter`.
- [x] El badge de categoría (`Sub-15`, `Sub-17`, `Sub-20`, etc.) se conserva visible dentro de cada tarjeta individual de atleta.
- [x] Los filtros `Año Desde` y `Año Hasta` permiten escribir el año manualmente como campos numéricos y filtran correctamente por rango o límite único.
- [x] Existen filtros numéricos Mín/Máx para estatura (cm) y peso (kg) conectados end-to-end entre Angular y Spring Boot.
- [x] La búsqueda textual utiliza `LEFT JOIN` sobre el club para que atletas independientes (sin club) sigan apareciendo al buscarlos por nombre o apellido.
- [x] Las tarjetas del directorio muestran estatura y peso cuando están registrados en el perfil del atleta.
- [x] El botón `Reiniciar filtros` limpia todos los filtros activos (incluido texto, años, estatura y peso) y restablece la paginación a la página 0.
- [x] Pruebas unitarias/integración actualizadas y pasando en backend (`ScoutDirectoryIntegrationTest`) y frontend (`scout-directory.component.spec.ts`).

---

## 5. Casos Borde y Validaciones Críticas
- **Seguridad LOPNNA Art. 65:** El endpoint conserva `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")` y los filtros de visibilidad pública, verificación legal aprobada y suscripción activa.
- **Atletas sin club (`currentClub = null`):** `LEFT JOIN` evita descartar atletas independientes al buscar por texto.
- **Atletas sin biometría (`heightCm = null` / `weightKg = null`):** No son excluidos cuando no hay filtros de estatura/peso activos.
- **Migraciones Neon:** La migración `dbmate` no fue ejecutada contra Neon productivo.
