# Plan de Implementación — [TS-25] Integración de Video Hero en Landing Page con Angular 18, Overlay de Contraste y Accesibilidad Responsive

## 1. Identificación
* **ID de la Tarea:** `[TS-25]`
* **Título:** Integración de Video Hero en Landing Page con Angular 18, Overlay de Contraste y Accesibilidad Responsive
* **Tarjeta en Trello:** [https://trello.com/c/m7ZzWp3n](https://trello.com/c/m7ZzWp3n) (ID: `6acab2da48235b4f3d40afef`)
* **Sprint / Fase:** Sprint 1 — Conversión y Experiencia de Usuario (Hero Landing)
* **Estado:** `in development`

---

## 2. Resumen y Contexto de Negocio

### 2.1. Justificación y Valor para el Usuario
Una vez generados los activos de video y poster en `[TS-24]` (`hero-soccer-loop.webm`, `hero-soccer-loop.mp4` y `hero-soccer-poster.webp` en `talentus-scout-fe/public/assets/videos/`), esta tarea integra la cabecera dinámica inmersiva (Hero Section) en el Frontend Angular 18 de **Talentus Scout**.

La integración reemplaza el fondo plano por una experiencia cinematográfica de fútbol juvenil que transmite energía atlética, profesionalismo y credibilidad inmediata a tutores, directores de academia y scouts de la Liga FUTVE.

Se integra de manera prominente la frase motivadora oficial:
> *"Tu disciplina en la cancha, visible para los mejores scouts."*

articulada armónicamente con el título principal y las llamadas a la acción (CTAs).

### 2.2. Consideraciones de Protección Integral y Accesibilidad
* **Salvaguarda:** El video enfoca estrictamente de la cintura hacia abajo (botines, balón y césped), garantizando la total privacidad de los menores de edad y el cumplimiento de las normativas de protección (LOPNNA Art. 65 / FIFA).
* **Contraste Visual WCAG AAA:** Capa de oscurecimiento con gradiente multicapa (`hero-bg-overlay`) que asegura una legibilidad impecable de los textos blancos y botones verdes en cualquier fotograma de la animación.
* **Accesibilidad (a11y):** Implementación de la media query `@media (prefers-reduced-motion: reduce)` para pausar u ocultar el video y renderizar el póster estático WebP para usuarios con sensibilidad vestibular o preferencias de bajo consumo.

---

## 3. Especificación Frontend (Angular 18+ / Standalone)

### 3.1. Ubicación de Activos
Los archivos generados en `TS-24` residen en `talentus-scout-fe/public/assets/videos/` y son servidos en runtime en las siguientes rutas relativas:
* `assets/videos/hero-soccer-poster.webp` (77.87 KB, precarga instantánea)
* `assets/videos/hero-soccer-loop.webm` (957 KB, VP9 optimizado)
* `assets/videos/hero-soccer-loop.mp4` (1.48 MB, H.264 `+faststart`)

### 3.2. Modificación de `LandingComponent` (`src/app/features/landing/landing.component.ts`)

#### Maquetación HTML del Hero:
```html
<section class="hero-section">
  <!-- MEDIA DE FONDO CINEMATOGRÁFICO -->
  <div class="hero-bg-media" aria-hidden="true">
    <video
      autoplay
      muted
      loop
      playsinline
      [poster]="'assets/videos/hero-soccer-poster.webp'"
      class="hero-bg-video"
    >
      <source src="assets/videos/hero-soccer-loop.webm" type="video/webm">
      <source src="assets/videos/hero-soccer-loop.mp4" type="video/mp4">
    </video>
    <div class="hero-bg-overlay"></div>
  </div>

  <div class="container hero-container">
    <div class="hero-content">
      <div class="hero-badge">
        <span class="badge badge-official">FEDERACIÓN Y ACADEMIAS JUVENILES</span>
        <span class="badge badge-verified">PROTECCIÓN INTEGRAL DEL MENOR</span>
      </div>

      <h1 class="hero-title">
        El Radar Oficial del Talento Futbolístico Juvenil de Venezuela
      </h1>

      <!-- FRASE MOTIVADORA DESTACADA -->
      <p class="hero-motto">
        Tu disciplina en la cancha, visible para los mejores scouts.
      </p>

      <p class="hero-description">
        Digitalizamos la carrera deportiva de atletas menores de edad con consentimiento legal de sus padres, 
        conectando academias de fútbol con scouts certificados de la Liga FUTVE e internacionales.
      </p>

      <div class="hero-actions">
        <a routerLink="/register-tutor" class="btn btn-primary btn-lg">
          Registrar Tutor Legal y Atletas
        </a>
        <a routerLink="/login" class="btn btn-secondary btn-lg">
          Acceder a mi Cuenta
        </a>
      </div>

      <div class="hero-metrics">
        <!-- Métricas Bento existentes -->
      </div>
    </div>
  </div>
</section>
```

#### Estilos CSS y Reglas de Diseño (`fe-desing.md`):
* `.hero-section`: `position: relative; overflow: hidden; min-height: 85vh; display: flex; align-items: center; justify-content: center;`
* `.hero-bg-media`: `position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; z-index: 0;`
* `.hero-bg-video`: `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;`
* `.hero-bg-overlay`:
  ```css
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 15, 29, 0.75) 0%,
    rgba(10, 15, 29, 0.65) 40%,
    rgba(10, 15, 29, 0.92) 85%,
    rgba(10, 15, 29, 1.0) 100%
  );
  backdrop-filter: blur(1.5px);
  z-index: 1;
  ```
* `.hero-container`: `position: relative; z-index: 2;`
* `.hero-motto`: Tipografía display destacada con acento pitch (`var(--color-accent-pitch)`) o gradiente esmeralda/dorado, resaltando la promesa de valor con elegancia futbolística.
* **Accesibilidad (`prefers-reduced-motion`):**
  ```css
  @media (prefers-reduced-motion: reduce) {
    .hero-bg-video {
      display: none;
    }
    .hero-bg-media {
      background: url('/assets/videos/hero-soccer-poster.webp') center/cover no-repeat;
    }
  }
  ```
* **Adaptabilidad Móvil (< 640px):**
  * Ajuste de `min-height` y espaciados para evitar scroll vertical innecesario.
  * Preservar el tamaño legible de fuentes y botones táctiles amplios (mínimo 44px de altura).

---

## 4. Plan de Pruebas y Validación

1. **Pruebas de Compilación y SSR:**
   * Ejecutar `npm run build` en `talentus-scout-fe` asegurando empaquetado sin errores y prerenderizado de rutas.
2. **Pruebas Unitarias de Componente:**
   * Ejecutar suite de pruebas de Angular (`npm test -- --watch=false` o verificación de renderizado en `app.component.spec.ts`).
3. **Validación de Criterios de Aceptación (DoD):**
   * Verificación de atributos del reproductor (`autoplay muted loop playsinline`).
   * Verificación de fuentes de video duales (`webm` y `mp4`) y fallback de poster `[poster]`.
   * Verificación de contraste WCAG AAA para texto blanco sobre overlay.
   * Verificación de la regla de reducción de movimiento.
   * Cero ocurrencias del término "LOPNNA" en textos visibles de la interfaz.

---

## 5. Checklist de Implementación (Para trello_implementer)
- [ ] Modificar `src/app/features/landing/landing.component.ts` agregando `.hero-bg-media`, `<video>`, `<source>` y `.hero-bg-overlay`.
- [ ] Integrar la frase motivadora `.hero-motto` entre el título principal y la descripción.
- [ ] Aplicar estilos CSS con posicionamiento absoluto, `object-fit: cover`, gradiente multicapa y z-index controlado.
- [ ] Implementar la regla de accesibilidad `@media (prefers-reduced-motion: reduce)`.
- [ ] Optimizar la adaptación móvil en pantallas menores a 640px.
- [ ] Validar la compilación con `npm run build`.
- [ ] Redactar el plan y reporte de pruebas en `test/TS-25-test-plan-integracion-video-hero-landing.md`.
- [ ] Mover la tarjeta TS-25 a `in testing` en Trello con comentario de trazabilidad.

---

## 6. Criterios de Aceptación (DoD)
1. **Reproducción Fluida:** Video configurado con `autoplay muted loop playsinline` reproduciéndose en bucle continuo y poster WebP de carga rápida.
2. **Contraste y Legibilidad:** Textos, botones y badges 100% legibles sobre el overlay oscuro en cualquier punto del video.
3. **Frase Motivadora:** Presencia visible de la frase *"Tu disciplina en la cancha, visible para los mejores scouts."*.
4. **Accesibilidad y Responsividad:** Regla `@media (prefers-reduced-motion: reduce)` activa y diseño adaptativo en desktop y móviles.
5. **Calidad de Código y Compilación:** Cero errores en `npm run build` y SSR prerendered.
