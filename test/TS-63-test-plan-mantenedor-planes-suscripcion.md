# Plan de Pruebas y Validación: [TS-63] Mantenedor y Configuración de Precios y Planes de Suscripción en Panel Admin

**ID Tarea:** TS-63  
**Título:** Mantenedor y Configuración de Precios y Planes de Suscripción en Panel Admin  
**Tarjeta Trello:** [https://trello.com/c/1NsPEYzo/108-ts-63-mantenedor-y-configuraci%C3%B3n-de-precios-y-planes-de-suscripci%C3%B3n-en-panel-admin](https://trello.com/c/1NsPEYzo/108-ts-63-mantenedor-y-configuraci%C3%B3n-de-precios-y-planes-de-suscripci%C3%B3n-en-panel-admin)  
**ID Tarjeta en Trello:** `6ae23d10e5496f433e49b192`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-30  
**Estado:** LISTO PARA TESTING  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la integridad funcional, técnica y de negocio del mantenedor administrativo de planes de suscripción (`subscription_plans`), cubriendo:

* **Base de Datos (PostgreSQL / dbmate):**
  * Migración `20261030103000_add_audit_timestamps_to_subscription_plans.sql`: incorporación de `created_at` y `updated_at` a la tabla `subscription_plans`.
* **Backend (Spring Boot 3 / Java 21 / Lombok):**
  * Entidad JPA `SubscriptionPlan` con auditoría `@PrePersist` y `@PreUpdate`.
  * Repositorio `SubscriptionPlanRepository` con ordenamiento por precio y conteo de planes activos.
  * Repositorio `AthleteSubscriptionRepository` con conteo de suscriptores activos por plan (`countByPlanIdAndStatus`).
  * DTOs: `SubscriptionPlanAdminDto`, `CreateSubscriptionPlanRequest` y `UpdateSubscriptionPlanRequest` con validaciones Jakarta.
  * Servicio `AdminSubscriptionPlanService` con validación de unicidad de ID y salvaguarda que impide desactivar el último plan activo restante.
  * Controlador REST `AdminSubscriptionPlanController` bajo `/api/v1/admin/subscription-plans` protegido con `@PreAuthorize("hasRole('ADMIN')")`.
  * `GlobalExceptionHandler` con manejo de `IllegalStateException` y `IllegalArgumentException` mapeados a `400 BAD_REQUEST`.
* **Frontend (Angular 18+ / Signals / Bento Grid / Standalone):**
  * Interfaces en `src/app/core/models/payment.model.ts`.
  * Métodos en `src/app/core/services/payment.service.ts`.
  * Pestaña Bento `💳 Planes y Precios` en `/admin/pagos` (`AdminPaymentsComponent`).
  * Bento Grid interactivo con tarjetas de planes, badges de estado, cuota de videos, vigencia, features y conteo de suscriptores.
  * Modal reactivo para crear y editar planes con validación en tiempo real.
  * Switch toggle rápido para alternar `isActive` con feedback toast inmediato y protección del último plan activo.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=AdminSubscriptionPlanControllerIntegrationTest,AdminPaymentGatewayConfigControllerTest,AdminDiscountCodeControllerTest,PaymentControllerIntegrationTest
```
**Resultado:** `BUILD SUCCESS` — **32 pruebas ejecutadas, 0 errores, 0 fallos.**

| Clase de Prueba | Pruebas | Estado | Descripción de Casos Validados |
| :--- | :---: | :---: | :--- |
| `AdminSubscriptionPlanControllerIntegrationTest` | 9 | ✅ PASS | • Consulta de todos los planes configurados (`GET /api/v1/admin/subscription-plans`) con orden por precio.<br>• Consulta de detalle de plan por ID (`GET .../{id}`).<br>• Creación exitosa de nuevo plan con HTTP 201 (`POST ...`).<br>• Rechazo de creación con ID duplicado (HTTP 400).<br>• Validación de campos obligatorios, precio negativo o duración menor a 1 día (HTTP 400).<br>• Actualización exitosa de parámetros y precios (`PUT .../{id}`).<br>• Alternancia rápida de estado activo/inactivo (`PATCH .../{id}/toggle-status`).<br>• Salvaguarda: Bloqueo de desactivación del último plan activo (HTTP 400).<br>• Seguridad RBAC: HTTP 403 Forbidden para usuarios no autenticados o con rol tutor. |
| `AdminPaymentGatewayConfigControllerTest` | 6 | ✅ PASS | Suite de pasarelas de pago y QR de Binance ejecutada sin regresiones. |
| `AdminDiscountCodeControllerTest` | 6 | ✅ PASS | Suite de convenios y cupones de descuento ejecutada sin regresiones. |
| `PaymentControllerIntegrationTest` | 11 | ✅ PASS | Suite de reporte y conciliación de Pago Móvil / Binance Pay ejecutada sin regresiones. |

### 2.2. Frontend (Compilación y Pruebas Unitarias)
Comandos ejecutados:
```bash
npm run build
```
**Resultado:** `Application bundle generation complete` (Browser y Server bundles generados limpiamente, 16 rutas estáticas pre-renderizadas).

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Preparación de Credenciales de Administrador
```bash
# 1. Obtener Token JWT de Administrador
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"brandon.garcia@talentusscout.com","password":"AdminPassword2026!"}' | jq -r '.token')

echo "Admin Token: $TOKEN"
```

### 3.2. Listar Planes de Suscripción (Admin)
```bash
curl -i -X GET http://localhost:8080/api/v1/admin/subscription-plans \
  -H "Authorization: Bearer $TOKEN"
```
* **Respuesta Esperada:** HTTP 200 OK con arreglo JSON de todos los planes (`PRO_MONTHLY`, `PRO_ANNUAL`, etc.), incluyendo `priceUsd`, `durationDays`, `maxVideos`, `hasRadarViews`, `hasPdfCv`, `isActive`, `createdAt`, `updatedAt` y `activeSubscribersCount`.

### 3.3. Crear un Nuevo Plan Promocional
```bash
curl -i -X POST http://localhost:8080/api/v1/admin/subscription-plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PRO_SEMESTRAL",
    "name": "Plan Pro Semestral Promocional",
    "priceUsd": 25.00,
    "durationDays": 180,
    "maxVideos": 8,
    "hasRadarViews": true,
    "hasPdfCv": true,
    "isActive": true
  }'
```
* **Respuesta Esperada:** HTTP 201 Created con el objeto del plan creado.

### 3.4. Intentar Crear Plan con Identificador Duplicado
```bash
curl -i -X POST http://localhost:8080/api/v1/admin/subscription-plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PRO_SEMESTRAL",
    "name": "Plan Duplicado",
    "priceUsd": 30.00,
    "durationDays": 180,
    "maxVideos": 5,
    "hasRadarViews": true,
    "hasPdfCv": true,
    "isActive": true
  }'
```
* **Respuesta Esperada:** HTTP 400 Bad Request con mensaje: `"Ya existe un plan de suscripción con el identificador: PRO_SEMESTRAL"`.

### 3.5. Editar Precio y Cuotas de un Plan Existente
```bash
curl -i -X PUT http://localhost:8080/api/v1/admin/subscription-plans/PRO_SEMESTRAL \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plan Pro Semestral Oro",
    "priceUsd": 22.50,
    "durationDays": 180,
    "maxVideos": 10,
    "hasRadarViews": true,
    "hasPdfCv": true,
    "isActive": true
  }'
```
* **Respuesta Esperada:** HTTP 200 OK con precio actualizado a `$22.50` y `maxVideos` actualizado a `10`.

### 3.6. Alternar Estado (Pausar / Reactivar Plan)
```bash
curl -i -X PATCH http://localhost:8080/api/v1/admin/subscription-plans/PRO_SEMESTRAL/toggle-status \
  -H "Authorization: Bearer $TOKEN"
```
* **Respuesta Esperada:** HTTP 200 OK con `"isActive": false`. Al consultar `/api/v1/payments/config` (checkout público), `PRO_SEMESTRAL` no aparecerá listado.

### 3.7. Verificación de Seguridad y Roles
```bash
# Sin autenticación
curl -i -X GET http://localhost:8080/api/v1/admin/subscription-plans
```
* **Respuesta Esperada:** HTTP 403 Forbidden.

---

## 4. Flujo de Verificación en Interfaz Visual (Angular 18+)

1. Iniciar sesión como usuario administrador (`brandon.garcia@talentusscout.com`).
2. Navegar a `/admin/pagos`.
3. Hacer clic en la pestaña **`💳 Planes y Precios`**:
   * Verificar que la pestaña muestre el badge dinámico con el número de planes activos (ej. `2 Activos` o `3 Activos`).
   * Verificar la renderización en Bento Grid de las tarjetas de planes.
   * Observar el badge del ID en fuente monospace, el badge de estado esmeralda `Activo` o pizarra `Pausado`, el precio destacado tipográficamente (`$5.00 USD`), los chips de vigencia y cupo de videos, y los indicadores de características (Radar de visualizaciones y Hoja de vida en PDF).
4. **Editar un Plan:**
   * Hacer clic en "Editar Parámetros" en la tarjeta de `Plan Pro Mensual`.
   * Verificar que el ID aparezca deshabilitado (inmutable).
   * Modificar el precio o cuota de videos y guardar.
   * Verificar feedback toast verde de confirmación inmediata y actualización de la tarjeta sin recargar la página.
5. **Crear un Nuevo Plan:**
   * Hacer clic en `+ Nuevo Plan de Suscripción`.
   * Completar el formulario con ID `PRO_TRIMESTRAL`, precio `14.00`, duración `90`, cuota `6` videos y guardar.
   * Verificar la inserción de la nueva tarjeta en el Bento Grid y el incremento del badge del contador.
6. **Probar el Switch Toggle:**
   * Desactivar el plan `PRO_TRIMESTRAL` con el switch.
   * La tarjeta adopta un estilo sutilmente atenuado y el badge cambia a `Pausado`.
7. **Probar Salvaguarda del Último Plan Activo:**
   * Desactivar los planes secundarios dejando únicamente 1 plan activo.
   * Intentar desactivar ese último plan activo.
   * El sistema bloquea la acción y muestra un toast de error: `"No es posible desactivar el único plan activo disponible en la plataforma."`

---

## 5. Matriz de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Verificación |
| :--- | :---: | :--- |
| **1. Visualización Completa de Planes** | ✅ Cumplido | Pestaña `💳 Planes y Precios` en `/admin/pagos` muestra todos los planes con sus parámetros completos y badge de conteo activo. |
| **2. Edición Dinámica sin Reinicio** | ✅ Cumplido | Endpoint `PUT /api/v1/admin/subscription-plans/{id}` y modal reactivo en frontend actualizan precios, nombres, cuotas de videos y vigencias inmediatamente. |
| **3. Alta de Nuevos Planes Comerciales** | ✅ Cumplido | Endpoint `POST /api/v1/admin/subscription-plans` y modal de creación validan formato de ID (`^[A-Z0-9_]+$`) y parámetros obligatorios. |
| **4. Desactivación Lógica y Protección** | ✅ Cumplido | Switch toggle rápido vía `PATCH .../toggle-status`. Salvaguarda en backend y frontend impide desactivar el último plan activo disponible. |
| **5. Integridad en Checkout Público** | ✅ Cumplido | `/api/v1/payments/config` consume `findAllByIsActiveTrue()`, garantizando que tutores y atletas solo vean planes con `is_active = TRUE`. |
| **6. Seguridad RBAC (ROLE_ADMIN)** | ✅ Cumplido | Verificado en `AdminSubscriptionPlanControllerIntegrationTest`: peticiones sin rol `ADMIN` retornan HTTP 403 Forbidden. |
| **7. Pruebas Automatizadas en Verde** | ✅ Cumplido | 32 pruebas de integración en verde (`./mvnw test`). Compilación limpia de frontend (`npm run build`). |
| **8. Trazabilidad y Migración DDL** | ✅ Cumplido | Migración dbmate `20261030103000_add_audit_timestamps_to_subscription_plans.sql` aplicada y reflejada en `schema.sql`. |
