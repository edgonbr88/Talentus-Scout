# Plan de Pruebas y Validación: [TS-70] Carga masiva de atletas y tutores por parte de scouts/academias/clubes

## 1. Alcance de las Pruebas
Este documento valida la implementación de la funcionalidad de **Carga Masiva de Atletas y Tutores** solicitada para los perfiles de Scouts en representación de clubes, academias u organizaciones deportivas.

* **Entidades y Componentes Impactados:**
  * Base de datos: Tablas `bulk_import_jobs`, `tutor_activation_tokens` y soporte de borrado lógico (`deleted_at`) en `athletes` y `users`.
  * Backend:
    * `BulkImportParser` (Procesamiento de `.xlsx`, `.csv` y matrices de Google Sheets con esquema estricto de 17 columnas).
    * `GoogleSheetsService` (Consumo de Google Sheets API v4 mediante Service Account).
    * `BulkImportProcessor` (Procesador asíncrono `@Async`, detección y omisión de duplicados por cédula/DNI, reasociación múltiple de atletas a tutores existentes o nuevos, generación de tokens transaccionales de activación).
    * `BulkImportService` y `TutorActivationService`.
    * Endpoints REST: `/api/v1/scout/bulk-import/upload`, `/api/v1/scout/bulk-import/google-sheet`, `/api/v1/scout/bulk-import/jobs/{jobId}`, `/api/v1/scout/bulk-import/template`, `/api/v1/scout/bulk-import/jobs/{jobId}/report`, `/api/v1/auth/tutor/activate`, `/api/v1/auth/tutor/reject`.
  * Frontend:
    * `ScoutBulkImportComponent` (`scout-bulk-import.component.ts` / `.html`): Diseño Bento Grid, drag & drop de archivos, selector dual (Archivo / Google Sheet), barra de avance reactiva con polling y descarga de informes de advertencias.
    * `TutorActivationComponent` (`tutor-activation.component.ts` / `.html`): Pantalla pública para establecer contraseña de tutor o rechazar registro con borrado lógico.
    * Rutas protegidas `/scout/bulk-import` y públicas `/auth/activar-tutor` / `/auth/rechazar-tutor`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / Mockito)
Se implementaron y ejecutaron las pruebas unitarias:
1. `BulkImportParserTest`:
   * `testParseCsvSuccess`: Valida el parseo exacto de las 17 columnas, normalización de pie dominante (`LEFT`/`RIGHT`), fechas ISO/latinas y mapeo a DTOs.
   * `testMissingRequiredHeadersThrowsException`: Comprueba que si faltan encabezados obligatorios, se lance `IllegalArgumentException` descriptivo antes de procesar registros.
2. `BulkImportProcessorTest`:
   * `testProcessImportJobSuccessWithDuplicatesOmitted`: Valida el flujo asíncrono, omisión de filas duplicadas por cédula, persistencia de atletas no duplicados, creación de tokens de activación de 7 días y despacho de correo al tutor con los nombres de sus representados.

**Comando de ejecución:**
```bash
./mvnw test -Dtest=BulkImportParserTest,BulkImportProcessorTest
```
**Resultado:**
```text
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### 2.2. Frontend (Angular 18+)
Compilación exitosa en modo producción validando tipos, standalone components y templates separados:
```bash
npm run build
```
**Resultado:**
```text
Application bundle generation complete. [33.557 seconds]
Prerendered 19 static routes.
Output location: /home/edgar/Talentus Scout/talentus-scout-fe/dist/talentus-scout-fe
```

---

## 3. Guía de Verificación Manual Paso a Paso (cURL)

### 3.1. Descarga de Plantilla Oficial
```bash
curl -X GET "http://localhost:8080/api/v1/scout/bulk-import/template?format=xlsx" \
  -H "Authorization: Bearer $SCOUT_JWT" \
  -o plantilla_atletas.xlsx
```
*Respuesta esperada:* Archivo binario Excel con las 17 columnas oficiales y fila de ejemplo.

### 3.2. Subida de Archivo para Carga Masiva
```bash
curl -X POST "http://localhost:8080/api/v1/scout/bulk-import/upload" \
  -H "Authorization: Bearer $SCOUT_JWT" \
  -F "file=@plantilla_atletas.xlsx"
```
*Respuesta esperada:* `202 Accepted`
```json
{
  "id": "uuid-job-id",
  "organizationName": "Caracas FC",
  "sourceType": "FILE_EXCEL",
  "status": "PENDING",
  "totalRows": 1,
  "processedRows": 0,
  "successfulRows": 0,
  "failedRows": 0
}
```

### 3.3. Consulta de Progreso del Trabajo
```bash
curl -X GET "http://localhost:8080/api/v1/scout/bulk-import/jobs/uuid-job-id" \
  -H "Authorization: Bearer $SCOUT_JWT"
```
*Respuesta esperada:* `200 OK` con `status: "COMPLETED"`, `successfulRows: 1`, `failedRows: 0`.

### 3.4. Activación de Cuenta de Tutor
```bash
curl -X POST "http://localhost:8080/api/v1/auth/tutor/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-hash-uuid",
    "password": "Password123!"
  }'
```
*Respuesta esperada:* `200 OK`
```json
{
  "message": "Cuenta activada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
}
```

### 3.5. Rechazo de Registro y Borrado Lógico
```bash
curl -X POST "http://localhost:8080/api/v1/auth/tutor/reject" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token-hash-uuid",
    "reason": "No reconozco esta inscripción"
  }'
```
*Respuesta esperada:* `200 OK` (se aplica `deleted_at` al atleta y al tutor).

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia |
|---|---|---|
| Descarga de plantilla oficial en `.xlsx` o `.csv` con 17 columnas | Cumplido | Implementado en `BulkImportService.downloadTemplate()` y botones en UI. |
| Validación de encabezados obligatorios | Cumplido | `BulkImportParser.validateHeaders()` lanza error ante cabeceras faltantes. |
| Carga dual: archivo local o Google Sheets | Cumplido | Endpoints `/upload` y `/google-sheet` operativos. |
| Procesamiento asíncrono sin timeouts HTTP | Cumplido | Ejecución con `@Async` y retorno de `202 Accepted` inmediato con `jobId`. |
| Omisión de duplicados y registro en reporte | Cumplido | `BulkImportProcessor` detecta cédulas existentes, omite la fila y registra en `warnings`. |
| Agrupación de múltiples atletas para un mismo tutor | Cumplido | Mapeo y reutilización de `User` (Tutor) por correo electrónico. |
| Notificación por email con token único | Cumplido | `EmailService.sendTutorBulkImportInvite()` envía links de activación y rechazo. |
| Pantalla de activación y rechazo (borrado lógico) | Cumplido | `TutorActivationComponent` con modal de rechazo y endpoint seguro. |
| Pruebas automatizadas y compilación exitosa | Cumplido | Tests JUnit 5 passing y Angular Build exitoso. |
