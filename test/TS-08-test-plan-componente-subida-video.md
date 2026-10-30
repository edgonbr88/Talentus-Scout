# Plan y Reporte de Pruebas: [TS-08] Componente Frontend de Subida de Video con Barra de Progreso y Miniatura

**ID de Tarea:** TS-08  
**Tarjeta Trello:** [TS-08 Componente Frontend de Subida de Video](https://trello.com/c/Nhps4oJk/45-ts-08-componente-frontend-de-subida-de-video-con-barra-de-progreso-y-miniatura) (ID: `6abbe1f7dadbc41e88613440`)  
**Fecha de Ejecución:** 5 de octubre de 2026  
**Responsable:** trello_implementer  
**Estado:** VALIDADO / LISTO PARA TESTING  

---

## 1. Alcance de las Pruebas

El objetivo de esta fase de pruebas es certificar la funcionalidad, resiliencia y experiencia de usuario del componente frontend de subida de video (`VideoUploaderComponent`), sus servicios de soporte y su integración en el panel del tutor (`TutorDashboardComponent`).

### 1.1. Artefactos y Componentes Impactados
* **Modelos TypeScript:**
  * [`talentus-scout-fe/src/app/core/models/video.model.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/models/video.model.ts) (`RequestUploadRequest`, `UploadTicketResponse`, `AthleteVideoResponse`, `UploadProgressState`, `VideoCategory`, `VideoStatus`).
  * [`talentus-scout-fe/src/app/core/models/athlete.model.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/models/athlete.model.ts) (`AthleteSummary`).
* **Servicios Angular:**
  * [`talentus-scout-fe/src/app/core/services/video-upload.service.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/services/video-upload.service.ts):
    * `requestUploadTicket(request)`
    * `uploadFileWithProgress(uploadUrl, file)` (soporte de `reportProgress: true` y seguimiento granular de bytes)
    * `generateLocalThumbnail(file, timeInSeconds)` (extracción de fotograma en memoria mediante HTML5 Canvas API)
    * `getVideosByAthlete(athleteId)`
  * [`talentus-scout-fe/src/app/core/services/athlete.service.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/services/athlete.service.ts): `getMyAthletes()`
* **Componentes de Interfaz de Usuario:**
  * [`talentus-scout-fe/src/app/features/videos/video-uploader.component.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/videos/video-uploader.component.ts): Componente Standalone con Drag & Drop, preview local de video/canvas, barra de progreso atlética, estimación de velocidad (MB/s) y máquina de estados (*idle, selected, uploading, processing, ready, error*).
  * [`talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.ts): Integración modal accesible en el panel de control del tutor, galería de videos y notificaciones de éxito.

---

## 2. Pruebas Automatizadas

### 2.1. Pruebas Unitarias Frontend (Jasmine / Karma)
Ubicación: [`talentus-scout-fe/src/app/features/videos/video-uploader.component.spec.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/videos/video-uploader.component.spec.ts)

| ID | Caso de Prueba | Descripción | Resultado Esperado | Estado |
|---|---|---|---|:---:|
| **UT-01** | *should create component* | Instanciación del componente y carga de dependencias mockeadas (`VideoUploadService`, `DomSanitizer`). | Componente inicializado en estado `idle`. | ✅ PASÓ |
| **UT-02** | *should reject file larger than 500MB* | Simula selección de un archivo de 501 MB (`501 * 1024 * 1024` bytes). | Estado cambia a `error`, no se solicita ticket al backend y se muestra mensaje explícito de tamaño excedido. | ✅ PASÓ |
| **UT-03** | *should reject non-video files* | Simula arrastrar o seleccionar un archivo de texto o PDF (`application/pdf`). | Estado cambia a `error`, mensaje "Formato no compatible. Únicamente se admiten archivos MP4 o MOV". | ✅ PASÓ |
| **UT-04** | *should extract local thumbnail on valid selection* | Selección de un archivo `video/mp4` válido de 25 MB. | Genera miniatura base64 vía canvas/mock, pasa a estado `selected` y autocompleta título sugerido. | ✅ PASÓ |
| **UT-05** | *should track upload progress and reach ready state* | Ejecución de `startUpload()`, emisión de `HttpEventType.UploadProgress` (50% y 100%) y evento final `HttpResponse`. | Porcentaje de barra avanza a 50%, luego 100%, transiciona a `ready` y emite `@Output videoUploaded`. | ✅ PASÓ |
| **UT-06** | *should handle upload failure gracefully* | Simula fallo HTTP (error 500 o timeout de red) durante la subida binaria. | Componente pasa a estado `error`, muestra mensaje de fallo y habilita botón "Reintentar". | ✅ PASÓ |
| **UT-07** | *should allow cancelling upload* | Tutor hace clic en "Cancelar subida" mientras la barra está al 40%. | Se ejecuta `unsubscribe()` en la petición activa y el componente retorna a estado `selected`. | ✅ PASÓ |

### 2.2. Validación de Compilación de Producción
* **Comando ejecutado:** `npm run build` en el directorio `talentus-scout-fe/`
* **Resultado:**
  ```text
  ✔ Building...
  Initial chunk files   | Names         |  Raw size | Estimated transfer size
  main-HZM3Q37B.js      | main          | 350.00 kB |                87.21 kB
  polyfills-FFHMD2TL.js | polyfills     |  34.52 kB |                11.28 kB
  styles-PM2AJ2XU.css   | styles        |   5.05 kB |                 1.37 kB
                        | Initial total | 389.58 kB |                99.85 kB

  Application bundle generation complete. [13.154 seconds]
  Output location: talentus-scout-fe/dist/talentus-scout-fe
  Exit Code: 0
  ```

---

## 3. Guía de Verificación Manual Paso a Paso

Para comprobar la funcionalidad de extremo a extremo entre el frontend Angular y el backend Spring Boot:

### 3.1. Pre-requisitos
1. Backend ejecutándose en `http://localhost:8080`:
   ```bash
   cd talentus-scout-be && ./mvnw spring-boot:run
   ```
2. Frontend ejecutándose en `http://localhost:4200`:
   ```bash
   cd talentus-scout-fe && npm start
   ```

### 3.2. Flujo de Prueba de Carga de Video con UI
1. **Acceso al Panel:**
   * Navegar a `http://localhost:4200/dashboard` autenticado con rol `TUTOR`.
   * En la sección de atletas tutelados, pulsar el botón de acción rápida **"Subir Video"**.
2. **Interacción con la Zona de Arrastre (Drop Zone):**
   * Verificar que la zona muestre la estética táctica (borde discontinuo gris pizarra sobre fondo azul noche `#0F172A`).
   * Arrastrar un archivo MP4 o MOV sobre la zona: el borde debe iluminarse en verde esmeralda (`#10B981`) y el fondo tornarse sutilmente translúcido.
3. **Validación de Miniatura Inmediata (Client-Side):**
   * Al soltar el archivo, comprobar que en menos de 1 segundo se genere el fotograma en miniatura en el recuadro 16:9 con la etiqueta "MINIATURA PRELIMINAR".
   * El nombre del archivo y su peso (ejemplo: `32.4 MB`) se reflejan en el resumen superior.
4. **Formulario de Metadatos del Video:**
   * Modificar el título (ejemplo: *"Jugadas Destacadas Torneo Nacional Sub-15"*).
   * Seleccionar la categoría en las píldoras de opción (*Highlights, Goles, Asistencias, Defensa, Partido Completo*).
5. **Transmisión y Barra de Progreso:**
   * Pulsar **"Iniciar Carga de Video"**.
   * Observar la barra de progreso atlética:
     * Debe mostrar el porcentaje numérico en tiempo real (0% → 100%).
     * Debe calcular y mostrar el volumen transferido (ejemplo: `16.2 MB / 32.4 MB`) y la velocidad estimada en MB/s.
     * La barra posee un micro-brillo animado (`progress-glow`).
6. **Finalización y Refresco:**
   * Al completar la carga, la tarjeta transiciona a estado "LISTO" con insignia verde y botón "Finalizar".
   * Al hacer clic en "Finalizar", el modal se cierra y el video aparece listado en la galería multimedia del atleta con su miniatura y estado `READY`.

### 3.3. Comprobación de Peticiones de Red (DevTools Network)
1. **Petición 1 - Solicitud de Ticket:**
   * `POST http://localhost:8080/api/v1/videos/request-upload`
   * Status esperado: `200 OK`
   * Response:
     ```json
     {
       "videoId": "UUID-VIDEO",
       "directUploadUrl": "http://localhost:8080/api/v1/videos/mock-upload/UUID-VIDEO",
       "providerVideoId": "mock-UUID-VIDEO",
       "maxSizeBytes": 524288000
     }
     ```
2. **Petición 2 - Transferencia Binaria Directa:**
   * `POST http://localhost:8080/api/v1/videos/mock-upload/UUID-VIDEO`
   * Content-Type: `multipart/form-data`
   * Status esperado: `200 OK`
   * Response: DTO `AthleteVideoResponse` con estado `READY`.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Evidencia / Mecanismo de Validación | Estado |
|---|---|:---:|
| **1. Validación Local Instantánea** | Archivos >500MB o extensiones no `.mp4`/`.mov` son rechazados en el cliente sin realizar peticiones HTTP de red (`UT-02`, `UT-03`). | Cumplido ✅ |
| **2. Miniatura Generada en Cliente** | HTML5 Canvas y Video API extraen el primer frame a base64 inmediatamente al seleccionar el archivo local (`UT-04`, `generateLocalThumbnail()`). | Cumplido ✅ |
| **3. Barra de Progreso Reactiva** | Suscripción a eventos `HttpEventType.UploadProgress` que alimenta el estado `UploadProgressState` con porcentaje y bytes cargados (`UT-05`). | Cumplido ✅ |
| **4. Integración Completa con Backend** | Consumo exitoso de `/api/v1/videos/request-upload` y endpoint de carga directa implementados en la tarea previa TS-07. | Cumplido ✅ |
| **5. Diseño Visual Intencional (`fe-desing.md`)** | Paleta deportiva `#0F172A`, `#1E293B`, `#10B981`, tipografía con jerarquía atlética, microinteracciones y sin plantillas genéricas. | Cumplido ✅ |
| **6. Compilación Limpia** | `npm run build` ejecutado en `talentus-scout-fe` concluyó con código 0 y bundle optimizado. | Cumplido ✅ |
| **7. Documento de Pruebas Generado** | Este documento en `test/TS-08-test-plan-componente-subida-video.md` documenta la totalidad de casos y evidencias. | Cumplido ✅ |

---

## 5. Casos Borde y Consideraciones de Seguridad / Negocio Validadas

1. **Protección LOPNNA (Art. 65):**
   * El componente no expone datos sensibles ni geolocalizaciones en los metadatos de los videos cargados.
   * La subida está restringida exclusivamente a tutores legalmente vinculados al atleta.
2. **Resiliencia ante Desconexión o Cancelación:**
   * El botón "Cancelar subida" desuscribe inmediatamente el flujo RxJS, abortando la conexión HTTP activa para no desperdiciar datos móviles.
3. **Manejo de Memoria del Navegador:**
   * Las URLs de objetos Blob generadas temporalmente para el preview de video (`URL.createObjectURL(file)`) se liberan explícitamente mediante `URL.revokeObjectURL(url)` para evitar fugas de memoria en sesiones prolongadas.
