# Plan de Pruebas: [TS-40] Corrección de Verificación de Correo en SSR: Eliminación de Falso Error Inicial y Redirección Manual

## 1. Alcance de las Pruebas
Este plan de pruebas valida la corrección del flujo de activación de cuentas por correo electrónico (**[TS-40]**), eliminando los falsos negativos iniciales producidos durante la renderización en el servidor (Angular SSR) y garantizando el control del usuario sobre la navegación a su panel:
* **Frontend (`talentus-scout-fe`):**
  - `verify-email.component.ts`:
    - Inyección de `PLATFORM_ID` y guarda `isPlatformBrowser(this.platformId)` en `ngOnInit()`.
    - Preservación del estado de carga inicial (`isLoading() === true`) durante el ciclo de vida de Server-Side Rendering (Node.js).
    - Ejecución de la llamada HTTP `authService.verifyEmail(token)` exclusivamente en el navegador del cliente.
    - Eliminación de temporizador `setTimeout` de redirección automática hacia el dashboard.
  - `verify-email.component.html`:
    - Eliminación del aviso de redirección automática `.redirect-notice`.
    - Preservación y verificación de la acción explícita mediante el botón *"Ir a mi Panel Ahora"*.
  - `verify-email.component.spec.ts`:
    - Pruebas unitarias completas simulando entornos `'server'` (SSR) y `'browser'` con tokens válidos, inválidos y ausentes.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1 Frontend (`talentus-scout-fe`)
Comando ejecutado:
```bash
npm test -- --watch=false
```

Casos probados en `verify-email.component.spec.ts`:
1. `should stay in loading state and NEVER invoke verifyEmail during SSR`:
   - Configura el `PLATFORM_ID` con valor `'server'`.
   - Verifica que `authService.verifyEmail` nunca sea invocado en el servidor.
   - Verifica que `isLoading()` permanezca en `true`, `isSuccess()` en `false` y `errorMessage()` en `null`.
   - Verifica que el HTML inicial renderizado en SSR contenga el spinner `.spinner-radar` y el título *"Verificando tu Cuenta Oficial"*, sin renderizar avisos de error ni títulos de éxito prematuros.
2. `should display error when no token is provided in query params`:
   - Configura el entorno `'browser'` sin parámetro `token` en la URL.
   - Verifica que no se invoque al servicio de autenticación y se muestre directamente el estado de error explicativo.
3. `should verify token, show success, and NOT automatically redirect`:
   - Configura el entorno `'browser'` con token válido.
   - Verifica que se invoque `authService.verifyEmail('valid-token-123')`.
   - Verifica que `isSuccess()` cambie a `true` y `isLoading()` a `false`.
   - Verifica que no exista `.redirect-notice` en el DOM.
   - Verifica que al hacer clic en el botón *"Ir a mi Panel Ahora"*, se invoque `router.navigate(['/dashboard'])`.
4. `should display error message returned by backend when token is invalid or expired`:
   - Configura el entorno `'browser'` con token rechazado por el backend (HTTP 400).
   - Verifica que `errorMessage()` contenga el mensaje devuelto y se desplieguen los enlaces para solicitar un nuevo enlace (`/auth/verify-email-pending`) o iniciar sesión (`/login`).

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1 Verificación de Activación de Cuenta por Enlace
1. **Generación del Token de Verificación:**
   - Registrar un nuevo tutor desde `/auth/register-tutor` o consultar el token emitido en la base de datos:
     ```sql
     SELECT token FROM email_verification_tokens ORDER BY created_at DESC LIMIT 1;
     ```
2. **Acceso Directo por URL:**
   - Abrir una pestaña en modo incógnito o navegador limpio y navegar a:
     `http://localhost/auth/verify-email?token=<TOKEN_OBTENIDO>`
3. **Observación del Comportamiento Visual:**
   - **HTML Inicial (SSR):** Constatar que la página carga directamente con el radar giratorio esmeralda y el texto *"Verificando tu Cuenta Oficial"*. En ningún momento se observa un parpadeo ni el mensaje *"Enlace no Válido o Expirado"*.
   - **Transición a Éxito (Cliente):** Una vez recibido el HTTP 200, la pantalla transiciona suavemente a *"¡Cuenta Activada con Éxito!"*.
   - **Permanencia en Pantalla:** Constatar que la página **no se redirige automáticamente** a los 2 segundos, permitiendo leer con tranquilidad la notificación legal.
4. **Interacción con Botón:**
   - Pulsar el botón verde *"Ir a mi Panel Ahora"*.
   - Constatar que la aplicación navega fluidamente hacia `/dashboard` con la sesión del tutor activa.

### 3.2 Verificación con Token Inválido
1. Navegar a `http://localhost/auth/verify-email?token=token_invalido_de_prueba`.
2. Constatar que tras el spinner de carga inicial, aparece el contenedor de error con los enlaces funcionales *"Solicitar Nuevo Enlace"* y *"Volver a Iniciar Sesión"*.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| **DoD 1:** En SSR no se ejecuta la verificación y se entrega el HTML en estado de carga. | **CUMPLIDO** | `if (!isPlatformBrowser(this.platformId)) return;` validado en test unitario. |
| **DoD 2:** En cliente se ejecuta la verificación sin falsos errores iniciales ni parpadeos. | **CUMPLIDO** | Comportamiento verificado en suite de navegador. |
| **DoD 3:** Eliminada la redirección automática por temporizador. | **CUMPLIDO** | `setTimeout` removido y botón *"Ir a mi Panel Ahora"* como acción voluntaria. |
| **DoD 4:** Manejo adecuado de errores para tokens inválidos o inexistentes. | **CUMPLIDO** | Tests unitarios cubren token ausente y token rechazado por backend. |
| **DoD 5:** Pruebas unitarias (70/70) y build de producción al 100%. | **CUMPLIDO** | Suite completa de frontend pasando sin advertencias ni errores. |
| **DoD 6:** Despliegue de imágenes Docker actualizado y saludable. | **CUMPLIDO** | `docker compose build` & `docker compose up -d` ejecutados con éxito. |

---

## 5. Casos Borde y Consideraciones de Rendimiento
* **Aislamiento de mutaciones en SSR:** Los motores de búsqueda e indexadores web (Googlebot, Bing) que previsualizan páginas SSR no deben disparar peticiones de verificación ni invalidar tokens de un solo uso en el servidor.
* **Sesión y Tokens JWT:** Al ejecutarse en el navegador, `authService.verifyEmail` persiste el token JWT en el almacenamiento local del cliente (`localStorage`), permitiendo que el botón *"Ir a mi Panel Ahora"* entre al dashboard con sesión autenticada.
