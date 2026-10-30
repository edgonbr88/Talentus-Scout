# Plan de Pruebas — [TS-48] Corrección de persistencia, resolución de URLs y visualización de foto de perfil del atleta en entorno local

## 1. Identificación de la Tarea
* **ID:** `TS-48`
* **Título:** Corrección de persistencia, resolución de URLs y visualización de foto de perfil del atleta en entorno local
* **Tarjeta Trello:** [https://trello.com/c/B8iN8dE6](https://trello.com/c/B8iN8dE6) (ID: `6ad6164a7dfe04d17e2eadb5`)
* **Sprint:** Sprint 4
* **Fecha:** 2026-10-19
* **Agente Ejecutor / Tester:** trello_implementer

---

## 2. Alcance de las Pruebas

### 2.1 Backend (Spring Boot 3 / Java 21)
* **`SecurityConfig.java`:** Validación de `CorsConfigurationSource` permitiendo orígenes locales (`http://localhost:4200`, `http://localhost:3000`, `http://localhost`, `http://127.0.0.1:4200`, `http://127.0.0.1:3000`, `http://127.0.0.1`), preflights `OPTIONS` y cabeceras de autorización.
* **`LocalFileStorageService.java`:** Verificación de creación automática recursiva de subdirectorios `uploads/photos`, `uploads/videos`, `uploads/documents` al inicio del servicio.
* **`WebMvcConfig.java`:** Configuración de `ResourceHandlerRegistry` con cabeceras de caché públicas y mapeo explícito de CORS en `addCorsMappings` para `/uploads/**`.
* **`AthletePhotoControllerTest.java`:** Suite integral de tests unitarios e integración cubriendo subida, eliminación, restricciones de tamaño (máx 5MB), formatos soportados y autorización por propietario.

### 2.2 Frontend (Angular 18+ Standalone & SSR)
* **`proxy.conf.json` & `angular.json`:** Proxy reverso de desarrollo local para reenviar `/api` y `/uploads` a `http://localhost:8080`.
* **`environments/environment.ts` & `environment.prod.ts`:** Inclusión de `backendOrigin` (`http://localhost:8080` en dev, `''` en prod).
* **`MediaUrlPipe` & `resolveAssetUrl`:** Standalone pipe y función helper para transformar rutas relativas `/uploads/**` anteponiendo el origen del backend local si aplica.
* **`RegisterAthleteModalComponent`:** Manejo de fallo reactivo al encadenar la subida de foto tras crear la cédula, desplegando banner informativo con opciones de reintento (`retryPhotoUpload`) o continuación (`continueWithoutPhoto`) sin duplicar al atleta.
* **`TutorDashboardComponent`, `ScoutDirectoryComponent`, `BentoProfileComponent`:** Renderizado de la fotografía resuelta con el pipe `mediaUrl` y preservación del avatar de iniciales cuando no existe foto.

---

## 3. Pruebas Automatizadas Ejecutadas

### 3.1 Backend: Spring Boot 3 (`./mvnw test`)
* **Comando:** `./mvnw test -Dtest=AthletePhotoControllerTest`
  * `uploadProfilePhoto_AsOwner_Success`: **PASS** (HTTP 200, retorna ruta `/uploads/photos/...`)
  * `uploadProfilePhoto_AsOtherTutor_Forbidden`: **PASS** (HTTP 403 Forbidden)
  * `uploadProfilePhoto_InvalidFormat_BadRequest`: **PASS** (HTTP 400 Bad Request)
  * `uploadProfilePhoto_Exceeds5MB_BadRequest`: **PASS** (HTTP 400 Bad Request)
  * `deleteProfilePhoto_AsOwner_Success`: **PASS** (HTTP 200, limpia campo `profilePhotoUrl`)
  * `deleteProfilePhoto_AsOtherTutor_Forbidden`: **PASS** (HTTP 403 Forbidden)
  * **Resultado:** Tests run: 6, Failures: 0, Errors: 0, Skipped: 0. Time elapsed: 23.62s.
* **Suite Completa Backend:** `./mvnw test`
  * **Resultado:** Tests run: 174, Failures: 0, Errors: 0, Skipped: 0. **BUILD SUCCESS** (02:35 min).

### 3.2 Frontend: Karma / Jasmine (`npm test -- --watch=false`)
* **Comando:** `npm test -- --watch=false`
  * `MediaUrlPipe and resolveAssetUrl`:
    - `should return empty string for null, undefined or empty input`: **PASS**
    - `should return absolute URLs unchanged`: **PASS**
    - `should prepend backendOrigin to relative /uploads/ paths when backendOrigin is defined`: **PASS**
    - `should resolve using resolveAssetUrl function directly`: **PASS**
  * `RegisterAthleteModalComponent - TS-41 Photo Upload`:
    - `should initialize and load clubs`: **PASS**
    - `should allow selecting a photo and generating preview`: **PASS**
    - `should reject invalid photo format and files > 5MB`: **PASS**
    - `should remove selected photo when calling removePhoto()`: **PASS**
    - `should create athlete and chain uploadAthletePhoto when photo is selected`: **PASS**
    - `should create athlete without uploading photo if none was selected`: **PASS**
    - `should display retry banner when uploadAthletePhoto fails during onSubmit()`: **PASS**
    - `should allow retrying photo upload with retryPhotoUpload()`: **PASS**
    - `should allow continuing without photo with continueWithoutPhoto()`: **PASS**
  * **Resultado Global:** 112 specs ejecutadas, 0 fallos. **TOTAL: 112 SUCCESS**.

### 3.3 Compilación y SSR: Angular 18 (`npm run build`)
* **Comando:** `npm run build`
* **Resultado:** `Application bundle generation complete. [21.688 seconds]`. Prerendered 13 static routes sin errores.

---

## 4. Guía de Verificación Manual Paso a Paso

### 4.1 Verificación de Endpoints Backend (cURL)

#### 1. Obtener Token JWT de Tutor
```bash
TUTOR_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor@talentus.app","password":"Password123*"}' | jq -r '.token')
```

#### 2. Subir Fotografía de Perfil del Atleta
```bash
curl -i -X POST http://localhost:8080/api/v1/athletes/<ATHLETE_UUID>/photo \
  -H "Authorization: Bearer $TUTOR_TOKEN" \
  -F "file=@/ruta/a/foto.jpg"
```
* **Respuesta esperada:** HTTP 200 OK con JSON:
  ```json
  {
    "id": "<ATHLETE_UUID>",
    "fullName": "...",
    "profilePhotoUrl": "/uploads/photos/<UUID>.jpg"
  }
  ```

#### 3. Probar Preflight CORS OPTIONS
```bash
curl -i -X OPTIONS http://localhost:8080/api/v1/athletes/<ATHLETE_UUID>/photo \
  -H "Origin: http://localhost:4200" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
```
* **Respuesta esperada:** HTTP 200 OK con cabeceras:
  - `Access-Control-Allow-Origin: http://localhost:4200`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD`
  - `Access-Control-Allow-Credentials: true`

#### 4. Descargar / Visualizar Recurso Estático con Cache-Control y CORS
```bash
curl -i -X GET http://localhost:8080/uploads/photos/<UUID>.jpg \
  -H "Origin: http://localhost:4200"
```
* **Respuesta esperada:** HTTP 200 OK con `Cache-Control: public, max-age=604800` y `Access-Control-Allow-Origin: http://localhost:4200`.

#### 5. Eliminar Fotografía
```bash
curl -i -X DELETE http://localhost:8080/api/v1/athletes/<ATHLETE_UUID>/photo \
  -H "Authorization: Bearer $TUTOR_TOKEN"
```
* **Respuesta esperada:** HTTP 200 OK con `"profilePhotoUrl": null`.

---

### 4.2 Verificación en Interfaz de Usuario (Frontend Angular)

1. **Registro con Fotografía:**
   - Iniciar sesión como tutor legal y hacer clic en **"+ Registrar Nuevo Atleta"**.
   - Completar los datos requeridos y arrastrar o seleccionar una foto JPG/PNG en la sección opcional.
   - Guardar la cédula y verificar que el atleta aparece en la lista con su foto de perfil visible de inmediato.
2. **Simulación de Fallo de Carga de Foto en Registro:**
   - Al registrar un atleta con foto cuando el endpoint de fotos no responda o devuelva error, comprobar que el modal no se cierra inesperadamente: muestra el banner amarillo con el texto *"¡Cédula deportiva creada exitosamente!"*, el mensaje de error y los dos botones de acción: *"🔄 Reintentar Subida de Foto"* e *"Ir al Panel de Tutor"*.
   - Al hacer clic en *"Ir al Panel de Tutor"*, la cédula creada se incorpora al dashboard con su avatar de iniciales sin duplicar registros.
3. **Gestión y Actualización de Foto desde el Dashboard:**
   - En la tarjeta del atleta, hacer clic en el avatar circular o en el botón *"📷 Foto Perfil"*.
   - Subir una nueva imagen y verificar que se actualiza instantáneamente en el dashboard.
   - En el mismo modal, hacer clic en *"Eliminar Fotografía"* y verificar que el avatar vuelve a las iniciales estilizadas.
4. **Directorio de Scouts (`/scout/directory`):**
   - Iniciar sesión como Scout y acceder al directorio.
   - Verificar que los atletas con fotografía cargan la imagen sin errores de red 404 ni bloqueos CORS en la consola del navegador.
5. **Cédula Deportiva Pública (`/atleta/:slug`):**
   - Abrir el enlace público de la cédula del atleta.
   - Verificar que la imagen se renderiza en alta resolución dentro del recuadro hero de la ficha Bento Grid.

---

## 5. Matriz de Criterios de Aceptación (DoD)

| Criterio | Estado | Verificación |
| :--- | :---: | :--- |
| Subida exitosa a `uploads/photos/` sin errores de CORS ni preflight en desarrollo | **CUMPLIDO** | `SecurityConfig` y `WebMvcConfig` con CORS y Cache-Control, verificado en test y cURL. |
| Foto visible inmediatamente en tarjeta del Dashboard (`/dashboard`) | **CUMPLIDO** | `MediaUrlPipe` aplicado en `tutor-dashboard.component.html` en avatares y modal. |
| Foto visible en Directorio de Scouts (`/scout/directory`) y Cédula (`/atleta/:slug`) | **CUMPLIDO** | `MediaUrlPipe` integrado en `scout-directory` y `bento-profile`. |
| Banner de feedback y reintento en modal de registro si falla la foto sin duplicar al atleta | **CUMPLIDO** | `createdAthlete` preservado, banner `photo-retry-banner` con `retryPhotoUpload` y `continueWithoutPhoto`. |
| Eliminación de foto restaura avatar con iniciales y elimina archivo en disco | **CUMPLIDO** | Endpoint DELETE validado en backend y reflejado en UI. |
| Pruebas automatizadas en verde (`./mvnw test` y `npm test`) | **CUMPLIDO** | Backend: 174 tests OK (0 fallos). Frontend: 112 tests OK (0 fallos). Build SSR OK. |

---

## 6. Casos Borde y Validaciones Críticas

* **Prevención de Duplicación:** Si la creación del atleta se completa pero la foto falla, el botón de envío normal se deshabilita y se activan los botones específicos de reintento/continuación, evitando llamadas redundantes a `createAthlete()`.
* **Path Traversal y Seguridad en Storage:** `LocalFileStorageService` valida normalización de rutas y restringe el almacenamiento a subdirectorios autorizados (`photos`, `videos`, `documents`).
* **Resiliencia ante Proxy vs Resolución Directa:** Gracias a la combinación de `proxy.conf.json` en Angular CLI y `MediaUrlPipe` con `environment.backendOrigin`, las imágenes cargan correctamente tanto en entornos `ng serve` como en producción con Nginx y SSR.
