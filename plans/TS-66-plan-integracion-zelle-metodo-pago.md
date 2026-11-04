# Plan de Implementación: [TS-66] Integración de Zelle como Método de Pago: Parámetros en Mantenedor Admin, Reporte Manual de Checkout y Conciliación

**ID Tarea:** TS-66  
**Título:** Integración de Zelle como Método de Pago: Parámetros en Mantenedor Admin, Reporte Manual de Checkout y Conciliación  
**Tarjeta Trello:** [https://trello.com/c/AfelIkUU](https://trello.com/c/AfelIkUU)  
**ID de Tarjeta en Trello:** `6ae4b47d79319afa0bcecda4`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-11-03  
**Estado del Plan:** IMPLEMENTACIÓN COMPLETADA — EN TESTING  
**Agente Revisor/Planificador:** trello_planner  
**Agente Implementador:** trello_implementer  

---

## 1. Contexto de Negocio y Justificación

* **Ampliación de Canales de Recaudación en Divisas (USD):**  
  En el contexto de Venezuela y la diáspora latinoamericana, **Zelle** es uno de los métodos de pago electrónico directo en dólares estadounidenses (USD) más utilizados y confiables por familias, academias y tutores legales de atletas juveniles. Incorporar Zelle junto a **Pago Móvil (VES)** y **Binance Pay (USDT)** elimina barreras de conversión para tutores con cuentas bancarias en EE. UU.
* **Dinámica Operativa de Conciliación Asistida:**  
  Al igual que el flujo de Pago Móvil y Binance Manual, el tutor realiza la transferencia desde su aplicación bancaria al correo Zelle institucional de Talentus Scout y reporta los datos del comprobante en el checkout (número de confirmación/referencia, nombre del titular de la cuenta emisora, correo o teléfono Zelle emisor y fecha). La transacción ingresa con estado `PENDING_AUDIT` para que un administrador la verifique en el extracto bancario y active la suscripción Pro con 1 clic en `/admin/pagos`.
* **Protección Legal del Menor (LOPNNA Art. 65 y Normativa FIFA):**  
  Toda operación financiera y suscripción es gestionada exclusivamente por el representante legal mayor de edad (`ROLE_TUTOR`). No se solicitan datos financieros al atleta menor de edad ni se almacenan credenciales bancarias sensibles en la plataforma.

---

## 2. Alcance Técnico y Arquitectura

1. **Base de Datos / DDL (`talentus-scout-migrations`):**
   * Migración `migrations/20261103103000_add_zelle_payment_support.sql`:
     * Extender el tipo ENUM `payment_method` en PostgreSQL: `ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ZELLE';`.
     * Agregar 4 columnas a `payment_gateway_settings`:
       * `zelle_enabled BOOLEAN NOT NULL DEFAULT TRUE`
       * `zelle_email VARCHAR(150)`
       * `zelle_account_holder VARCHAR(150)`
       * `zelle_qr_image_url VARCHAR(255)`
     * Poblar el registro singleton existente con valores institucionales por defecto (`pagos@talentusscout.com`, `Talentus Scout LLC`).
2. **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21 / Project Lombok):**
   * `PaymentMethod`: Añadir constante `ZELLE`.
   * `PaymentGatewaySetting`: Mapear `zelleEnabled`, `zelleEmail`, `zelleAccountHolder` y `zelleQrImageUrl` con Lombok (`@Builder.Default`).
   * DTOs (`com.talentus.scout.web.dto`):
     * `PaymentGatewaySettingsDto` y `UpdatePaymentGatewaySettingsRequest`: Incorporar parámetros de Zelle.
     * `PaymentConfigResponse`: Exponer `zelleEnabled`, `zelleEmail`, `zelleAccountHolder` y `zelleQrImageUrl` (además de alias compatibles con el frontend).
     * `ReportZellePaymentRequest`: DTO con validaciones Jakarta (`athleteId`, `planId`, `referenceNumber`, `originAccountHolder`, `originEmailOrPhone`, `paymentDate`, `discountCode`).
     * `AdminPaymentSummaryResponse`: Añadir `zelleApprovedCount`.
   * Servicios:
     * `PaymentConfigService`: Mapear y persistir los campos de Zelle en `getPaymentConfig()`, `getGatewaySettings()`, `updateGatewaySettings(...)` y nuevo método `updateZelleQrUrl(String qrImageUrl)`.
     * `PaymentService`: Implementar `reportZellePayment(UUID tutorId, ReportZellePaymentRequest request)` validando unicidad de referencia (`DuplicatePaymentReferenceException` -> 409 Conflict), propiedad del atleta, cálculo de descuentos por cupón y persistencia en `PENDING_AUDIT` con `method = PaymentMethod.ZELLE`.
     * `AdminPaymentService`: Contabilizar `zelleApprovedCount` en `getMetricsSummary()`.
   * Controladores REST:
     * `PaymentController`: `POST /api/v1/payments/zelle/report` con `@PreAuthorize("hasAnyRole('TUTOR', 'ADMIN')")`.
     * `AdminPaymentGatewayConfigController`: `POST /api/v1/admin/payments/gateway-settings/zelle-qr` con `@PreAuthorize("hasRole('ADMIN')")`, validando MIME (`PNG`, `JPG`, `WEBP`) y tamaño máximo de 5MB.
3. **Frontend (`talentus-scout-fe` — Angular 18+ Standalone / Signals / Directivas `fe-desing.md`):**
   * Separación estricta de plantillas (`.component.ts`, `.component.html`, `.component.css`).
   * `payment.model.ts` y `payment.service.ts`: Interfaces `ReportZellePaymentRequest`, campos Zelle en `PaymentConfigResponse` / `PaymentGatewaySettingsDto`, métodos `reportZellePayment(...)` y `uploadZelleQrImage(...)`.
   * `CheckoutPagoMovilModalComponent`:
     * Selector de 3 métodos de pago en Bento Tabs: **Pago Móvil (Bs)**, **Binance Pay (USDT)** y **Zelle (USD)** con identidad visual púrpura institucional (`#7C3AED` / `#A855F7`), indicador de mantenimiento si `zelleEnabled === false` y cambio automático de pestaña activa.
     * Vista de datos receptores de Zelle (Correo Zelle, Titular, monto exacto en USD y QR opcional) con botones de copiado rápido al portapapeles.
     * Formulario de reporte Zelle (Titular de la cuenta emisora, Correo o teléfono Zelle emisor, Número de confirmación/referencia y Fecha).
   * `AdminPaymentsComponent`:
     * En `⚙️ Cuentas de Cobro`: Tercera tarjeta Bento para **Zelle (Transferencia USD)** con switch ON/OFF, inputs de Correo Receptor y Nombre del Titular, y dropzone con vista previa para subir el código QR de Zelle. Contador dinámico de pasarelas activas (`3 Activas`, `2 Activas`, etc.).
     * En `⏳ Cola de Pendientes` y `📜 Historial General`: Badge distintivo morado (`🟣 Zelle`) para transacciones `ZELLE`, filtro por método `ZELLE` y visualización clara del titular y correo/teléfono emisor.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

**Archivo:** `talentus-scout-migrations/migrations/20261103103000_add_zelle_payment_support.sql`

```sql
-- migrate:up
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ZELLE';

ALTER TABLE payment_gateway_settings
    ADD COLUMN IF NOT EXISTS zelle_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS zelle_email VARCHAR(150) DEFAULT 'pagos@talentusscout.com',
    ADD COLUMN IF NOT EXISTS zelle_account_holder VARCHAR(150) DEFAULT 'Talentus Scout LLC',
    ADD COLUMN IF NOT EXISTS zelle_qr_image_url VARCHAR(255);

UPDATE payment_gateway_settings
SET zelle_enabled = TRUE,
    zelle_email = COALESCE(zelle_email, 'pagos@talentusscout.com'),
    zelle_account_holder = COALESCE(zelle_account_holder, 'Talentus Scout LLC')
WHERE zelle_email IS NULL OR zelle_account_holder IS NULL;

-- migrate:down
ALTER TABLE payment_gateway_settings
    DROP COLUMN IF EXISTS zelle_enabled,
    DROP COLUMN IF EXISTS zelle_email,
    DROP COLUMN IF EXISTS zelle_account_holder,
    DROP COLUMN IF EXISTS zelle_qr_image_url;
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21 / Lombok)

### 4.1. Enum `PaymentMethod`
**Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/domain/enums/PaymentMethod.java`
* Añadir `ZELLE` al enum.

### 4.2. Entidad `PaymentGatewaySetting`
**Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/PaymentGatewaySetting.java`
* Añadir campos con Lombok:
  ```java
  @Column(name = "zelle_enabled", nullable = false)
  @Builder.Default
  private Boolean zelleEnabled = true;

  @Column(name = "zelle_email", length = 150)
  @Builder.Default
  private String zelleEmail = "pagos@talentusscout.com";

  @Column(name = "zelle_account_holder", length = 150)
  @Builder.Default
  private String zelleAccountHolder = "Talentus Scout LLC";

  @Column(name = "zelle_qr_image_url")
  private String zelleQrImageUrl;
  ```

### 4.3. DTOs
1. **`ReportZellePaymentRequest.java`** (`com.talentus.scout.web.dto`):
   * `@NotNull UUID athleteId`
   * `@NotBlank String planId`
   * `@NotBlank @Size(min = 4, max = 100) String referenceNumber`
   * `@NotBlank @Size(max = 100) String originAccountHolder`
   * `String originEmailOrPhone`
   * `@NotNull LocalDate paymentDate`
   * `String discountCode`
2. **`PaymentGatewaySettingsDto.java`** y **`UpdatePaymentGatewaySettingsRequest.java`**:
   * Añadir `zelleEnabled`, `zelleEmail`, `zelleAccountHolder`, `zelleQrImageUrl`.
3. **`PaymentConfigResponse.java`**:
   * Añadir `zelleEnabled`, `zelleEmail`, `zelleAccountHolder`, `zelleQrImageUrl`.

### 4.4. Servicios y Controladores
* **`PaymentService.reportZellePayment(UUID tutorId, ReportZellePaymentRequest request)`**:
  * Valida unicidad de `referenceNumber` con `paymentTransactionRepository.existsByReferenceNumber(ref)`.
  * Valida ownership del atleta respecto a `tutorId`.
  * Aplica cupón de descuento si corresponde.
  * Almacena en `originBank`: `"Zelle - " + request.getOriginAccountHolder().trim()` y en `originPhone`: `request.getOriginEmailOrPhone()` (truncado a 30 chars si excede, o almacenando contacto en `originBank` si es un correo largo para preservar integridad con `VARCHAR(30)` de `origin_phone`).
  * Estado inicial: `PaymentStatus.PENDING_AUDIT`, método: `PaymentMethod.ZELLE`.
* **`PaymentController`**:
  * `POST /api/v1/payments/zelle/report` -> retorna `201 Created` con `PaymentTransactionResponse`.
* **`AdminPaymentGatewayConfigController`**:
  * `POST /api/v1/admin/payments/gateway-settings/zelle-qr` -> sube QR a `payments` y actualiza `zelleQrImageUrl`.

---

## 5. Especificación Frontend (Angular 18+ Standalone & Diseño `fe-desing.md`)

### 5.1. Sistema de Tokens Visuales e Identidad (Bento Design)
* **Paleta Intencional:**
  * Superficie Nocturna Deportiva: `#0B1120` / `#0F172A`
  * Acento Cancha (Pago Móvil / Éxito): `#10B981`
  * Acento Cripto (Binance USDT): `#F0B90B`
  * Acento Zelle Institucional (USD Directo): `#8B5CF6` / `#A855F7` con bordes `rgba(139, 92, 246, 0.35)` y fondo sutil `rgba(139, 92, 246, 0.08)`.
* **Separación de Plantillas:**
  * `checkout-pago-movil-modal.component.ts`, `.component.html`, `.component.css`
  * `admin-payments.component.ts`, `.component.html`, `.component.css`

---

## 6. Plan de Pruebas y Validación

* **Backend (`./mvnw test`):**
  * `PaymentControllerIntegrationTest`:
    * `getPaymentConfig_IncludesZelleProps()`
    * `reportZellePayment_AndAdminApproval_Success()`
    * `reportZellePayment_DuplicateReference_Returns409()`
  * `AdminPaymentGatewayConfigControllerTest`:
    * `updateGatewaySettings_WithZelleFields_Success()`
    * `uploadZelleQr_asAdmin_success()`
    * `uploadZelleQr_invalidType_badRequest()`
* **Frontend (`npm test` & `npm run build`):**
  * `checkout-pago-movil-modal.component.spec.ts`: Cambio a tab `ZELLE`, visualización de correo/titular Zelle y envío de `submitZelleReport()`.
  * `admin-payments.component.spec.ts`: Carga y guardado de parámetros Zelle y subida de QR de Zelle.

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [x] **Paso 1:** Crear migración `20261103103000_add_zelle_payment_support.sql` en `talentus-scout-migrations/migrations/` y aplicarla en PostgreSQL local.
- [x] **Paso 2:** Actualizar `PaymentMethod.java` y `PaymentGatewaySetting.java` en el backend.
- [x] **Paso 3:** Crear `ReportZellePaymentRequest.java` y actualizar `PaymentGatewaySettingsDto.java`, `UpdatePaymentGatewaySettingsRequest.java`, `PaymentConfigResponse.java` y `AdminPaymentSummaryResponse.java`.
- [x] **Paso 4:** Actualizar `PaymentConfigService.java`, `PaymentService.java` y `AdminPaymentService.java` con la lógica de configuración, reporte y métricas de Zelle.
- [x] **Paso 5:** Exponer endpoints `POST /api/v1/payments/zelle/report` y `POST /api/v1/admin/payments/gateway-settings/zelle-qr`.
- [x] **Paso 6:** Agregar pruebas de integración en `PaymentControllerIntegrationTest.java` y `AdminPaymentGatewayConfigControllerTest.java` y ejecutar `./mvnw test`.
- [x] **Paso 7:** Actualizar `payment.model.ts` y `payment.service.ts` en `talentus-scout-fe`.
- [x] **Paso 8:** Actualizar `checkout-pago-movil-modal.component.ts`, `.html` y `.css` con la pestaña y formulario de Zelle.
- [x] **Paso 9:** Actualizar `admin-payments.component.ts`, `.html` y `.css` con la tarjeta Bento de configuración de Zelle, subida de QR y badges en cola/historial.
- [x] **Paso 10:** Añadir pruebas unitarias en `checkout-pago-movil-modal.component.spec.ts` y `admin-payments.component.spec.ts`, y validar `npm test` y `npm run build`.
- [x] **Paso 11:** Generar el documento de plan de pruebas en `test/TS-66-test-plan-integracion-zelle-metodo-pago.md`.
- [x] **Paso 12:** Mover la tarjeta `[TS-66]` en Trello a `in testing` (`6abbbe54690c92aab5836b30`) y registrar comentario de cierre.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [x] Migración DDL aplicada exitosamente añadiendo `ZELLE` a `payment_method` y las 4 columnas de configuración en `payment_gateway_settings`.
- [x] El administrador puede activar/pausar Zelle, actualizar correo/titular y cargar imagen de QR desde `/admin/pagos` > `⚙️ Cuentas de Cobro`, reflejando cambios en vivo en el checkout.
- [x] El modal de checkout de los tutores incluye la pestaña Zelle con datos de pago institucionales y formulario de reporte.
- [x] El endpoint `POST /api/v1/payments/zelle/report` almacena la transacción en USD con estado `PENDING_AUDIT` y valida que la referencia no esté duplicada.
- [x] La transacción reportada aparece en la lista de pagos pendientes del panel administrativo para su aprobación o rechazo con activación de la suscripción.
- [x] Se ejecutan exitosamente las pruebas automatizadas del backend (`./mvnw test`).
- [x] Se ejecutan exitosamente las pruebas unitarias del frontend (`npm test`) y la compilación de producción (`npm run build`).
