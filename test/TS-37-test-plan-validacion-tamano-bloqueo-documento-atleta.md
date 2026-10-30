# Plan de Pruebas: TS-37 Validación de Tamaño Máximo (5MB) y Bloqueo de Guardado Incompleto en Modal de Documento de Atleta

## 1. Alcance de las Pruebas
Este plan de pruebas valida la implementación de la tarea **[TS-37]**, cuyo objetivo es robustecer la experiencia de usuario y la integridad técnica en la carga de documentos de identidad de atletas menores de edad:
* **Backend:**
  - `talentus-scout-be/src/main/resources/application.yml`: Configuración de límites de subida de multipart a 10MB para permitir captura y manejo controlado en Spring MVC.
  - `GlobalExceptionHandler.java`: Captura de `MaxUploadSizeExceededException` retornando HTTP 413 `PAYLOAD_TOO_LARGE` con mensaje descriptivo en español.
  - `UploadAthleteIdentityDocumentRequest.java`: Validación Jakarta `@NotBlank` en `documentNumber`.
  - `AthleteService.java`: Validación de tamaño máximo estricto a 5MB (`5 * 1024 * 1024`), validación de número de documento no vacío ni compuesto exclusivamente por espacios en blanco, y validación estricta de extensiones permitidas (`.pdf`, `.png`, `.jpg`, `.jpeg`).
  - `AthleteIdentityDocumentTest.java`: Pruebas de integración automatizadas con `@SpringBootTest` y `MockMvc`.
* **Frontend:**
  - `tutor-dashboard.component.ts`: Cálculo dinámico y visualización del peso exacto en MB (`${sizeMb} MB`) al superar 5MB, y evaluación reactiva de la propiedad `canSaveIdentityDocument`.
  - `tutor-dashboard.component.html`: Enlace del estado de deshabilitación del botón "Guardar Documento Legal" a `!canSaveIdentityDocument`.
  - `tutor-dashboard.component.spec.ts`: Pruebas unitarias completas con Jasmine/Karma verificando bloqueo de guardado, cálculo dinámico de MB, y eventos del dropzone.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1 Backend (`talentus-scout-be`)
Comando ejecutado:
```bash
./mvnw test -Dtest=AthleteIdentityDocumentTest
```

**Resultados obtenidos:**
```text
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 30.97 s -- in com.talentus.scout.web.controller.AthleteIdentityDocumentTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Casos probados:
1. `uploadMinorIdentityDocumentSuccessfully`: Subida exitosa de documento válido (HTTP 200).
2. `uploadMinorIdentityDocumentByUnauthorizedTutorShouldFailWith403`: Verificación de permisos y aislamiento entre tutores (HTTP 403).
3. `uploadMinorIdentityDocumentExceeding5MBShouldFailWith400`: Rechazo controlado de archivos > 5MB con mensaje explicativo (HTTP 400).
4. `uploadMinorIdentityDocumentWithBlankDocumentNumberShouldFailWith400`: Rechazo de solicitudes con número de documento vacío o solo espacios (HTTP 400).
5. `uploadMinorIdentityDocumentWithInvalidFormatShouldFailWith400`: Rechazo de extensiones no autorizadas (.exe, .sh, etc.) (HTTP 400).

---

### 2.2 Frontend (`talentus-scout-fe`)
Comando ejecutado:
```bash
npm test -- --watch=false
```

Casos probados en `tutor-dashboard.component.spec.ts`:
1. `should reject files exceeding 5MB and display error message`: Valida que al seleccionar un archivo > 5MB, el dropzone se marque con `.is-invalid`, el archivo se descarte (`identityFile == null`) y el mensaje contenga el peso exacto formateado `(6.0 MB)`.
2. `should format file size dynamically when file exceeds 5MB`: Verifica que un archivo de 7.5MB genere el mensaje `El archivo seleccionado (7.5 MB) supera el límite máximo permitido de 5MB. Por favor selecciona un documento más liviano o comprimido.`.
3. `should calculate canSaveIdentityDocument accurately based on all 3 conditions`: Verifica que `canSaveIdentityDocument` sea falso si falta el archivo, si el número de documento está vacío o solo contiene espacios, o si está en proceso de carga; y sea verdadero cuando los 3 datos requeridos son válidos.
4. `should keep Guardar Documento Legal button disabled until canSaveIdentityDocument is true`: Verifica la reactividad en el DOM del botón "Guardar Documento Legal" habilitándose y deshabilitándose según las 3 condiciones.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1 Verificación en Interfaz Web (UI)
1. **Acceso al Dashboard del Tutor:**
   - Iniciar sesión como tutor legal (`tutor@talentus.com` / `password123` o credencial activa).
   - Acceder a `/dashboard/tutor`.
2. **Apertura del Modal de Documento de Identidad:**
   - Ubicar la tarjeta de un atleta representado y hacer clic en el botón `Doc. Identidad` (ícono 🪪).
   - Verificar que inicialmente el botón "Guardar Documento Legal" se encuentre **deshabilitado** (`disabled`).
3. **Validación de Bloqueo por Número Incompleto o Espacios:**
   - Seleccionar un archivo válido (ej. `cedula.pdf` de 500KB).
   - Verificar que el botón siga deshabilitado mientras el campo "Número de Documento" esté vacío.
   - Escribir únicamente espacios `"   "` en el campo. Verificar que el botón **continúa deshabilitado**.
   - Escribir un número válido (ej. `V-29888999`). Verificar que el botón "Guardar Documento Legal" se **habilita**.
4. **Validación de Archivo Superior a 5MB:**
   - Seleccionar un archivo de 6.2MB.
   - Constatar que el archivo es descartado inmediatamente, el borde del dropzone se torna rojo y aparece el mensaje de error:
     `El archivo seleccionado (6.2 MB) supera el límite máximo permitido de 5MB. Por favor selecciona un documento más liviano o comprimido.`
   - Constatar que el botón "Guardar Documento Legal" permanece deshabilitado.

### 3.2 Verificación mediante cURL (API Backend)
```bash
# 1. Login para obtener token JWT de tutor
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor@test.com","password":"Password123!"}' | jq -r '.token')

# 2. Intento de subida con archivo de 6MB (debe responder 400 Bad Request)
dd if=/dev/zero of=/tmp/test_6mb.pdf bs=1M count=6
curl -i -X POST http://localhost:8080/api/v1/athletes/1/identity-document \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_6mb.pdf" \
  -F "documentType=CEDULA" \
  -F "documentNumber=V-30111222"

# 3. Intento de subida con número de documento en blanco (debe responder 400 Bad Request)
touch /tmp/test_valid.pdf
curl -i -X POST http://localhost:8080/api/v1/athletes/1/identity-document \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_valid.pdf" \
  -F "documentType=CEDULA" \
  -F "documentNumber=   "
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| **DoD 1:** El modal calcula y muestra el tamaño exacto en MB al exceder 5MB y no adjunta el archivo. | **CUMPLIDO** | `handleIdentityFile` formatea `${sizeMb} MB` y asigna `this.identityFile = null`. Validado en tests unitarios. |
| **DoD 2:** El botón "Guardar Documento Legal" está deshabilitado hasta que tipo, número válido (sin espacios vacíos) y archivo válido estén presentes. | **CUMPLIDO** | Getter `canSaveIdentityDocument` y botón `[disabled]="!canSaveIdentityDocument"`. |
| **DoD 3:** El backend valida tamaño <= 5MB, extensiones permitidas y rechaza números vacíos o con espacios con HTTP 400. | **CUMPLIDO** | Validaciones en `AthleteService.java`, `@NotBlank` en DTO y tests en `AthleteIdentityDocumentTest.java`. |
| **DoD 4:** Archivos mayores a multipart (10MB) generan HTTP 413 `PAYLOAD_TOO_LARGE` controlado por `GlobalExceptionHandler`. | **CUMPLIDO** | Captura explícita de `MaxUploadSizeExceededException` retornando 413. |
| **DoD 5:** Pruebas automatizadas de Backend y Frontend pasando al 100%. | **CUMPLIDO** | 5/5 pruebas en backend exitosas, suite de frontend ejecutada con éxito. |

---

## 5. Casos Borde y Seguridad
* **Protección contra DoS por memoria:** Al establecer el multipart servlet en 10MB y limitar estrictamente el archivo a 5MB, evitamos que peticiones arbitrariamente grandes agoten la memoria del heap del contenedor Java.
* **Integridad de datos de identidad (LOPNNA Art. 65):** No se permite el almacenamiento de documentos huérfanos sin número de identificación verificado ni cadenas con espacios en blanco.
