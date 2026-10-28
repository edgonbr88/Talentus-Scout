# Plan de Implementación — [TS-24] Especificación y Generación de Animación Hero para Landing Page con Google Veo 2 / Gemini

## 1. Identificación
* **ID de la Tarea:** `[TS-24]`
* **Título:** Especificación y Generación de Animación Hero para Landing Page con Google Veo 2 / Gemini
* **Tarjeta en Trello:** [https://trello.com/c/zL4c5bN5](https://trello.com/c/zL4c5bN5) (ID: `6acaae81268cdbda27a64a84`)
* **Sprint / Fase:** Sprint 1 — Fase de Conversión y Experiencia de Usuario (Hero Landing)
* **Estado:** `in development`

---

## 2. Resumen y Contexto de Negocio

### 2.1. Justificación y Valor para el Usuario
La sección principal (Hero) de la Landing Page de **Talentus Scout** es el primer impacto visual para tutores legales, jóvenes atletas, directores de academias y scouts de fútbol profesional (Liga FUTVE y clubes internacionales). Sustituir un fondo estático genérico por un video cinematográfico de fútbol en bucle fluido transmite dinamismo, profesionalismo y autenticidad futbolística.

La integración de la animación cinematográfica articulada con la frase motivadora:
> *"Tu disciplina en la cancha, visible para los mejores scouts."*

eleva la confianza en la plataforma, despierta la aspiración del atleta juvenil y multiplica la tasa de conversión en el registro de perfiles y suscripciones Pro.

### 2.2. Consideraciones Legales y Protección Integral del Menor
En estricto apego a la normativa de protección de la imagen de menores de edad (LOPNNA Art. 65 y políticas de salvaguarda de la FIFA para el fútbol menor):
* El encuadre cinematográfico es **estrictamente de la cintura hacia abajo** (piernas atléticas, botines de fútbol modernos, balón oficial en movimiento y césped natural).
* **Cero rostros o rasgos biométricos de menores visibles**.
* El foco se concentra exclusivamente en la habilidad técnica, el golpeo del balón y la estética del juego.

---

## 3. Prompts Optimizados para Generación con Google AI

### 3.1. Prompt Principal de Animación (Google Veo 2 / VideoFX)
```text
Cinematic 4k resolution, 60fps slow-motion tracking shot of a 14-year-old male teenage soccer player, framed strictly from the waist down (athletic legs, soccer shorts, modern football boots and socks). The player strikes an official soccer ball on a lush, pristine green natural grass pitch towards a soccer goal visible in the soft-focus blurred background. Dramatic golden hour stadium lighting, golden atmospheric dust particles, volumetric rim light highlighting the kinetic motion of the kick and grass turf blades kicking up. Seamless looping motion, photorealistic, broadcast television commercial sports aesthetic, zero face visible, strict focus on legs and ball dynamics.
```

### 3.2. Prompt Negativo (Control de Calidad)
```text
face, upper body, chest, head, cartoon, 3d render, anime, blurry, low resolution, artifacts, jerky movement, distorted limbs, extra legs, artificial turf rubber pellets, oversaturated, text, watermark, logo, bad anatomy.
```

### 3.3. Prompt para Fotograma Clave / Poster WebP (Google Imagen 3 / Generador de Activos)
```text
Ultra-detailed commercial sports photography, 8k, low-angle ground level shot of a teenage soccer player's legs and football boots kicking an official match ball into the grass turf, soccer goal in soft background, dramatic stadium lighting at dusk, Venezuelan youth soccer atmosphere, cinematic composition, depth of field f/1.8, razor sharp focus on ball and boot, no faces, waist-down framing only.
```

---

## 4. Especificaciones Técnicas y Pipeline de Transcodificación

### 4.1. Ubicación y Nomenclatura de Activos
Todos los activos finales optimizados para la web se almacenan en:
`talentus-scout-fe/public/assets/videos/`

* `hero-soccer-poster.webp`: Imagen estática en alta resolución comprimida en formato WebP (< 80 KB). Garantiza Largest Contentful Paint (LCP) ultra rápido sin flash negro ni pantalla vacía antes de que el video comience.
* `hero-soccer-loop.mp4`: Video en bucle codificado con H.264 / AAC y flag `+faststart` (moov atom al inicio del archivo), garantizando compatibilidad total con Safari, iOS y Android (< 5 MB).
* `hero-soccer-loop.webm`: Video en bucle codificado con VP9 / Vorbis/Opus optimizado para Chrome, Edge y navegadores modernos (< 4 MB).

### 4.2. Parámetros Técnicos de los Formatos
| Parámetro | `hero-soccer-poster.webp` | `hero-soccer-loop.mp4` | `hero-soccer-loop.webm` |
| :--- | :--- | :--- | :--- |
| **Resolución** | 1920x1080 (16:9) | 1920x1080 (16:9) | 1920x1080 (16:9) |
| **Codec** | WebP (Lossy q=82) | H.264 (AVC High Profile) | VP9 |
| **Pixel Format** | YUV / RGB | yuv420p | yuv420p |
| **Frame Rate** | Estático | 30 / 60 fps | 30 / 60 fps |
| **Duración** | N/A | 4 - 6 segundos | 4 - 6 segundos |
| **Flags** | N/A | `+faststart` | N/A |
| **Límite de Peso** | < 80 KB | < 6 MB | < 5 MB |

---

## 5. Pipeline Automatizado de Generación y Optimización

1. **Generación del Master Frame:**
   Utilizar la herramienta `generate_image` con relación de aspecto 16:9 para crear el activo maestro visual con iluminación golden hour y encuadre cintura para abajo.
2. **Generación del Poster WebP:**
   Comprimir el fotograma clave utilizando Pillow con optimización WebP para mantener el peso bajo 80 KB.
3. **Generación de la Animación en Bucle y Transcodificación:**
   Crear la secuencia dinámica cinemática con física de movimiento de balón e iluminación ambiental, transcodificando con FFmpeg standalone (`imageio-ffmpeg`):
   * MP4: `ffmpeg -i input -c:v libx264 -profile:v high -pix_fmt yuv420p -movflags +faststart hero-soccer-loop.mp4`
   * WebM: `ffmpeg -i input -c:v libvpx-vp9 -b:v 1500k -pix_fmt yuv420p hero-soccer-loop.webm`
4. **Verificación Automatizada:**
   Inspeccionar dimensiones, codecs y pesos con scripts Python para asegurar cumplimiento del DoD.

---

## 6. Estrategia de Entrega hacia TS-25
Los activos producidos quedan inmediatamente listos para ser consumidos por el componente de Angular 18 en `TS-25`:
```html
<div class="hero-bg-media">
  <video autoplay muted loop playsinline [poster]="'assets/videos/hero-soccer-poster.webp'" class="hero-bg-video">
    <source src="assets/videos/hero-soccer-loop.webm" type="video/webm">
    <source src="assets/videos/hero-soccer-loop.mp4" type="video/mp4">
  </video>
  <div class="hero-bg-overlay"></div>
</div>
```

---

## 7. Checklist de Implementación (Para trello_implementer)
- [ ] Crear el directorio destino `talentus-scout-fe/public/assets/videos/`.
- [ ] Generar la imagen visual fotorrealista 16:9 (botines, balón y césped, waist-down).
- [ ] Generar y comprimir `hero-soccer-poster.webp` asegurando peso < 80 KB.
- [ ] Generar el video bucle cinemático y transcodificar `hero-soccer-loop.mp4` con H.264 `+faststart`.
- [ ] Transcodificar `hero-soccer-loop.webm` con codec VP9.
- [ ] Validar que no existan rostros ni cuerpos superiores visibles (LOPNNA / FIFA).
- [ ] Validar los límites de peso (< 6 MB para videos, < 80 KB para poster).
- [ ] Redactar el plan de pruebas en `test/TS-24-test-plan-especificacion-generacion-animacion-hero.md`.
- [ ] Mover la tarjeta TS-24 a `in testing` en Trello con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (DoD)
1. **Regla de Encuadre y Salvaguarda:** Encuadre estrictamente de cintura para abajo, cero rostros de menores visibles.
2. **Formatos de Entrega:** Presencia de `hero-soccer-poster.webp`, `hero-soccer-loop.mp4` y `hero-soccer-loop.webm` en `talentus-scout-fe/public/assets/videos/`.
3. **Optimización de Rendimiento:** Poster WebP < 80 KB; videos < 6 MB con `faststart` activado.
4. **Vinculación:** Tarea `[TS-25]` existente y documentada como consumidora directa de estos activos.
5. **Plan de Pruebas:** Archivo de pruebas generado y verificado.
