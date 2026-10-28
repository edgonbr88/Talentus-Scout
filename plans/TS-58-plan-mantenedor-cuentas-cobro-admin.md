# Plan de Implementación: [TS-58] Mantenedor de Cuentas de Cobro: Pago Móvil, Wallet Binance y Subida de QR en Panel Admin

**ID Tarea:** TS-58  
**Título:** Mantenedor de Cuentas de Cobro: Pago Móvil, Wallet Binance y Subida de QR en Panel Admin  
**Tarjeta Trello:** [https://trello.com/c/SQX5xE73](https://trello.com/c/SQX5xE73)  
**ID de Tarjeta en Trello:** `6adb6560f426166176fedc78`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-26  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

* **Control Dinámico de Recaudación Institucional:**  
  Talentus Scout procesa suscripciones y pagos de tutores y scouts a través de Pago Móvil en bolívares (VES) y transferencias directas en criptoactivos (USDT vía Binance Pay / Wallet). Hasta la fecha, los datos bancarios y direcciones de billetera estaban parametrizados como variables de entorno estáticas en el backend (`application.yml`), lo que exigía modificar configuraciones del servidor o reiniciar servicios ante cualquier cambio operativo (apertura de nueva cuenta bancaria, rotación de teléfono receptor, actualización de wallet institucional o cambio de titularidad).
* **Mantenimiento y Contingencia Operativa (Switches On/Off):**  
  Ante caídas de plataformas bancarias venezolanas, conciliaciones contables o auditorías de transferencias, los administradores requieren pausar temporalmente Pago Móvil o Binance sin afectar el resto de la plataforma, evitando que los tutores transfieran a canales inhabilitados.
* **Gestión Centralizada del Código QR de Binance:**  
  La imagen del código QR para cobros manuales de Binance debe poder ser reemplazada en cualquier momento por el administrador directamente desde el panel, visualizándose inmediatamente en el checkout de los representantes con soporte para formatos modernos (PNG, JPG, WEBP) y límite de 5MB.

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Afectados:**
  1. **Base de Datos / DDL (dbmate):**
     * Nueva migración SQL: `talentus-scout-migrations/migrations/20261026190000_create_payment_gateway_settings_table.sql`.
     * Creación de la tabla singleton `payment_gateway_settings` con UUID v7 y seed con los datos vigentes actuales.
  2. **Backend (Spring Boot 3 / Java 21 / Lombok):**
     * Entidad JPA: `PaymentGatewaySetting` con Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).
     * Repositorio: `PaymentGatewaySettingRepository` con método para obtener el registro singleton.
     * DTOs:
       - `PaymentGatewaySettingsDto`: Datos completos de la pasarela incluyendo flags booleanos de activación.
       - `UpdatePaymentGatewaySettingsRequest`: DTO de entrada con validaciones Jakarta (`@NotBlank`, `@Pattern`, `@NotNull`).
     * Controlador: `AdminPaymentGatewayConfigController` (o endpoints en `AdminPaymentController`) protegido con `@PreAuthorize("hasRole('ADMIN')")`:
       - `GET /api/v1/admin/payments/gateway-settings`: Obtiene la configuración editable.
       - `PUT /api/v1/admin/payments/gateway-settings`: Actualiza campos y switches.
       - `POST /api/v1/admin/payments/gateway-settings/binance-qr`: Sube archivo `MultipartFile`, valida tipo MIME y peso (<5MB), almacena con `FileStorageService.storeFile(file, "payments")` y actualiza la URL en base de datos.
     * Servicio: Refactorización de `PaymentConfigService.getPaymentConfig()` para que el checkout público de tutores (`GET /api/v1/payments/config`) consuma dinámicamente de `PaymentGatewaySettingRepository`.
  3. **Frontend (Angular 18+ Standalone / HTML separado / Vanilla CSS):**
     * `src/app/core/models/payment.model.ts`: Nuevas interfaces `PaymentGatewaySettingsDto` y `UpdatePaymentGatewaySettingsRequest`.
     * `src/app/core/services/payment.service.ts`: Métodos `getPaymentGatewaySettings()`, `updatePaymentGatewaySettings()`, `uploadBinanceQrImage()`.
     * `src/app/features/admin/payments/admin-payments.component.ts` & `admin-payments.component.html`:
       - Nueva pestaña Bento: `⚙️ Cuentas de Cobro` (`activeTab === 'GATEWAY_SETTINGS'`).
       - Formulario Bento para **Pago Móvil**: Switch On/Off, Banco, Teléfono, C.I./RIF, Titular de cuenta.
       - Formulario Bento para **Binance**: Switch On/Off, Pay ID, Wallet Address, Red, Dropzone/Selector de archivo para QR con preview y subida.
       - Feedback visual reactivo, validaciones en tiempo real y estados de carga.
     * `src/app/features/payments/checkout-pago-movil-modal.component.html` & `.ts`:
       - Adaptación de la selección de métodos de pago respetando los flags `pagoMovilEnabled` y `binanceManualEnabled`.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

Archivo de migración: `talentus-scout-migrations/migrations/20261026190000_create_payment_gateway_settings_table.sql`

```sql
-- migrate:up
CREATE TABLE payment_gateway_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    pago_movil_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    pago_movil_bank VARCHAR(100) NOT NULL,
    pago_movil_phone VARCHAR(50) NOT NULL,
    pago_movil_id_number VARCHAR(50) NOT NULL,
    pago_movil_account_holder VARCHAR(150) NOT NULL,
    binance_manual_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    binance_pay_id VARCHAR(50),
    binance_wallet_address VARCHAR(150),
    binance_network VARCHAR(50) DEFAULT 'USDT (TRC-20 / BEP-20)',
    binance_qr_image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed de registro inicial canónico (singleton)
INSERT INTO payment_gateway_settings (
    pago_movil_enabled,
    pago_movil_bank,
    pago_movil_phone,
    pago_movil_id_number,
    pago_movil_account_holder,
    binance_manual_enabled,
    binance_pay_id,
    binance_wallet_address,
    binance_network,
    binance_qr_image_url
) VALUES (
    TRUE,
    'Banco Nacional de Crédito (BNC)',
    '04141234567',
    'J-50123456-7',
    'Talentus Scout C.A.',
    TRUE,
    '283918273',
    'TLsV5289FjK93kdJ8193jd93kd9',
    'USDT (TRC-20 / BEP-20)',
    '/assets/images/binance-qr-sample.png'
);

-- migrate:down
DROP TABLE IF EXISTS payment_gateway_settings;
```

---

## 4. Backend: Spring Boot 3 (Java 21 / Lombok)

### 4.1. Entidad JPA: `PaymentGatewaySetting`
**Ubicación:** `src/main/java/com/talentus/scout/domain/entity/PaymentGatewaySetting.java`
```java
package com.talentus.scout.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_gateway_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentGatewaySetting {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "pago_movil_enabled", nullable = false)
    @Builder.Default
    private Boolean pagoMovilEnabled = true;

    @Column(name = "pago_movil_bank", nullable = false, length = 100)
    private String pagoMovilBank;

    @Column(name = "pago_movil_phone", nullable = false, length = 50)
    private String pagoMovilPhone;

    @Column(name = "pago_movil_id_number", nullable = false, length = 50)
    private String pagoMovilIdNumber;

    @Column(name = "pago_movil_account_holder", nullable = false, length = 150)
    private String pagoMovilAccountHolder;

    @Column(name = "binance_manual_enabled", nullable = false)
    @Builder.Default
    private Boolean binanceManualEnabled = true;

    @Column(name = "binance_pay_id", length = 50)
    private String binancePayId;

    @Column(name = "binance_wallet_address", length = 150)
    private String binanceWalletAddress;

    @Column(name = "binance_network", length = 50)
    @Builder.Default
    private String binanceNetwork = "USDT (TRC-20 / BEP-20)";

    @Column(name = "binance_qr_image_url")
    private String binanceQrImageUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
```

### 4.2. Repositorio: `PaymentGatewaySettingRepository`
**Ubicación:** `src/main/java/com/talentus/scout/repository/PaymentGatewaySettingRepository.java`
```java
package com.talentus.scout.repository;

import com.talentus.scout.domain.entity.PaymentGatewaySetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentGatewaySettingRepository extends JpaRepository<PaymentGatewaySetting, UUID> {

    @Query("SELECT s FROM PaymentGatewaySetting s ORDER BY s.createdAt ASC LIMIT 1")
    Optional<PaymentGatewaySetting> findSingleton();
}
```

### 4.3. DTOs
* **`PaymentGatewaySettingsDto`** (`src/main/java/com/talentus/scout/web/dto/PaymentGatewaySettingsDto.java`):
  Lombok `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder` con todos los atributos de configuración.
* **`UpdatePaymentGatewaySettingsRequest`** (`src/main/java/com/talentus/scout/web/dto/UpdatePaymentGatewaySettingsRequest.java`):
  Validaciones Jakarta:
  - `@NotNull Boolean pagoMovilEnabled`
  - `@NotBlank String pagoMovilBank`
  - `@NotBlank String pagoMovilPhone`
  - `@NotBlank String pagoMovilIdNumber`
  - `@NotBlank String pagoMovilAccountHolder`
  - `@NotNull Boolean binanceManualEnabled`
  - `String binancePayId`
  - `String binanceWalletAddress`
  - `String binanceNetwork`

### 4.4. Refactorización en `PaymentConfigResponse` y `PaymentConfigService`
* En `PaymentConfigResponse`: Incorporar `Boolean pagoMovilEnabled` y `Boolean binanceManualEnabled`.
* En `PaymentConfigService`: Inyectar `PaymentGatewaySettingRepository`. Si existe registro en BD, utilizar los datos dinámicos; de lo contrario, mantener fallback a valores de `@Value`.

### 4.5. Controlador: `AdminPaymentGatewayConfigController`
**Ubicación:** `src/main/java/com/talentus/scout/web/controller/AdminPaymentGatewayConfigController.java`
Endpoints:
* `GET /api/v1/admin/payments/gateway-settings`: Retorna `PaymentGatewaySettingsDto`.
* `PUT /api/v1/admin/payments/gateway-settings`: Recibe `@Valid @RequestBody UpdatePaymentGatewaySettingsRequest`, persiste y retorna el DTO actualizado.
* `POST /api/v1/admin/payments/gateway-settings/binance-qr`:
  - Parámetro: `@RequestParam("file") MultipartFile file`.
  - Validaciones: `file.isEmpty()`, `file.getSize() > 5 * 1024 * 1024` (5MB max), content type (`image/png`, `image/jpeg`, `image/webp`).
  - Almacenamiento: `fileStorageService.storeFile(file, "payments")`.
  - Actualización de `binanceQrImageUrl` en `PaymentGatewaySetting`.
  - Retorna `Map.of("qrImageUrl", storedUrl)`.

---

## 5. Frontend: Angular 18+ (UI / UX e Identidad Visual)

### 5.1. Modelos e Interfaz HTTP
* En `src/app/core/models/payment.model.ts`:
  ```typescript
  export interface PaymentGatewaySettingsDto {
    id?: string;
    pagoMovilEnabled: boolean;
    pagoMovilBank: string;
    pagoMovilPhone: string;
    pagoMovilIdNumber: string;
    pagoMovilAccountHolder: string;
    binanceManualEnabled: boolean;
    binancePayId?: string;
    binanceWalletAddress?: string;
    binanceNetwork?: string;
    binanceQrImageUrl?: string;
    updatedAt?: string;
  }

  export interface UpdatePaymentGatewaySettingsRequest {
    pagoMovilEnabled: boolean;
    pagoMovilBank: string;
    pagoMovilPhone: string;
    pagoMovilIdNumber: string;
    pagoMovilAccountHolder: string;
    binanceManualEnabled: boolean;
    binancePayId?: string;
    binanceWalletAddress?: string;
    binanceNetwork?: string;
  }
  ```

* En `src/app/core/services/payment.service.ts`:
  ```typescript
  getPaymentGatewaySettings(): Observable<PaymentGatewaySettingsDto> {
    return this.http.get<PaymentGatewaySettingsDto>('/api/v1/admin/payments/gateway-settings');
  }

  updatePaymentGatewaySettings(request: UpdatePaymentGatewaySettingsRequest): Observable<PaymentGatewaySettingsDto> {
    return this.http.put<PaymentGatewaySettingsDto>('/api/v1/admin/payments/gateway-settings', request);
  }

  uploadBinanceQrImage(file: File): Observable<{ qrImageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ qrImageUrl: string }>('/api/v1/admin/payments/gateway-settings/binance-qr', formData);
  }
  ```

### 5.2. Componente: `AdminPaymentsComponent`
* En `admin-payments.component.ts`:
  - `activeTab = signal<'PENDING' | 'HISTORY' | 'COUPONS' | 'GATEWAY_SETTINGS'>('PENDING')`.
  - Variables reactivas para el formulario de configuración (`gatewaySettings = signal<PaymentGatewaySettingsDto | null>(null)`).
  - Métodos: `loadGatewaySettings()`, `saveGatewaySettings()`, `onQrFileSelected(event)`.
  - Feedback visual con toast de éxito/error.
* En `admin-payments.component.html`:
  - Pestaña `⚙️ Cuentas de Cobro` en la botonera superior Bento.
  - Bloque Bento para Pago Móvil (Card izquierda):
    - Switch interactivo ON/OFF con toggle visual.
    - Inputs: Banco, Teléfono, Documento de Identidad y Titular.
  - Bloque Bento para Binance (Card derecha):
    - Switch interactivo ON/OFF con toggle visual.
    - Inputs: Pay ID, Dirección de Wallet, Red de Transferencia.
    - Dropzone y selector de archivo para QR de Binance con previsualización en vivo.
  - Botón principal de guardado con estado de carga ("Guardando...").

### 5.3. Checkout Modal (`checkout-pago-movil-modal.component.ts` y `.html`)
* Respetar los flags devueltos por `getPaymentConfig()`:
  - Si `pagoMovilEnabled === false`, ocultar la pestaña o deshabilitarla con advertencia de mantenimiento temporal.
  - Si `binanceManualEnabled === false`, ocultar la pestaña o deshabilitarla con advertencia de mantenimiento temporal.
  - Si ambos están activos, permitir alternar normalmente.

---

## 6. Plan de Pruebas y Validación

### 6.1. Backend Tests (Spring Boot)
* `AdminPaymentGatewayConfigControllerTest`:
  - `testGetGatewaySettings_AsAdmin_Success()`: 200 OK y DTO válido.
  - `testGetGatewaySettings_AsTutor_Forbidden()`: 403 Forbidden.
  - `testUpdateGatewaySettings_AsAdmin_Success()`: 200 OK con nuevos valores persistidos.
  - `testUploadBinanceQr_Success()`: 200 OK y URL retornada.
  - `testUploadBinanceQr_InvalidFormat_BadRequest()`: 400 Bad Request si no es imagen.

### 6.2. Frontend Tests (Karma / ChromeHeadless)
* `AdminPaymentsComponent`:
  - Renderizado de la pestaña `GATEWAY_SETTINGS`.
  - Carga y visualización de datos de Pago Móvil y Binance.
  - Ejecución de `saveGatewaySettings()` y llamada a servicio.
* `PaymentService`:
  - Pruebas unitarias de llamadas HTTP (`GET`, `PUT`, `POST` multipart).

### 6.3. Verificación de Compilación y Migración
* Migración DDL en base de datos local / Docker mediante dbmate.
* `./mvnw test` en backend pasando al 100%.
* `npm run build` y `npm test` en frontend pasando al 100%.

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Migración DDL en `talentus-scout-migrations`**
  - Crear `migrations/20261026190000_create_payment_gateway_settings_table.sql`.
  - Aplicar migración con dbmate.
- [x] **Paso 2: Entidad JPA, Repositorio y DTOs en Backend**
  - Crear `PaymentGatewaySetting.java` con Lombok.
  - Crear `PaymentGatewaySettingRepository.java`.
  - Crear `PaymentGatewaySettingsDto.java` y `UpdatePaymentGatewaySettingsRequest.java`.
  - Actualizar `PaymentConfigResponse.java` con flags booleanos.
- [x] **Paso 3: Controlador y Servicio de Configuración en Backend**
  - Actualizar `PaymentConfigService.java` para consultar `PaymentGatewaySettingRepository`.
  - Crear `AdminPaymentGatewayConfigController.java` con `@PreAuthorize("hasRole('ADMIN')")`.
- [x] **Paso 4: Pruebas Automatizadas de Backend**
  - Crear `AdminPaymentGatewayConfigControllerTest.java`.
  - Ejecutar `./mvnw test` y validar ejecución limpia.
- [x] **Paso 5: Modelos y Servicio en Frontend**
  - Actualizar `payment.model.ts` con interfaces DTO.
  - Añadir métodos de API en `payment.service.ts`.
- [x] **Paso 6: Vista y Lógica de Mantenedor en `AdminPaymentsComponent`**
  - Añadir pestaña `GATEWAY_SETTINGS` y lógica reactiva en `admin-payments.component.ts`.
  - Diseñar formulario Bento en `admin-payments.component.html` y estilos en `admin-payments.component.css`.
- [x] **Paso 7: Adaptación de Checkout Modal en Frontend**
  - Actualizar `checkout-pago-movil-modal.component.html` para respetar flags On/Off.
- [x] **Paso 8: Pruebas Automatizadas de Frontend y Build**
  - Añadir pruebas unitarias en `admin-payments.component.spec.ts`.
  - Ejecutar `npm test` y `npm run build`.
- [x] **Paso 9: Generación del Documento de Pruebas**
  - Redactar `test/TS-58-test-plan-mantenedor-cuentas-cobro-admin.md`.
- [x] **Paso 10: Transición en Trello**
  - Mover `[TS-58]` a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [x] Migración DDL aplicada en PostgreSQL creando `payment_gateway_settings` con seed de valores canónicos.
- [x] Endpoints de administración protegidos con rol `ADMIN` para consultar, actualizar datos bancarios/wallet y subir imagen QR de Binance.
- [x] Subida de imagen QR valida tipos permitidos (PNG, JPG, WEBP) y peso máximo de 5MB, persistiendo en storage local accesible vía URL pública.
- [x] `GET /api/v1/payments/config` consume de la base de datos reflejando en tiempo real cambios de datos y estados activo/pausado en el checkout.
- [x] Interfaz de usuario en `/admin/pagos` con pestaña `⚙️ Cuentas de Cobro` diseñada según directrices `fe-desing.md` (Bento layout, switches interactivos, preview de QR y estados reactivos).
- [x] Pruebas unitarias y de integración de backend (`./mvnw test`) y frontend (`npm test`) pasando al 100%.
- [x] Compilación limpia de Angular 18+ (`npm run build`).
- [x] Documento de pruebas generado en `test/TS-58-test-plan-mantenedor-cuentas-cobro-admin.md`.
