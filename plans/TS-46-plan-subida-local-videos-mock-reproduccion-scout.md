# Plan de Implementación: [TS-46] Corrección y Habilitación de Subida Local de Videos (Mock Local) y Reproducción en el Radar de Scouts

## 1. Identificación
* **ID de la Tarea:** TS-46
* **Título:** Corrección y habilitación de subida local de videos (mock local) y reproducción en el radar de scouts
* **Enlace a Trello:** [https://trello.com/c/tDePsrD0](https://trello.com/c/tDePsrD0)
* **ID Tarjeta Trello:** `6ad614e6a215e922e311149b`
* **Sprint Asignado:** Sprint 4
* **Responsable Asignado:** `trello_implementer`

---

## 2. Resumen y Contexto de Negocio
Para que los scouts y directores deportivos puedan evaluar fehacientemente a los jóvenes atletas en Talentus Scout, los videos de compilados y jugadas destacadas (*highlights*) son un activo de valor crítico. Los tutores legales deben poder cargar estos contenidos de forma rápida, intuitiva y sin fricciones técnicas.

En el entorno de desarrollo local y pre-producción con proveedor simulado (`MockLocalVideoStreamProvider`), se identificaron obstáculos técnicos que bloqueaban el flujo:
1. **Límites de tamaño en Spring Boot:** El tamaño máximo de multipart en `application.yml` estaba configurado en solo `10MB`, rechazando cualquier video mayor a ese umbral a pesar de que la plataforma promete hasta `500MB`.
2. **Ausencia de configuración CORS:** Spring Security no tenía un bean `CorsConfigurationSource` registrado, lo que causaba que las peticiones preflight `OPTIONS` desde Angular (`http://localhost:4200`) hacia los endpoints de video del backend (`http://localhost:8080`) fueran rechazadas por el navegador.
3. **Miniaturas inexistentes (Error 404):** El backend asignaba una URL por defecto (`default-thumbnail.jpg`), pero el archivo no existía físicamente en el directorio `uploads/videos/`, provocando imágenes rotas en el radar de talentos.
4. **Soporte de streaming parcial HTTP (Byte Ranges):** Para una reproducción fluida con barra de desplazamiento (scrubbing) y compatibilidad con navegadores modernos, el endpoint de recursos estáticos de videos debe responder con código `206 Partial Content` y cabeceras `Accept-Ranges: bytes`.
5. **Protección LOPNNA / Patria Potestad:** Estricta validación de que únicamente el tutor legal registrado del menor puede solicitar tickets y cargar videos a su perfil deportivo.

---

## 3. Arquitectura y Modelo de Datos
La tabla `athlete_videos` existente en PostgreSQL ya cuenta con los campos necesarios (`playback_url`, `thumbnail_url`, `status`, `duration_seconds`, `sort_order`). Por tanto:
* **Cambios DDL:** No requiere nuevas migraciones SQL ni cambios de esquema.
* **Almacenamiento Físico Local:** Los archivos de video y miniaturas se almacenan en el sistema de archivos del servidor backend bajo `uploads/videos/`.

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Configuración de Multipart (`application.yml`)
* Archivo: `talentus-scout-be/src/main/resources/application.yml`
* Actualizar límites de multipart de `10MB` a `500MB`:
```yaml
  servlet:
    multipart:
      max-file-size: 500MB
      max-request-size: 500MB
```

### 4.2. Configuración CORS (`SecurityConfig.java`)
* Archivo: `talentus-scout-be/src/main/java/com/talentus/scout/config/SecurityConfig.java`
* Registrar bean `CorsConfigurationSource` habilitando:
  * Orígenes: `http://localhost:4200`, `http://localhost`, `http://127.0.0.1:4200`, `http://127.0.0.1`
  * Métodos: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `PATCH`, `HEAD`
  * Cabeceras permitidas: `Authorization`, `Content-Type`, `Range`, `Accept`, `Origin`, `X-Requested-With`
  * Cabeceras expuestas: `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Disposition`
  * `allowCredentials(true)`
  * Mantener ruta pública `/uploads/**` en los `requestMatchers`.

### 4.3. Servicio de Video (`VideoService.java`)
* Archivo: `talentus-scout-be/src/main/java/com/talentus/scout/service/VideoService.java`
* **Validación de Patria Potestad en `requestUpload`:**
  * Si `currentUserEmail == null` o el usuario no existe, denegar con `AccessDeniedException`.
  * Si `currentUser.getRole() != UserRole.TUTOR` o el atleta no tiene tutor o `!athlete.getTutor().getId().equals(currentUser.getId())`, lanzar `AccessDeniedException("No tienes autorización para cargar videos de este atleta. Solo el tutor legal puede realizar esta acción.")`.
* **Procesamiento de Mock Upload (`processMockUpload`):**
  * Sobrecargar / ampliar para aceptar `(UUID videoId, MultipartFile file, MultipartFile thumbnail)`.
  * Guardar el archivo de video en `uploads/videos/{videoId}_{filename}`.
  * Si se proporciona `thumbnail` válido (no vacío), guardarlo como `uploads/videos/{videoId}_thumb.jpg` y asignar `thumbnailUrl`.
  * Si no se proporciona `thumbnail`, asignar `thumbnailUrl = baseUrl + "/uploads/videos/default-thumbnail.jpg"`.
* **Inicialización Garantizada de `default-thumbnail.jpg`:**
  * Implementar método `@PostConstruct public void initDefaultThumbnail()` que verifique la existencia del directorio `uploads/videos/` y genere/escriba un archivo JPEG por defecto (`default-thumbnail.jpg`) con resolución 640x360 si aún no existe, evitando respuestas 404.

### 4.4. Controlador de Video (`VideoController.java`)
* Archivo: `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/VideoController.java`
* Endpoint `POST /api/v1/videos/mock-upload/{videoId}`:
  * Permitir parámetro opcional `@RequestParam(value = "thumbnail", required = false) MultipartFile thumbnail`.
  * Delegar en `videoService.processMockUpload(videoId, file, thumbnail)`.

### 4.5. Configuración de Recursos Estáticos y Streaming (`WebMvcConfig.java`)
* Archivo: `talentus-scout-be/src/main/java/com/talentus/scout/config/WebMvcConfig.java`
* Configurar `ResourceHandlerRegistration` para `/uploads/videos/**` y `/uploads/**` garantizando la resolución canónica de rutas y compatibilidad con `ResourceHttpRequestHandler` para solicitudes parciales HTTP 206.

---

## 5. Especificación Frontend (Angular 18+ / Bento Design System)

### 5.1. Servicio de Subida (`video-upload.service.ts`)
* Archivo: `talentus-scout-fe/src/app/core/services/video-upload.service.ts`
* En `uploadFileWithProgress(uploadUrl: string, file: File, thumbnailFile?: File)`:
  * Adjuntar `thumbnail` en el `FormData` si se suministra.
  * Condicionar el envío del encabezado `Authorization: Bearer <token>`: adjuntarlo cuando la URL corresponda a nuestro backend local (`/api/` o mismo origen), pero omitirlo si la URL es de un proveedor externo (Cloudflare Direct Upload), previniendo rechazos CORS/Auth de terceros.

### 5.2. Componente de Subida (`video-uploader.component.ts`)
* Archivo: `talentus-scout-fe/src/app/features/videos/video-uploader.component.ts`
* Convertir la miniatura local obtenida vía Canvas (`localThumbnailUrl` en formato base64 DataURL) en un objeto `File` tipo `image/jpeg` antes de iniciar la subida y enviarlo como parámetro adicional a `videoUploadService.uploadFileWithProgress(...)`.
* Manejo robusto del estado tras la finalización: emitir evento `videoUploaded`, resetear selección y permitir cierre limpio.

### 5.3. Reproducción en Radar de Scouts (`scout-directory.component.ts` y `video-player.component.ts`)
* Archivos:
  * `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.ts`
  * `talentus-scout-fe/src/app/shared/components/video-player/video-player.component.ts`
* Verificar que cuando el scout haga clic en "Ver Jugadas" (`openVideoModal`):
  * El modal despliegue `app-video-player` con `featuredVideoPlaybackUrl` y `featuredVideoThumbnailUrl`.
  * El reproductor HTML5 soporte reproducción de archivos MP4 locales con barra de tiempo y audio sin errores de consola.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Automatizadas Backend (JUnit 5 / Spring Boot Test)
* Archivo: `talentus-scout-be/src/test/java/com/talentus/scout/web/controller/VideoControllerTest.java`
* Casos a ejecutar y validar:
  1. `shouldRequestUploadTicketSuccessfully`: Verificación de generación de ticket con tamaño máximo de 500 MB.
  2. `shouldPerformMockUploadAndMarkVideoReady`: Subida de archivo de video local y transición a estado `READY`.
  3. `shouldPerformMockUploadWithCustomThumbnail`: Subida de video adjuntando archivo de miniatura personalizada.
  4. `shouldRejectUploadWhenUserIsNotTutor`: Rechazo con `403 FORBIDDEN` si el usuario no es el tutor legal del atleta.
  5. `shouldServeVideoWithByteRangesAnd206Status`: Solicitud GET a `/uploads/videos/...` con cabecera `Range: bytes=0-10`, respondiendo con HTTP `206 Partial Content`.
  6. `shouldServeDefaultThumbnailWith200Ok`: Solicitud GET a `/uploads/videos/default-thumbnail.jpg` respondiendo con `200 OK` y `Content-Type: image/jpeg`.
* Comando de ejecución:
```bash
./mvnw test -Dtest=VideoControllerTest,MockLocalVideoStreamProviderTest
```

### 6.2. Pruebas Automatizadas Frontend (Angular / Jasmine)
* Archivo: `talentus-scout-fe/src/app/features/videos/video-uploader.component.spec.ts`
* Casos a ejecutar y validar:
  1. Validación de tamaño máximo de 500 MB.
  2. Generación y despacho de miniatura junto con el video.
  3. Manejo de progreso y despacho de eventos al finalizar.
* Comando de ejecución:
```bash
npm test -- --include src/app/features/videos/video-uploader.component.spec.ts --watch=false
```

### 6.3. Verificación Manual End-to-End
1. Iniciar sesión como tutor legal y acceder a `/dashboard`.
2. Abrir el modal de carga de videos para un atleta.
3. Seleccionar un archivo de video MP4 y verificar que se genera la miniatura previa en Canvas.
4. Presionar "Subir Video": la barra de progreso avanza, concluye la carga y actualiza el listado.
5. Iniciar sesión como Scout y navegar a `/scout/directory`.
6. Constatar que el atleta muestra el botón "Ver Jugadas" y el badge de video.
7. Presionar "Ver Jugadas": el modal abre el reproductor HTML5 y el video se reproduce fluidamente.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Backend - Configuración de Límites Multipart**
  - Modificar `application.yml` elevando `max-file-size` y `max-request-size` a `500MB`.
- [x] **Paso 2: Backend - Configuración CORS en Spring Security**
  - Modificar `SecurityConfig.java` agregando el bean `CorsConfigurationSource` con los orígenes locales permitidos.
- [x] **Paso 3: Backend - Generación y Respaldo de default-thumbnail.jpg**
  - Implementar en `VideoService.java` la creación automática de `default-thumbnail.jpg` en `uploads/videos/` si no existe.
- [x] **Paso 4: Backend - Corrección de Patria Potestad y Soporte de Miniatura en Mock Upload**
  - Modificar `VideoService.java` para verificar estrictamente la patria potestad del tutor legal en `requestUpload`.
  - Modificar `VideoService.java` y `VideoController.java` para aceptar miniatura opcional en `processMockUpload`.
- [x] **Paso 5: Backend - Pruebas Automatizadas**
  - Actualizar `VideoControllerTest.java` cubriendo la subida con miniatura, byte-ranges y seguridad.
  - Ejecutar `./mvnw test -Dtest=VideoControllerTest,MockLocalVideoStreamProviderTest` y asegurar que todas pasen.
- [x] **Paso 6: Frontend - Manejo de URLs y Miniatura en VideoUploadService**
  - Modificar `video-upload.service.ts` para gestionar cabeceras de autorización condicionales y soporte de miniatura.
- [x] **Paso 7: Frontend - Envío de Miniatura en VideoUploaderComponent**
  - Modificar `video-uploader.component.ts` para transformar el DataURL de Canvas a File y adjuntarlo en la subida.
- [x] **Paso 8: Frontend - Pruebas Automatizadas y Compilación**
  - Actualizar pruebas en `video-uploader.component.spec.ts`.
  - Ejecutar `npm test` y verificar 100% de éxito.
  - Ejecutar `npm run build` para asegurar compilación limpia sin errores.
- [x] **Paso 9: Documentación y Transición de Trello**
  - Crear el plan de pruebas en `test/TS-46-test-plan-subida-local-videos-mock-reproduccion-scout.md`.
  - Mover la tarjeta Trello `TS-46` a `in testing` mediante script.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
1. **Capacidad de 500 MB:** El tutor puede subir videos de hasta 500 MB sin recibir errores de tamaño excedido de Spring Boot.
2. **Cero Errores CORS:** Las peticiones `OPTIONS` y `POST` desde el frontend Angular (`localhost:4200`) son aceptadas limpiamente por el backend.
3. **Miniaturas Confiables (Cero 404):** `default-thumbnail.jpg` existe físicamente en el servidor y las miniaturas personalizadas se asignan correctamente.
4. **Streaming Parcial HTTP (Byte Ranges):** El endpoint `/uploads/videos/**` responde a rangos con `206 Partial Content`, permitiendo salto de tiempo en navegadores.
5. **Seguridad LOPNNA:** Solo el tutor legal del atleta tiene autorización para solicitar tickets y subir videos a su perfil.
6. **Reproducción en Directorio:** Los veedores pueden reproducir los videos locales desde el radar de talentos sin errores de reproducción.
7. **Pruebas y Build en Verde:** Todas las pruebas automatizadas backend y frontend pasan al 100% y el build compila sin advertencias.
