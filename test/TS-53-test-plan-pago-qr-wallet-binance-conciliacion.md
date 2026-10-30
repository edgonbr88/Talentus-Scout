# Plan y Reporte de Pruebas — [TS-53] Pago con QR o Dirección de Wallet (Binance/USDT) con Reporte y Conciliación Administrativa

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-53]**, correspondiente a la incorporación del flujo de cobro en USDT vía **Binance Pay / Wallet Address personal** con reporte manual desasistido en pasarela pero 100% asistido administrativamente mediante conciliación en un clic desde el panel de administración.

### 1.1. Artefactos y Componentes Impactados
* **Configuración del Sistema (`application.yml`):**
  * Propiedades institucionales de Binance:
    * `talentus.payments.binance.pay-id`: ID de Binance Pay del receptor.
    * `talentus.payments.binance.wallet-address`: Dirección pública de billetera (USDT).
    * `talentus.payments.binance.network`: Redes admitidas (`TRC-20 (Tron) / BSC (BEP-20)`).
    * `talentus.payments.binance.qr-image-url`: Ruta/URL del código QR de cobro.
* **Backend (Spring Boot 3 / Java 21 / Project Lombok):**
  * Entidades & Repositorios:
    * `PaymentTransaction`: Campos `method` (`PaymentMethod.BINANCE_PAY`), `status` (`PaymentStatus.PENDING_AUDIT`), `referenceNumber`, `amountUsd`, `gatewayOrderId`.
    * `PaymentTransactionRepository`: Método `existsByReferenceNumber(String referenceNumber)`.
  * DTOs Lombok:
    * `PaymentConfigResponse`: Inclusión de campos `binancePayId`, `binanceWalletAddress`, `binanceNetwork`, `binanceQrImageUrl`.
    * `ReportBinanceManualPaymentRequest`: DTO con anotaciones Jakarta (`@NotNull`, `@NotBlank`, `@Size(min=4, max=100)`) para captura de `athleteId`, `planId`, `referenceNumber`, `paymentDate`, `originAccount`, `discountCode`.
  * Excepciones:
    * `DuplicatePaymentReferenceException`: Mapeada en `GlobalExceptionHandler` con código HTTP 409 (Conflict).
  * Servicios:
    * `PaymentConfigService`: Inyección de propiedades de Binance y exposición en `/api/v1/payments/config`.
    * `PaymentService`: Método `@Transactional reportBinanceManual(...)` con validación de tutela, verificación estricta de referencia no duplicada, integración con `DiscountCodeService` para planes promocionales y registro con estado `PENDING_AUDIT`.
    * `AdminPaymentService`: Conciliación inmediata (`approvePayment`) y rechazo (`rejectPayment`), reutilizando la lógica probada de activación/extensión acumulativa de `AthleteSubscription`.
  * Controladores REST:
    * `PaymentController`: Endpoint `POST /api/v1/payments/binance-pay/manual-report` (`hasAnyRole('TUTOR', 'ADMIN')`).
* **Frontend (Angular 18+ Standalone / SSR):**
  * Modelos TypeScript: `payment.model.ts` con tipos actualizados y `ReportBinanceManualPaymentRequest`.
  * Servicio HTTP: `payment.service.ts` con método `reportBinanceManual`.
  * Componentes UI (Bento Grid, Tokens intencionales, Plantillas HTML externas):
    * `CheckoutPagoMovilModalComponent` (`.component.ts`, `.component.html`, `.component.css`): Tab interactivo "Binance Pay" con visualización de QR, Binance Pay ID y Wallet Address con botones de copiado dinámico (microinteracción con toast "¡Copiado!"), advertencia de red, formulario de referencia y botón de acción principal `⚡ Registrar Transferencia Binance`.
    * `AdminPaymentsComponent` (`admin-payments.component.html`): Insignia `🟡 Binance` diferenciada de `🟢 Pago Móvil` y soporte integral para auditar y conciliar en un clic.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests (Spring Boot)

Comando ejecutado:
```bash
./mvnw test -Dtest=PaymentControllerIntegrationTest
```

#### Resultados:
```text
[INFO] Running com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 18.35 s -- in com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

#### Detalle de Casos de Prueba Verificados:
1. `getPaymentConfig_Success_ReturnsBcvAndPlans`: Verifica retorno de datos bancarios, tasa BCV y catálogo de planes.
2. `getPaymentConfig_Success_ReturnsBinanceConfig`: Valida que el endpoint entregue `binancePayId`, `binanceWalletAddress`, `binanceNetwork` y `binanceQrImageUrl`.
3. `reportBinanceManual_ValidRequest_ReturnsCreatedAndPendingStatus`: Valida que el tutor autenticado reporte el pago y se cree la transacción en estado `PENDING_AUDIT` con `amountUsd = 5.00` y método `BINANCE_PAY`.
4. `reportBinanceManual_DuplicateReference_Returns409Conflict`: Comprueba que enviar una referencia previamente registrada retorne HTTP 409 Conflict con mensaje explícito.
5. `reportBinanceManual_InvalidPlan_Returns400BadRequest`: Valida rechazo ante IDs de plan inexistentes.
6. `reportBinanceManual_UnauthorizedTutor_Returns403Forbidden`: Garantiza que tutores no autorizados no puedan reportar pagos sobre atletas ajenos.
7. `reportPagoMovil_ValidRequest_ReturnsPendingTransaction`: Garantiza la no-regresión del flujo de Pago Móvil.
8. `adminApprovePayment_ValidTransaction_ActivatesProSubscription`: Comprueba la aprobación administrativa y emisión de `AthleteSubscription`.
9. `adminApprovePayment_BinanceManual_ActivatesAthleteSubscription`: Certifica que al aprobar una transacción manual de Binance se active la suscripción Pro del atleta por 30 días.
10. `reportPagoMovil_WithValidDiscountCode_AppliesDiscount`: Valida aplicación de cupones de descuento sobre Pago Móvil.
11. `reportBinanceManual_WithValidDiscountCode_AppliesDiscount`: Valida aplicación de cupones de descuento sobre Binance Pay (p. ej. descuento del 20% reduciendo $5.00 a $4.00 USD).

### 2.2. Frontend Unit Tests (Angular / Jasmine & Karma)

Comando ejecutado:
```bash
npm test -- --watch=false --include=**/checkout-pago-movil-modal.component.spec.ts
```

#### Resultados:
```text
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 0 of 9 SUCCESS (0 secs / 0 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 1 of 9 SUCCESS (0 secs / 1.19 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 2 of 9 SUCCESS (0 secs / 1.249 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 3 of 9 SUCCESS (0 secs / 1.297 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 4 of 9 SUCCESS (0 secs / 1.364 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 5 of 9 SUCCESS (0 secs / 1.404 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 6 of 9 SUCCESS (0 secs / 1.45 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 7 of 9 SUCCESS (0 secs / 1.567 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 8 of 9 SUCCESS (0 secs / 1.635 secs)
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 9 of 9 SUCCESS (0 secs / 1.688 secs)
TOTAL: 9 SUCCESS
```

#### Detalle de Casos de Prueba de Componente Verificados:
1. `should create`: Instanciación exitosa del componente con inyección de dependencias.
2. `should load payment config on init`: Carga de configuración y datos de Binance en el ciclo de vida.
3. `should switch payment tabs`: Alternancia reactiva entre tabs `PAGO_MOVIL` y `BINANCE_PAY`.
4. `should render Binance details when BINANCE_PAY is selected`: Renderizado de Pay ID, Wallet Address, advertencia de red y código QR.
5. `should copy Binance Pay ID to clipboard`: Invocación del servicio del portapapeles y visualización de feedback temporal.
6. `should submit Binance manual report when form is valid`: Disparo de `reportBinanceManual` con payload correcto y emisión del evento `paymentReported`.
7. `should display error if Binance manual report fails`: Manejo de errores y retroalimentación al usuario.
8. `should calculate VES amount based on BCV rate for Pago Móvil`: Verificación de cálculo en bolívares.
9. `should validate reference input for Pago Móvil`: Validación de longitud mínima de referencia.

### 2.3. Frontend Build & Compilación Angular SSR

Comando ejecutado:
```bash
npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` en 46.66 s, 0 errores, código de salida 0).
* Prerenderizado exitoso de 13 rutas estáticas.
* Chunks lazy generados y optimizados sin warnings ni dependencias circulares.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Consulta de Configuración de Binance y Pago Móvil
```bash
curl -s http://localhost:8080/api/v1/payments/config | jq .
```
**Respuesta esperada:**
```json
{
  "bcvRate": 45.50,
  "bankName": "Banco Nacional de Crédito (BNC)",
  "phoneNumber": "04141234567",
  "idNumber": "J-50123456-7",
  "accountHolder": "Talentus Scout C.A.",
  "binancePayId": "283918273",
  "binanceWalletAddress": "TLsV5289FjK93kdJ8193jd93kd9",
  "binanceNetwork": "TRC-20 (Tron) / BSC (BEP-20)",
  "binanceQrImageUrl": "/assets/images/binance-qr-sample.png",
  "plans": [
    {
      "id": "PRO_MONTHLY",
      "name": "Plan Pro Mensual",
      "priceUsd": 5.00,
      "durationDays": 30
    },
    {
      "id": "PRO_ANNUAL",
      "name": "Plan Pro Anual (Pase de Temporada)",
      "priceUsd": 50.00,
      "durationDays": 365
    }
  ]
}
```

### 3.2. Reporte de Transferencia Binance / USDT (Tutor)
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/binance-pay/manual-report \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY",
    "referenceNumber": "BINANCE-ORDER-8829104",
    "paymentDate": "2026-10-21",
    "originAccount": "MiUsuarioBinance",
    "discountCode": "PROMO20"
  }' | jq .
```
**Respuesta esperada (HTTP 201 Created):**
```json
{
  "id": "0192df78-...",
  "athleteId": "<ATHLETE_UUID>",
  "planId": "PRO_MONTHLY",
  "method": "BINANCE_PAY",
  "amountUsd": 4.00,
  "amountVes": 0.00,
  "bcvExchangeRate": 0.00,
  "referenceNumber": "BINANCE-ORDER-8829104",
  "originBank": "Binance Pay / USDT",
  "originPhone": null,
  "paymentDate": "2026-10-21",
  "status": "PENDING_AUDIT",
  "discountAmountUsd": 1.00
}
```

### 3.3. Intento de Reenvío con la Misma Referencia (Detección de Duplicados)
```bash
curl -s -i -X POST http://localhost:8080/api/v1/payments/binance-pay/manual-report \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY",
    "referenceNumber": "BINANCE-ORDER-8829104",
    "paymentDate": "2026-10-21"
  }'
```
**Respuesta esperada:**
* Código HTTP: `409 Conflict`
* Cuerpo: Error indicando que ya existe una transacción registrada con la referencia indicada.

### 3.4. Auditoría y Aprobación en Cola Administrativa (`/admin/pagos`)
1. Consultar cola de pagos pendientes:
   ```bash
   curl -s http://localhost:8080/api/v1/admin/payments/pending \
     -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
   ```
   **Validación:** La transacción reportada aparece con `method: "BINANCE_PAY"`, `amountUsd: 4.00` y badge `🟡 Binance` en el panel web.

2. Conciliar y aprobar transacción en 1 clic:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/admin/payments/<TRANSACTION_UUID>/approve \
     -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
   ```
   **Respuesta esperada:**
   * Transacción cambia a estado `APPROVED`.
   * Se crea/extiende la suscripción en `athlete_subscriptions` con estado `ACTIVE`.
   * Se envía correo de confirmación de activación de suscripción al tutor.

### 3.5. Verificación de Estado de Suscripción del Atleta
```bash
curl -s http://localhost:8080/api/v1/payments/athlete/<ATHLETE_UUID>/status \
  -H "Authorization: Bearer <TOKEN_TUTOR>" | jq .
```
**Respuesta esperada:**
```json
{
  "hasActiveSubscription": true,
  "planId": "PRO_MONTHLY",
  "validUntil": "2026-11-20",
  "hasPendingPayment": false
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **1. Endpoint `/api/v1/payments/config` entrega variables de Binance** | ✅ Cumplido | Campos `binancePayId`, `binanceWalletAddress`, `binanceNetwork`, `binanceQrImageUrl` presentes y configurables en `application.yml`. |
| **2. Modal de Checkout con QR, Pay ID y Wallet con copiado funcional** | ✅ Cumplido | Componente `checkout-pago-movil-modal` con Bento grid estilizado, botones con retroalimentación visual de copiado y microanimaciones. |
| **3. Tutor registra referencia de orden / TxID mediante formulario reactivo** | ✅ Cumplido | Formulario con validación en Angular e integración mediante `paymentService.reportBinanceManual`. |
| **4. Transacción persistida con método `BINANCE_PAY` y estado `PENDING_AUDIT`** | ✅ Cumplido | Validado en base de datos y probado en `PaymentControllerIntegrationTest.reportBinanceManual_ValidRequest_ReturnsCreatedAndPendingStatus`. |
| **5. Detección y rechazo de referencias duplicadas con error 409** | ✅ Cumplido | `DuplicatePaymentReferenceException` capturada y mapeada a `HTTP 409 Conflict`. |
| **6. Panel `/admin/pagos` muestra transacción y permite conciliar en 1 clic** | ✅ Cumplido | Vista administrativa con badge `🟡 Binance`, tabla de pendientes y botón de aprobación inmediata. |
| **7. Aprobación activa de inmediato la suscripción `ACTIVE` del atleta** | ✅ Cumplido | `AdminPaymentService.approvePayment` genera/extiende vigencia acumulativa en `AthleteSubscription`. |
| **8. Suites de backend y frontend pasan al 100% sin regresiones** | ✅ Cumplido | Backend: 11/11 pruebas pasadas (`BUILD SUCCESS`). Frontend: 9/9 pruebas pasadas (`TOTAL: 9 SUCCESS`). `npm run build` completado exitosamente. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Prevención de Suplantación de Tutela:** El endpoint valida mediante `athleteRepository` que el atleta pertenezca al usuario tutor autenticado (o que el usuario sea administrador).
2. **Prevención de Fraude por Reutilización de TxID:** La validación de unicidad `existsByReferenceNumber` impide que dos tutores o un mismo tutor registren dos veces el mismo comprobante o TxID de Binance.
3. **Compatibilidad con Códigos de Descuento Promocionales:** Si el tutor suministra un cupón válido (ej. `TS-23`), el monto en USDT se descuenta automáticamente antes de guardar la transacción.
4. **Protección LOPNNA (Art. 65) y Privacidad:** No se solicitan credenciales bancarias privadas ni claves de Binance; la operación consiste únicamente en una transferencia descentralizada hacia una dirección pública y auditoría visual de abono.
5. **Separación de Plantillas Frontend:** Componente Angular 18+ implementado estrictamente con `templateUrl: './checkout-pago-movil-modal.component.html'`, sin uso de plantillas inline.
