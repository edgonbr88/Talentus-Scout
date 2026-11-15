# Plan de Implementación: [TS-71] Botón de retorno al directorio desde la ficha del atleta

**ID Tarea:** TS-71  
**Tarjeta Trello:** https://trello.com/c/jslsCuf1  
**Fecha:** 2026-11-15  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema:** Al explorar y analizar talentos en la plataforma, los reclutadores (scouts), directores deportivos y usuarios abren la ficha deportiva detallada (`/atleta/:slug`). Actualmente, la vista carece de un acceso directo y evidente para retornar al directorio de talentos (`/scout/directory`).
- **Impacto:** Obliga a los usuarios a depender de los botones del navegador o del navbar general, interrumpiendo la fluidez del scouting intensivo.
- **Restricciones legales:** No altera la lógica de privacidad LOPNNA Art. 65 ni expone datos de contacto sin autorización.

## 2. Alcance Técnico y Arquitectura
- **Base de datos:** Sin cambios DDL ni migraciones.
- **Backend:** Sin cambios en Spring Boot 3.
- **Frontend (Angular 18+):**
  - `talentus-scout-fe/src/app/features/public-profile/bento-profile.component.ts`
  - `talentus-scout-fe/src/app/features/public-profile/bento-profile.component.html`
  - `talentus-scout-fe/src/app/features/public-profile/bento-profile.component.css`
  - `talentus-scout-fe/src/app/features/public-profile/bento-profile.component.spec.ts`
  - `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.html` (para propagar `state: { fromDirectory: true }` en los enlaces hacia `/atleta/:slug`).

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No aplica.

## 4. Backend: Spring Boot 3 (Java 21)
- No aplica.

## 5. Frontend: Angular 18+ (Standalone & SSR)
- **Directiva de Diseño:** Seguir `fe-desing.md` / `frontend-design`:
  - Paleta base existente: `#0A0F1D` (`--color-bg-base`), `#141D30` (`--color-surface`), `#22314D` (`--color-border`), `#10B981` (`--color-accent-pitch`), `#F8FAFC` (`--color-text-main`), `#94A3B8` (`--color-text-muted`).
  - Tipografía: `Outfit` / `Inter` (sin labels ALL-CAPS arbitrarios, sin flechas en texto cuando usamos icono SVG, foco visible accesible).
  - Layout: Barra superior sticky (`profile-top-nav`) sobre el contenedor Bento con alineación horizontal izquierda-derecha:
    - Izquierda: Botón de retorno con icono de flecha SVG (`Volver al Directorio`) y migas de pan (`Directorio de Talentos / Ficha de [Nombre del Atleta]`).
    - Responsividad: En móvil, el breadcrumb se adapta limpiamente con truncado (`text-overflow: ellipsis`) sin desbordar el viewport.
- **Separación de Plantillas:** Mantener `templateUrl: './bento-profile.component.html'`.
- **Lógica de Navegación Ergonómica:**
  - Inyectar `Location` (`@angular/common`) y `Router` (`@angular/router`).
  - Detectar en `ngOnInit` (protegido con `isPlatformBrowser(this.platformId)`) si la navegación provino del directorio (`history.state?.fromDirectory === true`).
  - Método `goBackToDirectory()`: si proviene del directorio, invocar `this.location.back()`; en caso contrario, navegar con `this.router.navigate(['/scout/directory'])`.
  - Accesibilidad: `aria-label="Volver al directorio de talentos"`, `<nav aria-label="Ruta de navegación">` para las migas de pan, `:focus-visible` con contorno Pitch Green (`#10B981`).

## 6. Pruebas y Verificación
- **Tests unitarios (`bento-profile.component.spec.ts`):**
  - Verificar que se renderiza el botón de retorno y las migas de pan con el nombre del atleta.
  - Verificar que `goBackToDirectory()` llama a `Location.back()` cuando `fromDirectory` es verdadero.
  - Verificar que `goBackToDirectory()` navega a `/scout/directory` cuando no proviene del directorio.
- **Compilación y tests:**
  - `npm run build` sin errores.
  - `npm test -- --watch=false --browsers=ChromeHeadless` (o configuración disponible en el proyecto) en verde.

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Actualizar `scout-directory.component.html` para incluir `[state]="{ fromDirectory: true }"` en los `routerLink` hacia `/atleta/:slug`.
- [x] Paso 2: Inyectar `Location` y `Router` en `bento-profile.component.ts` e implementar `fromDirectory` y `goBackToDirectory()`.
- [x] Paso 3: Agregar la barra superior sticky `profile-top-nav` con botón de retorno y breadcrumbs en `bento-profile.component.html`.
- [x] Paso 4: Agregar estilos responsivos y accesibles en `bento-profile.component.css` siguiendo los tokens Bento oscuros y Pitch Green.
- [x] Paso 5: Agregar pruebas unitarias en `bento-profile.component.spec.ts` y ejecutar `npm test` y `npm run build`.

## 8. Criterios de Aceptación (DoD)
- [x] La ficha del atleta (`/atleta/:slug`) muestra en su cabecera superior un botón accesible y visible para retornar al directorio de talentos.
- [x] Al hacer clic, redirige al usuario a `/scout/directory` conservando el estado de navegación anterior si provino del directorio.
- [x] El diseño del botón y la barra superior se integra armoniosamente con la estética oscura Bento Grid deportiva sin romper la responsividad mobile/desktop.
- [x] La plantilla HTML y la lógica TypeScript se mantienen en archivos independientes (`templateUrl`).
- [x] Compilación limpia con `npm run build` y pruebas unitarias en verde.
