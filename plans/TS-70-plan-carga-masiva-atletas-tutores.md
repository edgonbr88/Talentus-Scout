# Plan de Implementación: [TS-70] Carga masiva de atletas y tutores por parte de scouts/academias/clubes

## 1. Identificación
* **ID:** `TS-70`
* **Título:** Carga masiva de atletas y tutores por parte de scouts/academias/clubes
* **Trello URL:** https://trello.com/c/nOLxlNNl
* **Sprint / Fase:** MVP — Adquisición & Onboarding B2B / Clubes
* **Estado:** `in development`

---

## 2. Resumen y Contexto de Negocio
Permite a scouts acreditados que actúan en representación de clubes, academias o federaciones deportivas realizar la carga masiva y unificada de deportistas juveniles junto con los datos de sus respectivos tutores legales.

* **Modalidad de Entrada Dual:**
  1. Subida directa de archivo tabular local (`.xlsx` o `.csv`) de hasta 1000 filas.
  2. Sincronización asíncrona mediante Google Sheets compartido con la Service Account corporativa de Talentus Scout.
* **Política LOPNNA y FIFA (Protección al Menor):**
  * Los atletas cargados por esta vía quedan pre-verificados por el respaldo de la entidad deportiva, no sufriendo bloqueo de visualización interno para el club.
  * Se notifica de inmediato al tutor legal mediante correo electrónico transaccional con un enlace provisto de un token de activación seguro único (`tutor_activation_tokens`) para que ingrese, cree su contraseña o vincule Google Auth, y complete la carga de cédula física, consentimientos de patria potestad y material multimedia.
  * Se otorga al tutor la facultad expresa de rechazar el registro, lo cual ejecuta un borrado lógico (`deleted_at`) inmediato del atleta (y de la cuenta del tutor si no mantiene más deportistas activos en la plataforma).
* **Manejo de Excepciones y Familias:**
  * Si se detectan atletas ya registrados previamente (por cédula o correo), la fila se omite sin interrumpir el resto de la importación y se registra como advertencia en el informe final.
  * Si un mismo tutor figura con varios hijos/representados en la plantilla, se crea un único registro de usuario tutor y se le asocian todos los perfiles de atleta.

---

## 3. Arquitectura y Modelo de Datos

### 3.1. Migración DDL (`talentus-scout-migrations/migrations/YYYYMMDDHHMMSS_create_bulk_import_and_tutor_activation.sql`)
> **Nota de Seguridad:** Se ejecutará exclusivamente contra PostgreSQL local conforme a las directivas del proyecto (prohibido ejecutar contra Neon directamente).

```sql
-- migrate:up
CREATE TYPE bulk_import_source_type AS ENUM ('FILE_EXCEL', 'FILE_CSV', 'GOOGLE_SHEET');
CREATE TYPE bulk_import_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE bulk_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id UUID REFERENCES clubs_organizations(id) ON DELETE SET NULL,
    organization_name VARCHAR(150) NOT NULL,
    source_type bulk_import_source_type NOT NULL,
    file_name VARCHAR(255),
    sheet_id VARCHAR(255),
    status bulk_import_status NOT NULL DEFAULT 'PENDING',
    total_rows INT NOT NULL DEFAULT 0,
    processed_rows INT NOT NULL DEFAULT 0,
    successful_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    error_summary TEXT,
    error_report_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bulk_import_jobs_scout ON bulk_import_jobs(scout_id);
CREATE INDEX idx_bulk_import_jobs_status ON bulk_import_jobs(status);

CREATE TABLE tutor_activation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tutor_activation_tokens_hash ON tutor_activation_tokens(token_hash);

-- Soft delete audit fields en athletes si no existen
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- migrate:down
DROP TABLE IF EXISTS tutor_activation_tokens;
DROP TABLE IF EXISTS bulk_import_jobs;
DROP TYPE IF EXISTS bulk_import_status;
DROP TYPE IF EXISTS bulk_import_source_type;
```

---

## 4. Estructura Exacta de Columnas (Plantilla de 17 Columnas)

| # | Header en Plantilla | Obligatorio | Formato / Validación | Destino Modelo |
|---|---|---|---|---|
| 1 | `primer_nombre` | Sí | Texto (hasta 100 car.) | `athletes.first_name` |
| 2 | `segundo_nombre` | No | Texto (hasta 100 car.) | `athletes` (o concatenado) |
| 3 | `primer_apellido` | Sí | Texto (hasta 100 car.) | `athletes.last_name` |
| 4 | `segundo_apellido` | No | Texto (hasta 100 car.) | `athletes` |
| 5 | `cedula_identidad_atleta` | No | Alfanumérico | `athletes` / documento |
| 6 | `fecha_nacimiento` | Sí | `YYYY-MM-DD` o `DD/MM/YYYY` | `athletes.birth_date` |
| 7 | `genero` | Sí | `MALE` / `FEMALE` | `athletes.gender` |
| 8 | `posicion_principal` | Sí | Catálogo de posiciones de fútbol | `athletes.primary_position` |
| 9 | `posicion_secundaria` | No | Catálogo de posiciones | `athletes.secondary_position` |
| 10 | `pie_dominante` | Sí | `LEFT`, `RIGHT`, `AMBIDEXTROUS` | `athletes.preferred_foot` |
| 11 | `nacionalidad` | No | Texto (default: `Venezolana`) | `athletes.nationality` |
| 12 | `altura_cm` | No | Numérico decimal | `athletes.height_cm` |
| 13 | `peso_kg` | No | Numérico decimal | `athletes.weight_kg` |
| 14 | `nombre_completo_tutor` | Sí | Texto (hasta 150 car.) | `users.full_name` (Tutor) |
| 15 | `cedula_identidad_tutor` | Sí | Alfanumérico | Tutor document |
| 16 | `correo_tutor` | Sí | Formato email RFC 5322 | `users.email` (Tutor) |
| 17 | `telefono_tutor` | Sí | Formato telefónico internacional | `users.phone_number` (Tutor) |

---

## 5. Especificación Backend (Spring Boot 3 / Java 21)

### 5.1. Librerías Requeridas en `pom.xml`
* `org.apache.poi:poi-ooxml:5.3.0` (Lectura y streaming de archivos Excel `.xlsx`).
* `org.apache.commons:commons-csv:1.11.0` (Procesamiento de CSV de alto desempeño).
* `com.google.api-client:google-api-client:2.7.0` y `com.google.apis:google-api-services-sheets:v4-rev20220927-2.0.0` (Lectura de Google Sheets vía Service Account).

### 5.2. Paquetes y Clases a Implementar
* **Domain / Entities (`com.talentus.scout.domain`):**
  * `BulkImportJob.java`: `@Entity`, `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`.
  * `TutorActivationToken.java`: `@Entity`, `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
  * `BulkImportSourceType.java`, `BulkImportStatus.java`.
* **DTOs (`com.talentus.scout.web.dto.bulkimport`):**
  * `BulkImportJobResponseDto.java`: ID del trabajo, estado, total, exitosos, fallidos, resumen de advertencias.
  * `BulkImportProgressDto.java`: Progreso porcentual y contadores para WebSocket/Polling.
  * `GoogleSheetImportRequestDto.java`: `@NotBlank String sheetUrlOrId`.
  * `TutorActivationRequestDto.java`: `@NotBlank String token`, `@Size(min=8) String password`.
  * `TutorRejectionRequestDto.java`: `@NotBlank String token`, `String reason`.
  * `BulkImportRowErrorDto.java`: Número de fila, campo afectado, mensaje de advertencia/error.
* **Repositories (`com.talentus.scout.repository`):**
  * `BulkImportJobRepository.java`: `List<BulkImportJob> findByScoutIdOrderByCreatedAtDesc(UUID scoutId)`.
  * `TutorActivationTokenRepository.java`: `Optional<TutorActivationToken> findByTokenHash(String tokenHash)`.
* **Services (`com.talentus.scout.service`):**
  * `BulkImportService.java` e `impl/BulkImportServiceImpl.java`:
    * `BulkImportJobResponseDto startFileUploadJob(UUID scoutId, MultipartFile file);`
    * `BulkImportJobResponseDto startGoogleSheetJob(UUID scoutId, String sheetUrl);`
    * `BulkImportJobResponseDto getJobStatus(UUID jobId, UUID scoutId);`
    * `byte[] downloadTemplate(String format);`
  * `BulkImportProcessor.java` (`@Async("taskExecutor")`):
    * Orquesta la lectura de filas, validación con `Validator`, resolución de duplicados, creación/vinculación de tutores y atletas.
    * Actualiza contadores en `BulkImportJob` y emite eventos WebSocket (`SimpMessagingTemplate.convertAndSend("/topic/bulk-import/" + jobId, progress)`).
  * `GoogleSheetsService.java`: Conexión mediante Service Account Json y descarga de filas de la primera pestaña.
  * `TutorOnboardingNotificationService.java`: Envío de email con token transaccional de activación y link de rechazo.
* **Controllers (`com.talentus.scout.web.controller`):**
  * `BulkImportController.java` (`/api/v1/scout/bulk-import`):
    * `POST /upload` (`@RequestParam("file") MultipartFile file`): Inicia job asíncrono.
    * `POST /google-sheet` (`@Valid @RequestBody GoogleSheetImportRequestDto dto`): Inicia job asíncrono.
    * `GET /jobs/{jobId}`: Estado actual del proceso.
    * `GET /jobs/{jobId}/report`: Descarga de informe de advertencias/errores en CSV o JSON.
    * `GET /template`: Descarga del archivo plantilla oficial con los 17 headers.
  * `TutorActivationController.java` (`/api/v1/auth/tutor`):
    * `POST /activate`: Valida token y asigna contraseña al tutor.
    * `POST /reject`: Aplica borrado lógico en cascada al registro.

---

## 6. Especificación Frontend (Angular 18+)

### 6.1. Componentes Standalone (`src/app/features/scout-bulk-import/`)
> **Directivas de Estilo:** Se aplican estrictamente las directrices de `fe-desing.md` (Bento Grid, acentos deportivos intencionales, sin templates genéricos) y **separación obligatoria de plantillas** (`.component.ts` y `.component.html` separados).

* `BulkImportDashboardComponent` (`bulk-import-dashboard.component.ts` / `.html`):
  * Vista Bento Grid en el portal Scout:
    * Card 1: Descarga de plantilla oficial (.xlsx / .csv) con instrucciones claras.
    * Card 2: Selector dual (Pestaña "Subir Archivo Local" con drag & drop vs "Google Sheet").
    * Card 3: Historial reciente de cargas y estado de procesamiento.
* `BulkImportProgressModalComponent` (`bulk-import-progress-modal.component.ts` / `.html`):
  * Monitor de progreso asíncrono en tiempo real (vía WebSocket STOMP o fallback de polling cada 2s).
  * Barras de avance reactivas, contador de filas procesadas, exitosas y omitidas.
  * Resumen final con botón para descargar informe de filas omitidas/duplicadas.
* `TutorActivationComponent` (`src/app/features/auth/tutor-activation/tutor-activation.component.ts` / `.html`):
  * Pantalla pública accesible mediante `/auth/activar-tutor?token=...`.
  * Permite establecer contraseña, confirmar consentimiento o rechazar el registro formalmente.

### 6.2. Servicios HTTP & Estado
* `BulkImportService` (`src/app/core/services/bulk-import.service.ts`):
  * `uploadFile(file: File): Observable<BulkImportJobResponse>`
  * `importGoogleSheet(url: string): Observable<BulkImportJobResponse>`
  * `getJobStatus(jobId: string): Observable<BulkImportJobResponse>`
  * `downloadTemplate(type: 'xlsx' | 'csv'): Observable<Blob>`
  * `downloadErrorReport(jobId: string): Observable<Blob>`

---

## 7. Plan de Pruebas y Validación

### 7.1. Pruebas Automatizadas
* **Backend:**
  * `BulkImportParserTest`: Parseo correcto de `.xlsx` y `.csv` con casos de filas vacías y tipos de datos incorrectos.
  * `BulkImportServiceAsyncTest`: Verificación de que peticiones extensas devuelven `202 Accepted` de inmediato con `jobId`.
  * `DuplicateHandlingTest`: Comprobación de que atletas con cédulas preexistentes se omiten sin interrumpir el resto.
  * `TutorAssociationTest`: Comprobación de que múltiples atletas con el mismo correo de tutor se asignan al mismo usuario `TUTOR`.
  * `TutorActivationAndRejectionTest`: Comprobación de soft-delete en rechazo y activación correcta de credenciales.
* **Frontend:**
  * Pruebas de componente para selección de archivos, validación de extensión y visualización de progreso.

### 7.2. Validación Manual con cURL
```bash
# 1. Descarga de plantilla
curl -X GET "http://localhost:8080/api/v1/scout/bulk-import/template?format=xlsx" -H "Authorization: Bearer $SCOUT_TOKEN" -o plantilla_scout.xlsx

# 2. Carga masiva asíncrona de archivo
curl -X POST "http://localhost:8080/api/v1/scout/bulk-import/upload" \
  -H "Authorization: Bearer $SCOUT_TOKEN" \
  -F "file=@plantilla_scout.xlsx"

# 3. Consulta de progreso de Job
curl -X GET "http://localhost:8080/api/v1/scout/bulk-import/jobs/$JOB_ID" \
  -H "Authorization: Bearer $SCOUT_TOKEN"

# 4. Activación de tutor vía token
curl -X POST "http://localhost:8080/api/v1/auth/tutor/activate" \
  -H "Content-Type: application/json" \
  -d '{"token": "sample-token-uuid", "password": "Password123!"}'
```

---

## 8. Checklist de Implementación Paso a Paso (Para el Agente Implementador)

- [ ] **Fase 1: Base de Datos**
  - [ ] Crear migración DDL en `talentus-scout-migrations/migrations/` con las tablas `bulk_import_jobs`, `tutor_activation_tokens` y campos de borrado lógico.
  - [ ] Aplicar migración exclusivamente en PostgreSQL local (`dbmate up`) y verificar integridad referencial.
- [ ] **Fase 2: Backend — Dependencias y Modelos**
  - [ ] Agregar dependencias de Apache POI, Commons CSV y Google Sheets API en `pom.xml`.
  - [ ] Implementar entidades JPA con Lombok (`@Builder`, `@Getter`, `@Setter`, constructores estándar).
  - [ ] Crear repositorios Spring Data JPA.
- [ ] **Fase 3: Backend — Lógica de Importación y Procesamiento Asíncrono**
  - [ ] Implementar `ExcelCsvParser` para lectura y validación estricta de las 17 columnas.
  - [ ] Implementar servicio de conexión con Google Sheets API mediante Service Account.
  - [ ] Crear `BulkImportProcessor` asíncrono con control de duplicados, transacciones atómicas por fila y manejo de errores.
  - [ ] Configurar soporte de eventos WebSockets / endpoint de consulta para el progreso de la carga.
- [ ] **Fase 4: Backend — Flujo de Activación y Rechazo de Tutores**
  - [ ] Implementar generación de token único y plantilla de correo de bienvenida.
  - [ ] Implementar endpoints públicos para activación de contraseña y rechazo (borrado lógico).
- [ ] **Fase 5: Frontend (Angular 18+)**
  - [ ] Crear componentes Standalone con plantillas HTML separadas (`.component.html`) y diseño Bento Grid.
  - [ ] Desarrollar servicio Angular para interactuar con los endpoints de carga y reporte.
  - [ ] Integrar barra reactiva de progreso y modal de resumen de importación.
  - [ ] Crear vista pública de activación/rechazo para el tutor.
- [ ] **Fase 6: Pruebas y Documentación**
  - [ ] Ejecutar suites de pruebas backend (`./mvnw test`) y frontend (`npm test`).
  - [ ] Redactar plan de pruebas en `test/TS-70-test-plan-carga-masiva-atletas.md`.
  - [ ] Crear rama `feature/TS-70-carga-masiva-atletas`, subir cambios y abrir Pull Request en GitHub.
  - [ ] Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 9. Criterios de Aceptación (DoD)
* [ ] La plantilla oficial `.xlsx` / `.csv` contiene las 17 columnas oficiales acordadas.
* [ ] La subida de archivos extensos devuelve un `jobId` inmediato y procesa asíncronamente sin provocar timeouts HTTP.
* [ ] El usuario recibe retroalimentación en tiempo real del progreso de la carga.
* [ ] Los registros duplicados por cédula o correo se omiten limpiamente y quedan documentados en el informe final descargable.
* [ ] Los tutores con múltiples hijos reciben una sola cuenta con todos sus representados asociados.
* [ ] El tutor recibe un correo con su token de activación y enlace para aceptar o rechazar el registro.
* [ ] El rechazo del tutor desencadena el borrado lógico del atleta.
* [ ] Todos los tests automatizados pasan satisfactoriamente.
* [ ] Documento `test/TS-70-test-plan-carga-masiva-atletas.md` generado y Pull Request abierto en GitHub.
