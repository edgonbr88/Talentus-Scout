# Plan de Pruebas: [TS-46] Corrección y Habilitación de Subida Local de Videos (Mock Local) y Reproducción en el Radar de Scouts

**ID Tarea:** TS-46  
**Tarjeta Trello:** [https://trello.com/c/tDePsrD0](https://trello.com/c/tDePsrD0)  
**Fecha:** 2026-10-19  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** `trello_implementer`  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la operatividad integral y libre de bloqueos del ciclo de videos destacados (*highlights*) en ambiente de desarrollo local con el proveedor simulado (`MockLocalVideoStreamProvider`), cubriendo desde la solicitud del ticket, la transferencia binaria de hasta 500 MB, la generación y asignación de miniaturas, hasta la reproducción en el radar de talentos de scouts (`/scout/directory`).

Las correcciones y mejoras implementadas incluyen:
1. **Límites de Carga Multipart (Backend):** Ampliación en `application.yml` de `spring.servlet.multipart.max-file-size` y `max-request-size` de 10 MB a 500 MB.
2. **Configuración CORS y Preflights OPTIONS (Backend):** Registro de `CorsConfigurationSource` en `SecurityConfig.java` admitiendo orígenes de desarrollo local (`localhost:4200`, `127.0.0.1:4200`, `localhost`), métodos HTTP (`GET`, `POST`, `OPTIONS`, etc.), cabeceras de autorización y cabeceras expuestas para streaming (`Accept-Ranges`, `Content-Range`).
3. **Miniaturas Confiables y Respaldo por Defecto (Backend):** Implementación de inicialización garantizada de `default-thumbnail.jpg` (resolución 640x360 con diseño Bento Dark Pitch) en `uploads/videos/` mediante `initDefaultThumbnail()`, asegurando que ninguna tarjeta en el directorio presente imágenes rotas (404), y admisión de miniaturas personalizadas enviadas por el cliente.
4. **Protección LOPNNA / Patria Potestad (Backend):** Validación estricta de que únicamente el usuario con rol `TUTOR` y titular de la patria potestad del menor (`athlete.getTutor().getId().equals(currentUser.getId())`) puede solicitar tickets y cargar videos, rechazando administradores, scouts y tutores no autorizados con `403 FORBIDDEN`.
5. **Streaming HTTP y Salto de Tiempo (Backend):** Verificación de compatibilidad con `ResourceHttpRequestHandler` en `/uploads/videos/**`, retornando código de estado `206 Partial Content` y cabeceras `Accept-Ranges: bytes` y `Content-Range` ante solicitudes de rango.
6. **Manejo de URLs y Miniatura Canvas (Frontend):** En `video-upload.service.ts`, despacho selectivo del token de autenticación (solo para endpoints internos locales, omitiéndolo para proveedores externos como Cloudflare), y conversión del DataURL de Canvas a archivo `thumbnail` en `video-uploader.component.ts`.
7. **Reproducción HTML5 en Radar de Scouts (Frontend):** Visualización fluida del reproductor en `ScoutDirectoryComponent` (`activeVideoModal`) consumiendo URLs locales con controles de reproducción y audio.

### Componentes Impactados
* **Backend (`talentus-scout-be`):**
  * `src/main/resources/application.yml`: Configuración de límites multipart a 500 MB.
  * `com.talentus.scout.config.SecurityConfig`: Bean `CorsConfigurationSource` con orígenes locales y cabeceras expuestas.
  * `com.talentus.scout.config.WebMvcConfig`: Soporte de streaming para `/uploads/videos/**`.
  * `com.talentus.scout.service.VideoService`: Regla de patria potestad, inicialización de `default-thumbnail.jpg` y sobrecarga de `processMockUpload(videoId, file, thumbnail)`.
  * `com.talentus.scout.web.controller.VideoController`: Exposición del parámetro `@RequestParam(value = "thumbnail", required = false) MultipartFile thumbnail` y `@PreAuthorize("hasRole('TUTOR')")`.
  * `src/test/java/com/talentus/scout/web/controller/VideoControllerTest.java`: 11 casos de prueba cubriendo todo el ciclo.
* **Frontend (`talentus-scout-fe`):**
  * `src/app/core/services/video-upload.service.ts`: Envío condicional de JWT y método `dataUrlToFile(...)`.
  * `src/app/features/videos/video-uploader.component.ts`: Despacho de miniatura Canvas generada en cliente.
  * `src/app/features/videos/video-uploader.component.spec.ts`: Suite de pruebas unitarias actualizada y aprobada.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=VideoControllerTest,MockLocalVideoStreamProviderTest
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Errores | Estado |
|---|---|---|---|---|---|
| `VideoControllerTest` | 11 | 11 | 0 | 0 | **PASSED** |
| `MockLocalVideoStreamProviderTest` | 4 | 4 | 0 | 0 | **PASSED** |
| **Total Backend** | **15** | **15** | **0** | **0** | **100% OK** |

#### Casos de Prueba Verificados en Backend:
1. `shouldRequestUploadTicketSuccessfully`: Solicitud exitosa de ticket de carga para un atleta por su tutor, retornando `directUploadUrl` local y límite de `524288000` bytes (500 MB).
2. `shouldPerformMockUploadAndMarkVideoReady`: Subida de video mock, almacenamiento físico en `uploads/videos/` y transición automática a estado `READY`.
3. `shouldPerformMockUploadWithCustomThumbnail`: Subida de video con archivo de miniatura personalizada (`_thumb.jpg`) y almacenamiento exitoso.
4. `shouldServeDefaultThumbnailWith200Ok`: Descarga estática de `/uploads/videos/default-thumbnail.jpg` respondiendo `200 OK` con tipo MIME `image/jpeg`.
5. `shouldServeVideoWithByteRangesAnd206Status`: Solicitud GET con cabecera `Range: bytes=0-10`, respondiendo con código HTTP `206 Partial Content`, `Content-Range` y `Accept-Ranges: bytes`.
6. `shouldHandleWebhookPubliclyAndUpdateVideo`: Procesamiento exitoso de webhook para transicionar videos a `READY` con duración y URLs definitivas.
7. `shouldGetVideosByAthletePublicly`: Consulta pública de videos de un atleta sin requerir autenticación.
8. `shouldRejectUploadTicketWhenAthleteBelongsToAnotherTutor`: Rechazo con `403 FORBIDDEN` si un tutor intenta cargar videos a un atleta que no tutela.
9. `shouldRejectUploadTicketWhenUserIsAdmin`: Rechazo con `403 FORBIDDEN` si un usuario con rol `ADMIN` intenta solicitar tickets de subida deportiva.
10. `shouldRejectUploadTicketWhenUserIsScout`: Rechazo con `403 FORBIDDEN` si un usuario con rol `SCOUT` intenta solicitar tickets de subida.
11. `shouldRejectUploadTicketWhenAthleteNotFound`: Respuesta `404 NOT_FOUND` si el atleta no existe.

---

### 2.2. Frontend (Angular 18+ / Jasmine & Karma)
Comando ejecutado:
```bash
npm test -- --watch=false
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `VideoUploaderComponent` (focalizada) | 7 | 7 | 0 | **PASSED** |
| **Suite Completa Frontend** | **105** | **105** | **0** | **100% OK** |

#### Casos de Prueba Verificados en Frontend:
1. `should create the component with idle status`: Inicialización correcta del componente de carga de video.
2. `should reject file larger than 500MB without calling upload service`: Bloqueo preventivo en cliente ante archivos mayores a 500 MB.
3. `should reject non-video file formats`: Rechazo inmediato de extensiones no permitidas (PDF, TXT, etc.).
4. `should accept valid MP4 file, extract thumbnail and enter selected state`: Extracción de fotograma mediante HTML5 Canvas y preparación de estado.
5. `should request ticket and track upload progress to 100% and then emit videoUploaded`: Flujo completo de solicitud de ticket, progreso HTTP y emisión de evento.
6. `should include thumbnailFile when localThumbnailUrl is available`: Verificación de que la miniatura generada en Canvas se convierte en archivo y se adjunta al multipart.
7. `should handle upload ticket error gracefully`: Manejo resiliente de errores con mensaje visible para el usuario.
8. `should cancel active upload and reset to selected state`: Cancelación de suscripción HTTP y reinicio de estado.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Caso 1: Solicitud de Ticket y Carga Local (cURL)
```bash
# 1. Solicitar ticket de subida como tutor
curl -X POST http://localhost:8080/api/v1/videos/request-upload \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "title": "Jugadas Destacadas vs Caracas FC",
    "category": "HIGHLIGHTS"
  }'

# 2. Subir video y miniatura al endpoint retornado
curl -X POST http://localhost:8080/api/v1/videos/mock-upload/<VIDEO_UUID> \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -F "file=@partido.mp4;type=video/mp4" \
  -F "thumbnail=@miniatura.jpg;type=image/jpeg"
```
* **Respuesta Esperada (`200 OK`):**
```json
{
  "id": "<VIDEO_UUID>",
  "title": "Jugadas Destacadas vs Caracas FC",
  "category": "HIGHLIGHTS",
  "status": "READY",
  "playbackUrl": "http://localhost:8080/uploads/videos/<VIDEO_UUID>_partido.mp4",
  "thumbnailUrl": "http://localhost:8080/uploads/videos/<VIDEO_UUID>_thumb.jpg",
  "durationSeconds": 60
}
```

---

### 3.2. Caso 2: Verificación de Streaming Parcial (Byte Range)
```bash
curl -I -X GET http://localhost:8080/uploads/videos/<VIDEO_UUID>_partido.mp4 \
  -H "Range: bytes=0-1024"
```
* **Cabeceras Esperadas:**
  * `HTTP/1.1 206 Partial Content`
  * `Accept-Ranges: bytes`
  * `Content-Range: bytes 0-1024/<TOTAL_SIZE>`
  * `Content-Type: video/mp4`

---

### 3.3. Caso 3: Interacción en Frontend (Tutor y Scout)
1. Iniciar sesión como tutor legal y navegar a `/dashboard`.
2. Presionar **"Cargar Video"** sobre la tarjeta de un atleta.
3. Arrastrar o seleccionar un video MP4 de prueba:
   * Constatar que se extrae y muestra una miniatura instantánea en pantalla.
   * Constatar que el tamaño se valida correctamente frente al límite de 500 MB.
4. Presionar **"Iniciar Subida"**: la barra de progreso avanza en tiempo real indicando porcentaje y velocidad de transferencia.
5. Al concluir, el modal se cierra y el video aparece registrado en la sección de jugadas.
6. Cerrar sesión e iniciar sesión como un Scout autorizado.
7. Ingresar a `/scout/directory`:
   * La tarjeta del atleta despliega el botón **"Ver Jugadas"** y el icono de video disponible.
   * La miniatura se renderiza sin errores 404.
8. Presionar **"Ver Jugadas"**: se abre el modal con el reproductor HTML5, permitiendo reproducir el video, adelantar/retroceder en la barra de tiempo y controlar el volumen.

---

## 4. Matriz de Criterios de Aceptación (DoD)

- [x] **Capacidad de 500 MB:** El tutor puede subir videos de hasta 500 MB sin recibir errores de tamaño excedido (`MaxUploadSizeExceededException`).
- [x] **Cero Errores CORS:** Configurado `CorsConfigurationSource` en Spring Security, permitiendo preflights `OPTIONS` y solicitudes cruzadas desde `http://localhost:4200`.
- [x] **Miniaturas Confiables (Cero 404):** `default-thumbnail.jpg` se inicializa y persiste físicamente en el servidor, y las miniaturas personalizadas enviadas se asocian limpiamente.
- [x] **Streaming Parcial HTTP (Byte Ranges):** El endpoint `/uploads/videos/**` responde a rangos con `206 Partial Content` y `Accept-Ranges: bytes`, permitiendo navegación en la barra de tiempo en navegadores web.
- [x] **Seguridad LOPNNA:** Solo el tutor legal del atleta tiene autorización para solicitar tickets y subir videos a su perfil.
- [x] **Reproducción en Directorio:** Los veedores pueden reproducir los videos locales desde el radar de talentos sin errores de formato ni de conexión.
- [x] **Pruebas y Build en Verde:** 15 pruebas backend y 105 pruebas frontend aprobadas al 100%, con build de producción libre de errores.

---

## 5. Casos Borde y Validaciones Críticas

* **Archivos Nulos o Vacíos:** Si se intenta invocar `processMockUpload` con un archivo vacío o inexistente, se responde `400 BAD_REQUEST` con mensaje descriptivo.
* **Proveedor Externo vs Mock:** Cuando se use Cloudflare Stream en producción, `video-upload.service.ts` detecta URLs externas y evita enviar cabeceras de autorización internas que puedan ser rechazadas por el CDN.
* **Fallbacks de Miniatura:** Si el navegador no puede extraer un fotograma en Canvas (por ejemplo, en navegadores muy antiguos o durante SSR), el backend recurre de forma transparente a `default-thumbnail.jpg`.
