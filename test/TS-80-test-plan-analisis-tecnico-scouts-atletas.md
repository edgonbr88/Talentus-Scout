# Plan de Pruebas: [TS-80] Sección de Análisis Técnico de Scouts a Atletas

**ID Tarea:** TS-80  
**Tarjeta Trello:** [https://trello.com/c/Vj7GPVPN](https://trello.com/c/Vj7GPVPN)  
**Plan de Implementación:** [plans/TS-80-plan-analisis-tecnico-scouts-atletas.md](file:///home/edgar/Talentus%20Scout/plans/TS-80-plan-analisis-tecnico-scouts-atletas.md)  
**Sprint:** Sprint 4  
**Fecha:** 2026-11-20  
**Estado:** VALIDADO Y COMPLETADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

La entrega cubre el flujo completo de creación, lectura compartida entre scouts, edición propia y moderación/eliminación de análisis técnico-tácticos de scouts sobre atletas juveniles:

1. **Base de Datos (`talentus-scout-migrations` — dbmate / PostgreSQL 16 local):**
   - Migración `migrations/20261120100000_create_scout_technical_analyses.sql` aplicada exclusivamente en PostgreSQL local (`talentus_scout_dev`) creando `scout_technical_analyses` con `JSONB` para `strengths` e `improvement_areas`, `scouting_verdict TEXT`, constraint único `uq_scout_technical_analyses_athlete_scout (athlete_id, scout_id)` y checks DDL.
2. **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
   - Entidad `ScoutTechnicalAnalysis` con Lombok y UUID v7.
   - Excepción `DuplicateTechnicalAnalysisException` mapeada a `409 Conflict` en `GlobalExceptionHandler`.
   - Repositorios `ScoutTechnicalAnalysisRepository` y `ScoutProfileRepository.findByUserIdIn`.
   - DTOs `TechnicalAnalysisItemDto`, `UpsertScoutTechnicalAnalysisRequest` (validación por elemento `<@Valid TechnicalAnalysisItemDto>`), `ScoutTechnicalAnalysisResponse`.
   - Servicio `ScoutTechnicalAnalysisService` y Controlador REST `ScoutTechnicalAnalysisController` (`/api/v1/scout/athletes/{athleteId}/technical-analyses`).
   - Aislamiento estricto LOPNNA: `GET /api/v1/athletes/public/{slug}` permanece sin exposición de análisis técnicos.
3. **Frontend (`talentus-scout-fe` — Angular 18+ Standalone & SSR):**
   - Modelos en `core/models/scout-technical-analysis.model.ts` y métodos HTTP en `ScoutDirectoryService`.
   - Componente standalone `ScoutTechnicalAnalysesComponent` (plantilla `.html` y estilos `.css` separados, diálogo nativo `<dialog>` modal, `FormArray` dinámico para Fortalezas y Áreas de Mejora).
   - Integración condicional en navegador dentro de `BentoProfileComponent` (`/atleta/:slug`) únicamente para usuarios `ADMIN` o `SCOUT` en estado `APPROVED`, sin modificar `/scout/directory`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (JUnit 5 / Mockito / Spring Boot Test + PostgreSQL local)
Se ejecutó la suite completa del backend tras los últimos cambios:
```bash
cd talentus-scout-be && ./mvnw clean test
```

**Resultados observados:**
```text
[INFO] Running com.talentus.scout.web.controller.ScoutTechnicalAnalysisControllerIntegrationTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 4.682 s -- in com.talentus.scout.web.controller.ScoutTechnicalAnalysisControllerIntegrationTest
[INFO] Running com.talentus.scout.service.ScoutTechnicalAnalysisServiceTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.791 s -- in com.talentus.scout.service.ScoutTechnicalAnalysisServiceTest
...
[INFO] Results:
[INFO] Tests run: 332, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

**Cobertura específica de TS-80 en Backend:**
- `ScoutTechnicalAnalysisServiceTest` (5 pruebas unitarias):
  - Creación por scout aprobado con hidratación de `scoutRole` y `organizationName`.
  - Rechazo con `DuplicateTechnicalAnalysisException` (`409`) ante segundo análisis del mismo scout al mismo atleta.
  - Ordenamiento en `listByAthlete` priorizando el análisis propio del usuario autenticado y marcando `editableByCurrentUser = false` para análisis de colegas.
  - Bloqueo con `AccessDeniedException` (`403`) cuando otro scout intenta editar un análisis ajeno.
  - Eliminación habilitada para `ADMIN` por moderación sobre análisis de terceros.
- `ScoutTechnicalAnalysisControllerIntegrationTest` (4 pruebas de integración `@SpringBootTest` + `MockMvc` sobre PostgreSQL real):
  - Ciclo completo multi-scout: Scout A (de club distinto al atleta) crea análisis (`201`), segundo `POST` retorna `409 Conflict`, Scout B crea otro análisis (`201`), `GET` lista ambos priorizando el de Scout B, Scout B recibe `403` al intentar `PUT` o `DELETE` del de Scout A, Scout A edita el suyo (`200`), `ADMIN` recibe `403` en `PUT` ajeno pero logra `204` en `DELETE` de moderación.
  - Aislamiento LOPNNA: anónimo (`401`/`403`), `TUTOR` (`403`), `ATHLETE` (`403`) y `SCOUT PENDING` (`403`) bloqueados; `GET /api/v1/athletes/public/{slug}` responde `200` sin contener análisis ni campos asociados.
  - Validación de payload (`400 Bad Request`) con listas vacías, dictamen en blanco e ítems con título/descripción vacíos.
  - Eliminación exitosa del propio análisis por su autor (`204 No Content`).

### 2.2. Frontend (Angular Build SSR/Browser + Karma / Jasmine)
Se ejecutaron compilación y pruebas en Chrome Headless tras los últimos cambios:
```bash
cd talentus-scout-fe && npm run build && npx ng test --watch=false --browsers=ChromeHeadless
```
Y verificación focalizada de las suites impactadas:
```bash
npx ng test --watch=false --browsers=ChromeHeadless --include="**/bento-profile.component.spec.ts" --include="**/scout-technical-analyses.component.spec.ts"
```

**Resultados observados:**
- Compilación `npm run build` (bundles browser y server SSR): **Exitosa (`exit code 0`)**.
- Suite completa `ng test`: `Executed 224 of 224 SUCCESS` (`TOTAL: 224 SUCCESS`).
- Suites TS-80 (`bento-profile.component.spec.ts` + `scout-technical-analyses.component.spec.ts`): `Executed 18 of 18 SUCCESS`.

**Casos validados en Frontend:**
- Ocultamiento completo de `<app-scout-technical-analyses>` para usuarios anónimos, `TUTOR`, `ATHLETE` y `SCOUT` en estado `PENDING`.
- Renderizado de la sección para `SCOUT` aprobado (de cualquier club) y `ADMIN`.
- Estado vacío con acción `"Redactar mi análisis"`.
- Visualización diferenciada de evaluación propia (con `"Editar análisis"` y `"Eliminar"`) vs evaluaciones de otros scouts en solo lectura (o con `"Moderar / Eliminar"` para `ADMIN`).
- Creación y edición mediante `FormArray` dinámico (añadir/quitar fortalezas y áreas de mejora), manejo de `409 Conflict` y confirmación inline previa a eliminar.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Verificación vía API (`cURL`)

1. **Crear análisis como Scout Aprobado (201 Created):**
```bash
curl -i -X POST "http://localhost:8080/api/v1/scout/athletes/${ATHLETE_ID}/technical-analyses" \
  -H "Authorization: Bearer ${SCOUT_A_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "strengths": [
      {
        "title": "Élite técnica de su categoría",
        "description": "Primer control limpio, conducción fluida y precisión en pase corto."
      }
    ],
    "improvementAreas": [
      {
        "title": "Autoconfianza en duelos",
        "description": "Fortalecer la determinación al disputar balones divididos."
      }
    ],
    "scoutingVerdict": "Prospecto de altísima riqueza técnica e inteligencia táctica."
  }'
```
*Esperado:* `HTTP/1.1 201 Created` con `editableByCurrentUser: true`.

2. **Intentar duplicar análisis del mismo scout (409 Conflict):**
Repetir el `POST` anterior con `${SCOUT_A_TOKEN}` -> *Esperado:* `HTTP/1.1 409 Conflict`.

3. **Consultar análisis como otro Scout Aprobado (200 OK):**
```bash
curl -i "http://localhost:8080/api/v1/scout/athletes/${ATHLETE_ID}/technical-analyses" \
  -H "Authorization: Bearer ${SCOUT_B_TOKEN}"
```
*Esperado:* `HTTP/1.1 200 OK`, listando el análisis de Scout A con `editableByCurrentUser: false` y `deletableByCurrentUser: false`.

4. **Intentar editar o borrar análisis ajeno (403 Forbidden):**
```bash
curl -i -X PUT "http://localhost:8080/api/v1/scout/athletes/${ATHLETE_ID}/technical-analyses/${ANALYSIS_A_ID}" \
  -H "Authorization: Bearer ${SCOUT_B_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```
*Esperado:* `HTTP/1.1 403 Forbidden`.

5. **Validar aislamiento LOPNNA en endpoint público y rol Tutor (200 sin datos privados / 403):**
```bash
curl -s "http://localhost:8080/api/v1/athletes/public/${ATHLETE_SLUG}"
curl -i "http://localhost:8080/api/v1/scout/athletes/${ATHLETE_ID}/technical-analyses" \
  -H "Authorization: Bearer ${TUTOR_TOKEN}"
```
*Esperado:* El endpoint público no retorna análisis técnicos; el endpoint privado retorna `403 Forbidden` para `TUTOR`, `ATHLETE` y `SCOUT PENDING`.

### 3.2. Verificación Manual en UI (Angular)
1. Abrir `/atleta/:slug` sin iniciar sesión o logueado como `TUTOR` / `ATHLETE` / `SCOUT PENDING`: verificar que **no aparece** la sección **"Evaluación Técnica de Scouting"**.
2. Iniciar sesión como `SCOUT` aprobado (de cualquier club) y abrir `/atleta/:slug` desde `/scout/directory`:
   - Confirmar que aparece la tarjeta **"Evaluación Técnica de Scouting"** al pie de la ficha con etiqueta de confidencialidad.
   - Pulsar **"Redactar mi análisis"**, añadir múltiples fortalezas y áreas de mejora (`Título + Descripción`), redactar el **Dictamen de Scouting** y pulsar **"Guardar análisis"**.
   - Verificar que el bloque aparece destacado como **"Tu evaluación"** con botones **"Editar análisis"** y **"Eliminar"**, y los análisis de otros scouts se muestran únicamente en lectura.
   - Probar **"Editar análisis"** y confirmar actualización inmediata en pantalla.
   - Probar **"Eliminar"**, verificar la franja de confirmación (`Conservar` / `Confirmar eliminación`) y validar que vuelve a habilitarse **"Redactar mi análisis"**.
3. Iniciar sesión como `ADMIN`, abrir la misma ficha y validar que dispone de `"Moderar / Eliminar"` sobre análisis de cualquier scout, sin botón `"Editar análisis"` sobre informes ajenos.

---

## 4. Matriz de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia |
| :--- | :---: | :--- |
| **1. Migración dbmate local** (`scout_technical_analyses`, `UNIQUE(athlete_id, scout_id)`, `JSONB`) aplicada en PostgreSQL local sin tocar Neon. | **CUMPLIDO** | `20261120100000_create_scout_technical_analyses.sql` aplicada en `talentus_scout_dev` (`dbmate up`) y verificada con `\d scout_technical_analyses`. |
| **2. Compilación y suite backend al 100%** sin regresiones. | **CUMPLIDO** | `./mvnw clean test` ejecutado con `332/332` pruebas exitosas (`0` fallos, `0` omitidas). |
| **3. Compilación SSR/browser y pruebas frontend al 100%**. | **CUMPLIDO** | `npm run build` exitoso y `ng test` ejecutado con `224/224` pruebas exitosas (`18/18` en specs TS-80). |
| **4. Aislamiento LOPNNA estricto** en endpoint público, SSR y roles no autorizados. | **CUMPLIDO** | Verificado en `ScoutTechnicalAnalysisControllerIntegrationTest` y `bento-profile.component.spec.ts`. |
| **5. Reglas de autoría, unicidad y moderación** (`409` duplicado, `403` edición/borrado ajeno, `ADMIN` modera). | **CUMPLIDO** | Validado por constraint DDL, `ScoutTechnicalAnalysisServiceTest` y `ScoutTechnicalAnalysisControllerIntegrationTest`. |

---

## 5. Casos Borde y Validaciones Críticas

- **Unicidad concurrente y de negocio:** La regla de 1 análisis por scout y atleta está garantizada tanto en lógica de servicio (`409 Conflict` amigable) como a nivel de motor PostgreSQL (`uq_scout_technical_analyses_athlete_scout`).
- **Prevención de N+1 en lectura:** `findByAthleteIdWithScoutOrderByUpdatedAtDesc` carga el autor `User` vía `JOIN FETCH` y `findByUserIdIn` resuelve todos los `ScoutProfile` en una única consulta en lote.
- **Reactividad SSR y recarga directa de URL:** El chequeo `isPlatformBrowser` en `BentoProfileComponent` y `ScoutTechnicalAnalysesComponent` impide peticiones o renderizados privados durante el SSR público, mientras el `computed` + `effect` con `{ allowSignalWrites: true }` y `untracked(...)` carga los análisis automáticamente en navegador apenas `AuthService.currentUser()` termina de hidratarse.
