# Plan de Implementación: [TS-73] Optimización de tamaño, contraste Dark y unificación del logo oficial en todos los correos electrónicos

**ID Tarea:** TS-73  
**Tarjeta Trello:** https://trello.com/c/ZTEaQOhN  
**Fecha:** 2026-11-16  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema:** En todos los correos electrónicos transaccionales y alertas institucionales enviados por Talentus Scout, el imagotipo se renderiza excesivamente pequeño (`max-height: 44px–48px`) y con bajo contraste. La imagen por defecto (`https://i.imgur.com/9j8oQ2B.png`, derivada de `ts-imagotipo-color.png`) usa texto azul marino (`#16233E`) sobre el fondo oscuro `#0A0F1D`, además de poseer márgenes transparentes sobredimensionados (`4501×4501 px`) que reducen su área visible efectiva.
- **Impacto:** Menoscaba la legibilidad y presencia institucional de la marca Talentus Scout. Al migrar a la variante Dark (texto `#FFFFFF` + detalles verde `#68A95A`) con recorte de márgenes, mayor tamaño (`100px–120px`) y unificación en todas las plantillas y servicios de email, se refuerza la confianza, transparencia y autenticidad frente a tutores, scouts y federaciones bajo la normativa de Protección Integral del Menor / LOPNNA Art. 65.

## 2. Alcance Técnico y Arquitectura
- **Base de Datos:** Sin cambios de esquema DDL ni migraciones relacionales.
- **Frontend / Assets (`talentus-scout-fe`):**
  - Generar el activo `ts-imagotipo-dark-email.png` en `talentus-scout-fe/public/assets/branding/` a partir de `ts-imagotipo-dark.svg`, recortando márgenes transparentes excedentes e incluyendo padding uniforme de respiración, exportado a resolución optimizada (~520px de altura para alta densidad Retina con peso ligero < 60KB).
- **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  - `application.yml` y `application-prod.yml`: Actualizar el valor por defecto de `talentus.mail.branding.logo-url` a `https://talentusscout.com/assets/branding/ts-imagotipo-dark-email.png` (sobreescribible con `TALENTUS_MAIL_LOGO_URL`).
  - `templates/mail/email-verification.html` y `templates/mail/certification-invite.html`:
    - Reemplazar la URL hardcodeada de Imgur por el marcador dinámico `##LOGO_URL##`.
    - Actualizar dimensiones a `height="110"` y estilo inline `height: 110px; max-height: 120px; width: auto; max-width: 100%; display: block; margin: 0 auto; border: 0;`.
    - Remover el `<h1 class="brand-title">TALENTUS <span>SCOUT</span></h1>` redundante para dejar el imagotipo ampliado como único protagonista de cabecera.
  - `EmailService.java`:
    - Inyectar `##LOGO_URL##` en `sendEmailVerification` y `sendCertificationInvite`.
    - Centralizar la generación de la cabecera en un método auxiliar `buildLogoHeaderHtml()` o etiqueta `getEmailLogoImgTag()`.
    - Actualizar todos los correos inline a la altura objetivo (`100px–120px`): pagos (aprobado/rechazado), verificación legal/patria potestad, verificación scout, certificación de insignias, revocación de club, recuperación de contraseña e invitación por carga masiva.
  - `AdminNotificationService.java`:
    - Actualizar todas las alertas de administrador (`notifyNewTutorRegistered`, `notifyNewAthleteRegistered`, `notifyNewCustomClubCreated`, `notifyNewScoutRegistered`) para usar la cabecera unificada con altura objetivo (`110px`, max `120px`).
  - Pruebas unitarias:
    - Actualizar y robustecer `EmailServiceTest.java` y `AdminNotificationServiceTest.java` validando la nueva URL, la altura `110px`, ausencia de `9j8oQ2B.png` y ausencia del `<h1>` redundante.

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No aplica (tarea exclusivamente de branding, assets y plantillas de correo).

## 4. Backend: Spring Boot 3 (Java 21)
- Clases a modificar:
  - `src/main/resources/application.yml`
  - `src/main/resources/application-prod.yml`
  - `src/main/resources/templates/mail/email-verification.html`
  - `src/main/resources/templates/mail/certification-invite.html`
  - `src/main/java/com/talentus/scout/service/mail/EmailService.java`
  - `src/main/java/com/talentus/scout/service/AdminNotificationService.java`
  - `src/test/java/com/talentus/scout/service/mail/EmailServiceTest.java`
  - `src/test/java/com/talentus/scout/service/AdminNotificationServiceTest.java`

## 5. Frontend: Angular 18+
- Archivo a crear:
  - `public/assets/branding/ts-imagotipo-dark-email.png`

## 6. Pruebas y Verificación
- Pruebas unitarias backend: `./mvnw test -Dtest=EmailServiceTest,AdminNotificationServiceTest`
- Verificación de compilación frontend: `npm run build`
- Verificación visual del renderizado de correo y compatibilidad con clientes web/móvil.

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Generar el activo optimizado `talentus-scout-fe/public/assets/branding/ts-imagotipo-dark-email.png` recortando márgenes y con tamaño Retina.
- [x] Paso 2: Actualizar `application.yml` y `application-prod.yml` con la URL por defecto `https://talentusscout.com/assets/branding/ts-imagotipo-dark-email.png`.
- [x] Paso 3: Actualizar plantillas HTML `email-verification.html` y `certification-invite.html` con `##LOGO_URL##`, nuevo tamaño `height="110"` y remover `<h1>` redundante.
- [x] Paso 4: Refactorizar `EmailService.java` con método auxiliar centralizado para el logo y actualizar todos los métodos de envío.
- [x] Paso 5: Actualizar `AdminNotificationService.java` con el nuevo tamaño del logo.
- [x] Paso 6: Actualizar y ejecutar pruebas automatizadas en `EmailServiceTest` y `AdminNotificationServiceTest`.
- [x] Paso 7: Validar compilación frontend (`npm run build`).
- [x] Paso 8: Generar plan de pruebas `test/TS-73-test-plan-optimizacion-logo-correos.md`.
- [ ] Paso 9: Crear ramas Git, commits, push y Pull Requests en GitHub.
- [ ] Paso 10: Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

## 8. Criterios de Aceptación (DoD)
- [x] Existe el activo PNG `ts-imagotipo-dark-email.png` en variante Dark recortado en `talentus-scout-fe/public/assets/branding/`.
- [x] `talentus.mail.branding.logo-url` apunta por defecto al nuevo activo Dark público sin dependencias a Imgur.
- [x] Todos los correos de `EmailService` y `AdminNotificationService` muestran el logo Dark con altura visual entre `100px` y `120px` y alto contraste sobre `#0A0F1D`.
- [x] Las plantillas `email-verification.html` y `certification-invite.html` inyectan `##LOGO_URL##` dinámicamente sin `<h1>TALENTUS SCOUT</h1>` redundante.
- [x] El marcado `<img>` del logo incluye atributos y estilos inline compatibles con clientes de correo.
- [x] Pruebas unitarias de backend y compilación frontend en verde.
