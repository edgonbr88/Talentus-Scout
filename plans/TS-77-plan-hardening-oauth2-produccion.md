# Plan de Implementación: [TS-77] Hardening de Autenticación Social OAuth2 para Producción (Verificación Criptográfica JWKS, Bloqueo Mock y UI)

**ID Tarea:** TS-77  
**Tarjeta Trello:** [https://trello.com/c/paGLMovo](https://trello.com/c/paGLMovo)  
**Fecha:** 2026-11-16  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  Tras validar el flujo funcional con Google OAuth2 en ambiente local, se requiere endurecer la seguridad de autenticación social y adaptar los componentes para el despliegue en producción (`https://talentusscout.com`):
  1. En backend (`SocialAuthService`), actualmente el JWT `id_token` se decodifica por Base64 sin verificar su firma criptográfica RS256 ni la audiencia (`aud`), y el modo `mock-`/`sandbox` permanece activo independientemente del entorno. En producción esto permitiría suplantación de cuentas.
  2. En frontend, los componentes `LoginComponent` y `RegisterTutorComponent` muestran el botón técnico **"⚙️ Configurar Client IDs de OAuth2"** incluso en producción, y no consumen automáticamente el `GOOGLE_OAUTH_CLIENT_ID` configurado en el servidor cuando `environment.prod.ts` no lo tiene embebido.
- **Impacto:**
  - Garantiza autenticidad criptográfica de identidades Google/Microsoft vía JWKS antes de emitir un JWT de sesión de Talentus Scout.
  - Deshabilita completamente el modo simulado (`mock-`/`sandbox`) en el perfil `prod`.
  - Limpia la UI de producción ocultando controles de desarrollo y permitiendo inyectar el Client ID oficial desde variables de entorno de Cloud Run.

---

## 2. Alcance Técnico y Arquitectura
- **Backend (`talentus-scout-be`):**
  - `com.talentus.scout.config.OAuthProperties` (Nuevo): Propiedades `@ConfigurationProperties(prefix = "talentus.oauth")` con Lombok.
  - `com.talentus.scout.service.OAuthTokenVerifierService` (Nuevo): Verificación RS256 JWKS (Google & Microsoft), validación de `iss`, `aud`, `exp`, `email_verified`, y caché en memoria de JWKS.
  - `com.talentus.scout.service.SocialAuthService` (Modificado): Uso de `OAuthTokenVerifierService`, bloqueo de `mock-`/`sandbox` si `mockEnabled = false`, y eliminación del fallback a `mockEmail` ante JWT inválidos.
  - `com.talentus.scout.web.dto.OAuthPublicConfigResponse` (Nuevo): DTO Lombok `@Builder`.
  - `com.talentus.scout.web.controller.AuthController` (Modificado): Nuevo endpoint público `GET /api/v1/auth/oauth-config`.
  - `application.yml` & `application-prod.yml` (Modificados): Configuración `talentus.oauth.*`.
  - `OAuthTokenVerifierServiceTest.java` & `SocialAuthServiceTest.java` & `AuthControllerSocialIntegrationTest.java`.
- **Frontend (`talentus-scout-fe`):**
  - `src/app/core/auth/social-auth-manager.service.ts`: Carga dinámica de configuración OAuth desde `/api/v1/auth/oauth-config` y prioridad de entorno en producción.
  - `src/app/features/auth/login/login.component.ts` & `.html`: Ocultar botón de configuración en producción (`!isProduction`) y mensaje controlado si falta configuración en prod.
  - `src/app/features/auth/register-tutor/register-tutor.component.ts` & `.html`: Ocultar botón de configuración en producción (`!isProduction`).
  - Pruebas unitarias actualizadas en `social-auth-manager.service.spec.ts` y specs de login/registro.
- **Documentación (`Talentus-Scout`):**
  - `docs/GUIA_OBTENCION_CLIENT_ID_GOOGLE_MICROSOFT.md`: Incorporar sección 5 de Pase a Producción en GCP (Publicar App, dominios autorizados y variables en Cloud Run).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Ninguno.** No requiere cambios de esquema ni migraciones `dbmate`.

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. `OAuthProperties.java`
- Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/config/OAuthProperties.java`
- Lombok (`@Getter`, `@Setter`), `@Configuration`, `@ConfigurationProperties(prefix = "talentus.oauth")`.
- Campos:
  - `boolean mockEnabled = true;`
  - `boolean verifySignature = true;`
  - `ProviderConfig google = new ProviderConfig("https://www.googleapis.com/oauth2/v3/certs");`
  - `ProviderConfig microsoft = new ProviderConfig("https://login.microsoftonline.com/common/discovery/v2.0/keys");`
  - Subclase `ProviderConfig` con `clientId` (`""`) y `jwksUri`.

### 4.2. `OAuthTokenVerifierService.java`
- Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/service/OAuthTokenVerifierService.java`
- Responsabilidades:
  - Decodifica el header del JWT (`alg`, `kid`). Rechaza algoritmos distintos de `RS256`, `RS384`, `RS512` o ausencia de `kid`.
  - Resuelve la clave pública `RSAPublicKey` desde el JSON JWKS del proveedor (cacheado 1 hora; refresca automáticamente ante `kid` desconocido). Permite inyección/override de JWKS en pruebas unitarias sin llamadas de red.
  - Verifica firma criptográfica y expiración (`exp`) con `Jwts.parser().verifyWith(publicKey).build().parseSignedClaims(token)`.
  - Valida `iss`:
    - Google: `"https://accounts.google.com"` o `"accounts.google.com"`.
    - Microsoft: inicia con `"https://login.microsoftonline.com/"` y termina en `"/v2.0"`.
  - Valida `aud` cuando `clientId` está configurado en el proveedor (soporta `aud` como String o colección).
  - En Google, si `email_verified` está presente y es `false`, rechaza el token.

### 4.3. `SocialAuthService.java` y `AuthController.java`
- En `SocialAuthService`:
  - Inyectar `OAuthProperties` y `OAuthTokenVerifierService`.
  - Mantener constructor compatible o sobrecargado para tests si aplica, o actualizar `SocialAuthServiceTest`.
  - Rechazar tokens `mock-` / `sandbox` cuando `!oauthProperties.isMockEnabled()`.
  - Eliminar fallback hacia `request.getMockEmail()` cuando falle la verificación de un JWT real.
- En `AuthController`:
  - `GET /api/v1/auth/oauth-config` -> retorna `OAuthPublicConfigResponse` (`googleClientId`, `microsoftClientId`, `mockEnabled`).

---

## 5. Frontend: Angular 18+

### 5.1. `SocialAuthManagerService`
- Método `ensureOAuthConfigLoaded(): Promise<void>` (y carga temprana no bloqueante en el constructor/navegador) consultando `GET /api/v1/auth/oauth-config` vía `HttpClient` cuando `environment.googleClientId` / `environment.microsoftClientId` estén vacíos.
- En `environment.production === true`, ignorar valores manuales de `localStorage` para Client IDs (usar únicamente `environment` o el endpoint oficial `/api/v1/auth/oauth-config`).

### 5.2. `LoginComponent` y `RegisterTutorComponent`
- Exponer `readonly isProduction = environment.production;`.
- Envolver el botón **"⚙️ Configurar Client IDs de OAuth2"** con `@if (!isProduction)` en ambos HTMLs.
- En `loginWithGoogle()` / `loginWithMicrosoft()`, si tras consultar `ensureOAuthConfigLoaded()` no hay Client ID:
  - En `!isProduction`: abrir el modal técnico de configuración (`openConfigModal(...)`).
  - En `isProduction`: mostrar mensaje de alerta amigable (`this.errorMessage = 'El inicio de sesión con Google no está disponible en este momento.'`).

---

## 6. Pruebas y Verificación
- Backend: `./mvnw test -Dtest=OAuthTokenVerifierServiceTest,SocialAuthServiceTest,AuthControllerSocialIntegrationTest` y `./mvnw test`.
- Frontend: `npm test -- --watch=false --browsers=ChromeHeadless` (specs de auth/social) y `npm run build`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Crear ramas `feature/TS-77-hardening-oauth2-produccion` en `talentus-scout-be` y `talentus-scout-fe`.
- [x] Implementar `OAuthProperties`, `OAuthTokenVerifierService`, `OAuthPublicConfigResponse`, actualización de `SocialAuthService`, `AuthController`, `application.yml` y `application-prod.yml`.
- [x] Implementar pruebas unitarias RSA/JWKS y de bloqueo mock en `talentus-scout-be` y validar `./mvnw test`.
- [x] Actualizar `SocialAuthManagerService`, `LoginComponent` (`.ts` y `.html`) y `RegisterTutorComponent` (`.ts` y `.html`) en `talentus-scout-fe`.
- [x] Actualizar pruebas frontend y validar `npm run build`.
- [x] Actualizar `docs/GUIA_OBTENCION_CLIENT_ID_GOOGLE_MICROSOFT.md` con la guía de Pase a Producción.
- [x] Generar `test/TS-77-test-plan-hardening-oauth2-produccion.md`.
- [x] Crear PRs en `talentus-scout-be` y `talentus-scout-fe`, subir docs a `main` en orquestador y mover tarjeta `[TS-77]` a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Tokens `mock-` / `sandbox` rechazados cuando `talentus.oauth.mock-enabled=false`.
- [x] Verificación criptográfica RS256 JWKS + `iss` + `aud` + `exp` operativa en backend.
- [x] Endpoint `GET /api/v1/auth/oauth-config` operativo y consumido por el frontend.
- [x] Botón de configuración OAuth2 oculto cuando `environment.production === true`.
- [x] Compilación y pruebas en verde en ambos repositorios.
