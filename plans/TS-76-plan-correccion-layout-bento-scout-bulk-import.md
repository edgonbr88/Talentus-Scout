# Plan de Implementación: [TS-76] Corrección de layout Bento y mejora de UX/estilos para resultados y archivo de omitidos en Carga Masiva

**ID Tarea:** TS-76  
**Tarjeta Trello:** [https://trello.com/c/562j1g9A](https://trello.com/c/562j1g9A)  
**Fecha:** 2026-11-17  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  Actualmente, en la pantalla de Carga Masiva de Atletas y Tutores (`ScoutBulkImportComponent`), la hoja de estilos contiene la propiedad CSS inválida `flex-col: column;` en lugar de `flex-direction: column;` aplicada a las tarjetas Bento (`.bento-card-main`, `.bento-card-side` y `.bento-card-full`). Como consecuencia, en navegadores modernos `display: flex` recurre al valor por defecto horizontal (`row`), provocando que los bloques internos se apilen de forma desalineada con espacios vacíos desproporcionados, rompiendo la armonía visual de las pestañas, del formulario y del monitor de proceso.
  
  Asimismo, cuando un club o scout procesa un archivo con atletas preexistentes o filas defectuosas, el backend devuelve el resumen y el listado de advertencias (`warnings: List<BulkImportRowErrorDto>`), pero la interfaz de usuario no ofrece una retroalimentación visual jerárquica clara ni una vista previa contextual de los motivos de omisión antes de pulsar la descarga del informe CSV. Los botones de acción cuentan con estilos inline rígidos y falta una clara señalización de omitidos en la tabla histórica.
  
- **Impacto:**
  - Garantiza una experiencia deportiva y profesional de primer nivel, fluida y responsive en escritorio, tabletas y móviles conforme a los estándares de [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md).
  - Proporciona a los scouts y directores de clubes claridad inmediata y humana sobre cuántos atletas fueron incorporados exitosamente y cuáles fueron omitidos (por ejemplo, duplicados ya vinculados al radar o con datos de contacto incompletos), permitiéndoles visualizar el detalle sin fricción y descargar el informe formal de auditoría en CSV.
  
- **Restricciones legales aplicables:**
  - LOPNNA Art. 65: Transparencia institucional en el procesamiento de datos de atletas menores de edad y trazabilidad de los motivos de exclusión o duplicidad para evitar registros inconsistentes.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Frontend (`talentus-scout-fe` — Angular 18+ Standalone):**
    - `src/app/features/scout-bulk-import/scout-bulk-import.component.css`:
      - Corrección de la propiedad inválida `flex-col: column;` por `flex-direction: column;`.
      - Optimización de alineación y responsive del grid Bento (`.bento-container`) para escritorio, tablets (`< 960px`) y móviles (`< 640px`).
      - Migración de todos los estilos inline de la plantilla a clases semánticas reutilizables.
      - Nuevos estilos para callouts informativos (éxito esmeralda y advertencia ámbar con tokens de diseño).
      - Estilos para la lista/tabla compacta y desplegable de registros omitidos (`.omitted-preview-box`).
      - Botón de acción para descarga de reporte de omitidos a ancho completo (`.btn-download-report`).
      - Badges diferenciados para tipos de omisión (`OMITIDO_DUPLICADO` vs `FILA_OMITIDA` / errores generales).
    - `src/app/features/scout-bulk-import/scout-bulk-import.component.html`:
      - Reemplazo de estilos inline por clases semánticas.
      - Reemplazo de emojis por SVGs limpios y accesibles con atributos ARIA adecuados (`aria-expanded`, `aria-label`).
      - Integración de banner de estado exitoso cuando `status === 'COMPLETED'` y `failedRows === 0`.
      - Integración de callout de advertencia ámbar y acordeón / toggle de visualización de filas omitidas cuando `failedRows > 0`.
      - Incorporación de columna/indicador de omitidos en la tabla de historial de importaciones.
    - `src/app/features/scout-bulk-import/scout-bulk-import.component.ts`:
      - Propiedad booleana de estado de UI: `showOmittedDetails: boolean = false;` con método `toggleOmittedDetails()`.
      - Propiedad para feedback visual de descarga: `isDownloadingReport: boolean = false;`.
    - `src/app/features/scout-bulk-import/scout-bulk-import.component.spec.ts` (Nuevo):
      - Suite de pruebas unitarias exhaustivas validando:
        1. Render y cambio de pestañas.
        2. Estado cuando el proceso culmina con 100% de éxito (`failedRows === 0`).
        3. Estado cuando existen filas omitidas (`failedRows > 0`), con despliegue de preview y conteos.
        4. Invocación de descarga del informe de errores (`downloadErrorReport`).
        5. Visualización del historial de importaciones con badges correspondientes.
- **Dependencias:**
  - `TS-70` (Carga masiva de atletas y tutores con soporte asíncrono y reporte de errores).
  - `TS-75` (Restricción de acceso para roles autorizados).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Impacto en Base de Datos:**
  - **Ninguno.** No se requieren migraciones DDL ni cambios en Neon. Las estructuras de datos relacionales existentes en `bulk_import_jobs` y `bulk_import_row_errors` satisfacen plenamente los requerimientos.

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Impacto en Backend:**
  - **Ninguno.** Los endpoints REST actuales ya proveen:
    - `GET /api/v1/scout/bulk-import/jobs/{jobId}` con `BulkImportJobResponseDto` incluyendo `warnings: List<BulkImportRowErrorDto>`, `errorSummary`, `successfulRows` y `failedRows`.
    - `GET /api/v1/scout/bulk-import/jobs/{jobId}/report` que transmite el CSV con el detalle de las filas omitidas.

---

## 5. Frontend: Angular 18+ (Standalone & fe-desing.md)

### 5.1. Componente TypeScript (`scout-bulk-import.component.ts`)
- **Ruta:** `talentus-scout-fe/src/app/features/scout-bulk-import/scout-bulk-import.component.ts`
- **Nuevas propiedades y métodos:**
  - `showOmittedDetails: boolean = false;`
  - `isDownloadingReport: boolean = false;`
  - `toggleOmittedDetails(): void`: Alterna `showOmittedDetails = !showOmittedDetails;`.
  - `downloadErrorReport(jobId: string): void`: Gestiona el flag `isDownloadingReport = true;` durante la suscripción y lo restablece a `false` en `finalize()` o `next/error`.

### 5.2. Hoja de Estilos (`scout-bulk-import.component.css`)
- **Ruta:** `talentus-scout-fe/src/app/features/scout-bulk-import/scout-bulk-import.component.css`
- **Cambios esenciales:**
  1. Corregir en `.bento-card-main`, `.bento-card-side`, `.bento-card-full`:
     ```css
     display: flex;
     flex-direction: column;
     ```
  2. Ajustar `.bento-container` para alineación fluida y responsiva:
     ```css
     .bento-container {
       display: grid;
       grid-template-columns: 1.7fr 1.3fr;
       gap: 24px;
       align-items: stretch;
       margin-bottom: 36px;
     }
     @media (max-width: 960px) {
       .bento-container {
         grid-template-columns: 1fr;
         gap: 20px;
       }
     }
     ```
  3. Eliminar estilos inline de formularios y botones:
     - `.btn-process-action`: Botón principal de carga a ancho completo, 14px padding, 15px font-size.
     - `.bento-side-body`: Contenedor flexible del cuerpo del monitor.
     - `.bento-side-footer`: Pie de card lateral fijado al fondo (`margin-top: auto; padding-top: 18px; border-top: 1px solid var(--color-border);`).
     - `.table-heading`: Título semántico para la cabecera de la tabla histórica.
     - `.table-align-right`: Alineación de acciones en la tabla.
     - `.badge-cell-omitted`, `.badge-cell-success`: Estilos para las celdas de conteo en la tabla.
  4. Callouts y bloques de resultados:
     - `.result-callout-success`: Fondo verde translúcido con borde esmeralda (`rgba(16, 185, 129, 0.12)`, borde `rgba(16, 185, 129, 0.3)`), ícono de confirmación y texto humano.
     - `.result-callout-warning`: Fondo ámbar translúcido (`rgba(245, 158, 11, 0.12)`, borde `rgba(245, 158, 11, 0.35)`), con encabezado claro y resumen de atletas omitidos.
  5. Acordeón / Vista previa de omitidos:
     - `.btn-toggle-omitted`: Botón secundario para desplegar/contraer la lista de omisiones con ícono de flecha rotatoria (`transform: rotate(180deg)` cuando `active`).
     - `.omitted-preview-container`: Contenedor con borde sutil, fondo `#0A0F1D`, max-height con scroll suave (`max-height: 220px; overflow-y: auto;`).
     - `.omitted-item`: Fila individual con número de fila, nombre del atleta, badge de motivo (`OMITIDO_DUPLICADO` con badge dorado/ámbar y `FILA_OMITIDA` con badge gris azulado) y motivo detallado.
     - `.btn-download-full`: Botón destacado en ámbar/dorado de alto contraste a ancho completo con ícono SVG para descargar el informe CSV.

### 5.3. Plantilla HTML (`scout-bulk-import.component.html`)
- **Ruta:** `talentus-scout-fe/src/app/features/scout-bulk-import/scout-bulk-import.component.html`
- **Reestructuración de la card lateral (`.bento-card-side`):**
  - Si el job está `COMPLETED` y `failedRows === 0`:
    - Renderizar `.result-callout-success` celebrando que todos los registros del archivo fueron validados e ingresados correctamente.
  - Si `failedRows > 0`:
    - Renderizar `.result-callout-warning` explicando que se completó la importación pero existen registros omitidos por duplicidad o inconsistencias.
    - Botón `btn-toggle-omitted` que muestra:
      `Ver detalle de omitidos ({{ activeJob.warnings?.length || activeJob.failedRows }})`
    - Sección colapsable `@if (showOmittedDetails && activeJob.warnings && activeJob.warnings.length > 0)`:
      - Lista de filas con `Fila #{{ warning.rowNumber }}`, nombre de atleta, badge de acción y motivo.
      - Aviso si el archivo contiene más registros omitidos que los visualizados en la vista rápida.
    - Footer `.bento-side-footer` con botón:
      `Descargar Informe de Omitidos (CSV)` con estado deshabilitado/spinner cuando `isDownloadingReport`.
- **Limpieza de estilos inline:**
  - Reemplazo de `style="width: 100%; ..."` por clases semánticas.
  - Sustitución de emojis principales por SVGs vectoriales nítidos para una apariencia deportiva moderna.
  - Adición de columna `Omitidos` en la tabla de historial con badge informativo si `job.failedRows > 0`.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Unitarias Frontend (`scout-bulk-import.component.spec.ts`)
- **Archivo:** `talentus-scout-fe/src/app/features/scout-bulk-import/scout-bulk-import.component.spec.ts`
- **Casos de prueba a implementar:**
  1. `should create`: Instanciación correcta del componente e inyección de servicios.
  2. `should toggle active tabs`: Cambio entre pestañas de archivo y Google Sheets.
  3. `should display empty state when activeJob is null`: Renderiza el estado de espera cuando no hay importaciones activas.
  4. `should display success callout when job is COMPLETED with failedRows === 0`: No muestra callout de advertencia ni botón de reporte de omitidos.
  5. `should display warning callout and omitted records when failedRows > 0`: Muestra el banner ámbar, los contadores de métricas y el botón de descarga.
  6. `should toggle omitted details preview`: Verifica que `toggleOmittedDetails()` alterne la visibilidad de la lista de advertencias.
  7. `should call downloadErrorReport on BulkImportService`: Verifica la llamada al servicio con el `jobId` correspondiente y el manejo de feedback.
  8. `should display omitted badge in recent jobs table when job has failed rows`: La tabla de historial muestra el conteo de omitidos y el botón de advertencias.

### 6.2. Comandos de Verificación Automatizada
```bash
cd talentus-scout-fe
npm test -- --include src/app/features/scout-bulk-import/scout-bulk-import.component.spec.ts --watch=false
npm run build
```

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [ ] **1. Rama Git:** Crear y conmutar a la rama `feature/TS-76-bulk-import-bento-layout-ux` en `talentus-scout-fe`.
- [ ] **2. Corrección CSS:**
  - [ ] Sustituir `flex-col: column;` por `flex-direction: column;` en `.bento-card-main`, `.bento-card-side` y `.bento-card-full`.
  - [ ] Añadir clases para responsive bento, callouts de éxito y advertencia, acordeón de omitidos y pie de tarjeta lateral.
  - [ ] Migrar todos los estilos inline a clases semánticas.
- [ ] **3. Lógica TypeScript:**
  - [ ] Agregar banderas `showOmittedDetails` e `isDownloadingReport` en `ScoutBulkImportComponent`.
  - [ ] Implementar método `toggleOmittedDetails()`.
  - [ ] Ajustar `downloadErrorReport(jobId)` para gestionar `isDownloadingReport`.
- [ ] **4. Plantilla HTML:**
  - [ ] Reestructurar card lateral con callout de éxito (esmeralda) y callout de advertencia (ámbar).
  - [ ] Agregar preview desplegable de `warnings` con badges.
  - [ ] Reemplazar estilos inline por clases semánticas y emojis por SVGs.
  - [ ] Actualizar tabla de historial para reflejar claramente el conteo de omitidos.
- [ ] **5. Pruebas Unitarias:**
  - [ ] Crear `scout-bulk-import.component.spec.ts` con cobertura completa.
  - [ ] Ejecutar `npm test` y verificar que todas las pruebas pasen en verde.
  - [ ] Ejecutar `npm run build` y certificar compilación limpia.
- [ ] **6. Git, PR y Documentación:**
  - [ ] Commit y push en rama `feature/TS-76-bulk-import-bento-layout-ux` en `talentus-scout-fe`.
  - [ ] Crear Pull Request en GitHub hacia `main` (`gh pr create`).
  - [ ] Crear el plan de pruebas en `test/TS-76-test-plan-correccion-layout-bento-scout-bulk-import.md`.
  - [ ] En el orquestador raíz (`main`), agregar plan y plan de pruebas, commit y push.
  - [ ] Mover tarjeta en Trello a `in testing` con comentario detallado y enlace al PR.

---

## 8. Criterios de Aceptación (DoD)
- [x] Corregido el bug `flex-col: column;` → `flex-direction: column;` en `scout-bulk-import.component.css`, apilando correctamente los elementos internos de las 3 cards Bento en desktop y móvil sin espacios vacíos ni descuadres horizontales.
- [x] Cuando una carga finaliza con `failedRows > 0`, la card `Estado del Proceso` muestra un callout ámbar claro, una vista previa desplegable/scrollable de los registros omitidos (`Fila`, `Atleta`, `Motivo`) y un botón de descarga CSV destacado a ancho completo.
- [x] La tabla del historial refleja claramente el indicador/badge de omitidos cuando `job.failedRows > 0` y su botón de descarga funciona correctamente.
- [x] Se eliminaron los estilos inline de `scout-bulk-import.component.html` trasladándolos a `scout-bulk-import.component.css` siguiendo los tokens de `fe-desing.md`.
- [x] Existen pruebas unitarias en `scout-bulk-import.component.spec.ts` cubriendo los escenarios con y sin omitidos, y tanto `npm test` como `npm run build` pasan al 100%.
