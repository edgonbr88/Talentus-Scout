# Plan de Implementación: [TS-83] Conversión de Sección de Pagos (Checkout) de Modal a Página Dedicada

**ID Tarea:** TS-83  
**Tarjeta Trello:** https://trello.com/c/9jOmcJzA  
**Fecha:** 2026-11-23  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** El checkout actual (`CheckoutPagoMovilModalComponent`) se renderiza dentro de un modal superpuesto sobre el panel del tutor. Con 4 pasarelas (VexPay, Pago Móvil, Binance Pay, Zelle), selector de planes, cupones y datos bancarios copiables, el modal resulta estrecho, genera scroll excesivo y no soporta navegación por URL directa ni recargas (`F5`).
- **Valor para el usuario:** Migrar a una página dedicada con layout de 2 columnas (selección de métodos/planes/formulario a la izquierda y resumen sticky con CTA a la derecha) mejora la legibilidad, usabilidad móvil, soporte de recargas (`F5`) y confirmación visual del comprobante.
- **Restricciones legales aplicables (LOPNNA Art. 65):** El acceso a `/pagos` y `/pagos/:athleteId` está protegido por `[authGuard, tutorGuard]` para que únicamente el tutor legal (`TUTOR`) o atleta mayor de edad (`ATHLETE`) autenticado acceda sobre sus propios perfiles (`AthleteService.getMyAthletes()`).

---

## 2. Alcance Técnico y Arquitectura
- **Base de Datos (`talentus-scout-migrations`):** Sin cambios.
- **Backend (`talentus-scout-be`):** Sin cambios (mantiene los endpoints de `PaymentController` y retorno de VexPay hacia `/dashboard`).
- **Frontend (`talentus-scout-fe`):**
  - Nuevas rutas `/pagos` y `/pagos/:athleteId` en `app.routes.ts` con `[authGuard, tutorGuard]` y `loadComponent`.
  - Nuevo componente dedicado `CheckoutPageComponent` (`features/payments/checkout-page.component.ts`, `.html`, `.css`) y sus pruebas (`checkout-page.component.spec.ts`).
  - Eliminación de `CheckoutPagoMovilModalComponent` (`checkout-pago-movil-modal.component.*`).
  - Actualización de `TutorDashboardComponent` (`.ts`, `.html`, `.spec.ts`) para navegar a `/pagos/:athleteId` en lugar de abrir modal.
  - Actualización de `NavbarComponent` (`.html`) agregando enlace `"Planes y Pagos"` (`/pagos`) cuando `authService.canAccessAthleteDashboard()`.
  - Actualización de textos en `admin-payments.component.html` ("modal de checkout" -> "página de checkout").
- **Dependencias:** Ninguna.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No requiere migraciones DDL.

---

## 4. Backend: Spring Boot 3 (Java 21)
- No requiere modificaciones.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)
- **Directiva de Diseño:** Seguir [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md) (`frontend-design`). Paleta oscura táctica (`--color-bg-base`, `--color-surface`, `--color-accent-pitch`) con layout de 2 columnas (`1.6fr 1fr`, sidebar sticky en desktop, 1 columna en móvil).
- **Separación Obligatoria de Plantillas:** `.ts`, `.html` y `.css` independientes.

### Detalle de implementación:
1. **`src/app/app.routes.ts`**
   - Agregar rutas:
     - `{ path: 'pagos', loadComponent: () => import('./features/payments/checkout-page.component').then(m => m.CheckoutPageComponent), canActivate: [authGuard, tutorGuard], title: 'Planes y Pagos — Talentus Scout' }`
     - `{ path: 'pagos/:athleteId', loadComponent: () => import('./features/payments/checkout-page.component').then(m => m.CheckoutPageComponent), canActivate: [authGuard, tutorGuard], title: 'Planes y Pagos — Talentus Scout' }`
2. **`src/app/features/payments/checkout-page.component.ts` / `.html` / `.css`**
   - **Carga autónoma (resiliente a `F5`):** En `ngOnInit()`, carga `AthleteService.getMyAthletes()`, `PaymentService.getPaymentConfig()` y `PaymentService.getBcvRate()` mediante `forkJoin` (con manejo seguro si BCV falla).
   - **Selección de atleta:** Lee `:athleteId` de `ActivatedRoute.paramMap`. Si coincide en `myAthletes()`, lo selecciona; si no hay parámetro o no coincide, selecciona el primer atleta con suscripción distinta de `ACTIVE` o el primero de la lista. Si no hay atletas registrados, muestra estado vacío guiado con enlace a `/dashboard`.
   - **Selector de atleta en cabecera:** Si `myAthletes().length > 1`, muestra `<select>` en cabecera para cambiar de atleta y actualizar la cotización/cupón si aplica.
   - **Layout de 2 Columnas:**
     - **Cabecera:** Botón `"← Volver al Panel"` (`routerLink="/dashboard"`), título `"Planes y Pagos"`, badge de estado de suscripción del atleta seleccionado y selector de atleta (si hay > 1).
     - **Columna Izquierda:** Selector de método de pago (`VexPay Automático`, `Pago Móvil`, `Binance Pay`, `Zelle`), selector de Plan Pro (`PRO_MONTHLY`, `PRO_ANNUAL`, etc.), bloque de cupón promocional/convenio, y detalle + formulario específico del método seleccionado (o bloque de activación gratuita `100%` si `isFreePromo`).
     - **Columna Derecha (Sticky Summary):** Resumen de la orden: atleta beneficiario, plan seleccionado, subtotal USD, descuento aplicado, tasa BCV del día y total en VES (si aplica), total final y botón principal de acción/confirmación (o aviso de mantenimiento si todas las pasarelas están deshabilitadas).
   - **Confirmación Post-Pago en Página:** Al completar reporte manual (`Pago Móvil`, `Binance Pay`, `Zelle`), canje gratuito (`redeemFreePromo`) o confirmación automática de Binance (`checkBinanceStatus`), guarda `completedTransaction` en un signal y muestra tarjeta de confirmación con referencia, método, atleta, monto, estado (`PENDING_AUDIT` / `APPROVED`), botón `"Volver al Panel"` (`/dashboard`) y `"Registrar otro pago"`. Para **VexPay**, respalda en `sessionStorage` (`vexpay_pending_session`) y redirige a `res.checkoutUrl`.
3. **`src/app/features/dashboard/tutor-dashboard.component.ts` / `.html`**
   - Eliminar `CheckoutPagoMovilModalComponent`, `showCheckoutModal`, `selectedAthleteForCheckout`, `closeCheckoutModal`, `onPaymentReported`.
   - Actualizar `openCheckoutModal(athlete)` (o `goToCheckout(athlete)`) para navegar a `['/pagos', athlete.id]` vía `Router`.
   - Conservar el manejo de retorno VexPay (`?payment=vexpay_return` / `vexpay_cancelled`).
4. **`src/app/shared/components/navbar/navbar.component.html`**
   - Agregar `<a routerLink="/pagos" routerLinkActive="active" class="nav-link">Planes y Pagos</a>` dentro de `@if (authService.canAccessAthleteDashboard())`.
5. **`src/app/features/admin/payments/admin-payments.component.html`**
   - Actualizar las 3 menciones de `"modal de checkout"` a `"página de checkout"`.

---

## 6. Pruebas y Verificación
- **`checkout-page.component.spec.ts`:**
  - Carga autónoma con `:athleteId` en ruta, sin `:athleteId` (prioriza atleta inactivo), y estado vacío cuando no hay atletas.
  - Cambio de atleta desde el selector en cabecera.
  - Flujos de `Pago Móvil` (`amountVes`, `bcvRate`, `submitReport()` -> estado de confirmación `completedTransaction`), `Binance Pay`, `Zelle`, `VexPay` (`sessionStorage` + `redirectToCheckout`), y cupones (`applyCoupon`, `redeemFreeSubscription`).
- **`tutor-dashboard.component.spec.ts`:**
  - Verificar que `openCheckoutModal(athlete)` navega a `['/pagos', athlete.id]` mediante `Router.navigate`.
- **Compilación:** `npm run build` (browser + SSR) y `ng test`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear rama `feature/TS-83-checkout-pagina-dedicada` en `talentus-scout-fe`.
- [x] Paso 2: Crear `CheckoutPageComponent` (`.ts`, `.html`, `.css`) con layout de 2 columnas, carga autónoma, selector de atleta, 4 pasarelas, cupones y confirmación post-pago.
- [x] Paso 3: Configurar rutas `/pagos` y `/pagos/:athleteId` en `app.routes.ts` y enlace `"Planes y Pagos"` en `navbar.component.html`.
- [x] Paso 4: Actualizar `TutorDashboardComponent` (`.ts`, `.html`) para navegar a `/pagos/:athleteId`, eliminar `checkout-pago-movil-modal.component.*` y actualizar `admin-payments.component.html`.
- [x] Paso 5: Crear `checkout-page.component.spec.ts` y actualizar `tutor-dashboard.component.spec.ts`.
- [x] Paso 6: Ejecutar `ng test` y `npm run build` y verificar 100% en verde.
- [x] Paso 7: Documentar plan de pruebas en `test/TS-83-test-plan-checkout-pagina-dedicada.md`, marcar checkboxes en el plan, crear PR en `talentus-scout-fe`, commitear docs en `main` y mover tarjeta Trello a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Rutas `/pagos` y `/pagos/:athleteId` protegidas por `[authGuard, tutorGuard]` renderizando la página dedicada sin modal.
- [x] `CheckoutPagoMovilModalComponent` eliminado y acciones de pago en `TutorDashboardComponent` navegando a `/pagos/:athleteId`.
- [x] `NavbarComponent` incluye enlace `"Planes y Pagos"` (`/pagos`) para `TUTOR` y `ATHLETE`.
- [x] Resiliencia a `F5` en `/pagos/:athleteId` y selector de atleta funcional si el tutor tiene varios atletas.
- [x] Las 4 pasarelas y cupones funcionan en layout de 2 columnas responsive.
- [x] Confirmación post-pago visible en la misma página con `"Volver al Panel"`, manteniendo retorno VexPay en `/dashboard`.
- [x] Pruebas unitarias y compilación SSR/browser en verde.
