# Plan de Pruebas y Validación — [TS-78] Integración de VexPay como Pasarela de Pago Automatizada

- **Tarjeta Trello:** `[TS-78] Integración de VexPay como Pasarela de Pago Automatizada` (`https://trello.com/c/Pxs2sihN`)
- **Plan de Implementación:** [`plans/TS-78-plan-integracion-pasarela-pagos-vexpay.md`](../plans/TS-78-plan-integracion-pasarela-pagos-vexpay.md)
- **Pull Requests Generados:**
  - `talentus-scout-migrations`: https://github.com/edgonbr88/talentus-scout-migrations/pull/7
  - `talentus-scout-be`: https://github.com/edgonbr88/talentus-scout-be/pull/10
  - `talentus-scout-fe`: https://github.com/edgonbr88/talentus-scout-fe/pull/11

---

## 1. Alcance de las Pruebas

### 1.1 Base de Datos (`talentus-scout-migrations`, PostgreSQL local únicamente)
- Migración: `migrations/20261117225500_add_vexpay_payment_support.sql`
- Esquema actualizado: `schema.sql`
- Cambios validados:
  - Valores enum: `VEXPAY` en `payment_method`; `PENDING_GATEWAY` y `REVERSED` en `payment_status`.
  - Columnas en `payment_transactions`: `vexpay_session_id`, `vexpay_payment_id`, `vexpay_sub_method`, `applied_subscription_id`, `previous_subscription_end_date` + índice `idx_payment_transactions_vexpay_session_id`.
  - Tabla `vexpay_webhook_events` (`event_id`, `event_type`, `session_id`, `payment_id`, `processed_at`, `raw_payload`).
  - Columna `vexpay_enabled` (default `true`) en `payment_gateway_settings`.

### 1.2 Backend (`talentus-scout-be`, Spring Boot 3 / Java 21)
- **Configuración & Seguridad:** `VexPayProperties.java`, `application.yml`, `application-prod.yml`, `SecurityConfig.java` (`.permitAll()` en `POST /api/v1/payments/vexpay/webhook`), `TalentusScoutBeApplication.java` (`@EnableScheduling`).
- **Dominio & Repositorios:** `PaymentMethod`, `PaymentStatus`, `PaymentTransaction`, `PaymentGatewaySetting`, `VexPayWebhookEvent`, `PaymentTransactionRepository`, `DiscountCodeRedemptionRepository`, `VexPayWebhookEventRepository`.
- **DTOs & Excepciones:** `VexPayQuoteResponse`, `CreateVexPaySessionRequest`, `CreateVexPaySessionResponse`, `VexPaySessionVerifyResponse`, `VexPayReconciliationResponse`, `PaymentConfigResponse`, `PaymentGatewaySettingsDto`, `UpdatePaymentGatewaySettingsRequest`, `AdminPaymentSummaryResponse`, `PaymentTransactionResponse`, `VexPayApiException` y `GlobalExceptionHandler` (RFC 7807 `ProblemDetail`).
- **Servicios & Schedulers:** `VexPayService`, `VexPayReconciliationScheduler`, `PaymentConfigService`, `PaymentService`, `AdminPaymentService`, `EmailService`.
- **Controladores:** `PaymentController` (`/vexpay/quote`, `/vexpay/checkout-session`, `/vexpay/sessions/{sessionId}/verify`, `/vexpay/webhook`) y `AdminPaymentController` (`/vexpay/reconcile`).

### 1.3 Frontend (`talentus-scout-fe`, Angular 18+)
- **Modelos y Servicio HTTP:** `src/app/core/models/payment.model.ts`, `src/app/core/services/payment.service.ts`.
- **Checkout Modal:** `CheckoutPagoMovilModalComponent` (`.ts`, `.html`, `.css`, `.spec.ts`) — pestaña `VEXPAY`, cotización vía `GET /api/v1/payments/vexpay/quote`, soporte de cupones, creación de sesión y redirección a `checkoutUrl` con respaldo en `sessionStorage`.
- **Dashboard de Retorno:** `TutorDashboardComponent` (`.ts`, `.html`, `.spec.ts`) — lectura de `payment=vexpay_return` / `payment=vexpay_cancelled`, verificación activa contra `POST /api/v1/payments/vexpay/sessions/{sessionId}/verify`, banners y re-consulta manual.
- **Panel Administrativo de Pagos:** `AdminPaymentsComponent` (`.ts`, `.html`, `.css`, `.spec.ts`) — KPI de aprobados `VEXPAY`, filtros `VEXPAY` / `PENDING_GATEWAY` / `REVERSED`, chips/badges de estado, tarjeta Bento de configuración ON/OFF `vexpayEnabled` (sin campos de secreto en cliente) y botón de conciliación manual.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1 Migraciones (`dbmate` en PostgreSQL Local)
- **Entorno:** Contenedor local `talentus-postgres-dev` (`localhost:5432`, base `talentus_scout_dev`). *No se ejecutó ningún comando contra Neon.*
- **Comandos ejecutados y resultado:**
  - `dbmate up` -> Migración `20261117225500_add_vexpay_payment_support.sql` aplicada sin errores.
  - Dump `schema.sql` mediante `amacneil/dbmate:latest dump` -> `schema.sql` sincronizado y validado con `git diff`.

### 2.2 Pruebas Backend (`./mvnw test`)
- **Suite focalizada de Pagos y VexPay (después de todos los cambios BE):**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest="*Payment*,*VexPay*,*Bcv*,*Binance*,*Discount*"
  ```
  - **Resultado observado:** `Tests run: 66, Failures: 0, Errors: 0, Skipped: 0` (`BUILD SUCCESS`).
  - Desglose por clase:
    - `PaymentControllerIntegrationTest`: 13/13 exitosas
    - `VexPayControllerIntegrationTest`: 4/4 exitosas
    - `AdminPaymentGatewayConfigControllerTest`: 8/8 exitosas
    - `AdminDiscountCodeControllerTest`: 6/6 exitosas
    - `BinancePayServiceTest`: 5/5 exitosas
    - `VexPayServiceTest`: 9/9 exitosas
    - `BcvRateServiceTest`: 3/3 exitosas
    - `DiscountCodeServiceTest`: 9/9 exitosas
    - `PaymentServiceTest`: 6/6 exitosas
    - `AdminPaymentServiceTest`: 3/3 exitosas
- **Nota sobre suite completa backend (`./mvnw test`):** En la ejecución previa de toda la suite, las clases de pagos y VexPay aprobaron en su totalidad; únicamente fallaron 3 pruebas preexistentes en `RegisterTutorTest` por requerimiento `@NotNull selfieFile` introducido previamente en `RegisterTutorRequest` (TS-67, fuera del alcance de TS-78).

### 2.3 Pruebas Frontend y Build (`npm test` / `npm run build`)
- **Suite focalizada de Checkout, Dashboard de Retorno y Admin Pagos (después de todas las ediciones FE):**
  ```bash
  cd talentus-scout-fe && npm test -- \
    --include src/app/features/payments/checkout-pago-movil-modal.component.spec.ts \
    --include src/app/features/admin/payments/admin-payments.component.spec.ts \
    --include src/app/features/dashboard/tutor-dashboard.component.spec.ts \
    --watch=false
  ```
  - **Resultado observado:** `Executed 64 of 64 SUCCESS`, `TOTAL: 64 SUCCESS` (código de salida `0`).
  - Casos TS-78 cubiertos en estas specs:
    - `checkout-pago-movil-modal.component.spec.ts`: consulta de cotización oficial VexPay al activar pestaña `VEXPAY`; creación de sesión VexPay, respaldo en `sessionStorage` y redirección a `checkoutUrl`.
    - `tutor-dashboard.component.spec.ts`: verificación de sesión VexPay al retornar mostrando banner `ACTIVATED` (`Pago VexPay Confirmado`); estado `PENDING` (`En verificación bancaria`) con botón `"Verificar nuevamente"` (`authServiceMock` actualizado con `isAthlete: signal(false)`).
    - `admin-payments.component.spec.ts`: renderización de tarjeta VexPay y toggle `vexpayEnabled`; ejecución de conciliación manual VexPay desde pestaña `HISTORY`.
- **Build de producción SSR Angular:**
  ```bash
  cd talentus-scout-fe && npm run build
  ```
  - **Resultado observado:** Código de salida `0`. Generación completa en `36.413 seconds` con prerenderizado de `21 static routes`.
  - Advertencia no bloqueante observada: `admin-payments.component.css exceeded maximum budget. Budget 20.48 kB was not met by 5.08 kB with a total of 25.57 kB.`
- **Nota sobre suite completa frontend (`npm test -- --watch=false`):** Antes de corregir `authServiceMock` en `tutor-dashboard.component.spec.ts`, existían fallos preexistentes en `RegisterAthleteComponent` spec (por falta de `ActivatedRoute` en su TestBed, fuera del alcance de TS-78).

---

## 3. Guía de Verificación Manual Paso a Paso

### Pre-requisitos Locales (Variables de Entorno en `.env` / Shell — no versionar secretos)
Configurar las credenciales de prueba desde `docs/_keys_and_pass.txt` sin comprometer archivos versionados:
```bash
export VEXPAY_API_URL=https://api.vexpay.app
export VEXPAY_API_KEY="<VEXPAY_TEST_API_KEY_DESDE_docs/_keys_and_pass.txt>"
export VEXPAY_WEBHOOK_SECRET="<SECRET_HMAC_PRUEBA_LOCAL>"
export VEXPAY_LIVEMODE=false
```

### Paso 1: Consultar Configuración Pública y Cotización Oficial VexPay
```bash
# Configuración de pasarelas (sin secretos)
curl -s http://localhost:8080/api/v1/payments/config | jq

# Cotización oficial VexPay para Plan Pro (opcionalmente con ?discountCode=BECA50&athleteId=<UUID>)
curl -s "http://localhost:8080/api/v1/payments/vexpay/quote?planId=PRO_MONTHLY" \
  -H "Authorization: Bearer <TOKEN_TUTOR_O_ATHLETE>" | jq
```
- **Resultado esperado:** HTTP `200`, campo `vexpayEnabled: true`, `vexpayConfigured: true` en `/config`; y en `/vexpay/quote`: `usdAmount`, `rate`, `rateSource` (`"BCV"` o `"MARKET"`), `bcvRate`, `vesAmount`, `fetchedAt`.

### Paso 2: Crear Sesión de Checkout VexPay
```bash
curl -i -X POST http://localhost:8080/api/v1/payments/vexpay/checkout-session \
  -H "Authorization: Bearer <TOKEN_TUTOR_O_ATHLETE>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<UUID_ATLETA>",
    "planId": "PRO_MONTHLY"
  }'
```
- **Resultado esperado:** HTTP `201 Created` con `checkoutUrl`, `sessionId` (`cs_...`), `transactionId`, `amountUsd`, `expiresAt`, `livemode`, `status`.
- **Verificación en BD:** La fila creada en `payment_transactions` queda con `method = 'VEXPAY'`, `status = 'PENDING_GATEWAY'`, `vexpay_session_id = '<cs_...>'`. No aparece en `GET /api/v1/admin/payments/pending`.

### Paso 3: Simular Webhook `payment.completed` y `payment.reversed` Firmado (HMAC-SHA256)
```bash
# Generar timestamp, body y firma HMAC-SHA256(<t>.<rawBody>)
TS=$(date +%s)
BODY='{"event":"payment.completed","sessionId":"cs_test_123","paymentId":"pay_test_123","payment":{"id":"pay_test_123","method":"pago_movil","status":"completed"}}'
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$VEXPAY_WEBHOOK_SECRET" -hex | awk '{print $2}')

curl -i -X POST http://localhost:8080/api/v1/payments/vexpay/webhook \
  -H "Content-Type: application/json" \
  -H "VexPay-Signature: t=$TS,v1=$SIG" \
  -H "VexPay-Event-Id: evt_test_completed_001" \
  -d "$BODY"
```
- **Resultado esperado:**
  - HTTP `200`, transacción pasa a `APPROVED`, `athlete_subscriptions` queda en `ACTIVE` y el evento se registra en `vexpay_webhook_events`.
  - Repetir el mismo `curl` con igual `VexPay-Event-Id`: responde `200` idempotente sin duplicar suscripción ni extender nuevamente.
  - Enviar con firma alterada o timestamp > 300s: responde `401` (`ProblemDetail` RFC 7807).
  - Enviar evento `payment.reversed`: transacción pasa a `REVERSED`, suscripción vinculada se revoca o restaura a `previous_subscription_end_date`, y el admin panel excluye su monto de los ingresos aprobados.

### Paso 4: Verificación Activa al Retornar del Checkout y Conciliación Admin
```bash
# Retorno desde VexPay hacia /dashboard?payment=vexpay_return&session_id=<cs_...>
curl -s -X POST "http://localhost:8080/api/v1/payments/vexpay/sessions/<cs_...>/verify" \
  -H "Authorization: Bearer <TOKEN_TUTOR_O_ATHLETE>" | jq

# Conciliación manual desde /admin/pagos (solo ROLE_ADMIN)
curl -s -X POST http://localhost:8080/api/v1/admin/payments/vexpay/reconcile \
  -H "Authorization: Bearer <TOKEN_ADMIN>" | jq
```

### Paso 5: Verificación de Flujo UI End-to-End (`http://localhost:4200`)
1. Ingresar como `TUTOR` o `ATHLETE` (>=18) y abrir el modal **Activar Plan Pro**.
2. Seleccionar la pestaña **VexPay (Automático)** -> validar que carga la cotización en Bs., tasa VexPay y cálculo con cupón si se aplica uno.
3. Pulsar **Ir a Pagar con VexPay** -> verificar creación de sesión y redirección al checkout alojado.
4. Simular retorno `/dashboard?payment=vexpay_return&session_id=<cs_...>` -> verificar banner de estado (`Pago VexPay Confirmado` o `En verificación bancaria` con botón `Verificar nuevamente`) y limpieza de query params.
5. Ingresar como `ADMIN` a `/admin/pagos`:
   - En **Historial General**, comprobar KPI de pagos VexPay, filtros `VEXPAY`, `PENDING_GATEWAY`, `REVERSED`, y botón `↻ Conciliar VexPay`.
   - En **⚙️ Cuentas de Cobro**, comprobar tarjeta Bento **VexPay (Pasarela Automatizada)** con estado de clave en servidor y toggle ON/OFF operativo.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio (DoD) | Estado | Evidencia |
|---|---|---|
| Migración `dbmate` ejecutada y validada exclusivamente en PostgreSQL local (nunca Neon) | Cumplido | `20261117225500_add_vexpay_payment_support.sql` + `schema.sql` verificados en `talentus-postgres-dev` (PR #7) |
| Roles `TUTOR`, `ATHLETE` y `ADMIN` consultan `GET /v1/quote` (con cupones) y crean sesión en checkout | Cumplido | `VexPayServiceTest`, `VexPayControllerIntegrationTest`, `checkout-pago-movil-modal.component.spec.ts` |
| Pago Móvil manual (`BcvRateService`), Binance Pay y Zelle sin regresiones | Cumplido | `PaymentControllerIntegrationTest` (13/13), `BcvRateServiceTest` (3/3), `BinancePayServiceTest` (5/5), `PaymentServiceTest` (6/6) |
| Webhook valida `VexPay-Signature` HMAC-SHA256 con tolerancia y deduplica por `VexPay-Event-Id` | Cumplido | `VexPayServiceTest` (firma inválida/expirada, replay idempotente) y `VexPayControllerIntegrationTest` |
| `payment.reversed` marca `REVERSED`, revoca/restaura suscripción y excluye ingreso aprobado | Cumplido | `VexPayServiceTest` (restauración de fecha previa y cancelación de suscripción nueva) + `AdminPaymentSummaryResponse` |
| Retorno checkout ejecuta verificación activa contra backend; scheduler y botón admin concilian `PENDING_GATEWAY` | Cumplido | `VexPayReconciliationScheduler`, `POST /sessions/{id}/verify`, `POST /vexpay/reconcile`, `tutor-dashboard.component.spec.ts` |
| Sesiones `PENDING_GATEWAY` abandonadas no aparecen en cola manual `PENDING_AUDIT` | Cumplido | Queries de `PaymentTransactionRepository` e `AdminPaymentService` acotadas a `PENDING_AUDIT` |
| Admin alterna `vexpayEnabled`, filtra `VEXPAY`/`REVERSED` y lanza conciliación manual | Cumplido | `AdminPaymentGatewayConfigControllerTest` (8/8) y `admin-payments.component.spec.ts` |
| Pruebas de pagos/VexPay BE (`66/66`), specs FE modificadas (`64/64`) y `ng build` en verde | Cumplido | `./mvnw test -Dtest="*Payment*,*VexPay*,..."` = `66/66`; Karma `64/64`; `npm run build` exit code `0` |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Seguridad de Credenciales:** VexPay API Key (`VEXPAY_API_KEY`) y secreto de webhook (`VEXPAY_WEBHOOK_SECRET`) residen únicamente en variables de entorno del backend; nunca viajan en `PaymentConfigResponse`, `PaymentGatewaySettingsDto` ni en el frontend.
2. **Detección de `livemode`:** `VexPayProperties.isEffectiveLivemode()` reconoce prefijos `vk_live_`/`vk_test_` y respalda con `VEXPAY_LIVEMODE` cuando la API key es hexadecimal sin prefijo (como la credencial sandbox de pruebas).
3. **Omisión intencional de `methods` en `POST /v1/checkout/sessions`:** Al crear sesión se omite el campo `methods` para evitar errores 400 con `vpos` deshabilitado y habilitar todos los métodos activos de la cuenta VexPay (`c2p`, `pago_movil`, `usdt`, `usdc`, `cop`).
4. **Cuerpo Crudo en Webhook:** `PaymentController#handleVexPayWebhook` recibe `@RequestBody String rawBody` intacto antes de deserializar JSON para que el cálculo `HMAC-SHA256(<t>.<rawBody>)` coincida byte a byte con VexPay.
5. **Reversión tras Extensión vs. Nueva Suscripción:** Si un pago confirmado había extendido una suscripción activa existente, `payment_transactions.previous_subscription_end_date` conserva la fecha previa para restaurarla ante un eventual `payment.reversed`, evitando cancelar meses pagados previamente.
6. **Manejo de Errores VexPay (RFC 7807):** Errores HTTP de VexPay (`400`, `401`, `409`, `502/503`) se capturan en `VexPayApiException` y retornan `ProblemDetail` descriptivo sin exponer cabeceras ni secretos.
