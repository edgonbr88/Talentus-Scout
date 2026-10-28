# Plan de Implementación — [TS-17] Panel de Conciliación de Pagos para Administradores y Webhook Binance Pay

## 1. Identificación de la Tarea
* **ID:** `TS-17`
* **Título:** Panel de Conciliación de Pagos para Administradores y Webhook Binance Pay
* **Enlace Trello:** [https://trello.com/c/C4DRyAJV](https://trello.com/c/C4DRyAJV) (Card ID: `6abbe1fe304d186790dc9477`)
* **Sprint:** Sprint 4 — Verificación Dual, Monetización Día 1 y Promoción a la Nube
* **Estado:** `in testing`
* **Agente Planificador:** `trello_planner`

---

## 2. Resumen y Contexto de Negocio

### 2.1. Propósito y Valor Aportado
El módulo de monetización de Talentus Scout busca minimizar cualquier fricción en el cobro de suscripciones a los tutores legales de atletas juveniles. En Venezuela y Latinoamérica, dos mecanismos son dominantes:
1. **Pago Móvil (VES):** Provee inclusión local a tasa oficial BCV, pero requiere conciliación administrativa manual en la banca institucional.
2. **Binance Pay (Criptoactivos / USDT):** Permite a tutores en el país y en la diáspora realizar pagos internacionales instantáneos en dólares digitales (USDT) con comisiones casi nulas (0 gas fees en el ecosistema Binance), logrando una **activación 100% automática en segundos vía Webhooks** sin esperar la intervención de un administrador.

### 2.2. Panel Integral de Administración y Auditoría Contable
Para el equipo operativo y de finanzas de Talentus Scout, se requiere un panel de conciliación unificado y profesional en `/admin/pagos`:
* **Métricas Clave de Recaudación (KPIs Bento):** Total recaudado acumulado en USD y VES, total de transacciones conciliadas, tasa de aprobación y volumen procesado en bolívares vs criptoactivos.
* **Cola de Pagos Pendientes:** Gestión ágil de transferencias de Pago Móvil con validación de referencia y aprobación/rechazo en un clic.
* **Historial Contable Unificado:** Registro auditable de todas las operaciones (tanto manuales aprobadas/rechazadas como automáticas de Binance Pay), con filtros por método de pago (`PAGO_MOVIL`, `BINANCE_PAY`), estado (`APPROVED`, `REJECTED`, `PENDING_AUDIT`), rango de fechas y buscador por atleta/tutor.

### 2.3. Directivas Legales y de Vocabulario
* **Protección del Menor:** La activación de una suscripción Pro mediante Binance Pay habilita de forma inmediata la visibilidad del atleta en el directorio de scouts, respetando los consentimientos de patria potestad otorgados por el tutor.
* **Prohibición de Vocabulario:** **Cero uso del acrónimo "LOPNNA"** en títulos, botones, etiquetas o modales de la interfaz de usuario.

---

## 3. Arquitectura y Modelo de Datos (PostgreSQL)

### 3.1. Migración DDL (`talentus-scout-migrations`)
Se crea una nueva migración con `dbmate` para registrar campos de pasarela externa y payload de auditoría en `payment_transactions`:

**Archivo:** `talentus-scout-migrations/migrations/20261010150000_add_binance_pay_columns.sql`

```sql
-- migrate:up
ALTER TABLE payment_transactions 
    ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS raw_webhook_payload TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway_order ON payment_transactions(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_method_status ON payment_transactions(method, status);

-- migrate:down
DROP INDEX IF EXISTS idx_payment_tx_method_status;
DROP INDEX IF EXISTS idx_payment_tx_gateway_order;
ALTER TABLE payment_transactions 
    DROP COLUMN IF EXISTS raw_webhook_payload,
    DROP COLUMN IF EXISTS gateway_order_id;
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Configuración de Entorno (`application.yml`)
```yaml
talentus:
  payments:
    binance-pay:
      enabled: ${BINANCE_PAY_ENABLED:true}
      api-key: ${BINANCE_PAY_API_KEY:talentus_binance_mock_key}
      secret-key: ${BINANCE_PAY_SECRET_KEY:talentus_binance_mock_secret}
      merchant-id: ${BINANCE_PAY_MERCHANT_ID:talentus_merchant_001}
      base-url: ${BINANCE_PAY_BASE_URL:https://bpay.binanceapi.com}
      sandbox: ${BINANCE_PAY_SANDBOX:true}
      return-url: ${BINANCE_PAY_RETURN_URL:http://localhost:4200/dashboard?payment=success}
      cancel-url: ${BINANCE_PAY_CANCEL_URL:http://localhost:4200/dashboard?payment=cancelled}
```

### 4.2. Entidades JPA y Project Lombok
En `PaymentTransaction.java` (`com.talentus.scout.domain.entity`):
* Agregar los campos mapeados:
  ```java
  @Column(name = "gateway_order_id", length = 100)
  private String gatewayOrderId;

  @Column(name = "raw_webhook_payload", columnDefinition = "TEXT")
  private String rawWebhookPayload;
  ```
* Asegurar el uso riguroso de Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.

### 4.3. Data Transfer Objects (DTOs con Lombok y Jakarta Validation)
* **`CreateBinanceOrderRequest`** (`com.talentus.scout.web.dto`):
  ```java
  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public class CreateBinanceOrderRequest {
      @NotNull(message = "El ID del atleta es obligatorio")
      private UUID athleteId;

      @NotBlank(message = "El ID del plan es obligatorio")
      private String planId;
  }
  ```
* **`CreateBinanceOrderResponse`** (`com.talentus.scout.web.dto`):
  ```java
  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public class CreateBinanceOrderResponse {
      private UUID transactionId;
      private String prepayId;
      private String checkoutUrl;
      private String qrContent;
      private Long expireTime;
      private BigDecimal amountUsd;
      private String currency; // "USDT"
  }
  ```
* **`BinanceWebhookPayload`** (`com.talentus.scout.web.dto`):
  ```java
  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public class BinanceWebhookPayload {
      private String bizType;      // "PAY"
      private String bizId;        // merchantTradeNo o gatewayOrderId
      private String bizStatus;    // "PAY_SUCCESS", "PAY_CLOSED"
      private String data;         // JSON string o mapa con detalles
  }
  ```
* **`BinanceWebhookResponse`** (`com.talentus.scout.web.dto`):
  ```java
  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public class BinanceWebhookResponse {
      private String returnCode;    // "SUCCESS" / "FAIL"
      private String returnMessage;
  }
  ```
* **`AdminPaymentSummaryResponse`** (`com.talentus.scout.web.dto`):
  ```java
  @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
  public class AdminPaymentSummaryResponse {
      private BigDecimal totalRevenueUsd;
      private BigDecimal totalRevenueVes;
      private long pendingAuditCount;
      private long approvedCount;
      private long rejectedCount;
      private long binancePayApprovedCount;
      private long pagoMovilApprovedCount;
  }
  ```

### 4.4. Repositorios Spring Data JPA
En `PaymentTransactionRepository.java`:
* `Optional<PaymentTransaction> findByGatewayOrderId(String gatewayOrderId);`
* `Page<PaymentTransaction> findByStatus(PaymentStatus status, Pageable pageable);`
* `Page<PaymentTransaction> findByMethodAndStatus(PaymentMethod method, PaymentStatus status, Pageable pageable);`
* `Page<PaymentTransaction> findByMethod(PaymentMethod method, Pageable pageable);`
* Métodos de conteo y agregación:
  * `long countByStatus(PaymentStatus status);`
  * `long countByMethodAndStatus(PaymentMethod method, PaymentStatus status);`
  * `@Query("SELECT COALESCE(SUM(pt.amountUsd), 0) FROM PaymentTransaction pt WHERE pt.status = 'APPROVED'") BigDecimal sumApprovedUsd();`
  * `@Query("SELECT COALESCE(SUM(pt.amountVes), 0) FROM PaymentTransaction pt WHERE pt.status = 'APPROVED' AND pt.amountVes IS NOT NULL") BigDecimal sumApprovedVes();`

### 4.5. Servicios de Negocio
1. **`BinancePayService`** (`com.talentus.scout.service.payment`):
   * `CreateBinanceOrderResponse createOrder(UUID tutorId, CreateBinanceOrderRequest request)`:
     * Valida tutela legal del atleta por parte del usuario autenticado.
     * Busca el plan activo (`PRO_MONTHLY` o `PRO_ANNUAL`).
     * Genera un identificador único de orden de comercio (`merchantTradeNo = "TS-" + UUID.randomUUID().toString().substring(0, 8)`).
     * Registra la transacción en estado `PENDING_AUDIT` con `method = BINANCE_PAY`, `amountUsd = plan.getPriceUsd()`, `gatewayOrderId = merchantTradeNo`.
     * En modo sandbox o producción:
       * Si sandbox está activo o falla la conexión remota, genera un payload de orden simulado con URL de checkout mockeada (`/api/v1/payments/binance-pay/mock-checkout/{orderId}`) y QR data para pruebas funcionales instantáneas sin necesidad de un contrato formal merchant de producción.
       * Si producción está configurado, firma la petición mediante HMAC-SHA512 con el `secret-key` de Binance y envía el request a `https://bpay.binanceapi.com/binancepay/openapi/v3/order`.
   * `BinanceWebhookResponse handleWebhook(String payload, String signature, String timestamp, String nonce)`:
     * Verifica la autenticidad de la firma (en modo sandbox/mock permite firma de prueba `"mock-valid-sig"` o verifica HMAC).
     * Parsea el payload JSON.
     * Busca la transacción correspondiente por `gatewayOrderId` o referencia.
     * Si `bizStatus.equals("PAY_SUCCESS")`:
       * Transiciona `PaymentTransaction` a `APPROVED`.
       * Asigna `auditedAt = Instant.now()`.
       * Persiste `rawWebhookPayload = payload`.
       * Activa o extiende la suscripción en `AthleteSubscription`:
         * Si el atleta ya tiene una suscripción activa con `endDate > now`, suma `durationDays` al `endDate` actual.
         * Si no, crea nueva suscripción con vigencia de `durationDays`.
       * Envía notificación de activación por correo al tutor.
     * Retorna `BinanceWebhookResponse.builder().returnCode("SUCCESS").build()`.

2. **`AdminPaymentService`** (Extensión en `com.talentus.scout.service.payment`):
   * `AdminPaymentSummaryResponse getMetricsSummary()`:
     * Retorna recaudación total (USD/VES) y conteos segregados por método y estado.
   * `Page<PaymentTransactionResponse> getPaymentHistory(PaymentMethod method, PaymentStatus status, Pageable pageable)`:
     * Retorna el listado histórico paginado con filtrado dinámico.

### 4.6. Endpoints REST y Seguridad (`SecurityConfig`)
* En `SecurityConfig.java`:
  * Permitir acceso anónimo a:
    * `/api/v1/payments/binance-pay/webhook` (Público / `permitAll()` con validación de cabeceras de firma).
    * `/api/v1/payments/binance-pay/mock-webhook` (Público para desarrollo/pruebas).
* En `PaymentController.java`:
  * `POST /api/v1/payments/binance-pay/create-order` (Rol: `TUTOR`).
  * `POST /api/v1/payments/binance-pay/webhook` (`permitAll()`).
  * `POST /api/v1/payments/binance-pay/mock-webhook` (Pruebas controladas con cURL).
* En `AdminPaymentController.java`:
  * `GET /api/v1/admin/payments/summary` (Rol: `ADMIN`).
  * `GET /api/v1/admin/payments/history` (Rol: `ADMIN`, con parámetros `method`, `status`, `page`, `size`).

---

## 5. Especificación Frontend (Angular 18+ Standalone & SSR)

### 5.1. Modelos TypeScript (`core/models/payment.model.ts`)
* `CreateBinanceOrderRequest`: `athleteId`, `planId`.
* `CreateBinanceOrderResponse`: `transactionId`, `prepayId`, `checkoutUrl`, `qrContent`, `expireTime`, `amountUsd`, `currency`.
* `AdminPaymentSummary`: `totalRevenueUsd`, `totalRevenueVes`, `pendingAuditCount`, `approvedCount`, `rejectedCount`, `binancePayApprovedCount`, `pagoMovilApprovedCount`.
* `PaymentHistoryFilter`: `method?: 'PAGO_MOVIL' | 'BINANCE_PAY' | 'ALL'`, `status?: 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED' | 'ALL'`, `page?: number`, `size?: number`.

### 5.2. Servicio Angular (`core/services/payment.service.ts`)
* `createBinanceOrder(req: CreateBinanceOrderRequest): Observable<CreateBinanceOrderResponse>`
* `getAdminPaymentSummary(): Observable<AdminPaymentSummary>`
* `getAdminPaymentHistory(filter: PaymentHistoryFilter): Observable<{ content: PaymentTransactionResponse[]; totalElements: number; totalPages: number }>`

### 5.3. Componentes y Vistas
1. **Modal de Checkout Multi-Pasarela (`CheckoutPagoMovilModalComponent`):**
   * Pestañas superiores estilizadas:
     * **🇻🇪 Pago Móvil (Bolívares)**
     * **🟡 Binance Pay (USDT / Cripto)** (con el característico acento amarillo `#F0B90B` y fondo de contraste oscuro).
   * Al seleccionar Binance Pay:
     * Botón de acción: `⚡ Generar Orden Binance Pay`.
     * Vista de confirmación con monto exacto en USDT (ej: `5.00 USDT`), temporizador de vigencia (15 min), botón de apertura directa a Binance Pay Web/App y visualización de código QR / Enlace de pago.
     * Botón de verificación: `✓ Ya completé la transferencia en Binance`, que consulta el estado y actualiza el dashboard automáticamente.
2. **Panel Integral de Administración de Pagos (`AdminPaymentsComponent`):**
   * **Tarjetas Bento de KPIs:**
     * Total Recaudado USD (con badge de transacciones Binance Pay).
     * Total Recaudado VES (con badge de Pago Móvil).
     * Pagos Pendientes por Conciliar (alerta en ámbar).
     * Tasa de Aprobación Global (%).
   * **Pestaña 1: "Cola de Pendientes":**
     * Mantiene la tabla actual de revisión de Pago Móvil con botones rápidos `Aprobar` y `Rechazar`.
   * **Pestaña 2: "Historial General de Auditoría":**
     * Filtros interactivos por Método (`Todos`, `Pago Móvil`, `Binance Pay`) y por Estado (`Todos`, `Aprobados`, `Rechazados`, `Pendientes`).
     * Tabla detallada con fecha, tutor, atleta, plan, método (chips diferenciados: azul para Pago Móvil, dorado para Binance Pay), referencia / OrderId y estado.
     * Paginación limpia y reactiva.
3. **Vocabulario y Diseño:** Cumplimiento total de [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md) y **cero menciones a LOPNNA**.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Automatizadas Backend (Spring Boot)
1. **`BinancePayServiceTest`:**
   * Creación de orden exitosa generando `gatewayOrderId` y transacción en estado `PENDING_AUDIT`.
   * Procesamiento de Webhook con firma válida: transición a `APPROVED` y emisión de suscripción para el atleta.
   * Procesamiento de Webhook con firma inválida: rechazo con código `FAIL`.
   * Extensión acumulativa de vigencia en atletas con suscripción activa previa.
2. **`AdminPaymentServiceTest`:**
   * Cálculo correcto de sumas acumuladas en USD y VES en el resumen contable.
   * Filtrado adecuado del historial de transacciones por método y estado.
3. **`BinanceWebhookIntegrationTest` (`@SpringBootTest` con `MockMvc`):**
   * Petición HTTP a `POST /api/v1/payments/binance-pay/webhook` retornando 200 OK y activando al atleta de prueba en base de datos.

### 6.2. Frontend Build y Validaciones
* Ejecución de `npm run build` en `talentus-scout-fe` garantizando 0 errores de empaquetado.
* Inspección de texto con ripgrep garantizando cero ocurrencias de la palabra "LOPNNA".

### 6.3. Comandos de Verificación Manual (cURL)
1. **Crear Orden Binance Pay (Tutor):**
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/payments/binance-pay/create-order \
     -H "Authorization: Bearer <TOKEN_TUTOR>" \
     -H "Content-Type: application/json" \
     -d '{
       "athleteId": "<ATHLETE_UUID>",
       "planId": "PRO_MONTHLY"
     }' | jq .
   ```
2. **Simular Webhook de Confirmación de Pago Binance:**
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/payments/binance-pay/mock-webhook \
     -H "Content-Type: application/json" \
     -H "BinancePay-Signature: mock-valid-sig" \
     -d '{
       "bizType": "PAY",
       "bizId": "<GATEWAY_ORDER_ID>",
       "bizStatus": "PAY_SUCCESS"
     }' | jq .
   ```
3. **Consultar Resumen y Métricas Administrativas:**
   ```bash
   curl -s http://localhost:8080/api/v1/admin/payments/summary \
     -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
   ```
4. **Consultar Historial Paginado Filtrado por Binance Pay:**
   ```bash
   curl -s "http://localhost:8080/api/v1/admin/payments/history?method=BINANCE_PAY" \
     -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
   ```

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Crear migración SQL en `talentus-scout-migrations` agregando `gateway_order_id`, `raw_webhook_payload` e índices a `payment_transactions`.
- [x] **Paso 2:** Aplicar migración en base de datos PostgreSQL local (`talentus-postgres-dev`).
- [x] **Paso 3:** Actualizar entidad JPA `PaymentTransaction` con nuevos campos y modelado estricto con Lombok.
- [x] **Paso 4:** Crear DTOs backend (`CreateBinanceOrderRequest`, `CreateBinanceOrderResponse`, `BinanceWebhookPayload`, `BinanceWebhookResponse`, `AdminPaymentSummaryResponse`) con Lombok y Jakarta Validation.
- [x] **Paso 5:** Ampliar `PaymentTransactionRepository` con métodos de consulta por `gatewayOrderId`, filtros por método/estado y consultas `@Query` de recaudación total en USD y VES.
- [x] **Paso 6:** Configurar parámetros de Binance Pay en `application.yml` y actualizar `SecurityConfig` para permitir acceso público al webhook de Binance.
- [x] **Paso 7:** Implementar `BinancePayService` con generación de órdenes (soporte sandbox/mock y HMAC-SHA512), validación de webhooks y activación instantánea de vigencias Pro.
- [x] **Paso 8:** Ampliar `AdminPaymentService` con `getMetricsSummary()` y `getPaymentHistory()`.
- [x] **Paso 9:** Implementar endpoints en `PaymentController` (`create-order`, `webhook`, `mock-webhook`) y `AdminPaymentController` (`summary`, `history`).
- [x] **Paso 10:** Escribir y ejecutar pruebas unitarias y de integración backend (`./mvnw test -Dtest=BinancePay*,AdminPayment*`).
- [x] **Paso 11:** Actualizar modelos TypeScript e implementar llamadas HTTP en `payment.service.ts` del frontend.
- [x] **Paso 12:** Actualizar modal `CheckoutPagoMovilModalComponent` agregando pestaña interactiva de Binance Pay (USDT) con diseño Bento y botón de checkout.
- [x] **Paso 13:** Rediseñar `AdminPaymentsComponent` (`/admin/pagos`) con KPIs de recaudación, pestaña de pendientes y pestaña de historial de transacciones con filtros.
- [x] **Paso 14:** Validar compilación limpia del frontend (`npm run build`) y verificar cero presencia de "LOPNNA".
- [x] **Paso 15:** Redactar reporte de pruebas en `test/TS-17-test-plan-conciliacion-pagos-webhook-binance-pay.md`.
- [x] **Paso 16:** Transicionar tarjeta `[TS-17]` a `in testing` en Trello vía script `move_to_testing.py`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Generación de órdenes de Binance Pay operativa para tutores autenticados.
- [x] Webhook de Binance Pay funcional con verificación de firma y activación 100% instantánea de la suscripción del atleta.
- [x] Panel de administración con KPIs de recaudación (USD y VES) e historial filtrable por método (`PAGO_MOVIL` y `BINANCE_PAY`).
- [x] Modal de checkout del frontend con selector multi-pasarela (Pago Móvil y Binance Pay).
- [x] Cero uso de "LOPNNA" en botones, etiquetas y vistas.
- [x] 100% de pruebas automáticas en verde (`./mvnw test`) y compilación limpia (`npm run build`).
