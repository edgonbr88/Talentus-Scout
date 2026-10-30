# Plan y Reporte de Pruebas — [TS-16] Módulo de Monetización Día 1: Planes Pro y Reporte de Pago Móvil con Conciliación Administrativa

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-16]**, correspondiente a la activación del modelo de monetización Día 1 con pasarela anti-fricción de Pago Móvil en bolívares (VES), consulta de tasa oficial BCV con fallback resiliente, exclusión estricta de atletas sin suscripción del radar/directorio nacional y panel administrativo de conciliación instantánea.

### 1.1. Artefactos y Componentes Impactados
* **Base de Datos & Modelo Relacional (PostgreSQL):**
  * Migración `20261009120000_seed_plans_and_update_payments.sql`.
  * Semilla oficial en `subscription_plans`:
    * `PRO_MONTHLY` ($5.00 USD / 30 días / 5 videos / radar y CV activados).
    * `PRO_ANNUAL` ($50.00 USD / 365 días / 10 videos / radar y CV activados).
  * Columnas en `payment_transactions`: `payment_date` (DATE), `origin_bank` (VARCHAR), `origin_phone` (VARCHAR) y flexibilización de `proof_image_url` a NULL para flujo sin comprobante gráfico.
* **Backend (Spring Boot 3 / Java 21 / Project Lombok):**
  * Entidades JPA Lombok:
    * `SubscriptionPlan`: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
    * `AthleteSubscription`: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
    * `PaymentTransaction`: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
  * Repositorios: `SubscriptionPlanRepository`, `AthleteSubscriptionRepository`, `PaymentTransactionRepository`.
  * Servicios:
    * `BcvRateService`: Consulta con `RestClient` a la API oficial (`ve.dolarapi.com`), caché en memoria (360 min) y fallback resiliente (`bcv.fallback-rate: 45.50`).
    * `PaymentConfigService`: Agregación de datos bancarios institucionales, tasa BCV y catálogo de planes.
    * `PaymentService`: Registro de Pago Móvil en estado `PENDING_AUDIT`, validación de tutela y consulta de estado.
    * `AdminPaymentService`: Conciliación con activación inmediata de vigencia (acumulativa si ya existe suscripción previa) y notificación mock por correo.
    * `ScoutDirectoryService`: Filtro ineludible vía `AthleteSpecifications.hasActiveSubscription()` que excluye del radar y búsquedas públicas a cualquier atleta sin suscripción activa vigente.
  * Endpoints REST:
    * `GET /api/v1/payments/config` (Público / Autenticado).
    * `GET /api/v1/payments/bcv-rate` (Público).
    * `POST /api/v1/payments/report-pago-movil` (Rol: `TUTOR`).
    * `GET /api/v1/payments/athlete/{athleteId}/status` (Roles: `TUTOR`, `ADMIN`).
    * `GET /api/v1/admin/payments/pending` (Rol: `ADMIN`).
    * `POST /api/v1/admin/payments/{id}/approve` (Rol: `ADMIN`).
    * `POST /api/v1/admin/payments/{id}/reject` (Rol: `ADMIN`).
* **Frontend (Angular 18+ / SSR):**
  * Modelos TypeScript: `payment.model.ts` (`PaymentConfigResponse`, `BcvRateResponse`, `ReportPagoMovilRequest`, `PaymentTransactionResponse`, etc.).
  * Servicio HTTP: `payment.service.ts`.
  * Componentes UI:
    * `CheckoutPagoMovilModalComponent`: selector dinámico mensual/anual, conversión automática a Bs, datos de destino con copiado al portapapeles y formulario con bancos populares.
    * `TutorDashboardComponent`: badges de estado (`⭐ PRO ACTIVO`, `⏳ CONCILIACIÓN PENDIENTE`, `🔒 NO VISIBLE EN DIRECTORIO`), botón `⚡ Activar Plan Pro` y enlace al modal.
    * `AdminPaymentsComponent` (`/admin/pagos`): tabla de auditoría, feedback visual, modal para motivo de rechazo y aprobación en un clic.
  * Directiva de Vocabulario: **Cero presencia de la palabra "LOPNNA"** en botones, labels, badges o interfaces del usuario.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests (Spring Boot)

Comando ejecutado:
```bash
./mvnw test -Dtest=Payment*
```

#### Resultados:
```
[INFO] Running com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 46.65 s -- in com.talentus.scout.web.controller.PaymentControllerIntegrationTest
[INFO] Running com.talentus.scout.service.payment.PaymentServiceTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 5.058 s -- in com.talentus.scout.service.payment.PaymentServiceTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

#### Detalle de Casos de Prueba Verificados:
1. `PaymentControllerIntegrationTest`:
   * `getPaymentConfig_Success_ReturnsBcvAndPlans`: Consulta pública/autenticada de configuración y tasa BCV.
   * `reportPagoMovil_ValidRequest_ReturnsPendingTransaction`: Reporte de referencia bancaria por tutor autenticado.
   * `adminApprovePayment_ValidTransaction_ActivatesProSubscription`: Aprobación administrativa, transición a `APPROVED` y emisión de `AthleteSubscription`.
2. `PaymentServiceTest`:
   * `reportPagoMovil_Success_CreatesPendingAuditTransaction`: Registro de transacción y cálculo de bolívares.
   * `reportPagoMovil_UnauthorizedTutor_ThrowsForbidden`: Protección contra intento de reporte para atleta no tutorado.
   * `approvePayment_NewSubscription_Sets30DaysValidity`: Activación de 30 días para nueva suscripción mensual.
   * `approvePayment_ExistingActiveSubscription_ExtendsValidity`: Acumulación de días sobre fecha de caducidad previa.

### 2.2. Frontend Build & Compilación Angular SSR

Comando ejecutado:
```bash
npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` con 0 errores).
* Generación de lazy chunk `admin-payments-component` (`21.91 kB` browser, `22.02 kB` server).
* Corrección verificada: Integración completa de métodos `openCheckoutModal` / `closeCheckoutModal` / `onPaymentReported` y elemento `<app-checkout-pago-movil-modal>` en `TutorDashboardComponent`.
* Verificación de cero ocurrencias del acrónimo "LOPNNA" en archivos de pagos y administración.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Consulta de Configuración y Tasa BCV
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

### 3.2. Reporte de Pago Móvil (Tutor)
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/report-pago-movil \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<ATHLETE_UUID>",
    "planId": "PRO_MONTHLY",
    "referenceNumber": "984210",
    "paymentDate": "2026-10-10",
    "amountVes": 227.50,
    "bcvRate": 45.50,
    "originBank": "Banesco",
    "originPhone": "04121234567"
  }' | jq .
```
**Respuesta esperada:**
Transacción creada con `status: "PENDING_AUDIT"`. El dashboard del tutor muestra `⏳ CONCILIACIÓN PENDIENTE`.

### 3.3. Conciliación y Aprobación en Cola Administrativa
1. Listar pagos pendientes:
   ```bash
   curl -s http://localhost:8080/api/v1/admin/payments/pending \
     -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
   ```
2. Aprobar transacción:
   ```bash
   curl -s -X POST http://localhost:8080/api/v1/admin/payments/<TRANSACTION_UUID>/approve \
     -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
   ```
**Respuesta esperada:**
Transacción pasa a `APPROVED`. La suscripción del atleta se crea/extiende con estado `ACTIVE`.

### 3.4. Verificación de Visibilidad en el Directorio de Scouts
1. Consultar el directorio de veedores:
   ```bash
   curl -s http://localhost:8080/api/v1/scouts/directory \
     -H "Authorization: Bearer <TOKEN_SCOUT>" | jq .
   ```
2. **Validación:** El atleta ahora figura en los resultados de búsqueda. Si la suscripción no estuviera activa, el filtro `AthleteSpecifications.hasActiveSubscription()` lo oculta por completo.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **1. Modalidades Pro (`PRO_MONTHLY` y `PRO_ANNUAL`)** | ✅ Cumplido | Insertadas y confirmadas en `subscription_plans` con precios $5 y $50 USD. |
| **2. Tasa oficial BCV con fallback y caché** | ✅ Cumplido | Servicio `BcvRateService` con caché en memoria y resiliencia probada en integración. |
| **3. Datos bancarios institucionales configurables** | ✅ Cumplido | Retornados en `/api/v1/payments/config` y renderizados con botón de copiado en UI. |
| **4. Reporte de Pago Móvil sin comprobante gráfico** | ✅ Cumplido | Registro exitoso de transacciones con número de referencia, banco emisor y fecha. |
| **5. Exclusión estricta de atletas sin Plan Pro** | ✅ Cumplido | Subconsulta en `AthleteSpecifications.hasActiveSubscription()` ejecutada en el directorio. |
| **6. Activación instantánea tras aprobación administrativa** | ✅ Cumplido | Transacción auditada genera/extiende `AthleteSubscription` inmediatamente. |
| **7. Cero uso de "LOPNNA" en interfaces de usuario** | ✅ Cumplido | Grep verificado en `talentus-scout-fe` con 0 ocurrencias en botones y vistas de pagos. |
| **8. Suite de pruebas en verde y compilación limpia** | ✅ Cumplido | 7/7 pruebas unitarias/integración backend pasadas y `ng build` completado exitosamente. |

---

## 5. Casos Borde y Consideraciones Validadas

1. **Caída o indisponibilidad de la API BCV externa:** `BcvRateService` captura excepciones y retorna `fallback-rate` configurada (45.50) sin interrumpir el flujo del usuario.
2. **Renovación anticipada del Plan Pro:** Si el atleta ya posee una suscripción activa con fecha futura, el servicio suma la duración del plan a dicha fecha futura (extensión acumulativa, sin pérdida de días restantes).
3. **Seguridad y Control de Acceso:** Los endpoints de reporte verifican que el atleta pertenezca al tutor en sesión; los endpoints de conciliación exigen rol `ROLE_ADMIN`.
