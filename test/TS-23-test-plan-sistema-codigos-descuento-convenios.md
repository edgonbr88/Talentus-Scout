# Plan y Reporte de Pruebas — [TS-23] Sistema de Códigos de Descuento y Convenios con Organizaciones Afiliadas

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-23]**, que implementa el sistema integral de cupones de descuento, convenios institucionales con clubes o academias aliadas, becas deportivas al 100% y panel administrativo de gestión de promociones en Talentus Scout.

### 1.1. Artefactos y Componentes Impactados
* **Base de Datos & Modelo Relacional (PostgreSQL):**
  * Migración DDL dbmate: `talentus-scout-migrations/migrations/20261010190000_create_discount_codes_schema.sql`.
  * Tablas creadas:
    * `discount_codes`: almacena el catálogo de cupones (código único, tipo, valor, límite de usos `max_uses`, usos actuales `current_uses`, `one_use_per_athlete`, restricciones de plan, club/organización aliada, vigencia y estado `is_active`).
    * `discount_code_redemptions`: registro auditable de cada canje vinculado a `discount_code_id`, `athlete_id`, `user_id`, `payment_transaction_id` y montos de ahorro en USD.
  * Modificación de `payment_transactions`: columnas `discount_code_id` (UUID FK) y `discount_amount_usd` (NUMERIC(10,2)).
  * Extensión del enum `payment_method`: adición del valor `'DISCOUNT_CODE'`.
* **Backend (Spring Boot 3 / Java 21 / Project Lombok):**
  * Enum `DiscountType` (`PERCENTAGE`, `FIXED_AMOUNT`) y actualización de `PaymentMethod` con `DISCOUNT_CODE`.
  * Entidades JPA Lombok: `DiscountCode`, `DiscountCodeRedemption` y relación en `PaymentTransaction`.
  * Repositorios Spring Data: `DiscountCodeRepository`, `DiscountCodeRedemptionRepository`.
  * DTOs Lombok con Jakarta Validation:
    * `ValidateCouponRequest`, `ValidateCouponResponse`, `RedeemFreePromoRequest`, `DiscountCodeAdminDto`, `CreateDiscountCodeRequest`, `UpdateDiscountCodeRequest`.
    * Modificados `ReportPagoMovilRequest` y `CreateBinanceOrderRequest` (campo opcional `discountCode`).
    * Modificado `PaymentTransactionResponse` (`discountCode`, `discountAmountUsd`).
  * Servicios:
    * `DiscountCodeService`: validación de cupones en tiempo real con tasa BCV, cálculo de descuentos porcentuales y montos fijos, canje gratuito al 100% con activación inmediata de `AthleteSubscription`, registro en `discount_code_redemptions` e incremento atómico de `currentUses`.
    * `AdminDiscountCodeService`: listado paginado, creación, actualización, alternancia de estado activo/inactivo (`toggleStatus`) y eliminación/archivado.
    * `PaymentService`: integración de cupones en el reporte de Pago Móvil con almacenamiento de FK y monto descontado.
  * Controladores REST:
    * `PaymentController`: `POST /api/v1/payments/coupons/validate` (público / tutores) y `POST /api/v1/payments/coupons/redeem-free` (Rol `TUTOR`).
    * `AdminDiscountCodeController`: CRUD completo bajo `@PreAuthorize("hasRole('ADMIN')")`.
  * Configuración de Seguridad:
    * `SecurityConfig.java`: permitAll para validación previa de cupones y roles estrictos para canje y administración.
* **Frontend (Angular 18+ / SSR):**
  * Modelos TypeScript en `payment.model.ts`.
  * Métodos de servicio en `payment.service.ts`: `validateCoupon`, `redeemFreePromo`, `getAdminDiscountCodes`, `createAdminDiscountCode`, `updateAdminDiscountCode`, `toggleAdminDiscountCodeStatus`, `deleteAdminDiscountCode`, `getClubs`.
  * Modal de Checkout (`CheckoutPagoMovilModalComponent`):
    * Entrada de cupón con botón interactivo de aplicación y validación en tiempo real.
    * Resumen dinámico de precios (monto original, descuento aplicado, total a pagar en USD y en Bs con tasa oficial BCV).
    * Manejo de cupones 100% bonificados: ocultamiento automático de métodos de pago tradicionales y activación con botón directo "⚡ Activar Membresía 100% Bonificada Ahora".
  * Panel de Auditoría Contable (`AdminPaymentsComponent`):
    * Tercera pestaña: *"🏷️ Códigos & Afiliados"*.
    * Tabla con códigos en píldora click-to-copy, badges de organizaciones, beneficios calculados, contador de canjes vs límite y botón interactivo de alternancia Activo/Pausado.
    * Modal para crear y editar cupones con selección de academias/clubes aliados y restricciones de planes.
  * Diseño deportivo adaptado a `fe-desing.md`: estética Bento, paleta oscura con acentos verde cancha y dorado para becas 100%, sin clichés genéricos.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests (Spring Boot)

Comando ejecutado:
```bash
./mvnw test -Dtest=DiscountCodeServiceTest,AdminDiscountCodeControllerTest,PaymentControllerIntegrationTest
```

#### Resultados de Ejecución:
```
[INFO] Running com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 74.92 s -- in com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] Running com.talentus.scout.web.controller.AdminDiscountCodeControllerTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.726 s -- in com.talentus.scout.web.controller.AdminDiscountCodeControllerTest
[INFO] Running com.talentus.scout.service.payment.DiscountCodeServiceTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 11.37 s -- in com.talentus.scout.service.payment.DiscountCodeServiceTest
[INFO] 
[INFO] Results:
[INFO] Tests run: 22, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

#### Detalle de los 22 Casos de Prueba Verificados:
1. **`DiscountCodeServiceTest` (9 pruebas unitarias):**
   * `validateCoupon_Success_PercentageDiscount`: Valida cálculo exacto de descuento porcentual y recálculo con tasa BCV.
   * `validateCoupon_Success_FixedAmountDiscount`: Valida descuento de monto fijo en USD con redondeo adecuado.
   * `validateCoupon_NotFound_ReturnsInvalid`: Retorna `valid: false` ante códigos inexistentes.
   * `validateCoupon_Inactive_ReturnsInvalid`: Rechaza cupones marcados como `isActive = false`.
   * `validateCoupon_Expired_ReturnsInvalid`: Rechaza cupones cuya fecha `expiresAt` ha expirado.
   * `validateCoupon_MaxUsesReached_ReturnsInvalid`: Rechaza cupones que alcanzaron su límite `maxUses`.
   * `validateCoupon_AlreadyUsedByAthlete_ReturnsInvalid`: Rechaza cupón si el atleta ya lo canjeó y tiene la restricción `oneUsePerAthlete = true`.
   * `validateCoupon_PlanRestrictionMismatch_ReturnsInvalid`: Rechaza cupón si está restringido a un plan distinto al seleccionado.
   * `redeemFreePromo_Success_ActivatesSubscriptionImmediately`: Valida el canje del 100%, creación de transacción con método `DISCOUNT_CODE`, activación de `AthleteSubscription` por 30 o 365 días y guardado del registro en `DiscountCodeRedemption`.
2. **`AdminDiscountCodeControllerTest` (6 pruebas de integración MockMvc):**
   * `createDiscountCode_AsAdmin_Success`: Crea nuevo cupón y retorna HTTP 201 Created con el payload administrable.
   * `updateDiscountCode_AsAdmin_Success`: Actualiza valor, descripción y configuración de un cupón existente.
   * `toggleStatus_AsAdmin_Success`: Alterna el estado activo/inactivo con HTTP 200 OK.
   * `deleteDiscountCode_AsAdmin_Success`: Elimina un cupón con HTTP 204 No Content.
   * `getDiscountCodes_AsAdmin_Success`: Retorna la página de cupones con metadatos paginados.
   * `createDiscountCode_AsTutor_Forbidden`: Impide el acceso a usuarios sin rol `ADMIN` retornando HTTP 403 Forbidden.
3. **`PaymentControllerIntegrationTest` (7 pruebas de integración MockMvc):**
   * `validateCoupon_Endpoint_Success`: Prueba endpoint `POST /api/v1/payments/coupons/validate` validando el cálculo en vivo.
   * `redeemFreePromo_Endpoint_Success`: Prueba endpoint `POST /api/v1/payments/coupons/redeem-free` con activación inmediata y verificación de estado `ACTIVE` en la suscripción del atleta.
   * Pruebas previas de Pago Móvil y Binance Pay para garantizar no regresión.

### 2.2. Frontend Build & Compilación Angular SSR

Comando ejecutado:
```bash
npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` en 52 segundos).
* 0 errores de TypeScript, 0 errores de sintaxis en plantillas HTML y CSS.
* Prerenderizado SSR de 10 rutas estáticas completado con éxito.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Crear un Cupón Institucional de Beca al 100% (Administrador)
```bash
curl -s -X POST http://localhost:8080/api/v1/admin/discount-codes \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BECAACADEMIA100",
    "description": "Convenio 100% bonificado con Academia Puerto Cabello",
    "discountType": "PERCENTAGE",
    "discountValue": 100,
    "maxUses": 25,
    "oneUsePerAthlete": true,
    "isActive": true
  }' | jq .
```
**Respuesta esperada:** HTTP 201 con `discountValue: 100`, `isActive: true` y `code: "BECAACADEMIA100"`.

### 3.2. Validar Cupón desde el Checkout (Tutor)
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/coupons/validate \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BECAACADEMIA100",
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY"
  }' | jq .
```
**Respuesta esperada:**
```json
{
  "valid": true,
  "message": "¡Cupón aplicado exitosamente! (Convenio 100% bonificado con Academia Puerto Cabello)",
  "code": "BECAACADEMIA100",
  "discountType": "PERCENTAGE",
  "discountValue": 100,
  "originalAmountUsd": 10.00,
  "discountAmountUsd": 10.00,
  "finalAmountUsd": 0.00,
  "finalAmountVes": 0.00,
  "isFreePromo": true
}
```

### 3.3. Canjear Promoción Gratuita al 100% (Activación Instantánea)
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/coupons/redeem-free \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BECAACADEMIA100",
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY"
  }' | jq .
```
**Respuesta esperada:** HTTP 201 Created con transacción aprobada (`status: "APPROVED"`, `method: "DISCOUNT_CODE"`, `amountUsd: 0.0`).
Consultar suscripción del atleta:
```bash
curl -s http://localhost:8080/api/v1/payments/athlete/<ATHLETE_UUID>/status \
  -H "Authorization: Bearer <TOKEN_TUTOR>" | jq .
```
**Respuesta esperada:** `status: "ACTIVE"`, `canAccessRadar: true`.

### 3.4. Pago Móvil con Descuento Parcial (Ej: 30% OFF)
```bash
# Reportar Pago Móvil pasando el cupón de descuento
curl -s -X POST http://localhost:8080/api/v1/payments/pago-movil/report \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY",
    "referenceNumber": "12345678",
    "originBank": "0102 - BANCO DE VENEZUELA",
    "originPhone": "04141234567",
    "paymentDate": "2026-10-10",
    "discountCode": "PROMO30"
  }' | jq .
```
**Respuesta esperada:** Transacción creada con `discountCode: "PROMO30"`, `discountAmountUsd: 3.00` y `amountUsd: 7.00`.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| Tabla `discount_codes` y `discount_code_redemptions` creadas con llaves foráneas e índices | ✅ CUMPLIDO | Migración DDL dbmate `20261010190000_create_discount_codes_schema.sql` aplicada. |
| Soporte para descuentos porcentuales (1-100%) y montos fijos en USD | ✅ CUMPLIDO | Modelado en `DiscountType` y validado en `DiscountCodeServiceTest`. |
| Validación de límite de canjes (`max_uses`) y restricción de 1 uso por atleta | ✅ CUMPLIDO | Implementado con comprobación en `discount_code_redemptions` y probado unitariamente. |
| Canje 100% bonificado activa la suscripción Pro de inmediato sin pasarela | ✅ CUMPLIDO | Endpoint `POST /coupons/redeem-free` ejecutado y probado en `PaymentControllerIntegrationTest`. |
| Cupones parciales se integran con Pago Móvil y Binance Pay | ✅ CUMPLIDO | Campos `discountCode` y `discountAmountUsd` integrados en los DTOs y persistidos en base de datos. |
| CRUD y alternancia de estado para administradores con seguridad RBAC | ✅ CUMPLIDO | `AdminDiscountCodeController` protegido con `hasRole('ADMIN')` y 6 tests de integración pasando. |
| UI de Checkout con aplicación reactiva de cupones y desglose de precios | ✅ CUMPLIDO | `CheckoutPagoMovilModalComponent` con feedback de cupón, cálculo de tasas BCV y modo 100% bonificado. |
| Panel de administración con pestaña de cupones, selector de clubes y switch de estado | ✅ CUMPLIDO | `AdminPaymentsComponent` con pestaña Bento *"🏷️ Códigos & Afiliados"* y modal de creación/edición. |
| Cumplimiento de directivas de diseño de `fe-desing.md` | ✅ CUMPLIDO | Tokens deportivos, badges con glow en becas 100%, click-to-copy y sin clichés de IA. |
| Compilación sin errores en backend y frontend | ✅ CUMPLIDO | Maven 22 tests OK (`BUILD SUCCESS`), Angular SSR build OK (`Exit code 0`). |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Idempotencia y Prevención de Abuso:**
   * La regla `oneUsePerAthlete` consulta la tabla `discount_code_redemptions` antes de aplicar el cupón, impidiendo que el mismo atleta disfrute de múltiples activaciones con el mismo código.
2. **Validación de Cupón 100% vs Pasarela:**
   * Si un cupón cubre la totalidad ($0 USD restantes), el modal oculta los campos bancarios o QR de pago y muestra un botón directo para evitar errores de reportes bancarios vacíos.
3. **Control de Expiración:**
   * La validación compara `Instant.now()` contra `expiresAt` y `startsAt`. Cupones fuera de rango son rechazados de forma clara.
4. **Protección Administrativa:**
   * Únicamente administradores autenticados pueden crear, modificar o desactivar códigos de descuento (`AdminDiscountCodeControllerTest.createDiscountCode_AsTutor_Forbidden` validado).
