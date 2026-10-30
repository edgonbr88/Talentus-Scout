# Plan de Pruebas: [TS-38] Corrección de Altura Responsiva, Scroll Interno y Bloqueo de Fondo en Modal de Documento de Atleta

## 1. Alcance de las Pruebas
Este plan de pruebas valida la resolución técnica de la tarea **[TS-38]**, enfocada en la ergonomía y contención visual del modal de documento de identidad del atleta en el portal del tutor:
* **Frontend (`talentus-scout-fe`):**
  - `tutor-dashboard.component.ts`:
    - Adopción del contenedor `.identity-modal-box` como flex column vertical con altura máxima controlada (`max-height: min(90vh, 720px); overflow: hidden;`).
    - Encabezado fijo (`.modal-header` con `flex-shrink: 0;`).
    - Cuerpo con desplazamiento vertical autónomo y contención de scroll (`.modal-body` con `flex: 1; overflow-y: auto; overscroll-behavior: contain;`).
    - Pie de acciones inferior fijo con fondo opaco (`.modal-footer` con `flex-shrink: 0;`).
    - Bloqueo de desplazamiento de la página de fondo al abrir el modal (`document.body.style.overflow = 'hidden'`).
    - Restauración completa del desplazamiento de fondo al cerrar el modal (`document.body.style.overflow = ''`) o destruir el componente (`ngOnDestroy()`).
  - `tutor-dashboard.component.html`:
    - Limpieza de estilos inline que colisionaban con el flexbox vertical y los límites de scroll.
  - `tutor-dashboard.component.spec.ts`:
    - Pruebas unitarias que validan la existencia de la estructura tripartita (`.modal-header`, `.modal-body`, `.modal-footer`), el bloqueo y restauración de `document.body.style.overflow` en ciclos de vida y apertura/cierre.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1 Frontend (`talentus-scout-fe`)
Comando ejecutado:
```bash
npm test -- --watch=false
```

Casos probados en `tutor-dashboard.component.spec.ts` dentro de la suite `TS-38 Responsive height, internal scroll, and background scroll lock`:
1. `should lock document body scroll on openIdentityModal and restore it on closeIdentityModal`:
   - Verifica que al invocar `openIdentityModal()`, `document.body.style.overflow` cambia de `''` a `'hidden'`.
   - Verifica que al invocar `closeIdentityModal()`, `document.body.style.overflow` regresa a `''`.
2. `should restore document body scroll when component is destroyed (ngOnDestroy)`:
   - Verifica que si el modal está abierto y el componente es destruido (por ejemplo, por navegación de ruta), `document.body.style.overflow` se restablece a `''`, evitando bloqueos residuales en la aplicación.
3. `should render .identity-modal-box with structured header, body, and footer containers`:
   - Verifica que al abrirse el modal, el DOM contenga el contenedor `.identity-modal-box` y sus tres secciones directas `.modal-header`, `.modal-body` y `.modal-footer`.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1 Verificación en Pantallas de Baja/Media Resolución (Laptops / Tablets)
1. **Acceso al Dashboard del Tutor:**
   - Iniciar sesión con un usuario tutor verificado (ej. `tutor@talentus.com` / `password123`).
   - Navegar a `/dashboard/tutor`.
2. **Redimensionar Viewport a Resolución Mediana:**
   - Abrir DevTools (`F12`) y activar modo responsivo (ej. resolución `1366x768` o `1280x720`).
3. **Apertura del Modal de Documento:**
   - Hacer clic en el botón `Doc. Identidad` (🪪) de cualquiera de los atletas representados.
   - Constatar que:
     - El modal no se corta en la parte superior ni inferior de la pantalla (`max-height: min(90vh, 720px)`).
     - El encabezado con la insignia "PROTECCIÓN INTEGRAL DEL MENOR" y el botón de cierre `✕` están siempre visibles en la parte superior.
     - Los botones de pie "Cancelar" y "Guardar Documento Legal" están siempre visibles y anclados en la parte inferior.
4. **Verificación de Scroll Interno Independiente:**
   - Con el cursor dentro del formulario del modal (entre el aviso legal, el selector, input y dropzone), usar la rueda del mouse o arrastrar el scroll.
   - Constatar que el formulario se desplaza fluidamente sin mover el encabezado ni los botones de pie.
5. **Verificación de Bloqueo de Scroll de Fondo (Scroll-Lock):**
   - Intentar hacer scroll con la rueda del mouse sobre el fondo oscuro (`.modal-backdrop`) o dentro del modal cuando llega al final del contenido.
   - Constatar que la página web de fondo (dashboard de tutor) permanece completamente estática y no se desplaza ni produce doble barra de scroll en el navegador.
6. **Cierre y Restauración de Desplazamiento:**
   - Hacer clic en "Cancelar", en la `✕` o fuera del modal en el backdrop.
   - Constatar que el modal se cierra y el scroll de la página de fondo se desbloquea inmediatamente permitiendo navegar el dashboard con normalidad.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| **DoD 1:** El modal no excede el 90% de la altura de la ventana visible (`max-height: min(90vh, 720px)`). | **CUMPLIDO** | Regla CSS en `.identity-modal-box`. |
| **DoD 2:** Los botones de acción inferiores permanecen fijos y 100% visibles en cualquier resolución. | **CUMPLIDO** | `.modal-footer` con `flex-shrink: 0;` y fondo opaco. |
| **DoD 3:** El encabezado del modal permanece fijo en la parte superior. | **CUMPLIDO** | `.modal-header` con `flex-shrink: 0;`. |
| **DoD 4:** El formulario interno cuenta con scroll vertical independiente (`overflow-y: auto; overscroll-behavior: contain;`). | **CUMPLIDO** | Reglas aplicadas en `.modal-body`. |
| **DoD 5:** Bloqueo de scroll en el fondo al abrir (`overflow: hidden;`) y restauración al cerrar o desmontar el componente (`overflow: '';`). | **CUMPLIDO** | Manejo en `openIdentityModal()`, `closeIdentityModal()` y `ngOnDestroy()`. |
| **DoD 6:** Pruebas unitarias de frontend (`npm test`) y build (`npm run build`) pasando al 100%. | **CUMPLIDO** | 60/60 pruebas unitarias exitosas y compilación de producción validada. |
| **DoD 7:** Reconstrucción de imágenes Docker y despliegue local actualizado. | **CUMPLIDO** | `docker compose build` & `docker compose up -d` ejecutados con éxito. |

---

## 5. Casos Borde y Consideraciones de Usabilidad
* **Navegación abrupta con modal abierto:** La implementación de `ngOnDestroy()` garantiza que si el usuario navega a otra ruta (por ejemplo, haciendo clic en el navbar o mediante un enlace profundo) mientras el modal estaba abierto, el atributo `style.overflow` del `<body>` es restaurado a vacío, evitando que la siguiente vista quede congelada o sin scroll.
* **Compatibilidad SSR:** La verificación de existencia de `this.document?.body` protege contra errores de renderizado en el servidor (Angular SSR / Universal) donde el objeto `document` o su `body` pudieran no estar instanciados de forma estándar.
