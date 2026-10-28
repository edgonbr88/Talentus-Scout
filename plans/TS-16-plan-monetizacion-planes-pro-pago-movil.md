# Plan de Implementación — [TS-16] Módulo de Monetización Día 1: Planes Pro y Reporte de Pago Móvil

## 1. Identificación de la Tarea
* **ID:** `TS-16`
* **Título:** Módulo de Monetización Día 1: Planes Pro y Reporte de Pago Móvil con Conciliación Administrativa
* **Enlace Trello:** [https://trello.com/c/Z8a06lR2](https://trello.com/c/Z8a06lR2) (Card ID: `6abbe1fd2df9f2d087424dcb`)
* **Sprint:** Sprint 4 — Verificación Dual, Monetización Día 1 y Promoción a la Nube
* **Estado:** `in testing`
* **Agente Planificador:** `trello_planner`

---

## 2. Contexto de Negocio y Reglas Clave

### 2.1. Propósito y Modelo de Monetización Día 1
La plataforma implementa un modelo de cobro directo y obligatorio desde el lanzamiento:
1. **No existe plan gratuito (No Free Tier):** Los representantes legales (tutores) pueden registrarse y dar de alta a sus atletas con toda su ficha técnica, biometría y fotos. Sin embargo, **hasta que no activen y paguen una suscripción Pro, el atleta no será visible en el directorio para scouts ni en búsquedas públicas**.
2. **Un Solo Producto (Plan Pro) con 2 Modalidades de Pago:**
   * **Modalidad Mensual (`PRO_MONTHLY`):** $5.00 USD / 30 días de vigencia.
   * **Modalidad Anual (`PRO_ANNUAL`):** $50.00 USD / 365 días de vigencia (ahorro equivalente a 2 meses).
3. **Beneficios Inmediatos del Plan Pro:**
   * **Visibilidad en el Radar:** Publicación y aparición activa en el directorio de veedores y cazatalentos (`scout-directory`).
   * **Perfil Público Bento Grid:** Ficha deportiva pública compartible con metatags Open Graph.
   * **Radar de Interacciones:** Monitoreo y feed de visualizaciones, clics y clubes interesados.
   * **Ficha Técnica en PDF:** Generación y descarga ilimitada del CV Deportivo oficial.
   * **Carga de Videos:** Subida de clips y jugadas destacadas optimizadas con HLS.

### 2.2. Flujo de Pago Móvil y Conciliación Anti-Fricción
En Venezuela, la penetración de tarjetas de crédito internacionales es baja; Pago Móvil es el estándar indiscutible:
* **Tasa Oficial BCV Automatizada:** El backend consulta periódicamente la tasa oficial del Banco Central de Venezuela a través de una API pública con caché en memoria (6 horas) y tasa de respaldo configurable (`bcv.fallback-rate: 45.50`) en caso de caída del proveedor o indisponibilidad de red.
* **Cálculo Transparente en Bolívares:** El tutor selecciona la modalidad (Mensual o Anual), visualiza el monto en USD y el equivalente exacto en VES según la tasa oficial del día.
* **Datos Bancarios de Destino:** La plataforma provee datos bancarios institucionales configurables (Banco, Teléfono, Cédula/RIF, Titular) con botón de copiado rápido al portapapeles.
* **Reporte Sin Comprobante Gráfico (Cero Fricción):** El tutor solo ingresa el **número de referencia bancaria**, la **fecha del pago**, el banco emisor y el monto transferido.
* **Conciliación en Panel Admin:** El administrador de Talentus Scout audita en su banca el número de referencia reportado. Al hacer clic en **"Aprobar"**, la suscripción se activa de manera instantánea y el atleta pasa inmediatamente a estar visible en el radar de scouts.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL)

Las tablas `subscription_plans`, `athlete_subscriptions` y `payment_transactions` ya existen en el esquema inicial de base de datos. Se requiere:

### 3.1. Semilla Canónica de Planes Pro (`subscription_plans`)
Ejecutar migración/semilla SQL para insertar las dos modalidades oficiales del Plan Pro:
```sql
-- Limpiar o actualizar planes existentes para garantizar configuración exacta
INSERT INTO subscription_plans (id, name, price_usd, duration_days, max_videos, has_radar_views, has_pdf_cv, is_active)
VALUES 
    ('PRO_MONTHLY', 'Plan Pro Mensual', 5.00, 30, 5, TRUE, TRUE, TRUE),
    ('PRO_ANNUAL', 'Plan Pro Anual (Pase de Temporada)', 50.00, 365, 10, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price_usd = EXCLUDED.price_usd,
    duration_days = EXCLUDED.duration_days,
    max_videos = EXCLUDED.max_videos,
    has_radar_views = EXCLUDED.has_radar_views,
    has_pdf_cv = EXCLUDED.has_pdf_cv,
    is_active = EXCLUDED.is_active;
```

### 3.2. Ajustes en `payment_transactions`
La tabla `payment_transactions` ya contempla `reference_number`, `amount_usd`, `amount_ves`, `bcv_exchange_rate`. Nos aseguramos de agregar una columna opcional `payment_date` y permitir `proof_image_url` nula:
```sql
ALTER TABLE payment_transactions 
    ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS origin_bank VARCHAR(100),
    ADD COLUMN IF NOT EXISTS origin_phone VARCHAR(30);

ALTER TABLE payment_transactions ALTER COLUMN proof_image_url DROP NOT NULL;
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Configuración de Entorno (`application.yml`)
```yaml
talentus:
  payments:
    pago-movil:
      bank-name: ${PAGO_MOVIL_BANK:Banco Nacional de Crédito (BNC)}
      phone-number: ${PAGO_MOVIL_PHONE:04141234567}
      id-number: ${PAGO_MOVIL_ID:J-50123456-7}
      account-holder: ${PAGO_MOVIL_HOLDER:Talentus Scout C.A.}
    bcv:
      api-url: ${BCV_API_URL:https://ve.dolarapi.com/v1/dolares/oficial}
      fallback-rate: ${BCV_FALLBACK_RATE:45.50}
      cache-ttl-minutes: 360
```

### 4.2. Entidades JPA con Lombok Estricto
* **`SubscriptionPlan`** (`com.talentus.scout.domain.entity.SubscriptionPlan`):
  * Clave primaria: `id` (VARCHAR: `PRO_MONTHLY`, `PRO_ANNUAL`).
  * Campos: `name`, `priceUsd`, `durationDays`, `maxVideos`, `hasRadarViews`, `hasPdfCv`, `isActive`.
  * Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
* **`AthleteSubscription`** (`com.talentus.scout.domain.entity.AthleteSubscription`):
  * Relaciones: `@ManyToOne Athlete athlete`, `@ManyToOne SubscriptionPlan plan`.
  * Campos: `startDate` (`Instant`), `endDate` (`Instant`), `status` (`SubscriptionStatus`: `ACTIVE`, `EXPIRED`, `CANCELLED`).
  * Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
* **`PaymentTransaction`** (`com.talentus.scout.domain.entity.PaymentTransaction`):
  * Relaciones: `@ManyToOne User user`, `@ManyToOne Athlete athlete`, `@ManyToOne SubscriptionPlan plan`, `@ManyToOne User auditedByAdmin`.
  * Campos: `method` (`PaymentMethod`: `PAGO_MOVIL`), `amountUsd`, `amountVes`, `bcvExchangeRate`, `referenceNumber`, `paymentDate`, `originBank`, `originPhone`, `status` (`PaymentStatus`: `PENDING_AUDIT`, `APPROVED`, `REJECTED`), `auditedAt`, `rejectionReason`.
  * Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.

### 4.3. Repositorios Spring Data JPA
* **`SubscriptionPlanRepository`**: `findAllByIsActiveTrue()`.
* **`AthleteSubscriptionRepository`**:
  * `findFirstByAthleteIdAndStatusOrderByEndDateDesc(UUID athleteId, SubscriptionStatus status)`.
  * `existsByAthleteIdAndStatusAndEndDateAfter(UUID athleteId, SubscriptionStatus status, Instant now)`.
  * `findByAthleteId(UUID athleteId)`.
* **`PaymentTransactionRepository`**:
  * `findByStatusOrderByCreatedAtDesc(PaymentStatus status)`.
  * `findByUserIdOrderByCreatedAtDesc(UUID userId)`.
  * `findByAthleteIdOrderByCreatedAtDesc(UUID athleteId)`.

### 4.4. Servicios de Negocio
1. **`BcvRateService`**:
   * Consulta HTTP con `RestTemplate` o `RestClient` hacia la API pública con timeout configurado (3s).
   * Almacenamiento en caché en memoria con control de tiempo de expiración (6 horas).
   * En caso de excepción de red o error HTTP, retorna con elegancia el valor de respaldo `fallback-rate`.
2. **`PaymentConfigService`**:
   * Provee DTO `PaymentConfigResponse` con datos de Pago Móvil, tasa BCV actual y lista de planes disponibles.
3. **`PaymentService`**:
   * `reportPagoMovil(UUID tutorId, ReportPagoMovilRequest request)`:
     * Valida que el atleta pertenezca al tutor autenticado.
     * Valida que el plan exista y esté activo.
     * Crea `PaymentTransaction` con estado `PENDING_AUDIT`.
   * `getTutorPayments(UUID tutorId)`: Historial de pagos reportados.
   * `getAthleteSubscriptionStatus(UUID athleteId)`: Retorna si el atleta está activo, expirado o con pago en auditoría.
4. **`AdminPaymentService`**:
   * `getPendingPayments()`: Lista transacciones con estado `PENDING_AUDIT`.
   * `approvePayment(UUID transactionId, UUID adminId)`:
     * Valida estado `PENDING_AUDIT`.
     * Marca `APPROVED`, `auditedAt = Instant.now()`, `auditedByAdminId = adminId`.
     * Activa o extiende la suscripción en `AthleteSubscription`:
       * Si ya posee una suscripción activa con `endDate > now`, suma `durationDays` al `endDate` actual.
       * Si no, crea una nueva con `startDate = now` y `endDate = now + durationDays`.
     * Envía correo de confirmación de activación al tutor.
   * `rejectPayment(UUID transactionId, UUID adminId, String reason)`:
     * Marca `REJECTED`, `auditedAt = now`, `rejectionReason = reason`.

### 4.5. Filtrado Estricto de Visibilidad en el Directorio
* En `AthleteSpecifications.java`:
  * Agregar método `hasActiveSubscription()` que realiza una subconsulta a `athlete_subscriptions` verificando `status = 'ACTIVE'` y `endDate >= CURRENT_TIMESTAMP`.
* En `ScoutDirectoryService.java`:
  * Asegurar que toda búsqueda aplique obligatoriamente:
    `spec = spec.and(AthleteSpecifications.hasActiveSubscription());`

### 4.6. Endpoints REST
* `GET /api/v1/payments/config` (Público / Autenticado): Retorna configuración de Pago Móvil, tasa BCV y planes.
* `GET /api/v1/payments/bcv-rate` (Público): Retorna la tasa oficial actual.
* `POST /api/v1/payments/report-pago-movil` (Rol `TUTOR`): Registro de pago en bolívares.
* `GET /api/v1/payments/athlete/{athleteId}/status` (Rol `TUTOR`, `ADMIN`): Estado de suscripción de un atleta.
* `GET /api/v1/admin/payments/pending` (Rol `ADMIN`): Lista de pagos pendientes por conciliar.
* `POST /api/v1/admin/payments/{id}/approve` (Rol `ADMIN`): Aprobación de pago y activación instantánea.
* `POST /api/v1/admin/payments/{id}/reject` (Rol `ADMIN`): Rechazo con motivo.

---

## 5. Especificación Frontend (Angular 18+ Standalone & SSR)

### 5.1. Modelos TypeScript (`core/models/payment.model.ts`)
* `SubscriptionPlan`: `id`, `name`, `priceUsd`, `durationDays`, `maxVideos`, `isActive`.
* `PaymentConfig`: `bcvRate`, `bcvLastUpdated`, `bankName`, `phoneNumber`, `idNumber`, `accountHolder`, `plans`.
* `ReportPagoMovilRequest`: `athleteId`, `planId`, `referenceNumber`, `paymentDate`, `amountVes`, `bcvRate`, `originBank`, `originPhone`.
* `PaymentTransaction`: `id`, `athleteName`, `planName`, `amountUsd`, `amountVes`, `bcvRate`, `referenceNumber`, `paymentDate`, `status`, `rejectionReason`, `createdAt`.
* `AthleteSubscriptionInfo`: `status` (`ACTIVE`, `PENDING_AUDIT`, `INACTIVE`), `planName`, `endDate`, `daysRemaining`.

### 5.2. Servicio Angular (`core/services/payment.service.ts`)
* `getPaymentConfig()`: `Observable<PaymentConfig>`
* `reportPagoMovil(req)`: `Observable<PaymentTransaction>`
* `getAthleteSubscriptionStatus(athleteId)`: `Observable<AthleteSubscriptionInfo>`
* `getPendingPayments()`: `Observable<PaymentTransaction[]>`
* `approvePayment(id)`: `Observable<PaymentTransaction>`
* `rejectPayment(id, reason)`: `Observable<PaymentTransaction>`

### 5.3. Componentes y Vistas
1. **Modal de Checkout Pago Móvil (`CheckoutPagoMovilModalComponent`):**
   * Selector dinámico entre las dos modalidades: **Mensual ($5)** vs **Anual ($50)**.
   * Indicador destacado de tasa oficial BCV y conversión automática a bolívares (VES).
   * Bloque de datos de cuenta destino (BNC, teléfono, RIF) con botón de copiado rápido al portapapeles.
   * Formulario reactivo: Número de referencia bancaria (mínimo 6 dígitos), fecha de la operación, banco emisor opcional.
   * Botón de envío con feedback visual de confirmación y pase a estado `PENDING_AUDIT`.
2. **Integración en el Panel de Tutor (`TutorDashboardComponent`):**
   * Cada tarjeta de atleta muestra su estado Pro:
     * Si no está activo: Etiqueta `🔒 No visible para scouts (Sin Plan Activo)` y botón de llamada a la acción: `⚡ Activar Plan Pro`.
     * Si está en auditoría: Etiqueta `⏳ Pago en Conciliación`.
     * Si está activo: Etiqueta dorada `⭐ PRO ACTIVO` con días restantes.
3. **Panel Administrativo de Pagos (`AdminPaymentsComponent`):**
   * Vista en `/admin/pagos` protegida por `admin.guard`.
   * Tabla interactiva de pagos pendientes por conciliar con datos de referencia bancaria, monto en Bs, fecha, tutor y atleta.
   * Acciones:
     * **Aprobar (✓):** Activa la suscripción inmediatamente.
     * **Rechazar (✕):** Despliega modal breve para ingresar el motivo de rechazo.
4. **Respeto a la Directiva de Vocabulario:** Cero uso de "LOPNNA" en botones, etiquetas o títulos.

---

## 6. Pruebas y Validación

### 6.1. Pruebas Unitarias e Integración Backend
* **`BcvRateServiceTest`**:
  * Obtención exitosa de tasa externa y almacenamiento en caché.
  * Resiliencia ante falla externa retornando `fallback-rate`.
* **`PaymentServiceTest`**:
  * Registro de pago móvil en estado `PENDING_AUDIT`.
  * Aprobación administrativa activando o extendiendo la vigencia en `AthleteSubscription`.
  * Rechazo con motivo.
* **`ScoutDirectoryVisibilityTest`**:
  * Verifica que atletas sin plan activo queden excluidos del directorio.
  * Verifica que atletas con plan activo aparezcan de inmediato tras la aprobación.

### 6.2. Comandos cURL de Verificación
* Consultar configuración y tasa BCV:
  ```bash
  curl -s http://localhost:8080/api/v1/payments/config | jq .
  ```
* Reportar Pago Móvil:
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/payments/report-pago-movil \
    -H "Authorization: Bearer <TOKEN_TUTOR>" \
    -H "Content-Type: application/json" \
    -d '{
      "athleteId": "<UUID>",
      "planId": "PRO_MONTHLY",
      "referenceNumber": "984210",
      "paymentDate": "2026-10-09",
      "amountVes": 227.50,
      "bcvRate": 45.50
    }' | jq .
  ```
* Aprobar como Administrador:
  ```bash
  curl -s -X POST http://localhost:8080/api/v1/admin/payments/<TX_ID>/approve \
    -H "Authorization: Bearer <TOKEN_ADMIN>" | jq .
  ```

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Semilla de planes `PRO_MONTHLY` y `PRO_ANNUAL` en PostgreSQL y ajuste de columnas en `payment_transactions`.
- [x] **Paso 2:** Entidades JPA `SubscriptionPlan`, `AthleteSubscription`, `PaymentTransaction` con Project Lombok estricto.
- [x] **Paso 3:** Implementación de `BcvRateService` con llamada HTTP, caché y fallback resiliente.
- [x] **Paso 4:** Implementación de `PaymentService` y `AdminPaymentService` con lógica de cálculo de vigencias.
- [x] **Paso 5:** Restricción de visibilidad en `ScoutDirectoryService` vía `AthleteSpecifications.hasActiveSubscription()`.
- [x] **Paso 6:** Controladores REST `PaymentController` y `AdminPaymentController` con permisos Spring Security.
- [x] **Paso 7:** Pruebas unitarias y de integración en Spring Boot (`./mvnw test`).
- [x] **Paso 8:** Modelos y servicios en Angular `payment.model.ts` y `payment.service.ts`.
- [x] **Paso 9:** Modal interactivo `CheckoutPagoMovilModalComponent` con diseño Bento, copiado al portapapeles y cálculo dinámico en Bs.
- [x] **Paso 10:** Integración en `TutorDashboardComponent` con estados `PRO ACTIVO`, `No visible para scouts` y botón `⚡ Activar Plan Pro`.
- [x] **Paso 11:** Vista administrativa `/admin/pagos` para aprobación y rechazo en un clic.
- [x] **Paso 12:** Compilación completa del frontend (`npm run build`) y verificación de cero ocurrencias de "LOPNNA".
- [x] **Paso 13:** Documentación del plan de pruebas en `test/TS-16-test-plan-monetizacion-pago-movil.md`.
- [x] **Paso 14:** Transición de la tarjeta a `in testing` en Trello.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Modalidades `PRO_MONTHLY` y `PRO_ANNUAL` sembradas y funcionando.
- [x] Endpoint de tasa oficial BCV operativo con caché y tasa de respaldo.
- [x] Datos de Pago Móvil institucionales configurables y visibles en el modal de pago.
- [x] Flujo de reporte de Pago Móvil funcional sin requerir comprobante gráfico.
- [x] Exclusión total de atletas sin suscripción activa del directorio de veedores.
- [x] Activación instantánea de la suscripción al aprobar el pago en el panel de administración.
- [x] Cero uso de "LOPNNA" en botones, etiquetas y textos del frontend.
- [x] 100% de pruebas automáticas en verde y compilación limpia de frontend y backend.
