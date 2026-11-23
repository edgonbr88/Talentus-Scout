# Plan de Pruebas: [TS-83] Conversión de Sección de Pagos (Checkout) de Modal a Página Dedicada

**ID Tarea:** TS-83  
**Tarjeta Trello:** https://trello.com/c/9jOmcJzA  
**Fecha:** 2026-11-23  
**Plan de Implementación:** [TS-83-plan-checkout-pagina-dedicada.md](file:///home/edgar/Talentus%20Scout/plans/TS-83-plan-checkout-pagina-dedicada.md)

---

## 1. Alcance de Pruebas
- **Enrutamiento y Navegación (`talentus-scout-fe`):**
  - Rutas `/pagos` y `/pagos/:athleteId` en `app.routes.ts` protegidas por `[authGuard, tutorGuard]`.
  - Enlace `"Planes y Pagos"` en `NavbarComponent`.
  - Redirección a `/pagos/:athleteId` desde `TutorDashboardComponent` (eliminado `CheckoutPagoMovilModalComponent`).
- **Página de Checkout (`CheckoutPageComponent`):**
  - Carga autónoma de `getMyAthletes()`, `getPaymentConfig()` y `getBcvRate()`.
  - Selector de atleta en cabecera cuando el tutor tiene múltiples atletas.
  - Layout de 2 columnas con las 4 pasarelas (`VexPay`, `Pago Móvil`, `Binance Pay`, `Zelle`), selector de planes, cupones y confirmación post-pago en la misma página.

---

## 2. Pruebas Automatizadas Ejecutadas
- **Comando:**
  ```bash
  cd talentus-scout-fe && npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/features/payments/checkout-page.component.spec.ts" --include="src/app/features/dashboard/tutor-dashboard.component.spec.ts" && npm run build
  ```
- **Resultado:** `TOTAL: 45 SUCCESS` (**PASS** — 6 tests en `checkout-page.component.spec.ts` + 39 tests en `tutor-dashboard.component.spec.ts`) y `npm run build` (browser + SSR) exitoso.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso
1. Iniciar sesión como `TUTOR` o `ATHLETE` (+18).
2. Verificar en el menú superior el enlace **Planes y Pagos** (`/pagos`).
3. Desde `/dashboard`, hacer clic en **⚡ Activar Plan Pro** o **Renovar Pro** en la tarjeta de un atleta: confirmar navegación a `/pagos/:athleteId` sin modal superpuesto.
4. Presionar `F5` en `/pagos/:athleteId` y verificar que la página carga los datos del atleta, planes, pasarelas y tasa BCV.
5. Si el tutor tiene más de 1 atleta, cambiar el atleta desde el selector en la cabecera.
6. Probar las pestañas `VexPay`, `Pago Móvil`, `Binance Pay` y `Zelle`, aplicar un cupón, y verificar que el resumen lateral sticky actualiza los totales en USD/VES.
7. Reportar un pago manual (ej. Pago Móvil) o canjear un cupón 100% bonificado y confirmar que aparece la tarjeta de confirmación con botón **Volver al Panel**.

---

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] Rutas `/pagos` y `/pagos/:athleteId` protegidas por `[authGuard, tutorGuard]` renderizando la página dedicada.
- [x] `CheckoutPagoMovilModalComponent` eliminado y acciones de pago en `TutorDashboardComponent` navegando a `/pagos/:athleteId`.
- [x] `NavbarComponent` incluye enlace `"Planes y Pagos"` (`/pagos`) para `TUTOR` y `ATHLETE`.
- [x] Resiliencia a `F5` en `/pagos/:athleteId` y selector de atleta funcional.
- [x] Las 4 pasarelas y cupones funcionan en layout de 2 columnas responsive.
- [x] Confirmación post-pago visible en la misma página con `"Volver al Panel"`, manteniendo retorno VexPay en `/dashboard`.

---

## 5. Casos Borde y Validaciones Críticas
- **Usuario sin atletas registrados:** Muestra estado vacío guiado con botón `"Ir al Panel"`.
- **LOPNNA Art. 65:** Protegido por `[authGuard, tutorGuard]` y validaciones de propiedad en backend (`PaymentController`).
