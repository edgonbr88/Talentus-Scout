# Plan de Implementación: [TS-57] Sección de Contacto Oficial y Redes Sociales en Landing y Footer Global

**ID Tarea:** TS-57  
**Título:** Sección de Contacto Oficial y Redes Sociales en Landing y Footer Global  
**Tarjeta Trello:** [https://trello.com/c/QASylast](https://trello.com/c/QASylast)  
**ID de Tarjeta en Trello:** `6adb48b266a083ec7b848a99`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-26  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

* **Legitimidad Institucional y Cercanía Comunitaria:**  
  Talentus Scout gestiona datos sensibles de atletas menores de edad y conecta a tutores legales con directores de academias y veedores deportivos profesionales. Para consolidar la confianza de los representantes y proyectar una presencia de marca seria y accesible, la plataforma requiere visibilizar de manera prominente sus canales oficiales de comunicación institucional.
* **Canalización de Soporte y Consultas:**  
  Actualmente, un tutor legal o scout que ingresa a la página de inicio o navega por el sistema no dispone de un acceso directo para contactar al equipo administrativo. La habilitación del correo corporativo (`contacto@talentusscout.com`) y de la cuenta oficial de Instagram (`@talentusscout`) permite atender oportunamente inquietudes sobre consentimientos de patria potestad (LOPNNA Art. 65), procesos de auditoría y convenios con academias.
* **Diseño Intencional y Experiencia de Usuario:**  
  En lugar de enlaces genéricos o discretos escondidos en el pie de página, se implementará una doble presencia:
  1. **Sección Bento en la Landing Page:** Bloque visual de alto impacto con tarjetas interactivas que destacan la comunidad en Instagram y la vía de soporte por correo, con copiado rápido al portapapeles.
  2. **Footer Global Persistente:** Presencia permanente en todas las pantallas de la plataforma para acceso rápido por parte de usuarios autenticados y visitantes.

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Afectados:**
  1. **Base de Datos / DDL (dbmate):**
     * No requiere modificaciones en PostgreSQL ni nuevas migraciones DDL. La interacción es enteramente del lado cliente (enlaces externos seguros, protocolo `mailto` y Web Clipboard API).
  2. **Backend (Spring Boot 3 / Java 21):**
     * No requiere nuevos endpoints REST.
  3. **Frontend (Angular 18+ Standalone / HTML separado / Vanilla CSS):**
     * `src/app/features/landing/landing.component.html`: Nueva sección Bento Grid `<section class="community-contact-section">` antes del cierre de `<main class="landing-page">`.
     * `src/app/features/landing/landing.component.css`: Estilos visuales de la sección Bento de contacto, alineados a la paleta nocturna deportiva (`fe-desing.md`).
     * `src/app/features/landing/landing.component.ts`: Lógica reactiva con Signals para copiado rápido de correo al portapapeles (`copiedEmail`), manejo de timers de feedback y separación limpia de plantilla con `templateUrl`.
     * `src/app/app.component.html`: Reestructuración del footer global (`<footer class="main-footer">`) en 3 columnas armónicas (Identidad de Marca, Canales Oficiales y Salvaguarda Legal).
     * `src/app/app.component.css`: Reglas de layout flex/grid responsivas para el footer global.
* **Dependencias:** `TS-25` (Integración de video hero en landing), `TS-54` (Identidad visual y logotipos oficiales).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

* **No aplica migración DDL.**  
* Toda la configuración de canales es estática y canónica:
  * Instagram: `https://www.instagram.com/talentusscout/` (`@talentusscout`)
  * Correo Oficial: `contacto@talentusscout.com`

---

## 4. Backend: Spring Boot 3 (Java 21)

* No se requieren modificaciones en el backend.

---

## 5. Frontend: Angular 18+ (UI / UX e Identidad Visual)

### 5.1. Directrices de Diseño Visual (`fe-desing.md`)
* **Tokens de Color Intencionales:**
  * Fondo Bento Card: `#0E1527` (elevación sutil sobre `#0A0F1D`).
  * Bordes: `rgba(255, 255, 255, 0.08)` con realce hover en `rgba(16, 185, 129, 0.4)` (Instagram/Verde) y `rgba(56, 189, 248, 0.4)` (Correo).
  * Acentos de Marca: Gradiente oficial Instagram adaptado a temática deportiva oscura (`linear-gradient(135deg, #E1306C, #FD1D1D, #F56040)` en acento/hover) y verde esmeralda (`#10B981`) para el correo.
* **Tipografía y Jerarquía:**
  * Eyebrow: `COMUNIDAD Y CONTACTO OFICIAL` en tracking espaciado (`0.12em`), sin estridencias.
  * Título de sección: `Canales Oficiales de Talentus Scout` (h2 sobrio, legible, max 60 caracteres).
  * Copywriting humano y directo:
    * *Instagram:* "Sigue de cerca las clínicas de scouting, coberturas de torneos juveniles y prospectos destacados de la semana."
    * *Correo:* "¿Dudas sobre patria potestad, convenios institucionales o acreditación de scouts? Escríbenos directamente."
* **Separación Obligatoria de Plantillas:**
  * Estricto uso de `templateUrl: './landing.component.html'` y `styleUrl: './landing.component.css'`.
  * Queda prohibido el uso de templates inline.

---

### 5.2. Especificación de Componentes

#### 1. `landing.component.ts` (`src/app/features/landing/landing.component.ts`)
```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  readonly emailCopied = signal<boolean>(false);
  private copyTimeout: any = null;

  readonly officialEmail = 'contacto@talentusscout.com';
  readonly instagramUrl = 'https://www.instagram.com/talentusscout/';

  copyEmail(): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(this.officialEmail).then(() => {
        this.triggerCopiedFeedback();
      }).catch(() => {
        this.fallbackCopyText(this.officialEmail);
      });
    } else {
      this.fallbackCopyText(this.officialEmail);
    }
  }

  private triggerCopiedFeedback(): void {
    this.emailCopied.set(true);
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
    this.copyTimeout = setTimeout(() => {
      this.emailCopied.set(false);
    }, 2500);
  }

  private fallbackCopyText(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.triggerCopiedFeedback();
    } catch (err) {
      console.warn('No se pudo copiar el correo al portapapeles', err);
    }
    document.body.removeChild(textArea);
  }
}
```

---

#### 2. `landing.component.html` (`src/app/features/landing/landing.component.html`)
Se añade la siguiente sección antes del cierre de `</main>`:

```html
  <!-- SECCIÓN BENTO GRID: COMUNIDAD Y CONTACTO OFICIAL -->
  <section class="community-section" id="contacto">
    <div class="container">
      <div class="section-header">
        <span class="section-eyebrow">CANALES DIRECTOS Y REDES SOCIALES</span>
        <h2 class="section-title">Comunidad y Contacto Oficial</h2>
        <p class="section-subtitle">
          Conéctate con el equipo de Talentus Scout, sigue las jornadas de evaluación y resuelve tus dudas institucionales.
        </p>
      </div>

      <div class="community-grid">
        <!-- Tarjeta Bento 1: Instagram Oficial -->
        <article class="bento-card community-card instagram-card">
          <div class="card-top">
            <div class="platform-badge-group">
              <span class="badge badge-official">RED OFICIAL</span>
              <span class="badge badge-verified">EN VIVO</span>
            </div>
            <div class="card-icon-social instagram-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </div>
          </div>

          <div class="card-body-content">
            <h3 class="community-card-title">@talentusscout en Instagram</h3>
            <p class="community-card-desc">
              Cobertura de módulos de captación, clínicas deportivas en academias aliadas, jugadas destacadas y novedades del ecosistema de scouting.
            </p>
          </div>

          <div class="card-action-footer">
            <a
              [href]="instagramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline-instagram"
              aria-label="Abrir perfil de Instagram de Talentus Scout en una nueva pestaña"
            >
              <span>Seguir en Instagram</span>
              <span class="action-icon" aria-hidden="true">↗</span>
            </a>
            <span class="handle-tag">@talentusscout</span>
          </div>
        </article>

        <!-- Tarjeta Bento 2: Correo Corporativo y Soporte -->
        <article class="bento-card community-card mail-card">
          <div class="card-top">
            <div class="platform-badge-group">
              <span class="badge badge-verified">ATENCIÓN OFICIAL</span>
              <span class="badge badge-legal">RESPALDO LEGAL</span>
            </div>
            <div class="card-icon-social mail-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
          </div>

          <div class="card-body-content">
            <h3 class="community-card-title">Atención y Soporte Institucional</h3>
            <p class="community-card-desc">
              Canal directo para representantes, scouts acreditados y academias. Consultas sobre patria potestad, validación de fichas y convenios formativos.
            </p>
            <div class="email-display-box">
              <code class="email-text">{{ officialEmail }}</code>
            </div>
          </div>

          <div class="card-action-footer mail-actions">
            <a
              [href]="'mailto:' + officialEmail"
              class="btn btn-primary btn-sm"
              aria-label="Enviar correo a contacto@talentusscout.com"
            >
              <span>Escribir Correo</span>
              <span class="action-icon" aria-hidden="true">✉</span>
            </a>

            <button
              type="button"
              (click)="copyEmail()"
              class="btn btn-secondary btn-sm btn-copy-email"
              [class.copied]="emailCopied()"
              [attr.aria-label]="emailCopied() ? 'Correo copiado al portapapeles' : 'Copiar dirección de correo al portapapeles'"
            >
              <span *ngIf="!emailCopied()">📋 Copiar</span>
              <span *ngIf="emailCopied()">✓ ¡Copiado!</span>
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
```

---

#### 3. `landing.component.css` (`src/app/features/landing/landing.component.css`)
Estilos dedicados a la sección Bento de contacto y redes sociales:
```css
/* Sección Comunidad y Contacto */
.community-section {
  padding: 60px 0 80px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.community-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.community-card {
  grid-column: span 6;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: #0E1527;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md, 16px);
  padding: 32px;
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.community-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
}

.instagram-card:hover {
  border-color: rgba(225, 48, 108, 0.45);
}

.mail-card:hover {
  border-color: rgba(16, 185, 129, 0.45);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.platform-badge-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-icon-social {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.instagram-icon-wrap {
  background: linear-gradient(135deg, rgba(225, 48, 108, 0.15), rgba(245, 96, 64, 0.15));
  border: 1px solid rgba(225, 48, 108, 0.3);
  color: #F56040;
}

.mail-icon-wrap {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10B981;
}

.card-body-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.community-card-title {
  font-family: var(--font-family-display, sans-serif);
  font-size: 20px;
  font-weight: 800;
  color: #F8FAFC;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}

.community-card-desc {
  font-size: 14.5px;
  color: #94A3B8;
  line-height: 1.6;
  margin: 0;
}

.email-display-box {
  margin-top: 14px;
  background-color: #080D1A;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  width: fit-content;
}

.email-text {
  font-family: monospace;
  font-size: 13.5px;
  color: #38BDF8;
}

.card-action-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-outline-instagram {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 700;
  color: #F8FAFC;
  background: linear-gradient(135deg, rgba(225, 48, 108, 0.2), rgba(245, 96, 64, 0.2));
  border: 1px solid rgba(225, 48, 108, 0.5);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-outline-instagram:hover {
  background: linear-gradient(135deg, #E1306C, #F56040);
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(225, 48, 108, 0.4);
}

.handle-tag {
  font-size: 13px;
  color: #64748B;
  font-weight: 600;
}

.mail-actions {
  justify-content: flex-start;
}

.btn-copy-email {
  transition: all 0.2s ease;
}

.btn-copy-email.copied {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: #10B981;
  color: #34D399;
}

/* Responsividad */
@media (max-width: 900px) {
  .community-card {
    grid-column: span 12;
  }
}

@media (max-width: 540px) {
  .community-card {
    padding: 24px 20px;
  }
  .card-action-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-outline-instagram {
    justify-content: center;
  }
  .handle-tag {
    text-align: center;
  }
  .mail-actions {
    flex-direction: row;
  }
  .mail-actions .btn {
    flex: 1;
    justify-content: center;
  }
}
```

---

#### 4. `app.component.html` (`src/app/app.component.html`)
Actualización del footer global para estructurarlo en 3 bloques accesibles y limpios:

```html
<app-navbar></app-navbar>

<div class="main-content">
  <router-outlet></router-outlet>
</div>

<footer class="main-footer">
  <div class="container footer-container">
    <!-- Columna 1: Identidad y Misión -->
    <div class="footer-brand">
      <div class="footer-logo-container">
        <app-brand-logo variant="logotipo" theme="dark" [height]="46" [clickable]="true" altText="TALENTUS SCOUT"></app-brand-logo>
      </div>
      <p class="footer-copy">
        Plataforma Oficial de Fichas Deportivas y Scouting de Fútbol Juvenil.
        Protección y salvaguarda integral del menor en el ámbito deportivo digital.
      </p>
    </div>

    <!-- Columna 2: Canales Oficiales y Redes -->
    <div class="footer-channels">
      <span class="footer-col-title">Canales Oficiales</span>
      <div class="footer-links-group">
        <a
          href="https://www.instagram.com/talentusscout/"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link-item"
          aria-label="Instagram oficial @talentusscout (abre en nueva pestaña)"
        >
          <svg class="footer-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          <span>Instagram: @talentusscout</span>
        </a>

        <a
          href="mailto:contacto@talentusscout.com"
          class="footer-link-item"
          aria-label="Enviar correo institucional a contacto@talentusscout.com"
        >
          <svg class="footer-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>contacto@talentusscout.com</span>
        </a>
      </div>
    </div>

    <!-- Columna 3: Salvaguarda Legal y Derechos -->
    <div class="footer-legal">
      <span class="badge badge-verified">PROTECCIÓN AL MENOR CERTIFICADA</span>
      <span class="legal-text">LOPNNA Art. 65 · Normativas FIFA de Menores</span>
      <span class="legal-text">© 2026 Talentus Scout. Todos los derechos reservados.</span>
    </div>
  </div>
</footer>
```

---

#### 5. `app.component.css` (`src/app/app.component.css`)
Estilos del footer global:

```css
.main-content {
  min-height: calc(100vh - 160px);
}

.main-footer {
  background-color: var(--color-surface, #0F172A);
  border-top: 1px solid var(--color-border, #1E293B);
  padding: 40px 0 28px;
}

.footer-container {
  display: grid;
  grid-template-columns: 1.5fr 1.2fr 1fr;
  align-items: flex-start;
  gap: 36px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
}

.footer-logo-container {
  margin-bottom: 14px;
}

.footer-copy {
  font-size: 13.5px;
  color: var(--color-text-muted, #94A3B8);
  line-height: 1.55;
  margin: 0;
  max-width: 44ch;
}

.footer-channels {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-col-title {
  font-family: var(--font-family-display, sans-serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent-pitch, #10B981);
}

.footer-links-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-link-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: #E2E8F0;
  text-decoration: none;
  transition: color 0.2s ease, transform 0.2s ease;
}

.footer-link-item:hover {
  color: #10B981;
  transform: translateX(3px);
}

.footer-icon {
  color: #94A3B8;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.footer-link-item:hover .footer-icon {
  color: #10B981;
}

.footer-legal {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.legal-text {
  font-size: 12px;
  color: var(--color-text-dim, #64748B);
  line-height: 1.4;
}

/* Responsividad */
@media (max-width: 960px) {
  .footer-container {
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  .footer-legal {
    grid-column: span 2;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
}

@media (max-width: 640px) {
  .footer-container {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .footer-legal {
    grid-column: span 1;
  }
}
```

---

## 6. Pruebas y Verificación

### 6.1. Verificaciones Funcionales
1. **Enlace de Instagram:**
   * Al hacer clic en el botón *"Seguir en Instagram"* o en el enlace del footer, se debe abrir en una pestaña nueva la URL: `https://www.instagram.com/talentusscout/`.
   * Verificar en el DOM la presencia obligatoria de los atributos de seguridad `target="_blank"` y `rel="noopener noreferrer"`.
2. **Acción de Correo Directo (`mailto`):**
   * Al hacer clic en *"Escribir Correo"*, el navegador debe disparar el protocolo `mailto:contacto@talentusscout.com`.
3. **Copiado al Portapapeles con Retroalimentación:**
   * Al pulsar el botón *"Copiar"* en la tarjeta de correo, el valor `contacto@talentusscout.com` se copia en el portapapeles del sistema operativo.
   * El texto del botón cambia reactivamente a *"✓ ¡Copiado!"* con color verde durante 2.5 segundos y luego retorna a su estado inicial.
4. **Footer Global:**
   * Verificar que en cualquier ruta (`/`, `/dashboard`, `/admin/pagos`, `/scout/directory`, etc.) el footer despliega correctamente los enlaces de Instagram y correo institucional.

### 6.2. Verificaciones Visuales y de Accesibilidad (WCAG)
* **Contraste de Color:** Mínimo ratio 4.5:1 en textos secundarios contra fondo `#0E1527`.
* **Navegación por Teclado:** Foco visible en todos los botones y enlaces interactivos mediante `Tab` y activación con `Enter` / `Espacio`.
* **Diseño Responsivo:** Probar en resoluciones de 360px (mobile estrecho), 768px (tablet) y 1280px+ (desktop).

### 6.3. Verificación de Compilación
* Compilación completa sin errores de TypeScript ni linter:
  ```bash
  cd talentus-scout-fe && npm run build
  ```

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Extracción de estilos en `LandingComponent`**
  - Asegurar la separación de `styles: [...]` hacia `landing.component.css` y vincularlo mediante `styleUrl: './landing.component.css'`.
- [x] **Paso 2: Implementación de la lógica de copiado en `landing.component.ts`**
  - Declarar el Signal `emailCopied = signal(false)` y el método `copyEmail()`.
- [x] **Paso 3: Integración de la sección Bento en `landing.component.html`**
  - Incorporar `<section class="community-section" id="contacto">` con las tarjetas de Instagram y Correo.
- [x] **Paso 4: Adición de estilos en `landing.component.css`**
  - Agregar las clases de grid, hover, botones degradados y breakpoints responsivos.
- [x] **Paso 5: Actualización del Footer Global en `app.component.html`**
  - Reestructurar el footer en 3 columnas: Identidad de Marca, Canales Oficiales y Salvaguarda Legal.
- [x] **Paso 6: Estilos del Footer Global en `app.component.css`**
  - Incorporar el grid responsivo y micro-interacciones hover para los enlaces.
- [x] **Paso 7: Validación de compilación y pruebas manuales**
  - Ejecutar `npm run build` en `talentus-scout-fe`.
  - Probar copiado de portapapeles y enlaces externos.
- [x] **Paso 8: Generación del documento de pruebas en `test/`**
  - Redactar `test/TS-57-test-plan-seccion-contacto-rrss.md`.
- [x] **Paso 9: Mover tarjeta en Trello**
  - Trasladar `[TS-57]` a la columna `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [x] La Landing Page cuenta con una sección dedicada de contacto y RRSS con diseño Bento armónico con el resto de la página.
- [x] El enlace de Instagram abre en nueva pestaña segura (`_blank` con `noopener noreferrer`) hacia `https://www.instagram.com/talentusscout/`.
- [x] El botón de correo abre el cliente local con `mailto:contacto@talentusscout.com` y el botón de copiado almacena la dirección en el portapapeles mostrando feedback instantáneo.
- [x] El Footer global (`app.component`) exhibe los enlaces de contacto y redes de forma permanente en todas las pantallas del sistema.
- [x] Diseño completamente responsivo verificado en móvil y escritorio.
- [x] Código modular en Angular 18+ sin templates inline, cumpliendo las directrices de `fe-desing.md` y compilando limpiamente (`npm run build`).
