# Plan de Pruebas: [TS-82] Carga Individual de Atletas desde el Perfil de Scout

**ID Tarea:** TS-82  
**Tarjeta Trello:** https://trello.com/c/gUJAfgDP  
**Fecha:** 2026-11-23  
**Plan de Implementación:** [TS-82-plan-carga-individual-atletas-scout.md](file:///home/edgar/Talentus%20Scout/plans/TS-82-plan-carga-individual-atletas-scout.md)

---

## 1. Alcance de Pruebas
- **Backend (`talentus-scout-be`):**
  - `DuplicateAthleteDocumentException` y `GlobalExceptionHandler` (`409 Conflict`).
  - `ScoutIndividualAthleteRequest` y `ScoutIndividualAthleteResponse`.
  - `BulkImportProcessor.registerIndividualAthlete(...)` (lógica compartida con carga masiva).
  - `BulkImportService.registerIndividualAthlete(...)` y `validateAndResolveScoutContext(...)`.
  - `BulkImportController` (`POST /api/v1/scout/bulk-import/individual`).
- **Frontend (`talentus-scout-fe`):**
  - `bulk-import.model.ts` y `bulk-import.service.ts`.
  - `ScoutBulkImportComponent` (`.ts`, `.html`, `.css`): pestaña `"Registro Individual"`, `?tab=individual`, formulario reactivo de 17 campos, club en modo lectura, manejo de éxito y error.
  - `ScoutDirectoryComponent` (`.html`): acceso directo `+ Carga Individual`.

---

## 2. Pruebas Automatizadas Ejecutadas
### Backend
- **Comando:**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=BulkImportControllerIntegrationTest,BulkImportProcessorTest,BulkImportParserTest,BulkImportServiceTemplateTest
  ```
- **Resultado:** `Tests run: 18, Failures: 0, Errors: 0, Skipped: 0` (**PASS**)
  - `BulkImportControllerIntegrationTest` (5 tests):
    - `shouldRegisterIndividualAthleteSuccessfullyAndRejectDuplicateDocument`: `201 Created`, atleta en `PENDING_REVIEW`, `isPublic = true`, club asignado desde `ScoutProfile`, `TutorActivationToken` creado, y `409 Conflict` ante cédula duplicada.
    - `shouldReturnBadRequestWhenIndividualAthleteAgeIsOutOfFormativeRange`: `400 Bad Request` para edad fuera de 4–21 años.
    - `shouldForbidIndividualRegistrationWhenScoutHasBulkImportDisabled`: `403 Forbidden` para scout con `bulkImportEnabled = false`.
    - `adminUserShouldBeForbiddenFromBulkImportOperations`: incluye `403 Forbidden` para `ADMIN` en `POST /individual`.
  - `BulkImportProcessorTest` (3 tests), `BulkImportServiceTemplateTest` (2 tests), `BulkImportParserTest` (8 tests).

### Frontend
- **Comando:**
  ```bash
  cd talentus-scout-fe && npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/features/scout-bulk-import/scout-bulk-import.component.spec.ts" --include="src/app/features/scout-directory/scout-directory.component.spec.ts"
  ```
- **Resultado:** `TOTAL: 31 SUCCESS` (**PASS** — 13 tests en `scout-bulk-import.component.spec.ts` + 18 tests en `scout-directory.component.spec.ts`).

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Verificación API REST (`cURL`)
1. **Registro individual exitoso (`201 Created`):**
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/scout/bulk-import/individual \
     -H "Authorization: Bearer <SCOUT_BULK_ENABLED_JWT>" \
     -H "Content-Type: application/json" \
     -d '{
       "primerNombre": "Mateo",
       "segundoNombre": "José",
       "primerApellido": "Ramírez",
       "segundoApellido": "Díaz",
       "cedulaIdentidadAtleta": "V-31234567",
       "fechaNacimiento": "2011-04-18",
       "genero": "Masculino",
       "posicionPrincipal": "Delantero Centro",
       "posicionSecundaria": "Extremo Izquierdo",
       "pieDominante": "Izquierdo",
       "nacionalidad": "Venezuela",
       "alturaCm": 168.5,
       "pesoKg": 58.0,
       "nombreCompletoTutor": "José Ramírez",
       "cedulaIdentidadTutor": "V-12345678",
       "correoTutor": "tutor.mateo@ejemplo.com",
       "telefonoTutor": "+584121234567"
     }'
   ```
   - **Esperado:** `201 Created` con `legalVerificationStatus: "PENDING_REVIEW"` y `clubName` del scout.

2. **Cédula duplicada (`409 Conflict`):**
   - Reenviar el mismo payload -> `409 Conflict` con `error: "CONFLICT"`.

3. **Sin permiso (`403 Forbidden`):**
   - Enviar con token `ADMIN` o scout con `bulkImportEnabled = false` -> `403 Forbidden`.

### 3.2. Verificación UI en Angular
1. En `/directorio-scouts`, con un scout habilitado (`canAccessBulkImport() === true`), hacer clic en **+ Carga Individual**.
2. Confirmar que navega a `/scout/bulk-import?tab=individual` y abre la pestaña **Registro Individual**.
3. Verificar que el club asignado se muestra en modo lectura.
4. Completar el formulario y enviar: validar confirmación con estado `PENDING_REVIEW`, enlace a la ficha pública y botón **Registrar otro atleta**.

---

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] Solo usuarios autorizados (`SCOUT` aprobado con `bulkImportEnabled = true`) acceden al formulario y endpoint (`403 Forbidden` para otros roles o scouts sin permiso).
- [x] Formulario individual contiene los 17 campos equivalentes a la plantilla masiva con validaciones reactivas claras.
- [x] Club del atleta asignado automáticamente desde el perfil del scout y mostrado como referencia informativa.
- [x] Envío síncrono responde `201 Created` o `400`/`409` ante errores de validación, edad fuera de rango o cédula duplicada.
- [x] Tutor creado/vinculado, `TutorActivationToken` generado, invitación enviada por correo y atleta en `PENDING_REVIEW` (LOPNNA).
- [x] Acceso directo desde `/scout/bulk-import?tab=individual` y desde `/scout/directory`.
- [x] Pruebas automatizadas en verde.

---

## 5. Casos Borde y Validaciones Críticas
- **LOPNNA Art. 65:** El scout nunca aprueba la verificación legal ni el consentimiento del tutor; el atleta queda en `PENDING_REVIEW` hasta que el tutor active su cuenta.
- **Reutilización sin duplicación:** `BulkImportProcessor.registerIndividualAthlete` comparte `resolveOrCreateTutor`, `createActivationToken`, `createAndSaveAthlete` y `sendTutorInviteEmail` con el procesador de carga masiva.
