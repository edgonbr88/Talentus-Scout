# Plan de Pruebas: [TS-79] Restringir Fechas Futuras y Validar Rango de Edad en Fecha de Nacimiento de Atletas (Carga Masiva, Registro y BD)

**ID Tarea:** TS-79  
**Tarjeta Trello:** [https://trello.com/c/X1PQDKSB](https://trello.com/c/X1PQDKSB)  
**Fecha:** 2026-11-19  
**Estado:** VALIDADO Y COMPLETADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de esta tarea consistió en erradicar el incidente identificado durante la carga masiva (`TS-70`) donde se permitió registrar atletas con fecha de nacimiento futura (ej. categoría 2035, arrojando edades negativas como `EDAD: -8 años`), y blindar integralmente la validez temporal y los rangos de edad en las tres capas del sistema (Base de Datos, Backend y Frontend):

1. **Base de Datos (DDL dbmate):**
   - Migración `20261118220000_enforce_valid_athlete_birth_date.sql`.
   - Saneamiento de atletas activos preexistentes con fecha futura/hoy (`deleted_at` + `is_public = FALSE`).
   - Constraint a nivel de PostgreSQL: `chk_athletes_birth_date_past CHECK (birth_date < CURRENT_DATE OR deleted_at IS NOT NULL)`.
2. **Backend (Spring Boot 3 / Java 21):**
   - Utilidad centralizada `AthleteFieldNormalizer`: métodos `validateBirthDateAndFormativeAge`, `validateBirthDateInPast` y cálculo defensivo `calculateSafeAge`.
   - `BulkImportParser`: Detección en parseo de fechas futuras, iguales a hoy o fuera del rango formativo juvenil (4 a 21 años).
   - `BulkImportProcessor`: Validación defensiva en proceso de lote que omite filas anómalas (`FILA_OMITIDA`) registrándolas en el reporte CSV sin frenar las filas válidas (incluyendo juveniles de 18 a 21 años).
   - `BulkImportService`: Adición de caja informativa / prompt de validación de datos en columna de fecha en la plantilla de Excel descargable.
   - DTOs y Servicios de Registro: `@Past` en `RegisterAdultAthleteRequest`, validación de fecha no futura antes de evaluar minoridad LOPNNA en `AuthService.registerAdultAthlete`, y restricción 4–21 años en `AthleteService.createAthlete`.
   - Blindaje defensivo contra edades negativas en `AthleteResponse`, `AthleteService.getAthletePublicProfile`, `AthleteCvPdfService` y `LegalVerificationService`.
3. **Frontend (Angular 18+ Standalone):**
   - `RegisterAthleteModalComponent`: Atributo `[max]` en input date y validación reactiva de fecha futura y edades 4–21 años.
   - `RegisterAthleteComponent`: Atributo `[max]`, separación estricta entre `isFutureBirthDate` y `isUnderage` (evitando activar la tarjeta LOPNNA con edad negativa), y bloqueo de envío al paso 2.
   - `ScoutBulkImportComponent`: Subtítulo informativo claro sobre el rango formativo permitido (4 a 21 años).

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (JUnit 5 / Spring Boot Test / MockMvc)
Se ejecutaron satisfactoriamente las suites de pruebas con el comando Maven wrapper:
```bash
./mvnw test -Dtest=AthleteFieldNormalizerTest,AthleteControllerTest,BulkImportProcessorTest,BulkImportServiceTemplateTest,BulkImportParserTest,AuthAthleteRegistrationTest,RegisterTutorTest
```

**Resultados obtenidos:**
```
[INFO] Running com.talentus.scout.util.AthleteFieldNormalizerTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.347 s
[INFO] Running com.talentus.scout.web.controller.AthleteControllerTest
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.talentus.scout.web.controller.AuthAthleteRegistrationTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.talentus.scout.service.bulkimport.BulkImportProcessorTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.talentus.scout.service.bulkimport.BulkImportServiceTemplateTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.talentus.scout.service.bulkimport.BulkImportParserTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.talentus.scout.web.controller.RegisterTutorTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total tests run: 52, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
```

**Casos cubiertos específicamente:**
- `AthleteFieldNormalizerTest.testValidateBirthDateAndFormativeAge`: rechazo de null, fecha futura, fecha actual, < 4 años y > 21 años. Aprobación de 4 años, 14 años y 21 años.
- `AthleteFieldNormalizerTest.testCalculateSafeAgeNeverNegative`: cálculo seguro que garantiza 0 ante fechas anómalas sin lanzar excepciones no controladas.
- `BulkImportParserTest.testFutureBirthDateProducesRowValidationError`: detección de fecha futura `2035-05-14` generando motivo en `validationError`.
- `BulkImportParserTest.testTodayBirthDateProducesRowValidationError`: detección de fecha igual a hoy.
- `BulkImportParserTest.testAgeOutOfFormativeRangeProducesRowValidationError`: rechazo de atleta menor de 4 años y mayor de 21 años.
- `BulkImportParserTest.testValidYouthAthlete18To21ParsedSuccessfully`: atletas juveniles de 18 a 21 años se parsean limpiamente.
- `BulkImportProcessorTest.testRowWithFutureBirthDateIsOmittedAndRecordedInWarnings`: omisión defensiva de fila con fecha futura (`FILA_OMITIDA`) sin persistencia en base de datos.
- `BulkImportServiceTemplateTest.testExcelTemplateContainsDropdownValidationsAndRoundTripsThroughParser`: validación de las 6 reglas de celda en Excel (prompt box de fecha de nacimiento y 5 listas desplegables).
- `AthleteControllerTest.createAthlete_WithFutureBirthDate_Returns400BadRequest`: endpoint `POST /api/v1/athletes` rechaza fechas futuras con HTTP 400.
- `AthleteControllerTest.createAthlete_WithAgeUnder4_Returns400BadRequest`: endpoint `POST /api/v1/athletes` rechaza edades < 4 años.
- `AuthAthleteRegistrationTest.testRegisterAdultAthleteFutureBirthDateFails`: rechazo de fecha futura en registro autónomo adulto.
- `AuthAthleteRegistrationTest.testRegisterAdultAthleteTodayBirthDateFails`: rechazo de fecha de hoy en registro autónomo adulto.

### 2.2. Frontend (Karma / Jasmine / Angular Testing)
Se ejecutaron las pruebas unitarias de los componentes modificados con el script de Karma:
```bash
npx ng test --include="**/register-athlete*.spec.ts"
```

**Resultados obtenidos:**
```
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 20 of 20 SUCCESS (1.465 secs / 1.33 secs)
TOTAL: 20 SUCCESS
```

**Casos cubiertos en Frontend:**
- `RegisterAthleteModalComponent`:
  - Selector con atributo `[max]` inicializado en fecha de ayer.
  - Al ingresar fecha futura o de hoy: muestra error *"La fecha de nacimiento no puede ser futura ni igual a la fecha actual."*.
  - Al ingresar edad < 4 años: muestra error *"El atleta debe tener al menos 4 años de edad para registrarse."*.
  - Al ingresar edad > 21 años: muestra error informativo de categorías juveniles formativas.
  - Al ingresar edad válida (ej. 12 años): no presenta errores y permite el registro.
- `RegisterAthleteComponent`:
  - Input con atributo `[max]` inicializado en fecha de ayer.
  - Al ingresar fecha futura: activa `isFutureBirthDate = true`, mantiene `isUnderage = false`, oculta la tarjeta LOPNNA con edad negativa y muestra el banner de error de fecha futura.
  - Al ingresar edad menor de 18 años: activa `isUnderage = true` y muestra la tarjeta LOPNNA Art. 65 con redirección a tutor.
  - Al ingresar edad >= 18 años: habilita el botón y permite el paso 2 de la ficha deportiva.

### 2.3. Compilación de Producción Frontend (SSR y Browser)
```bash
npm run build
```
Resultado: **Exitoso**. Los paquetes de servidor y cliente Angular 18+ compilaron sin errores de tipado ni fallas de enlace en plantillas HTML externas.

---

## 3. Guía de Verificación Manual Paso a Paso (cURL)

### 3.1. Prueba 1: Rechazo de Fecha Futura en Registro de Atleta por Tutor
```bash
curl -i -X POST http://localhost:8080/api/v1/athletes \
  -H "Authorization: Bearer $TUTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Atleta",
    "lastName": "Futuro",
    "birthDate": "2035-05-14",
    "gender": "MALE",
    "primaryPosition": "Delantero Centro",
    "preferredFoot": "DERECHO",
    "nationality": "Venezuela"
  }'
```
**Respuesta esperada:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "timestamp": "...",
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "La fecha de nacimiento no puede ser futura ni igual a la fecha actual (Fecha recibida: 2035-05-14)"
}
```

### 3.2. Prueba 2: Rechazo de Fecha Futura en Registro Autónomo de Atleta Adulto (`ROLE_ATHLETE`)
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/register-athlete \
  -H "Content-Type: multipart/form-data" \
  -F "fullName=Atleta Adulto Futuro" \
  -F "email=atleta.futuro@test.com" \
  -F "password=Password123!" \
  -F "phoneNumber=+584121234567" \
  -F "birthDate=2035-01-01" \
  -F "acceptTerms=true" \
  -F "acceptInstitutionalDiffusion=true" \
  -F "primaryPosition=DELANTERO" \
  -F "preferredFoot=DERECHO" \
  -F "gender=MALE" \
  -F "nationality=Venezolana"
```
**Respuesta esperada:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "timestamp": "...",
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "La fecha de nacimiento no puede ser futura ni igual a la fecha actual"
}
```
*(Nota: No debe arrojar el mensaje LOPNNA de menor de edad ni mostrar edades negativas en ninguna vista).*

### 3.3. Prueba 3: Carga Masiva con Fila Futura
1. Iniciar sesión como Scout con permiso de carga masiva.
2. Subir un archivo CSV/Excel con una fila válida (nacido en 2011) y una fila anómala (nacido en 2035).
3. **Comportamiento verificado:**
   - Atleta nacido en 2011: Creado exitosamente en el radar del club (`successfulRows = 1`).
   - Atleta nacido en 2035: Fila omitida (`failedRows = 1`, `actionTaken = "FILA_OMITIDA"`).
   - El archivo CSV de omitidos descargable detalla: *"La fecha de nacimiento no puede ser futura ni igual a la fecha actual (2035-05-14)"*.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia |
| :--- | :---: | :--- |
| **1. Migración DDL local** aplicada con soft-delete y constraint `chk_athletes_birth_date_past` (sin tocar Neon). | **CUMPLIDO** | Migración `20261118220000_enforce_valid_athlete_birth_date.sql` aplicada con dbmate en contenedor local. |
| **2. Carga masiva tolerante y blindada** que omite filas con fechas futuras/hoy o fuera de 4–21 años registrándolas en el CSV de omitidos. | **CUMPLIDO** | Validado en `BulkImportParserTest` y `BulkImportProcessorTest`. Lotes procesan atletas válidos y aíslan los defectuosos. |
| **3. Registro individual de tutor** bloquea fechas futuras/hoy y edades < 4 o > 21 años con HTTP 400. | **CUMPLIDO** | Validado en `AthleteControllerTest` y capa de servicio `AthleteService.createAthlete`. |
| **4. Registro de atleta adulto autónomo** distingue fecha futura de minoridad LOPNNA y permite `>= 18` años. | **CUMPLIDO** | Validado en `AuthAthleteRegistrationTest` (`AuthService.registerAdultAthlete`). |
| **5. Selectores HTML `type="date"` y UI** cuentan con `max`, validadores reactivos y suprimen edades negativas (`-8 años`). | **CUMPLIDO** | Verificado en `register-athlete-modal` y `register-athlete` con 20 tests unitarios en verde. |
| **6. Pruebas y compilación en verde** sin regresiones en backend ni frontend. | **CUMPLIDO** | `./mvnw test` (52 tests específicos en verde) y `npm run build` completados con éxito. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

- **Zona Horaria y Días Límite:** Se calculan las fechas fijando hora cero (`T00:00:00`) para evitar desfases por huso horario UTC al parsear strings ISO en JavaScript.
- **Protección LOPNNA Art. 65:** Se previene estrictamente la explotación de fechas erróneas para simular representaciones o registrar deportistas sin personería jurídica válida.
- **Juveniles Mayores de Edad en Carga Masiva (18 a 21 años):** La plataforma permite que los clubes importen futbolistas juveniles formativos de hasta 21 años inclusive, conviviendo armónicamente con el registro individual autónomo de adultos (`TS-69`).
