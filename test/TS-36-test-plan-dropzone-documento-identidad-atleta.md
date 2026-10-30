# Plan de Pruebas: [TS-36] Dropzone Estilizado con Drag & Drop para Carga de Documento de Identidad del Atleta

**ID Tarea:** TS-36  
**Tarjeta Trello:** https://trello.com/c/39yAknmP (ID: `6acc24c1631fe128d8a1539f`)  
**Fecha:** 2026-10-14  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es certificar la sustitución del control nativo `<input type="file">` en el modal de consignación de comprobante de identidad y patria potestad del atleta (`TutorDashboardComponent`), dotándolo de una experiencia de usuario atlética y moderna alineada con el sistema de diseño de Talentus Scout:

1. **Reemplazo Completo del Control Nativo:**
   - La entrada nativa queda oculta (`style="display: none;"`) y referenciada como `#docFileInput`.
   - Se introduce el contenedor interactivo `.file-dropzone` con feedback táctil y visual al hacer clic.
2. **Soporte Completo de Arrastrar y Soltar (Drag & Drop):**
   - Detección de eventos `dragover`, `dragleave` y `drop`.
   - Activación de feedback visual inmediato mediante la clase condicional `.is-dragging` (borde iluminado `#38bdf8`, resplandor y fondo translúcido).
3. **Previsualización de Documento y Remoción Rápida:**
   - En estado cargado (`.dropzone-file`), se renderiza el icono de archivo, el nombre completo del documento (con truncamiento elíptico en textos largos), su peso exacto formateado en megabytes (`X.XX MB`) y el botón `✕` para remover el archivo y habilitar una nueva selección.
4. **Validaciones en Cliente y Cumplimiento Legal (LOPNNA Art. 65):**
   - Validación estricta de tamaño máximo de 5MB.
   - Validación de extensiones permitidas (`.pdf`, `.png`, `.jpg`, `.jpeg`).
   - Bloqueo de archivos con formatos no conformes o ejecutables antes de la petición HTTP.
   - Conservación del aviso informativo para atletas con documento previamente consignado.

### Componentes Impactados
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `src/app/features/dashboard/tutor-dashboard.component.html`: Marcado de `.file-dropzone`, `.dropzone-empty`, `.dropzone-file` y directivas de arrastre.
  * `src/app/features/dashboard/tutor-dashboard.component.ts`: Métodos de arrastre, validación, remoción y estilos CSS.
  * `src/app/features/dashboard/tutor-dashboard.component.spec.ts`: Suite de pruebas automatizadas con Jasmine y Karma.

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
| Total Suites Frontend (`talentus-scout-fe`) | 54 | 54 | 0 | **100% SUCCESS** |
| `TutorDashboardComponent - TS-36 Dropzone Drag & Drop` | 7 | 7 | 0 | **PASSED** |
| `TutorDashboardComponent - TS-35 Bento Layout` | 5 | 5 | 0 | **PASSED** |
| `TutorDashboardComponent - TS-29 Video Upload Restrictions` | 5 | 5 | 0 | **PASSED** |

#### Casos de Prueba Verificados para TS-36:
1. `should render the styled .file-dropzone in empty state when opened without file`:
   - Verifica la presencia del contenedor `.file-dropzone`.
   - Comprueba que la clase `.has-file` esté desactivada inicialmente.
   - Comprueba que `.dropzone-empty` renderiza el texto *"Haz clic o arrastra tu documento aquí"* y la leyenda *"Formatos: JPG, PNG o PDF (Máximo 5MB)"*.
2. `should update isDraggingDoc on dragover and dragleave events`:
   - Dispara evento `dragover`: verifica `isDraggingDoc = true` y adición de la clase `.is-dragging`.
   - Dispara evento `dragleave`: verifica `isDraggingDoc = false` y remoción de la clase `.is-dragging`.
3. `should handle valid file drop, update state to has-file and display file info`:
   - Simula evento `drop` con un archivo PDF (`partida_nacimiento.pdf`).
   - Verifica la asignación a `identityFile`, desactivación de `isDraggingDoc` y activación de `.has-file`.
   - Verifica el renderizado de `.dropzone-file` mostrando el nombre exacto del archivo.
4. `should reject files exceeding 5MB and display error message`:
   - Procesa un archivo simulado de 6MB.
   - Verifica que `identityFile` permanezca nulo y `identityUploadError` informe *"El archivo supera el tamaño máximo permitido de 5MB."*.
   - Comprueba la adición de la clase `.is-invalid` al dropzone y la presencia del contenedor `.form-error`.
5. `should reject files with unsupported extensions`:
   - Procesa un archivo simulado no admitido (`documento.exe`).
   - Verifica que el archivo sea rechazado con mensaje *"Formato no permitido"*.
6. `should remove the file and clear state when removeIdentityFile is called`:
   - Carga un archivo válido (`cedula.png`).
   - Hace clic en el botón de remoción `.btn-remove-file`.
   - Verifica que `identityFile` vuelva a `null` y que el Dropzone retorne al estado vacío `.dropzone-empty`.
7. `should call athleteService.uploadIdentityDocument when saveIdentityDocument is executed`:
   - Configura un archivo válido, tipo y número de documento.
   - Ejecuta `saveIdentityDocument()` y comprueba la llamada al servicio con el payload multipart (`FormData`).
   - Comprueba el cierre automático del modal tras el guardado exitoso.

---

## 3. Verificación de Compilación y Bundles Frontend

Comando ejecutado:
```bash
npm run build
```
Resultado:
- Generación de bundles de producción completada sin errores de tipado TypeScript ni fallos de plantillas Angular.
- Prerenderizado SSR de rutas estáticas verificado.

---

## 4. Guía de Pruebas Manuales (Paso a Paso en Navegador)

1. **Apertura del Modal de Identidad:**
   - Iniciar sesión como tutor en [http://localhost](http://localhost) y dirigirse al dashboard.
   - En la tarjeta de cualquier atleta, presionar el botón `🪪 Doc. Identidad`.
2. **Inspección Visual del Dropzone:**
   - Comprobar que no existe el input nativo del navegador ("Elegir archivo / Ningún archivo seleccionado").
   - Comprobar la caja con borde punteado `#334155`, icono vectorial SVG de subida, texto celeste interactivo y especificaciones de formatos/tamaño.
3. **Prueba de Selección por Clic:**
   - Hacer clic en cualquier parte del dropzone.
   - Comprobar que se abre inmediatamente el diálogo de selección de archivos del sistema operativo.
   - Seleccionar un comprobante (PNG o PDF).
   - Comprobar que el dropzone cambia a fondo translúcido con borde verde `#10b981`, icono de archivo, nombre y peso en MB.
4. **Prueba de Arrastrar y Soltar (Drag & Drop):**
   - Arrastrar un archivo desde el explorador del sistema sobre la ventana del navegador y situarlo encima del dropzone.
   - Comprobar que el borde se ilumina en azul cielo `#38bdf8` con leve resplandor (`.is-dragging`).
   - Soltar el archivo y comprobar que queda cargado correctamente.
5. **Prueba del Botón de Remoción:**
   - En el estado con archivo cargado, pulsar la `✕` a la derecha.
   - Comprobar que el archivo se descarta y el dropzone vuelve a su estado inicial.
6. **Validación de Archivos Inválidos:**
   - Intentar arrastrar o seleccionar un archivo mayor a 5MB o con extensión distinta a PDF/PNG/JPG.
   - Comprobar que el dropzone adopta borde rojo (`.is-invalid`) y aparece la caja de error explicativa.
7. **Guardado:**
   - Seleccionar un archivo válido y presionar "Guardar Documento Legal".
   - Comprobar que el modal se cierra y el dashboard muestra el mensaje de notificación de éxito.

---

## 5. Matriz de Criterios de Aceptación (Definition of Done - DoD)

| Criterio de Aceptación | Estado | Evidencia de Verificación |
|---|---|---|
| Reemplazo 100% del input nativo por dropzone estilizado | **CUMPLIDO** | Input nativo oculto `#docFileInput`; contenedor `.file-dropzone` implementado. |
| Soporte de clic y Drag & Drop para adjuntar archivos | **CUMPLIDO** | Métodos `onDocDragOver`, `onDocDragLeave`, `onDocDrop` y evento `click`. |
| Feedback visual de borde iluminado al arrastrar | **CUMPLIDO** | Clase `.is-dragging` con borde `#38bdf8` y sombra sutil. |
| Previsualización de nombre, peso en MB y botón `✕` de remoción | **CUMPLIDO** | Contenedor `.dropzone-file` con datos formateados y método `removeIdentityFile`. |
| Validación de límite de tamaño (5MB) y formatos | **CUMPLIDO** | Método `handleIdentityFile` y pruebas unitarias de rechazo verificadas. |
| Suite de tests y compilación en verde al 100% | **CUMPLIDO** | 54 tests en Karma aprobados; `npm run build` exitoso. |
| Imágenes Docker locales actualizadas | **CUMPLIDO** | Construcción de imágenes Docker y despliegue local actualizado. |
