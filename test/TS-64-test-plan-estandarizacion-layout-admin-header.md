# Plan de Pruebas y Validación: [TS-64] Estandarización de Layout y Subnavegación del Panel Administrativo (AdminHeaderComponent)

**ID Tarea:** TS-64  
**Título:** Estandarización de Layout y Subnavegación del Panel Administrativo (AdminHeaderComponent)  
**Tarjeta Trello:** [https://trello.com/c/cubcQUXp/109-ts-64-estandarizaci%C3%B3n-de-layout-y-subnavegaci%C3%B3n-del-panel-administrativo-adminheadercomponent](https://trello.com/c/cubcQUXp/109-ts-64-estandarizaci%C3%B3n-de-layout-y-subnavegaci%C3%B3n-del-panel-administrativo-adminheadercomponent)  
**ID Tarjeta en Trello:** `6ae47dfd85c931b40936463c`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-30  
**Estado:** LISTO PARA TESTING  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la uniformidad visual, consistencia intermodular y robustez responsive del panel de administración de Talentus Scout, eliminando inconsistencias previas (enlaces desordenados, textos dispares y botones desalineados) mediante un componente reutilizable de cabecera y subnavegación:

* **Componente Compartido Reutilizable (`AdminHeaderComponent`):**
  * Ubicación: `src/app/shared/components/admin-header/`.
  * Estructura modular estricta: separación de archivos `admin-header.component.ts`, `admin-header.component.html`, `admin-header.component.css` y `admin-header.component.spec.ts`.
  * Inputs requeridos: `title` y `subtitle`.
  * Input opcional: `badgeText` con valor por defecto `'SALVAGUARDA LOPNNA & FIFA'` y badge maestro `'PANEL ADMINISTRATIVO'`.
  * Barra de subnavegación tipo pastillas (pills) con orden intermodular canónico y activación visual mediante `routerLinkActive="active"`.
  * Slot de proyección con selector de atributo `<ng-content select="[actions]"></ng-content>` para albergar botones primarios locales sin acoplamiento.
  * Estilos adaptables y responsivos conformes al Design System y [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md), con scroll táctil horizontal en móviles (`overflow-x: auto; scrollbar-width: none;`).

* **Vistas Administrativas Refactorizadas:**
  1. `/admin/scouts` (`AdminScoutsComponent`): Auditoría y Acreditación de Scouts.
  2. `/admin/verificacion-legal` (`AdminLegalVerificationComponent`): Auditoría de Patria Potestad y Representación Legal.
  3. `/admin/pagos` (`AdminPaymentsComponent`): Auditoría de Pagos y Suscripciones Pro.
  4. `/admin/clubes` (`AdminClubsComponent`): Mantenedor de Clubes y Organizaciones.

* **Estandarización de la Barra de Subnavegación:**
  * En las 4 vistas se presentan siempre las 4 secciones en orden idéntico:
    1. 🕵️‍♂️ `Auditoría Scouts` (`/admin/scouts`)
    2. ⚖️ `Patria Potestad` (`/admin/verificacion-legal`)
    3. 💳 `Auditoría Pagos` (`/admin/pagos`)
    4. 🛡️ `Clubes y Academias` (`/admin/clubes`)

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Pruebas Unitarias del Componente (`AdminHeaderComponent`)
Comando ejecutado:
```bash
npm test -- --include src/app/shared/components/admin-header/admin-header.component.spec.ts --watch=false --browsers=ChromeHeadless
```
**Resultado:** `TOTAL: 5 SUCCESS` (0.377 seg).

| Caso de Prueba | Estado | Validación Verificada |
| :--- | :---: | :--- |
| `should create the admin header component` | ✅ PASS | Instanciación y renderizado en DOM del componente host y de `AdminHeaderComponent`. |
| `should render the title and subtitle accurately` | ✅ PASS | Enlace correcto de `@Input() title` y `@Input() subtitle` en elementos `.admin-title` y `.admin-subtitle`. |
| `should render default admin badge and contextual badge` | ✅ PASS | Renderizado de `PANEL ADMINISTRATIVO` (`.badge-admin`) y `SALVAGUARDA LOPNNA & FIFA` (`.badge-verified`). |
| `should render exactly 4 navigation pills in the standardized order` | ✅ PASS | Presencia de exactamente 4 pastillas con iconos, etiquetas y enlaces canónicos en el orden 1: Scouts, 2: Patria Potestad, 3: Pagos, 4: Clubes. |
| `should project local actions into the actions slot` | ✅ PASS | Proyección exitosa de elementos con selector `[actions]` en el contenedor `.header-actions-slot`. |

---

### 2.2. Verificación de Compilación y Bundles Frontend
Comando ejecutado:
```bash
npm run build
```
**Resultado:** `Application bundle generation complete` (Browser y Server bundles generados limpiamente, 16 rutas estáticas pre-renderizadas sin errores de sintaxis, imports o estilos).

---

### 2.3. Suite Completa de Pruebas Unitarias de Frontend
Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```
**Resultado:** `TOTAL: 154 SUCCESS` (5.485 seg) — **0 errores, 0 fallos, 0 regresiones en toda la aplicación**.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Prerrequisitos de Acceso
1. Iniciar sesión en la plataforma local con una cuenta con rol administrativo (`ROLE_ADMIN`):
   * Email: `admin@talentusscout.com`
   * Contraseña: Credencial configurada en entorno de desarrollo.
2. Navegar al panel administrativo principal en `http://localhost:4200/admin/scouts`.

---

### 3.2. Paso 1: Verificación de la Vista `/admin/scouts`
1. Observar la parte superior de la página:
   * **Badges:** `PANEL ADMINISTRATIVO` (dorado) y `SALVAGUARDA Y PROTECCIÓN DE MENORES` (verde esmeralda).
   * **Título:** `Auditoría y Acreditación de Scouts`.
   * **Acción Local Proyectada:** Botón `Actualizar cola` a la derecha del título con funcionalidad interactiva y spinner en carga.
2. Observar la barra de subnavegación:
   * Se aprecian las 4 pastillas en orden: 🕵️‍♂️ Scouts, ⚖️ Patria Potestad, 💳 Pagos, 🛡️ Clubes.
   * La pastilla `🕵️‍♂️ Auditoría Scouts` tiene la clase `.active`, fondo esmeralda sutil (`rgba(16, 185, 129, 0.14)`), borde esmeralda y brillo.

---

### 3.3. Paso 2: Transición a `/admin/verificacion-legal`
1. Hacer clic sobre la pastilla `⚖️ Patria Potestad`:
   * La URL cambia inmediatamente a `/admin/verificacion-legal`.
   * La pastilla `⚖️ Patria Potestad` pasa a tener el estado activo (`.active`).
   * El título cambia a `Auditoría de Patria Potestad y Representación Legal` con badge `SALVAGUARDA LOPNNA & FIFA`.
   * Se proyecta el botón de recarga de cola local a la derecha sin alterar el layout.

---

### 3.4. Paso 3: Transición a `/admin/pagos`
1. Hacer clic sobre la pastilla `💳 Auditoría Pagos`:
   * La URL cambia a `/admin/pagos`.
   * La pastilla `💳 Auditoría Pagos` se ilumina como activa.
   * El badge contextual muestra `MONETIZACIÓN Y CONCILIACIÓN`.
   * El botón projected muestra `Actualizar Datos`.
   * Las pestañas internas del mantenedor de pagos (Pendientes, Historial, Cupones, Pasarelas, Planes y Precios) conviven debajo del header de forma jerárquica y ordenada.

---

### 3.5. Paso 4: Transición a `/admin/clubes`
1. Hacer clic sobre la pastilla `🛡️ Clubes y Academias`:
   * La URL cambia a `/admin/clubes`.
   * La pastilla `🛡️ Clubes y Academias` se activa.
   * El badge contextual muestra `DIRECTORIO INSTITUCIONAL`.
   * A la derecha se proyecta el botón primario `＋ Registrar Club Oficial` que abre el modal correspondiente.

---

### 3.6. Paso 5: Prueba de Responsividad y Navegación Táctil Móvil
1. Abrir las herramientas de desarrollador (`F12`) y activar la emulación de dispositivos móviles (iPhone 14 / Pixel 7, viewport 390px - 414px):
2. Verificar que:
   * La fila superior apila verticalmente el título y el botón de acción local sin desbordar el contenedor.
   * La barra de subnavegación intermodular mantiene las 4 pastillas alineadas horizontalmente permitiendo scroll táctil suave (`overflow-x: auto`) sin mostrar una barra de scroll tosca (`scrollbar-width: none`).
   * El usuario puede deslizar el dedo o la rueda lateral para acceder a cualquiera de los 4 módulos con tap targets confortables (mínimo 44px de área táctil).

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Cumplimiento |
| :--- | :---: | :--- |
| **Componente Reutilizable:** `AdminHeaderComponent` creado como Standalone en `src/app/shared/components/admin-header/`. | ✅ CUMPLIDO | Archivos modulares `.ts`, `.html`, `.css` y `.spec.ts` creados y vinculados con `templateUrl`. |
| **Separación de Archivos:** Prohibido el uso de inline templates (`template: ...`). | ✅ CUMPLIDO | Uso estricto de `templateUrl: './admin-header.component.html'` y `styleUrls: ['./admin-header.component.css']`. |
| **Subnavegación Canónica:** Las 4 pantallas administrativas deben presentar el mismo orden intermodular idéntico. | ✅ CUMPLIDO | 1: Scouts (`/admin/scouts`), 2: Patria Potestad (`/admin/verificacion-legal`), 3: Pagos (`/admin/pagos`), 4: Clubes (`/admin/clubes`). |
| **Indicador de Ruta Activa:** Resaltado visual consistente mediante `routerLinkActive="active"`. | ✅ CUMPLIDO | Estilo esmeralda `color: #10B981; background: rgba(16, 185, 129, 0.14); border-color: rgba(16, 185, 129, 0.45); box-shadow: 0 0 14px rgba(16, 185, 129, 0.18)`. |
| **Proyección de Acciones:** Ranura `<ng-content select="[actions]">` para acciones locales de cada vista. | ✅ CUMPLIDO | Las 4 vistas proyectan sus botones locales (`Actualizar cola`, `Actualizar Datos`, `Registrar Club Oficial`) preservando eventos y estados reactivos. |
| **Diseño Atlético y Bento:** Conforme a [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md). | ✅ CUMPLIDO | Tokens del Design System (`--color-surface`, `--color-border`, `--color-accent-pitch`), sin estilos genéricos de IA. |
| **Adaptabilidad Responsive:** Scroll táctil sin quiebre de layout en pantallas < 768px. | ✅ CUMPLIDO | Reglas `@media (max-width: 768px)` con scroll suave y ocultamiento estético de scrollbars. |
| **Validación y Pruebas:** Compilación limpia y 100% de tests unitarios pasando. | ✅ CUMPLIDO | `npm run build` exitoso y `TOTAL: 154 SUCCESS` en suite completa de Karma/Jasmine. |

---

## 5. Casos Borde y Consideraciones de Diseño Validadas

1. **Rutas Anidadas o con Query Params:** `routerLinkActive="active"` detecta correctamente la coincidencia de prefijo de ruta permitiendo que la pastilla permanezca activa aun cuando se interactúe con filtros o modales.
2. **Textos Largos de Título o Subtítulo:** El título utiliza `font-size: clamp(1.8rem, 3.2vw, 2.35rem)` y `min-width: 0;` en el contenedor flexible, previniendo desbordamientos horizontales en pantallas medianas.
3. **Ausencia de Badge Opcional:** Si una vista no proporciona `badgeText`, la directiva `*ngIf="badgeText"` oculta limpiamente el elemento sin dejar espacios residuales ni saltos de línea.
4. **Preservación de Lógica Reactiva Local:** Los botones proyectados mantienen íntegro el enlace con signals de Angular (`isLoading()`, `(click)`), garantizando que las pantallas sigan funcionando exactamente igual que antes de la refactorización pero con un layout significativamente superior.
