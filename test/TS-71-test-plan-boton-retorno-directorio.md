# Plan de Pruebas: [TS-71] Botón de retorno al directorio desde la ficha del atleta

**ID Tarea:** TS-71  
**Tarjeta Trello:** https://trello.com/c/jslsCuf1  
**Fecha:** 2026-11-15  
**Estado:** LISTO PARA TESTING  

---

## 1. Alcance de las Pruebas
- **Frontend (`talentus-scout-fe`):**
  - `src/app/features/public-profile/bento-profile.component.ts`
  - `src/app/features/public-profile/bento-profile.component.html`
  - `src/app/features/public-profile/bento-profile.component.css`
  - `src/app/features/public-profile/bento-profile.component.spec.ts`
  - `src/app/features/scout-directory/scout-directory.component.html`

## 2. Pruebas Automatizadas Ejecutadas
- **Compilación Angular (Browser + SSR):**
  - Comando: `cd talentus-scout-fe && npm run build`
  - Resultado: **PASS** (Código de salida `0`, 20 rutas estáticas prerenderizadas sin errores).
- **Pruebas Unitarias Jasmine/Karma (`BentoProfileComponent`):**
  - Comando: `cd talentus-scout-fe && npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/features/public-profile/bento-profile.component.spec.ts"`
  - Resultado: **PASS** (`TOTAL: 7 SUCCESS`).
  - Casos verificados:
    - Renderizado de la barra superior (`profile-top-nav`), botón `Volver al Directorio` con `aria-label="Volver al directorio de talentos"`, y migas de pan `Directorio de Talentos / Ficha de Gabriel Pérez`.
    - Fallback a `router.navigate(['/scout/directory'])` cuando la navegación no proviene del directorio.
    - Invocación de `Location.back()` cuando `history.state.fromDirectory === true` (y `window.history.length > 1`).

## 3. Guía de Pruebas Manuales (UI)
1. **Navegación desde el Directorio de Scouts:**
   - Iniciar sesión como Scout y abrir `/scout/directory`.
   - Aplicar filtros (ej. categoría o posición) y hacer clic en **Ficha Completa** o en el nombre de cualquier atleta.
   - **Resultado esperado:** Se abre `/atleta/:slug` mostrando en la parte superior la barra sticky `profile-top-nav` con el botón **Volver al Directorio** y las migas de pan `Directorio de Talentos / Ficha de <Nombre>`.
   - Hacer clic en **Volver al Directorio**.
   - **Resultado esperado:** Retorna al directorio (`/scout/directory`) mediante `Location.back()` preservando el historial de navegación.
2. **Acceso directo por URL (Fallback):**
   - Abrir directamente en una pestaña nueva `http://localhost:4200/atleta/<slug>`.
   - Hacer clic en **Volver al Directorio** o en el enlace **Directorio de Talentos** de las migas de pan.
   - **Resultado esperado:** Redirige a `/scout/directory`.
3. **Responsividad y Accesibilidad:**
   - Verificar en viewport móvil (`<= 640px`) que el botón ocupa el ancho completo sin desbordar y que el nombre del atleta en el breadcrumb trunca con puntos suspensivos si es largo.
   - Navegar con teclado (`Tab`) hasta el botón y enlace de breadcrumb: verificar el anillo de foco visible en verde `#10B981`.

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] La ficha del atleta (`/atleta/:slug`) muestra en su cabecera superior un botón accesible y visible para retornar al directorio de talentos.
- [x] Al hacer clic, redirige al usuario a `/scout/directory` conservando el estado de navegación anterior si provino del directorio.
- [x] El diseño del botón y la barra superior se integra con la estética oscura Bento Grid deportiva sin romper la responsividad mobile/desktop.
- [x] La plantilla HTML y la lógica TypeScript se mantienen en archivos independientes (`templateUrl`).
- [x] Compilación limpia con `npm run build` y pruebas unitarias en verde.

## 5. Casos Borde y Consideraciones
- **SSR (`isPlatformBrowser`):** La lectura de `window.history.state` y `window.history.length` está protegida con `isPlatformBrowser(this.platformId)` para evitar errores en Server-Side Rendering.
- **Movimiento reducido:** Se respeta `@media (prefers-reduced-motion: reduce)` desactivando transiciones y desplazamientos en hover/active.
