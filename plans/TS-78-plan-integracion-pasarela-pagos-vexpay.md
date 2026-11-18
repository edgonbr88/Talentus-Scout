# Plan de Implementación: [TS-78] Integración de VexPay como Pasarela de Pago Automatizada (Checkout Alojado, Webhooks y Conciliación Proactiva)

**ID Tarea:** TS-78  
**Tarjeta Trello:** [https://trello.com/c/Pxs2sihN](https://trello.com/c/Pxs2sihN)  
**Fecha:** 2026-11-17  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  Actualmente Talentus Scout soporta pagos manuales con conciliación administrativa (`PAGO_MOVIL`, `BINANCE_PAY`, `ZELLE`) y un flujo sandbox de Binance Pay. Para escalar la monetización sin fricción y reducir la carga operativa de auditoría manual, se requiere integrar **VexPay** (`https://api.vexpay.app`, documentación oficial en `https://docs.vexpay.app/es/integration-path`) mediante **Checkout Alojado (`POST /v1/checkout/sessions`)**.
- **Valor aportado:**
  - Con una sola integración de Checkout Alojado, tutores y atletas mayores de edad pueden pagar con confirmación automatizada por **Pago Móvil automático**, **Débito Inmediato (C2P)**, **USDT/USDC** y **pesos colombianos (COP: Bre-B, Nequi, Daviplata)** según los canales activos en la cuenta VexPay *(nota: `vpos` con tarjetas está deshabilitado temporalmente por VexPay con HTTP 400; omitir el parámetro `methods` delega la lista habilitada al tenant)*.
  - Cotización oficial en tiempo real desde `GET /v1/quote` dentro de la pestaña VexPay del modal de checkout, manteniendo `BcvRateService` intacto para Pago Móvil manual y validación de cupones.
  - Confirmación e idempotencia criptográfica vía webhooks firmados (`VexPay-Signature` + `VexPay-Event-Id`), verificación activa en el retorno del navegador (`POST /api/v1/payments/vexpay/sessions/{sessionId}/verify`) y conciliación proactiva automática (`@Scheduled` + botón admin manual) para compensar la política de entrega única de webhooks de VexPay.
  - Manejo completo de reversos (`payment.reversed`) con revocación/reversión automática de vigencia en `athlete_subscriptions` y exclusión del monto aprobado en las métricas administrativas.
- **Restricciones legales y de seguridad (LOPNNA Art. 65 / FIFA RETJ):**
  - Acceso limitado exclusivamente a representantes legales (`ROLE_TUTOR`), atletas mayores de edad autónomos (`ROLE_ATHLETE`, ≥ 18 años) y administradores (`ROLE_ADMIN`).
  - Cero captura o almacenamiento de datos bancarios sensibles o tarjetas en Talentus Scout (el cobro ocurre íntegramente en `pay.vexpay.app`).
  - Credenciales privadas (`VEXPAY_API_KEY`, `VEXPAY_WEBHOOK_SECRET`) alojadas estrictamente en el servidor vía variables de entorno; nunca se exponen en el frontend ni se versionan en Git.

---

## 2. Alcance Técnico y Arquitectura
- **Repositorios impactados:**
  1. `talentus-scout-migrations`: Nueva migración `dbmate` y actualización de `schema.sql` (ejecución exclusiva en PostgreSQL local; **prohibido ejecutar en Neon**).
  2. `talentus-scout-be`: Configuración de propiedades VexPay, entidades/enums/repositorios JPA, `VexPayService`, `VexPayReconciliationScheduler`, endpoints REST en `PaymentController` y `AdminPaymentController`, actualización de `PaymentConfigService` y `AdminPaymentService`, soporte RFC 7807 (`ProblemDetail`) en `GlobalExceptionHandler` y envío de correos en `EmailService`.
  3. `talentus-scout-fe`: Modelos/servicios en `payment.model.ts` y `payment.service.ts`, pestaña VexPay en `CheckoutPagoMovilModalComponent`, manejo de retorno del checkout en `TutorDashboardComponent`, y tarjeta de configuración + conciliación + filtros en `AdminPaymentsComponent`.
- **Dependencias:** `TS-16`, `TS-17`, `TS-23`, `TS-58`, `TS-66`, `TS-69`.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL Local / `dbmate`)
- **Archivo a crear:** `talentus-scout-migrations/migrations/20261117225500_add_vexpay_payment_support.sql`
- **Directiva crítica:** Ejecutar `dbmate` **exclusivamente** contra la instancia local `talentus-postgres-dev` (`localhost:5432/talentus_scout_dev`). Nunca ejecutar en Neon.

```sql
-- migrate:up
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'VEXPAY';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'PENDING_GATEWAY';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'REVERSED';

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS vexpay_session_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS vexpay_payment_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS vexpay_sub_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS applied_subscription_id UUID REFERENCES athlete_subscriptions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS previous_subscription_end_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_payment_tx_vexpay_session ON payment_transactions(vexpay_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_vexpay_payment ON payment_transactions(vexpay_payment_id);

CREATE TABLE IF NOT EXISTS vexpay_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    event_id VARCHAR(120) UNIQUE NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    livemode BOOLEAN NOT NULL DEFAULT FALSE,
    payload TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payment_gateway_settings
    ADD COLUMN IF NOT EXISTS vexpay_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE payment_gateway_settings
SET vexpay_enabled = TRUE
WHERE vexpay_enabled IS NULL;

-- migrate:down
ALTER TABLE payment_gateway_settings
    DROP COLUMN IF EXISTS vexpay_enabled;

DROP TABLE IF EXISTS vexpay_webhook_events;

DROP INDEX IF EXISTS idx_payment_tx_vexpay_payment;
DROP INDEX IF EXISTS idx_payment_tx_vexpay_session;

ALTER TABLE payment_transactions
    DROP COLUMN IF EXISTS previous_subscription_end_date,
    DROP COLUMN IF EXISTS applied_subscription_id,
    DROP COLUMN IF EXISTS vexpay_sub_method,
    DROP COLUMN IF EXISTS vexpay_payment_id,
    DROP COLUMN IF EXISTS vexpay_session_id;
```

---

## 4. Backend: Spring Boot 3 (Java 21 / Lombok)

### 4.1. Configuración (`application.yml` / `application-prod.yml` / `VexPayProperties.java`)
- **Rutas:**
  - `src/main/resources/application.yml` y `src/main/resources/application-prod.yml`
  - `src/main/java/com/talentus/scout/config/VexPayProperties.java` (`@ConfigurationProperties(prefix = "talentus.payments.vexpay")`, `@Getter`, `@Setter`)
  - Habilitar `@EnableScheduling` en `TalentusScoutBeApplication.java`.
- **Variables de entorno (sin secretos hardcodeados en el repositorio):**
  - `VEXPAY_API_URL` (default `https://api.vexpay.app`)
  - `VEXPAY_API_KEY` (default `""`)
  - `VEXPAY_WEBHOOK_SECRET` (default `""`)
  - `VEXPAY_WEBHOOK_TOLERANCE_SECONDS` (default `300`)
  - `VEXPAY_SUCCESS_URL` (default `${FRONTEND_BASE_URL:http://localhost}/dashboard?payment=vexpay_return`)
  - `VEXPAY_CANCEL_URL` (default `${FRONTEND_BASE_URL:http://localhost}/dashboard?payment=vexpay_cancelled`)
  - `VEXPAY_RECONCILE_ENABLED` (default `true`)
  - `VEXPAY_RECONCILE_INTERVAL_MS` (default `300000`)
  - `VEXPAY_RECONCILE_LOOKBACK_HOURS` (default `48`)
  - `VEXPAY_LIVEMODE` (opcional/fallback si la clave no usa prefijo `vk_live_`/`vk_test_`; adicionalmente se detecta vía `GET /v1/payment-methods` cacheado si está configurada la clave).

### 4.2. Dominio y Repositorios
- **`PaymentMethod.java`**: Añadir `VEXPAY`.
- **`PaymentStatus.java`**: Añadir `PENDING_GATEWAY`, `REVERSED`.
- **`PaymentTransaction.java`**: Añadir `vexpaySessionId`, `vexpayPaymentId`, `vexpaySubMethod`, `appliedSubscriptionId`, `previousSubscriptionEndDate`.
- **`PaymentGatewaySetting.java`**: Añadir `vexpayEnabled` (`@Builder.Default private Boolean vexpayEnabled = true;`).
- **`VexPayWebhookEvent.java`** (Nueva entidad con `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@UuidGenerator(style = VERSION_7)`).
- **`VexPayWebhookEventRepository.java`** (Nuevo repositorio con `boolean existsByEventId(String eventId);`).
- **`PaymentTransactionRepository.java`**:
  - `Optional<PaymentTransaction> findByVexpaySessionId(String vexpaySessionId);`
  - `Optional<PaymentTransaction> findByVexpayPaymentId(String vexpayPaymentId);`
  - `List<PaymentTransaction> findByMethodAndStatusAndCreatedAtAfterOrderByCreatedAtAsc(PaymentMethod method, PaymentStatus status, Instant after);`
  - Verificar que `sumApprovedUsd()` y `sumApprovedVes()` filtran `pt.status = 'APPROVED'` (excluyendo `REVERSED`, `PENDING_GATEWAY`, `REJECTED`).
- **`AdminPaymentService.java`**:
  - `getMetricsSummary()`: Incluir `vexpayApprovedCount` y `reversedCount`.
  - `getPendingPayments()`: Continúa consultando únicamente `PaymentStatus.PENDING_AUDIT`, aislando `PENDING_GATEWAY`.

### 4.3. Seguridad y Excepciones RFC 7807
- **`SecurityConfig.java`**: Permitir acceso público sin JWT en `/api/v1/payments/vexpay/webhook`.
- **`VexPayApiException.java`** (`com.talentus.scout.exception`): Excepción de dominio con `HttpStatus status`, `String errorCode`, `String message`.
- **`GlobalExceptionHandler.java`**: Manejar `VexPayApiException` devolviendo `ResponseEntity<ProblemDetail>` (RFC 7807) con `title`, `detail`, `status`, `errorCode` y `message`.

### 4.4. DTOs (Lombok obligatorio)
- `VexPayQuoteResponse.java`
- `CreateVexPaySessionRequest.java` (`@NotNull UUID athleteId`, `@NotBlank String planId`, `String discountCode`)
- `CreateVexPaySessionResponse.java` (`checkoutUrl`, `sessionId`, `transactionId`, `amountUsd`, `expiresAt`, `livemode`, `status`)
- `VexPaySessionVerifyResponse.java` (`transactionId`, `sessionId`, `sessionStatus`, `transactionStatus`, `paymentId`, `subMethod`, `athleteId`, `athleteName`, `planName`, `activated`, `message`)
- `VexPayReconciliationResponse.java` (`checkedCount`, `approvedCount`, `rejectedCount`, `stillPendingCount`, `errorCount`, `executedAt`)
- Actualizar `PaymentConfigResponse.java` (`vexpayEnabled`, `vexpayConfigured`)
- Actualizar `PaymentGatewaySettingsDto.java` (`vexpayEnabled`, `vexpayConfigured`, `vexpayLivemode`)
- Actualizar `UpdatePaymentGatewaySettingsRequest.java` (`vexpayEnabled`)
- Actualizar `AdminPaymentSummaryResponse.java` (`vexpayApprovedCount`, `reversedCount`)
- Actualizar `PaymentTransactionResponse.java` (`vexpaySessionId`, `vexpayPaymentId`, `vexpaySubMethod`)

### 4.5. Servicio Principal `VexPayService.java` y Scheduler
1. **Cotización (`getQuote`)**:
   - Acepta `usdAmount` directo o `planId` + `discountCode` opcional.
   - Si viene `planId` + `discountCode`, aplica el cálculo real de descuento (via `DiscountCodeService`) para cotizar exactamente el monto USD final en VexPay.
   - Llama `GET {apiUrl}/v1/quote?usdAmount=...` enviando header `x-api-key`.
   - Mapea `usdAmount`, `rate`, `rateSource` (`BCV` | `MARKET`), `bcvRate`, `vesAmount`, `medianRate`, `medianVesAmount`, `fetchedAt`.
2. **Creación de Sesión (`createCheckoutSession`)**:
   - Valida que `vexpayEnabled == true` en `PaymentGatewaySetting` y que `VEXPAY_API_KEY` esté configurada.
   - Valida existencia y propiedad del atleta (`athlete.getTutor().getId().equals(userId)` o rol `ADMIN`).
   - Valida plan activo y descuento (`discountCode` opcional). Si `effectiveAmountUsd <= 0`, rechaza indicando usar la redención gratuita (`/coupons/redeem-free`).
   - Crea `PaymentTransaction` con `method = PaymentMethod.VEXPAY`, `status = PaymentStatus.PENDING_GATEWAY`, `referenceNumber = "VP-" + txId`, `amountUsd = effectiveAmountUsd` (sin consumir todavía `DiscountCodeRedemption` hasta confirmar pago).
   - Construye `successUrl` añadiendo `?payment=vexpay_return&txId=<txId>` (o `&txId=` si ya tiene `?`) y `cancelUrl` añadiendo `txId=<txId>`.
   - Llama `POST {apiUrl}/v1/checkout/sessions` con header `x-api-key` e `Idempotency-Key: vexpay-session-<txId>`, body `{ amountUsd, description, reference: txId, successUrl, cancelUrl, metadata: { transactionId, athleteId, planId } }` **omitiendo `methods`**.
   - Almacena `vexpaySessionId` en `PaymentTransaction` y mapea errores HTTP (`401`, `403 live_mode_not_activated`, `409 payout_account_required`, `422`, `503 rate_unavailable`) a `VexPayApiException` (`ProblemDetail`).
3. **Procesamiento de Webhooks (`handleWebhook`)**:
   - Verifica `VexPay-Signature` (`t=<unix>,v1=<hex>`) computando `HMAC-SHA256("<t>." + rawBody, webhookSecret)` con comparación en tiempo constante (`MessageDigest.isEqual`) y tolerancia temporal (`|nowEpoch - t| <= toleranceSeconds`). Rechaza con `400/401` si falta, es inválida o expiró.
   - Verifica idempotencia mediante `VexPay-Event-Id` en `vexpay_webhook_events` (`existsByEventId`). Si ya existe, retorna `200 OK` inmediatamente sin duplicar efectos.
   - Localiza `PaymentTransaction` por `data.checkoutSession.reference` (UUID), `data.checkoutSession.id` (`vexpaySessionId`) o `data.paymentId` (`vexpayPaymentId`).
   - Guarda registro en `vexpay_webhook_events`.
   - Despacha por `event`:
     - `payment.pending`: registra `vexpayPaymentId`, `vexpaySubMethod` (`data.method`) y `rawWebhookPayload`.
     - `payment.completed`: transición idempotente a `PaymentStatus.APPROVED` (si no estaba ya `APPROVED` ni `REVERSED`), guarda `vexpayPaymentId`, `vexpaySubMethod`, `amountVes`, `bcvExchangeRate`, registra `DiscountCodeRedemption` si aplica, activa o extiende `athlete_subscriptions` registrando `appliedSubscriptionId` y `previousSubscriptionEndDate`, y envía correo vía `EmailService.sendPaymentStatusNotification(...)`.
     - `payment.failed` / `payment.canceled`: si sigue en `PENDING_GATEWAY`, marca `PaymentStatus.REJECTED` con `failureCode`/`cancelReason` en `rejectionReason` y `rawWebhookPayload`. (Nota: si posteriormente llega `payment.completed` por conciliación manual en VexPay de Pago Móvil, permite transicionar de `REJECTED` si corresponde o `PENDING_GATEWAY` a `APPROVED`).
     - `payment.reversed`: marca `PaymentStatus.REVERSED`, guarda `reversalType` + `reversalRef` en `rejectionReason`, revoca/restaura la vigencia de `athlete_subscriptions` vinculada (`appliedSubscriptionId` / `previousSubscriptionEndDate`), y notifica por correo al usuario.
4. **Verificación Activa y Conciliación Proactiva**:
   - `verifyCheckoutSession(String sessionOrTxId, UUID requesterId, boolean isAdmin)`:
     - Resuelve la transacción por `vexpaySessionId` o `UUID` (`transactionId`), valida propiedad (`athlete.tutor.id == requesterId` o `isAdmin`).
     - Si aún está `PENDING_GATEWAY`, consulta `GET /v1/checkout/sessions/{sessionId}` en VexPay.
     - Si `session.status == "paid"`: consulta `GET /v1/payments/{paymentId}` (si disponible) para obtener `method`, `vesAmount`, `bcvRate` y ejecuta la misma activación idempotente que `payment.completed`.
     - Si `session.status` es `"expired"` o `"canceled"`, marca `REJECTED`. Si es `"failed"`, informa estado pendiente/fallido según corresponda.
   - `reconcilePendingTransactions()`:
     - Consulta transacciones `VEXPAY` en estado `PENDING_GATEWAY` dentro de la ventana `reconcileLookbackHours` (ej. últimas 48h).
     - Consulta `GET /v1/checkout/sessions/{sessionId}` (y `GET /v1/payments/by-ref/{txId}` como respaldo si aplica) para resolver aprobaciones o vencimientos perdidos.
   - `VexPayReconciliationScheduler.java`: ejecuta periódicamente con `@Scheduled(fixedDelayString = "${talentus.payments.vexpay.reconcile-interval-ms:300000}")`.

### 4.6. Endpoints REST
- En `PaymentController.java` (`/api/v1/payments`):
  - `GET /vexpay/quote` (`@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE', 'ADMIN')")`)
  - `POST /vexpay/checkout-session` (`@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE', 'ADMIN')")`)
  - `POST /vexpay/sessions/{sessionId}/verify` (`@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE', 'ADMIN')")`)
  - `POST /vexpay/webhook` (público en `SecurityConfig`)
- En `AdminPaymentController.java` (`/api/v1/admin/payments`, `@PreAuthorize("hasRole('ADMIN')")`):
  - `POST /vexpay/reconcile`

---

## 5. Frontend: Angular 18+ (Standalone, Signals, `fe-desing.md`)
- **Directiva de diseño:** Seguir [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md) con archivos `.html`, `.ts` y `.css` independientes.
1. **`payment.model.ts` y `payment.service.ts`**:
   - Actualizar `PaymentConfigResponse` (`vexpayEnabled`, `vexpayConfigured`), `PaymentGatewaySettingsDto` (`vexpayEnabled`, `vexpayConfigured`, `vexpayLivemode`), `UpdatePaymentGatewaySettingsRequest` (`vexpayEnabled`), `AdminPaymentSummary` (`vexpayApprovedCount`, `reversedCount`), `PaymentTransactionResponse` (`status` incluyendo `'PENDING_GATEWAY' | 'REVERSED'`, `vexpaySessionId`, `vexpayPaymentId`, `vexpaySubMethod`).
   - Añadir interfaces y métodos: `getVexPayQuote`, `createVexPaySession`, `verifyVexPaySession`, `reconcileVexPayPayments`.
2. **`CheckoutPagoMovilModalComponent`**:
   - Añadir pestaña `'VEXPAY'` en el selector de pasarelas (junto a `PAGO_MOVIL`, `BINANCE_PAY`, `ZELLE`). Deshabilitada/oculta si `vexpayEnabled === false`.
   - Mostrar tarjeta informativa de métodos disponibles en VexPay (Pago Móvil automático, Débito Inmediato C2P, USDT/USDC, COP).
   - Consultar `getVexPayQuote` al seleccionar el método, cambiar de plan o aplicar/quitar cupón, mostrando monto USD, tasa oficial VexPay (`BCV` o `Mercado`) y total estimado en Bs.
   - Botón `"Ir a Pagar con VexPay"` que llama a `createVexPaySession`, almacena `vexpay_pending_session` en `sessionStorage` y redirige con `window.location.assign(res.checkoutUrl)`.
3. **`TutorDashboardComponent`**:
   - En `ngOnInit`, inspeccionar `ActivatedRoute.queryParams` para detectar retorno de VexPay (`payment=vexpay_return` con `session_id` o `txId` o respaldo de `sessionStorage`; o `payment=vexpay_cancelled`).
   - Invocar `verifyVexPaySession`, mostrar banner de estado claro (`Activado`, `En verificación bancaria` con botón de re-consulta manual, o `Cancelado`), limpiar query params de la URL y recargar atletas.
4. **`AdminPaymentsComponent`**:
   - **KPIs:** Mostrar conteo de pagos `VEXPAY` aprobados.
   - **Historial General:** Añadir filtros de método (`VEXPAY`) y estados (`PENDING_GATEWAY`, `REVERSED`), mostrar chip VexPay con sub-método (`vexpaySubMethod`) y badge visual para `PENDING_GATEWAY` / `REVERSED`, y añadir botón **"↻ Conciliar VexPay"**.
   - **Cuentas de Cobro (`GATEWAY_SETTINGS`):** Añadir tarjeta Bento de **VexPay (Pasarela Automatizada)** con toggle ON/OFF (`vexpayEnabled`) e indicador de estado de configuración en servidor (`Configurado / Sin clave` y modo `Test / Live`, sin campos editables de API key).

---

## 6. Plan de Pruebas y Validación
1. **Base de datos local:** Aplicar `dbmate up` contra `talentus_scout_dev` local y validar `schema.sql`.
2. **Pruebas Backend (`./mvnw test`):**
   - `VexPayServiceTest`: Cotización, creación de sesión, manejo de errores RFC 7807, verificación criptográfica HMAC-SHA256 (`VexPay-Signature`), rechazo de firma inválida/expirada, deduplicación por `VexPay-Event-Id`, flujo `payment.completed` (activación y extensión de suscripción), flujo `payment.reversed` (revocación de suscripción y restauración de fecha previa si era extensión), verificación activa de sesión y conciliación masiva (`MockRestServiceServer` / Mockito).
   - `VexPayControllerIntegrationTest` / `PaymentControllerIntegrationTest` / `AdminPaymentGatewayConfigControllerTest`: Endpoints de quote, checkout-session, webhook, verify, reconcile y gateway-settings.
3. **Pruebas Frontend (`npm test` y `npm run build`):**
   - `checkout-pago-movil-modal.component.spec.ts`: Pestaña VexPay, cotización, cupones y creación de sesión.
   - `tutor-dashboard.component.spec.ts`: Retorno `vexpay_return` (`ACTIVE` y `PENDING_GATEWAY` con re-consulta) y `vexpay_cancelled`.
   - `admin-payments.component.spec.ts`: Toggle `vexpayEnabled`, filtros `VEXPAY` / `REVERSED`, y botón `Conciliar VexPay`.

---

## 7. Checklist de Implementación Paso a Paso
- [ ] **1. Ramas Git:** Crear `feature/TS-78-integracion-pasarela-vexpay` desde `main` en `talentus-scout-migrations`, `talentus-scout-be` y `talentus-scout-fe`.
- [ ] **2. Migración DDL Local (`talentus-scout-migrations`):**
  - [ ] Crear `migrations/20261117225500_add_vexpay_payment_support.sql`.
  - [ ] Ejecutar `dbmate up` exclusivamente en PostgreSQL local y verificar actualización de `schema.sql`.
- [ ] **3. Backend (`talentus-scout-be`):**
  - [ ] Configurar `application.yml`, `application-prod.yml` y `VexPayProperties.java`; habilitar `@EnableScheduling`.
  - [ ] Actualizar enums (`PaymentMethod`, `PaymentStatus`), entidades (`PaymentTransaction`, `PaymentGatewaySetting`), crear `VexPayWebhookEvent` y repositorios.
  - [ ] Crear excepción `VexPayApiException` y handler RFC 7807 (`ProblemDetail`) en `GlobalExceptionHandler`.
  - [ ] Crear DTOs VexPay y actualizar DTOs de configuración, resumen y transacciones con Lombok.
  - [ ] Implementar `VexPayService` y `VexPayReconciliationScheduler`.
  - [ ] Actualizar `PaymentConfigService`, `AdminPaymentService`, `EmailService`, `PaymentController`, `AdminPaymentController` y `SecurityConfig`.
  - [ ] Implementar pruebas unitarias e integración y verificar `./mvnw test`.
- [ ] **4. Frontend (`talentus-scout-fe`):**
  - [ ] Actualizar `payment.model.ts` y `payment.service.ts`.
  - [ ] Actualizar `CheckoutPagoMovilModalComponent` (HTML, TS, CSS) con pestaña VexPay, cotización oficial y redirección segura.
  - [ ] Actualizar `TutorDashboardComponent` (HTML, TS) para manejo de retorno y verificación activa.
  - [ ] Actualizar `AdminPaymentsComponent` (HTML, TS, CSS) con tarjeta Bento VexPay, filtros, badges y botón de conciliación.
  - [ ] Actualizar/ampliar suites `.spec.ts` y verificar `npm test` y `npm run build`.
- [ ] **5. Git, PRs y Documentación:**
  - [ ] Commit, push y `gh pr create` en `talentus-scout-migrations`, `talentus-scout-be` y `talentus-scout-fe`.
  - [ ] Generar `test/TS-78-test-plan-integracion-pasarela-pagos-vexpay.md`.
  - [ ] Commit y push directo en `main` del orquestador raíz para `plans/` y `test/`.
  - [ ] Mover tarjeta TS-78 en Trello a `in testing` con resumen y enlaces a los PRs.

---

## 8. Criterios de Aceptación (DoD)
- [ ] Migración `dbmate` ejecutada y validada exclusivamente en PostgreSQL local (nunca en Neon).
- [ ] Un usuario con rol `TUTOR`, `ATHLETE` o `ADMIN` puede seleccionar VexPay en el modal de checkout, visualizar la cotización oficial desde `GET /v1/quote` (con soporte de cupones) y ser redirigido a `session.url`.
- [ ] Pago Móvil manual, Binance Pay y Zelle continúan operando sin regresiones, y `BcvRateService` sigue rigiendo el cálculo de Pago Móvil manual.
- [ ] `POST /api/v1/payments/vexpay/webhook` valida `VexPay-Signature` (`HMAC-SHA256` sobre `<t>.<rawBody>` con tolerancia temporal), deduplica por `VexPay-Event-Id` y activa/extiende `athlete_subscriptions` de forma idempotente ante `payment.completed`.
- [ ] Ante `payment.reversed`, la transacción pasa a `REVERSED`, la suscripción vinculada se revoca/restaura automáticamente y el ingreso deja de sumarse como aprobado.
- [ ] Al retornar del checkout (`successUrl`), el frontend ejecuta verificación activa contra backend sin confiar ciegamente en query params, y el job/botón de conciliación resuelve transacciones `PENDING_GATEWAY` cuyo webhook se haya perdido.
- [ ] Las sesiones `PENDING_GATEWAY` abandonadas no aparecen en la cola manual `PENDING_AUDIT` de administración.
- [ ] El administrador puede activar/pausar VexPay desde `⚙️ Cuentas de Cobro`, filtrar transacciones `VEXPAY` / `REVERSED` y lanzar conciliación manual desde `/admin/pagos`.
- [ ] `./mvnw test`, `npm test` y `npm run build` en verde al 100%.
