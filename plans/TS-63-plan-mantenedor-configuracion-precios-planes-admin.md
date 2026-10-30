# Plan de Implementación: [TS-63] Mantenedor y Configuración de Precios y Planes de Suscripción en Panel Admin

**ID Tarea:** TS-63  
**Título:** Mantenedor y Configuración de Precios y Planes de Suscripción en Panel Admin  
**Tarjeta Trello:** [https://trello.com/c/1NsPEYzo/108-ts-63-mantenedor-y-configuraci%C3%B3n-de-precios-y-planes-de-suscripci%C3%B3n-en-panel-admin](https://trello.com/c/1NsPEYzo/108-ts-63-mantenedor-y-configuraci%C3%B3n-de-precios-y-planes-de-suscripci%C3%B3n-en-panel-admin)  
**ID de Tarjeta en Trello:** `6ae23d10e5496f433e49b192`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-30  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

* **Dinamismo Comercial y Autonomía Administrativa:**  
  Actualmente, los planes de suscripción de Talentus Scout (`subscription_plans`) y sus parámetros clave (tarifas en USD `price_usd`, vigencia en días `duration_days`, cuotas de video `max_videos` y beneficios como acceso al radar de visualizaciones o generación de CV en PDF) se inicializan de forma estática en la base de datos a través de migraciones DDL. Para dotar al equipo directivo y administrativo de flexibilidad comercial (lanzamiento de planes promocionales semestrales, ajustes de precios por inflación o campañas de temporada), se requiere un mantenedor en el panel de administración (`/admin/pagos`).
* **Integridad Financiera y Respeto a Contratos Previos:**  
  Cualquier actualización en los precios o parámetros de un plan aplica exclusivamente a futuras órdenes de pago y suscripciones contratadas tras la modificación. Las suscripciones activas (`athlete_subscriptions`) y las transacciones históricas o en cola de conciliación (`payment_transactions`) mantienen inalterado su snapshot financiero histórico.
* **Política de Remoción Estrictamente Lógica:**  
  Dado que las tablas de suscripciones, transacciones y códigos de descuento mantienen llaves foráneas hacia `subscription_plans(id)`, la eliminación física de un plan está prohibida; en su lugar, se implementa desactivación lógica vía `is_active = FALSE`.
* **Regla de Continuidad Operativa:**  
  El sistema valida que siempre permanezca al menos un (1) plan con `is_active = TRUE` en la plataforma, impidiendo que el administrador desactive por error todos los planes y deje a los tutores sin opción de contratación o renovación.
* **Protección Legal y Transparencia (LOPNNA / FIFA):**  
  Todas las tarifas se expresan en USD con cálculo transparente a tasa oficial BCV, garantizando a los tutores legales certeza absoluta sobre los costos del servicio contratado en beneficio de los atletas menores de edad.

---

## 2. Alcance Técnico y Arquitectura

* **Componentes Afectados:**
  1. **Base de Datos / DDL (dbmate):**
     * Archivo de migración: `talentus-scout-migrations/migrations/20261030103000_add_audit_timestamps_to_subscription_plans.sql`.
     * Adición de columnas de trazabilidad y auditoría temporal: `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` y `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` a la tabla `subscription_plans`.
  2. **Backend (Spring Boot 3 / Java 21 / Lombok):**
     * **Entidad JPA:** Actualización de `SubscriptionPlan.java` para incluir `createdAt`, `updatedAt` y métodos de ciclo de vida (`@PrePersist`, `@PreUpdate`).
     * **DTOs:**
       * `SubscriptionPlanAdminDto`: Modelo completo de lectura para el panel administrativo, incluyendo identificador, nombre, precio USD, duración en días, cuota máxima de videos, flags de radar/CV, estado activo, marcas de tiempo de auditoría y conteo de suscripciones activas asociadas.
       * `CreateSubscriptionPlanRequest`: DTO de entrada con validaciones Jakarta (`@NotBlank`, `@Pattern` para ID en mayúsculas, `@Size`, `@NotNull`, `@DecimalMin`, `@Min`).
       * `UpdateSubscriptionPlanRequest`: DTO de actualización para planes existentes.
     * **Servicio:** `AdminSubscriptionPlanService` con lógica transaccional:
       * Validación de unicidad de ID en altas.
       * Validación de al menos 1 plan activo antes de permitir desactivación.
       * Métodos: `getAllPlans()`, `getPlanById(id)`, `createPlan(request)`, `updatePlan(id, request)`, `toggleStatus(id)`.
     * **Controlador REST:** `AdminSubscriptionPlanController` bajo `/api/v1/admin/subscription-plans`, protegido con `@PreAuthorize("hasRole('ADMIN')")`.
  3. **Frontend (Angular 18+ Standalone / HTML separado / Bento Grid):**
     * Actualización de modelos en `src/app/core/models/payment.model.ts` (`SubscriptionPlanAdminDto`, requests de creación/edición, y enriquecimiento de `SubscriptionPlanDto`).
     * Métodos en `src/app/core/services/payment.service.ts` para consumir los endpoints administrativos de planes.
     * Integración en `src/app/features/admin/payments/admin-payments.component.ts` y `admin-payments.component.html`:
       - Nueva pestaña Bento: `💳 Planes y Precios` (`activeTab === 'PLANS_CONFIG'`).
       - Bento Grid con tarjetas de planes deportivas oscuras de alto contraste (siguiendo `fe-desing.md`).
       - Badges de estado (`Activo` en verde esmeralda / `Inactivo` en gris pizarra).
       - Modal reactivo para crear y editar planes con validación en tiempo real.
       - Switch rápido para alternar `isActive` con feedback toast inmediato y protección del último plan activo.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

Archivo de migración: `talentus-scout-migrations/migrations/20261030103000_add_audit_timestamps_to_subscription_plans.sql`

```sql
-- migrate:up
ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- migrate:down
ALTER TABLE subscription_plans
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at;
```

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Modificación de Entidad JPA: `SubscriptionPlan.java`
**Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/SubscriptionPlan.java`

* Campos a añadir:
  ```java
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at")
  private Instant updatedAt;

  @PrePersist
  protected void onCreate() {
      if (this.createdAt == null) {
          this.createdAt = Instant.now();
      }
      if (this.updatedAt == null) {
          this.updatedAt = Instant.now();
      }
      if (this.isActive == null) {
          this.isActive = true;
      }
      if (this.priceUsd == null) {
          this.priceUsd = BigDecimal.ZERO;
      }
  }

  @PreUpdate
  protected void onUpdate() {
      this.updatedAt = Instant.now();
  }
  ```

### 4.2. DTOs Administrativos
**Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/`

1. **`SubscriptionPlanAdminDto.java`**
   ```java
   package com.talentus.scout.web.dto;

   import lombok.*;
   import java.math.BigDecimal;
   import java.time.Instant;

   @Getter
   @Setter
   @NoArgsConstructor
   @AllArgsConstructor
   @Builder
   public class SubscriptionPlanAdminDto {
       private String id;
       private String name;
       private BigDecimal priceUsd;
       private Integer durationDays;
       private Integer maxVideos;
       private Boolean hasRadarViews;
       private Boolean hasPdfCv;
       private Boolean isActive;
       private Instant createdAt;
       private Instant updatedAt;
       private Long activeSubscribersCount;
   }
   ```

2. **`CreateSubscriptionPlanRequest.java`**
   ```java
   package com.talentus.scout.web.dto;

   import jakarta.validation.constraints.*;
   import lombok.*;
   import java.math.BigDecimal;

   @Getter
   @Setter
   @NoArgsConstructor
   @AllArgsConstructor
   @Builder
   public class CreateSubscriptionPlanRequest {

       @NotBlank(message = "El identificador del plan es obligatorio")
       @Size(min = 3, max = 50, message = "El ID debe tener entre 3 y 50 caracteres")
       @Pattern(regexp = "^[A-Z0-9_]+$", message = "El ID debe contener únicamente letras mayúsculas, números y guiones bajos (ej. PRO_SEMESTRAL)")
       private String id;

       @NotBlank(message = "El nombre del plan es obligatorio")
       @Size(max = 100, message = "El nombre no puede exceder 100 caracteres")
       private String name;

       @NotNull(message = "El precio en USD es obligatorio")
       @DecimalMin(value = "0.00", message = "El precio no puede ser negativo")
       private BigDecimal priceUsd;

       @NotNull(message = "La duración en días es obligatoria")
       @Min(value = 1, message = "La duración mínima debe ser de al menos 1 día")
       private Integer durationDays;

       @NotNull(message = "El límite de videos es obligatorio")
       @Min(value = 0, message = "El límite de videos no puede ser negativo")
       private Integer maxVideos;

       @NotNull(message = "El flag de acceso a radar es obligatorio")
       private Boolean hasRadarViews;

       @NotNull(message = "El flag de generación de CV en PDF es obligatorio")
       private Boolean hasPdfCv;

       @Builder.Default
       private Boolean isActive = true;
   }
   ```

3. **`UpdateSubscriptionPlanRequest.java`**
   ```java
   package com.talentus.scout.web.dto;

   import jakarta.validation.constraints.*;
   import lombok.*;
   import java.math.BigDecimal;

   @Getter
   @Setter
   @NoArgsConstructor
   @AllArgsConstructor
   @Builder
   public class UpdateSubscriptionPlanRequest {

       @NotBlank(message = "El nombre del plan es obligatorio")
       @Size(max = 100, message = "El nombre no puede exceder 100 caracteres")
       private String name;

       @NotNull(message = "El precio en USD es obligatorio")
       @DecimalMin(value = "0.00", message = "El precio no puede ser negativo")
       private BigDecimal priceUsd;

       @NotNull(message = "La duración en días es obligatoria")
       @Min(value = 1, message = "La duración mínima debe ser de al menos 1 día")
       private Integer durationDays;

       @NotNull(message = "El límite de videos es obligatorio")
       @Min(value = 0, message = "El límite de videos no puede ser negativo")
       private Integer maxVideos;

       @NotNull(message = "El flag de acceso a radar es obligatorio")
       private Boolean hasRadarViews;

       @NotNull(message = "El flag de generación de CV en PDF es obligatorio")
       private Boolean hasPdfCv;

       @NotNull(message = "El estado de activación es obligatorio")
       private Boolean isActive;
   }
   ```

### 4.3. Modificación de Repositorio: `SubscriptionPlanRepository.java`
**Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/repository/SubscriptionPlanRepository.java`

* Añadir métodos:
  ```java
  List<SubscriptionPlan> findAllByOrderByPriceUsdAsc();
  long countByIsActiveTrue();
  ```

### 4.4. Servicio: `AdminSubscriptionPlanService.java`
**Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/service/payment/AdminSubscriptionPlanService.java`

* **Anotaciones:** `@Service`, `@RequiredArgsConstructor`, `@Slf4j`.
* **Inyecciones:**
  - `SubscriptionPlanRepository subscriptionPlanRepository;`
  - `AthleteSubscriptionRepository athleteSubscriptionRepository;`
* **Métodos principales:**
  - `List<SubscriptionPlanAdminDto> getAllPlans()`:
    Obtiene todos los planes ordenados por precio ascendente. Mapea cada plan consultando el conteo de suscripciones activas (`countByPlanIdAndStatus(plan.getId(), SubscriptionStatus.ACTIVE)`).
  - `SubscriptionPlanAdminDto getPlanById(String id)`:
    Busca por `id`. Si no existe, lanza `ResourceNotFoundException("Plan de suscripción no encontrado con ID: " + id)`.
  - `@Transactional SubscriptionPlanAdminDto createPlan(CreateSubscriptionPlanRequest request)`:
    - Normaliza el `id` en mayúsculas (`request.getId().trim().toUpperCase()`).
    - Valida que `subscriptionPlanRepository.existsById(normalizedId)` sea falso. Si existe, lanza `IllegalArgumentException("Ya existe un plan de suscripción con el identificador: " + normalizedId)`.
    - Construye la entidad con `.builder()`, guarda y retorna DTO.
    - Log de auditoría: `log.info("Nuevo plan de suscripción creado por admin: {} ({})", plan.getId(), plan.getName());`
  - `@Transactional SubscriptionPlanAdminDto updatePlan(String id, UpdateSubscriptionPlanRequest request)`:
    - Busca el plan existente.
    - Regla de salvaguarda: si `request.getIsActive() == false` y el plan estaba activo, verifica `subscriptionPlanRepository.countByIsActiveTrue() > 1`. Si es el único activo, lanza `IllegalStateException("No es posible desactivar el único plan activo disponible en la plataforma")`.
    - Actualiza campos: `name`, `priceUsd`, `durationDays`, `maxVideos`, `hasRadarViews`, `hasPdfCv`, `isActive`.
    - Guarda y retorna DTO.
    - Log de auditoría: `log.info("Plan de suscripción actualizado por admin: {} - Nuevo precio: ${}", id, request.getPriceUsd());`
  - `@Transactional SubscriptionPlanAdminDto toggleStatus(String id)`:
    - Busca el plan.
    - Si el plan está activo y se va a desactivar, verifica que `countByIsActiveTrue() > 1`.
    - Invierte `plan.setIsActive(!plan.getIsActive())`.
    - Guarda y retorna DTO.

### 4.5. Controlador REST: `AdminSubscriptionPlanController.java`
**Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/AdminSubscriptionPlanController.java`

* **Anotaciones:**
  ```java
  @Slf4j
  @RestController
  @RequestMapping("/api/v1/admin/subscription-plans")
  @RequiredArgsConstructor
  @PreAuthorize("hasRole('ADMIN')")
  ```
* **Endpoints:**
  - `GET /api/v1/admin/subscription-plans`: Retorna `List<SubscriptionPlanAdminDto>` (HTTP 200).
  - `GET /api/v1/admin/subscription-plans/{id}`: Retorna `SubscriptionPlanAdminDto` (HTTP 200).
  - `POST /api/v1/admin/subscription-plans`: `@Valid @RequestBody CreateSubscriptionPlanRequest request`, retorna `ResponseEntity.status(HttpStatus.CREATED).body(...)`.
  - `PUT /api/v1/admin/subscription-plans/{id}`: `@PathVariable String id, @Valid @RequestBody UpdateSubscriptionPlanRequest request`, retorna `ResponseEntity.ok(...)`.
  - `PATCH /api/v1/admin/subscription-plans/{id}/toggle-status`: `@PathVariable String id`, retorna `ResponseEntity.ok(...)`.

---

## 5. Frontend: Angular 18+ (Standalone & Bento Grid)

### 5.1. Actualización de Modelos: `src/app/core/models/payment.model.ts`
* Extender `SubscriptionPlanDto`:
  ```typescript
  export interface SubscriptionPlanDto {
    id: string;
    name: string;
    priceUsd: number;
    durationDays: number;
    maxVideos?: number;
    hasRadarViews?: boolean;
    hasPdfCv?: boolean;
    description?: string;
    isActive: boolean;
  }
  ```
* Nuevas interfaces:
  ```typescript
  export interface SubscriptionPlanAdminDto {
    id: string;
    name: string;
    priceUsd: number;
    durationDays: number;
    maxVideos: number;
    hasRadarViews: boolean;
    hasPdfCv: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    activeSubscribersCount?: number;
  }

  export interface CreateSubscriptionPlanRequest {
    id: string;
    name: string;
    priceUsd: number;
    durationDays: number;
    maxVideos: number;
    hasRadarViews: boolean;
    hasPdfCv: boolean;
    isActive: boolean;
  }

  export interface UpdateSubscriptionPlanRequest {
    name: string;
    priceUsd: number;
    durationDays: number;
    maxVideos: number;
    hasRadarViews: boolean;
    hasPdfCv: boolean;
    isActive: boolean;
  }
  ```

### 5.2. Métodos en `src/app/core/services/payment.service.ts`
```typescript
getAdminSubscriptionPlans(): Observable<SubscriptionPlanAdminDto[]> {
  return this.http.get<SubscriptionPlanAdminDto[]>('/api/v1/admin/subscription-plans');
}

getAdminSubscriptionPlanById(id: string): Observable<SubscriptionPlanAdminDto> {
  return this.http.get<SubscriptionPlanAdminDto>(`/api/v1/admin/subscription-plans/${id}`);
}

createSubscriptionPlan(request: CreateSubscriptionPlanRequest): Observable<SubscriptionPlanAdminDto> {
  return this.http.post<SubscriptionPlanAdminDto>('/api/v1/admin/subscription-plans', request);
}

updateSubscriptionPlan(id: string, request: UpdateSubscriptionPlanRequest): Observable<SubscriptionPlanAdminDto> {
  return this.http.put<SubscriptionPlanAdminDto>(`/api/v1/admin/subscription-plans/${id}`, request);
}

toggleSubscriptionPlanStatus(id: string): Observable<SubscriptionPlanAdminDto> {
  return this.http.patch<SubscriptionPlanAdminDto>(`/api/v1/admin/subscription-plans/${id}/toggle-status`, {});
}
```

### 5.3. Componente `AdminPaymentsComponent` (`.ts` y `.html`)
**Ubicación:** `talentus-scout-fe/src/app/features/admin/payments/`

1. **Estado en `admin-payments.component.ts`:**
   - Pestaña: `readonly activeTab = signal<'PENDING' | 'HISTORY' | 'COUPONS' | 'GATEWAY_SETTINGS' | 'PLANS_CONFIG'>('PENDING');`
   - Señales de Planes:
     - `readonly subscriptionPlans = signal<SubscriptionPlanAdminDto[]>([]);`
     - `readonly isLoadingPlans = signal<boolean>(false);`
     - `readonly isPlanModalOpen = signal<boolean>(false);`
     - `readonly editingPlanId = signal<string | null>(null);`
     - `readonly isSavingPlan = signal<boolean>(false);`
     - `readonly planFormError = signal<string | null>(null);`
   - Variables de Formulario:
     - `planIdInput = '';`
     - `planNameInput = '';`
     - `planPriceUsdInput = 5;`
     - `planDurationDaysInput = 30;`
     - `planMaxVideosInput = 5;`
     - `planHasRadarViewsInput = true;`
     - `planHasPdfCvInput = true;`
     - `planIsActiveInput = true;`
   - Métodos del componente:
     - `loadSubscriptionPlans()`: Invoca `paymentService.getAdminSubscriptionPlans()`.
     - `openCreatePlanModal()`: Resetea campos e inicializa `editingPlanId.set(null)`.
     - `openEditPlanModal(plan: SubscriptionPlanAdminDto)`: Carga campos del plan seleccionado.
     - `closePlanModal()`: Cierra el modal y limpia errores.
     - `savePlan()`: Ejecuta creación o actualización con validaciones y feedback toast.
     - `togglePlanStatus(plan: SubscriptionPlanAdminDto)`: Alterna estado con actualización optimista y toast.

2. **Plantilla `admin-payments.component.html`:**
   - Botón en barra de pestañas:
     ```html
     <button
       type="button"
       class="admin-tab-btn"
       [class.active]="activeTab() === 'PLANS_CONFIG'"
       (click)="setTab('PLANS_CONFIG')"
     >
       <span>💳 Planes y Precios</span>
       <span class="tab-count-badge badge-active" *ngIf="subscriptionPlans().length > 0">
         {{ getActivePlansCount() }} Activos
       </span>
     </button>
     ```
   - Sección `<section *ngIf="activeTab() === 'PLANS_CONFIG'" class="payments-section">`:
     - Encabezado con título, descripción y botón `+ Nuevo Plan de Suscripción`.
     - Bento Grid de planes (`bento-plans-grid`):
       - Cada tarjeta de plan (`plan-card`) muestra:
         - Header con ID del plan (`PRO_MONTHLY`) y Badge de Estado (`Activo` en verde / `Inactivo` en gris).
         - Precio en USD con tipografía de alto impacto (`$5.00 USD`).
         - Metadata en fila: duración en días (`30 días`), cupo de videos (`5 videos`), suscriptores activos.
         - Lista de características con iconos deportivos (Radar de Métricas, Descarga CV PDF).
         - Barra de acciones: Botón `Editar`, Switch On/Off rápido para alternar `isActive`.
   - Modal de Alta / Edición de Plan (`modal-overlay` con `isPlanModalOpen()`):
     - Formulario con campos organizados en grid:
       - ID (deshabilitado en edición, con regla en mayúsculas en creación).
       - Nombre del plan.
       - Precio USD y Duración en días.
       - Límite de videos.
       - Toggles de Radar, CV PDF y Estado Activo.
     - Mensaje de error reactivo (`planFormError()`).
     - Botones `Cancelar` y `Guardar Plan`.

3. **Estilos en `admin-payments.component.css`:**
   - Respetar directrices de `fe-desing.md` y `frontend-design`:
     - Bento Layout con tarjetas de esquinas redondeadas y bordes sutiles oscuros (`var(--border-subtle)`).
     - Paleta deportiva: Esmeralda activo (`var(--color-emerald)` / `#10b981`), estado inactivo apagado con contraste legible, acentos sutiles de ámbar y violeta para planes especiales.
     - Botón flotante o header button estilizado para creación.
     - Modal accesible con backdrop difuminado (`backdrop-filter: blur(8px)`).

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Automatizadas Backend (Spring Boot 3)
* **Archivo:** `talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AdminSubscriptionPlanControllerIntegrationTest.java`
  - `getAllPlans_asAdmin_returnsOkAndList()`: Verifica 200 OK y lista con planes existentes.
  - `createPlan_asAdmin_validRequest_createsAndReturns201()`: Verifica alta correcta con status 201 y persistencia.
  - `createPlan_duplicateId_returns400()`: Verifica rechazo de ID duplicado.
  - `updatePlan_asAdmin_updatesPriceAndFeatures()`: Verifica modificación de precio, nombre y cuotas.
  - `toggleStatus_singleActivePlan_throwsError()`: Verifica salvaguarda que impide desactivar el último plan activo restante.
  - `endpoints_withoutAdminRole_returns403Forbidden()`: Verifica que usuarios anónimos o no administradores reciben 403.

### 6.2. Pruebas Automatizadas Frontend (Karma / Jasmine)
* **Archivo:** `talentus-scout-fe/src/app/features/admin/payments/admin-payments.component.spec.ts`
  - Comprobar que al cambiar a la pestaña `'PLANS_CONFIG'` se invoca `getAdminSubscriptionPlans()`.
  - Comprobar que `openCreatePlanModal()` y `openEditPlanModal()` preparan el formulario correctamente.
  - Comprobar que `togglePlanStatus()` envía la petición PATCH correspondiente y actualiza la lista.

### 6.3. Verificación Manual con cURL
```bash
# 1. Obtener token de admin
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@talentusscout.com","password":"AdminPassword2026!"}' | jq -r '.token')

# 2. Listar todos los planes (activos e inactivos)
curl -i -X GET http://localhost:8080/api/v1/admin/subscription-plans \
  -H "Authorization: Bearer $TOKEN"

# 3. Crear nuevo plan promocional
curl -i -X POST http://localhost:8080/api/v1/admin/subscription-plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PRO_SEMESTRAL",
    "name": "Pase Semestral Promocional",
    "priceUsd": 25.00,
    "durationDays": 180,
    "maxVideos": 8,
    "hasRadarViews": true,
    "hasPdfCv": true,
    "isActive": true
  }'

# 4. Modificar precio y cuota de videos de un plan existente
curl -i -X PUT http://localhost:8080/api/v1/admin/subscription-plans/PRO_SEMESTRAL \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pase Semestral Oro",
    "priceUsd": 22.50,
    "durationDays": 180,
    "maxVideos": 10,
    "hasRadarViews": true,
    "hasPdfCv": true,
    "isActive": true
  }'

# 5. Alternar estado activo/inactivo (Toggle)
curl -i -X PATCH http://localhost:8080/api/v1/admin/subscription-plans/PRO_SEMESTRAL/toggle-status \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Migración DDL dbmate**
  - [x] Crear `talentus-scout-migrations/migrations/20261030103000_add_audit_timestamps_to_subscription_plans.sql`.
  - [x] Ejecutar `dbmate up` y verificar actualización en `schema.sql`.

- [x] **Paso 2: Backend - Entidad y Repositorio**
  - [x] Actualizar `SubscriptionPlan.java` con `createdAt`, `updatedAt`, `@PrePersist` y `@PreUpdate`.
  - [x] Actualizar `SubscriptionPlanRepository.java` con `findAllByOrderByPriceUsdAsc()` y `countByIsActiveTrue()`.

- [x] **Paso 3: Backend - DTOs**
  - [x] Crear `SubscriptionPlanAdminDto.java`.
  - [x] Crear `CreateSubscriptionPlanRequest.java` con validaciones Jakarta.
  - [x] Crear `UpdateSubscriptionPlanRequest.java` con validaciones Jakarta.

- [x] **Paso 4: Backend - Servicio y Controlador**
  - [x] Crear `AdminSubscriptionPlanService.java` implementando lógica de negocio y protección del último plan activo.
  - [x] Crear `AdminSubscriptionPlanController.java` con seguridad Spring Security `@PreAuthorize("hasRole('ADMIN')")`.

- [x] **Paso 5: Frontend - Modelos y Servicio**
  - [x] Actualizar `src/app/core/models/payment.model.ts` con DTOs administrativos e interfaces de request.
  - [x] Añadir métodos de planes en `src/app/core/services/payment.service.ts`.

- [x] **Paso 6: Frontend - Vista y Componente de Administración**
  - [x] Añadir pestaña `'PLANS_CONFIG'` en `admin-payments.component.ts`.
  - [x] Implementar gestión de estado reactivo (señales) y lógica de apertura de modal/toggle en `admin-payments.component.ts`.
  - [x] Diseñar el Bento Grid de planes y modal en `admin-payments.component.html`.
  - [x] Aplicar estilos premium oscuros y deportivos en `admin-payments.component.css` siguiendo `fe-desing.md`.

- [x] **Paso 7: Pruebas y Validación**
  - [x] Implementar pruebas de integración en `AdminSubscriptionPlanControllerIntegrationTest.java`.
  - [x] Ejecutar `./mvnw clean test` en backend y verificar que pasen al 100%.
  - [x] Actualizar pruebas unitarias en `admin-payments.component.spec.ts`.
  - [x] Ejecutar `npm run build` en frontend para verificar compilación limpia.
  - [x] Redactar plan de pruebas en `test/TS-63-test-plan-mantenedor-planes-suscripcion.md`.
  - [x] Mover tarjeta en Trello de `in development` a `in testing` con comentario de resumen.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

1. [x] **Visualización Completa:** El administrador puede ver todos los planes (activos e inactivos) ordenados con sus parámetros completos en la pestaña "Planes y Precios" de `/admin/pagos`.
2. [x] **Edición Dinámica:** El administrador puede modificar el precio (`price_usd`), nombre, duración en días, límite de videos y flags de características de cualquier plan existente sin reiniciar el backend.
3. [x] **Alta de Nuevos Planes:** El administrador puede registrar nuevos planes con identificador único en mayúsculas (`ID_FORMAT`) y validación de campos obligatorios.
4. [x] **Desactivación Lógica y Salvaguarda:** El switch toggle desactiva o activa planes inmediatamente. El sistema prohíbe desactivar el último plan activo disponible.
5. [x] **Integridad en el Checkout Público:** Los tutores y atletas únicamente ven en el modal de checkout de suscripción los planes que tienen `is_active = TRUE`.
6. [x] **Seguridad RBAC:** Las rutas `/api/v1/admin/subscription-plans/**` rechazan peticiones de usuarios sin rol `ROLE_ADMIN` con código HTTP 403 Forbidden.
7. [x] **Pruebas Automatizadas en Verde:** Todas las pruebas unitarias y de integración compilan y pasan exitosamente (`./mvnw test`).
8. [x] **Documentación de Pruebas:** Archivo de pruebas generado en `test/TS-63-test-plan-mantenedor-planes-suscripcion.md` y tarjeta en Trello trasladada a `in testing`.
