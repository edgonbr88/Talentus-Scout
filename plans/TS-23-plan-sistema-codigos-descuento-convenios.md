# Plan de Implementación: [TS-23] Sistema de Códigos de Descuento y Convenios con Organizaciones Afiliadas

**ID Tarea:** TS-23  
**Título:** Sistema de Códigos de Descuento y Convenios con Organizaciones Afiliadas  
**Tarjeta Trello:** [https://trello.com/c/5KxL8Pqr](https://trello.com/c/5KxL8Pqr)  
**ID de Tarjeta en Trello:** `6ac6743384873f72ea68750d`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-10  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Planificador:** trello_planner / trello_implementer  

---

## 1. Contexto de Negocio y Justificación
* **Impulso de Registros y Alianzas Estratégicas:** Para acelerar la adopción de Talentus Scout y formalizar convenios institucionales con asociaciones deportivas (comenzando por la Asociación de Fútbol del Distrito Capital y academias formativas aliadas), se requiere un sistema flexible de cupones y códigos de descuento para suscripciones a Planes Pro.
* **Experiencia de Usuario en Checkout:** En el momento de adquirir un Plan Pro para un atleta, el tutor legal debe contar con un campo para ingresar su código de descuento o convenio institucional. El sistema recalcula en tiempo real el precio en USD y bolívares (VES al cambio oficial BCV).
* **Activación Inmediata para Becas / Convenios 100%:** Si el cupón otorga un 100% de descuento (beca deportiva institucional o promoción especial), la plataforma habilita la activación automática instantánea de la suscripción sin requerir comprobante bancario, pago móvil ni pasarela de criptomonedas.
* **Control y Gobernanza Administrativa:** El rol Administrador dispone de un mantenedor centralizado para crear, monitorear usos, activar/desactivar y auditar cupones, con métricas de conversión por organización afiliada.

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Afectados:**
  1. **Base de Datos / DDL (dbmate):**
     * Migración `20261010190000_create_discount_codes_schema.sql` en `talentus-scout-migrations/migrations/`.
     * Creación de tablas `discount_codes` y `discount_code_redemptions`.
     * Alteración de `payment_transactions` (columnas `discount_code_id`, `discount_amount_usd`).
     * Adición del valor `DISCOUNT_CODE` al ENUM `payment_method`.
  2. **Backend (Spring Boot 3.4 / Java 21 / Spring Security 6):**
     * Entidades JPA: `DiscountCode`, `DiscountCodeRedemption` (con anotaciones Lombok completas).
     * Repositorios: `DiscountCodeRepository`, `DiscountCodeRedemptionRepository`.
     * DTOs: `ValidateCouponRequest`, `ValidateCouponResponse`, `RedeemFreePromoRequest`, `DiscountCodeAdminDto`, `CreateDiscountCodeRequest`, `UpdateDiscountCodeRequest`.
     * Servicios: `DiscountCodeService` (validación de reglas, canje 100%), `AdminDiscountCodeService` (CRUD administrativo, métricas).
     * Controladores: `PaymentController` (endpoints de cupones), `AdminPaymentController` o `AdminDiscountCodeController` (mantenedor admin).
     * Modificación de flujos existentes de reporte en `PaymentService` y `BinancePayService` para asociar código de descuento utilizado.
  3. **Frontend (Angular 18+ Standalone):**
     * Interfaz de Checkout (`checkout-pago-movil-modal.component.ts` y `.html`):
       * Input para ingresar código con feedback reactivo de validación.
       * Desglose visual de precio regular, descuento aplicado y neto a pagar en USD y VES.
       * Botón especial para activación 100% bonificada cuando el descuento cubre la totalidad.
     * Panel Administrativo (`admin-payments.component.ts` y `.html`):
       * Nueva pestaña "Códigos de Descuento & Afiliados".
       * Tabla completa con badges de copia rápida, estado switch, cupos y métricas.
       * Modal de creación y edición de cupones con selección de organización vinculada.
     * Modelos y Servicios:
       * Actualización de `payment.model.ts` y `payment.service.ts`.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

### Archivo de Migración: `talentus-scout-migrations/migrations/20261010190000_create_discount_codes_schema.sql`

```sql
-- migrate:up
-- 1. Agregar nuevo valor al enum payment_method
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'DISCOUNT_CODE';

-- 2. Tabla de códigos de descuento y convenios
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    discount_type VARCHAR(20) NOT NULL, -- 'PERCENTAGE', 'FIXED_AMOUNT'
    discount_value NUMERIC(10,2) NOT NULL,
    organization_id UUID REFERENCES clubs_organizations(id) ON DELETE SET NULL,
    applicable_plan_id VARCHAR(50) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    max_uses INT DEFAULT NULL,
    current_uses INT NOT NULL DEFAULT 0,
    one_use_per_athlete BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_org ON discount_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

-- 3. Tabla de canjes y redenciones de cupones
CREATE TABLE IF NOT EXISTS discount_code_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    original_amount_usd NUMERIC(10,2) NOT NULL,
    discounted_amount_usd NUMERIC(10,2) NOT NULL,
    final_amount_usd NUMERIC(10,2) NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redemptions_code_athlete ON discount_code_redemptions(discount_code_id, athlete_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON discount_code_redemptions(user_id);

-- 4. Modificaciones a payment_transactions para trazabilidad de cupones
ALTER TABLE payment_transactions 
    ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS discount_amount_usd NUMERIC(10,2) DEFAULT 0.00;

-- migrate:down
ALTER TABLE payment_transactions 
    DROP COLUMN IF EXISTS discount_amount_usd,
    DROP COLUMN IF EXISTS discount_code_id;

DROP TABLE IF EXISTS discount_code_redemptions CASCADE;
DROP TABLE IF EXISTS discount_codes CASCADE;
```

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Enums y Entidades JPA con Lombok
* **`DiscountType`** (`com.talentus.scout.domain.enums`):
  * `PERCENTAGE`, `FIXED_AMOUNT`.
* **`PaymentMethod`** (`com.talentus.scout.domain.enums`):
  * Agregar valor `DISCOUNT_CODE`.
* **`DiscountCode`** (`com.talentus.scout.domain.entity`):
  * Anotaciones: `@Entity`, `@Table(name = "discount_codes")`, `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
  * Campos: `id`, `code`, `description`, `discountType`, `discountValue`, `organization` (`ClubOrganization`), `applicablePlan` (`SubscriptionPlan`), `maxUses`, `currentUses`, `oneUsePerAthlete`, `startsAt`, `expiresAt`, `isActive`, `createdAt`, `updatedAt`.
* **`DiscountCodeRedemption`** (`com.talentus.scout.domain.entity`):
  * Anotaciones: `@Entity`, `@Table(name = "discount_code_redemptions")`, `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
  * Campos: `id`, `discountCode`, `user` (`User`), `athlete` (`Athlete`), `paymentTransaction` (`PaymentTransaction`), `originalAmountUsd`, `discountedAmountUsd`, `finalAmountUsd`, `redeemedAt`.
* **`PaymentTransaction`** (`com.talentus.scout.domain.entity`):
  * Actualizar con campos:
    * `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "discount_code_id") private DiscountCode discountCode;`
    * `@Column(name = "discount_amount_usd", precision = 10, scale = 2) @Builder.Default private BigDecimal discountAmountUsd = BigDecimal.ZERO;`

### 4.2. Repositorios Spring Data JPA
* **`DiscountCodeRepository`**:
  * `Optional<DiscountCode> findByCodeIgnoreCase(String code);`
  * `boolean existsByCodeIgnoreCase(String code);`
  * `Page<DiscountCode> findAllByOrderByCreatedAtDesc(Pageable pageable);`
  * `List<DiscountCode> findByOrganizationId(UUID organizationId);`
* **`DiscountCodeRedemptionRepository`**:
  * `boolean existsByDiscountCodeIdAndAthleteId(UUID discountCodeId, UUID athleteId);`
  * `long countByDiscountCodeId(UUID discountCodeId);`
  * `List<DiscountCodeRedemption> findByDiscountCodeId(UUID discountCodeId);`

### 4.3. DTOs
* **`ValidateCouponRequest`**:
  * `code` (`@NotBlank`), `athleteId` (`@NotNull`), `planId` (`@NotBlank`).
* **`ValidateCouponResponse`**:
  * `valid` (boolean), `message` (String), `code` (String), `discountType` (String), `discountValue` (BigDecimal), `originalAmountUsd` (BigDecimal), `discountAmountUsd` (BigDecimal), `finalAmountUsd` (BigDecimal), `finalAmountVes` (BigDecimal), `bcvExchangeRate` (BigDecimal), `isFreePromo` (boolean), `organizationName` (String).
* **`RedeemFreePromoRequest`**:
  * `code` (`@NotBlank`), `athleteId` (`@NotNull`), `planId` (`@NotBlank`).
* **`DiscountCodeAdminDto`**:
  * DTO completo para panel administrativo con contadores y nombre de club u organización afiliada.
* **`CreateDiscountCodeRequest`** y **`UpdateDiscountCodeRequest`**:
  * Validaciones de formato, límites de fechas y montos.

### 4.4. Servicios de Negocio
* **`DiscountCodeService`**:
  * `validateCoupon(String code, UUID athleteId, String planId)`:
    * Verifica existencia del código (insensible a mayúsculas/minúsculas).
    * Verifica `is_active == true`.
    * Verifica vigencia temporal (`starts_at <= now <= expires_at`).
    * Verifica límite de usos (`max_uses == null || current_uses < max_uses`).
    * Verifica plan aplicable (`applicable_plan_id == null || applicable_plan_id.equals(planId)`).
    * Verifica si el atleta ya utilizó el código cuando `one_use_per_athlete == true`.
    * Calcula desglose monetario: USD y VES al cambio actual de `BcvRateService`.
    * Detecta si es 100% bonificado (`finalAmountUsd.compareTo(BigDecimal.ZERO) == 0`).
  * `redeemFreePromo(UUID tutorUserId, RedeemFreePromoRequest request)`:
    * Ejecuta validación completa asegurando que `finalAmountUsd == 0`.
    * Crea transacción en `PaymentTransaction` con método `DISCOUNT_CODE`, estatus `APPROVED`.
    * Activa o extiende `AthleteSubscription` con la duración del plan.
    * Registra el canje en `discount_code_redemptions`.
    * Incrementa `current_uses` en `discount_codes`.
    * Retorna `PaymentTransactionResponse`.
* **`AdminDiscountCodeService`**:
  * `getAllCodes(Pageable pageable)`
  * `createCode(CreateDiscountCodeRequest request)`
  * `updateCode(UUID id, UpdateDiscountCodeRequest request)`
  * `toggleStatus(UUID id)`
  * `deleteCode(UUID id)`

### 4.5. Endpoints REST
* `POST /api/v1/payments/coupons/validate` (PermitAll o Authenticated)
* `POST /api/v1/payments/coupons/redeem-free` (PreAuthorize: `hasAnyRole('TUTOR', 'ADMIN')`)
* `GET /api/v1/admin/discount-codes` (PreAuthorize: `hasRole('ADMIN')`)
* `POST /api/v1/admin/discount-codes` (PreAuthorize: `hasRole('ADMIN')`)
* `PUT /api/v1/admin/discount-codes/{id}` (PreAuthorize: `hasRole('ADMIN')`)
* `PATCH /api/v1/admin/discount-codes/{id}/toggle-status` (PreAuthorize: `hasRole('ADMIN')`)
* `DELETE /api/v1/admin/discount-codes/{id}` (PreAuthorize: `hasRole('ADMIN')`)

---

## 5. Frontend: Angular 18+ (Standalone)

### 5.1. Directiva de Diseño y Estética (`fe-desing.md`)
* Integración visual natural en el ecosistema oscuro deportivo de Talentus Scout.
* Paleta: Slate `#0f172a`, Emerald `#10b981`, Amber `#f59e0b`, Acentos de bonificación `#8b5cf6`.
* Micro-animaciones de validación: badge brillante al aplicar cupón exitosamente, desglose de totales claro y tachado de precio original.

### 5.2. Experiencia en Checkout (`checkout-pago-movil-modal.component`)
* Input de código promocional con botón "Aplicar" y botón de limpiar.
* Desglose reactivo de precios en USD y VES.
* Si el descuento es 100%:
  * Oculta el selector de Pago Móvil / Binance Pay.
  * Muestra tarjeta de beneficio institucional / beca deportiva.
  * Presenta botón de acción: *"Activar Suscripción 100% Bonificada"*.

### 5.3. Mantenedor en Panel Administrativo (`admin-payments.component`)
* Tercera pestaña: `"Códigos de Descuento & Afiliados"`.
* Tabla con: Código (botón click to copy), Campaña / Asociación, Tipo (% o $), Plan Aplicable, Usos (`canjes / límite`), Fechas, Switch Activo y Acciones.
* Modal para Crear / Editar código con selección de club/organización, tipo, valor, límites y fechas.

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Automatizadas Backend
* Pruebas unitarias de `DiscountCodeService`:
  * Validación exitosa de cupón porcentual y monto fijo.
  * Rechazo de cupón inexistente, expirado, agotado o duplicado por atleta.
  * Canje gratuito 100% con activación de suscripción inmediata.
* Pruebas de integración en `PaymentControllerIntegrationTest` y `AdminDiscountCodeControllerTest`.

### 6.2. Verificación Manual y cURL
* Validación de cupón vía `POST /api/v1/payments/coupons/validate`.
* Canje 100% vía `POST /api/v1/payments/coupons/redeem-free`.
* CRUD completo en `/api/v1/admin/discount-codes`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [ ] **1. Migración DDL:** Crear `talentus-scout-migrations/migrations/20261010190000_create_discount_codes_schema.sql`.
- [ ] **2. Entidades & Enums:**
  - [ ] Crear `DiscountType.java`.
  - [ ] Agregar `DISCOUNT_CODE` a `PaymentMethod.java`.
  - [ ] Crear entidades `DiscountCode.java` y `DiscountCodeRedemption.java` con Lombok.
  - [ ] Actualizar `PaymentTransaction.java` con campos de cupón.
- [ ] **3. Repositorios:** Crear `DiscountCodeRepository.java` y `DiscountCodeRedemptionRepository.java`.
- [ ] **4. DTOs Backend:** Crear DTOs de validación, canje y administración de cupones.
- [ ] **5. Servicios Backend:**
  - [ ] Implementar `DiscountCodeService.java`.
  - [ ] Implementar `AdminDiscountCodeService.java`.
  - [ ] Actualizar `PaymentService.java` y `BinancePayService.java` para registrar transacciones con descuento.
- [ ] **6. Controladores Backend:**
  - [ ] Agregar endpoints de cupones en `PaymentController.java`.
  - [ ] Crear `AdminDiscountCodeController.java`.
- [ ] **7. Pruebas Backend:** Escribir pruebas unitarias e integración en `talentus-scout-be`.
- [ ] **8. Frontend - Modelos & Servicios:**
  - [ ] Agregar interfaces de cupones a `payment.model.ts`.
  - [ ] Agregar métodos a `payment.service.ts`.
- [ ] **9. Frontend - Checkout:**
  - [ ] Actualizar `checkout-pago-movil-modal.component.ts`, `.html` y `.css`.
- [ ] **10. Frontend - Panel Admin:**
  - [ ] Agregar pestaña y modal de cupones en `admin-payments.component.ts`, `.html` y `.css`.
- [ ] **11. Verificación & Compilación:**
  - [ ] `./mvnw clean compile test` en backend.
  - [ ] `npm run build` en frontend.
- [ ] **12. Plan de Pruebas & Trello:**
  - [ ] Crear `test/TS-23-test-plan-sistema-codigos-descuento-convenios.md`.
  - [ ] Mover tarjeta en Trello a `in testing` con comentario de cierre.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [ ] Validación de cupones funcional con cálculo en tiempo real en USD y VES.
- [ ] Cupones del 100% activan la suscripción deportiva de forma inmediata sin comprobante.
- [ ] Cupones parciales descuentan el monto exacto en pagos por Pago Móvil y Binance Pay.
- [ ] Restricciones de vigencia, límite de usos y 1 uso por atleta validadas en backend.
- [ ] Administrador puede crear, listar, editar, pausar y eliminar cupones desde su panel.
- [ ] Pruebas automatizadas en verde y builds limpios en backend y frontend.
