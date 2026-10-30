# Plan de Implementación: [TS-65] Parametrización Dinámica de Enlaces en Correos Transaccionales (Corrección de Dominio en EmailService)

**ID Tarea:** TS-65  
**Título:** Parametrización Dinámica de Enlaces en Correos Transaccionales (Corrección de Dominio en EmailService)  
**Tarjeta Trello:** [https://trello.com/c/5PGw2N3g/110-ts-65-parametrizaci%C3%B3n-din%C3%A1mica-de-enlaces-en-correos-transaccionales-correcci%C3%B3n-de-dominio-en-emailservice](https://trello.com/c/5PGw2N3g/110-ts-65-parametrizaci%C3%B3n-din%C3%A1mica-de-enlaces-en-correos-transaccionales-correcci%C3%B3n-de-dominio-en-emailservice)  
**ID Tarjeta en Trello:** `6ae480280804e09c3c30ae57`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-30  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

### 1.1. Diagnóstico del Problema
En el entorno productivo de Talentus Scout (`https://talentusscout.com`), los usuarios que reciben correos electrónicos transaccionales del sistema se enfrentaban a hipervínculos rotos o dirigidos a un dominio no operativo (`talentus.app`). Concretamente:
* Al auditar y aprobar a un veedor o reclutador deportivo en `/admin/scouts`, el correo de bienvenida y acreditación oficial contenía un botón que apuntaba a `https://talentus.app/scout/directory`.
* Al requerir subsanación o rechazo a un scout, el botón dirigía a `https://talentus.app/login`.
* En la auditoría de patria potestad de atletas menores de edad (LOPNNA Art. 65), los correos despachados al tutor legal contenían botones con destino a `https://talentus.app/dashboard`.
* En la verificación de insignias deportivas multidimensionales y en la notificación de revocación de clubes dados de baja, se repetía la misma referencia estática a `talentus.app`.

### 1.2. Impacto en los Usuarios y en el Negocio
* **Scouts y Directores de Clubes:** Fricción inmediata al intentar ingresar al radar de talentos luego de recibir la notificación de acreditación, generando desconfianza en la infraestructura de la plataforma.
* **Tutores y Representantes Legales:** Imposibilidad de acceder directamente desde el correo para subsanar partidas de nacimiento o cédulas de identidad observadas.
* **Salvaguarda y Oficialidad:** Es imperativo que todas las comunicaciones transaccionales reflejen de forma estricta y dinámica el dominio oficial del ecosistema (`https://talentusscout.com`), adaptándose de manera transparente entre entornos de desarrollo local, staging y producción.

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Afectados:**
  * Backend: `com.talentus.scout.service.mail.EmailService` (Spring Boot 3 / Java 21).
  * Backend: `com.talentus.scout.service.pdf.AthleteCvPdfService` (Spring Boot 3 / Java 21).
  * Pruebas Unitarias: `com.talentus.scout.service.mail.EmailServiceTest`.
* **Base de Datos:**
  * No aplica (cambio exclusivo de lógica de servicios de backend y parametrización de plantillas).
* **Frontend:**
  * No requiere cambios en código Angular; las rutas receptoras (`/scout/directory`, `/login`, `/dashboard`) ya se encuentran implementadas y protegidas por los Guards de navegación (`scoutGuard`, `tutorGuard`).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)

* No se requieren migraciones DDL ni modificaciones en tablas relacionales.

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Servicio `EmailService` (`src/main/java/com/talentus/scout/service/mail/EmailService.java`)
1. **Inyección de Propiedad de Entorno:**
   ```java
   @Value("${talentus.frontend.base-url:https://talentusscout.com}")
   private String frontendBaseUrl;
   ```
2. **Normalización de URL Base:**
   Garantizar que si la propiedad termina con `/`, se elimine el slash final para evitar rutas dobles tipo `https://talentusscout.com//login`:
   ```java
   private String getBaseUrl() {
       if (frontendBaseUrl == null || frontendBaseUrl.trim().isEmpty()) {
           return "https://talentusscout.com";
       }
       String url = frontendBaseUrl.trim();
       return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
   }
   ```
3. **Sustitución en Métodos Transaccionales:**
   * **`sendLegalVerificationResolutionNotification`:**
     - Aprobado: `<a href='%s/dashboard' ...>Ir a Mi Panel</a>`, pasando `getBaseUrl()`.
     - Observado: `<a href='%s/dashboard' ...>Actualizar Documento en Mi Panel</a>`, pasando `getBaseUrl()`.
   * **`sendScoutVerificationResolutionNotification`:**
     - Aprobado: `<a href='%s/scout/directory' ...>Acceder al Directorio de Atletas</a>`, pasando `getBaseUrl()`.
     - Observado: `<a href='%s/login' ...>Iniciar Sesión y Subsanar Credencial</a>`, pasando `getBaseUrl()`.
   * **`sendBadgeCertificationResolutionNotification`:**
     - Aprobado: `<a href='%s/dashboard' ...>Ver Cédula en Mi Panel</a>`, pasando `getBaseUrl()`.
     - Observado: `<a href='%s/dashboard' ...>Ir a Mi Panel de Tutor</a>`, pasando `getBaseUrl()`.
   * **`sendScoutClubRevocationNotification`:**
     - Revocación: `<a href='%s/login' ...>Iniciar Sesión y Actualizar Perfil</a>`, pasando `getBaseUrl()`.

### 4.2. Servicio `AthleteCvPdfService` (`src/main/java/com/talentus/scout/service/pdf/AthleteCvPdfService.java`)
* Homologar el fallback en el constructor:
  ```java
  @Value("${talentus.frontend.base-url:https://talentusscout.com}") String frontendBaseUrl
  ```

### 4.3. Pruebas Unitarias `EmailServiceTest` (`src/test/java/com/talentus/scout/service/mail/EmailServiceTest.java`)
* Configurar en `setUp()`:
  ```java
  ReflectionTestUtils.setField(emailService, "frontendBaseUrl", "https://talentusscout.com");
  ```
* Agregar pruebas con `ArgumentCaptor<CreateEmailOptions>` para verificar que:
  1. `sendScoutVerificationResolutionNotification` (aprobado) genera un HTML con `href='https://talentusscout.com/scout/directory'` y no contiene `talentus.app`.
  2. `sendScoutVerificationResolutionNotification` (rechazado) genera un HTML con `href='https://talentusscout.com/login'` y no contiene `talentus.app`.
  3. `sendLegalVerificationResolutionNotification` genera `href='https://talentusscout.com/dashboard'`.
  4. `sendBadgeCertificationResolutionNotification` genera `href='https://talentusscout.com/dashboard'`.
  5. `sendScoutClubRevocationNotification` genera `href='https://talentusscout.com/login'`.

---

## 5. Frontend: Angular 18+

* Las rutas receptoras en el frontend son:
  * `/scout/directory`: Directorio de atletas con radar de visualización para scouts verificados.
  * `/login`: Portal de acceso unificado para scouts y tutores.
  * `/dashboard`: Panel de administración de atletas para tutores legales.
* Todas las rutas están debidamente resguardadas por `scoutGuard`, `tutorGuard` y el interceptor JWT.

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Automatizadas Backend (JUnit 5 / Mockito)
Comando a ejecutar:
```bash
./mvnw test -Dtest=EmailServiceTest,AdminScoutServiceTest,AdminLegalVerificationControllerIntegrationTest
```
Resultados esperados:
* 100% pruebas pasando.
* Cero aserciones que dependan de `talentus.app`.

### 6.2. Verificación de Ausencia de Dominio Obsoleto
Comando de verificación por grep:
```bash
grep -rn "talentus.app" talentus-scout-be/src/main/
```
Resultado esperado: **0 coincidencias** en el código fuente de producción (`src/main/`).

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Inyección de `frontendBaseUrl` en `EmailService`**
  - [x] Añadir `@Value("${talentus.frontend.base-url:https://talentusscout.com}") private String frontendBaseUrl;` en `EmailService.java`.
  - [x] Implementar método helper `getBaseUrl()` con saneamiento de slash final.

- [x] **Paso 2: Sustitución de Enlaces Hardcodeados en `EmailService`**
  - [x] Actualizar `sendLegalVerificationResolutionNotification` (aprobado y observado hacia `/dashboard`).
  - [x] Actualizar `sendScoutVerificationResolutionNotification` (aprobado hacia `/scout/directory` y observado hacia `/login`).
  - [x] Actualizar `sendBadgeCertificationResolutionNotification` (aprobado y observado hacia `/dashboard`).
  - [x] Actualizar `sendScoutClubRevocationNotification` (hacia `/login`).

- [x] **Paso 3: Homologación de Fallback en `AthleteCvPdfService`**
  - [x] Actualizar `@Value` en constructor de `AthleteCvPdfService.java` a `https://talentusscout.com`.

- [x] **Paso 4: Actualización y Ampliación de Pruebas Unitarias**
  - [x] Configurar `frontendBaseUrl` en `EmailServiceTest.setUp()`.
  - [x] Añadir pruebas de verificación de enlaces dinámicos y descarte de `talentus.app`.
  - [x] Ejecutar `./mvnw test -Dtest=EmailServiceTest` y validar éxito.

- [x] **Paso 5: Verificación Integral y Suite Completa**
  - [x] Ejecutar `./mvnw test` comprobando que no existan regresiones en ningún controlador ni servicio.
  - [x] Comprobar con `grep` que no queden referencias a `talentus.app` en `src/main`.

- [x] **Paso 6: Documentación y Cierre en Trello**
  - [x] Redactar plan de pruebas en `test/TS-65-test-plan-parametrizacion-dinamica-enlaces-correos-emailservice.md`.
  - [x] Marcar checklist en `plans/TS-65-plan-parametrizacion-dinamica-enlaces-correos-emailservice.md`.
  - [x] Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

1. [x] **Parametrización Dinámica:** `EmailService` inyecta `${talentus.frontend.base-url:https://talentusscout.com}` y compone todas las URLs de redirección dinámicamente.
2. [x] **Destinos Canónicos Verificados:**
   - Aprobación de Scout -> `${frontendBaseUrl}/scout/directory`.
   - Rechazo / Subsanación de Scout -> `${frontendBaseUrl}/login`.
   - Resolución de Patria Potestad -> `${frontendBaseUrl}/dashboard`.
   - Resolución de Insignias Deportivas -> `${frontendBaseUrl}/dashboard`.
   - Revocación de Club de Scout -> `${frontendBaseUrl}/login`.
3. [x] **Erradicación de Dominio Obsoleto:** Cero referencias a `talentus.app` en `src/main`.
4. [x] **Pruebas Automatizadas en Verde:** `EmailServiceTest` y la suite global de JUnit 5 ejecutan exitosamente al 100%.
5. [x] **Documentación y Trazabilidad:** Archivo `test/TS-65-test-plan-parametrizacion-dinamica-enlaces-correos-emailservice.md` redactado y tarjeta en Trello trasladada a `in testing`.
