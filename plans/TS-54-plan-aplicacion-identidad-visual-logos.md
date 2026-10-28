# Plan de Implementación: [TS-54] Aplicación e Integración de Identidad Visual Oficial (Logos, Isotipos, Favicon y Plantillas de Correo)

**ID Tarea:** TS-54  
**Tarjeta Trello:** [https://trello.com/c/xQgOMTP6](https://trello.com/c/xQgOMTP6)  
**ID de Tarjeta:** `6ada068e4deec2ecf5ca32f5`  
**Lista en Trello:** `in development`  
**Sprint:** 4  
**Fecha:** 22 de octubre de 2026  
**Estado del Plan:** IMPLEMENTACIÓN COMPLETADA — EN TESTING  
**Agente Planificador:** trello_planner  
**Agente Implementador:** trello_implementer  

---

## 1. Contexto de Negocio y Justificación

### 1.1. Justificación y Propuesta de Valor
Talentus Scout cuenta con un set oficial de activos de marca corporativa vectoriales (SVG) y de mapa de bits (PNG/JPG) ubicados en `/home/edgar/Talentus Scout/logo`. Hasta ahora, las vistas frontend y las comunicaciones por correo dependían de elementos provisionales (emojis de balón `⚽` en la barra de navegación, favicons por defecto del framework, tipografías planas y textos sin identidad).

Esta tarea integra la identidad oficial de Talentus Scout de forma homogénea, elegante y accesible en toda la plataforma:
- **Confianza Institucional:** Veedores deportivos, directores técnicos de clubes y representantes legales perciben una plataforma profesional, segura y respaldada.
- **Prevención de Suplantación y Phishing (LOPNNA Art. 65):** La unificación visual entre la aplicación web y los correos electrónicos oficiales transaccionales (verificación, invitaciones a avalar atletas, notificaciones de patria potestad) garantiza autenticidad y resguardo de los derechos de imagen de los menores de edad.

---

## 2. Alcance Técnico y Arquitectura

### 2.1. Componentes del Sistema Afectados
1. **Activos Estáticos (`talentus-scout-fe/public/assets/branding/`):**
   - Catalogación de isotipos, logotipos e imagotipos en versiones `color`, `negativo` y `positivo` (SVG y PNG).
   - Sustitución del `favicon.ico` e inclusión del favicon SVG en `index.html`.
2. **Frontend (Angular 18+ Standalone):**
   - Creación del componente standalone `<app-brand-logo>` en `src/app/shared/components/brand-logo/` con separación de `brand-logo.component.ts` y `brand-logo.component.html`.
   - Reemplazo del emoji `⚽` y textos provisionales en `navbar.component.html`.
   - Actualización del footer corporativo en `app.component.html`.
   - Integración del logotipo en pantallas de autenticación: `login.component.html`, `register-tutor.component.html`, `register-scout.component.html`, `complete-profile.component.html` y `scout-pending-audit.component.html`.
   - Inclusión del isotipo en fichas públicas (`bento-profile.component.html`) y portal de certificación (`public-certifier.component.html`).
   - Actualización de metatags Open Graph en `index.html` y `seo.service.ts`.
3. **Backend (Spring Boot 3 / Java 21):**
   - Parametrización en `application.yml` de la URL pública oficial del logo: `talentus.mail.branding.logo-url: https://i.imgur.com/9j8oQ2B.png`.
   - Incorporación de cabecera con el logo en las plantillas HTML: `email-verification.html` y `certification-invite.html`.
   - Incorporación del logo en los métodos dinámicos de notificación en `EmailService.java`.

### 2.2. Dependencias con Otras Tareas
- `TS-25` (Hero y Landing Page con Angular 18)
- `TS-35` (Flujo de Verificación de Correo Electrónico)
- `TS-43` (Portal de Certificación Oficial de Atletas)

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
Esta tarea involucra únicamente activos visuales, plantillas HTML y componentes de presentación. No requiere cambios en el esquema relacional DDL de la base de datos ni migraciones `dbmate`.

---

## 4. Frontend: Angular 18+ (Directivas de Diseño y Componente Reutilizable)

### 4.1. Filosofía de Diseño (`fe-desing.md`)
- **Paleta Intencional:**
  - Verde Césped Oficial: `#68a95a` (SVG cls-1) / `#10B981` (Pitch Emerald).
  - Azul Noche / Slate Profundo: `#16233e` (SVG cls-2) / `#0A0F1D` / `#0F172A`.
  - Blanco Puro: `#FFFFFF` (Variante negativa para alto contraste).
- **Separación Obligatoria:** Todos los componentes se diseñan con archivo TypeScript (`.component.ts`), plantilla externa (`.component.html`) vinculada vía `templateUrl` y hoja de estilo (`.component.css`). Cero plantillas inline.

### 4.2. Componente Standalone `<app-brand-logo>`
- **Ruta:** `talentus-scout-fe/src/app/shared/components/brand-logo/`
- **Archivos:**
  - `brand-logo.component.ts`
  - `brand-logo.component.html`
  - `brand-logo.component.css`
  - `brand-logo.component.spec.ts`

#### API del Componente:
```typescript
@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './brand-logo.component.html',
  styleUrls: ['./brand-logo.component.css']
})
export class BrandLogoComponent {
  @Input() variant: 'isotipo' | 'logotipo' | 'imagotipo' = 'imagotipo';
  @Input() theme: 'color' | 'negativo' | 'positivo' = 'color';
  @Input() height: number | string = 40;
  @Input() altText: string = 'Talentus Scout — Plataforma Oficial';
  @Input() clickable: boolean = false;
  @Input() customClass: string = '';
}
```

### 4.3. Organización de Activos (`public/assets/branding/`)
Copiar los archivos desde `/home/edgar/Talentus Scout/logo` hacia `talentus-scout-fe/public/assets/branding/`:
* `ts-isotipo-color.svg`
* `ts-isotipo-negativo.svg`
* `ts-isotipo-positivo.svg`
* `ts-logotipo-color.svg`
* `ts-logotipo-negativo.svg`
* `ts-logotipo-positivo.svg`
* `ts-imagotipo-color.svg`
* `ts-imagotipo-negativo.svg`
* `ts-imagotipo-positivo.svg`
* `ts-imagotipo-color.png`
* `ts-isotipo-color.png`
* `favicon.svg` y `favicon.ico`

### 4.4. Integración en Plantillas Existentes
1. **`navbar.component.html`:**
   Sustituir el bloque provisional del crest:
   ```html
   <a routerLink="/" class="navbar-brand" aria-label="Ir al inicio de Talentus Scout">
     <app-brand-logo variant="isotipo" theme="color" [height]="38" [clickable]="false"></app-brand-logo>
     <div class="brand-text">
       <span class="brand-title">TALENTUS</span>
       <span class="brand-subtitle">SCOUT</span>
     </div>
   </a>
   ```
2. **`app.component.html` (Footer):**
   ```html
   <div class="footer-brand">
     <app-brand-logo variant="imagotipo" theme="negativo" [height]="48"></app-brand-logo>
     <p class="footer-copy">...</p>
   </div>
   ```
3. **Vistas de Autenticación (`login.component.html`, `register-tutor.component.html`, etc.):**
   Incluir `<app-brand-logo variant="imagotipo" theme="color" [height]="64" [clickable]="true">` en la cabecera de las tarjetas o vistas.
4. **Ficha Pública (`bento-profile.component.html`):**
   Incorporar el Isotipo como icono oficial del badge de certificación.

---

## 5. Backend: Spring Boot 3 (Java 21)

### 5.1. Propiedad de Configuración (`application.yml`)
```yaml
talentus:
  mail:
    branding:
      logo-url: ${TALENTUS_MAIL_LOGO_URL:https://i.imgur.com/9j8oQ2B.png}
```

### 5.2. Plantillas HTML de Correo
En `talentus-scout-be/src/main/resources/templates/mail/`:
1. `email-verification.html`:
   Insertar la imagen corporativa antes del título:
   ```html
   <div class="header">
     <img src="https://i.imgur.com/9j8oQ2B.png" alt="Talentus Scout" class="brand-logo-img" style="max-height: 48px; margin: 0 auto 12px auto; display: block;" />
     <h1 class="brand-title">TALENTUS <span>SCOUT</span></h1>
     <div class="badge-tag">VERIFICACIÓN OFICIAL DE CUENTA</div>
   </div>
   ```
2. `certification-invite.html`:
   Insertar idéntica cabecera corporativa.

### 5.3. Actualización en `EmailService.java`
Actualizar los métodos auxiliares que construyen notificaciones HTML en línea (`sendPaymentStatusNotification`, `sendLegalVerificationResolutionNotification`, `sendScoutVerificationResolutionNotification`, `sendBadgeCertificationResolutionNotification`) para incluir la cabecera estándar con `<img src='https://i.imgur.com/9j8oQ2B.png' .../>`.

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Unitarias de Frontend
- `brand-logo.component.spec.ts`:
  - Verificar que el componente renderiza la ruta correcta de SVG según las entradas `variant` y `theme`.
  - Verificar que el enlace `routerLink` se activa cuando `clickable = true`.
  - Verificar la inclusión del atributo `altText` para accesibilidad A11y.
- `navbar.component.spec.ts` y `app.component.spec.ts`:
  - Validar que compilan con el nuevo componente y assets.

### 6.2. Pruebas de Backend
- `EmailServiceTest.java`:
  - Verificar que las plantillas cargan correctamente y contienen la referencia a `https://i.imgur.com/9j8oQ2B.png`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Copiado y Estandarización de Assets:**
  - Crear carpeta `talentus-scout-fe/public/assets/branding/`.
  - Copiar los archivos SVG y PNG desde `/home/edgar/Talentus Scout/logo` con nombres estandarizados en kebab-case.
  - Copiar el Isotipo como favicon en `public/favicon.ico` y actualizar `index.html`.
- [x] **Paso 2: Creación del Componente `<app-brand-logo>`:**
  - Crear `brand-logo.component.ts`.
  - Crear `brand-logo.component.html` separado con `templateUrl`.
  - Crear `brand-logo.component.css`.
  - Crear `brand-logo.component.spec.ts`.
- [x] **Paso 3: Integración en Componentes Principales:**
  - Actualizar `navbar.component.html` y `navbar.component.ts` (importando `BrandLogoComponent`).
  - Actualizar `app.component.html` y `app.component.ts` (Footer).
  - Actualizar vistas de autenticación (`login.component.html`, `register-tutor.component.html`, `register-scout.component.html`, `complete-profile.component.html`, `scout-pending-audit.component.html`).
  - Actualizar `bento-profile.component.html` y `public-certifier.component.html`.
- [x] **Paso 4: Actualización de Plantillas de Correo (Backend):**
  - Actualizar `email-verification.html`.
  - Actualizar `certification-invite.html`.
  - Actualizar `EmailService.java` incorporando la cabecera visual con el logo.
  - Actualizar `application.yml` con la propiedad `talentus.mail.branding.logo-url`.
- [x] **Paso 5: Validación y Pruebas Automatizadas:**
  - Ejecutar pruebas en backend: `./mvnw test`.
  - Ejecutar pruebas en frontend: `npm test` o `npm run build`.
- [x] **Paso 6: Documentación y Transición a Testing:**
  - Redactar `test/TS-54-test-plan-aplicacion-identidad-visual-logos.md`.
  - Mover la tarjeta en Trello de `in development` a `in testing` y dejar comentario de finalización.

---

## 8. Criterios de Aceptación (DoD)

- [x] Todos los activos vectoriales (SVG) y de mapa de bits están alojados y servidos correctamente desde `public/assets/branding/`.
- [x] El favicon oficial del navegador muestra el Isotipo de Talentus Scout.
- [x] El componente `<app-brand-logo>` es Standalone, reutilizable y cuenta con archivos `.ts` y `.html` separados sin templates inline.
- [x] La Navbar, Footer y vistas de autenticación muestran el logo oficial adaptado a la estética Dark Slate.
- [x] Las plantillas de correo electrónico transaccionales (`email-verification.html`, `certification-invite.html`) y las notificaciones en `EmailService` renderizan el logotipo mediante la URL pública `https://i.imgur.com/9j8oQ2B.png`.
- [x] Tanto el backend (`./mvnw test`) como el frontend (`npm test` / compilación) pasan exitosamente.
