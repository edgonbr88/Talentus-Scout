# Plan de Pruebas y Verificación: [TS-62] Flujo Integral de Recuperación y Restablecimiento de Contraseña con Token Seguro y Notificación por Correo

**ID Tarea:** TS-62  
**Título:** Flujo Integral de Recuperación y Restablecimiento de Contraseña con Token Seguro y Notificación por Correo  
**Tarjeta Trello:** `https://trello.com/c/9ErLCOWa` / ID: `6ae098158f44d944f4df0b02`  
**Sprint:** Sprint 4  
**Fecha de Ejecución:** 2026-10-27  
**Agente Implementador:** trello_implementer  
**Estado:** PRUEBAS COMPLETADAS — APTO PARA TESTING  

---

## 1. Alcance de las Pruebas

El objetivo de esta batería de pruebas es asegurar que los usuarios de Talentus Scout (representantes legales, scouts acreditados y directivos deportivos) puedan recuperar el acceso a sus cuentas de forma autónoma mediante un mecanismo de token criptográfico temporal (30 minutos) despachado por correo transaccional (Resend API), garantizando al mismo tiempo protección estricta contra ataques de enumeración (OWASP) y salvaguarda de datos (LOPNNA Art. 65).

### Componentes y Clases Impactadas:
- **Base de Datos / Migración DDL (dbmate):**
  - `talentus-scout-migrations/migrations/20261027120000_create_password_reset_tokens_table.sql`: Tabla `password_reset_tokens` con UUID v7, clave foránea en cascada a `users(id)`, índices en `token` y `user_id`.
- **Backend (Spring Boot 3 / Java 21 / Spring Security):**
  - `com.talentus.scout.domain.entity.PasswordResetToken`: Entidad JPA con Lombok y generador UUID v7.
  - `com.talentus.scout.repository.PasswordResetTokenRepository`: Métodos de consulta y limpieza por usuario.
  - `com.talentus.scout.web.dto`: `ForgotPasswordRequest`, `ForgotPasswordResponse`, `ResetPasswordRequest`, `ResetPasswordResponse`.
  - `com.talentus.scout.service.PasswordResetService`: Lógica anti-enumeración, token seguro, hashing BCrypt y expiración de 30m.
  - `com.talentus.scout.service.mail.EmailService`: Método `sendPasswordResetEmail` con plantilla corporativa oscura y botón CTA.
  - `com.talentus.scout.web.controller.AuthController`: Endpoints públicos `POST /api/v1/auth/forgot-password` y `POST /api/v1/auth/reset-password`.
- **Frontend (Angular 18+ Standalone / HTML Separado / `fe-desing.md`):**
  - `talentus-scout-fe/src/app/core/models/auth.model.ts`: Tipos TypeScript de requests y responses.
  - `talentus-scout-fe/src/app/core/auth/auth.service.ts`: Métodos `forgotPassword` y `resetPassword`.
  - `talentus-scout-fe/src/app/features/auth/login/login.component.html`: Enlace accesible "¿Olvidaste tu contraseña?".
  - `talentus-scout-fe/src/app/features/auth/forgot-password/`: Componente y plantilla HTML para solicitud de enlace.
  - `talentus-scout-fe/src/app/features/auth/reset-password/`: Componente y plantilla HTML para validación y cambio de clave con selector de visualización (mostrar/ocultar contraseña).
  - `talentus-scout-fe/src/app/app.routes.ts`: Rutas `/auth/forgot-password` y `/auth/reset-password`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (JUnit 5 / Mockito / SpringBootTest)
Comandos ejecutados:
```bash
./mvnw test -Dtest=PasswordResetServiceTest,AuthControllerPasswordResetTest
```
Resultados: **11 pruebas ejecutadas, 0 fallos, 0 errores (100% PASS)**.

| Suite de Pruebas | Casos Ejecutados | Resultado |
| :--- | :---: | :---: |
| **`PasswordResetServiceTest`** | 7 pruebas unitarias | **PASS (100%)** |
| **`AuthControllerPasswordResetTest`** | 4 pruebas de integración | **PASS (100%)** |

#### Detalle de Pruebas Unitarias (`PasswordResetServiceTest`):
1. `requestPasswordReset_whenUserExists_sendsEmailAndReturnsGenericMessage`: Borra tokens anteriores del usuario, persiste nuevo token criptográfico con caducidad a 30m, despacha correo institucional y devuelve mensaje genérico (**PASS**).
2. `requestPasswordReset_whenUserDoesNotExist_returnsGenericMessageWithoutSendingEmail`: Anti-enumeración OWASP: ante correos inexistentes devuelve la misma respuesta sin enviar correo (**PASS**).
3. `resetPassword_whenTokenValid_updatesPasswordAndMarksUsed`: Actualiza `passwordHash` con BCrypt, marca `usedAt = Instant.now()` y retorna mensaje de éxito (**PASS**).
4. `resetPassword_whenPasswordsDoNotMatch_throwsIllegalArgumentException`: Valida coincidencia estricta entre `newPassword` y `confirmPassword` (**PASS**).
5. `resetPassword_whenTokenNotFound_throwsInvalidTokenException`: Rechaza tokens no registrados (**PASS**).
6. `resetPassword_whenTokenExpired_throwsInvalidTokenException`: Rechaza tokens cuya fecha `expiresAt` ha vencido (**PASS**).
7. `resetPassword_whenTokenAlreadyUsed_throwsInvalidTokenException`: Rechaza tokens con `usedAt != null` evitando ataques de reuso (**PASS**).

#### Detalle de Pruebas de Integración (`AuthControllerPasswordResetTest`):
1. `POST /api/v1/auth/forgot-password` (Usuario existente): HTTP 200 OK con confirmación genérica (**PASS**).
2. `POST /api/v1/auth/forgot-password` (Usuario inexistente): HTTP 200 OK con confirmación genérica idéntica (**PASS**).
3. `POST /api/v1/auth/reset-password` (Token válido): HTTP 200 OK, persistencia en BD y verificación de `matches` con `PasswordEncoder` (**PASS**).
4. `POST /api/v1/auth/reset-password` (Contraseñas no coincidentes): HTTP 400 Bad Request con mensaje descriptivo (**PASS**).

### 2.2. Frontend (Compilación y Verificación de Tipos)
Comando ejecutado:
```bash
npm run build
```
Resultado: **Compilación limpia y empaquetado SSR/Browser completado sin advertencias ni errores (100% PASS)**.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Solicitud de Recuperación de Contraseña (cURL)
```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@talentus.app"}'
```
**Respuesta esperada (HTTP 200 OK):**
```json
{
  "message": "Si el correo electrónico está registrado en Talentus Scout, recibirás un enlace de restablecimiento en los próximos minutos."
}
```

### 3.2. Solicitud con Correo Inexistente (Verificación Anti-enumeración)
```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "cuenta.ficticia@noexiste.com"}'
```
**Respuesta esperada (HTTP 200 OK):**
```json
{
  "message": "Si el correo electrónico está registrado en Talentus Scout, recibirás un enlace de restablecimiento en los próximos minutos."
}
```
*(Nótese que la respuesta es idéntica, impidiendo inferir la existencia del usuario).*

### 3.3. Restablecimiento con Token Válido (cURL)
```bash
# Asumiendo el token obtenido en los logs o en la base de datos:
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN_DE_PRUEBA>",
    "newPassword": "NuevaClave2026*",
    "confirmPassword": "NuevaClave2026*"
  }'
```
**Respuesta esperada (HTTP 200 OK):**
```json
{
  "message": "Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales."
}
```

### 3.4. Restablecimiento con Token Ya Utilizado (Intento de Reuso)
```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN_DE_PRUEBA>",
    "newPassword": "OtraClave2026*",
    "confirmPassword": "OtraClave2026*"
  }'
```
**Respuesta esperada (HTTP 400 Bad Request):**
```json
{
  "error": "BAD_REQUEST",
  "errorCode": "INVALID_TOKEN",
  "message": "Este enlace de restablecimiento ya ha sido utilizado"
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **Tabla DDL `password_reset_tokens`** | **CUMPLIDO** | Migración dbmate ejecutada exitosamente con UUID v7 e índices en `token` y `user_id`. |
| **Protección anti-enumeración OWASP** | **CUMPLIDO** | Mensaje genérico invariable probado en `PasswordResetServiceTest` y `AuthControllerPasswordResetTest`. |
| **Despacho de Correo Institucional** | **CUMPLIDO** | `EmailService.sendPasswordResetEmail` implementado con Resend y branding Talentus Scout. |
| **Caducidad estricta (30 min) y un solo uso** | **CUMPLIDO** | Validado en `isExpired()` y `isUsed()` con excepciones `InvalidTokenException`. |
| **Validación de complejidad y coincidencia** | **CUMPLIDO** | Mínimo 8 caracteres en backend y validación reactiva síncrona en Angular con feedback visual. |
| **UI intencional (`fe-desing.md`) y HTML separado** | **CUMPLIDO** | `ForgotPasswordComponent` y `ResetPasswordComponent` con plantillas `.component.html` independientes y estilos oscuros pulidos. |
| **Enlace en `/login`** | **CUMPLIDO** | Enlace visible y accesible integrado sobre el campo de contraseña en `login.component.html`. |
| **Pruebas y Build** | **CUMPLIDO** | 11/11 tests backend en verde y `npm run build` sin errores. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas
1. **Inyección y normalización:** Se aplica `trim().toLowerCase()` en la dirección de correo antes de la búsqueda en BD.
2. **Invalidación de tokens previos:** Si un usuario solicita recuperación varias veces consecutivas, el sistema borra (`deleteByUser`) tokens anteriores no usados antes de generar el nuevo, garantizando que solo exista un token activo a la vez.
3. **Cuentas creadas por Social Login:** Usuarios registrados con Google o Microsoft que no poseían `passwordHash` previo pueden definir su contraseña mediante este flujo, permitiéndoles inicio de sesión multimodal.
