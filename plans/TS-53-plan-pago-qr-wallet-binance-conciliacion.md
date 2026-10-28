# Plan de Implementación: [TS-53] Pago con QR o Dirección de Wallet (Binance/USDT) con Reporte y Conciliación Administrativa

**ID Tarea:** TS-53  
**Tarjeta Trello:** [https://trello.com/c/dK4PIT09](https://trello.com/c/dK4PIT09)  
**ID de Tarjeta:** `6ad8b4117c232a26fb58b94b`  
**Lista en Trello:** `in development`  
**Sprint:** 4  
**Fecha:** 21 de octubre de 2026  
**Estado del Plan:** IMPLEMENTACIÓN COMPLETADA — EN TESTING  
**Agente Planificador:** trello_planner  
**Agente Implementador:** trello_implementer  

---

## 1. Identificación y Objetivos

El objetivo de esta tarea es implementar un flujo de pago con criptoactivos (USDT) desasistido a nivel de pasarela externa pero 100% asistido administrativamente mediante **Binance Pay ID y Wallet Address personal**, evitando las restricciones y costos de cuentas corporativas institucionales (*Binance Merchant API*).

El tutor podrá seleccionar la opción de pago con Binance/USDT, visualizar el código QR oficial de recepción, copiar la dirección de billetera y el Binance Pay ID con un solo clic, realizar la transferencia desde su aplicación y registrar la referencia de pago (TxID / Order ID). La transacción ingresará en estado `PENDING_AUDIT` para ser verificada y aprobada con 1 clic por el administrador en `/admin/pagos`, activando de inmediato la suscripción del atleta.

---

## 2. Resumen y Contexto de Negocio

- **Problema que resuelve:**
  Permitir cobros internacionales en divisas (USDT) sin intermediarios financieros tradicionales ni comisiones de pasarela. Los fundadores de Talentus Scout disponen de cuentas personales de Binance, por lo que este flujo semiautomatizado proporciona una vía inmediata de monetización antes de la formalización mercantil internacional.
- **Protección al Menor y LOPNNA (Art. 65):**
  - Transparencia total de paridad (1 USD = 1 USDT).
  - No se almacenan ni solicitan llaves privadas, contraseñas ni datos bancarios sensibles del tutor.
  - La activación del plan Pro se garantiza tras la conciliación administrativa y se notifica inmediatamente por correo electrónico.

---

## 3. Arquitectura y Modelo de Datos

### 3.1. Esquema de Base de Datos (PostgreSQL)
La tabla `payment_transactions` ya cuenta con los campos necesarios para este flujo:
* `id` (UUID v7, PK)
* `user_id` (UUID, FK `users`)
* `athlete_id` (UUID, FK `athletes`)
* `plan_id` (VARCHAR, FK `subscription_plans`)
* `method` (Enum `payment_method`: soporta `BINANCE_PAY`)
* `amount_usd` (NUMERIC(10,2))
* `reference_number` (VARCHAR(100))
* `payment_date` (DATE)
* `status` (Enum `payment_status`: `PENDING_AUDIT`, `APPROVED`, `REJECTED`)
* `gateway_order_id` (VARCHAR(100), opcional para almacenar la referencia externa o TxID)
* `discount_code_id` (UUID, FK opcional `discount_codes`)
* `discount_amount_usd` (NUMERIC(10,2))

*Nota DDL:* No se requieren nuevas migraciones DDL ya que `payment_transactions` fue diseñada en `TS-02` y enriquecida en `TS-16`/`TS-23` con compatibilidad para `BINANCE_PAY` y estados de auditoría.

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Configuración de Propiedades (`application.yml`)
Incorporar las propiedades de recepción de Binance en `talentus.payments.binance`:
```yaml
talentus:
  payments:
    binance:
      pay-id: ${BINANCE_PAY_ID:283918273}
      wallet-address: ${BINANCE_WALLET_ADDRESS:TLsV5289FjK93kdJ8193jd93kd9}
      network: ${BINANCE_NETWORK:TRC-20 (Tron) / BSC (BEP-20)}
      qr-image-url: ${BINANCE_QR_IMAGE_URL:/assets/images/binance-qr-sample.png}
```

### 4.2. DTOs a Modificar / Crear

1. **`PaymentConfigResponse.java`:**
   Agregar los campos de Binance con `@Getter`, `@Setter`, `@Builder`:
   ```java
   private String binancePayId;
   private String binanceWalletAddress;
   private String binanceNetwork;
   private String binanceQrImageUrl;
   ```

2. **`ReportBinanceManualPaymentRequest.java`** (`com.talentus.scout.web.dto`):
   ```java
   package com.talentus.scout.web.dto;

   import jakarta.validation.constraints.NotBlank;
   import jakarta.validation.constraints.NotNull;
   import jakarta.validation.constraints.Size;
   import lombok.*;

   import java.time.LocalDate;
   import java.util.UUID;

   @Getter
   @Setter
   @NoArgsConstructor
   @AllArgsConstructor
   @Builder
   public class ReportBinanceManualPaymentRequest {

       @NotNull(message = "El identificador del atleta es obligatorio.")
       private UUID athleteId;

       @NotBlank(message = "El plan de suscripción es obligatorio.")
       private String planId;

       @NotBlank(message = "El número de orden o referencia de Binance es obligatorio.")
       @Size(min = 4, max = 100, message = "La referencia debe contener entre 4 y 100 caracteres.")
       private String referenceNumber;

       @NotNull(message = "La fecha de pago es obligatoria.")
       private LocalDate paymentDate;

       private String originAccount; // Nickname o wallet origen opcional

       private String discountCode;
   }
   ```

### 4.3. Servicios

1. **`PaymentConfigService.java`:**
   Inyectar las propiedades `@Value` de Binance y mapearlas en `PaymentConfigResponse`.

2. **`PaymentService.java`:**
   Implementar el método de reporte manual:
   ```java
   @Transactional
   public PaymentTransactionResponse reportBinanceManual(UUID userId, ReportBinanceManualPaymentRequest request);
   ```
   * **Reglas:**
     * Validar existencia del usuario y relación con el atleta (o rol admin).
     * Validar unicidad del `referenceNumber` en `paymentTransactionRepository`. Si ya existe una transacción con esa referencia, lanzar `DuplicatePaymentReferenceException` (HTTP 409).
     * Validar y aplicar código de descuento si fue suministrado (`DiscountCodeService`).
     * Construir entidad `PaymentTransaction` con `Lombok.builder()`:
       * `method = PaymentMethod.BINANCE_PAY`
       * `status = PaymentStatus.PENDING_AUDIT`
       * `referenceNumber = request.getReferenceNumber().trim()`
       * `amountUsd = finalAmountUsd`
       * `amountVes = BigDecimal.ZERO`
       * `bcvExchangeRate = BigDecimal.ZERO`
       * `originBank = "Binance Pay / USDT"`
     * Persistir transacción y retornar DTO `PaymentTransactionResponse`.

### 4.4. Controladores REST

1. **`PaymentController.java`:**
   Nuevo endpoint autenticado:
   ```java
   @PostMapping("/binance-pay/manual-report")
   @PreAuthorize("hasAnyRole('TUTOR', 'ADMIN')")
   public ResponseEntity<PaymentTransactionResponse> reportBinanceManual(
           Authentication authentication,
           @Valid @RequestBody ReportBinanceManualPaymentRequest request
   );
   ```

2. **`AdminPaymentService.java` y `AdminPaymentController.java`:**
   * Las transacciones de `BINANCE_PAY` con estado `PENDING_AUDIT` son devueltas en `getPendingPayments()`.
   * El método `approvePayment(transactionId, adminId)` ya activa la `AthleteSubscription` y envía la notificación por correo. No requiere modificaciones lógicas, solo certificar la no regresión.

---

## 5. Especificación Frontend (Angular 18+)

### 5.1. Modelos e Interfaces (`payment.model.ts`)
* Actualizar `PaymentConfigResponse` con:
  ```typescript
  binancePayId?: string;
  binanceWalletAddress?: string;
  binanceNetwork?: string;
  binanceQrImageUrl?: string;
  ```
* Crear interfaz:
  ```typescript
  export interface ReportBinanceManualPaymentRequest {
    athleteId: string;
    planId: string;
    referenceNumber: string;
    paymentDate: string;
    originAccount?: string;
    discountCode?: string;
  }
  ```

### 5.2. Servicio Angular (`payment.service.ts`)
* Agregar método:
  ```typescript
  reportBinanceManual(request: ReportBinanceManualPaymentRequest): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>('/api/v1/payments/binance-pay/manual-report', request);
  }
  ```

### 5.3. Componente Modal de Checkout (`checkout-pago-movil-modal`)
* **Separación de Plantillas:** Mantener archivos separados `checkout-pago-movil-modal.component.html`, `.component.ts` y `.component.css`.
* **Diseño e Interacción (Directivas de `frontend-design`):**
  1. En el tab **Binance Pay**:
     * Mostrar Bento Grid con estética oscura y acentos amarillo cripto (`#F0B90B` / `#FCD535` armonizado con el diseño deportivo).
     * **Caja de QR y Datos de Recepción:**
       * Imagen de código QR nítida con borde contrastado.
       * Sección con **Binance Pay ID**: código en fuente monospace + botón *"Copiar Pay ID"* con microanimación y feedback táctil.
       * Sección con **Dirección de Billetera (Wallet)**: dirección alfanumérica + botón *"Copiar Wallet"* con toast de confirmación.
       * **Badge de Red:** Advertencia visual *"Red: USDT TRC-20 / BEP-20 (No transferir por otras redes)"*.
     * **Formulario de Reporte de Pago:**
       * Campo reactivo: *"Número de Orden de Binance o Referencia TxID"*, con validación obligatoria.
       * Campo de fecha de transferencia (por defecto hoy).
       * Campo opcional: *"Usuario de Binance o Nota del Remitente"*.
       * Botón de acción principal: *"⚡ Registrar Transferencia Binance"* con spinner de carga.
  2. Al enviar exitosamente:
     * Emitir `paymentReported` con la respuesta.
     * Desplegar notificación de éxito indicando que el pago será verificado en breve por el equipo administrativo.

### 5.4. Panel Administrativo (`admin-payments.component.html`)
* En la lista de pagos pendientes (`PENDING_AUDIT`), las transacciones con método `BINANCE_PAY` se visualizan con el badge amarillo característico y permiten al administrador aprobarlas o rechazarlas con un clic.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Unitarias e Integración Backend
* `PaymentControllerTest` / `PaymentServiceTest`:
  * `reportBinanceManual_ValidRequest_ReturnsCreatedAndPendingStatus`
  * `reportBinanceManual_DuplicateReference_Returns409Conflict`
  * `reportBinanceManual_InvalidPlan_Returns400BadRequest`
  * `approvePayment_BinanceManual_ActivatesAthleteSubscription`

### 6.2. Pruebas Frontend (Jasmine/Karma)
* `checkout-pago-movil-modal.component.spec.ts`:
  * Validar renderizado de QR y botones de copiado de Wallet y Pay ID.
  * Validar envío de formulario de reporte manual hacia `reportBinanceManual`.
  * Validar manejo de errores y estados de carga.

### 6.3. Verificación Manual Paso a Paso
1. Iniciar sesión como tutor legal y abrir el modal de plan Pro para un atleta.
2. Seleccionar el tab "Binance Pay".
3. Verificar que se muestre el código QR, la dirección de wallet y el Pay ID.
4. Probar los botones de copiado al portapapeles.
5. Ingresar una referencia de prueba (ej. `BINANCE-TX-998877`) y reportar.
6. Iniciar sesión como administrador en `/admin/pagos`.
7. Verificar que la transacción figure en estado `PENDING_AUDIT` con método `BINANCE_PAY`.
8. Aprobar el pago con 1 clic y comprobar que la suscripción del atleta cambia a `ACTIVE`.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **1. Backend:** Añadir propiedades de Binance personal en `application.yml`.
- [x] **2. Backend:** Modificar `PaymentConfigResponse.java` y `PaymentConfigService.java` para exponer las variables de recepción.
- [x] **3. Backend:** Crear DTO `ReportBinanceManualPaymentRequest.java` con validaciones Jakarta Bean Validation.
- [x] **4. Backend:** Implementar `reportBinanceManual` en `PaymentService.java` con validación de referencia duplicada.
- [x] **5. Backend:** Exponer endpoint `POST /api/v1/payments/binance-pay/manual-report` en `PaymentController.java`.
- [x] **6. Backend:** Escribir pruebas unitarias e integración en el backend (`./mvnw test`).
- [x] **7. Frontend:** Actualizar modelos en `payment.model.ts` e implementar `reportBinanceManual` en `payment.service.ts`.
- [x] **8. Frontend:** Modificar `checkout-pago-movil-modal.component.html`, `.component.ts` y `.component.css` implementando la vista de QR, Wallet Address y formulario de reporte.
- [x] **9. Frontend:** Ejecutar y actualizar pruebas unitarias de frontend (`npm test`).
- [x] **10. Pruebas y Validación:** Redactar documento de pruebas en `test/TS-53-test-plan-pago-qr-wallet-binance-conciliacion.md`.
- [x] **11. Transición:** Mover la tarjeta en Trello de `in development` a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (DoD)

1. El endpoint `/api/v1/payments/config` entrega `binancePayId`, `binanceWalletAddress`, `binanceNetwork` y `binanceQrImageUrl`.
2. El modal de checkout muestra el código QR de recepción, el Pay ID y la dirección de billetera con botones funcionales de copiado.
3. El tutor puede enviar la referencia de transacción (TxID / Order ID) mediante el formulario reactivo.
4. La transacción se persiste en `payment_transactions` con método `BINANCE_PAY` y estado `PENDING_AUDIT`.
5. Si se intenta reportar una referencia ya existente, el backend responde con error 409 descriptivo.
6. El panel de administración en `/admin/pagos` muestra la transacción pendiente y permite su aprobación en 1 clic.
7. Al aprobar el pago, la suscripción del atleta pasa automáticamente a estado `ACTIVE` por los días contratados.
8. Las suites de pruebas de backend (`./mvnw test`) y frontend (`npm test`) compilan y pasan al 100% sin regresiones.
