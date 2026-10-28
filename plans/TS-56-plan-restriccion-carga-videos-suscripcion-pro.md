# Plan de Implementación: [TS-56] Restricción de Carga de Videos para Atletas sin Suscripción Pro Activa

**ID Tarea:** TS-56  
**Tarjeta Trello:** [https://trello.com/c/sTVtZeJm](https://trello.com/c/sTVtZeJm) (ID: `6adb64f82977aff7bdf95c28`)  
**Fecha:** 2026-10-23  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Planificador:** `trello_planner`  
**Agente Implementador Asignado:** `trello_implementer`  
**Sprint:** Sprint 4 (Go-Live / Infraestructura y Monetización)  

---

## 1. Contexto de Negocio y Justificación

### 1.1. Justificación y Valor para el Negocio
La subida, almacenamiento y distribución de material audiovisual (clips de jugadas, highlights tácticos y videos técnicos de atletas juveniles) constituyen la operación de mayor consumo de ancho de banda y almacenamiento de la infraestructura de Talentus Scout (Cloudflare Stream / Cloud Storage / discos locales).
Para asegurar la viabilidad financiera del modelo MVP freemium/pro y prevenir costos de infraestructura desmedidos, la plataforma debe restringir la capacidad de subida de videos exclusivamente a los atletas que dispongan de una membresía Pro activa (`SubscriptionStatus.ACTIVE` y vigencia temporal no caducada).

### 1.2. Consideraciones Legales y de Protección al Menor (LOPNNA Art. 65 / FIFA)
* La carga de videos de menores debe estar estrictamente regulada bajo la supervisión de tutores con patria potestad documentada y cuenta verificada.
* Si la suscripción de un atleta vence, los videos previamente cargados **no se eliminan** (preservación de datos deportivos del menor), pero la subida de nuevo material se bloquea de inmediato y su visibilidad en el Directorio Nacional de Scouts queda pausada de acuerdo con las reglas de negocio existentes.
* Los pagos en estado de conciliación (`PENDING_AUDIT`), ya sea por Pago Móvil o Binance, mantienen la subida de videos bloqueada de forma preventiva hasta que el administrador verifique y apruebe formalmente la transacción.

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Backend Afectados:**
  - `com.talentus.scout.service.VideoService`: Inyección de `AthleteSubscriptionRepository` y validación de suscripción activa con fecha vigente.
  - `com.talentus.scout.web.controller.VideoController`: Respuestas consistentes con HTTP 403 Forbidden cuando la subida sea denegada.
  - `com.talentus.scout.service.VideoServiceTest` y `VideoControllerTest`: Cobertura exhaustiva de pruebas unitarias y de integración.
* **Componentes Frontend Afectados:**
  - `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.ts`: Lógica de apertura condicionada al estado de membresía.
  - `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.html`: Renderizado del botón `🔒 Cargar Video (Requiere Pro)` y adaptación del modal selector rápido de atletas.
  - `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.css`: Estilos visuales del botón con candado y badges de estado.
  - `talentus-scout-fe/src/app/features/videos/video-uploader.component.ts`: Manejo resiliente de error HTTP 403 ante llamadas no autorizadas.
  - `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.spec.ts`: Pruebas de interacción y redirección.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)

* No se requieren migraciones DDL ni modificaciones en tablas relacionales.
* Se reutilizan las entidades existentes:
  - `athlete_subscriptions` (tabla con columnas `athlete_id`, `plan_id`, `status`, `start_date`, `end_date`).
  - `SubscriptionStatus` (`ACTIVE`, `EXPIRED`, `CANCELLED`).
  - `PaymentStatus` (`PENDING_AUDIT`, `APPROVED`, `REJECTED`).
* Consulta JPA de validación:
  ```java
  athleteSubscriptionRepository.findFirstByAthleteIdAndStatusOrderByEndDateDesc(athleteId, SubscriptionStatus.ACTIVE);
  ```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Servicio de Video (`VideoService.java`)
* Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/service/VideoService.java`
* Inyectar:
  ```java
  private final AthleteSubscriptionRepository athleteSubscriptionRepository;
  ```
* Implementar método auxiliar privado de validación:
  ```java
  private void validateActiveSubscriptionForVideoUpload(Athlete athlete) {
      Instant now = Instant.now();
      boolean hasActiveSubscription = athleteSubscriptionRepository
              .findFirstByAthleteIdAndStatusOrderByEndDateDesc(athlete.getId(), SubscriptionStatus.ACTIVE)
              .filter(sub -> sub.getEndDate() != null && sub.getEndDate().isAfter(now))
              .isPresent();

      if (!hasActiveSubscription) {
          log.warn("Intento de subida de video denegado para atleta {} (ID: {}). No cuenta con suscripción Pro activa.",
                  athlete.getFirstName() + " " + athlete.getLastName(), athlete.getId());
          throw new AccessDeniedException("El atleta no cuenta con una suscripción Pro activa para subir videos.");
      }
  }
  ```
* Invocar `validateActiveSubscriptionForVideoUpload(athlete)` en:
  1. `requestUpload(RequestUploadRequest request, String currentUserEmail)`: inmediatamente después de validar la patria potestad del tutor.
  2. `processMockUpload(UUID videoId, MultipartFile file, MultipartFile thumbnail)`: tras recuperar el `AthleteVideo` y su respectivo `athlete`.

### 4.2. Manejo de Errores y HTTP Status
* Cuando `AccessDeniedException` sea arrojada, Spring Security y el manejador global retornan código **HTTP 403 Forbidden** con el cuerpo JSON:
  ```json
  {
    "status": 403,
    "error": "Forbidden",
    "message": "El atleta no cuenta con una suscripción Pro activa para subir videos."
  }
  ```

### 4.3. Pruebas Backend
* **`VideoServiceTest.java`:**
  - `requestUpload_WithActiveSubscription_Succeeds`: Verifica generación de ticket de carga cuando la suscripción es `ACTIVE` y vigente.
  - `requestUpload_WithoutSubscription_ThrowsAccessDenied`: Verifica rechazo con mensaje exacto cuando no existen suscripciones para el atleta.
  - `requestUpload_WithExpiredSubscription_ThrowsAccessDenied`: Verifica rechazo cuando la suscripción está en el pasado.
  - `requestUpload_WithPendingAuditSubscription_ThrowsAccessDenied`: Verifica rechazo cuando el pago está en `PENDING_AUDIT`.
  - `processMockUpload_WithoutActiveSubscription_ThrowsAccessDenied`: Verifica rechazo en la carga mock local si la membresía expiró.
* **`VideoControllerTest.java`:**
  - Petición POST a `/api/v1/videos/request-upload` retornando HTTP 403 ante `AccessDeniedException`.

---

## 5. Especificación Frontend (Angular 18+ / Standalone)

### 5.1. Dashboard del Tutor (`tutor-dashboard.component.ts`)
* Ruta: `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.ts`
* Ajustar métodos de acción:
  ```typescript
  handleVideoUploadAction(athlete: AthleteSummary): void {
    if (athlete.subscriptionStatus !== 'ACTIVE') {
      this.lastUploadedNotice = `Para subir videos de ${athlete.fullName}, activa su membresía Pro.`;
      this.openCheckoutModal(athlete);
      return;
    }
    this.openVideoUploaderForAthlete(athlete);
  }
  ```
* Ajustar selector rápido de atletas (`selectAthleteForVideo`):
  ```typescript
  selectAthleteForVideo(athlete: AthleteSummary): void {
    this.showAthleteSelectorModal = false;
    this.handleVideoUploadAction(athlete);
  }
  ```

### 5.2. Plantilla HTML del Dashboard (`tutor-dashboard.component.html`)
* Ruta: `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.html`
* En las tarjetas Bento de Atletas (líneas ~172 y ~206):
  - Sustituir los botones directos por llamada a `handleVideoUploadAction(athlete)`:
  - Cuando `athlete.subscriptionStatus !== 'ACTIVE'`:
    - Mostrar botón con icono de candado y estilo bloqueado:
      ```html
      <button
        class="btn btn-secondary btn-sm btn-locked"
        (click)="handleVideoUploadAction(athlete)"
        type="button"
        title="Requiere membresía Pro activa para subir videos">
        🔒 Cargar Video (Requiere Pro)
      </button>
      ```
  - Cuando `athlete.subscriptionStatus === 'ACTIVE'`:
    - Mostrar botón habitual:
      ```html
      <button
        class="btn btn-secondary btn-sm btn-video"
        (click)="handleVideoUploadAction(athlete)"
        type="button">
        📹 Cargar Video
      </button>
      ```
* En el modal selector rápido (`showAthleteSelectorModal`):
  - Mostrar badge indicador en cada opción:
    - Si `athlete.subscriptionStatus === 'ACTIVE'`: badge verde `PRO ACTIVO ➜`.
    - Si `athlete.subscriptionStatus !== 'ACTIVE'`: badge ámbar/candado `🔒 REQUIERE PRO`.

### 5.3. Estilos (`tutor-dashboard.component.css`)
* Añadir estilos coherentes con la estética deportiva oscura de Talentus Scout:
  ```css
  .btn-locked {
    background: rgba(30, 41, 59, 0.7);
    border: 1px dashed rgba(245, 158, 11, 0.4);
    color: #FCD34D;
  }
  .btn-locked:hover {
    background: rgba(245, 158, 11, 0.15);
    border-color: #F59E0B;
    color: #FDE68A;
  }
  .select-badge.locked {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.3);
    color: #FCD34D;
  }
  ```

### 5.4. Cargador de Videos (`video-uploader.component.ts`)
* En el método `startUpload()`:
  - En el callback de error de `this.videoService.requestUpload(...)`:
    - Si `err.status === 403`:
      - Mostrar `this.errorMessage = err.error?.message || 'El atleta no cuenta con una suscripción Pro activa para subir videos.';`

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Automatizadas Backend
* Ejecutar: `./mvnw test -Dtest=VideoServiceTest,VideoControllerTest`
* Ejecutar suite completa: `./mvnw test`
* Comprobar que no hay regresiones en las 191 pruebas existentes.

### 6.2. Pruebas Automatizadas Frontend
* Ejecutar: `npm test -- --watch=false` en `talentus-scout-fe` o validar con `tutor-dashboard.component.spec.ts`.

### 6.3. Verificación Manual
1. Iniciar sesión como tutor con un atleta sin plan activo (`subscriptionStatus: 'INACTIVE'`).
2. Verificar que el botón muestre `🔒 Cargar Video (Requiere Pro)`.
3. Pulsar el botón y verificar que se abra directamente el modal de Checkout con aviso explicativo.
4. Realizar petición cURL directa a `/api/v1/videos/request-upload` con token JWT del tutor y verificar respuesta `403 Forbidden`.
5. Activar suscripción (o simular en base de datos estado `ACTIVE`) y comprobar que el botón cambie a `📹 Cargar Video` y permita subir el video normalmente.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Backend - Inyección y Validación de Suscripción en `VideoService.java`**
  - [x] Inyectar `AthleteSubscriptionRepository`.
  - [x] Añadir método `validateActiveSubscriptionForVideoUpload(Athlete athlete)`.
  - [x] Aplicar validación en `requestUpload` y `processMockUpload`.
- [x] **Paso 2: Backend - Pruebas Unitarias e Integración**
  - [x] Actualizar / añadir casos en `VideoServiceTest.java`.
  - [x] Actualizar / añadir casos en `VideoControllerTest.java`.
  - [x] Correr `./mvnw test -Dtest=VideoServiceTest,VideoControllerTest`.
- [x] **Paso 3: Frontend - Lógica y Métodos en `tutor-dashboard.component.ts`**
  - [x] Implementar `handleVideoUploadAction(athlete)`.
  - [x] Ajustar `selectAthleteForVideo(athlete)` para redirigir a checkout si no tiene Pro.
- [x] **Paso 4: Frontend - Plantilla y Estilos en `tutor-dashboard`**
  - [x] Modificar botones de carga en Bento card (`tutor-dashboard.component.html`).
  - [x] Actualizar modal selector rápido con badges `PRO ACTIVO` / `🔒 REQUIERE PRO`.
  - [x] Añadir clases CSS en `tutor-dashboard.component.ts`.
- [x] **Paso 5: Frontend - Resiliencia de Errores en `video-uploader.component.ts`**
  - [x] Capturar y desplegar mensaje amigable si el servidor rechaza con 403 Forbidden.
- [x] **Paso 6: Frontend - Pruebas Unitarias**
  - [x] Actualizar `tutor-dashboard.component.spec.ts` para verificar el nuevo comportamiento.
- [x] **Paso 7: Verificación Global y Documentación de Pruebas**
  - [x] Ejecutar suite completa `./mvnw test` (200 tests OK).
  - [x] Redactar `test/TS-56-test-plan-restriccion-carga-videos-suscripcion-pro.md`.
- [x] **Paso 8: Transición de Trello**
  - [x] Mover tarjeta `TS-56` a `in testing` y añadir comentario con reporte de ejecución.

---

## 8. Criterios de Aceptación (DoD)

- [x] Plan de implementación detallado generado en `plans/TS-56-plan-restriccion-carga-videos-suscripcion-pro.md`.
- [x] El endpoint `POST /api/v1/videos/request-upload` retorna HTTP 403 Forbidden con mensaje `"El atleta no cuenta con una suscripción Pro activa para subir videos."` para atletas sin membresía activa.
- [x] Los atletas con pago en estado `PENDING_AUDIT` están bloqueados para la subida de videos hasta su aprobación formal.
- [x] El Dashboard del Tutor muestra visualmente el botón con candado `🔒 Cargar Video (Requiere Pro)` para atletas inactivos o pendientes.
- [x] Al hacer clic en el botón bloqueado se abre el modal de Checkout con mensaje claro orientando al tutor hacia el pago.
- [x] El selector rápido de atleta para video diferencia el estado Pro y redirige al checkout si el atleta elegido no cuenta con plan activo.
- [x] Todas las pruebas automatizadas backend y frontend pasan con 0 errores y 0 fallos.
- [x] Documento de pruebas generado en `test/TS-56-test-plan-restriccion-carga-videos-suscripcion-pro.md`.
- [x] Tarjeta en Trello actualizada a `in testing` con enlace y detalles.
