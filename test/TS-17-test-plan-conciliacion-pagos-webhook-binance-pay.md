# Plan y Reporte de Pruebas — [TS-17] Panel de Conciliación de Pagos para Administradores y Webhook Binance Pay

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-17]**, que implementa la pasarela cripto internacional con Binance Pay (USDT) con activación 100% instantánea vía Webhooks y el Panel Integral de Conciliación y Auditoría Contable con KPIs de recaudación e histórico paginado en `/admin/pagos`.

### 1.1. Artefactos y Componentes Impactados
* **Base de Datos & Modelo Relacional (PostgreSQL):**
  * Migración `20261010150000_add_binance_pay_columns.sql`.
  * Columnas agregadas a `payment_transactions`:
    * `gateway_order_id` (VARCHAR(100)) para vincular el merchantTradeNo / prepayId de Binance.
    * `raw_webhook_payload` (TEXT) para trazabilidad técnica y auditoría del webhook.
  * Índices de rendimiento: `idx_payment_tx_gateway_order`, `idx_payment_tx_method_status`.
* **Backend (Spring Boot 3 / Java 21 / Project Lombok):**
  * Entidad JPA `PaymentTransaction`: mapeo de `gatewayOrderId` y `rawWebhookPayload`.
  * DTOs Lombok con validación:
    * `CreateBinanceOrderRequest`, `CreateBinanceOrderResponse`, `BinanceWebhookPayload`, `BinanceWebhookResponse`, `AdminPaymentSummaryResponse`.
  * Repositorio `PaymentTransactionRepository`:
    * Métodos de búsqueda por `gatewayOrderId`, paginación por método/estado y consultas `@Query` de recaudación total en USD y VES (`sumApprovedUsd()`, `sumApprovedVes()`).
  * `BinancePayService`:
    * Generación de órdenes con TradeNo único (`TS-XXXXXXXXXXXX`) y prepayId.
    * Verificación de firma criptográfica HMAC-SHA512 con soporte sandbox/mock.
    * Procesamiento de webhooks con activación instantánea de `AthleteSubscription` (con extensión acumulativa si el atleta ya posee suscripción activa).
    * Idempotencia comprobada para evitar activaciones duplicadas ante reintentos de red de Binance.
    * Notificación transaccional por correo al tutor legal.
  * `AdminPaymentService`:
    * Cálculo de métricas agregadas (`getMetricsSummary()`).
    * Historial paginado con filtros multicriterio por método y estado (`getPaymentHistory()`).
  * Endpoints REST:
    * `POST /api/v1/payments/binance-pay/create-order` (Rol: `TUTOR`).
    * `POST /api/v1/payments/binance-pay/webhook` (Público, `permitAll()`).
    * `POST /api/v1/payments/binance-pay/mock-webhook` (Público para desarrollo/pruebas).
    * `GET /api/v1/payments/binance-pay/mock-checkout/{tradeNo}` (Página HTML informativa sandbox).
    * `GET /api/v1/admin/payments/summary` (Rol: `ADMIN`).
    * `GET /api/v1/admin/payments/history` (Rol: `ADMIN`).
* **Frontend (Angular 18+ / SSR):**
  * Modelos TypeScript en `payment.model.ts` (`CreateBinanceOrderRequest`, `CreateBinanceOrderResponse`, `AdminPaymentSummary`, `PaymentHistoryPage`).
  * Métodos en `payment.service.ts`: `createBinanceOrder`, `getAdminPaymentSummary`, `getAdminPaymentHistory`.
  * Componentes UI:
    * `CheckoutPagoMovilModalComponent`: selector dinámico de pestañas (🇻🇪 Pago Móvil vs 🟡 Binance Pay USDT), generación de órdenes, temporizador de 15 min, botón de apertura a Binance Pay y verificación en un clic.
    * `AdminPaymentsComponent`: rediseño con tarjetas Bento de KPIs (Recaudación USD, Recaudación VES, Cola de Conciliación, Total Transacciones), pestaña de pendientes con aprobación/rechazo en un clic y pestaña de historial contable paginado con filtros interactivos.
  * Directiva de Vocabulario: **Cero presencia de la palabra "LOPNNA"** en toda la interfaz de usuario.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests (Spring Boot)

Comandos ejecutados:
```bash
./mvnw test -Dtest=BinancePayServiceTest,PaymentServiceTest
./mvnw test -Dtest=PaymentControllerIntegrationTest
```

#### Resultados:
```
[INFO] Running com.talentus.scout.service.payment.BinancePayServiceTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 9.193 s -- in com.talentus.scout.service.payment.BinancePayServiceTest
[INFO] Running com.talentus.scout.service.payment.PaymentServiceTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.896 s -- in com.talentus.scout.service.payment.PaymentServiceTest
[INFO] Running com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 34.78 s -- in com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] 
[INFO] Results:
[INFO] Tests run: 14, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

#### Detalle de Casos de Prueba Verificados:
1. `BinancePayServiceTest`:
   * `createOrder_Success_GeneratesOrderAndPendingTransaction`: Valida generación de TradeNo, prepayId y registro en estado `PENDING_AUDIT`.
   * `createOrder_UnauthorizedTutor_ThrowsForbidden`: Impide que tutores no autorizados generen órdenes para atletas ajenos.
   * `handleWebhook_ValidSignatureAndSuccess_ActivatesSubscription`: Valida que el webhook con `PAY_SUCCESS` apruebe la orden y cree `AthleteSubscription` activa.
   * `handleWebhook_ExistingActiveSubscription_ExtendsEndDate`: Valida extensión acumulativa sin pérdida de días restantes.
   * `handleWebhook_InvalidSignature_ReturnsFail`: Rechaza webhooks con firmas inválidas en modo estricto.
2. `PaymentControllerIntegrationTest`:
   * `binancePay_CreateOrderAndWebhook_SuccessActivatesPro`: Valida el flujo HTTP de extremo a extremo: creación de orden vía endpoint seguro de tutor, confirmación por webhook público con firma y verificación inmediata del estado `ACTIVE` en la cédula del atleta.
   * `adminPayments_GetSummaryAndHistory_Success`: Valida la entrega correcta de KPIs agregados e histórico paginado para administradores.

### 2.2. Frontend Build & Compilación Angular SSR

Comando ejecutado:
```bash
npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` con 0 errores de TypeScript y plantillas).
* Generación del lazy chunk `admin-payments-component` (`33.96 kB` browser, `34.07 kB` server).
* Verificación con ripgrep de cero ocurrencias del acrónimo "LOPNNA" en archivos de frontend.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Creación de Orden Binance Pay (Tutor)
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/binance-pay/create-order \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY"
  }' | jq .
```
**Respuesta esperada:**
```json
{
  "transactionId": "b2ea54ae-795a-444d-b3b1-272d03e06a3d",
  "prepayId": "BINANCE-A1B2C3D4",
  "gatewayOrderId": "TS-1BA08BA56BAC",
  "checkoutUrl": "http://localhost:8080/api/v1/payments/binance-pay/mock-checkout/TS-1BA08BA56BAC",
  "qrContent": "binancepay://pay?tradeNo=TS-1BA08BA56BAC",
  "expireTime": 1775845000000,
  "amountUsd": 5.00,
  "currency": "USDT"
}
```

### 3.2. Simulación de Webhook de Confirmación de Pago Binance
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/binance-pay/mock-webhook \
  -H "Content-Type: application/json" \
  -H "BinancePay-Signature: mock-valid-sig" \
  -d '{
    "bizType": "PAY",
    "bizId": "TS-1BA08BA56BAC",
    "bizStatus": "PAY_SUCCESS"
  }' | jq .
```
**Respuesta esperada:**
```json
{
  "returnCode": "SUCCESS",
  "returnMessage": "Payment processed and subscription activated successfully"
}
```

### 3.3. Consulta de Resumen y KPIs Contables (Admin)
```bash
curl -s http://localhost:8080/api/v1/admin/payments/summary \
  -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
```
**Respuesta esperada:**
```json
{
  "totalRevenueUsd": 55.00,
  "totalRevenueVes": 227.50,
  "pendingAuditCount": 0,
  "approvedCount": 3,
  "rejectedCount": 0,
  "binancePayApprovedCount": 1,
  "pagoMovilApprovedCount": 2
}
```

### 3.4. Consulta de Historial Filtrado por Binance Pay (Admin)
```bash
curl -s "http://localhost:8080/api/v1/admin/payments/history?method=BINANCE_PAY" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **1. Generación de órdenes Binance Pay** | ✅ Cumplido | Endpoint `/create-order` genera orden con TradeNo y montos en USDT. |
| **2. Webhook Binance con verificación y activación instantánea** | ✅ Cumplido | Webhook con firma criptográfica activa instantáneamente `AthleteSubscription`. |
| **3. Panel Admin con KPIs de recaudación** | ✅ Cumplido | Tarjetas Bento con totales en USD y VES y conteos segregados por método. |
| **4. Pestaña de historial con filtros multicriterio** | ✅ Cumplido | Tabla paginada filtrable por método (Pago Móvil / Binance Pay) y estado. |
| **5. Modal de Checkout Multi-Pasarela** | ✅ Cumplido | Pestañas interactivas Pago Móvil vs Binance Pay con temporizador y link a pasarela. |
| **6. Cero uso de "LOPNNA" en interfaces** | ✅ Cumplido | Verificación exhaustiva con ripgrep sin coincidencias en componentes de pago. |
| **7. 100% de pruebas en verde y build limpio** | ✅ Cumplido | 14/14 tests backend pasados y `npm run build` generado en 23s sin errores. |

---

## 5. Casos Borde y Consideraciones Validadas

1. **Idempotencia de Webhook:** Si Binance Pay reenvía la notificación de éxito para una orden ya aprobada, el servicio responde `SUCCESS` ("Already processed") sin duplicar días ni crear registros redundantes.
2. **Extensión acumulativa:** Si un tutor renueva mediante Binance Pay antes de la expiración de su plan, la vigencia se suma a la fecha final actual del atleta.
3. **Resiliencia Sandbox/Producción:** La verificación de firma HMAC-SHA512 admite firmas mock en desarrollo sin bloquear las pruebas y valida firmas reales en producción.
