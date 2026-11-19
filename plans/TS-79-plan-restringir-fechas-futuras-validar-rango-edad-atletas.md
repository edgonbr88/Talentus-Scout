# Plan de Implementación: [TS-79] Restringir Fechas Futuras y Validar Rango de Edad en Fecha de Nacimiento de Atletas (Carga Masiva, Registro y BD)

**ID Tarea:** TS-79  
**Tarjeta Trello:** [https://trello.com/c/X1PQDKSB](https://trello.com/c/X1PQDKSB)  
**Fecha:** 2026-11-18  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Identificación y Contexto de Negocio
- **Identificación:** TS-79 — Restringir Fechas Futuras y Validar Rango de Edad en Fecha de Nacimiento de Atletas (Carga Masiva, Registro y BD)
- **Sprint:** Sprint 4
- **Tarjeta Trello:** [https://trello.com/c/X1PQDKSB](https://trello.com/c/X1PQDKSB)
- **Dependencias:** Extiende `TS-69` (Rol `ATHLETE` mayor de edad), `TS-70` (Carga masiva de atletas y tutores) y `TS-76` (Layout Bento y UX de omitidos).

### 1.1. Incidente Detectado y Justificación
Durante las pruebas de homologación del sistema de carga masiva de atletas (`TS-70`), se identificó que el sistema permitió registrar un atleta con fecha de nacimiento futura (`FechaFutura Inyeccion`, categoría `2035`, mostrando `EDAD: -8 años` en su perfil público). La causa raíz fue que `BulkImportParser` y `BulkImportProcessor` únicamente validaban el formato sintáctico de la fecha (`yyyy-MM-dd` / `dd/MM/yyyy`) sin verificar su validez temporal ni el rango etario permitido.

Adicionalmente, se detectó que:
1. En el registro autónomo de atletas mayores de edad (`TS-69` — `AuthService.registerAdultAthlete` y `RegisterAthleteComponent`), si se ingresaba una fecha futura, el cálculo de edad arrojaba un valor negativo (`-8 años`), lo cual activaba erróneamente la alerta legal de menor de edad bajo la LOPNNA Art. 65 en lugar de señalar que la fecha es inválida/futura.
2. En el modal de registro por parte del tutor (`RegisterAthleteModalComponent` y `AthleteService.createAthlete`), el campo no contaba con restricción `max` en el selector HTML ni validación de edad mínima formativa (`< 4 años`), limitándose únicamente a validar `< 21 años`.
3. En la base de datos PostgreSQL, la tabla `athletes` no poseía un constraint DDL a nivel de motor que garantizara que la fecha de nacimiento no sea futura ni igual a la fecha actual para registros activos.

### 1.2. Principio de Protección Legal (LOPNNA Art. 65) e Integridad de Datos
- **Categorías Formativas (`BulkImport` y `Tutor`):** La plataforma está orientada al fútbol base y formativo de 4 a 21 años (menores bajo tutela legal LOPNNA de 4 a 17 años y juveniles mayores de edad de 18 a 21 años).
- **Atletas Mayores de Edad Autónomos (`ROLE_ATHLETE`):** Deben tener al menos 18 años cumplidos (`>= 18` años sin tope formativo de 21 años) y rechazar tajantemente fechas futuras/hoy con un mensaje de error claro sin distorsionar la figura de minoridad.
- **Directorio y Cédula Deportiva:** Se preserva la fiabilidad métrica eliminando cualquier posibilidad de edades negativas o categorías ficticias en los perfiles públicos, PDFs de CV deportivo y filtros de scouts.

---

## 2. Arquitectura y Modelo de Datos (PostgreSQL / dbmate)

> [!CAUTION]
> **DIRECTIVA OBLIGATORIA DE BASE DE DATOS:** Queda terminantemente **PROHIBIDO ejecutar migraciones directamente en la base de datos productiva de NEON**. Todas las migraciones DDL/dbmate deben ejecutarse y validarse exclusivamente en el entorno de desarrollo local (PostgreSQL local).

### 2.1. Archivo de Migración DDL
- **Ruta:** `talentus-scout-migrations/migrations/20261118220000_enforce_valid_athlete_birth_date.sql`

```sql
-- migrate:up

-- 1. Saneamiento defensivo de registros anómalos previos con fecha de nacimiento futura o igual a hoy
UPDATE athletes
SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
    is_public = FALSE
WHERE birth_date >= CURRENT_DATE;

-- 2. Constraint de validación temporal en PostgreSQL para evitar registros futuros en atletas activos
ALTER TABLE athletes
ADD CONSTRAINT chk_athletes_birth_date_past
CHECK (birth_date < CURRENT_DATE OR deleted_at IS NOT NULL);

-- migrate:down

ALTER TABLE athletes
DROP CONSTRAINT IF EXISTS chk_athletes_birth_date_past;
```

---

## 3. Especificación Backend: Spring Boot 3 (Java 21)

### 3.1. Utilidad Centralizada de Validación de Fechas (`AthleteFieldNormalizer.java`)
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/util/AthleteFieldNormalizer.java`
- **Nuevas Constantes y Métodos:**
  - `MIN_FORMATIVE_AGE = 4;`
  - `MAX_FORMATIVE_AGE = 21;`
  - `public static void validateBirthDateAndFormativeAge(LocalDate birthDate)`:
    - Si `birthDate == null`: lanza `IllegalArgumentException("La fecha de nacimiento es obligatoria")`.
    - Si `!birthDate.isBefore(LocalDate.now())`: lanza `IllegalArgumentException("La fecha de nacimiento no puede ser futura ni igual a la fecha actual (Fecha recibida: " + birthDate + ")")`.
    - Calcula edad: `int age = Period.between(birthDate, LocalDate.now()).getYears();`.
    - Si `age < MIN_FORMATIVE_AGE`: lanza `IllegalArgumentException("El atleta debe tener al menos " + MIN_FORMATIVE_AGE + " años de edad (Edad calculada: " + age + " años)")`.
    - Si `age > MAX_FORMATIVE_AGE`: lanza `IllegalArgumentException("El atleta debe pertenecer a categorías formativas de hasta " + MAX_FORMATIVE_AGE + " años (Edad actual: " + age + " años)")`.
  - `public static void validateBirthDateInPast(LocalDate birthDate)`:
    - Si `birthDate == null`: lanza `IllegalArgumentException("La fecha de nacimiento es obligatoria")`.
    - Si `!birthDate.isBefore(LocalDate.now())`: lanza `IllegalArgumentException("La fecha de nacimiento no puede ser futura ni igual a la fecha actual")`.

### 3.2. Carga Masiva (`BulkImportParser.java` y `BulkImportProcessor.java`)
- **Rutas:**
  - `talentus-scout-be/src/main/java/com/talentus/scout/service/bulkimport/BulkImportParser.java`
  - `talentus-scout-be/src/main/java/com/talentus/scout/service/bulkimport/BulkImportProcessor.java`
- **Modificaciones en `BulkImportParser.buildRowDto(...)`:**
  - Al parsear `fecha_nacimiento`:
    ```java
    if (parsedBirthDate != null) {
        try {
            AthleteFieldNormalizer.validateBirthDateAndFormativeAge(parsedBirthDate);
        } catch (IllegalArgumentException ex) {
            rowErrors.add(ex.getMessage());
        }
    }
    ```
- **Modificaciones en `BulkImportProcessor.processImportJob(...)`:**
  - Validación defensiva antes de persistir el objeto `Athlete`:
    ```java
    if (row.getFechaNacimiento() == null || !row.getFechaNacimiento().isBefore(LocalDate.now())) {
        warnings.add(BulkImportRowErrorDto.builder()
                .rowNumber(row.getRowNumber())
                .athleteName(row.getPrimerNombre() + " " + row.getPrimerApellido())
                .reason("La fecha de nacimiento no puede ser futura ni igual a la fecha actual (" + row.getFechaNacimiento() + ")")
                .actionTaken("FILA_OMITIDA")
                .build());
        job.setFailedRows(job.getFailedRows() + 1);
        continue;
    }
    int age = Period.between(row.getFechaNacimiento(), LocalDate.now()).getYears();
    if (age < 4 || age > 21) {
        warnings.add(BulkImportRowErrorDto.builder()
                .rowNumber(row.getRowNumber())
                .athleteName(row.getPrimerNombre() + " " + row.getPrimerApellido())
                .reason("Edad fuera de rango formativo (4 a 21 años). Edad calculada: " + age + " años")
                .actionTaken("FILA_OMITIDA")
                .build());
        job.setFailedRows(job.getFailedRows() + 1);
        continue;
    }
    ```

### 3.3. Plantilla Excel (`BulkImportService.java`)
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/bulkimport/BulkImportService.java`
- **Modificaciones en `generateExcelTemplate()`:**
  - Agregar Prompt Box / validación en columna 5 (`fecha_nacimiento`):
    - Título: `"Fecha de Nacimiento"`
    - Mensaje: `"Formato AAAA-MM-DD o DD/MM/AAAA. Obligatorio fecha en el pasado (edad formativa entre 4 y 21 años)."`

### 3.4. DTOs de Registro de Atleta
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/CreateAthleteRequest.java`
  - Validar `@Past(message = "La fecha de nacimiento debe ser anterior a la fecha actual")` (ya presente) y `@NotNull`.
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/RegisterAdultAthleteRequest.java`
  - Agregar `@NotNull(message = "La fecha de nacimiento es obligatoria")`.
  - Agregar `@Past(message = "La fecha de nacimiento debe ser anterior a la fecha actual")`.

### 3.5. Servicios de Dominio (`AthleteService.java` y `AuthService.java`)
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/AthleteService.java`
  - En `createAthlete(...)`:
    ```java
    AthleteFieldNormalizer.validateBirthDateAndFormativeAge(request.getBirthDate());
    ```
  - En `getAthletePublicProfile(...)`:
    ```java
    int age = athlete.getBirthDate() != null
            ? Math.max(0, Period.between(athlete.getBirthDate(), LocalDate.now()).getYears())
            : 0;
    ```
- **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/AuthService.java`
  - En `registerAdultAthlete(...)`:
    ```java
    if (request.getBirthDate() == null || !request.getBirthDate().isBefore(LocalDate.now())) {
        throw new IllegalArgumentException("La fecha de nacimiento no puede ser futura ni igual a la fecha actual");
    }
    int age = Period.between(request.getBirthDate(), LocalDate.now()).getYears();
    if (age < 18) {
        throw new IllegalArgumentException("El registro directo de atleta requiere tener al menos 18 años cumplidos. Si eres menor de edad, tu registro debe ser gestionado por tu tutor legal.");
    }
    ```

### 3.6. Blindaje Defensivo en Cálculo de Edad en DTOs y Reportes
- **`AthleteResponse.java`:**
  ```java
  if (athlete.getBirthDate() != null) {
      this.age = Math.max(0, Period.between(athlete.getBirthDate(), LocalDate.now()).getYears());
  }
  ```
- **`AthleteCvPdfService.java`:**
  ```java
  int age = athlete.getBirthDate() != null
          ? Math.max(0, Period.between(athlete.getBirthDate(), LocalDate.now()).getYears())
          : 0;
  ```
- **`LegalVerificationService.java`:**
  ```java
  if (athlete.getBirthDate() != null) {
      age = Math.max(0, Period.between(athlete.getBirthDate(), LocalDate.now()).getYears());
  }
  ```

---

## 4. Especificación Frontend: Angular 18+ Standalone

### 4.1. Modal de Registro de Atleta por Tutor (`RegisterAthleteModalComponent`)
- **Ruta:** `talentus-scout-fe/src/app/features/dashboard/register-athlete-modal/`
  - `register-athlete-modal.component.ts`:
    - Propiedad `maxBirthDate: string = '';` inicializada en `ngOnInit()` con la fecha de ayer en formato ISO (`YYYY-MM-DD`).
    - Validador reactivo y actualización de `onBirthDateChange()`:
      1. Si valor vacío: `ageError = null`.
      2. Si fecha `>= hoy`: `ageError = 'La fecha de nacimiento no puede ser futura ni igual a la fecha actual.'`.
      3. Si `age < 4`: `ageError = 'El atleta debe tener al menos 4 años de edad para registrarse.'`.
      4. Si `age > 21`: `ageError = `El atleta tiene ${age} años. La plataforma está reservada para categorías formativas juveniles (< 21 años).``.
      5. En caso válido: `ageError = null`.
  - `register-athlete-modal.component.html`:
    - Agregar `[max]="maxBirthDate"` al `<input id="birthDate" type="date">`.

### 4.2. Registro Autónomo de Atleta Mayor de Edad (`RegisterAthleteComponent`)
- **Ruta:** `talentus-scout-fe/src/app/features/auth/register-athlete/`
  - `register-athlete.component.ts`:
    - Propiedad `maxBirthDate: string = '';` inicializada con la fecha de ayer (`YYYY-MM-DD`).
    - Propiedad `isFutureBirthDate: boolean = false;`.
    - Actualización de `onBirthDateChange()`:
      1. Si valor vacío: `calculatedAge = null`, `isUnderage = false`, `isFutureBirthDate = false`.
      2. Si fecha `>= hoy`:
         - `isFutureBirthDate = true`.
         - `isUnderage = false` (evita activar erróneamente la alerta LOPNNA con edad negativa).
         - `calculatedAge = null`.
         - `errorMessage = 'La fecha de nacimiento no puede ser futura ni igual a la fecha actual.'`.
      3. Si `0 <= age < 18`:
         - `isFutureBirthDate = false`.
         - `isUnderage = true`.
         - `calculatedAge = age`.
         - `errorMessage = 'Los atletas menores de 18 años deben ser registrados y representados por su tutor legal bajo la LOPNNA.'`.
      4. Si `age >= 18`:
         - `isFutureBirthDate = false`.
         - `isUnderage = false`.
         - `calculatedAge = age`.
         - `errorMessage = null`.
    - En `goToStep2()`: bloquear si `isFutureBirthDate || isUnderage || calculatedAge === null`.
  - `register-athlete.component.html`:
    - Agregar `[max]="maxBirthDate"` al `<input id="birthDate" type="date">`.
    - Agregar bloque visual de error específico para `isFutureBirthDate`:
      ```html
      <div *ngIf="isFutureBirthDate" class="alert alert-danger" role="alert">
        <span>La fecha de nacimiento no puede ser futura ni igual a la fecha actual.</span>
      </div>
      ```
    - Mantener tarjeta LOPNNA Art. 65 condicionada estrictamente a `isUnderage && !isFutureBirthDate && calculatedAge !== null && calculatedAge >= 0`.

### 4.3. Vista de Carga Masiva (`ScoutBulkImportComponent`)
- **Ruta:** `talentus-scout-fe/src/app/features/scout-bulk-import/scout-bulk-import.component.html`
  - Actualizar subtítulo y descripción indicando expresamente que las fechas de nacimiento deben ser en el pasado y pertenecer al rango formativo (4 a 21 años), y que las filas fuera de rango serán omitidas automáticamente en el informe CSV descargable.

---

## 5. Plan de Pruebas y Validación

### 5.1. Pruebas Automatizadas Backend (JUnit 5 / Spring Boot)
1. **`talentus-scout-be/src/test/java/com/talentus/scout/service/bulkimport/BulkImportParserTest.java`:**
   - Test con fecha futura (`2035-01-01`): debe registrar error en `validationError` indicando fecha futura.
   - Test con fecha de hoy: debe registrar error indicando que no puede ser igual a hoy.
   - Test con edad `< 4` años (ej. 2 años): debe registrar error de edad mínima.
   - Test con edad `> 21` años (ej. 25 años): debe registrar error de edad máxima formativa.
   - Test con edad válida juvenil formativa `18–21` años (ej. 19 años): debe parsear correctamente sin error.
2. **`talentus-scout-be/src/test/java/com/talentus/scout/service/bulkimport/BulkImportProcessorTest.java`:**
   - Simulación de lote con filas que contienen fecha futura: valida que la fila se marque como `FILA_OMITIDA`, el job sume `failedRows`, no se persista el atleta y las filas válidas se procesen exitosamente.
3. **`talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AthleteControllerTest.java` / `AthleteServiceTest`:**
   - `createAthlete` con fecha futura o `<= 3` años o `> 21` años: retorna `400 Bad Request`.
4. **`talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AuthAthleteRegistrationTest.java`:**
   - `registerAdultAthlete` con fecha futura: rechaza con `400 Bad Request` y mensaje de fecha futura prohibida (no mensaje LOPNNA).
   - `registerAdultAthlete` con menor de edad (`16` años): rechaza con mensaje LOPNNA.
   - `registerAdultAthlete` con mayor de edad (`20` años y `24` años): registro exitoso.

### 5.2. Pruebas Automatizadas Frontend (Karma / Jasmine)
1. **`register-athlete-modal.component.spec.ts`:**
   - Valida que `birthDate` con fecha futura o edad `< 4` o `> 21` active `ageError`.
   - Valida que fechas válidas de 4 a 21 años limpien `ageError`.
2. **`register-athlete.component.spec.ts`:**
   - Valida que `birthDate` futura active `isFutureBirthDate = true` y no active `isUnderage`.
   - Valida que edad `< 18` active `isUnderage = true`.
   - Valida que edad `>= 18` habilite el avance al paso 2.

### 5.3. Verificación Manual con cURL
```bash
# 1. Probar rechazo de fecha futura en registro de atleta
curl -s -X POST http://localhost:8080/api/v1/athletes \
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
  }' | jq .
# Esperado: 400 Bad Request ("La fecha de nacimiento no puede ser futura ni igual a la fecha actual")

# 2. Probar rechazo de fecha futura en registro de atleta adulto autónomo
curl -s -X POST http://localhost:8080/api/v1/auth/register-athlete \
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
  -F "nationality=Venezolana" | jq .
# Esperado: 400 Bad Request ("La fecha de nacimiento no puede ser futura ni igual a la fecha actual")
```

---

## 6. Checklist de Implementación Paso a Paso (Para el Agente Implementador)

- [ ] **Fase 1: Ramas Git en Submódulos**
  - [ ] Crear rama `feature/TS-79-validar-fecha-nacimiento-atletas` en `talentus-scout-migrations`.
  - [ ] Crear rama `feature/TS-79-validar-fecha-nacimiento-atletas` en `talentus-scout-be`.
  - [ ] Crear rama `feature/TS-79-validar-fecha-nacimiento-atletas` en `talentus-scout-fe`.

- [ ] **Fase 2: Base de Datos y Migración DDL**
  - [ ] Crear `talentus-scout-migrations/migrations/20261118220000_enforce_valid_athlete_birth_date.sql`.
  - [ ] Aplicar soft-delete a registros existentes con `birth_date >= CURRENT_DATE`.
  - [ ] Agregar constraint `chk_athletes_birth_date_past` en tabla `athletes`.
  - [ ] Ejecutar y validar `dbmate up` exclusivamente en PostgreSQL local (¡PROHIBIDO NEON!).

- [ ] **Fase 3: Backend (Spring Boot 3 / Java 21)**
  - [ ] Agregar validadores `validateBirthDateAndFormativeAge` y `validateBirthDateInPast` en `AthleteFieldNormalizer.java`.
  - [ ] Integrar validación de fecha y edad formativa en `BulkImportParser.java`.
  - [ ] Integrar validación defensiva de omitidos con reporte en `BulkImportProcessor.java`.
  - [ ] Añadir Prompt Box informativo de fecha en `BulkImportService.generateExcelTemplate()`.
  - [ ] Asegurar `@Past` y `@NotNull` en `CreateAthleteRequest.java` y `RegisterAdultAthleteRequest.java`.
  - [ ] Validar fecha no futura y edades 4–21 en `AthleteService.createAthlete(...)`.
  - [ ] Validar fecha no futura antes de minoridad en `AuthService.registerAdultAthlete(...)`.
  - [ ] Proteger cálculo de edad con `Math.max(0, ...)` en `AthleteResponse`, `AthleteService`, `AthleteCvPdfService` y `LegalVerificationService`.
  - [ ] Escribir y ejecutar pruebas unitarias/integración en `talentus-scout-be` (`./mvnw test`).

- [ ] **Fase 4: Frontend (Angular 18+ Standalone)**
  - [ ] Actualizar `register-athlete-modal.component.ts` y `.html`: `max` date input, validador reactivo para fecha futura y edades 4–21.
  - [ ] Actualizar `register-athlete.component.ts` y `.html`: `max` date input, separación entre `isFutureBirthDate` y `isUnderage` (evitar alert LOPNNA con edad negativa).
  - [ ] Actualizar subtítulo informativo en `scout-bulk-import.component.html`.
  - [ ] Actualizar y ejecutar specs unitarias (`npm test` o `ng test --watch=false`).

- [ ] **Fase 5: Documentación de Pruebas y Pull Requests**
  - [ ] Redactar `test/TS-79-test-plan-restringir-fechas-futuras-validar-rango-edad-atletas.md`.
  - [ ] Realizar commit y push en las ramas de los 3 submódulos.
  - [ ] Abrir Pull Requests hacia `main` usando `gh pr create` en cada submódulo.
  - [ ] Realizar commit y push de documentación en la rama `main` del orquestador.
  - [ ] Mover tarjeta en Trello de `in development` a `in testing` con el script oficial y añadir comentario con enlaces.

---

## 7. Criterios de Aceptación (DoD)
1. **Migración DDL Local:** La migración `20261118220000_enforce_valid_athlete_birth_date.sql` sanea registros previos con `birth_date >= CURRENT_DATE` y aplica `chk_athletes_birth_date_past` sin errores en PostgreSQL local.
2. **Carga Masiva Resistente:** Al importar archivos con fechas futuras, fecha actual o edades `< 4` o `> 21` años, únicamente esas filas son omitidas (`FILA_OMITIDA`) con causa detallada en el CSV de omitidos, sin abortar el lote. Los atletas juveniles válidos (incluyendo `18–21` años) se procesan normalmente.
3. **Registro Individual Tutor:** `POST /api/v1/athletes` rechaza fechas futuras/hoy y edades `< 4` o `> 21` con `400 Bad Request`.
4. **Registro Autónomo Adulto:** `POST /api/v1/auth/register-athlete` rechaza fechas futuras/hoy con mensaje explícito sin activar alerta LOPNNA, rechaza `< 18` años con alerta LOPNNA y permite `>= 18` años.
5. **UI Limpia y Accesible:** Los selectores `type="date"` tienen `max`, impiden el envío de fechas futuras/hoy y no muestran edades negativas (`-8 años`).
6. **Calidad de Pruebas:** Todos los tests automatizados pasan en verde en backend (`./mvnw test`) y frontend (`npm test`), y el plan de pruebas en `test/` está redactado.
