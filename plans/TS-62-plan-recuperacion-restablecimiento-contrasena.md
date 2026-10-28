# Plan de Implementación: [TS-62] Flujo Integral de Recuperación y Restablecimiento de Contraseña con Token Seguro y Notificación por Correo

**ID Tarea:** TS-62  
**Título:** Flujo Integral de Recuperación y Restablecimiento de Contraseña con Token Seguro y Notificación por Correo  
**Tarjeta Trello:** `https://trello.com/c/9ErLCOWa` / ID: `6ae098158f44d944f4df0b02`  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-27  
**Estado del Plan:** IMPLEMENTADO Y EN TESTING  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Autonomía y Retención de Usuarios:** Permite a representantes legales (tutores), scouts deportivos acreditados y directivos recuperar el acceso a sus cuentas de forma autónoma, segura y en tiempo real sin requerir intervención manual de soporte técnico.
- **Protección contra Ataques de Enumeración (OWASP & LOPNNA):** En el endpoint de solicitud de recuperación (`/api/v1/auth/forgot-password`), el sistema siempre responderá con un mensaje genérico idéntico tanto si el correo existe como si no existe en la base de datos, evitando que atacantes descubran identidades de tutores o scouts registrados.
- **Unificación Multimodal de Cuentas:** Aquellos usuarios registrados originalmente mediante inicio de sesión social (Google o Microsoft) podrán solicitar el restablecimiento y definir una contraseña local, habilitando el acceso híbrido tanto por OAuth2 como por credenciales directas.
- **Seguridad Criptográfica y Caducidad:** Tokens únicos de un solo uso con ventana estricta de 30 minutos de validez, invalidados inmediatamente tras el restablecimiento (`used_at`).

---

## 2. Alcance Técnico y Arquitectura
- **Base de Datos (PostgreSQL / Neon / dbmate):**
  - Nueva migración en `talentus-scout-migrations/migrations/` creando la tabla `password_reset_tokens`.
- **Backend (Spring Boot 3 / Java 21 / Spring Security):**
  - Entidad JPA `PasswordResetToken` con Lombok.
  - Repositorio `PasswordResetTokenRepository`.
  - DTOs de Request/Response: `ForgotPasswordRequest`, `ResetPasswordRequest`, `ForgotPasswordResponse`, `ResetPasswordResponse`.
  - Servicio `PasswordResetService` para orquestar la generación de tokens, envío de emails y actualización segura de contraseñas con `PasswordEncoder`.
  - Endpoints públicos en `AuthController`:
    - `POST /api/v1/auth/forgot-password`
    - `POST /api/v1/auth/reset-password`
  - Método en `EmailService`: `sendPasswordResetEmail` con diseño institucional y botón de restablecimiento.
- **Frontend (Angular 18+ Standalone / HTML Separado / `fe-desing.md`):**
  - Modificación en `LoginComponent` agregando enlace "¿Olvidaste tu contraseña?".
  - Nuevo componente `ForgotPasswordComponent` (`forgot-password.component.ts` y `.html`) para solicitar el enlace.
  - Nuevo componente `ResetPasswordComponent` (`reset-password.component.ts` y `.html`) para capturar el token de la URL y establecer la nueva contraseña.
  - Nuevas rutas en `app.routes.ts`: `/auth/forgot-password` y `/auth/reset-password`.
  - Métodos en `AuthService` de Angular (`forgotPassword`, `resetPassword`).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)

### 3.1. Archivo de Migración DDL
Ruta: `talentus-scout-migrations/migrations/20261027120000_create_password_reset_tokens_table.sql`

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- migrate:down
DROP TABLE IF EXISTS password_reset_tokens;
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Entidad JPA `PasswordResetToken`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/PasswordResetToken.java`
- Anotaciones Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
- Atributos: `id` (UUID v7), `user` (`@ManyToOne(fetch = FetchType.LAZY)`), `token` (String), `expiresAt` (Instant), `usedAt` (Instant), `createdAt` (Instant).
- Métodos de conveniencia: `isExpired()` (`Instant.now().isAfter(expiresAt)`), `isUsed()` (`usedAt != null`).

### 4.2. Repositorio `PasswordResetTokenRepository`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/repository/PasswordResetTokenRepository.java`
- `Optional<PasswordResetToken> findByToken(String token);`
- `Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(User user);`
- `void deleteByUser(User user);`

### 4.3. DTOs de Validación (Jakarta Validation)
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/`
- `ForgotPasswordRequest.java`:
  - `@NotBlank(message = "El correo electrónico es obligatorio")`
  - `@Email(message = "El formato de correo no es válido")`
  - `private String email;`
- `ForgotPasswordResponse.java`:
  - `private String message;`
- `ResetPasswordRequest.java`:
  - `@NotBlank(message = "El token de restablecimiento es obligatorio")`
  - `private String token;`
  - `@NotBlank(message = "La nueva contraseña es obligatoria")`
  - `@Size(min = 8, max = 100, message = "La contraseña debe tener al menos 8 caracteres")`
  - `private String newPassword;`
  - `@NotBlank(message = "La confirmación de contraseña es obligatoria")`
  - `private String confirmPassword;`
- `ResetPasswordResponse.java`:
  - `private String message;`

### 4.4. Servicio `PasswordResetService`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/service/PasswordResetService.java`
- Métodos:
  - `@Transactional public ForgotPasswordResponse requestPasswordReset(ForgotPasswordRequest request)`
    - Buscar `User` por email.
    - Si existe:
      - Generar token criptográfico único (`UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "")`).
      - Establecer caducidad a 30 minutos (`Instant.now().plus(30, ChronoUnit.MINUTES)`).
      - Persistir `PasswordResetToken`.
      - Despachar email vía `emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetLink)`.
    - Retornar siempre: `"Si el correo electrónico está registrado en Talentus Scout, recibirás un enlace de restablecimiento en los próximos minutos."` (anti-enumeración).
  - `@Transactional public ResetPasswordResponse resetPassword(ResetPasswordRequest request)`
    - Validar que `request.getNewPassword().equals(request.getConfirmPassword())`. Si no coinciden, lanzar `IllegalArgumentException("Las contraseñas no coinciden")`.
    - Buscar token en `passwordResetTokenRepository.findByToken(request.getToken())`. Si no existe, lanzar `InvalidTokenException("Token de restablecimiento no válido o inexistente")`.
    - Validar `isUsed()`: Si ya fue usado, lanzar `InvalidTokenException("Este enlace de recuperación ya ha sido utilizado")`.
    - Validar `isExpired()`: Si ya expiró, lanzar `InvalidTokenException("El enlace de recuperación ha expirado. Solicita uno nuevo")`.
    - Hashear nueva clave con `passwordEncoder.encode(request.getNewPassword())`.
    - Actualizar `user.setPasswordHash(hash)`.
    - Marcar `token.setUsedAt(Instant.now())`.
    - Guardar cambios.
    - Retornar mensaje de confirmación exitosa.

### 4.5. Servicio de Correo `EmailService`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/service/mail/EmailService.java`
- Añadir método `sendPasswordResetEmail(String toEmail, String recipientName, String resetLink)`:
  - Formato institucional Talentus Scout (fondo `#0A0F1D`, acento `#10B981` y `#3B82F6`, botón con enlace, nota de seguridad y caducidad de 30 minutos).

### 4.6. Controlador REST `AuthController`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/AuthController.java`
- `POST /api/v1/auth/forgot-password` -> invoca `passwordResetService.requestPasswordReset`.
- `POST /api/v1/auth/reset-password` -> invoca `passwordResetService.resetPassword`.

---

## 5. Especificación Frontend (Angular 18+ Standalone / HTML Separado)

### 5.1. Actualización de `LoginComponent`
- Archivo [login.component.html](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/auth/login/login.component.html):
  - Añadir enlace "¿Olvidaste tu contraseña?" sobre o junto al input de contraseña:
    ```html
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <label for="password" class="form-label" style="margin-bottom: 0;">Contraseña</label>
      <a routerLink="/auth/forgot-password" class="link-forgot-password">¿Olvidaste tu contraseña?</a>
    </div>
    ```

### 5.2. Componente `ForgotPasswordComponent`
Ruta: `talentus-scout-fe/src/app/features/auth/forgot-password/`
- Archivos:
  - `forgot-password.component.ts`
  - `forgot-password.component.html`
- Funcionalidades:
  - Formulario reactivo con validación de email.
  - Al enviar: invoca `authService.forgotPassword(email)`.
  - Despliega estado de éxito amigable: "Solicitud enviada. Si tu correo está registrado, te llegará un enlace válido por 30 minutos".
  - Enlace para volver al login (`/login`).

### 5.3. Componente `ResetPasswordComponent`
Ruta: `talentus-scout-fe/src/app/features/auth/reset-password/`
- Archivos:
  - `reset-password.component.ts`
  - `reset-password.component.html`
- Funcionalidades:
  - Extrae `token` del query param de la URL (`route.queryParams`).
  - Si no viene token: muestra alerta amigable con opción de solicitar enlace.
  - Formulario reactivo con `newPassword` y `confirmPassword` (mínimo 8 caracteres, validación personalizada de coincidencia).
  - Al enviar: invoca `authService.resetPassword(...)`.
  - Al completar con éxito: mensaje de éxito y redirección a `/login` tras 2 segundos o mediante botón directo.
  - Manejo de token inválido/expirado con feedback claro y botón hacia `/auth/forgot-password`.

### 5.4. Servicio Angular `AuthService`
Ruta: `talentus-scout-fe/src/app/core/auth/auth.service.ts`
- Métodos:
  - `forgotPassword(email: string): Observable<{ message: string }>`
  - `resetPassword(payload: { token: string; newPassword: string; confirmPassword: string }): Observable<{ message: string }>`

### 5.5. Rutas en `app.routes.ts`
- `/auth/forgot-password` -> `ForgotPasswordComponent`
- `/auth/reset-password` -> `ResetPasswordComponent`

---

## 6. Pruebas y Validación

### 6.1. Backend Tests (Spring Boot 3 / JUnit 5 / Mockito)
- `PasswordResetServiceTest.java`:
  - `requestPasswordReset_whenUserExists_sendsEmailAndReturnsGenericMessage`
  - `requestPasswordReset_whenUserDoesNotExist_returnsGenericMessageWithoutSendingEmail`
  - `resetPassword_whenTokenValid_updatesPasswordAndMarksUsed`
  - `resetPassword_whenPasswordsDoNotMatch_throwsException`
  - `resetPassword_whenTokenExpired_throwsException`
  - `resetPassword_whenTokenAlreadyUsed_throwsException`
  - `resetPassword_whenTokenNotFound_throwsException`
- `AuthControllerPasswordResetTest.java`:
  - Pruebas de integración HTTP sobre endpoints REST.

### 6.2. Frontend Tests / Compilación
- Ejecutar `npm run build` para asegurar tipado TypeScript estricto y cero errores en plantillas.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Crear migración dbmate `20261027120000_create_password_reset_tokens_table.sql`.
- [x] **Paso 2:** Crear entidad JPA `PasswordResetToken.java` con anotaciones de Lombok.
- [x] **Paso 3:** Crear interfaz de repositorio `PasswordResetTokenRepository.java`.
- [x] **Paso 4:** Crear DTOs Jakarta: `ForgotPasswordRequest`, `ForgotPasswordResponse`, `ResetPasswordRequest`, `ResetPasswordResponse`.
- [x] **Paso 5:** Implementar método `sendPasswordResetEmail` en `EmailService.java`.
- [x] **Paso 6:** Crear servicio `PasswordResetService.java` con lógica anti-enumeración, token hashing y expiración a 30m.
- [x] **Paso 7:** Exponer endpoints `/forgot-password` y `/reset-password` en `AuthController.java`.
- [x] **Paso 8:** Escribir pruebas unitarias y de integración en `PasswordResetServiceTest.java` y ejecutarlas (`./mvnw test`).
- [x] **Paso 9:** Añadir métodos `forgotPassword` y `resetPassword` en `AuthService` de Angular.
- [x] **Paso 10:** Crear componente `ForgotPasswordComponent` con `.ts` y `.html` separados según `fe-desing.md`.
- [x] **Paso 11:** Crear componente `ResetPasswordComponent` con `.ts` y `.html` separados según `fe-desing.md`.
- [x] **Paso 12:** Añadir enlace "¿Olvidaste tu contraseña?" en `LoginComponent`.
- [x] **Paso 13:** Registrar rutas en `app.routes.ts`.
- [x] **Paso 14:** Validar compilación de Frontend (`npm run build`).
- [x] **Paso 15:** Redactar documento de pruebas en `test/TS-62-test-plan-recuperacion-restablecimiento-contrasena.md`.
- [x] **Paso 16:** Mover tarjeta a `in testing` en Trello con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] La tabla `password_reset_tokens` está definida con DDL adecuado y clave foránea en cascada hacia `users`.
- [x] El endpoint `/api/v1/auth/forgot-password` responde exitosamente de forma idéntica exista o no el correo (protección anti-enumeración).
- [x] Si el correo existe, se despacha un email con diseño institucional Talentus Scout y enlace con token seguro.
- [x] El token vence tras 30 minutos y solo puede ser utilizado una sola vez.
- [x] El endpoint `/api/v1/auth/reset-password` valida longitud de clave (mínimo 8 caracteres) y coincidencia entre campos.
- [x] Tras el restablecimiento, el usuario puede iniciar sesión en `/login` con sus nuevas credenciales.
- [x] La interfaz en Angular cumple con la directiva de diseño intencional (`fe-desing.md`) y plantillas HTML separadas.
- [x] Todas las pruebas automatizadas de backend (`./mvnw test`) y compilación frontend (`npm run build`) en verde.
- [x] Documento de pruebas redactado en `test/`.
