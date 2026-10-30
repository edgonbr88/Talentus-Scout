# Plan y Reporte de Pruebas — [TS-58] Mantenedor de Cuentas de Cobro: Pago Móvil, Wallet Binance y Subida de QR en Panel Admin

## 1. Alcance de las Pruebas

Este documento detalla el plan, la ejecución y los resultados de las pruebas técnicas y funcionales para la tarea **[TS-58]**, correspondiente a la implementación del mantenedor dinámico de cuentas de recaudación institucional (Pago Móvil y Binance Pay / USDT) con soporte para subida de imagen de código QR y switches de activación/pausa en el panel de administración (`/admin/pagos`), reflejando las modificaciones en tiempo real en el modal de checkout de los tutores legales.

### 1.1. Artefactos y Componentes Impactados

* **Base de Datos / DDL (dbmate):**
  * `migrations/20261026190000_create_payment_gateway_settings_table.sql`:
    * Tabla `payment_gateway_settings` con UUID v7, flags booleanos (`pago_movil_enabled`, `binance_manual_enabled`), datos bancarios de Pago Móvil, billetera y Pay ID de Binance, y URL de código QR.
    * Seed canónico inicial ejecutado y registrado en `schema_migrations`.
* **Backend (Spring Boot 3 / Java 21 / Project Lombok):**
  * `PaymentGatewaySetting.java`: Entidad JPA con Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).
  * `PaymentGatewaySettingRepository.java`: Repositorio Spring Data JPA con consulta singleton (`findSingleton()`).
  * `PaymentGatewaySettingsDto.java`: DTO de lectura y respuesta para administración.
  * `UpdatePaymentGatewaySettingsRequest.java`: DTO con validaciones Jakarta (`@NotBlank`, `@NotNull`).
  * `PaymentConfigResponse.java`: Enriquecido con flags `pagoMovilEnabled` y `binanceManualEnabled`.
  * `PaymentConfigService.java`:
    * Refactorización de `getPaymentConfig()` para consumir dinámicamente de PostgreSQL.
    * Métodos transaccionales: `getGatewaySettings()`, `updateGatewaySettings(...)` y `updateBinanceQrUrl(...)`.
  * `AdminPaymentGatewayConfigController.java`:
    * Endpoints asegurados con `@PreAuthorize("hasRole('ADMIN')")`:
      - `GET /api/v1/admin/payments/gateway-settings`: Obtiene configuración actual.
      - `PUT /api/v1/admin/payments/gateway-settings`: Actualiza parámetros bancarios y flags.
      - `POST /api/v1/admin/payments/gateway-settings/binance-qr`: Valida tamaño (≤5MB) y formato MIME (PNG, JPG, WEBP), almacena usando `FileStorageService.storeFile(file, "payments")` y actualiza la URL en BD.
  * `AdminPaymentGatewayConfigControllerTest.java`: Suite de pruebas unitarias e integración en Spring Boot.
* **Frontend (Angular 18+ Standalone / HTML separado / Directivas fe-desing.md):**
  * `payment.model.ts`: Nuevas interfaces `PaymentGatewaySettingsDto` y `UpdatePaymentGatewaySettingsRequest`.
  * `payment.service.ts`: Métodos `getPaymentGatewaySettings()`, `updatePaymentGatewaySettings()` y `uploadBinanceQrImage()`.
  * `admin-payments.component.ts`:
    * Nueva pestaña `activeTab === 'GATEWAY_SETTINGS'`.
    * Signals reactivos para configuración, formularios de Pago Móvil y Binance, preview de imagen y estados de carga.
    * Métodos `loadGatewaySettings()`, `saveGatewaySettings()`, `onQrFileSelected()`, `uploadSelectedQr()`, `cancelSelectedQr()`.
  * `admin-payments.component.html`:
    * 4ta pestaña en la barra Bento: `⚙️ Cuentas de Cobro`.
    * Tarjeta Bento 1 (Pago Móvil): Switch toggle ON/OFF, inputs de Banco, Teléfono, C.I./RIF y Titular.
    * Tarjeta Bento 2 (Binance): Switch toggle ON/OFF, inputs de Pay ID, Wallet Address, Red y Dropzone con vista previa y subida de QR.
    * Barra de auditoría y última fecha de actualización.
  * `admin-payments.component.css`:
    * Estilos de tarjeta Bento oscura (`#0E1527`), switch toggle accesible, preview de QR y diseño adaptativo a tablet y móvil.
  * `checkout-pago-movil-modal.component.ts` & `.html` & `.css`:
    * Adaptación para deshabilitar pestañas cuando `pagoMovilEnabled` o `binanceManualEnabled` estén en falso, mostrando indicativo "En mantenimiento".
  * `admin-payments.component.spec.ts`: Suite de pruebas unitarias para el componente de administración.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Integration Tests (Spring Boot / MockMvc)

Comando ejecutado:
```bash
./mvnw test -Dtest=AdminPaymentGatewayConfigControllerTest
```

#### Resultados:
```text
[INFO] Running com.talentus.scout.web.controller.AdminPaymentGatewayConfigControllerTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 31.05 s
[INFO] 
[INFO] Results:
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

#### Detalle de Casos de Prueba Backend:
1. `getGatewaySettings_asAdmin_success`: Verifica que un usuario con rol `ADMIN` obtiene exitosamente el DTO con datos de Pago Móvil, Binance y flags de activación (HTTP 200). **(PASS)**
2. `getGatewaySettings_asTutor_forbidden`: Verifica que un usuario con rol `TUTOR` recibe `403 Forbidden` al intentar consultar los parámetros de recaudación. **(PASS)**
3. `updateGatewaySettings_asAdmin_success`: Valida la persistencia de nuevos datos bancarios y Pay ID, y constata que el endpoint público `/api/v1/payments/config` refleja inmediatamente los cambios sin reiniciar el servidor. **(PASS)**
4. `updateGatewaySettings_validationError_badRequest`: Valida que el envío de cadenas vacías en campos obligatorios de Pago Móvil retorna `400 Bad Request`. **(PASS)**
5. `uploadBinanceQr_asAdmin_success`: Valida la subida de un archivo PNG, su almacenamiento en `/uploads/payments/` y la actualización de `binanceQrImageUrl`. **(PASS)**
6. `uploadBinanceQr_invalidType_badRequest`: Verifica que el envío de un archivo `text/plain` o no admitido retorna `400 Bad Request`. **(PASS)**

---

### 2.2. Frontend Unit Tests (Angular / Karma & ChromeHeadless)

Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

#### Resultados:
```text
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 137 of 137 SUCCESS (3.855 secs / 3.314 secs)
TOTAL: 137 SUCCESS
```

#### Detalle de Casos de Prueba Frontend Específicos para TS-58:
1. `AdminPaymentsComponent (TS-58) should create the admin payments component`: PASS.
2. `AdminPaymentsComponent (TS-58) should load gateway settings on initialization`: Valida la carga inicial del servicio y población reactiva de los campos de formulario. **(PASS)**
3. `AdminPaymentsComponent (TS-58) should switch active tab to GATEWAY_SETTINGS`: Valida la alternancia hacia la pestaña de cuentas de cobro. **(PASS)**
4. `AdminPaymentsComponent (TS-58) should render the Cuentas de Cobro tab button and section`: Valida la existencia del botón de pestaña y la renderización de las 2 tarjetas Bento (Pago Móvil y Binance). **(PASS)**
5. `AdminPaymentsComponent (TS-58) should update gateway settings successfully when form is submitted`: Valida la llamada al servicio con el payload actualizado y el toast de éxito. **(PASS)**
6. `AdminPaymentsComponent (TS-58) should upload binance QR code and update preview url`: Valida la selección de archivo, llamada a `uploadBinanceQrImage` y actualización del display del QR. **(PASS)**

---

### 2.3. Compilación de Producción Frontend (Angular 18+ Client & SSR)

Comando ejecutado:
```bash
npm run build
```

#### Resultados:
```text
✔ Building...
Prerendered 13 static routes.
Application bundle generation complete. [16.719 seconds]
Output location: /home/edgar/Talentus Scout/talentus-scout-fe/dist/talentus-scout-fe
```
* **Estado:** PASS (0 errores de TypeScript, 0 advertencias de plantillas).

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Acceso al Panel de Administración y Pestaña de Cuentas de Cobro
1. Iniciar sesión con una cuenta de usuario con rol `ADMIN` (ej. `admin@talentusscout.com`).
2. Navegar a `/admin/pagos`.
3. En la barra de pestañas superior, hacer clic en la pestaña **`⚙️ Cuentas de Cobro`**.
4. **Verificación Esperada:**
   * La interfaz muestra el título *"Mantenedor de Cuentas de Cobro y Pasarelas"*.
   * Se visualizan dos tarjetas Bento principales: **Pago Móvil Interbancario** y **Binance Pay & Wallet USDT**.
   * Cada tarjeta cuenta con su switch toggle interactivo mostrando el estado *"Activo en Checkout"* o *"Pausado"*.

### 3.2. Modificación de Parámetros de Pago Móvil y Verificación en Vivo
1. En la tarjeta de Pago Móvil:
   * Cambiar el Banco Receptor a `Banco Mercantil (0105)`.
   * Cambiar el Teléfono Receptor a `04249876543`.
   * Cambiar el C.I. / RIF a `J-99887766-5`.
   * Cambiar el Titular a `Talentus Producciones C.A.`.
2. Hacer clic en el botón superior **`💾 Guardar Configuración`**.
3. **Verificación Esperada:**
   * El botón muestra el spinner de carga temporalmente.
   * Se despliega un toast de retroalimentación verde: *"Configuración de cuentas de cobro guardada exitosamente."*
   * La barra inferior de auditoría actualiza la fecha y hora de última modificación.
4. Abrir una nueva ventana en modo incógnito (o como tutor autenticado), acceder a `/dashboard` y hacer clic en *"Adquirir Plan Pro"* para abrir el modal de checkout.
5. **Verificación Esperada en Checkout:**
   * Al seleccionar la pestaña *"Pago Móvil"*, los datos desplegados para transferir coinciden inmediatamente con `Banco Mercantil`, teléfono `04249876543` y titular `Talentus Producciones C.A.`.

### 3.3. Prueba del Switch de Pausa (On/Off) de Pago Móvil
1. En `/admin/pagos` > `⚙️ Cuentas de Cobro`, hacer clic sobre el switch toggle de Pago Móvil para desactivarlo (cambia a *"Pausado"*).
2. Hacer clic en **`💾 Guardar Configuración`**.
3. En el modal de checkout de los tutores:
4. **Verificación Esperada en Checkout:**
   * La pestaña *"Pago Móvil"* aparece deshabilitada con opacidad reducida y la etiqueta en rojo *"En mantenimiento"*.
   * El sistema selecciona automáticamente la pestaña alternativa *"Binance Pay"*.

### 3.4. Subida y Actualización del Código QR de Binance
1. En la tarjeta de Binance de `/admin/pagos`:
2. Hacer clic en el botón **`📁 Seleccionar Imagen`** dentro del bloque *"Actualizar Código QR de Cobro"*.
3. Seleccionar una imagen válida (PNG, JPG o WEBP) de un código QR.
4. **Verificación Esperada:**
   * El panel muestra la previsualización de la imagen con la etiqueta amarilla *"Vista Previa (Sin Guardar)"*.
   * Aparecen los botones de acción *"⬆ Subir Código QR"* y *"✕ Cancelar"*.
5. Hacer clic en **`⬆ Subir Código QR`**.
6. **Verificación Esperada:**
   * La imagen se almacena en el backend (`/uploads/payments/<uuid>.png`).
   * La etiqueta cambia a verde *"QR Publicado"*.
   * Se notifica con toast: *"Código QR de Binance actualizado y publicado con éxito."*
7. En el checkout de tutor, seleccionar *"Binance Pay"* > pestaña *"Pago Manual USDT"* y constatar que el código QR renderizado corresponde a la nueva imagen subida.

### 3.5. Verificación por cURL (API REST)
* **Obtener configuración de pasarelas como Admin:**
  ```bash
  curl -s -X GET "http://localhost:8080/api/v1/admin/payments/gateway-settings" \
    -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" | jq
  ```
* **Actualizar configuración por cURL:**
  ```bash
  curl -s -X PUT "http://localhost:8080/api/v1/admin/payments/gateway-settings" \
    -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "pagoMovilEnabled": true,
      "pagoMovilBank": "Banesco Banco Universal",
      "pagoMovilPhone": "04121234567",
      "pagoMovilIdNumber": "J-50123456-7",
      "pagoMovilAccountHolder": "Talentus Scout C.A.",
      "binanceManualEnabled": true,
      "binancePayId": "283918273",
      "binanceWalletAddress": "TLsV5289FjK93kdJ8193jd93kd9",
      "binanceNetwork": "USDT (TRC-20)"
    }' | jq
  ```
* **Subir archivo de QR por cURL:**
  ```bash
  curl -s -X POST "http://localhost:8080/api/v1/admin/payments/gateway-settings/binance-qr" \
    -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
    -F "file=@/ruta/a/mi-qr.png" | jq
  ```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **Acceso a pestaña `⚙️ Cuentas de Cobro` en `/admin/pagos` con rol ADMIN** | **CUMPLIDO** | Verificado en `AdminPaymentsComponent` con control de pestaña `GATEWAY_SETTINGS` y guard `admin.guard`. |
| **Persistencia en PostgreSQL mediante migración DDL de dbmate** | **CUMPLIDO** | Migración `20261026190000_create_payment_gateway_settings_table.sql` aplicada y registrada con tabla singleton `payment_gateway_settings`. |
| **Cambios en Pago Móvil y Binance se reflejan en tiempo real en checkout sin reiniciar backend** | **CUMPLIDO** | `PaymentConfigService.getPaymentConfig()` consulta la BD dinámicamente y la prueba de integración verifica la propagación inmediata a `/api/v1/payments/config`. |
| **Subida de QR de Binance valida formato (PNG/JPG/WEBP) y peso (<5MB), con preview y actualización en vivo** | **CUMPLIDO** | Endpoint `POST /binance-qr` con validación de tipo y peso, almacenamiento local en `/uploads/payments/` y preview reactivo en frontend. |
| **Switches On/Off inhabilitan u ocultan métodos de pago en checkout de tutores** | **CUMPLIDO** | Integrado en `checkout-pago-movil-modal.component.html` con clase `.tab-disabled` y advertencia de mantenimiento si están pausados. |
| **Pruebas de integración de backend ejecutadas con éxito (`./mvnw test`)** | **CUMPLIDO** | `AdminPaymentGatewayConfigControllerTest`: 6 de 6 pruebas aprobadas al 100%. |
| **Pruebas de frontend y compilación limpia (`npm test` y `npm run build`)** | **CUMPLIDO** | `TOTAL: 137 SUCCESS` en Karma y `npm run build` finalizado con éxito prerenderizando 13 rutas estáticas. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Control de Acceso Basado en Roles (RBAC):**
   * Los endpoints `/api/v1/admin/payments/gateway-settings/**` exigen obligatoriamente la autoridad `ROLE_ADMIN`. Solicitudes anónimas o con rol `ROLE_TUTOR` / `ROLE_SCOUT` reciben `403 Forbidden` o `401 Unauthorized`.
2. **Validación Exhaustiva de Archivo QR:**
   * Prevención de ejecución de scripts o subidas maliciosas validando `Content-Type` estricto en backend y frontend.
   * Límite estricto de 5MB por archivo para prevenir consumo desmedido de disco.
3. **Mantenimiento Simultáneo de Pasarelas:**
   * Si el administrador pausa simultáneamente Pago Móvil y Binance, el modal de checkout presenta una alerta general indicando que las pasarelas están en conciliación temporal, impidiendo que el usuario envíe reportes vacíos.
4. **Patrón Builder y Arquitectura Lombok:**
   * Todas las entidades y DTOs aplican obligatoriamente anotaciones de Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`), garantizando inmutabilidad y legibilidad.
