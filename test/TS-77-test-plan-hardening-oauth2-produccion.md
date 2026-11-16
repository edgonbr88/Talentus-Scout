# Plan de Pruebas: [TS-77] Hardening de Autenticación Social OAuth2 para Producción

**ID Tarea:** TS-77  
**Tarjeta Trello:** [https://trello.com/c/paGLMovo](https://trello.com/c/paGLMovo)  
**Fecha:** 2026-11-16  
**Rama Backend:** `feature/TS-77-hardening-oauth2-produccion`  
**Rama Frontend:** `feature/TS-77-hardening-oauth2-produccion`  

---

## 1. Alcance de las Pruebas
- **Backend (`talentus-scout-be`):**
  - `OAuthProperties`: Carga de propiedades `talentus.oauth.*` (`mock-enabled`, `verify-signature`, `google.*`, `microsoft.*`).
  - `OAuthTokenVerifierService`: Validación criptográfica RS256 JWKS, expiración (`exp`), emisor (`iss`), audiencia (`aud`) y verificación de correo (`email_verified`).
  - `SocialAuthService`: Bloqueo estricto de tokens `mock-`/`sandbox` cuando `mock-enabled=false` y eliminación de fallback hacia `mockEmail`.
  - `AuthController`: Nuevo endpoint público `GET /api/v1/auth/oauth-config`.
  - Perfiles `application.yml` y `application-prod.yml`.
- **Frontend (`talentus-scout-fe`):**
  - `SocialAuthManagerService`: Consumo automático de `GET /api/v1/auth/oauth-config` y bloqueo de sobreescritura por `localStorage` cuando `environment.production === true`.
  - `LoginComponent` & `RegisterTutorComponent`: Ocultamiento del botón **"⚙️ Configurar Client IDs de OAuth2"** y del modal de configuración en producción (`isProduction === true`).

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (`talentus-scout-be`)
- **Comando:**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=OAuthTokenVerifierServiceTest,SocialAuthServiceTest,AuthControllerSocialIntegrationTest
  ```
- **Resultados:**
  - `AuthControllerSocialIntegrationTest` (**4/4 PASS**): Incluye verificación de `GET /api/v1/auth/oauth-config` (`200 OK` con `googleClientId`, `microsoftClientId`, `mockEnabled`).
  - `SocialAuthServiceTest` (**8/8 PASS**): Incluye rechazo de tokens `mock-` cuando `mockEnabled=false` y delegación sin fallback a `OAuthTokenVerifierService` para JWT reales.
  - `OAuthTokenVerifierServiceTest` (**6/6 PASS**): Valida firma RS256 contra JWKS con clave RSA 2048-bit real, rechaza firma manipulada, token expirado, audiencia inválida, `email_verified=false`, y valida tokens Microsoft v2.0.
  - **Total Backend Social/OAuth:** **18/18 PASS** (`BUILD SUCCESS`).

### 2.2. Frontend (`talentus-scout-fe`)
- **Comando pruebas unitarias:**
  ```bash
  cd talentus-scout-fe && npm test -- --include src/app/core/auth/oauth-config-production.spec.ts --watch=false --browsers=ChromeHeadless
  ```
  - `oauth-config-production.spec.ts` (**2/2 SUCCESS**): Verifica carga dinámica desde `GET /api/v1/auth/oauth-config` y ocultamiento reactivo de `.btn-config-oauth` y bloqueo de `openConfigModal` cuando `isProduction === true`.
- **Comando compilación producción:**
  ```bash
  cd talentus-scout-fe && npm run build -- --configuration=production
  ```
  - **Resultado:** Exitoso (`20` rutas prerenderizadas, 0 errores).

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Verificación API Backend (cURL)
1. **Consultar configuración pública OAuth:**
   ```bash
   curl -s http://localhost:8080/api/v1/auth/oauth-config | jq
   ```
   **Respuesta esperada:**
   ```json
   {
     "googleClientId": "",
     "microsoftClientId": "",
     "mockEnabled": true
   }
   ```
   *(En producción con `SPRING_PROFILES_ACTIVE=prod` y `GOOGLE_OAUTH_CLIENT_ID` configurado: `mockEnabled: false` y el Client ID de producción).*

2. **Rechazo de token mock en producción (`SPRING_PROFILES_ACTIVE=prod`):**
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/auth/social/google \
     -H "Content-Type: application/json" \
     -d '{"token":"mock-google-token:test@talentusscout.com"}'
   ```
   **Respuesta esperada:** `400 Bad Request` (`El modo de autenticación social simulado está deshabilitado en este entorno.`).

3. **Rechazo de JWT falsificado sin firma válida de Google:**
   ```bash
   curl -i -X POST http://localhost:8080/api/v1/auth/social/google \
     -H "Content-Type: application/json" \
     -d '{"token":"eyJhbGciOiJSUzI1NiIsImtpZCI6ImZha2UifQ.eyJzdWIiOiIxMjMiLCJlbWFpbCI6ImFkbWluQHRhbGVudHVzc2NvdXQuY29tIn0.fakeSig"}'
   ```
   **Respuesta esperada:** `400 Bad Request` (clave JWKS no encontrada / firma inválida).

### 3.2. Verificación UI en Compilación Producción
1. Compilar frontend en modo producción (`ng build --configuration=production`).
2. Abrir `/login` (o `/auth/login`) y `/register-tutor`.
3. **Resultado esperado:** El botón **"⚙️ Configurar Client IDs de OAuth2"** NO aparece en pantalla.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| En `prod` (`OAUTH_MOCK_ENABLED=false`), tokens `mock-`/`sandbox` rechazados | ✅ Verificado | `SocialAuthServiceTest#testRejectsMockTokensWhenMockDisabled` y `application-prod.yml`. |
| Verificación criptográfica RS256 JWKS + `exp` + `iss` + `aud` + `email_verified` | ✅ Verificado | `OAuthTokenVerifierService` y `OAuthTokenVerifierServiceTest` (6/6 PASS). |
| Endpoint `GET /api/v1/auth/oauth-config` operativo y consumido en FE | ✅ Verificado | `AuthControllerSocialIntegrationTest` y `oauth-config-production.spec.ts`. |
| Botón de configuración OAuth2 oculto cuando `environment.production === true` | ✅ Verificado | `@if (!isProduction)` en Login y RegisterTutor + `oauth-config-production.spec.ts`. |
| Compilación producción y pruebas automatizadas en verde | ✅ Verificado | `./mvnw test` (18/18), `npm test` (2/2), `ng build --configuration=production` (OK). |

---

## 5. Casos Borde y Seguridad
- **Rotación de claves JWKS de Google/Microsoft:** `OAuthTokenVerifierService` cachea las claves públicas 1 hora y refresca automáticamente una vez si llega un `kid` nuevo no presente en caché.
- **Sin fallback silencioso:** Eliminado el respaldo a `request.mockEmail` cuando un token JWT real falla validación criptográfica.
- **Documentación actualizada:** Se incorporó la sección 5 en `docs/GUIA_OBTENCION_CLIENT_ID_GOOGLE_MICROSOFT.md` detallando el paso a producción en GCP y variables Cloud Run.
