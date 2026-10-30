# Plan de Pruebas: [TS-35] Reorganización Visual y Bento Layout para Lista de Atletas en Dashboard de Tutor

**ID Tarea:** TS-35  
**Tarjeta Trello:** https://trello.com/c/zJq6i2sX (ID: `6acc2429ae83398a43287140`)  
**Fecha:** 2026-10-14  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es certificar la correcta reestructuración ergonómica y visual de la sección "Mis Atletas Representados" en el panel de control del tutor (`TutorDashboardComponent`), solucionando el colapso de layout previo donde avatar, datos del atleta y 5 botones interactivos convivían en una única fila horizontal comprimida:

1. **Jerarquía Visual de 2 Niveles por Tarjeta:**
   - **Nivel 1 (Identidad y Biotipo):** Avatar deportivo (52x52px), nombre completo en línea amplia y legible con tipografía moderna, fila dedicada de insignias (`.athlete-badges-row`) y ficha técnica abreviada (`.athlete-specs`).
   - **Nivel 2 (Barra de Acciones):** Barra inferior dedicada (`.athlete-actions-bar`) separada por borde sutil (`1px solid rgba(255, 255, 255, 0.08)`), agrupando los 5 botones de acción con clara jerarquía de acento deportivo.
2. **Alineación de la Cabecera del Módulo (`.card-top-bar`):**
   - El título `<h3>Mis Atletas Representados</h3>` y la insignia oficial `X REGISTRADOS` se presentan alineados horizontalmente en `.title-with-badge`, junto al botón interactivo `+ Registrar Atleta` alineado a la derecha en la misma fila superior.
3. **Salvaguarda de Dignidad Legal e Identidad Deportiva (LOPNNA Art. 65 / FIFA):**
   - Las insignias de estado legal y suscripción (`⭐ PRO ACTIVO`, `🔒 NO VISIBLE EN DIRECTORIO`, `🛡️ PATRIA POTESTAD VERIFICADA`, `⚠️ DOC. IDENTIDAD PENDIENTE`, etc.) se visualizan sin solapamientos, garantizando visibilidad transparente de la situación jurídica del menor.
4. **Adaptabilidad Responsiva Móvil (< 768px y < 480px):**
   - Distribución ergonómica de los botones en cuadrícula de 2 columnas o apilados, con áreas táctiles mínimas de 38px y sin desbordamientos horizontales.

### Componentes Impactados
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `src/app/features/dashboard/tutor-dashboard.component.html`: Reorganización semántica de `.card-top-bar`, `.athlete-card`, `.athlete-header-row` y `.athlete-actions-bar`.
  * `src/app/features/dashboard/tutor-dashboard.component.ts`: Estilos CSS de diseño Bento atlético, tokens visuales y media queries responsivas.
  * `src/app/features/dashboard/tutor-dashboard.component.spec.ts`: Suite de pruebas unitarias automatizadas con Jasmine y Karma.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Frontend (Angular 18+ / Jasmine & Karma)
Comando ejecutado:
```bash
npm test -- --watch=false
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Totales | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| Total Suites Frontend (`talentus-scout-fe`) | 47 | 47 | 0 | **100% SUCCESS** |
| `TutorDashboardComponent - TS-35 Bento Layout` | 5 | 5 | 0 | **PASSED** |
| `TutorDashboardComponent - TS-29 Video Upload Restrictions` | 5 | 5 | 0 | **PASSED** |

#### Casos de Prueba Específicos Verificados para TS-35:
1. `should render card-top-bar with title-with-badge and register button`:
   - Verifica la presencia del contenedor `.card-top-bar`.
   - Comprueba que `.title-with-badge` contiene `<h3>Mis Atletas Representados</h3>` y el badge `.badge-official` con el contador ("2 REGISTRADOS").
   - Comprueba que el botón `+ Registrar Atleta` está presente y alineado en la cabecera.
2. `should structure each athlete card into a 2-level layout: header row and actions bar`:
   - Verifica que cada tarjeta de atleta contenga `.athlete-header-row` (Nivel 1) y `.athlete-actions-bar` (Nivel 2).
   - Verifica dentro del Nivel 1: `.athlete-avatar`, `.athlete-main-info`, `.athlete-name`, `.athlete-badges-row` y `.athlete-specs`.
3. `should display all 5 action buttons inside the dedicated .athlete-actions-bar`:
   - Verifica la presencia de los 5 botones en la barra inferior:
     1. Botón Pro (`.btn-action-pro`): "Renovar Pro" (para atleta con plan activo).
     2. Botón Video (`.btn-video`): "📹 Cargar Video".
     3. Botón Certificación (`.btn-certify`): "🏅 Certificar".
     4. Botón Documento (`.btn-doc`): "🪪 Doc. Identidad".
     5. Botón CV (`.btn-download-cv`): "📄 Descargar CV".
4. `should show "Activar Plan Pro" button for athletes with inactive subscription`:
   - Verifica que para atletas con suscripción inactiva se muestre "⚡ Activar Plan Pro" con acento esmeralda de alta prioridad.
5. `should properly render status badges in .athlete-badges-row for active and pending athletes`:
   - Atleta 1 (PRO ACTIVO + PATRIA POTESTAD VERIFICADA): renderiza ambas etiquetas sin colisión.
   - Atleta 2 (NO VISIBLE EN DIRECTORIO + DOC. IDENTIDAD PENDIENTE): renderiza ambas etiquetas con contraste accesible.

---

## 3. Verificación de Compilación y Bundles Frontend

Comando ejecutado:
```bash
npm run build
```
Resultado:
- Generación de bundles de producción (Client & SSR Server) completada sin advertencias ni errores de tipado.
- Cero errores de sintaxis CSS o templates HTML en Angular.

---

## 4. Guía de Pruebas Manuales (Paso a Paso en Navegador)

1. **Acceso al Panel de Control:**
   - Iniciar sesión con un usuario tutor que tenga representados registrados o navegar a `/dashboard`.
2. **Verificación de Cabecera:**
   - Comprobar que en la parte superior de la tarjeta "Mis Atletas Representados" el título y la etiqueta con el número de registrados están en la misma línea.
   - Comprobar que el botón `+ Registrar Atleta` se ubica a la derecha en la misma cabecera.
3. **Verificación de Tarjetas de Atleta (Nivel 1):**
   - Comprobar que el avatar circular de 52x52px muestra las iniciales con acento `#10B981` y fondo atlético `#1E293B` (o foto de perfil si fue cargada).
   - Comprobar que el nombre del deportista se muestra con tamaño 16px en negrita `#F8FAFC`, sin quiebres de línea artificiales.
   - Comprobar que la fila de badges (`.athlete-badges-row`) agrupa las etiquetas de visibilidad y documentación de forma ordenada.
   - Comprobar la línea de especificaciones formativas (Posición, Edad, Pierna hábil).
4. **Verificación de Barra de Acciones (Nivel 2):**
   - Comprobar que los 5 botones (`⚡ Activar Plan Pro` / `Renovar Pro`, `📹 Cargar Video`, `🏅 Certificar`, `🪪 Doc. Identidad`, `📄 Descargar CV`) están en una barra horizontal independiente bajo una línea divisoria sutil.
5. **Verificación Responsiva (< 768px):**
   - Redimensionar la ventana o activar el modo de emulación móvil (DevTools):
     - La cabecera `.card-top-bar` adapta sus elementos de forma limpia.
     - La barra de acciones `.athlete-actions-bar` se distribuye en cuadrícula de 2 columnas con altura táctil accesible (`min-height: 38px`).
     - En pantallas muy pequeñas (< 480px), los botones se adaptan a ancho completo (1 columna) con espaciado vertical cómodo.
     - No se produce ningún desbordamiento horizontal en el viewport.

---

## 5. Matriz de Criterios de Aceptación (Definition of Done - DoD)

| Criterio de Aceptación | Estado | Evidencia de Verificación |
|---|---|---|
| Cabecera con título, contador y botón "+ Registrar Atleta" alineados | **CUMPLIDO** | `.card-top-bar` con flexbox `justify-content: space-between`, validado en test unitario. |
| Nombres de atletas fluidos sin partirse verticalmente | **CUMPLIDO** | `.athlete-name` con `font-size: 16px`, `word-break: break-word`, ancho completo de `.athlete-main-info`. |
| Insignias de estado en fila dedicada sin solaparse | **CUMPLIDO** | Contenedor `.athlete-badges-row` con `gap: 6px; flex-wrap: wrap;` separado de los botones. |
| 5 botones de acción en barra inferior dedicada | **CUMPLIDO** | Contenedor `.athlete-actions-bar` con separador sutil y suite de 5 tests unitarios verificando cada botón. |
| Adaptabilidad responsiva móvil sin desbordamientos | **CUMPLIDO** | Media queries `< 768px` y `< 480px` con grid y áreas táctiles de `min-height: 38px`. |
| Compilación y tests en verde al 100% | **CUMPLIDO** | 47 tests unitarios en Karma aprobados; `npm run build` sin errores. |
