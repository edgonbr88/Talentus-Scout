# Plan de Pruebas: [TS-76] Corrección de layout Bento y mejora de UX/estilos para resultados y archivo de omitidos en Carga Masiva

**ID Tarea:** TS-76  
**Tarjeta Trello:** [https://trello.com/c/562j1g9A](https://trello.com/c/562j1g9A)  
**Pull Request Frontend:** [https://github.com/edgonbr88/talentus-scout-fe/pull/10](https://github.com/edgonbr88/talentus-scout-fe/pull/10)  
**Fecha:** 2026-11-17  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de estas pruebas es validar la resolución del bug de layout en el contenedor Bento Grid y la experiencia de usuario (UX) mejorada para la presentación de resultados y descarga de informes de omitidos en el componente de Carga Masiva de Atletas:

- **Componentes Impactados:**
  - `ScoutBulkImportComponent` (`talentus-scout-fe/src/app/features/scout-bulk-import/scout-bulk-import.component.ts`)
  - Plantilla HTML (`scout-bulk-import.component.html`)
  - Hoja de estilos (`scout-bulk-import.component.css`)
  - Suite de pruebas unitarias (`scout-bulk-import.component.spec.ts`)
- **Modelos y Servicios Involucrados:**
  - `BulkImportService` (`src/app/core/services/bulk-import.service.ts`)
  - `BulkImportJobResponse`, `BulkImportRowError` (`src/app/core/models/bulk-import.model.ts`)
- **Backend / Base de Datos:**
  - No requiere cambios (se apoya en los endpoints existentes `GET /api/v1/scout/bulk-import/jobs/{jobId}` y `GET /api/v1/scout/bulk-import/jobs/{jobId}/report`).

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Pruebas Unitarias Frontend (Angular / Karma / Jasmine)
Se implementó una suite completa en `scout-bulk-import.component.spec.ts` validando el comportamiento del componente, el renderizado condicional, la gestión de estado y la interacción con servicios.

**Comando ejecutado:**
```bash
cd talentus-scout-fe
npm test -- --include src/app/features/scout-bulk-import/scout-bulk-import.component.spec.ts --watch=false
```

**Resultado:**
```text
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 10 of 10 SUCCESS (0.204 secs / 1.608 secs)
TOTAL: 10 SUCCESS
```

**Detalle de Casos de Prueba Verificados:**
1. `debe crearse correctamente e inicializar el historial de importaciones`: Verifica inyección de dependencias y consulta inicial a `getScoutJobs()`.
2. `debe alternar entre la pestaña de archivo local y Google Sheets`: Verifica la actualización reactiva de `activeTab` y reseteo de errores.
3. `debe mostrar el estado vacío en el monitor cuando activeJob es null`: Confirma que el bloque lateral presenta el mensaje neutral antes de iniciar una carga.
4. `debe mostrar el callout de éxito esmeralda cuando la carga se completa sin omisiones (failedRows === 0)`: Confirma visualización del banner verde (#10B981) y ausencia de avisos de omisión o botón de descarga de omitidos.
5. `debe mostrar el callout de advertencia ámbar y el botón de descarga cuando existen filas omitidas (failedRows > 0)`: Valida renderizado del banner ámbar (#F59E0B), conteos de atletas incorporados vs omitidos y el botón de descarga a ancho completo.
6. `debe alternar la visualización del acordeón de filas omitidas con toggleOmittedDetails()`: Comprueba que el clic en el botón acordeón expanda la lista de omisiones con número de fila, nombre de atleta y badge diferenciado (`OMITIDO_DUPLICADO` vs `FILA_OMITIDA`).
7. `debe invocar a downloadErrorReport en BulkImportService con el id del trabajo y gestionar el flag isDownloadingReport`: Verifica el disparo de la descarga y el manejo del estado de carga.
8. `debe manejar error al descargar informe de advertencias`: Valida mensaje de error amigable cuando la petición HTTP falla.
9. `debe reflejar el conteo de omitidos y el botón de advertencias en la tabla de historial`: Comprueba que las cargas previas con omitidos muestren su badge dorado y el botón de descarga alineado a la derecha.
10. `debe calcular el porcentaje de progreso correctamente`: Valida el cálculo reactivo del porcentaje de avance en base a `processedRows / totalRows`.

### 2.2. Verificación de Compilación y Bundle (Angular CLI)
**Comando ejecutado:**
```bash
cd talentus-scout-fe
npm run build
```

**Resultado:**
- Compilación del cliente (`browser`) y servidor (`server` / SSR) finalizada con código de salida 0 sin errores de tipos TypeScript ni fallos de plantillas HTML.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Validación del Layout Bento Grid y Responsividad
1. Iniciar la aplicación Angular en entorno local: `npm start`.
2. Iniciar sesión con un usuario con rol `SCOUT` o `VERIFIER_ORG` que posea `bulkImportEnabled = true`.
3. Navegar a `/scout/bulk-import`.
4. **Verificación visual del Bento Grid:**
   - Observar que las tarjetas `.bento-card-main` y `.bento-card-side` se alinean verticalmente en columnas internas (`flex-direction: column;`) sin espacios en blanco desproporcionados ni elementos apilados horizontalmente de forma errónea.
   - Las pestañas (`Archivo Local` y `Google Sheets`), la zona dropzone y el botón de acción principal ocupan el 100% del ancho del contenedor izquierdo.
5. **Verificación Responsive:**
   - Redimensionar el navegador a tamaño tablet (`< 960px`): verificar que las tarjetas se apilen ordenadamente en una sola columna con espaciado uniforme.
   - Redimensionar a móvil (`< 640px`): verificar padding de 16px, botones de plantilla adaptados al 100% y legibilidad de textos.

### 3.2. Carga con Éxito Total (Sin Omitidos)
1. Subir un archivo Excel/CSV con registros nuevos válidos.
2. Al culminar el procesamiento con `failedRows === 0`:
   - El monitor lateral muestra el badge `COMPLETED` en verde.
   - Se despliega el callout esmeralda: *"Importación completada con éxito. Todos los N registros fueron validados e integrados al radar de tu club sin omisiones."*
   - No se muestra advertencia ámbar ni botón de descarga de omitidos.

### 3.3. Carga con Filas Omitidas (Duplicados / Datos Incompletos)
1. Subir un archivo con atletas preexistentes en la base de datos o campos de tutor ausentes.
2. Al culminar con `failedRows > 0`:
   - El monitor muestra métricas claras: `Total`, `Exitosos` (esmeralda), `Omitidos` (ámbar).
   - Se muestra el banner ámbar indicando: *"Se incorporaron X de Y atletas. Se omitieron Z registros por duplicidad de cédula o datos incompletos."*
   - Aparece el botón *"Ver detalle de omitidos (Z)"*. Al pulsarlo, se despliega la lista con las filas omitidas, el nombre del atleta, el motivo y el badge dorado (`Duplicado`) o gris azulado (`Omitido`).
   - En el pie de la tarjeta aparece el botón destacado *"Descargar Informe de Omitidos (CSV)"*. Al hacer clic, se inicia la descarga del archivo CSV con el reporte.
3. En la tabla de **Historial de Importaciones del Club**:
   - Se muestra la columna **Omitidos** con el badge numérico destacado.
   - Aparece el botón *"Descargar Advertencias"* que permite descargar nuevamente el informe CSV.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| **Corrección del bug `flex-col: column;` → `flex-direction: column;`** en `.bento-card-main`, `.bento-card-side`, `.bento-card-full` sin descuadres horizontales. | **CUMPLIDO** | `scout-bulk-import.component.css` actualizado con `flex-direction: column;` y `align-items: stretch;`. |
| **Callout ámbar, vista previa desplegable de omitidos y botón CSV a ancho completo** cuando `failedRows > 0`. | **CUMPLIDO** | Implementado en plantilla HTML y CSS con clases `.result-callout-warning`, `.btn-toggle-omitted`, `.omitted-preview-box` y `.btn-download-full`. |
| **Confirmación esmeralda clara cuando `failedRows === 0`**. | **CUMPLIDO** | Callout `.result-callout-success` renderizado cuando la carga no tiene omisiones. |
| **Columna y badge de omitidos en tabla de historial**. | **CUMPLIDO** | Nueva columna `Omitidos` en cabecera y filas con badge `.badge-omitted` y botón `.btn-report` alineado. |
| **Eliminación de estilos inline en HTML hacia CSS semántico**. | **CUMPLIDO** | Todos los `style="..."` eliminados y reemplazados por clases conformes a los tokens de diseño de `fe-desing.md`. |
| **Iconos SVG limpios y accesibles**. | **CUMPLIDO** | Reemplazados emojis por SVGs con `aria-hidden="true"` y atributos ARIA como `aria-expanded` en acordeón. |
| **Pruebas unitarias y build limpio**. | **CUMPLIDO** | 10 pruebas unitarias en `scout-bulk-import.component.spec.ts` pasando (`TOTAL: 10 SUCCESS`), `npm run build` exitoso. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas
- **Descargas concurrentes / Doble clic:** Se gestiona el flag `isDownloadingReport` para deshabilitar el botón de descarga y mostrar *"Generando descarga..."*, evitando peticiones repetidas.
- **Archivos con gran volumen de advertencias:** La vista previa scrollable tiene un `max-height: 220px` para no deformar la altura de la tarjeta Bento, e incluye un aviso si existen más omisiones que las mostradas en pantalla invitando a descargar el CSV completo.
- **Protección de Datos LOPNNA Art. 65:** La visualización de omisiones solo expone la información técnica indispensable para que el club subsane el archivo de carga sin divulgar datos sensibles fuera del radar de la organización.
