# Plan de Pruebas y Validación: [TS-73] Optimización de tamaño, contraste Dark y unificación del logo oficial en todos los correos electrónicos

**ID Tarea:** TS-73  
**Título:** Optimización de tamaño, contraste Dark y unificación del logo oficial en todos los correos electrónicos  
**Tarjeta Trello:** [https://trello.com/c/ZTEaQOhN](https://trello.com/c/ZTEaQOhN)  
**ID Tarjeta en Trello:** `6af7dcebd5bb6b9af11a73d4`  
**Sprint:** Sprint 4 / Refinamiento Visual y Branding  
**Fecha:** 2026-11-16  
**Estado:** LISTO PARA TESTING  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo primordial de este plan de pruebas es garantizar la legibilidad, contraste cromático, jerarquía visual y unificación técnica del imagotipo oficial de Talentus Scout en todas las plantillas y notificaciones por correo electrónico transaccionales y administrativas:

* **Activo Estático de Branding (`talentus-scout-fe/public/assets/branding/ts-imagotipo-dark-email.png`):**
  * Generado a partir de la versión vectorial oficial `ts-imagotipo-dark.svg` (marca blanca `#FFFFFF` y acento verde grama `#68A95A`).
  * Recorte completo del espacio transparente perimetral innecesario (de más de 4000px vacíos a un recuadro útil ajustado de `577×520 px` y ~54.9 KB).
  * Optimizado para renderizado nítido en pantallas de alta densidad (Retina / 2x / 3x).

* **Configuración del Backend (`application.yml` y `application-prod.yml`):**
  * Parámetro `talentus.mail.branding.logo-url` actualizado por defecto a `https://talentusscout.com/assets/branding/ts-imagotipo-dark-email.png`.
  * Erradicación de la dependencia externa de Imgur (`https://i.imgur.com/9j8oQ2B.png`), la cual presentaba bajo contraste con fondo oscuro y proporciones minúsculas.

* **Plantillas de Correo HTML en Classpath (`templates/mail/`):**
  * `email-verification.html` (Verificación de Correo de Tutores y Scouts):
    * Inyección dinámica mediante placeholder `##LOGO_URL##`.
    * Dimensiones fijadas a atributo HTML `height="110"` y estilos inline `height: 110px; max-height: 120px; width: auto; max-width: 100%; display: block; margin: 0 auto 14px auto; border: 0;`.
    * Eliminación del título redundante `<h1 class="brand-title">TALENTUS <span>SCOUT</span></h1>` para dar protagonismo único al imagotipo ampliado.
  * `certification-invite.html` (Solicitud de Respaldo Oficial de Insignias):
    * Inyección dinámica mediante placeholder `##LOGO_URL##`.
    * Dimensiones ampliadas a `110px` (max `120px`) y remoción de `<h1>` redundante.

* **Servicio de Despacho `EmailService` (`src/main/java/com/talentus/scout/service/mail/EmailService.java`):**
  * Inyección obligatoria de `LOGO_URL` en los placeholders de `sendEmailVerification` y `sendCertificationInvite`.
  * Implementación del método auxiliar centralizado `buildLogoHeaderHtml()`.
  * Homologación de todos los correos transaccionales inline a `height="110"` y `max-height: 120px;`:
    * Notificaciones de Pago Móvil (aprobado y rechazado).
    * Notificaciones de Auditoría de Patria Potestad LOPNNA Art. 65 (aprobada y observada).
    * Notificaciones de Acreditación Oficial de Scout (aprobada y observada).
    * Notificaciones de Certificación de Insignias Deportivas (aprobada y observada).
    * Notificaciones de Revocación de Club Vinculado a Scout.
    * Notificaciones de Restablecimiento de Contraseña.
    * Notificaciones de Invitación por Carga Masiva de Tutores y Atletas.

* **Servicio de Alertas a Administradores `AdminNotificationService.java`:**
  * Homologación de la cabecera en todas las alertas institucionales a `height="110"` y `max-height: 120px;`:
    * Registro de nuevo tutor legal.
    * Inscripción de nuevo atleta juvenil.
    * Alta de club comunitario no homologado ("Otro").
    * Postulación de nuevo scout profesional.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Pruebas Unitarias del Backend (Spring Boot 3 / Java 21)
Comando ejecutado:
```bash
cd talentus-scout-be && ./mvnw test -Dtest=EmailServiceTest,AdminNotificationServiceTest
```
**Resultado:** `BUILD SUCCESS` — **22 pruebas ejecutadas, 0 errores, 0 fallos.**

| Suite de Pruebas | Pruebas | Estado | Descripción de Cobertura |
| :--- | :---: | :---: | :--- |
| `EmailServiceTest` | 16 | ✅ PASS | • `testTemplatesContainDynamicLogoPlaceholder`: Valida que las plantillas en classpath no contengan `9j8oQ2B.png` ni `<h1>`, contengan `##LOGO_URL##` y dimensiones `height="110"`.<br>• `testBuildLogoHeaderHtml`: Valida la estructura HTML y URL generada por el método auxiliar.<br>• `testDispatchEmailRealSuccess`: Valida mediante `ArgumentCaptor` la sustitución real de `##LOGO_URL##` por la URL oficial del imagotipo Dark.<br>• `testSendCertificationInviteRealSuccess`: Valida renderizado y reemplazo en invitación de certificación.<br>• `testSendScoutVerificationResolutionNotificationDynamicLinks`: Valida dimensiones de logo `height='110'` y ausencia de URLs desactualizadas.<br>• Validaciones de despacho mock y manejo seguro de excepciones con Resend. |
| `AdminNotificationServiceTest` | 6 | ✅ PASS | • `notifyNewTutorRegistered_success`: Valida alerta a administradores con dimensiones de logo optimizadas (`height='110'`, `max-height: 120px;`).<br>• `notifyNewAthleteRegistered_success`: Valida alerta de atleta con branding actualizado.<br>• `notifyNewCustomClubCreated_success`: Valida alerta de club con branding Dark.<br>• `notifyNewScoutRegistered_success`: Valida alerta de scout con branding oficial.<br>• Pruebas de resolución de destinatarios administradores activos y fallback. |

---

### 2.2. Verificación de Compilación y Bundling en Frontend (Angular 18+ SSR)
Comando ejecutado:
```bash
cd talentus-scout-fe && npm run build
```
**Resultado:** `Application bundle generation complete. [32.528 seconds]`
* Verificación exitosa de que `public/assets/branding/ts-imagotipo-dark-email.png` se encuentra correctamente ubicado en la raíz pública del frontend y empaquetado para distribución estática.
* Se prerenderizaron exitosamente las 20 rutas estáticas de la aplicación.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Escenario 1: Inspección Visual del Imagotipo Dark Optimizado
1. Abrir en el navegador local o visor de imágenes el archivo generado:
   `talentus-scout-fe/public/assets/branding/ts-imagotipo-dark-email.png`
2. **Criterios visuales esperados:**
   * Fondo transparente.
   * Imagotipo nítido con el balón/escudo en blanco `#FFFFFF` y verde pitch `#68A95A`.
   * Texto "TALENTUS SCOUT" blanco de alto contraste.
   * Sin bordes vacíos excesivos alrededor del diseño.

---

### 3.2. Escenario 2: Notificación de Verificación de Correo Electrónico
1. En el frontend (`http://localhost:4200/register`), registrar un nuevo tutor o usuario.
2. Inspeccionar los logs del contenedor backend `talentus-backend-dev`:
   ```bash
   docker logs talentus-backend-dev --tail 100
   ```
3. Observar la salida del despacho (modo mock o Resend):
   ```text
   ===================== [MOCK EMAIL SERVICE — RESEND] =====================
   Para: usuario@ejemplo.com
   Asunto: Verifica tu Correo Electrónico — Talentus Scout
   Remitente: contacto@talentusscout.com
   Destinatario: Usuario Prueba
   =========================================================================
   ```
4. Comprobar que en el HTML despachado:
   * La etiqueta de imagen es: `<img src="https://talentusscout.com/assets/branding/ts-imagotipo-dark-email.png" alt="Talentus Scout" height="110" style="height: 110px; max-height: 120px; ...">`.
   * No aparece el tag `<h1>TALENTUS <span>SCOUT</span></h1>`.

---

### 3.3. Escenario 3: Notificación de Resolución de Acreditación de Scout
1. Ingresar al panel administrativo (`/admin/scouts`).
2. Aprobar o rechazar la acreditación de un veedor deportivo.
3. Verificar el correo despachado:
   * La cabecera muestra el imagotipo Dark centrado con altura de `110px`.
   * El contraste sobre el fondo oscuro institucional `#0A0F1D` es óptimo y completamente legible.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Cumplimiento |
| :--- | :---: | :--- |
| Activo `ts-imagotipo-dark-email.png` recortado y optimizado en `public/assets/branding/` | ✅ CUMPLIDO | Generado a partir de `ts-imagotipo-dark.svg`, sin márgenes ociosos (577x520 px, 54.9 KB, Retina ready). |
| `talentus.mail.branding.logo-url` apunta por defecto al nuevo activo Dark | ✅ CUMPLIDO | Actualizado en `application.yml`, `application-prod.yml` y valor por defecto de `@Value` en `EmailService.java`. |
| Eliminación total del logo antiguo en Imgur (`9j8oQ2B.png`) | ✅ CUMPLIDO | Ninguna plantilla ni clase de configuración referencia el enlace obsoleto. |
| Altura visual estandarizada entre `100px` y `120px` en todos los correos | ✅ CUMPLIDO | Todas las plantillas y métodos usan `height="110"` y `max-height: 120px;`. |
| Reemplazo dinámico de `##LOGO_URL##` en plantillas HTML de classpath | ✅ CUMPLIDO | Validado mediante pruebas unitarias con `ArgumentCaptor` en `EmailServiceTest`. |
| Eliminación de `<h1>TALENTUS SCOUT</h1>` redundante | ✅ CUMPLIDO | Removido de `email-verification.html` y `certification-invite.html`. |
| Pruebas unitarias backend y build frontend en verde | ✅ CUMPLIDO | 22 tests ejecutados y aprobados; build de Angular 18 exitoso en 32.5s. |

---

## 5. Casos Borde y Consideraciones de Compatibilidad de Clientes de Correo

1. **Clientes de correo sin soporte de estilos CSS modernos (Outlook, Webmails corporativos):**
   * Se incluye obligatoriamente el atributo HTML nativo `height="110"` además del estilo inline `style="height: 110px; max-height: 120px; width: auto; max-width: 100%; display: block; margin: 0 auto; border: 0;"`. Esto previene que clientes como Outlook en Windows estiren la imagen a su tamaño intrínseco (520px).
2. **Modo Claro vs Modo Oscuro del Cliente:**
   * La cabecera del correo posee un contenedor con fondo explícito `#0A0F1D` (`background: #0A0F1D; color: #F8FAFC;`), garantizando que la versión Dark del imagotipo (blanco `#FFFFFF` y verde `#68A95A`) mantenga el contraste máximo indistintamente del tema configurado en la app del cliente (Gmail iOS, Apple Mail, Outlook Web).
3. **Sobreescritura de URL de Branding en Despliegues Personalizados:**
   * Se preservó la variable de entorno `TALENTUS_MAIL_LOGO_URL`, permitiendo sobreescribir la URL del imagotipo si se utiliza un CDN o bucket S3 externo en el futuro sin necesidad de recompilar el binario.
