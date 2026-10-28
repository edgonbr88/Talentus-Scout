# Plan de Implementación: [TS-35] Reorganización Visual y Bento Layout para Lista de Atletas en Dashboard de Tutor

**ID Tarea:** TS-35  
**Tarjeta Trello:** https://trello.com/c/zJq6i2sX (ID: `6acc2429ae83398a43287140`)  
**Fecha:** 2026-10-14  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**  
  La sección "Mis Atletas Representados" en el panel del tutor es el núcleo operativo donde el representante gestiona a sus deportistas juveniles. En el diseño previo, la tarjeta de atleta agrupaba en una única fila horizontal el avatar, nombre, insignias de estado y 5 botones de acción de gran tamaño. Esto provocaba un colapso de layout severo: nombres largos partiéndose verticalmente palabra por palabra, insignias legales solapándose detrás de los botones y textos ilegibles en pantallas intermedias y móviles.
- **Impacto y Dignificación Visual:**  
  Reorganizar cada tarjeta en un esquema ergonómico de 2 niveles (Nivel 1: Datos de identidad, insignias y biotipo deportivo con espacio suficiente; Nivel 2: Barra de acciones inferior dedicada) dignifica la presentación de la cédula del menor y garantiza una experiencia de usuario profesional, ordenada y atlética en cualquier dispositivo, cumpliendo con la directiva de diseño [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md).
- **Consideraciones Legales y de Protección (LOPNNA Art. 65 / Normas FIFA):**  
  Las insignias de custodia de patria potestad (`🛡️ PATRIA POTESTAD VERIFICADA`, `⏳ REVISIÓN LEGAL PENDIENTE`, `❌ DOCUMENTACIÓN OBSERVADA`, `⚠️ DOC. IDENTIDAD PENDIENTE`) y de visibilidad de mercado (`⭐ PRO ACTIVO`, `🔒 NO VISIBLE EN DIRECTORIO`) representan garantías jurídicas críticas sobre el menor. Necesitan estar claramente legibles y separadas de los botones interactivos para evitar confusiones al tutor.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Frontend (`talentus-scout-fe` — Angular 18+):**
    - `src/app/features/dashboard/tutor-dashboard.component.html`: Reestructuración semántica del encabezado `.card-top-bar` y de la tarjeta `.athlete-card` en dos niveles (`.athlete-header-row` y `.athlete-actions-bar`).
    - `src/app/features/dashboard/tutor-dashboard.component.ts`: Inclusión y actualización de estilos CSS específicos para `.card-top-bar`, `.title-with-badge`, `.athlete-card`, `.athlete-header-row`, `.athlete-avatar` (52x52px), `.athlete-name`, `.athlete-badges-row`, `.athlete-specs`, `.athlete-actions-bar`, y adaptabilidad responsiva (< 768px).
    - `src/app/features/dashboard/tutor-dashboard.component.spec.ts`: Incorporación de pruebas unitarias verificando la nueva jerarquía de layout de 2 niveles, presencia de la barra de acciones inferior y filas de badges dedicadas.
- **Base de Datos y Backend:**  
  - No requiere cambios (tarea 100% de presentación y ergonomía visual frontend).
- **Dependencias:**  
  - `TS-17` (Dashboard del tutor) y `TS-29` (Subida de videos).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No aplica (sin impacto en base de datos).

---

## 4. Backend: Spring Boot 3 (Java 21)
- No aplica (sin modificaciones de backend).

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directiva de Diseño ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Identidad de Bento Grid deportiva contemporánea: fondo de tarjeta `#0E1527`, borde accesible `var(--color-border)` (`#22314D`), radio redondeado `var(--radius-sm)` (8px).
  - Avatar con badge visual deportivo: tamaño 52x52px, borde `2px solid #334155`, iniciales con tipografía atlética `#10B981` de 16px.
  - Nombre del atleta en tipografía display legible (`Outfit`/`Inter`, 16px, font-weight 700, `#F8FAFC`), garantizando visualización de nombres compuestos sin salto forzado de una palabra por renglón.
  - Fila dedicada `.athlete-badges-row` con `gap: 6px; flex-wrap: wrap;` para alojar los estados de suscripción y estado legal/identidad sin truncamiento.
  - Barra de acciones `.athlete-actions-bar` inferior con separador sutil `1px solid rgba(255, 255, 255, 0.08)` y `padding-top: 14px`, con jerarquía visual:
    1. `⚡ Activar Plan Pro` / `Renovar Pro`: botón destacado con acento esmeralda de alta prioridad.
    2. `📹 Cargar Video`: acción multimedia con icono.
    3. `🏅 Certificar`: acción de acreditación deportiva/médica.
    4. `🪪 Doc. Identidad`: consignación legal del menor.
    5. `📄 Descargar CV`: descarga de ficha técnica PDF con estado de carga reactivo.
  - Adaptabilidad responsiva:
    - En pantallas pequeñas (`< 768px`), botones en distribución fluida con `min-height: 38px` y `flex-grow: 1` para áreas táctiles cómodas.

---

## 6. Pruebas y Verificación
- **Pruebas Automatizadas Frontend:**
  - `npm test -- --watch=false` en `talentus-scout-fe`
  - Validar casos en `tutor-dashboard.component.spec.ts`:
    - Presencia del encabezado `.card-top-bar` con alineación entre título y badge de contador.
    - Existencia de `.athlete-header-row` y `.athlete-actions-bar` dentro de `.athlete-card`.
    - Correcto renderizado de los 5 botones en la barra de acciones inferior.
    - Renderizado de badges en `.athlete-badges-row`.
- **Compilación Frontend:**
  - `npm run build` en `talentus-scout-fe` libre de errores de tipado y templates.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Frontend: Reorganizar plantilla `tutor-dashboard.component.html` separando el contenido de `.athlete-card` en `.athlete-header-row` (Avatar + `.athlete-main-info` con `.athlete-badges-row` y `.athlete-specs`) y `.athlete-actions-bar` (los 5 botones de acción).
- [x] 2. Frontend: Actualizar contenedor superior `.card-top-bar` y `.title-with-badge` en `tutor-dashboard.component.html` para garantizar alineación limpia con el botón `+ Registrar Atleta`.
- [x] 3. Frontend: Añadir y ajustar estilos CSS en `tutor-dashboard.component.ts` para `.card-top-bar`, `.title-with-badge`, `.athlete-card`, `.athlete-header-row`, `.athlete-avatar` (52x52px), `.athlete-name`, `.athlete-badges-row`, `.athlete-specs`, `.athlete-actions-bar` y media queries para móvil (< 768px).
- [x] 4. Frontend: Actualizar y expandir `tutor-dashboard.component.spec.ts` con pruebas de regresión y validación de la nueva arquitectura de 2 niveles.
- [x] 5. Verificación: Ejecutar suite de pruebas unitarias (`npm test -- --watch=false`).
- [x] 6. Verificación: Compilar frontend (`npm run build`).
- [x] 7. Documentación: Redactar plan de pruebas en `test/TS-35-test-plan-reorganizacion-visual-bento-layout-atletas-tutor.md`.
- [x] 8. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario con el resumen de la entrega.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] La cabecera de "Mis Atletas Representados" muestra el título, contador de atletas y el botón "+ Registrar Atleta" en una única fila alineada sin saltos verticales huérfanos.
- [x] Los nombres de los atletas se visualizan de manera fluida y completa sin partirse verticalmente palabra por palabra.
- [x] Las insignias de estado (Pro / Inactivo / Documento) se muestran en su propia fila dedicada (`.athlete-badges-row`) sin solaparse ni quedar cubiertas por botones.
- [x] Los 5 botones de acción se ubican en la barra horizontal inferior dedicada (`.athlete-actions-bar`) separada por una línea divisoria sutil.
- [x] En pantallas pequeñas (< 768px), los botones cuentan con áreas táctiles accesibles (`min-height: 38px`) y la tarjeta no genera desbordamientos horizontales.
- [x] Compilación limpia con `npm run build` y suite de tests `npm test` en verde al 100%.
