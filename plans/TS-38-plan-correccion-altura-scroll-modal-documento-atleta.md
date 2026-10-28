# Plan de Implementación: [TS-38] Corrección de Altura Responsiva, Scroll Interno y Bloqueo de Fondo en Modal de Documento de Atleta

## 1. Identificación de la Tarea
* **ID:** `[TS-38]`
* **Título:** Corrección de Altura Responsiva, Scroll Interno y Bloqueo de Fondo en Modal de Documento de Atleta
* **Tablero:** Talentus Scout (`https://trello.com/b/rPHiaZJ1/talentus-scout`)
* **ID de la Tarjeta:** `6acc26450389a5552403617b`
* **Columna Actual:** `in development`
* **Sprint Asignado:** Sprint 3

---

## 2. Resumen y Contexto de Negocio
En el Dashboard del Tutor, al pulsar la acción para consignar el documento de identidad del menor (`showIdentityModal`), la falta de contención de altura máxima provocaba que en pantallas de portátiles o resoluciones medianas los botones de acción ("Cancelar" y "Guardar") quedaran cortados fuera del viewport. Asimismo, al usar la rueda del mouse, se desplazaba la página web de fondo en lugar del contenido del modal, provocando frustración e imposibilidad de confirmar la carga.

### Valor y Ergonomía
Garantizar que el encabezado y el pie del modal permanezcan fijos y visibles en todo momento, confinando el desplazamiento vertical exclusivamente al cuerpo del formulario y bloqueando el scroll de la página de fondo (`document.body.style.overflow = 'hidden'`), brinda una interacción pulcra, accesible y predecible en cualquier monitor o dispositivo móvil.

---

## 3. Arquitectura y Modelo de Datos
* **Base de Datos / DDL:** No requiere modificaciones (incidencia 100% de maquetación y experiencia de usuario en Frontend).
* **Backend:** No requiere cambios.

---

## 4. Especificación Frontend (Angular 18+ / CSS)

### 4.1 Reorganización Estructural (`tutor-dashboard.component.html`)
Actualizar el bloque del modal de documento de identidad (`.identity-modal-box`) separando limpiamente las 3 secciones:
1. **`.modal-header`**:
   - Encabezado con título, insignia de protección de menores, nombre del atleta y botón de cierre `✕`.
   - Fijo en la parte superior (`flex-shrink: 0;`).
2. **`.modal-body`**:
   - Contiene el banner informativo, aviso legal LOPNNA, selector de tipo de documento, input de número de documento, dropzone drag & drop y mensajes de error.
   - Área con scroll vertical autónomo (`flex: 1; overflow-y: auto; overscroll-behavior: contain;`).
3. **`.modal-footer`**:
   - Contiene los botones de acción "Cancelar" y "Guardar Documento Legal".
   - Fijo en la parte inferior (`flex-shrink: 0;`) con fondo sutil para garantizar legibilidad y evitar que el contenido desplazable se superponga visualmente.

### 4.2 Reglas CSS en `tutor-dashboard.component.ts`
Reemplazar y enriquecer los estilos de `.identity-modal-box`:
```css
.identity-modal-box {
  max-width: 540px;
  width: 100%;
  max-height: min(90vh, 720px);
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.identity-modal-box .modal-header {
  padding: 20px 24px 14px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.identity-modal-box .modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.identity-modal-box .modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #1e293b;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.95);
}
```

### 4.3 Control de Scroll de Fondo (`tutor-dashboard.component.ts`)
- Implementar la interfaz `OnDestroy` (`implements OnInit, OnDestroy`).
- Inyectar `DOCUMENT` (`private document = inject(DOCUMENT);`).
- En `openIdentityModal(athlete)`:
  - Establecer `this.document.body.style.overflow = 'hidden';`
- En `closeIdentityModal()`:
  - Restaurar `this.document.body.style.overflow = '';`
- En `ngOnDestroy()`:
  - Garantizar `this.document.body.style.overflow = '';` para limpiar cualquier bloqueo residual si el componente se destruye con el modal abierto.

---

## 5. Pruebas y Validación

### 5.1 Pruebas Unitarias de Frontend (`tutor-dashboard.component.spec.ts`)
Añadir suite dedicada `describe('TS-38 Responsive height, internal scroll, and background scroll lock', ...)`:
1. Verificar que al llamar `openIdentityModal()`, se fije `document.body.style.overflow` a `'hidden'`.
2. Verificar que al llamar `closeIdentityModal()`, se restaure `document.body.style.overflow` a `''`.
3. Verificar que al destruir el componente (`component.ngOnDestroy()`), se restaure `document.body.style.overflow` a `''`.
4. Verificar que el modal contenedor `.identity-modal-box` contenga `.modal-header`, `.modal-body` y `.modal-footer` con las clases estructurales requeridas.

### 5.2 Comandos de Validación
- Frontend Tests: `npm test -- --watch=false`
- Frontend Build: `npm run build`
- Despliegue Local: `docker compose build` & `docker compose up -d`

---

## 6. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Frontend: Añadir `OnDestroy` y `DOCUMENT` en `tutor-dashboard.component.ts`.
- [x] 2. Frontend: Implementar bloqueo de scroll (`document.body.style.overflow = 'hidden'`) en `openIdentityModal()` y restauración (`''`) en `closeIdentityModal()` y `ngOnDestroy()`.
- [x] 3. Frontend: Actualizar estilos CSS de `.identity-modal-box`, `.modal-header`, `.modal-body` y `.modal-footer` en `tutor-dashboard.component.ts`.
- [x] 4. Frontend: Actualizar estructura HTML en `tutor-dashboard.component.html` para limpiar estilos inline y adoptar las nuevas clases estructurales.
- [x] 5. Frontend: Añadir pruebas unitarias en `tutor-dashboard.component.spec.ts` para scroll-lock y estructura del modal.
- [x] 6. Frontend: Ejecutar `npm test -- --watch=false` y verificar 100% de éxito.
- [x] 7. Frontend: Ejecutar `npm run build` para asegurar compilación sin errores.
- [x] 8. Documentación: Redactar plan de pruebas en `test/TS-38-test-plan-correccion-altura-scroll-modal-documento-atleta.md`.
- [x] 9. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario.
- [x] 10. Despliegue Local: Construir imágenes Docker actualizadas (`docker compose build`) y recrear contenedores (`docker compose up -d`).

---

## 7. Criterios de Aceptación (Definition of Done - DoD)
- [x] El modal de documento de identidad no excede el 90% de la altura visible del navegador (`max-height: min(90vh, 720px)`).
- [x] Los botones de acción inferiores ("Cancelar" y "Guardar Documento Legal") se mantienen 100% visibles, anclados y accesibles en cualquier resolución de pantalla.
- [x] El encabezado del modal permanece fijo en la parte superior.
- [x] El formulario interno cuenta con scroll vertical fluido e independiente (`overflow-y: auto`).
- [x] Al interactuar con el modal, la página de fondo bloquea su desplazamiento vertical (`document.body.style.overflow = 'hidden'`).
- [x] Al cerrar el modal o destruir el componente, el scroll del body se restaura completamente.
- [x] Todas las pruebas unitarias y de compilación pasan al 100%.
- [x] Imágenes Docker reconstruidas y contenedores locales en ejecución saludable.
