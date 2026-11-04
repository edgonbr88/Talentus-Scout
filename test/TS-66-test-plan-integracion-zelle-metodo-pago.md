# Plan de Pruebas y Validación: [TS-66] Integración de Zelle como Método de Pago: Parámetros en Mantenedor Admin, Reporte Manual de Checkout y Conciliación

**ID Tarea:** TS-66  
**Título:** Integración de Zelle como Método de Pago: Parámetros en Mantenedor Admin, Reporte Manual de Checkout y Conciliación  
**Tarjeta Trello:** [https://trello.com/c/AfelIkUU](https://trello.com/c/AfelIkUU)  
**ID de Tarjeta en Trello:** `6ae4b47d79319afa0bcecda4`  
**Sprint:** Sprint 4  
**Fecha:** 2026-11-03  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

Este plan de pruebas certifica la implementación integral de **Zelle (USD)** como tercer canal de pago e ingreso de divisas en Talentus Scout, abarcando:
1. **Base de Datos (`talentus-scout-migrations`):**
   * Migración `20261103103000_add_zelle_payment_support.sql` que añade `'ZELLE'` al tipo ENUM `payment_method` y las columnas `zelle_enabled`, `zelle_email`, `zelle_account_holder` y `zelle_qr_image_url` a `payment_gateway_settings`.
2. **Backend (`talentus-scout-be`):**
   * Entidad JPA `PaymentGatewaySetting`, enum `PaymentMethod.ZELLE`.
   * DTOs con Lombok y Jakarta Bean Validation: `ReportZellePaymentRequest`, `PaymentGatewaySettingsDto`, `UpdatePaymentGatewaySettingsRequest`, `PaymentConfigResponse`, `AdminPaymentSummaryResponse`.
   * Servicios: `PaymentConfigService` (lectura/actualización de parámetros y QR de Zelle), `PaymentService.reportZellePayment(...)` (validación de unicidad de referencia 409, descuento por cupón y persistencia en `PENDING_AUDIT`), `AdminPaymentService` (aprobación/rechazo y métrica `zelleApprovedCount`).
   * Controladores REST: `POST /api/v1/payments/zelle/report` y `POST /api/v1/admin/payments/gateway-settings/zelle-qr`.
3. **Frontend (`talentus-scout-fe`):**
   * Modelos TypeScript (`payment.model.ts`) y llamadas HTTP (`payment.service.ts`).
   * Modal de Checkout (`CheckoutPagoMovilModalComponent`): Pestaña **Zelle** con identidad visual morada institucional (`#7C3AED` / `#A855F7`), datos receptores con copiado rápido, QR opcional y formulario de reporte de transferencia.
   * Panel Administrativo (`AdminPaymentsComponent`): Tarjeta Bento de configuración de **Zelle Institucional** en `⚙️ Cuentas de Cobro` (switch ON/OFF, correo receptor, titular y subida de QR con preview), además de badges morados (`🟣 Zelle`) y filtro en `⏳ Cola de Pendientes` e `📜 Historial General`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
cd talentus-scout-be && ./mvnw test -Dtest=DataInitializerTest,AdminPaymentGatewayConfigControllerTest,PaymentControllerIntegrationTest,PaymentServiceTest,AdminPaymentServiceTest
```

| Clase de Prueba | Casos Verificados | Resultado |
| :--- | :--- | :--- |
| `PaymentControllerIntegrationTest` | `reportZellePaymentAndAdminApproval_CompleteWorkflow` (reporte 201 Created, estado `PENDING_AUDIT`, aprobación por admin y activación de suscripción `ACTIVE`), `reportZellePayment_DuplicateReference_Returns409` (validación 409 Conflict ante referencia repetida), flujos previos de Pago Móvil, Binance y cupones. | **PASS** (11/11) |
| `AdminPaymentGatewayConfigControllerTest` | `getGatewaySettings_asAdmin_success` (incluye `zelleEnabled` y `zelleEmail`), `updateGatewaySettings_asAdmin_success` (persiste cambios de Zelle y los refleja en `/api/v1/payments/config`), `uploadZelleQr_asAdmin_success` (200 OK y ruta `/uploads/payments/...`), `uploadZelleQr_invalidType_badRequest` (400 Bad Request para PDF/texto). | **PASS** (8/8) |
| `DataInitializerTest` | Inicialización idempotente de planes canónicos (`PRO_MONTHLY`, `PRO_ANNUAL`) y manejo seguro de planes residuales. | **PASS** (4/4) |
| `PaymentServiceTest` | Pruebas unitarias de reporte de pagos y estado de suscripción. | **PASS** (6/6) |
| `AdminPaymentServiceTest` | Pruebas unitarias de aprobación, extensión de vigencia y rechazo con notificación por correo. | **PASS** (3/3) |

**Total Backend:** `34 tests run, 0 failures, 0 errors (BUILD SUCCESS)`.

### 2.2. Frontend (Angular 18+ / Jasmine & Karma / Production Build)
Comandos ejecutados:
```bash
cd talentus-scout-fe && npm test -- --watch=false --browsers=ChromeHeadless
cd talentus-scout-fe && npm run build
```

| Suite de Prueba | Casos Verificados | Resultado |
| :--- | :--- | :--- |
| `CheckoutPagoMovilModalComponent` | Cambio a pestaña `ZELLE`, renderizado de `pagos@talentusscout.com` y `Talentus Scout LLC`, envío de `submitZelleReport()` hacia `PaymentService.reportZellePayment` con titular, contacto emisor y referencia, y validación de campos obligatorios. | **PASS** |
| `AdminPaymentsComponent` | Renderizado de tarjeta Bento `Zelle Institucional` en pestaña `GATEWAY_SETTINGS`, conteo de `3 Activas`, actualización de `zelleEmail` y `zelleAccountHolder` vía `saveGatewaySettings()`. | **PASS** |
| Build de Producción (`ng build`) | Compilación AOT, verificación estricta de plantillas HTML separadas y generación de bundles Browser + SSR. | **PASS** |

---

## 3. Guía de Verificación Manual Paso a Paso (cURL y UI)

### 3.1. Consultar Configuración Pública de Pasarelas (Incluyendo Zelle)
```bash
curl -s -X GET http://localhost:8080/api/v1/payments/config | jq
```
**Respuesta Esperada (`200 OK`):**
```json
{
  "bcvRate": 45.50,
  "pagoMovilEnabled": true,
  "bankName": "Banco Nacional de Crédito (BNC)",
  "binanceManualEnabled": true,
  "binancePayId": "283918273",
  "zelleEnabled": true,
  "zelleEmail": "pagos@talentusscout.com",
  "zelleAccountHolder": "Talentus Scout LLC",
  "zelleQrImageUrl": null
}
```

### 3.2. Actualizar Parámetros de Zelle desde Admin (`PUT /api/v1/admin/payments/gateway-settings`)
```bash
curl -i -X PUT http://localhost:8080/api/v1/admin/payments/gateway-settings \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "pagoMovilEnabled": true,
    "pagoMovilBank": "Banco Nacional de Crédito (BNC)",
    "pagoMovilPhone": "04141234567",
    "pagoMovilIdNumber": "J-50123456-7",
    "pagoMovilAccountHolder": "Talentus Scout C.A.",
    "binanceManualEnabled": true,
    "binancePayId": "283918273",
    "binanceWalletAddress": "TLsV5289FjK93kdJ8193jd93kd9",
    "binanceNetwork": "USDT (TRC-20 / BEP-20)",
    "zelleEnabled": true,
    "zelleEmail": "pagos@talentusscout.com",
    "zelleAccountHolder": "Talentus Scout LLC"
  }'
```

### 3.3. Subir Imagen de Código QR de Zelle (`POST /api/v1/admin/payments/gateway-settings/zelle-qr`)
```bash
curl -i -X POST http://localhost:8080/api/v1/admin/payments/gateway-settings/zelle-qr \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -F "file=@/ruta/a/zelle-qr.png;type=image/png"
```
**Respuesta Esperada (`200 OK`):**
```json
{
  "qrImageUrl": "/uploads/payments/uuid_zelle-qr.png"
}
```

### 3.4. Reportar Pago Zelle como Tutor (`POST /api/v1/payments/zelle/report`)
```bash
curl -i -X POST http://localhost:8080/api/v1/payments/zelle/report \
  -H "Authorization: Bearer <TUTOR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY",
    "referenceNumber": "JPM998877665",
    "originAccountHolder": "Carlos Pérez",
    "originEmailOrPhone": "carlos.perez@bofa.com",
    "paymentDate": "2026-11-03"
  }'
```
**Respuesta Esperada (`201 Created`):**
```json
{
  "id": "...",
  "athleteId": "<ATHLETE_UUID>",
  "planId": "PRO_MONTHLY",
  "method": "ZELLE",
  "amountUsd": 5.00,
  "amountVes": 0,
  "referenceNumber": "JPM998877665",
  "originBank": "Zelle (Carlos Pérez - carlos.perez@bofa.com)",
  "originPhone": "carlos.perez@bofa.com",
  "status": "PENDING_AUDIT"
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| # | Criterio de Aceptación | Estado | Evidencia Técnica |
| :- | :--- | :---: | :--- |
| 1 | Migración DDL aplicada añadiendo `ZELLE` a `payment_method` y las 4 columnas en `payment_gateway_settings`. | ✅ | `20261103103000_add_zelle_payment_support.sql` ejecutada con `dbmate up`. |
| 2 | El administrador puede activar/pausar Zelle, actualizar correo/titular y cargar QR desde `/admin/pagos` > `⚙️ Cuentas de Cobro`. | ✅ | `AdminPaymentsComponent` + `AdminPaymentGatewayConfigController` verificados. |
| 3 | El modal de checkout incluye la pestaña Zelle con datos institucionales y formulario de reporte. | ✅ | `CheckoutPagoMovilModalComponent` con tab `ZELLE`, copiado rápido y validación reactiva. |
| 4 | El endpoint `POST /api/v1/payments/zelle/report` almacena la transacción en USD con estado `PENDING_AUDIT` y valida referencias duplicadas. | ✅ | `PaymentService.reportZellePayment` + `DuplicatePaymentReferenceException` (HTTP 409). |
| 5 | La transacción reportada aparece en pagos pendientes del panel admin para su aprobación o rechazo con activación de suscripción. | ✅ | `PaymentControllerIntegrationTest.reportZellePaymentAndAdminApproval_CompleteWorkflow`. |
| 6 | Pruebas automatizadas del backend (`./mvnw test`) en verde. | ✅ | 34 tests ejecutados, 0 fallos. |
| 7 | Pruebas unitarias del frontend (`npm test`) y compilación (`npm run build`) exitosas. | ✅ | Suites Jasmine/Karma y build SSR sin errores. |

---

## 5. Casos Borde y Consideraciones de Seguridad / LOPNNA

* **Prevención de Doble Gasto / Referencias Duplicadas:** Si un tutor intenta registrar un número de confirmación de Zelle ya existente en `payment_transactions`, el servicio lanza `DuplicatePaymentReferenceException` devolviendo `409 Conflict`.
* **Validación de Propiedad del Atleta (Anti-IDOR):** `PaymentService.reportZellePayment` verifica estrictamente que `athlete.getTutor().getId().equals(tutorId)`, lanzando `403 AccessDeniedException` si un usuario intenta reportar pagos para un atleta ajeno.
* **Protección de Archivos en Subida de QR:** El endpoint `POST /api/v1/admin/payments/gateway-settings/zelle-qr` está restringido a `ROLE_ADMIN`, rechaza archivos mayores a 5MB y valida que el MIME type sea exclusivamente `image/png`, `image/jpeg`, `image/jpg` o `image/webp`.
* **Cumplimiento LOPNNA Art. 65:** Ningún dato bancario es requerido al menor de edad; la transacción queda vinculada al usuario adulto responsable (`TUTOR`) y no almacena credenciales ni números de cuenta bancaria sensibles.
