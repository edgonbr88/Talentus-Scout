# Plan y Reporte de Pruebas — [TS-54] Aplicación e Integración de Identidad Visual Oficial (Logos, Isotipos, Favicon y Plantillas de Correo)

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-54]**, correspondiente a la integración y estandarización de la identidad visual de **Talentus Scout** en todas las interfaces de usuario (Angular 18+), favicons del navegador y plantillas de correo electrónico transaccionales (Spring Boot 3).

### 1.1. Artefactos y Componentes Impactados

* **Activos Gráficos Corporativos (`public/assets/branding/`):**
  * Normalización y catalogación de archivos vectoriales (SVG) y rasterizados (PNG):
    * `ts-isotipo-color.svg` / `.png` (Cresta y emblema con balón y estrella en verde y azul noche).
    * `ts-isotipo-negativo.svg` / `.png` (Cresta en blanco puro para contrastes oscuros).
    * `ts-isotipo-positivo.svg` / `.png` (Cresta en tono oscuro para fondos claros).
    * `ts-logotipo-color.svg` / `.png` (Tipografía "TALENTUS SCOUT" horizontal).
    * `ts-logotipo-negativo.svg` / `.png` (Tipografía en blanco puro).
    * `ts-logotipo-positivo.svg` / `.png` (Tipografía en tono oscuro).
    * `ts-imagotipo-color.svg` / `.png` (Composición completa emblema + tipografía).
    * `ts-imagotipo-negativo.svg` / `.png` (Imagotipo en blanco puro).
    * `ts-imagotipo-positivo.svg` / `.png` (Imagotipo en tono oscuro).
  * Generación de la suite completa de favicons corporativos en `talentus-scout-fe/public/`:
    * `favicon.svg` responsivo con soporte de `@media (prefers-color-scheme: dark)` (silueta blanca en pestañas oscuras y azul noche en pestañas claras).
    * `favicon.ico` multirresolución transparente (16x16, 32x32, 48x48, 64x64).
    * `favicon-32x32.png` y `favicon-16x16.png` para compatibilidad con navegadores modernos.
    * `apple-touch-icon.png` (180x180) para dispositivos móviles y marcadores.
    * Configuración en `src/index.html` con rutas absolutas `/` y parámetro de invalidación de caché `?v=20261022`.
    * Reglas Nginx dedicadas con `must-revalidate` y redirección 301 de subrutas para evitar 404 y almacenamiento en caché persistente obsoleto.

* **Frontend (Angular 18+ Standalone / Directiva fe-desing.md):**
  * `BrandLogoComponent` (`brand-logo.component.ts`, `brand-logo.component.html`, `brand-logo.component.css`, `brand-logo.component.spec.ts`):
    * Componente standalone reutilizable con plantilla HTML externa separada (`templateUrl`).
    * Entradas reactivas: `variant` (`isotipo` | `logotipo` | `imagotipo`), `theme` (`color` | `negativo` | `positivo`), `height`, `width`, `altText`, `clickable`, `customClass`.
  * Integración en Vistas:
    * `NavbarComponent`: Reemplazo del emoji `⚽` y textos provisionales por `app-brand-logo` en variante isotipo + tipografía `Dark Slate`.
    * `AppComponent` (Footer): Integración de `app-brand-logo` en variante imagotipo/logotipo negativo con preservación de accesibilidad.
    * `LoginComponent`: Incorporación de imagotipo en el encabezado de autenticación.
    * `RegisterTutorComponent`: Incorporación de imagotipo en el encabezado de registro de tutor.
    * `RegisterScoutComponent`: Incorporación de imagotipo en la solicitud de acreditación de scouts.
    * `CompleteProfileComponent`: Incorporación de imagotipo en la activación de perfil.
    * `ScoutPendingAuditComponent`: Incorporación de imagotipo en el panel de auditoría de credenciales.
    * `BentoProfileComponent`: Integración de isotipo oficial en la insignia superior de ficha pública.
    * `PublicCertifierComponent`: Incorporación de imagotipo en la cabecera del portal de certificación.
    * `SeoService`: Actualización de URL por defecto de Open Graph a `https://i.imgur.com/9j8oQ2B.png`.

* **Backend (Spring Boot 3 / Java 21 / Plantillas de Correo HTML):**
  * `application.yml`: Configuración de `talentus.mail.branding.logo-url: https://i.imgur.com/9j8oQ2B.png`.
  * `email-verification.html`: Cabecera enriquecida con `<img>` del logo oficial centrado.
  * `certification-invite.html`: Cabecera enriquecida con `<img>` del logo oficial centrado.
  * `EmailService.java`: Actualización de métodos de notificación HTML dinámicos (`sendPaymentStatusNotification`, `sendLegalVerificationResolutionNotification`, `sendScoutVerificationResolutionNotification`, `sendBadgeCertificationResolutionNotification`) inyectando el logo oficial.
  * `EmailServiceTest.java`: Suite de pruebas unitarias validando la carga de plantillas y presencia del logo en correos.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests (Spring Boot)

Comando ejecutado:
```bash
./mvnw test
```

#### Resultados:
```text
[INFO] Results:
[INFO] 
[INFO] Tests run: 189, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  02:27 min
[INFO] Finished at: 2026-10-22T10:22:21-03:00
[INFO] ------------------------------------------------------------------------
```

#### Detalle de Pruebas de Correo (`EmailServiceTest`):
1. `testTemplatesContainOfficialLogo`: Verifica que tanto `email-verification.html` como `certification-invite.html` cargan desde el classpath y contienen la URL pública `https://i.imgur.com/9j8oQ2B.png`.
2. `testSendEmailVerification`: Verifica ejecución de correo de verificación de cuenta.
3. `testSendCertificationInvite`: Valida envío de invitación a certificadores oficiales.
4. `testSendPaymentStatusNotification`: Valida formateo de notificaciones de pago aprobado y rechazado con la cabecera de marca.
5. `testSendLegalVerificationResolutionNotification`: Valida formateo de resolución de patria potestad.
6. `testSendScoutVerificationResolutionNotification`: Valida notificación de auditoría de scout.
7. `testSendBadgeCertificationResolutionNotification`: Valida notificación de resolución de insignia deportiva.

### 2.2. Frontend Unit Tests (Angular / Karma & Jasmine)

Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

#### Resultados:
```text
TOTAL: 124 SUCCESS
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 124 of 124 SUCCESS (3.041 secs / 2.602 secs)
```

#### Pruebas Específicas de `BrandLogoComponent` y Layout:
1. `BrandLogoComponent should create the brand logo component`: PASS.
2. `BrandLogoComponent should generate default logoSrc for imagotipo and color`: PASS (`/assets/branding/ts-imagotipo-color.svg`).
3. `BrandLogoComponent should generate proper logoSrc when variant and theme change`: PASS (prueba dinámica para `isotipo-negativo` y `logotipo-positivo`).
4. `BrandLogoComponent should render link when clickable is true`: PASS (etiqueta `<a>` con `routerLink="/"`, `aria-label`).
5. `BrandLogoComponent should render wrapper div when clickable is false`: PASS (`div.brand-logo-wrapper`).
6. `AppComponent should render brand in footer`: PASS (texto accesible y componente integrado).

### 2.3. Frontend Production Build & SSR Typecheck

Comando ejecutado:
```bash
npm run build
```

#### Resultados:
```text
✔ Building...
Browser bundles: 1.27 MB initial total
Server bundles: Prerendered 13 static routes.
Application bundle generation complete. [33.279 seconds]
Output location: dist/talentus-scout-fe
Exit code: 0 (SUCCESS)
```

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Verificación del Favicon
1. Abrir la aplicación en el navegador (`http://localhost:4200` o servidor local).
2. Observar la pestaña del navegador: debe mostrar el icono del balón/cresta en verde y azul (`favicon.ico` / `favicon.svg`) en lugar del icono por defecto de Angular.

### 3.2. Verificación de la Barra Superior (Navbar)
1. Navegar por cualquier ruta pública (`/`, `/scout/directory`, `/dashboard`).
2. En la esquina superior izquierda se aprecia el Isotipo oficial a color de 38px de altura junto al texto `TALENTUS SCOUT`.
3. Al hacer clic sobre el logo, redirige a la página principal (`/`).
4. En modo móvil (pantalla estrecha < 768px), el isotipo y el título se adaptan sin desbordamientos de layout.

### 3.3. Verificación de Pantallas de Autenticación
1. Ingresar a `/login`: Se aprecia en la cabecera de la tarjeta el Imagotipo oficial centrado.
2. Ingresar a `/register-tutor`: Se aprecia el Imagotipo oficial en la cabecera.
3. Ingresar a `/register-scout`: Se aprecia el Imagotipo oficial encabezando el formulario de acreditación.
4. Ingresar a `/auth/complete-profile`: Se aprecia el Imagotipo oficial.

### 3.4. Verificación del Footer
1. Hacer scroll hasta el fondo de cualquier página.
2. En la sección inferior izquierda se visualiza el logotipo en blanco/negativo sobre el fondo oscuro (`Dark Slate`), acompañado de los avisos de protección al menor de la LOPNNA.

### 3.5. Verificación de Correos Transaccionales (Backend)
1. Enviar una petición de prueba o consultar los logs de backend en modo mock:
   ```bash
   curl -s http://localhost:8080/api/v1/auth/resend-verification?email=tutor@test.com
   ```
2. Inspeccionar la plantilla HTML:
   Verificar que en el bloque `.header` aparece `<img src="https://i.imgur.com/9j8oQ2B.png" .../>`.

---

## 4. Matriz de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| Activos SVG y PNG organizados en `public/assets/branding/` | ✅ CUMPLIDO | 18 archivos vectoriales y rasterizados catalogados en kebab-case. |
| Favicon oficial del navegador muestra el Isotipo de Talentus Scout | ✅ CUMPLIDO | `favicon.ico` y `favicon.svg` actualizados en `index.html`. |
| Componente `<app-brand-logo>` modular y reutilizable | ✅ CUMPLIDO | Implementado con plantilla `.html` separada, 5 inputs y 5 unit tests en verde. |
| Navbar sin emojis provisionales y adaptada a Dark Slate | ✅ CUMPLIDO | Integrado con `BrandLogoComponent` variant="isotipo" theme="color". |
| Footer general con logotipo negativo | ✅ CUMPLIDO | Integrado con `BrandLogoComponent` variant="logotipo" theme="negativo". |
| Pantallas de autenticación con imagotipo corporativo | ✅ CUMPLIDO | Login, Registro Tutor, Registro Scout, Completar Perfil y Auditoría actualizados. |
| Fichas públicas y portal de certificación con isotipo oficial | ✅ CUMPLIDO | `BentoProfileComponent` y `PublicCertifierComponent` actualizados. |
| Correos transaccionales con logo público `https://i.imgur.com/9j8oQ2B.png` | ✅ CUMPLIDO | Plantillas HTML y métodos de `EmailService` actualizados; 7 tests unitarios en verde. |
| Compilación y pruebas automatizadas en verde | ✅ CUMPLIDO | Backend: 189/189 tests PASS; Frontend: 124/124 tests PASS; `ng build` SUCCESS. |

---

## 5. Conclusiones y Estado de la Tarea

La tarea **[TS-54]** ha completado rigurosamente su ciclo de desarrollo, diseño intencional y pruebas unitarias/integración sin regresiones en el código fuente. Se encuentra **LISTA PARA TESTING**.
