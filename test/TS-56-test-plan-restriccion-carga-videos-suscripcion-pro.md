# Plan y Reporte de Pruebas — [TS-56] Restricción de Carga de Videos para Atletas sin Suscripción Pro Activa

## 1. Identificación de la Tarea
* **ID:** `TS-56`
* **Título:** Restricción de Carga de Videos para Atletas sin Suscripción Pro Activa
* **Tarjeta Trello:** [https://trello.com/c/sTVtZeJm](https://trello.com/c/sTVtZeJm) (ID: `6adb64f82977aff7bdf95c28`)
* **Sprint:** Sprint 4 (Go-Live / Monetización e Infraestructura)
* **Fecha de Ejecución:** 2026-10-23
* **Estado:** Verificado / Listo para Testing
* **Agente Implementador:** `trello_implementer`

---

## 2. Alcance de las Pruebas

### 2.1 Backend (Spring Boot 3 / Java 21)
* **Servicio de Videos (`VideoService.java`):**
  - Inyección de `AthleteSubscriptionRepository`.
  - Método `validateActiveSubscriptionForVideoUpload(Athlete athlete)` que comprueba la existencia de una suscripción en estado `ACTIVE` con fecha de vencimiento posterior al instante actual (`endDate > Instant.now()`).
  - Intercepción y rechazo en `requestUpload(RequestUploadRequest, String)` arrojando `AccessDeniedException` con el mensaje:
    > `"El atleta no cuenta con una suscripción Pro activa para subir videos."`
  - Validación preventiva en `processMockUpload(UUID, MultipartFile, MultipartFile)` ante intentos de carga directa por multipart form data.
* **Controlador REST (`VideoController.java`):**
  - Mapeo automático de `AccessDeniedException` a código HTTP **403 Forbidden**.
  - Respuestas JSON estructuradas ante intentos de carga no autorizados.

### 2.2 Frontend (Angular 18+ / Dashboard del Tutor)
* **Dashboard del Tutor (`tutor-dashboard.component.ts`):**
  - Método centralizado `handleVideoUploadAction(athlete: AthleteSummary)` que evalúa `athlete.subscriptionStatus !== 'ACTIVE'`.
  - Redirección automática al modal de pago (`openCheckoutModal(athlete)`) con notificación informativa si el atleta no tiene membresía Pro.
  - Actualización de `openQuickVideoUploader()` y `selectAthleteForVideo(athlete)` para aplicar la restricción en el flujo rápido.
* **Plantilla y UI (`tutor-dashboard.component.html` & `.css`):**
  - Renderizado del botón `🔒 Cargar Video (Requiere Pro)` con estilo visual bloqueado (`.btn-video-locked`) para atletas sin plan activo.
  - Distintivos visuales en el modal selector rápido de atleta: `.select-badge.pro-badge` (`PRO ACTIVO ➜`) y `.select-badge.locked-badge` (`🔒 REQUIERE PRO`).
* **Cargador de Videos (`video-uploader.component.ts`):**
  - Manejo resiliente de error HTTP 403 proveniente del servidor, desplegando un mensaje claro de suscripción requerida.

---

## 3. Pruebas Automatizadas Ejecutadas

### 3.1 Backend: Suite Específica de Videos
* **Comando:** `./mvnw test -Dtest=VideoServiceTest,VideoControllerTest`
* **Resultado:** **20 tests ejecutados, 0 fallos, 0 errores — BUILD SUCCESS** (Tiempo: ~45 s).
* **Casos Unitarios en `VideoServiceTest`:**
  - [x] `requestUpload_WithActiveSubscription_Succeeds`: Emisión correcta de ticket de subida cuando el atleta tiene plan `ACTIVE` y vigente.
  - [x] `requestUpload_WithoutSubscription_ThrowsAccessDenied`: Rechazo con `AccessDeniedException` y mensaje descriptivo si el atleta no tiene suscripciones.
  - [x] `requestUpload_WithExpiredSubscription_ThrowsAccessDenied`: Rechazo si la suscripción `ACTIVE` tiene `endDate` en el pasado.
  - [x] `requestUpload_WhenUserNotTutorOfAthlete_ThrowsAccessDenied`: Validación de patria potestad de tutor.
  - [x] `processMockUpload_WithoutActiveSubscription_ThrowsAccessDenied`: Bloqueo en carga multipart mock si el atleta no cuenta con membresía activa.
* **Casos de Integración en `VideoControllerTest`:**
  - [x] `shouldRequestUploadTicketSuccessfully`: Retorna HTTP 201 Created cuando el atleta tutorizado cuenta con suscripción Pro activa.
  - [x] `shouldRejectUploadTicketWhenAthleteHasNoSubscription`: Retorna HTTP 403 Forbidden con mensaje *"El atleta no cuenta con una suscripción Pro activa para subir videos."*.
  - [x] `shouldRejectUploadTicketWhenAthleteSubscriptionIsExpired`: Retorna HTTP 403 Forbidden cuando el plan está caducado.
  - [x] `shouldRejectUploadTicketWhenAthleteSubscriptionIsCancelled`: Retorna HTTP 403 Forbidden para planes cancelados / no vigentes.
  - [x] `shouldRejectMockUploadWhenAthleteHasNoSubscription`: Retorna HTTP 403 Forbidden ante subida de archivos multipart para atletas sin Pro.
  - [x] `shouldRejectUploadTicketWhenAthleteBelongsToAnotherTutor`: Retorna HTTP 403 Forbidden por control de acceso tutor.
  - [x] `shouldRejectUploadTicketWhenUserIsAdmin`: Retorna HTTP 403 Forbidden (solo tutores).
  - [x] `shouldRejectUploadTicketWhenUserIsScout`: Retorna HTTP 403 Forbidden (scouts no suben videos).

### 3.2 Frontend: Suite de Pruebas Unitarias
* **Comando:** `npm test -- --watch=false --browsers=ChromeHeadless`
* **Resultado:** **126 tests ejecutados, 0 fallos, 126 SUCCESS (TOTAL: 126 SUCCESS)**.
* **Casos en `tutor-dashboard.component.spec.ts`:**
  - [x] Apertura de cargador de video para atletas con `subscriptionStatus: 'ACTIVE'`.
  - [x] `should redirect to checkout modal when selecting an athlete without active Pro subscription`: Al seleccionar un atleta inactivo en el modal selector, no abre el modal de video y abre el modal de checkout (`showCheckoutModal = true`).
  - [x] `should redirect to checkout modal when handleVideoUploadAction is called on inactive athlete`: Llamada directa a la acción sobre atleta inactivo abre modal de checkout con mensaje contextual.

---

## 4. Guía de Verificación Manual Paso a Paso

### 4.1. Verificación en Frontend (UI / Navegador)
1. Iniciar sesión como tutor registrado con al menos dos atletas:
   - Atleta A con Plan Pro activo (`subscriptionStatus: 'ACTIVE'`).
   - Atleta B sin Plan Pro (`subscriptionStatus: 'INACTIVE'`).
2. **Tarjeta Bento Atleta A:**
   - Comprobar que exhibe el botón verde/estándar `📹 Cargar Video`.
   - Al pulsar el botón, se abre el modal cargador de video (`app-video-uploader`).
3. **Tarjeta Bento Atleta B:**
   - Comprobar que exhibe el botón con borde ámbar y candado: `🔒 Cargar Video (Requiere Pro)`.
   - Al pulsar el botón, **no** se abre el cargador; se despliega inmediatamente el modal de Checkout de Pago Móvil / Binance con el aviso: *"Para subir videos de Atleta B, activa su membresía Pro."*.
4. **Selector Rápido de Videos (Botón superior 'Cargar Video'):**
   - Pulsar el botón general del encabezado para abrir el selector rápido.
   - Observar los distintivos: Atleta A muestra `PRO ACTIVO ➜`, Atleta B muestra `🔒 REQUIERE PRO`.
   - Hacer clic en Atleta B: el selector se cierra y se abre el modal de pago de Atleta B.

### 4.2. Verificación por API REST (cURL)

#### Rechazo de subida sin suscripción Pro activa (HTTP 403 Forbidden):
```bash
curl -X POST http://localhost:8080/api/v1/videos/request-upload \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ID_ATLETA_SIN_PRO>",
    "title": "Prueba de Jugadas Bloqueadas",
    "category": "HIGHLIGHTS"
  }'
```
* **Respuesta Esperada:**
  ```json
  {
    "status": 403,
    "error": "FORBIDDEN",
    "message": "El atleta no cuenta con una suscripción Pro activa para subir videos."
  }
  ```

---

## 5. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| `POST /api/v1/videos/request-upload` rechaza con HTTP 403 a atletas sin suscripción activa | Cumplido | `VideoControllerTest.shouldRejectUploadTicketWhenAthleteHasNoSubscription` |
| Bloqueo estricto ante suscripciones en `PENDING_AUDIT` | Cumplido | `VideoServiceTest.requestUpload_WithExpiredSubscription_ThrowsAccessDenied` y filtro por estado `ACTIVE` estricto |
| Botón de carga en Dashboard muestra indicador de candado `🔒 Cargar Video (Requiere Pro)` | Cumplido | `tutor-dashboard.component.html` líneas 178 y 211, clase `.btn-video-locked` |
| Clic en botón bloqueado abre modal de Checkout con aviso explicativo | Cumplido | `tutor-dashboard.component.spec.ts` y método `handleVideoUploadAction` |
| Selector rápido de atletas identifica estado Pro y redirige al checkout | Cumplido | `tutor-dashboard.component.spec.ts` (`selectAthleteForVideo`) y badges HTML |
| Pruebas unitarias e integración backend pasan al 100% | Cumplido | `./mvnw test -Dtest=VideoServiceTest,VideoControllerTest` (20/20 SUCCESS) |
| Pruebas frontend pasan al 100% | Cumplido | `npm test` (126/126 SUCCESS) |
| Cero regresiones en la suite global del backend | Cumplido | Suite completa `./mvnw test` ejecutada |
