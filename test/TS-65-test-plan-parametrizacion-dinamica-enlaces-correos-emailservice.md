# Plan de Pruebas y Validación: [TS-65] Parametrización Dinámica de Enlaces en Correos Transaccionales (Corrección de Dominio en EmailService)

**ID Tarea:** TS-65  
**Título:** Parametrización Dinámica de Enlaces en Correos Transaccionales (Corrección de Dominio en EmailService)  
**Tarjeta Trello:** [https://trello.com/c/5PGw2N3g/110-ts-65-parametrizaci%C3%B3n-din%C3%A1mica-de-enlaces-en-correos-transaccionales-correcci%C3%B3n-de-dominio-en-emailservice](https://trello.com/c/5PGw2N3g/110-ts-65-parametrizaci%C3%B3n-din%C3%A1mica-de-enlaces-en-correos-transaccionales-correcci%C3%B3n-de-dominio-en-emailservice)  
**ID Tarjeta en Trello:** `6ae480280804e09c3c30ae57`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-30  
**Estado:** LISTO PARA TESTING  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar que todas las notificaciones por correo electrónico transaccional despachadas por la plataforma contengan hipervínculos dinámicos que apunten al dominio oficial del ambiente activo (`https://talentusscout.com` en producción, `http://localhost` o `http://localhost:4200` en desarrollo), eliminando de raíz cualquier referencia al dominio descontinuado `talentus.app`:

* **Servicio `EmailService` (`src/main/java/com/talentus/scout/service/mail/EmailService.java`):**
  * Inyección de propiedad `@Value("${talentus.frontend.base-url:https://talentusscout.com}") private String frontendBaseUrl`.
  * Método helper `getBaseUrl()` que normaliza trailing slashes (ej. `https://talentusscout.com/` -> `https://talentusscout.com`) y aplica fallback defensivo.
  * `sendScoutVerificationResolutionNotification`:
    * Aprobado: botón de acción hacia `${frontendBaseUrl}/scout/directory`.
    * Rechazado / Observado: botón de acción hacia `${frontendBaseUrl}/login`.
  * `sendLegalVerificationResolutionNotification` (Auditoría de Patria Potestad):
    * Aprobado y Observado: botones de acción hacia `${frontendBaseUrl}/dashboard`.
  * `sendBadgeCertificationResolutionNotification` (Insignias Deportivas Multidimensionales):
    * Aprobado y Observado: botones de acción hacia `${frontendBaseUrl}/dashboard`.
  * `sendScoutClubRevocationNotification` (Baja de Club Oficial):
    * Botón de acción hacia `${frontendBaseUrl}/login`.

* **Servicio `AthleteCvPdfService` (`src/main/java/com/talentus/scout/service/pdf/AthleteCvPdfService.java`):**
  * Homologación de fallback en constructor a `@Value("${talentus.frontend.base-url:https://talentusscout.com}") String frontendBaseUrl`.

* **Configuración de Entorno (`application.yml` y `application-prod.yml`):**
  * Validación de que la variable `FRONTEND_BASE_URL` gobierne las rutas del frontend en todos los perfiles de Spring Boot.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Pruebas Unitarias de `EmailServiceTest` y `AthleteCvPdfServiceTest`
Comando ejecutado:
```bash
./mvnw test -Dtest=EmailServiceTest,AthleteCvPdfServiceTest
```
**Resultado:** `BUILD SUCCESS` — **17 pruebas ejecutadas, 0 errores, 0 fallos.**

| Clase de Prueba | Pruebas | Estado | Descripción de Casos Validados |
| :--- | :---: | :---: | :--- |
| `EmailServiceTest` | 14 | ✅ PASS | • `testSendScoutVerificationResolutionNotificationDynamicLinks`: Valida mediante `ArgumentCaptor` que el correo de aprobación contenga `href='https://talentusscout.com/scout/directory'` y el de rechazo `href='https://talentusscout.com/login'`, sin rastro de `talentus.app`.<br>• `testSendLegalVerificationResolutionNotificationDynamicLinks`: Valida que los correos de patria potestad contengan `href='https://talentusscout.com/dashboard'`.<br>• `testSendBadgeCertificationResolutionNotificationDynamicLinks`: Valida que los correos de insignias contengan `href='https://talentusscout.com/dashboard'`.<br>• `testSendScoutClubRevocationNotificationDynamicLinks`: Valida que el correo de revocación contenga `href='https://talentusscout.com/login'`.<br>• `testGetBaseUrlNormalization`: Valida sanitización de slashes finales, strings vacíos y valores nulos.<br>• Pruebas de integración con Resend API y modo mock. |
| `AthleteCvPdfServiceTest` | 3 | ✅ PASS | Generación de Hoja de Vida Deportiva en PDF con URL base homologada (`https://talentusscout.com`). |

---

### 2.2. Pruebas de Integración y Servicios Conexos
Comando ejecutado:
```bash
./mvnw test -Dtest=AdminScoutServiceTest,AdminLegalVerificationControllerIntegrationTest,AdminNotificationServiceTest
```
**Resultado:** `BUILD SUCCESS` — **15 pruebas ejecutadas, 0 errores, 0 fallos.**

| Clase de Prueba | Pruebas | Estado | Descripción de Casos Validados |
| :--- | :---: | :---: | :--- |
| `AdminLegalVerificationControllerIntegrationTest` | 7 | ✅ PASS | Suite Spring Boot de auditoría de patria potestad LOPNNA Art. 65 con despacho de correos transaccionales a tutores. |
| `AdminScoutServiceTest` | 2 | ✅ PASS | Aprobación y rechazo motivado de scouts con llamada verificada a `EmailService`. |
| `AdminNotificationServiceTest` | 6 | ✅ PASS | Alertas de administración institucional con branding oficial. |

---

### 2.3. Verificación de Erradicación de Dominio Obsoleto por Grep
Comando ejecutado:
```bash
grep -rn "talentus.app" talentus-scout-be/src/main/java/com/talentus/scout/service/
```
**Resultado:** **0 coincidencias** en los servicios de negocio de la aplicación.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Escenario 1: Auditoría y Aprobación de Scout
1. Ingresar como administrador a `http://localhost:4200/admin/scouts`.
2. Seleccionar un scout en estado pendiente y hacer clic en **Aprobar Acreditación**.
3. Revisar los logs del backend en la consola:
   ```text
   ===================== [MOCK EMAIL SERVICE — RESEND] =====================
   Para: scout@ejemplo.com
   Asunto: ¡Acreditación Oficial de Scout Aprobada! — Talentus Scout
   Remitente: contacto@talentusscout.com
   Scout: Mauricio Ojeador
   Aprobado: true
   =========================================================================
   ```
4. Si se ejecuta con `mail.enabled=true`, inspeccionar el payload enviado a Resend:
   * El botón `<a href='https://talentusscout.com/scout/directory'>Acceder al Directorio de Atletas</a>` dirige a la ruta protegida del radar deportivo.

---

### 3.2. Escenario 2: Rechazo Motivado de Scout
1. En `/admin/scouts`, seleccionar un scout y hacer clic en **Rechazar**.
2. Ingresar un motivo claro (ej. "La credencial deportiva adjunta no posee sello federativo legible").
3. Confirmar la acción y validar que el cuerpo del correo contenga el enlace hacia `${frontendBaseUrl}/login` para que el usuario pueda ingresar y subsanar su documento.

---

### 3.3. Escenario 3: Dictamen de Patria Potestad (Aprobación y Observación)
1. Ingresar a `/admin/verificacion-legal`.
2. Dictaminar la patria potestad de un menor (Aprobado u Observado).
3. Verificar que el correo despachado al tutor legal contenga el botón con enlace hacia `${frontendBaseUrl}/dashboard`.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Cumplimiento |
| :--- | :---: | :--- |
| **Inyección de Propiedad:** `EmailService` inyecta `@Value("${talentus.frontend.base-url:https://talentusscout.com}")`. | ✅ CUMPLIDO | Implementado en línea 36 de `EmailService.java`. |
| **Normalización de URLs:** Método `getBaseUrl()` remueve slashes finales y provee fallback seguro. | ✅ CUMPLIDO | Probado con éxito en `EmailServiceTest.testGetBaseUrlNormalization()`. |
| **Destino Aprobación Scout:** Enlace a `${frontendBaseUrl}/scout/directory`. | ✅ CUMPLIDO | Validado con `ArgumentCaptor` en `EmailServiceTest`. |
| **Destino Rechazo Scout:** Enlace a `${frontendBaseUrl}/login`. | ✅ CUMPLIDO | Validado con `ArgumentCaptor` en `EmailServiceTest`. |
| **Destino Patria Potestad:** Enlace a `${frontendBaseUrl}/dashboard`. | ✅ CUMPLIDO | Validado en `sendLegalVerificationResolutionNotification`. |
| **Destino Insignias:** Enlace a `${frontendBaseUrl}/dashboard`. | ✅ CUMPLIDO | Validado en `sendBadgeCertificationResolutionNotification`. |
| **Destino Revocación Club:** Enlace a `${frontendBaseUrl}/login`. | ✅ CUMPLIDO | Validado en `sendScoutClubRevocationNotification`. |
| **Erradicación de `talentus.app`:** Cero hipervínculos con dominio descontinuado en correos de producción. | ✅ CUMPLIDO | Confirmado con `grep` y aserciones `doesNotContain("talentus.app")`. |
| **Tests Automatizados:** 100% de tests unitarios e integración en verde. | ✅ CUMPLIDO | 32 pruebas aprobadas en backend con Maven. |

---

## 5. Casos Borde Validados

1. **Trailing Slash en Variable de Entorno:** Si en despliegues con Docker o Cloud Run la variable `FRONTEND_BASE_URL` se configura con slash final (`https://talentusscout.com/`), el método `getBaseUrl()` lo trunca limpiamente, previniendo URLs con doble slash tipo `https://talentusscout.com//login`.
2. **Variable Vacía o Nula:** Si la variable no está definida o contiene sólo espacios en blanco, el servicio aplica el fallback seguro al dominio oficial `https://talentusscout.com`.
3. **Redirección de Sesión por Guards:** Si un scout recién aprobado hace clic en el enlace `/scout/directory` sin tener la cookie/token JWT de sesión abierta en su navegador, el `scoutGuard` del frontend lo redirige automáticamente a `/login` con el parámetro de retorno correspondiente, ofreciendo una experiencia fluida.
