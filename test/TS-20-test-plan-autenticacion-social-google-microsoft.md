# Plan de Pruebas y Validación — TS-20: Autenticación Social Unificada (OAuth2 / OIDC) con Google y Microsoft

---

## 1. Alcance de las Pruebas
* **Identificador de Tarea:** `[TS-20]`
* **Título:** Autenticación Social Unificada (OAuth2 / OIDC): Login y Registro con Google y Microsoft para Tutores, Scouts y Organizaciones
* **Componentes Backend Impactados:**
  * Entidad JPA `User.java` (campo `isProfileCompleted` con default true).
  * Entidad JPA `UserSocialIdentity.java` (tabla `user_social_identities`).
  * Repositorio `UserSocialIdentityRepository.java`.
  * DTOs: `SocialAuthRequest.java`, `SocialAuthResponse.java`, `CompleteProfileRequest.java`, `UserProfileResponse.java`.
  * Servicio `SocialAuthService.java` (soporte híbrido con Google, Microsoft y Sandbox local).
  * Controlador `AuthController.java` (endpoints `/api/v1/auth/social/google`, `/api/v1/auth/social/microsoft`, `/api/v1/auth/social/complete-profile`).
* **Componentes Frontend Impactados:**
  * Modelo `auth.model.ts` y `user.model.ts`.
  * Servicio `auth.service.ts` (métodos `socialLoginGoogle`, `socialLoginMicrosoft`, `completeProfile`, signal `needsProfileCompletion`).
  * Guard `auth.guard.ts` (redirección automática hacia `/auth/complete-profile` si el perfil está incompleto).
  * Vista `LoginComponent` (`login.component.ts`) con botones oficiales de Google y Microsoft, divisor y panel de sandbox rápido.
  * Vista `RegisterTutorComponent` (`register-tutor.component.ts`) con registro rápido social.
  * Nueva vista Standalone `CompleteProfileComponent` (`complete-profile.component.ts`) bajo la ruta `/auth/complete-profile` (Bento selector de rol, WhatsApp E.164 y consentimiento legal sin menciones de LOPNNA en UI).
  * Rutas `app.routes.ts`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (`./mvnw test`)
* **Resultado:** 109 de 109 pruebas pasaron con éxito (0 fallos, 0 errores, 100% verde).
* **Suites Clave Ejecutadas:**
  1. `SocialAuthServiceTest` (6/6 pruebas unitarias pasadas):
     * `testGoogleAuthNewUser`: Creación de usuario preliminar con Google, retorno de `needsProfileCompletion = true`.
     * `testGoogleAuthExistingUserSameEmail`: Enlace automático de identidad social a usuario existente sin duplicar registros.
     * `testMicrosoftAuthExistingIdentity`: Inicio de sesión directo con Microsoft cuando la identidad ya existe.
     * `testCompleteProfileTutorSuccess`: Actualización de perfil con rol TUTOR, validación de teléfono y guardado de consentimiento legal.
     * `testCompleteProfileTutorWithoutConsentThrows`: Bloqueo con excepción si no se acepta el consentimiento legal para tutores.
     * `testCompleteProfileScoutSuccess`: Creación de `ScoutProfile` en estado `PENDING` para reclutadores.
  2. `AuthControllerSocialIntegrationTest` (3/3 pruebas de integración con MockMvc y Base de Datos):
     * `testGoogleAuthEndpoint`: `POST /api/v1/auth/social/google` con token sandbox responde HTTP 200 con token JWT válido.
     * `testMicrosoftAuthEndpoint`: `POST /api/v1/auth/social/microsoft` con token sandbox responde HTTP 200 con `provider = MICROSOFT`.
     * `testCompleteProfileEndpoint`: `POST /api/v1/auth/social/complete-profile` con Bearer token actualiza rol y entrega sesión definitiva.

### 2.2. Frontend (`npm run build`)
* **Comando:** `npm run build`
* **Resultado:** Compilación exitosa en 15.908s con 0 errores y 0 advertencias bloqueantes. 8 rutas estáticas prerenderizadas correctamente.

---

## 3. Guía de Verificación Manual Paso a Paso (cURL / API)

### Paso 1: Autenticación de Usuario Nuevo vía Google (Sandbox Mode)
```bash
curl -X POST http://localhost:8080/api/v1/auth/social/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "mock-google-token:carlos.nuevo.tutor@talentusscout.com",
    "mockName": "Carlos Mendoza Tutor"
  }'
```
* **Respuesta Esperada (HTTP 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userId": "uuid-generado",
  "email": "carlos.nuevo.tutor@talentusscout.com",
  "fullName": "Carlos Mendoza Tutor",
  "role": "TUTOR",
  "needsProfileCompletion": true,
  "provider": "GOOGLE"
}
```

### Paso 2: Completar Perfil de Tutor con Consentimiento Legal
```bash
curl -X POST http://localhost:8080/api/v1/auth/social/complete-profile \
  -H "Authorization: Bearer <TOKEN_DEL_PASO_1>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "TUTOR",
    "phoneNumber": "+584121234567",
    "acceptLegalConsent": true
  }'
```
* **Respuesta Esperada (HTTP 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "userId": "uuid-generado",
  "email": "carlos.nuevo.tutor@talentusscout.com",
  "fullName": "Carlos Mendoza Tutor",
  "role": "TUTOR"
}
```

### Paso 3: Vinculación Automática de Cuenta Preexistente
Al reintentar el login con el mismo correo:
```bash
curl -X POST http://localhost:8080/api/v1/auth/social/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "mock-google-token:carlos.nuevo.tutor@talentusscout.com"
  }'
```
* **Respuesta Esperada (HTTP 200):**
`needsProfileCompletion: false`. Ingreso directo a la plataforma sin requerir completar perfil nuevamente.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia |
| :--- | :---: | :--- |
| Tabla `user_social_identities` y columna `users.is_profile_completed` migradas en PostgreSQL con dbmate | Cumplido | Migración `20261010153000_create_user_social_identities.sql` aplicada y validada en PostgreSQL 16 |
| Endpoints `/api/v1/auth/social/google`, `/api/v1/auth/social/microsoft` y `/api/v1/auth/social/complete-profile` | Cumplido | Verificados con pruebas de integración MockMvc en `AuthControllerSocialIntegrationTest` |
| Vinculación automática de identidad social si el correo electrónico ya existe | Cumplido | Probado en `SocialAuthServiceTest.testGoogleAuthExistingUserSameEmail` |
| Usuario nuevo redirigido obligatoriamente a `/auth/complete-profile` para definir rol, teléfono y consentimiento | Cumplido | Implementado en `auth.guard.ts`, `LoginComponent` y `CompleteProfileComponent` |
| Auditoría legal en `tutor_legal_consents` (IP, User-Agent, versión 1.0) al completar perfil de tutor | Cumplido | Validado en `SocialAuthService.completeProfile` y verificado en base de datos |
| Cero menciones de "LOPNNA" en la interfaz de usuario de Angular | Cumplido | Auditado mediante grep exhaustivo; se usa "Marco de Protección Legal y Salvaguarda del Menor" |
| 100% de pruebas en verde y build limpio de Angular | Cumplido | 109/109 tests en `./mvnw test` y `npm run build` sin errores en 15.9s |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas
1. **Intento de registrar rol TUTOR sin consentimiento:** Backend rechaza la petición con `IllegalArgumentException` (HTTP 400).
2. **Acceso a dashboard con perfil incompleto:** `auth.guard.ts` intercepta la navegación y redirige de inmediato a `/auth/complete-profile`.
3. **Persistencia de sesión:** Tokens JWT firmados con HMAC-SHA256 respetan el ciclo de vida sin estado de Spring Security 6.
4. **Idempotencia de identidades sociales:** Clave única compuesta `(provider, provider_user_id)` y `(user_id, provider)` previene duplicidad en base de datos.
