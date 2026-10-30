# Plan de Pruebas — [TS-41] Carga y Gestión de Foto de Perfil del Atleta (Dashboard Tutor, Registro y Cédula Deportiva)

## 1. Alcance de las Pruebas

### 1.1 Entidades y Servicios Impactados
* **Base de Datos:** Tabla `athletes` (columna persistente `profile_photo_url TEXT`).
* **Servicio de Almacenamiento:** `LocalFileStorageService` (`uploads/photos/`), validando prevención de path traversal y eliminación de archivos huérfanos.
* **Backend (Spring Boot 3 / Java 21):**
  * `AthleteService.java`: `uploadProfilePhoto(UUID, MultipartFile)` y `deleteProfilePhoto(UUID)`.
  * `AthleteController.java`: Endpoints `POST /api/v1/athletes/{id}/photo` y `DELETE /api/v1/athletes/{id}/photo`.
  * `AthleteSecurity.java`: Evaluación de autorización con `@athleteSecurity.isOwner(#id, authentication)`.
* **Frontend (Angular 18+):**
  * `AthleteService` (`athlete.service.ts`): Métodos `uploadAthletePhoto(athleteId, file)` y `deleteAthletePhoto(athleteId)`.
  * `TutorDashboardComponent`:
    * Avatar interactivo con overlay hover (`📷`) y click handler.
    * Botón de acción `📷 Foto Perfil`.
    * Modal interactivo `photo-modal-box` con preview dinámico, dropzone drag-and-drop, validación reactiva de formato y tamaño (<= 5MB), aviso legal LOPNNA Art. 65, botón de carga y confirmación de eliminación de foto.
  * `RegisterAthleteModalComponent`:
    * Sección opcional de carga de foto con selector/preview circular, descarte previo y advertencia legal.
    * Encadenamiento en `onSubmit()` que sube la imagen inmediatamente después de crear la cédula deportiva.
  * `BentoProfileComponent` y `ScoutDirectoryComponent`:
    * Renderizado armonioso con `object-fit: cover` y fallback a iniciales cuando la foto no está presente.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1 Backend (Spring Boot 3 / JUnit 5 + MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=AthletePhotoControllerTest
```
**Resultados:**
* `uploadProfilePhoto_AsOwner_Success`: **PASSED** — Retorna HTTP 200 OK y URL persistida que inicia con `/uploads/photos/`.
* `uploadProfilePhoto_AsOtherTutor_Forbidden`: **PASSED** — Retorna HTTP 403 Forbidden cuando un tutor no dueño intenta cargar una foto para el atleta.
* `uploadProfilePhoto_InvalidFormat_BadRequest`: **PASSED** — Retorna HTTP 400 Bad Request cuando se envía un archivo no soportado (PDF).
* `uploadProfilePhoto_Exceeds5MB_BadRequest`: **PASSED** — Retorna HTTP 400 Bad Request al enviar un archivo que supera los 5MB permitidos.
* `deleteProfilePhoto_AsOwner_Success`: **PASSED** — Retorna HTTP 200 OK y setea `profilePhotoUrl` a `null`, eliminando el archivo físico.
* `deleteProfilePhoto_AsOtherTutor_Forbidden`: **PASSED** — Retorna HTTP 403 Forbidden cuando otro tutor intenta eliminar la foto.
* **Resumen Suite Backend:** **6 de 6 pruebas aprobadas (100% éxito)**.

### 2.2 Frontend (Angular 18+ / Karma + Headless Chrome)
Comando ejecutado:
```bash
npm test -- --watch=false
```
**Resultados:**
* **82 pruebas unitarias ejecutadas, 82 aprobadas exitosamente (100% éxito)**.
* Cobertura de nuevas pruebas en:
  * `TutorDashboardComponent`: Apertura de modal desde avatar, apertura desde barra de acciones, renderizado del disclaimer LOPNNA Art. 65, rechazo reactivo de archivos no válidos o mayores a 5MB, guardado exitoso con actualización de lista y eliminación confirmada de foto.
  * `RegisterAthleteModalComponent`: Inicialización del formulario, previsualización de imagen seleccionada, rechazo de formatos no válidos, remoción de imagen antes de envío y encadenamiento de creación de atleta + subida de foto.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1 Verificación Backend vía cURL

1. **Iniciar sesión como tutor legal:**
```bash
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor@talentus.app","password":"Password123*"}' \
  | jq -r '.token')
```

2. **Obtener el ID de un atleta del tutor:**
```bash
ATHLETE_ID=$(curl -s -X GET http://localhost/api/v1/athletes/my-athletes \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].id')
```

3. **Subir una fotografía deportiva de perfil:**
```bash
curl -X POST "http://localhost/api/v1/athletes/${ATHLETE_ID}/photo" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/ruta/a/foto-atleta.jpg;type=image/jpeg"
```
*Respuesta esperada:* HTTP `200 OK` con JSON del atleta donde `"profilePhotoUrl"` contiene `/uploads/photos/<uuid>.jpg`.

4. **Intentar subir archivo con formato inválido (ej. PDF):**
```bash
curl -X POST "http://localhost/api/v1/athletes/${ATHLETE_ID}/photo" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/ruta/a/documento.pdf;type=application/pdf"
```
*Respuesta esperada:* HTTP `400 Bad Request` con mensaje indicando `"Formato no permitido"`.

5. **Eliminar la fotografía deportiva:**
```bash
curl -X DELETE "http://localhost/api/v1/athletes/${ATHLETE_ID}/photo" \
  -H "Authorization: Bearer $TOKEN"
```
*Respuesta esperada:* HTTP `200 OK` con JSON del atleta donde `"profilePhotoUrl"` es `null`.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Detalle de Verificación |
| :--- | :---: | :--- |
| Carga de foto (JPG, PNG, WEBP, máx 5MB) desde Dashboard y modal de registro | **CUMPLIDO** | Validado tanto en `openPhotoModal()` como en `RegisterAthleteModalComponent` con controles reactivos y encadenamiento. |
| Previsualización antes de guardar y disclaimer LOPNNA Art. 65 | **CUMPLIDO** | Previsualización circular reactiva (`FileReader`) y banner de salvaguarda legal presente en ambos modales. |
| Visibilidad en Dashboard, Cédula Pública y Directorio de Scouts | **CUMPLIDO** | Se actualiza la URL y los componentes renderizan con `object-fit: cover` y fallback a iniciales. |
| Reemplazo limpio y eliminación del archivo físico previo | **CUMPLIDO** | Invocación a `fileStorageService.deleteFile()` antes de guardar la nueva foto en disco. |
| Eliminación voluntaria de la foto restableciendo iniciales | **CUMPLIDO** | Endpoint `DELETE` y modal con confirmación de dos pasos ejecutados y probados. |
| Aislamiento de seguridad y control de propiedad (403 Forbidden) | **CUMPLIDO** | `@athleteSecurity.isOwner` restringe peticiones de otros tutores o anónimos. |
| Validación de tamaño >5MB y formatos no soportados | **CUMPLIDO** | Rechazo con mensajes comprensibles tanto en backend (HTTP 400) como en frontend antes de enviar. |
| Pruebas automatizadas y compilación exitosa | **CUMPLIDO** | Backend: 6/6 tests pasando; Frontend: 82/82 tests pasando; Build SSR exitoso. |
| Despliegue Docker actualizado | **CUMPLIDO** | Imágenes reconstruidas y servicios corriendo saludablemente. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas
1. **Prevención de Archivos Huérfanos:** Cuando un tutor cambia la foto múltiples veces o la elimina, la ruta previa se limpia en disco mediante `Files.deleteIfExists` evitando saturación de almacenamiento.
2. **Path Traversal Protection:** `LocalFileStorageService` verifica `targetLocation.startsWith(baseStorageLocation)` asegurando que nombres maliciosos no escapen de `/uploads/photos/`.
3. **MIME Spoofing / Extensiones Discrepantes:** Se verifica tanto la extensión del nombre de archivo como el Content-Type de la cabecera HTTP.
4. **Fallback Visual Robusto:** Si el atleta no tiene foto, ningún componente rompe la interfaz: todos presentan el avatar circular con las iniciales del atleta sobre fondo deportivo contrastante.
