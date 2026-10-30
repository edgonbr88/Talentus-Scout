# Plan de Implementación: [TS-64] Estandarización de Layout y Subnavegación del Panel Administrativo (AdminHeaderComponent)

**ID Tarea:** TS-64  
**Título:** Estandarización de Layout y Subnavegación del Panel Administrativo (AdminHeaderComponent)  
**Tarjeta Trello:** [https://trello.com/c/cubcQUXp/109-ts-64-estandarizaci%C3%B3n-de-layout-y-subnavegaci%C3%B3n-del-panel-administrativo-adminheadercomponent](https://trello.com/c/cubcQUXp/109-ts-64-estandarizaci%C3%B3n-de-layout-y-subnavegaci%C3%B3n-del-panel-administrativo-adminheadercomponent)  
**ID de Tarjeta en Trello:** `6ae47dfd85c931b40936463c`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-30  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

* **Diagnóstico de Inconsistencias Visuales:**  
  En las distintas pantallas operativas del panel administrativo (`/admin/scouts`, `/admin/pagos`, `/admin/verificacion-legal`, `/admin/clubes`), los encabezados y botones presentaban severas discrepancias:
  - Enlaces de navegación intermodular repetidos en orden aleatorio según la vista.
  - Etiquetas discordantes para el mismo módulo (ej. *"Verificación de Scouts"* vs *"Auditoría Scouts"*).
  - Márgenes dispares e inline styles (`mr-2`, `margin-right: 8px`, sin espaciado).
  - Mezcla en el mismo contenedor de la navegación general de módulos con las acciones locales de la vista (ej. *"Actualizar cola"*, *"Registrar Club Oficial"*).
  - Comportamiento desordenado y quiebre de layout en viewports móviles (< 768px).
* **Valor para el Operador y Confiabilidad:**  
  Proveer una barra de subnavegación y encabezado unificado reduce la fatiga visual de los auditores y administradores, ofreciendo transiciones fluidas, orientación espacial inmediata del módulo activo y botones de acción primaria ergonomizados tanto en escritorio como en dispositivos móviles.
* **Alineación con el Sistema de Diseño:**  
  Cumplimiento de las directrices de `fe-desing.md` (diseño intencional deportivo, alto contraste, chips de navegación nítidos con `routerLinkActive`, tipografía estructurada y eliminación de código CSS redundante).

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Afectados:**
  1. **Base de Datos / DDL:**
     * No aplica (tarea 100% orientada a Frontend y UI/UX).
  2. **Backend:**
     * No aplica (no se modifican endpoints ni servicios backend).
  3. **Frontend (Angular 18+ Standalone / Bento & Header System):**
     * **Nuevo Componente Compartido:** `AdminHeaderComponent` en `src/app/shared/components/admin-header/`:
       - `admin-header.component.ts`: Componente standalone (`imports: [CommonModule, RouterLink, RouterLinkActive]`).
       - `admin-header.component.html`: Plantilla externa con `templateUrl` estructurada en encabezado, badges, títulos, barra de subnavegación fija de módulos y ranura de proyección `<ng-content select="[actions]">`.
       - `admin-header.component.css`: Estilos encapsulados con scroll horizontal táctil en mobile, chips con estado activo esmeralda y soporte de accesibilidad.
     * **Migración en Vistas Administrativas:**
       - `src/app/features/admin/scouts/admin-scouts.component.ts` y `.html`: Reemplazo del `<header class="admin-header">` manual por `<app-admin-header>`.
       - `src/app/features/admin/legal-verification/admin-legal-verification.component.ts` y `.html`: Reemplazo por `<app-admin-header>`.
       - `src/app/features/admin/payments/admin-payments.component.ts` y `.html`: Reemplazo por `<app-admin-header>`.
       - `src/app/features/admin/clubs/admin-clubs.component.ts` y `.html`: Reemplazo por `<app-admin-header>`.
     * **Pruebas y Verificación:**
       - Pruebas unitarias para `AdminHeaderComponent` (`admin-header.component.spec.ts`).
       - Actualización y validación de las suites de prueba de componentes existentes.
       - Compilación limpia con `npm run build` y ejecución de tests con `npm test`.

---

## 3. Modelo de Datos y Migraciones

* No aplica.

---

## 4. Backend: Spring Boot 3 (Java 21)

* No aplica.

---

## 5. Frontend: Angular 18+ (Standalone & Componentes)

### 5.1. Nuevo Componente: `AdminHeaderComponent`
**Ubicación:** `talentus-scout-fe/src/app/shared/components/admin-header/`

#### 1. `admin-header.component.ts`:
```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AdminNavModule {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css']
})
export class AdminHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input() badgeText = 'SALVAGUARDA LOPNNA & FIFA';

  readonly navModules: AdminNavModule[] = [
    { label: 'Auditoría Scouts', icon: '🕵️‍♂️', route: '/admin/scouts' },
    { label: 'Patria Potestad', icon: '⚖️', route: '/admin/verificacion-legal' },
    { label: 'Auditoría Pagos', icon: '💳', route: '/admin/pagos' },
    { label: 'Clubes y Academias', icon: '🛡️', route: '/admin/clubes' }
  ];
}
```

#### 2. `admin-header.component.html`:
```html
<header class="admin-shared-header">
  <!-- FILA SUPERIOR: BADGES Y ACCIONES LOCALES -->
  <div class="header-top-row">
    <div class="header-content">
      <div class="header-badges">
        <span class="badge badge-admin">PANEL ADMINISTRATIVO</span>
        <span class="badge badge-verified" *ngIf="badgeText">{{ badgeText }}</span>
      </div>
      <h1 class="admin-title">{{ title }}</h1>
      <p class="admin-subtitle">{{ subtitle }}</p>
    </div>

    <!-- RANURA DE ACCIONES PRIMARIAS LOCALES DE LA PANTALLA -->
    <div class="header-actions-slot">
      <ng-content select="[actions]"></ng-content>
    </div>
  </div>

  <!-- BARRA ESTANDARIZADA DE SUBNAVEGACIÓN INTERMODULAR -->
  <nav class="admin-subnav" aria-label="Navegación de módulos administrativos">
    <div class="subnav-container">
      <a
        *ngFor="let mod of navModules"
        [routerLink]="mod.route"
        routerLinkActive="active"
        class="subnav-pill"
      >
        <span class="pill-icon" aria-hidden="true">{{ mod.icon }}</span>
        <span class="pill-label">{{ mod.label }}</span>
      </a>
    </div>
  </nav>
</header>
```

#### 3. `admin-header.component.css`:
* Tokens de diseño según `fe-desing.md`:
  - Contenedor con fondo sutil translúcido y borde nítido inferior.
  - Subnavegación con pills elegantes de esquinas redondeadas (`--radius-sm`), tipografía limpia de 13px con pesos diferenciados.
  - Estado activo (`.subnav-pill.active`): Fondo `rgba(16, 185, 129, 0.15)`, borde `1px solid rgba(16, 185, 129, 0.4)`, color de texto esmeralda `#10B981` y brillo sutil.
  - Estado inactivo (`.subnav-pill`): Fondo `rgba(255, 255, 255, 0.04)`, borde `1px solid rgba(255, 255, 255, 0.08)`, color `#94A3B8`.
  - Scroll horizontal suave en móviles: `overflow-x: auto`, `scrollbar-width: none` y `-webkit-overflow-scrolling: touch`.

### 5.2. Refactorización en Vistas Administrativas

1. **`admin-scouts.component`:**
   - Importar `AdminHeaderComponent` en `imports: [...]`.
   - Reemplazar `<header class="admin-header">` por:
     ```html
     <app-admin-header
       title="Auditoría y Acreditación de Scouts"
       subtitle="Verifica la autenticidad de credenciales consignadas por reclutadores y directores de clubes antes de habilitar su acceso al radar privado de talentos juveniles."
       badgeText="SALVAGUARDA Y PROTECCIÓN DE MENORES"
     >
       <div actions class="local-actions">
         <button (click)="loadPendingScouts()" [disabled]="isLoading()" class="btn btn-primary btn-sm" type="button">
           <span *ngIf="isLoading()" class="spinner-small"></span>
           Actualizar cola
         </button>
       </div>
     </app-admin-header>
     ```

2. **`admin-legal-verification.component`:**
   - Importar `AdminHeaderComponent`.
   - Reemplazar header por:
     ```html
     <app-admin-header
       title="Auditoría de Patria Potestad y Representación Legal"
       subtitle="Coteja en paralelo la documentación de identidad del tutor frente a la partida de nacimiento del menor para certificar la potestad jurídica antes de permitir su visibilidad pública y ante scouts."
       badgeText="SALVAGUARDA LOPNNA & FIFA"
     >
       <div actions class="local-actions">
         <button (click)="loadData()" [disabled]="isLoading()" class="btn btn-primary btn-sm" type="button">
           <span *ngIf="isLoading()" class="spinner-small"></span>
           Actualizar cola
         </button>
       </div>
     </app-admin-header>
     ```

3. **`admin-payments.component`:**
   - Importar `AdminHeaderComponent`.
   - Reemplazar header por:
     ```html
     <app-admin-header
       title="Auditoría de Pagos y Suscripciones Pro"
       subtitle="Supervisa los ingresos de la plataforma, concilia transferencias de Pago Móvil y audita las activaciones automáticas de Binance Pay."
       badgeText="MONETIZACIÓN Y CONCILIACIÓN"
     >
       <div actions class="local-actions">
         <button (click)="loadSummary(); loadPendingPayments();" [disabled]="isLoading()" class="btn btn-primary btn-sm" type="button">
           <span *ngIf="isLoading()" class="spinner-small"></span>
           Actualizar Datos
         </button>
       </div>
     </app-admin-header>
     ```

4. **`admin-clubs.component`:**
   - Importar `AdminHeaderComponent`.
   - Reemplazar header por:
     ```html
     <app-admin-header
       title="Mantenedor de Clubes y Organizaciones"
       subtitle="Gestiona, audita y valida las academias, clubes formativos y universidades del fútbol juvenil venezolano. Promueve organizaciones oficiales y administra la integridad del ecosistema deportivo."
       badgeText="DIRECTORIO INSTITUCIONAL"
     >
       <div actions class="local-actions">
         <button (click)="openCreateModal()" class="btn btn-primary btn-sm" type="button">
           <span class="btn-icon">＋</span> Registrar Club Oficial
         </button>
       </div>
     </app-admin-header>
     ```

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Automatizadas Frontend (Jasmine / Karma)
* Crear `admin-header.component.spec.ts`:
  - Verifica inicialización correcta del componente.
  - Verifica renderización de los 4 pills de navegación intermodular en orden correcto.
  - Verifica proyección de acciones locales vía `<ng-content select="[actions]">`.
  - Verifica enlace activo con `RouterTestingModule` / `provideRouter`.

### 6.2. Verificación de Compilación
* Ejecución de `npm run build` comprobando bundle limpio tanto para client como para server (SSR).
* Ejecución de `npm test -- --watch=false --browsers=ChromeHeadless`.

### 6.3. Verificación Visual Responsiva
* Comprobación en desktop (> 1024px): Fila superior con títulos y botón local alineado a la derecha; barra de subnavegación horizontal con espaciado constante.
* Comprobación en tablet (768px - 1023px): Pills alineadas con espacio touch cómodo.
* Comprobación en mobile (< 640px): Subnavegación en scroll horizontal continuo con chips no quebrados, botón local a ancho completo.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Creación de Componente Compartido `AdminHeaderComponent`**
  - [x] Crear directorio `talentus-scout-fe/src/app/shared/components/admin-header/`.
  - [x] Implementar `admin-header.component.ts` (standalone, tipado, inputs).
  - [x] Implementar `admin-header.component.html` con estructura semántica y `ng-content`.
  - [x] Implementar `admin-header.component.css` con diseño deportivo y adaptabilidad mobile.

- [x] **Paso 2: Pruebas Unitarias de `AdminHeaderComponent`**
  - [x] Crear `admin-header.component.spec.ts`.
  - [x] Verificar paso de pruebas unitarias.

- [x] **Paso 3: Refactorización en `AdminScoutsComponent`**
  - [x] Importar `AdminHeaderComponent` en `admin-scouts.component.ts`.
  - [x] Actualizar `admin-scouts.component.html` para emplear `<app-admin-header>`.
  - [x] Limpiar clases CSS redundantes.

- [x] **Paso 4: Refactorización en `AdminLegalVerificationComponent`**
  - [x] Importar `AdminHeaderComponent` en `admin-legal-verification.component.ts`.
  - [x] Actualizar `admin-legal-verification.component.html`.
  - [x] Limpiar clases CSS redundantes.

- [x] **Paso 5: Refactorización en `AdminPaymentsComponent`**
  - [x] Importar `AdminHeaderComponent` en `admin-payments.component.ts`.
  - [x] Actualizar `admin-payments.component.html`.
  - [x] Limpiar clases CSS redundantes.

- [x] **Paso 6: Refactorización en `AdminClubsComponent`**
  - [x] Importar `AdminHeaderComponent` en `admin-clubs.component.ts`.
  - [x] Actualizar `admin-clubs.component.html`.
  - [x] Limpiar clases CSS redundantes.

- [x] **Paso 7: Compilación y Suite Completa de Tests**
  - [x] Ejecutar `npm run build` y asegurar 0 errores de TypeScript o plantillas.
  - [x] Ejecutar `npm test -- --watch=false --browsers=ChromeHeadless` y verificar 100% de tests en verde.
  - [x] Redactar plan de pruebas en `test/TS-64-test-plan-estandarizacion-layout-admin-header.md`.
  - [x] Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

1. [x] **Componente Compartido Standalone:** `AdminHeaderComponent` creado con separación obligatoria de archivo TypeScript y plantilla HTML.
2. [x] **Consistencia Total en 4 Módulos:** `/admin/scouts`, `/admin/verificacion-legal`, `/admin/pagos` y `/admin/clubes` presentan idéntico orden de subnavegación: 🕵️‍♂️ Scouts, ⚖️ Patria Potestad, 💳 Pagos, 🛡️ Clubes.
3. [x] **Separación Clara de Navegación y Acciones:** Los botones locales de cada pantalla se proyectan limpiamente vía `<ng-content select="[actions]">` sin mezclarse con la subnavegación.
4. [x] **Indicador de Módulo Activo:** El pill correspondiente a la ruta actual se resalta automáticamente con `routerLinkActive="active"` en verde esmeralda.
5. [x] **Diseño Responsivo (< 768px):** En pantallas pequeñas, la barra de subnavegación permite desplazamiento horizontal táctil suave sin romper el layout y los botones locales se adaptan ergonómicamente.
6. [x] **Operatividad Intacta:** Todas las acciones existentes ("Actualizar cola", "Actualizar Datos", "Registrar Club Oficial") y sus spinners conservan su comportamiento 100%.
7. [x] **Compilación y Pruebas en Verde:** `npm run build` y `npm test` finalizan exitosamente sin advertencias críticas ni errores.
8. [x] **Documentación y Trazabilidad:** Archivo `test/TS-64-test-plan-estandarizacion-layout-admin-header.md` generado y tarjeta en Trello trasladada a `in testing`.
