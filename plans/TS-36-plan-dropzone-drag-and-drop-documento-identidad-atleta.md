# Plan de Implementación: [TS-36] Dropzone Estilizado con Drag & Drop para Carga de Documento de Identidad del Atleta

**ID Tarea:** TS-36  
**Tarjeta Trello:** https://trello.com/c/39yAknmP (ID: `6acc24c1631fe128d8a1539f`)  
**Fecha:** 2026-10-14  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**  
  En el modal de consignación de comprobante de identidad y patria potestad del atleta en el dashboard del tutor (`showIdentityModal`), la subida del comprobante utilizaba un control nativo del navegador (`<input type="file">`). Esto causaba una discrepancia visual y de experiencia de usuario frente a otros flujos de la plataforma (como el registro de tutores), el cual ya ofrecía una caja interactiva estilizada con previsualización del archivo, peso y botón de remoción.
- **Impacto y Experiencia de Usuario:**  
  Implementar un Dropzone estilizado con soporte completo de arrastrar y soltar (Drag & Drop), feedback de estado al arrastrar (`is-dragging`), iconos vectoriales claros y resumen de peso/nombre en megabytes dignifica el proceso de carga y minimiza errores de formato.
- **Rigor Jurídico y Protección Integral (LOPNNA Art. 65 / FIFA):**  
  La consignación de la partida de nacimiento, cédula de identidad o pasaporte del menor es el pilar para la auditoría de patria potestad. Guiar al tutor con un área de carga accesible y límites claros (PDF, PNG, JPG hasta 5MB) garantiza la integridad de los expedientes legales.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Frontend (`talentus-scout-fe` — Angular 18+):**
    - `src/app/features/dashboard/tutor-dashboard.component.html`: Reemplazo del `<input type="file">` nativo por el contenedor interactivo `.file-dropzone` con zonas condicionales `.dropzone-empty` y `.dropzone-file`.
    - `src/app/features/dashboard/tutor-dashboard.component.ts`:
      - Estado reactivo `isDraggingDoc = false;`.
      - Métodos de arrastre: `onDocDragOver`, `onDocDragLeave`, `onDocDrop`.
      - Método de remoción: `removeIdentityFile`.
      - Validación centralizada de archivos (`handleIdentityFile`).
      - Estilos CSS completos para `.file-dropzone`, `.is-dragging`, `.has-file`, `.upload-icon`, `.dropzone-text`, `.dropzone-hint`, `.file-info`, etc.
    - `src/app/features/dashboard/tutor-dashboard.component.spec.ts`: Pruebas unitarias para validar drag & drop, renderizado de estados vacío/cargado, remoción de archivo y validación de 5MB.
- **Base de Datos y Backend:**  
  - No requiere modificaciones (el endpoint `POST /api/v1/athletes/{id}/identity-document` ya gestiona archivos multipart de forma robusta).
- **Dependencias:**  
  - `TS-17` (Dashboard del tutor) y `TS-28` (Auditoría de patria potestad).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No aplica (sin impacto en base de datos).

---

## 4. Backend: Spring Boot 3 (Java 21)
- No aplica (intervención exclusivamente de presentación y UX frontend).

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directiva de Diseño ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Paleta intencional: fondo `#0b1120`, borde punteado `2px dashed #334155`, transición suave `0.2s ease`.
  - Hover y Dragging: borde iluminado `#38bdf8` / `#10b981` con fondo traslúcido `rgba(56, 189, 248, 0.08)`.
  - Estado con archivo: icono de archivo verde esmeralda `#10b981`, nombre del documento truncado elegantemente con `text-overflow: ellipsis`, tamaño en MB y botón de remoción `✕` discreto pero accesible.
  - Alerta de validación: mensajes de error en contenedor accesible `#fca5a5` si se supera el peso permitido de 5MB o formato inválido.

---

## 6. Pruebas y Verificación
- **Pruebas Automatizadas Frontend:**
  - `npm test -- --watch=false` en `talentus-scout-fe`
  - Validar casos en `tutor-dashboard.component.spec.ts`:
    - Renderizado inicial del Dropzone en estado vacío (`.dropzone-empty`).
    - Apertura del selector al hacer clic en `.file-dropzone`.
    - Activación de clase `.is-dragging` en `dragover` y desactivación en `dragleave`.
    - Asignación de archivo en evento `drop` y renderizado de `.dropzone-file`.
    - Remoción de archivo al presionar el botón `btn-remove-file`.
    - Validación de límite de tamaño (5MB).
- **Compilación Frontend:**
  - `npm run build` en `talentus-scout-fe`.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Frontend: Actualizar plantilla `tutor-dashboard.component.html` sustituyendo el input nativo por la estructura `.file-dropzone` interactiva con directivas de arrastre y estados condicionales.
- [x] 2. Frontend: Implementar lógica de Drag & Drop (`isDraggingDoc`, `onDocDragOver`, `onDocDragLeave`, `onDocDrop`, `removeIdentityFile`, `handleIdentityFile`) en `tutor-dashboard.component.ts`.
- [x] 3. Frontend: Añadir estilos CSS de `.file-dropzone` y sus estados en `tutor-dashboard.component.ts`.
- [x] 4. Frontend: Añadir pruebas unitarias específicas para el Dropzone en `tutor-dashboard.component.spec.ts`.
- [x] 5. Verificación: Ejecutar pruebas unitarias (`npm test -- --watch=false`).
- [x] 6. Verificación: Compilar frontend (`npm run build`).
- [x] 7. Documentación: Redactar plan de pruebas en `test/TS-36-test-plan-dropzone-documento-identidad-atleta.md`.
- [x] 8. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario.
- [x] 9. Despliegue Local: Construir imágenes Docker actualizadas (`docker compose build`) y recrear contenedores (`docker compose up -d`).

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] El control nativo de archivo del navegador queda 100% reemplazado por la caja Dropzone estilizada en el modal de documento del menor.
- [x] El usuario puede hacer clic sobre el dropzone para abrir el explorador de archivos o arrastrar y soltar (Drag & Drop) un archivo directamente.
- [x] Al arrastrar un archivo sobre la zona, se activa feedback visual de borde iluminado (`is-dragging`).
- [x] Al seleccionar un archivo, se muestra su nombre, peso en MB y botón `✕` de remoción.
- [x] Si el atleta ya tiene un documento previo, la alerta verde informativa continúa visible indicando que la nueva carga actualizará el registro.
- [x] Compilación limpia con `npm run build` y suite de tests `npm test` en verde al 100%.
- [x] Imágenes Docker locales reconstruidas y contenedores en ejecución saludable.
