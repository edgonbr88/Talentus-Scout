# Plan de Implementación — TS-20: Autenticación Social Unificada (OAuth2 / OIDC) con Google y Microsoft

---

## 1. Identificación
* **Tarea:** `[TS-20] Autenticación Social Unificada (OAuth2 / OIDC): Login y Registro con Google y Microsoft para Tutores, Scouts y Organizaciones`
* **Tablero:** Talentus Scout (`https://trello.com/b/rPHiaZJ1/talentus-scout`)
* **ID de Tarjeta en Trello:** `6abd7329a969ad83f1e115b8`
* **Sprint:** Sprint 4
* **Estado:** `in development`

---

## 2. Resumen y Contexto de Negocio
* **Justificación de Negocio:**
  * Minimiza la fricción de entrada eliminando la barrera de memorizar y escribir credenciales manuales para Tutores legales, Scouts y Organizaciones de Fútbol.
  * Reduce drásticamente la tasa de rebote durante la captación de usuarios en campañas publicitarias o accesos rápidos desde teléfonos móviles.
  * **Vinculación Transparente de Cuentas:** Si un usuario preexistente con registro local (email + contraseña) pulsa "Continuar con Google" o "Continuar con Microsoft" utilizando el mismo correo electrónico validado por el proveedor de identidad (OIDC), el sistema vincula automáticamente la cuenta en `user_social_identities` e inicia sesión sin generar usuarios duplicados ni requerir reingreso de contraseña.
* **Salvaguarda y Protección Legal al Menor (LOPNNA Art. 65 / FIFA Guardians):**
  * Ningún usuario que ingrese por Google o Microsoft queda exento del blindaje legal si gestionará atletas menores de edad.
  * Si un usuario es nuevo, el backend entrega un token con flag `needsProfileCompletion: true`. El frontend lo redirige obligatoriamente a `/auth/complete-profile`.
  * En `/auth/complete-profile`, el usuario debe seleccionar su rol (`TUTOR`, `SCOUT`, `VERIFIER_ORG`), ingresar su teléfono en formato internacional (WhatsApp) y, de seleccionar rol de Tutor, aceptar expresamente el consentimiento de patria potestad (registrando IP, User-Agent y timestamp en `tutor_legal_consents`).
  * **Directiva Estricta de Vocabulario:** Se prohíbe el uso de la palabra "LOPNNA" en la interfaz de usuario de Angular (se debe utilizar "Protección Integral y Salvaguarda Legal del Menor").
* **Modo Híbrido (Producción + Sandbox Local):**
  * Backend y frontend soportan Client IDs reales de Google y Microsoft (validación de firma OIDC JWKS).
  * Incluye modo Sandbox de desarrollo: si se envían tokens con prefijo `mock-google-token:` o `mock-ms-token:`, el sistema emula la verificación de identidad extrayendo los datos del payload sin requerir configuración previa en Google Cloud Console o Azure AD Portal, acelerando las pruebas locales y de integración continua.

---

## 3. Arquitectura y Modelo de Datos

### 3.1. Migración DDL con dbmate
Archivo: `talentus-scout-migrations/migrations/20261010153000_create_user_social_identities.sql`

```sql
-- migrate:up
-- Tabla de identidades sociales vinculadas a usuarios
CREATE TABLE IF NOT EXISTS user_social_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'GOOGLE', 'MICROSOFT'
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_social_identity_provider_uid UNIQUE (provider, provider_user_id),
    CONSTRAINT uq_social_identity_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_social_identities_user_id ON user_social_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_social_identities_provider_email ON user_social_identities(provider_email);

-- Agregar columna is_profile_completed a users para controlar usuarios preliminares
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN NOT NULL DEFAULT TRUE;

-- migrate:down
ALTER TABLE users DROP COLUMN IF EXISTS is_profile_completed;
DROP TABLE IF EXISTS user_social_identities;
```

---

## 4. Especificación Backend (Spring Boot 3.4 / Java 21)

### 4.1. Modelos y Entidades JPA (Lombok Estricto)
1. **`User.java` (Modificación):**
   * Añadir campo `@Builder.Default @Column(name = "is_profile_completed", nullable = false) private boolean isProfileCompleted = true;`
2. **`UserSocialIdentity.java` (Nueva Entidad):**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/UserSocialIdentity.java`
   * Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
   * Campos:
     * `id`: `UUID`
     * `user`: `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) User`
     * `provider`: `String` (o enum `SocialProvider`: `GOOGLE`, `MICROSOFT`)
     * `providerUserId`: `String`
     * `providerEmail`: `String`
     * `createdAt`: `Instant`
3. **`SocialProvider.java` (Nuevo Enum):**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/domain/enums/SocialProvider.java`
   * Valores: `GOOGLE`, `MICROSOFT`

### 4.2. Repositorios Spring Data JPA
1. **`UserSocialIdentityRepository.java` (Nueva Interfaz):**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/repository/UserSocialIdentityRepository.java`
   * Métodos:
     * `Optional<UserSocialIdentity> findByProviderAndProviderUserId(String provider, String providerUserId);`
     * `Optional<UserSocialIdentity> findByUserIdAndProvider(UUID userId, String provider);`
     * `boolean existsByProviderAndProviderUserId(String provider, String providerUserId);`

### 4.3. DTOs de Autenticación Social (Lombok Estricto)
1. **`SocialAuthRequest.java`:**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/SocialAuthRequest.java`
   * Campos:
     * `@NotBlank private String token;` (idToken o credential de Google / Access Token o ID Token de Microsoft)
     * `private String mockEmail;` (opcional para sandbox / tests)
     * `private String mockName;` (opcional para sandbox / tests)
2. **`SocialAuthResponse.java`:**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/SocialAuthResponse.java`
   * Campos:
     * `private String token;` (JWT de Talentus Scout)
     * `private String tokenType;` ("Bearer")
     * `private long expiresIn;`
     * `private UUID userId;`
     * `private String email;`
     * `private String fullName;`
     * `private UserRole role;`
     * `private boolean needsProfileCompletion;` (true si el usuario es nuevo y debe completar rol/teléfono/consentimiento)
3. **`CompleteProfileRequest.java`:**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/CompleteProfileRequest.java`
   * Campos:
     * `@NotNull private UserRole role;` (`TUTOR`, `SCOUT`, `VERIFIER_ORG`)
     * `@NotBlank @Pattern(regexp = "^\\+[1-9]\\d{6,14}$") private String phoneNumber;`
     * `private Boolean acceptLegalConsent;` (requerido si role == TUTOR)
     * `private String organizationName;` (opcional si role == SCOUT o VERIFIER_ORG)
     * `private String scoutRole;` (opcional si role == SCOUT)
     * `private String linkedinUrl;` (opcional si role == SCOUT)

### 4.4. Servicios de Negocio
1. **`SocialAuthService.java`:**
   * Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/service/SocialAuthService.java`
   * Métodos:
     * `SocialAuthResponse authenticateWithGoogle(SocialAuthRequest request, String ip, String userAgent);`
     * `SocialAuthResponse authenticateWithMicrosoft(SocialAuthRequest request, String ip, String userAgent);`
     * `AuthResponse completeProfile(UUID userId, CompleteProfileRequest request, String ip, String userAgent);`
   * Lógica de resolución de identidad:
     1. Extraer o simular claims del proveedor (`providerUserId`, `email`, `fullName`).
     2. Si existe `UserSocialIdentity` con `(provider, providerUserId)`:
        - Obtener usuario. Si `isProfileCompleted == false`, retornar con `needsProfileCompletion = true`.
        - Si está completado, retornar JWT y `needsProfileCompletion = false`.
     3. Si no existe identidad social previa:
        - Buscar si existe usuario por `email`:
          - **Usuario Existente:** Vincular nueva `UserSocialIdentity(user, provider, providerUserId, email)`. Si `isProfileCompleted == true`, retornar JWT activo.
          - **Usuario Nuevo:** Crear usuario preliminar con `role = TUTOR`, `passwordHash = RANDOM_BCRYPT`, `phoneNumber = "PENDING"`, `status = ACTIVE`, `isProfileCompleted = false`. Registrar `UserSocialIdentity`. Retornar JWT con `needsProfileCompletion = true`.
   * Lógica de `completeProfile`:
     - Actualizar `User`: asignar `role`, `phoneNumber`, y marcar `isProfileCompleted = true`.
     - Si `role == TUTOR`: Registrar `TutorLegalConsent` con IP, User-Agent y versión "1.0".
     - Si `role == SCOUT`: Crear `ScoutProfile` en estado `PENDING`.
     - Retornar `AuthResponse` final con token renovado.

### 4.5. Controladores REST
1. **`AuthController.java` (Ampliación):**
   * `POST /api/v1/auth/social/google` -> `ResponseEntity<SocialAuthResponse>`
   * `POST /api/v1/auth/social/microsoft` -> `ResponseEntity<SocialAuthResponse>`
   * `POST /api/v1/auth/social/complete-profile` -> `@PreAuthorize("isAuthenticated()") ResponseEntity<AuthResponse>` (o con usuario autenticado vía JWT temporal).

---

## 5. Especificación Frontend (Angular 18+ Standalone)

### 5.1. Modelos y Servicios Core
1. **`auth.model.ts`:**
   * Agregar interfaces `SocialAuthRequest`, `SocialAuthResponse`, `CompleteProfileRequest`.
2. **`auth.service.ts`:**
   * Métodos:
     * `socialLoginGoogle(token: string, mockData?: { email?: string; name?: string }): Observable<SocialAuthResponse>`
     * `socialLoginMicrosoft(token: string, mockData?: { email?: string; name?: string }): Observable<SocialAuthResponse>`
     * `completeProfile(data: CompleteProfileRequest): Observable<AuthResponse>`
   * Manejo reactivo de `isProfileCompleted` en Signals de sesión.

### 5.2. Componentes UI (Diseño Intencional y Directivas `fe-desing.md`)
1. **Botones de Inicio Social en `login.component.ts` y `register-tutor.component.ts`:**
   * Botones estilizados con iconos SVG oficiales:
     * "Continuar con Google" (botón con borde sutil, fondo dark surface, logo Google a 4 colores).
     * "Continuar con Microsoft" (botón con borde sutil, fondo dark surface, logo Microsoft 4 cuadrados).
   * Modo Sandbox / Interactivo para desarrollo local rápido: modal o desplegable de prueba con 1-clic para simular Tutor nuevo, Tutor existente o Scout.
2. **Nuevo Componente `CompleteProfileComponent`:**
   * Ruta: `talentus-scout-fe/src/app/features/auth/complete-profile/complete-profile.component.ts`
   * Ruta en router: `/auth/complete-profile`
   * Selector interactivo de rol:
     * Tarjeta 1: **Representante / Tutor Legal** (Gestión de cédulas deportivas y consentimiento familiar).
     * Tarjeta 2: **Scout / Reclutador Profesional** (Búsqueda de talentos, radar y acreditación deportiva).
     * Tarjeta 3: **Organización / Academia / Club** (Verificación y representación institucional).
   * Formulario reactivo:
     * Teléfono internacional (validación estricta E.164 ej: `+584121234567`).
     * Si rol es Tutor: Bloque visual de **"Marco de Protección Legal y Salvaguarda del Menor"** con checkbox obligatorio de aceptación de patria potestad. **(Cero menciones de LOPNNA en la UI)**.
     * Si rol es Scout/Club: Nombre de la organización y cargo.
   * Envío a `/api/v1/auth/social/complete-profile` y redirección inmediata según rol:
     * Tutor -> `/dashboard`
     * Scout -> `/scout/directory` (o aviso de verificación pendiente)
     * Admin -> `/admin/scouts`

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Automatizadas Backend (JUnit 5 / Spring Boot)
1. `SocialAuthServiceTest.java`:
   * Prueba 1: Autenticación de usuario nuevo con Google -> Retorna `needsProfileCompletion = true`.
   * Prueba 2: Completar perfil con rol TUTOR -> Guarda `TutorLegalConsent` y activa `isProfileCompleted = true`.
   * Prueba 3: Autenticación con Google para usuario preexistente por email -> Vincula identidad social y retorna `needsProfileCompletion = false`.
   * Prueba 4: Autenticación con Microsoft exitosa.
2. `AuthControllerSocialIntegrationTest.java`:
   * Endpoints `/api/v1/auth/social/google`, `/api/v1/auth/social/microsoft` y `/api/v1/auth/social/complete-profile`.

### 6.2. Pruebas Manuales (cURL)
* Flujo de autenticación con Google y Microsoft vía endpoints de mock/sandbox y verificación de base de datos.

---

## 7. Checklist de Implementación Paso a Paso

- [x] **Fase 1: Base de Datos y Migraciones**
  - [x] Crear archivo de migración `talentus-scout-migrations/migrations/20261010153000_create_user_social_identities.sql`.
  - [x] Aplicar migración en el contenedor Docker `talentus-postgres-dev`.
  - [x] Verificar creación de tabla `user_social_identities` y columna `is_profile_completed` en `users`.

- [x] **Fase 2: Backend (Spring Boot 3 / Java 21 / Lombok)**
  - [x] Actualizar entidad JPA `User.java` con campo `isProfileCompleted`.
  - [x] Crear enum `SocialProvider.java`.
  - [x] Crear entidad JPA `UserSocialIdentity.java` con Lombok estricto (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).
  - [x] Crear repositorio `UserSocialIdentityRepository.java`.
  - [x] Crear DTOs: `SocialAuthRequest.java`, `SocialAuthResponse.java`, `CompleteProfileRequest.java` con Lombok y validaciones Jakarta.
  - [x] Implementar `SocialAuthService.java` con soporte híbrido (verificación y sandbox).
  - [x] Exponer endpoints en `AuthController.java`: `/api/v1/auth/social/google`, `/api/v1/auth/social/microsoft`, `/api/v1/auth/social/complete-profile`.
  - [x] Crear suite de pruebas `SocialAuthServiceTest.java` y `AuthControllerSocialIntegrationTest.java`.
  - [x] Ejecutar `./mvnw test` y garantizar 100% de pruebas en verde.

- [x] **Fase 3: Frontend (Angular 18+ / UI Intencional)**
  - [x] Actualizar interfaces `auth.model.ts` y `user.model.ts` con nuevos contratos.
  - [x] Añadir métodos de autenticación social y completado de perfil en `auth.service.ts`.
  - [x] Integrar botones oficiales "Continuar con Google" y "Continuar con Microsoft" en `LoginComponent` y `RegisterTutorComponent`.
  - [x] Crear componente standalone `CompleteProfileComponent` (`src/app/features/auth/complete-profile/complete-profile.component.ts`).
  - [x] Registrar ruta `/auth/complete-profile` en `app.routes.ts`.
  - [x] Auditar código HTML/TS para garantizar **cero menciones del término "LOPNNA"** en la interfaz gráfica.
  - [x] Ejecutar `npm run build` y verificar compilación limpia.

- [x] **Fase 4: Verificación, Documentación y Cierre en Trello**
  - [x] Redactar reporte de pruebas exhaustivo en `test/TS-20-test-plan-autenticacion-social-google-microsoft.md`.
  - [x] Marcar todos los checkboxes de este plan como completados.
  - [x] Ejecutar script para mover la tarjeta a `in testing` en Trello y publicar comentario de cierre.

---

## 8. Criterios de Aceptación (DoD)
* [x] Arquitectura y contratos técnicos alineados con la Biblia y Especificación Técnica del MVP.
* [x] Tabla `user_social_identities` y columna `users.is_profile_completed` migradas correctamente en PostgreSQL.
* [x] Endpoints REST `/api/v1/auth/social/google`, `/api/v1/auth/social/microsoft` y `/api/v1/auth/social/complete-profile` operativos.
* [x] Enlace automático de cuentas existentes por correo sin duplicar registros en `users`.
* [x] Redirección obligatoria de usuarios nuevos a `/auth/complete-profile` para capturar rol, teléfono y consentimiento legal.
* [x] Cero presencia del vocablo "LOPNNA" en etiquetas, botones o textos visibles para el usuario en Angular.
* [x] Pruebas unitarias e integración en verde (`./mvnw test`).
* [x] Compilación del frontend sin errores ni advertencias bloqueantes (`npm run build`).
* [x] Plan de pruebas documentado en `test/TS-20-test-plan-autenticacion-social-google-microsoft.md` y tarjeta movida a `in testing`.
