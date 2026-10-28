# Plan de Implementación — [TS-44] Corrección de Validación y Envío de Monto en Bolívares (amountVes) en Reporte de Pago Móvil

## 1. Identificación de la Tarea
* **ID:** `TS-44`
* **Título:** Corrección de validación y envío de monto en bolívares (amountVes) en reporte de Pago Móvil
* **Trello Card:** [https://trello.com/c/2Ltpkg6J](https://trello.com/c/2Ltpkg6J) (ID: `6ad6144e38e9260c6a96e2ea`)
* **Sprint:** Sprint 4
* **Estado Actual:** `in development`
* **Dependencias:** `TS-16` (Monetización con Pago Móvil), `TS-23` (Sistema de Cupones de Descuento)
* **Agente Planificador:** `trello_planner`

---

## 2. Resumen y Contexto de Negocio
Durante el flujo de suscripción Pro para habilitar la visibilidad de atletas en el Directorio Nacional de Scouts, los tutores legales realizan pagos a través de Pago Móvil interbancario (tasa oficial BCV). Al presionar el botón "Reportar Pago Realizado" en el modal de checkout, el backend retornaba un error `400 BAD_REQUEST` con el mensaje:
> *"amountVes: El monto en bolívares es obligatorio"*

### Diagnóstico de Causa Raíz
1. **Frontend:** El formulario modal de checkout (`checkout-pago-movil-modal.component.ts`) calcula y muestra el monto exacto en bolívares (`calculatedAmountVes`), pero en su método `submitReport()` omitía enviar dicho campo y la tasa oficial en el objeto `ReportPagoMovilRequest`.
2. **Backend:** El DTO `ReportPagoMovilRequest.java` poseía la anotación restrictiva `@NotNull(message = "El monto en bolívares es obligatorio")` en el campo `amountVes`.
3. **Estrategia Acordada (Doble Blindaje):**
   - **Frontend:** Asegurar que el modal despache siempre el valor de `amountVes` (respetando cualquier descuento por cupón) y la tasa `bcvRate` visible al usuario.
   - **Backend:** Flexibilizar la validación de `amountVes` (haciéndolo opcional en el DTO) y dotar a `PaymentService` de una lógica resiliente de fallback: si el cliente REST o frontend no provee `amountVes` (o es nulo/cero), el backend calcula de forma determinista el monto multiplicando el importe efectivo en USD (`effectiveAmountUsd`) por la tasa BCV del día (`bcvRate`) con redondeo bancario estándar (`RoundingMode.HALF_UP`).

---

## 3. Modelo de Datos y Migraciones
* **Impacto en Base de Datos:** **Ninguno (No requiere migraciones DDL)**.
* **Esquema Existente:** La tabla `payment_transactions` ya cuenta con los campos necesarios definidos en la migración de `TS-16`:
  - `amount_ves NUMERIC(14,2)`
  - `bcv_exchange_rate NUMERIC(10,4)`
* **Compatibilidad:** Ambas columnas admiten y almacenan con total precisión los montos calculados y redondeados.

---

## 4. Especificación Backend: Spring Boot 3 (Java 21)

### 4.1 Modificación de DTO `ReportPagoMovilRequest.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/ReportPagoMovilRequest.java`
* **Cambios:**
  - Remover la anotación `@NotNull(message = "El monto en bolívares es obligatorio")` sobre el atributo `amountVes`.
  - Conservar `@DecimalMin(value = "0.01", message = "El monto debe ser mayor a 0")` para garantizar que si el cliente suministra un valor numérico, este sea estrictamente positivo (recordando que en Bean Validation, `@DecimalMin` valida si el valor no es nulo, permitiendo nulos cuando no hay `@NotNull`).
  - Asegurar la presencia del atributo opcional `private BigDecimal bcvRate;`.

### 4.2 Lógica de Negocio y Fallback Resiliente en `PaymentService.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/payment/PaymentService.java`
* **Método:** `public PaymentTransactionResponse reportPagoMovil(UUID tutorId, ReportPagoMovilRequest request)`
* **Lógica a incorporar:**
  ```java
  // Resolver tasa BCV efectiva
  BigDecimal bcvRate = request.getBcvRate();
  if (bcvRate == null || bcvRate.compareTo(BigDecimal.ZERO) <= 0) {
      bcvRate = bcvRateService.getOfficialRate().getRate();
  }

  // Resolver monto en Bolívares (amountVes) con doble blindaje / fallback resiliente
  BigDecimal amountVes = request.getAmountVes();
  if (amountVes == null || amountVes.compareTo(BigDecimal.ZERO) <= 0) {
      amountVes = effectiveAmountUsd.multiply(bcvRate).setScale(2, java.math.RoundingMode.HALF_UP);
  }
  ```
* **Asignación en Builder de `PaymentTransaction`:**
  ```java
  PaymentTransaction transaction = PaymentTransaction.builder()
          .user(athlete.getTutor())
          .athlete(athlete)
          .plan(plan)
          .method(PaymentMethod.PAGO_MOVIL)
          .amountUsd(effectiveAmountUsd)
          .amountVes(amountVes)
          .bcvExchangeRate(bcvRate)
          ...
  ```

### 4.3 Pruebas Automatizadas Backend
1. **`PaymentServiceTest.java`:**
   - `reportPagoMovil_WithExplicitAmountVes_Success`: Valida que cuando el request incluye `amountVes`, este se persista exactamente como fue enviado.
   - `reportPagoMovil_WithoutAmountVes_CalculatesFallbackAutomatically`: Valida que cuando `amountVes` es `null`, el servicio calcula automáticamente `effectiveAmountUsd.multiply(bcvRate).setScale(2, RoundingMode.HALF_UP)`.
2. **`PaymentControllerIntegrationTest.java`:**
   - Probar envío de `report-pago-movil` omitiendo `amountVes` en el JSON: verificar respuesta HTTP 201 (`CREATED`) y que el JSON resultante contenga el `amountVes` calculado.

---

## 5. Especificación Frontend: Angular 18+ (Standalone)

### 5.1 Actualización de Interfaz TypeScript `ReportPagoMovilRequest`
* **Ruta:** `talentus-scout-fe/src/app/core/models/payment.model.ts`
* **Definición:**
  ```typescript
  export interface ReportPagoMovilRequest {
    athleteId: string;
    planId: string;
    referenceNumber: string;
    paymentDate: string; // YYYY-MM-DD
    amountVes?: number;
    bcvRate?: number;
    originBank?: string;
    originPhone?: string;
    discountCode?: string;
  }
  ```

### 5.2 Actualización de Modal de Checkout `checkout-pago-movil-modal.component.ts`
* **Ruta:** `talentus-scout-fe/src/app/features/payments/checkout-pago-movil-modal.component.ts`
* **Modificación en `submitReport()`:**
  - Incluir `amountVes: this.calculatedAmountVes`
  - Incluir `bcvRate: this.bcvRate()?.officialRate`
  ```typescript
  this.paymentService.reportPagoMovil({
    athleteId: this.athlete.id,
    planId: plan.id,
    referenceNumber: this.referenceNumber.trim(),
    paymentDate: this.paymentDate,
    amountVes: this.calculatedAmountVes,
    bcvRate: this.bcvRate()?.officialRate,
    originBank: this.originBank,
    originPhone: this.originPhone ? this.originPhone.trim() : undefined,
    discountCode: this.appliedCoupon()?.code
  }).subscribe({ ... });
  ```

### 5.3 Pruebas Automatizadas Frontend
* **Ruta:** `talentus-scout-fe/src/app/features/payments/checkout-pago-movil-modal.component.spec.ts`
* **Casos de Prueba:**
  - Debe instanciar el componente correctamente.
  - Al ejecutar `submitReport()` con datos válidos, debe invocar `paymentService.reportPagoMovil` enviando `amountVes` correspondiente a `calculatedAmountVes` y la tasa `bcvRate`.
  - Debe gestionar adecuadamente el cálculo con cupón de descuento activo.

---

## 6. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Backend - Flexibilización de DTO**
  - Abrir `ReportPagoMovilRequest.java`.
  - Remover la anotación `@NotNull` sobre `amountVes`, conservando `@DecimalMin("0.01")`.
- [x] **Paso 2: Backend - Resiliencia de Cálculo en Servicio**
  - Abrir `PaymentService.java`.
  - En `reportPagoMovil()`, evaluar si `request.getAmountVes()` es nulo o menor/igual a 0; si es así, calcular `amountVes = effectiveAmountUsd.multiply(bcvRate).setScale(2, RoundingMode.HALF_UP)`.
  - Asignar el `amountVes` calculado o provisto a la entidad `PaymentTransaction`.
- [x] **Paso 3: Backend - Pruebas Unitarias e Integración**
  - Agregar casos de prueba en `PaymentServiceTest.java` (con monto explícito y sin monto con cálculo automático).
  - Agregar caso de prueba en `PaymentControllerIntegrationTest.java` validando el reporte sin `amountVes`.
  - Ejecutar `./mvnw test` en el módulo backend y verificar paso 100% en verde.
- [x] **Paso 4: Frontend - Actualización de Modelo y Envío en Modal**
  - Modificar `ReportPagoMovilRequest` en `payment.model.ts` incorporando `amountVes?: number` y `bcvRate?: number`.
  - Actualizar `submitReport()` en `checkout-pago-movil-modal.component.ts` para enviar `amountVes: this.calculatedAmountVes` y `bcvRate: this.bcvRate()?.officialRate`.
- [x] **Paso 5: Frontend - Pruebas Unitarias**
  - Crear o actualizar pruebas en `checkout-pago-movil-modal.component.spec.ts`.
  - Ejecutar `npm test` en `talentus-scout-fe` y validar compilación y pruebas.
- [x] **Paso 6: Documentación y Transición**
  - Generar el plan de pruebas en `test/TS-44-test-plan-correccion-validacion-envio-amountves-pago-movil.md`.
  - Mover la tarjeta Trello `TS-44` a `in testing` mediante script.

---

## 7. Criterios de Aceptación (Definition of Done - DoD)

1. **Sin Error 400 Bad Request en Checkout:** El tutor puede enviar exitosamente el reporte de Pago Móvil desde el modal sin recibir el error `BAD_REQUEST: amountVes: El monto en bolívares es obligatorio`.
2. **Doble Blindaje Comprobado:**
   - Si el frontend envía `amountVes`, el backend respeta y guarda exactamente dicho valor.
   - Si una llamada de API omite `amountVes`, el backend calcula automáticamente el monto (`effectiveAmountUsd * bcvRate`) con redondeo a 2 decimales `HALF_UP`.
3. **Persistencia y Trazabilidad:** Las columnas `amount_ves` y `bcv_exchange_rate` en `payment_transactions` se guardan de forma coherente y son visibles en el panel administrativo de auditoría (`/admin/pagos`).
4. **Verificación Automatizada:**
   - Pruebas backend (`./mvnw test`) y frontend (`npm test`) ejecutadas y aprobadas.
   - Compilación exitosa en ambos módulos sin errores de TypeScript ni linter.
