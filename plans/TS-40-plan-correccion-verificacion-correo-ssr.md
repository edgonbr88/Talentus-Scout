# Plan de Implementación: [TS-40] Corrección de Verificación de Correo en SSR: Eliminación de Falso Error Inicial y Redirección Manual

## 1. Identificación de la Tarea
* **ID:** `[TS-40]`
* **Título:** Corrección de Verificación de Correo en SSR: Eliminación de Falso Error Inicial y Redirección Manual
* **Tablero:** Talentus Scout (`https://trello.com/b/rPHiaZJ1/talentus-scout`)
* **ID de la Tarjeta:** `6acc1e55d826198038f4bf4b`
* **Columna Actual:** `in development`
* **Sprint Asignado:** Sprint 3

---

## 2. Resumen y Contexto de Negocio
Al abrir el enlace de verificación recibido por correo electrónico (`/auth/verify-email?token=...`), los usuarios experimentaban un parpadeo confuso: la pantalla mostraba inicialmente un mensaje de error *"Enlace no Válido o Expirado"*, e instantes después cambiaba abruptamente a *"¡Cuenta Activada con Éxito!"*, antes de redirigir apresuradamente al panel en 2.2 segundos.

### Causa Raíz Técnica
Durante la renderización en el servidor (Angular SSR en Node.js), la llamada HTTP relativa a `/api/v1/auth/verify-email` fallaba a nivel de red del servidor antes de que el navegador del cliente recibiera la página. El servidor renderizaba entonces el bloque de error en el HTML inicial. Una vez hidratada la aplicación en el navegador, se disparaba una segunda petición que sí tenía éxito.

### Solución y Ergonomía
1. **Aislamiento en SSR:** Restringir la ejecución de `authService.verifyEmail(token)` al entorno del navegador mediante `isPlatformBrowser(this.platformId)`. Durante SSR, el componente mantiene el estado de carga limpio ("Verificando tu Cuenta Oficial").
2. **Control del Usuario:** Eliminar el temporizador `setTimeout` de 2.2 segundos en el estado de éxito y remover el aviso de redirección automática, permitiendo al usuario leer la confirmación de activación de su cuenta y avanzar a voluntad haciendo clic en *"Ir a mi Panel Ahora"*.

---

## 3. Arquitectura y Modelo de Datos
* **Base de Datos / DDL:** No requiere modificaciones.
* **Backend:** No requiere modificaciones (endpoint `GET /api/v1/auth/verify-email` operativo y validado).

---

## 4. Especificación Frontend (Angular 18+ / SSR)

### 4.1 Componente `VerifyEmailComponent` (`verify-email.component.ts`)
1. Inyectar `PLATFORM_ID`:
   ```typescript
   private platformId = inject(PLATFORM_ID);
   ```
2. Modificar `ngOnInit()`:
   ```typescript
   ngOnInit(): void {
     if (!isPlatformBrowser(this.platformId)) {
       // En SSR permanecemos en estado de carga; no ejecutar mutaciones ni llamadas HTTP en el servidor
       return;
     }

     const token = this.route.snapshot.queryParamMap.get('token');

     if (!token) {
       this.isLoading.set(false);
       this.errorMessage.set('No se proporcionó un token de verificación válido en la solicitud.');
       return;
     }

     this.authService.verifyEmail(token).subscribe({
       next: () => {
         this.isLoading.set(false);
         this.isSuccess.set(true);
       },
       error: (err) => {
         this.isLoading.set(false);
         this.errorMessage.set(
           err?.error?.message || 'El enlace de verificación ha expirado o ya fue utilizado.'
         );
       }
     });
   }
   ```

### 4.2 Plantilla `verify-email.component.html`
Eliminar el contenedor `.redirect-notice`:
```html
<!-- ESTADO 2: VERIFICACIÓN EXITOSA -->
<div *ngIf="isSuccess()" class="status-box">
  <div class="success-icon-wrap">
    <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
  <h2 class="title success-title">¡Cuenta Activada con Éxito!</h2>
  <p class="subtitle">
    Tu correo ha sido confirmado y tu expediente de protección legal del menor está activo.
  </p>
  <button (click)="goToDashboard()" class="btn-primary">
    Ir a mi Panel Ahora
  </button>
</div>
```

---

## 5. Pruebas y Validación

### 5.1 Pruebas Unitarias (`verify-email.component.spec.ts`)
Crear archivo de pruebas unitarias cubriendo:
1. **Comportamiento en SSR (`isPlatformBrowser === false`):**
   - No invoca `authService.verifyEmail()`.
   - Mantiene `isLoading() === true`, `isSuccess() === false`, `errorMessage() === null`.
2. **Comportamiento en Navegador sin Token:**
   - Detiene carga y muestra mensaje de token no proporcionado.
3. **Comportamiento en Navegador con Token Válido:**
   - Invoca `authService.verifyEmail(token)`.
   - En éxito: `isLoading() === false`, `isSuccess() === true`, `errorMessage() === null`.
   - Verifica que NO se configure redirección automática.
4. **Comportamiento en Navegador con Token Inválido:**
   - Invoca `authService.verifyEmail(token)`.
   - En error: `isLoading() === false`, `isSuccess() === false`, muestra mensaje de error.
5. **Navegación al Dashboard:**
   - Invocar `goToDashboard()` navega hacia `['/dashboard']`.

### 5.2 Comandos de Validación
- Frontend Tests: `npm test -- --watch=false`
- Frontend Build: `npm run build`
- Despliegue Local: `docker compose build` & `docker compose up -d`

---

## 6. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Frontend: Inyectar `PLATFORM_ID` y aplicar guarda `isPlatformBrowser` en `verify-email.component.ts`.
- [x] 2. Frontend: Retirar el temporizador `setTimeout` de redirección automática en `verify-email.component.ts`.
- [x] 3. Frontend: Eliminar el bloque `.redirect-notice` en `verify-email.component.html`.
- [x] 4. Frontend: Crear archivo de pruebas unitarias `verify-email.component.spec.ts`.
- [x] 5. Frontend: Ejecutar `npm test -- --watch=false` y verificar 100% de éxito.
- [x] 6. Frontend: Ejecutar `npm run build` para asegurar empaquetado SSR exitoso.
- [x] 7. Documentación: Redactar plan de pruebas en `test/TS-40-test-plan-correccion-verificacion-correo-ssr.md`.
- [x] 8. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario.
- [x] 9. Despliegue Local: Construir imágenes Docker actualizadas (`docker compose build`) y recrear contenedores (`docker compose up -d`).

---

## 7. Criterios de Aceptación (Definition of Done - DoD)
- [x] En entorno SSR, la verificación del token no se ejecuta y se preserva el estado inicial de carga.
- [x] En entorno navegador, el token se valida exitosamente sin parpadeo de error previo.
- [x] Se elimina la redirección automática en el estado de éxito, permitiendo al usuario presionar "Ir a mi Panel Ahora".
- [x] Si el token es inválido o no existe, se muestra el estado de error y las acciones para solicitar nuevo enlace.
- [x] Todas las pruebas unitarias y compilación de producción pasan al 100%.
- [x] Imágenes Docker reconstruidas y contenedores locales en ejecución saludable.
