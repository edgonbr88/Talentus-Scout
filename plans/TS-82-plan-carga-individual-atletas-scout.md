# Plan de Implementación: [TS-82] Carga Individual de Atletas desde el Perfil de Scout

**ID Tarea:** TS-82  
**Tarjeta Trello:** https://trello.com/c/gUJAfgDP  
**Fecha:** 2026-11-23  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Los scouts y clubes habilitados para carga masiva (`bulkImportEnabled`) necesitan registrar un único jugador de forma inmediata tras una captación o prueba de campo sin preparar ni subir un archivo Excel/CSV o Google Sheet.
- **Valor para el usuario:** Reduce la fricción operativa en campo al ofrecer un formulario síncrono con los mismos 17 campos de la plantilla masiva, reutilizando el mismo flujo legal de asignación automática de club y notificación/activación del tutor.
- **Restricciones legales aplicables (LOPNNA Art. 65):** El registro individual ejecutado por el scout no activa automáticamente la verificación legal ni el consentimiento LOPNNA. El atleta se crea con `isPublic = true` y `legalVerificationStatus = LegalVerificationStatus.PENDING_REVIEW`, y se vincula o crea al tutor legal enviándole un correo con los enlaces `/auth/activar-tutor` y `/auth/rechazar-tutor` (token de 7 días).

---

## 2. Alcance Técnico y Arquitectura
- **Base de Datos (`talentus-scout-migrations`):** Sin cambios de esquema; reutiliza `athletes`, `users`, `clubs_organizations`, `scout_profiles` (`bulk_import_enabled`) y `tutor_activation_tokens`.
- **Backend (`talentus-scout-be`):**
  - Nuevo DTO de entrada `ScoutIndividualAthleteRequest` (Lombok + Jakarta Validation) con los 17 campos equivalentes a `BulkImportParser`.
  - Nuevo DTO de respuesta `ScoutIndividualAthleteResponse` (Lombok).
  - Nueva excepción `DuplicateAthleteDocumentException` (`409 Conflict` en `GlobalExceptionHandler`).
  - Refactorización en `BulkImportProcessor` para extraer un método compartido transaccional `registerSingleAthleteAndTutor(...)` reutilizado tanto por el procesamiento de lotes como por el registro individual síncrono.
  - Nuevo método `registerIndividualAthlete(...)` en `BulkImportService` con validación de autorización (`ADMIN` denegado, `bulkImportEnabled = true` requerido) y asignación automática del club desde `ScoutProfile.organizationName`.
  - Nuevo endpoint síncrono `POST /api/v1/scout/bulk-import/individual` en `BulkImportController` retornando `201 Created`.
- **Frontend (`talentus-scout-fe`):**
  - Nuevas interfaces `ScoutIndividualAthleteRequest` y `ScoutIndividualAthleteResponse` en `bulk-import.model.ts` y método `registerIndividualAthlete(...)` en `bulk-import.service.ts`.
  - Nueva pestaña **"Registro Individual"** (`activeTab === 'individual'`) en `ScoutBulkImportComponent` con soporte de query param `?tab=individual`, formulario reactivo (`ReactiveFormsModule`) agrupado en 3 bloques, club asignado en modo lectura, validaciones por campo y feedback inmediato de éxito/error.
  - Acceso directo `+ Carga Individual` en `ScoutDirectoryComponent` para usuarios con `authService.canAccessBulkImport()`, navegando a `/scout/bulk-import?tab=individual`.
- **Dependencias:** Ninguna.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No requiere migraciones DDL.

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Paquete base:** `com.talentus.scout`
- **Directiva de Modelado:** Usar Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).

### Clases a crear/modificar:
1. **`exception/DuplicateAthleteDocumentException.java`** (nueva)
   - Anotada con `@ResponseStatus(HttpStatus.CONFLICT)`.
2. **`web/exception/GlobalExceptionHandler.java`**
   - Agregar `@ExceptionHandler(DuplicateAthleteDocumentException.class)` retornando `409 Conflict` con `error: "CONFLICT"` y `message`.
3. **`web/dto/bulkimport/ScoutIndividualAthleteRequest.java`** (nueva)
   - Atleta:
     - `primerNombre` (`@NotBlank`)
     - `segundoNombre` (opcional)
     - `primerApellido` (`@NotBlank`)
     - `segundoApellido` (opcional)
     - `cedulaIdentidadAtleta` (opcional)
     - `fechaNacimiento` (`@NotNull`)
     - `genero` (`@NotBlank` o default `MALE` normalizable)
     - `posicionPrincipal` (`@NotBlank`)
     - `posicionSecundaria` (opcional)
     - `pieDominante` (opcional, normalizable)
     - `nacionalidad` (opcional, normalizable)
     - `alturaCm` (opcional, `@DecimalMin("90.0")`, `@DecimalMax("230.0")`)
     - `pesoKg` (opcional, `@DecimalMin("20.0")`, `@DecimalMax("150.0")`)
   - Tutor:
     - `nombreCompletoTutor` (`@NotBlank`)
     - `cedulaIdentidadTutor` (opcional)
     - `correoTutor` (`@NotBlank`, `@Email`)
     - `telefonoTutor` (opcional, `@Pattern(regexp = "^(\\+[1-9]\\d{7,14})?$")` si se provee)
4. **`web/dto/bulkimport/ScoutIndividualAthleteResponse.java`** (nueva)
   - `athleteId` (`UUID`), `slug` (`String`), `athleteFullName` (`String`), `clubName` (`String`), `tutorEmail` (`String`), `isNewTutor` (`boolean`), `legalVerificationStatus` (`String`).
5. **`service/bulkimport/BulkImportProcessor.java`**
   - Extraer método reutilizable `registerSingleAthlete(...)` (validación formativa `AthleteFieldNormalizer.validateBirthDateAndFormativeAge`, chequeo de duplicado `existsByIdentityDocumentNumberAndDeletedAtIsNull`, búsqueda/creación/reactivación de tutor, concatenación de `primerNombre` + `segundoNombre` y `primerApellido` + `segundoApellido`, creación de `Athlete` con `SlugService`, `isPublic = true`, `legalVerificationStatus = PENDING_REVIEW`) y envío de correo vía `emailService.sendTutorBulkImportInvite(...)` con `TutorActivationToken` (7 días).
6. **`service/bulkimport/BulkImportService.java`**
   - Extraer helper `validateScoutBulkAccess(UUID scoutUserId)` compartido por `startFileUploadJob`, `startGoogleSheetJob` y `registerIndividualAthlete`.
   - Implementar `@Transactional public ScoutIndividualAthleteResponse registerIndividualAthlete(UUID scoutUserId, ScoutIndividualAthleteRequest request)`:
     - Normalizar `genero`, `posicionPrincipal`, `posicionSecundaria`, `pieDominante`, `nacionalidad` con `AthleteFieldNormalizer`.
     - Resolver `ClubOrganization` desde `scoutProfile.getOrganizationName()`.
     - Invocar lógica compartida en `BulkImportProcessor` (lanzando `DuplicateAthleteDocumentException` si la cédula ya existe).
7. **`web/controller/BulkImportController.java`**
   - `POST /api/v1/scout/bulk-import/individual` (`consumes = MediaType.APPLICATION_JSON_VALUE`) con `@PreAuthorize("hasAnyRole('SCOUT', 'VERIFIER_ORG')")`, retornando `ResponseEntity.status(HttpStatus.CREATED).body(response)`.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)
- **Directiva de Diseño:** Seguir [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md) (`frontend-design`).
- **Separación Obligatoria de Plantillas:** Archivos `.component.ts`, `.component.html` y `.component.css` separados.

### Archivos a modificar:
1. **`src/app/core/models/bulk-import.model.ts`**
   - Agregar `ScoutIndividualAthleteRequest` y `ScoutIndividualAthleteResponse`.
2. **`src/app/core/services/bulk-import.service.ts`**
   - Agregar `registerIndividualAthlete(payload: ScoutIndividualAthleteRequest): Observable<ScoutIndividualAthleteResponse>`.
3. **`src/app/features/scout-bulk-import/scout-bulk-import.component.ts` / `.html` / `.css`**
   - Soporte de pestaña `'individual'` en `activeTab: 'file' | 'google' | 'individual'`.
   - Leer `ActivatedRoute.queryParamMap` (`?tab=individual`) en `ngOnInit()` para activar la pestaña correspondiente.
   - `ReactiveFormsModule` con `FormBuilder` para los 17 campos agrupados en 3 secciones:
     1. Identidad y Biotipo del Atleta
     2. Perfil Futbolístico
     3. Datos del Tutor Legal
   - Mostrar el club del scout (`authService.currentUser()?.organizationName`) en modo lectura informativo.
   - Feedback inmediato de éxito (con enlace a `/atleta/:slug` y botón "Registrar otro atleta") y manejo de errores (`400`/`409`).
4. **`src/app/features/scout-directory/scout-directory.component.html`**
   - Agregar enlace `+ Carga Individual` (`routerLink="/scout/bulk-import" [queryParams]="{ tab: 'individual' }"`) junto a `"Carga Masiva de Atletas"` cuando `authService.canAccessBulkImport()`.

---

## 6. Pruebas y Verificación
- **Backend (`BulkImportControllerIntegrationTest`):**
  - `POST /api/v1/scout/bulk-import/individual` exitoso (`201 Created`), verificando creación de atleta (`PENDING_REVIEW`, `isPublic = true`, club asignado desde `ScoutProfile`), creación de tutor, generación de `TutorActivationToken`.
  - Error `409 Conflict` por cédula duplicada.
  - Error `400 Bad Request` por edad fuera de rango formativo (4–21 años) o campos obligatorios faltantes.
  - Error `403 Forbidden` para `ADMIN` y para scout con `bulkImportEnabled = false`.
- **Frontend (`scout-bulk-import.component.spec.ts`, `scout-directory.component.spec.ts`):**
  - Activación de pestaña `individual` mediante `setTab('individual')` y query param `?tab=individual`.
  - Validaciones reactivas de campos obligatorios, rangos de estatura/peso y formato de correo.
  - Envío exitoso de `registerIndividualAthlete` con feedback de confirmación y reset para registrar otro atleta.
  - Manejo de errores HTTP (`409` / `400`).
  - Presencia del acceso directo `+ Carga Individual` en `ScoutDirectoryComponent`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear rama `feature/TS-82-carga-individual-atletas-scout` en `talentus-scout-be` y `talentus-scout-fe`.
- [x] Paso 2: Implementar `DuplicateAthleteDocumentException`, `GlobalExceptionHandler`, `ScoutIndividualAthleteRequest` y `ScoutIndividualAthleteResponse` en Backend.
- [x] Paso 3: Refactorizar lógica compartida en `BulkImportProcessor`, implementar `registerIndividualAthlete` en `BulkImportService` y endpoint en `BulkImportController`.
- [x] Paso 4: Agregar y ejecutar pruebas de integración en `BulkImportControllerIntegrationTest` (`./mvnw test`).
- [x] Paso 5: Actualizar `bulk-import.model.ts` y `bulk-import.service.ts` en Frontend.
- [x] Paso 6: Implementar pestaña "Registro Individual" con formulario reactivo en `ScoutBulkImportComponent` (`.ts`, `.html`, `.css`) y acceso directo en `ScoutDirectoryComponent`.
- [x] Paso 7: Actualizar y ejecutar pruebas unitarias en Frontend (`ng test`) y compilación (`npm run build`).
- [x] Paso 8: Documentar plan de pruebas en `test/TS-82-test-plan-carga-individual-atletas-scout.md`, marcar checkboxes en el plan, crear PRs en `talentus-scout-be` y `talentus-scout-fe`, commitear docs en `main` y mover tarjeta Trello a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Solo usuarios autorizados (`SCOUT` aprobado con `bulkImportEnabled = true`) acceden al formulario y endpoint (`403 Forbidden` para otros roles o scouts sin permiso).
- [x] Formulario individual contiene los 17 campos equivalentes a la plantilla masiva con validaciones reactivas claras.
- [x] Club del atleta asignado automáticamente desde `ScoutProfile.organizationName` y mostrado como referencia informativa.
- [x] Endpoint síncrono responde `201 Created` o `400`/`409` ante validaciones o cédula duplicada.
- [x] Tutor creado/vinculado, `TutorActivationToken` generado, correo enviado y atleta en `PENDING_REVIEW` (LOPNNA).
- [x] Acceso directo disponible en `/scout/bulk-import?tab=individual` y desde `/scout/directory`.
- [x] Pruebas automatizadas y compilación en verde en Backend y Frontend.
