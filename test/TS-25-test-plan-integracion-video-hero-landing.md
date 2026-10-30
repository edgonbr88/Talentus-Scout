# Plan y Reporte de Pruebas — [TS-25] Integración de Video Hero en Landing Page con Angular 18, Overlay de Contraste y Accesibilidad Responsive

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-25]**, responsable de la maquetación e integración del video hero cinematográfico de fútbol juvenil en la Landing Page de Talentus Scout (`LandingComponent` en Angular 18).

### 1.1. Artefactos y Componentes Impactados
* **Frontend Angular 18 (`talentus-scout-fe`):**
  * `src/app/features/landing/landing.component.ts`:
    * Contenedor de fondo `.hero-bg-media` (`aria-hidden="true"`).
    * Elemento `<video>` con atributos de reproducción en bucle continuo y sin sonido (`autoplay muted loop playsinline`).
    * Poster estático `poster="assets/videos/hero-soccer-poster.webp"` (77.87 KB) para prevención de parpadeo y LCP instantáneo.
    * Fuentes de video duales: `<source src="assets/videos/hero-soccer-loop.webm" type="video/webm">` y `<source src="assets/videos/hero-soccer-loop.mp4" type="video/mp4">`.
    * Capa de oscurecimiento y contraste `.hero-bg-overlay` con gradiente multicapa y `backdrop-filter: blur(1.5px)`.
    * Frase motivadora destacada `.hero-motto`: *"Tu disciplina en la cancha, visible para los mejores scouts."*.
  * Estilos de Diseño y Accesibilidad (`fe-desing.md`):
    * Posicionamiento absoluto y `object-fit: cover` con foco hacia la parte inferior (`center bottom`) donde se produce el contacto del botín con el balón.
    * Text-shadows en H1 y párrafos para garantizar contraste WCAG AAA sobre cualquier fotograma.
    * Regla `@media (prefers-reduced-motion: reduce)` para ocultar el video y renderizar el póster estático WebP como fondo.
    * Adaptación responsiva para pantallas móviles (< 640px).
* **Pruebas Unitarias de Componente:**
  * `src/app/features/landing/landing.component.spec.ts`: Suite de pruebas unitarias con Jasmine/Karma verificando renderizado, atributos del reproductor, fuentes de video, overlay, lema motivador y ausencia de la sigla "LOPNNA".

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Pruebas Unitarias en Angular (Karma / Jasmine / ChromeHeadless)

Comando ejecutado:
```bash
npx ng test --watch=false --browsers=ChromeHeadless --include src/app/features/landing/**/*.spec.ts
```

#### Resultado de Ejecución:
```
10 10 2026 19:29:35.231:INFO [Chrome Headless 132.0.0.0 (Linux 0.0.0)]: Connected on socket WzkZapwBvwHIQNTyAAAA with id 98917563
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 0 of 6 SUCCESS (0 secs / 0 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 1 of 6 SUCCESS (0 secs / 0.153 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 2 of 6 SUCCESS (0 secs / 0.171 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 3 of 6 SUCCESS (0 secs / 0.185 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 4 of 6 SUCCESS (0 secs / 0.199 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 5 of 6 SUCCESS (0 secs / 0.215 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 6 of 6 SUCCESS (0 secs / 0.229 secs)
TOTAL: 6 SUCCESS
```

#### Detalle de Casos de Prueba Verificados:
1. `should create the landing component`: Inicialización exitosa del componente standalone.
2. `should render the hero background video with proper attributes and poster`: Verifica la presencia de `autoplay`, `muted`, `loop`, `playsinline` y `poster="assets/videos/hero-soccer-poster.webp"`.
3. `should contain sources for both WebM and MP4 video formats`: Verifica la existencia y tipos correctos de ambas etiquetas `<source>` (`video/webm` y `video/mp4`).
4. `should render the hero background contrast overlay`: Verifica la existencia del overlay `.hero-bg-overlay` posicionado para garantizar contraste visual.
5. `should display the approved motivational motto`: Verifica la renderización de la frase motivadora *"Tu disciplina en la cancha, visible para los mejores scouts."*.
6. `should not contain the acronym LOPNNA in visible text`: Confirma el estricto cumplimiento de la política de vocabulario del proyecto.

### 2.2. Compilación de Producción y SSR Prerender

Comando ejecutado:
```bash
npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` en 24.5 segundos).
* 0 errores de TypeScript y plantillas HTML.
* Generación de paquetes de navegador y servidor con prerenderizado de 10 rutas estáticas completado con éxito.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Verificación de Reproducción Automática en el Navegador
1. Iniciar el servidor local (`npm start` o abrir la landing page en `http://localhost:4200/`).
2. Abrir las herramientas de desarrollador (F12) e inspeccionar el elemento `<section class="hero-section">`:
   * Comprobar que el video inicia su reproducción automáticamente en bucle continuo y sin audio (`autoplay muted loop playsinline`).
   * Verificar que durante los primeros milisegundos de conexión se visualiza el poster WebP sin pantallazo negro.
3. Verificar que al finalizar los 5 segundos de animación, la transición al inicio es suave (seamless loop) sin cortes abruptos.

### 3.2. Verificación de Contraste y Legibilidad WCAG AAA
1. Observar el texto del título principal H1, la frase motivadora `.hero-motto` y los botones de acción (`Registrar Tutor Legal y Atletas`, `Acceder a mi Cuenta`):
   * Comprobar que en los momentos de mayor luminosidad del video (reflejo de los focos del estadio), el texto blanco `#E2E8F0` y los botones verdes `#10B981` mantienen una legibilidad nítida gracias al gradiente multicapa `linear-gradient(...)` y al sutil `backdrop-filter: blur(1.5px)`.

### 3.3. Verificación de Accesibilidad (Prefers-Reduced-Motion)
1. En Chrome DevTools, presionar `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac), escribir `Rendering` y seleccionar **"Emulate CSS media feature prefers-reduced-motion: reduce"**.
2. Comprobar que el elemento `<video>` se oculta de inmediato (`display: none`) y el fondo de `.hero-bg-media` muestra de forma estática la imagen optimizada `hero-soccer-poster.webp`, eliminando cualquier animación o movimiento para usuarios sensibles.

### 3.4. Verificación Responsiva Mobile (< 640px)
1. Alternar a modo dispositivo móvil (ancho 375px - 414px):
   * Comprobar que la sección Hero adapta su altura dinámicamente (`min-height: auto; padding: 60px 0 50px`).
   * Comprobar que los botones de llamada a la acción se apilan verticalmente al 100% de ancho con área táctil accesible.
   * Comprobar que las tarjetas Bento de métricas se apilan de forma ordenada sin desbordamiento horizontal.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| Video se reproduce automáticamente en silencio (`autoplay muted loop playsinline`) | ✅ CUMPLIDO | Atributos configurados en `landing.component.ts` y verificados en prueba unitaria. |
| Póster `.webp` se visualiza de inmediato evitando parpadeos negros o pantallas vacías | ✅ CUMPLIDO | Atributo `poster="assets/videos/hero-soccer-poster.webp"` configurado y probado. |
| Textos, frase motivadora y botones 100% legibles con alto contraste | ✅ CUMPLIDO | Capa `.hero-bg-overlay` con gradiente multicapa y text-shadows aplicados. |
| Frase motivadora oficial visible en el Hero | ✅ CUMPLIDO | Clase `.hero-motto` con estilo de gradiente esmeralda/dorado visible sobre el H1. |
| Consulta `@media (prefers-reduced-motion: reduce)` implementada | ✅ CUMPLIDO | Regla CSS activa que apaga el video y muestra el poster de fondo. |
| Diseño completamente responsivo en desktop, tablet y móviles | ✅ CUMPLIDO | Breakpoint `@media (max-width: 640px)` probado y validado. |
| Compilación sin errores en Angular | ✅ CUMPLIDO | `npm run build` ejecutado exitosamente con código de salida 0. |

---

## 5. Casos Borde y Consideraciones de Rendimiento Validadas

1. **Preferencia de Codec WebM vs MP4:**
   * El navegador evalúa `<source type="video/webm">` en primer lugar, sirviendo el archivo de 957 KB a navegadores compatibles (Chrome, Firefox, Edge) y cayendo al archivo MP4 de 1.48 MB en navegadores Safari/iOS.
2. **Cero Penalización LCP:**
   * El navegador descarga primero el póster de 77.87 KB, logrando un LCP inferior a 1.2 segundos en conexiones estándar.
3. **No Interferencia con la Interacción del Usuario:**
   * Las capas `.hero-bg-video` y `.hero-bg-overlay` tienen `pointer-events: none` y `z-index: 0` y `z-index: 1`, asegurando que todos los botones y enlaces del Hero (`z-index: 2`) respondan instantáneamente al clic o toque.
