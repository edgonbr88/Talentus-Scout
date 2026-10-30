# Plan de Pruebas: [TS-44] Corrección de Validación y Envío de Monto en Bolívares (amountVes) en Reporte de Pago Móvil

**ID Tarea:** TS-44  
**Tarjeta Trello:** [https://trello.com/c/2Ltpkg6J](https://trello.com/c/2Ltpkg6J)  
**Fecha:** 2026-10-19  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** `trello_implementer`  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la operatividad fluida y robusta del reporte de pagos móviles para la activación o renovación de suscripciones Pro en Talentus Scout, eliminando el error de validación `400 BAD_REQUEST` (*"amountVes: El monto en bolívares es obligatorio"*).

Se implementó y verificó la estrategia de **doble blindaje**:
1. **Frontend (Angular 18+):** El componente modal de checkout envía explícitamente en su payload el monto calculado en bolívares (`amountVes`) y la tasa oficial BCV (`bcvRate`) visibles para el tutor, considerando cualquier código de descuento o convenio aplicado.
2. **Backend (Spring Boot 3 / Java 21):** El DTO `ReportPagoMovilRequest` flexibiliza la validación de `amountVes` (removiendo `@NotNull` y conservando `@DecimalMin("0.01")`). A su vez, `PaymentService` provee un mecanismo de fallback resiliente que calcula automáticamente el monto en bolívares (`effectiveAmountUsd * bcvRate` redondeado con `RoundingMode.HALF_UP`) cuando el valor no es suministrado o llega nulo/cero.

### Componentes Impactados
* **Backend (`talentus-scout-be`):**
  * `com.talentus.scout.web.dto.ReportPagoMovilRequest`: Remoción de `@NotNull` sobre `amountVes`.
  * `com.talentus.scout.service.payment.PaymentService`: Lógica de fallback para cálculo determinista de `amountVes`.
  * `com.talentus.scout.service.payment.PaymentServiceTest`: Pruebas unitarias de cálculo explícito y fallback automático.
  * `com.talentus.scout.web.controller.PaymentControllerIntegrationTest`: Prueba de integración end-to-end omitiendo `amountVes` en el payload REST.
* **Frontend (`talentus-scout-fe`):**
  * `src/app/core/models/payment.model.ts`: Actualización de interfaz `ReportPagoMovilRequest` con `amountVes?: number` y `bcvRate?: number`.
  * `src/app/features/payments/checkout-pago-movil-modal.component.ts`: Despacho de `amountVes` y `bcvRate` en `submitReport()`.
  * `src/app/features/payments/checkout-pago-movil-modal.component.spec.ts`: Suite de pruebas unitarias para el modal de checkout.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=PaymentServiceTest,PaymentControllerIntegrationTest
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Errores | Estado |
|---|---|---|---|---|---|
| `PaymentServiceTest` | 6 | 6 | 0 | 0 | **PASSED** |
| `PaymentControllerIntegrationTest` | 8 | 8 | 0 | 0 | **PASSED** |
| **Total Backend** | **14** | **14** | **0** | **0** | **100% OK** |

#### Casos de Prueba Verificados en Backend:
1. `reportPagoMovil_Success_CreatesPendingAuditTransaction`: Registro exitoso con `amountVes` provisto explícitamente (se respeta el monto enviado por el cliente).
2. `reportPagoMovil_WithoutAmountVes_CalculatesFallbackAutomatically`: Registro exitoso cuando `amountVes` es nulo; el servicio calcula automáticamente `effectiveAmountUsd * bcvRate` (5.00 * 45.50 = 227.50 VES).
3. `reportPagoMovil_WithCustomBcvRateAndZeroAmountVes_CalculatesWithCustomRate`: Registro exitoso cuando el cliente envía una tasa `bcvRate` personalizada y omite `amountVes` (5.00 * 50.00 = 250.00 VES).
4. `reportPagoMovil_WithoutAmountVes_SuccessCalculatesAutomatically (Integration Test)`: Endpoint `/api/v1/payments/report-pago-movil` invocado sin `amountVes` responde `201 CREATED`, persistiendo `amountVes` calculado y estado `PENDING_AUDIT`.
5. `reportPagoMovilAndAdminApproval_CompleteWorkflow (Integration Test)`: Flujo completo de reporte, consulta de pagos pendientes por administrador y aprobación final con activación de membresía Pro.

---

### 2.2. Frontend (Angular 18+ / Jasmine & Karma)
Comandos ejecutados:
```bash
# Prueba focalizada del componente de pagos
npm test -- --include src/app/features/payments/checkout-pago-movil-modal.component.spec.ts --watch=false

# Suite completa de regresión
npm test -- --watch=false
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `CheckoutPagoMovilModalComponent` | 6 | 6 | 0 | **PASSED** |
| **Suite Completa Frontend** | **101** | **101** | **0** | **100% OK** |

#### Casos de Prueba Verificados en Frontend:
1. `debe crearse e inicializar el plan por defecto y la tasa oficial BCV`: Carga inicial de planes y tasa desde el servicio.
2. `debe calcular correctamente calculatedAmountVes multiplicando precio USD por la tasa BCV`: Verificación matemática del cálculo en pantalla (5.00 USD * 45.50 = 227.50 VES).
3. `debe despachar submitReport() incluyendo amountVes y bcvRate en el payload (doble blindaje TS-44)`: Validación de que `paymentService.reportPagoMovil` recibe `amountVes: 227.50` y `bcvRate: 45.50`.
4. `debe enviar amountVes con descuento aplicado cuando hay un cupón activo`: Validación con cupón del 20% (finalAmountUsd: 4.00, finalAmountVes: 182.00, discountCode: 'DESCUENTO20').
5. `debe validar que el número de referencia tenga al menos 4 caracteres antes de enviar`: Control preventivo de entrada de datos.
6. `debe emitir close cuando el usuario cierra el modal`: Comportamiento de navegación y cierre.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Caso 1: Envío sin `amountVes` (Prueba de Fallback en Backend)
```bash
curl -X POST http://localhost:8080/api/v1/payments/report-pago-movil \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY",
    "referenceNumber": "12345678",
    "paymentDate": "2026-10-19",
    "originBank": "Banesco",
    "originPhone": "04141234567"
  }'
```
* **Respuesta Esperada (`201 CREATED`):**
```json
{
  "id": "e4902a78-866f-4631-beb9-bf8f4985b1de",
  "athleteId": "<ATHLETE_UUID>",
  "planId": "PRO_MONTHLY",
  "method": "PAGO_MOVIL",
  "amountUsd": 5.00,
  "amountVes": 227.50,
  "bcvExchangeRate": 45.50,
  "referenceNumber": "12345678",
  "status": "PENDING_AUDIT"
}
```

### 3.2. Caso 2: Reporte desde Modal de Checkout en Frontend
1. Iniciar sesión como tutor legal y acceder a `/dashboard`.
2. En la tarjeta de un atleta con plan inactivo, presionar **"Activar Plan Pro"**.
3. Seleccionar la pestaña **"Pago Móvil"**.
4. Constatar que se muestra el monto exacto en Bolívares (ej. `Bs. 227,50` calculado a tasa oficial).
5. Completar los datos de referencia bancaria (ej. `998877`), banco emisor y teléfono de origen.
6. Presionar **"Reportar Pago Realizado"**.
7. **Resultado:** El modal procesa la solicitud sin desplegar error `BAD_REQUEST`, emite el evento exitoso y muestra la confirmación de reporte en auditoría.

---

## 4. Matriz de Criterios de Aceptación (DoD)

- [x] **Cero Errores 400 por validación de monto:** El tutor reporta Pago Móvil sin recibir error de validación `amountVes: El monto en bolívares es obligatorio`.
- [x] **Doble Blindaje Operativo:** El modal de Angular 18+ envía `amountVes` y `bcvRate`, y el backend calcula el valor de forma automática si un cliente omite el campo.
- [x] **Consistencia en Base de Datos:** Las columnas `amount_ves` y `bcv_exchange_rate` se almacenan con precisión y se reflejan en el panel administrativo `/admin/pagos`.
- [x] **Compilación y Pruebas Automatizadas:** Backend (`./mvnw test`) y Frontend (`npm test`, `npm run build`) en estado 100% aprobado sin advertencias ni regresiones.

---

## 5. Casos Borde y Validaciones Críticas

* **Monto Negativo o Cero en Request:** Si un cliente envía deliberadamente un monto inválido (`"amountVes": -10` o `"amountVes": 0`), la validación `@DecimalMin("0.01")` o el fallback resiliente protegen la transacción calculando el valor real según el plan y la tasa.
* **Tasa BCV No Disponible en Request:** Si `bcvRate` no es enviado, `PaymentService` obtiene la tasa oficial en caché o en vivo a través de `BcvRateService`.
* **Cupones de Descuento (TS-23):** Cuando se aplica un cupón (porcentaje o monto fijo), `calculatedAmountVes` y `effectiveAmountUsd` respetan el descuento en ambos extremos.
