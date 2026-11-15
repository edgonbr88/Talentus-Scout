# Plan de Pruebas y Validación — TS-68: Términos y Condiciones para Scouts: Cláusula de Difusión Institucional de Clubes, Modal de Lectura y Trazabilidad Legal

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la integridad funcional, normativa y de seguridad para el consentimiento informado de scouts en Talentus Scout, asegurando la trazabilidad jurídica de la aceptación de términos, la cláusula de difusión institucional y la experiencia de usuario en el registro.

### Componentes y Artefactos Impactados:
* **Base de Datos (PostgreSQL / dbmate):**
  * Migración: `20261106220000_add_scout_terms_and_institutional_diffusion_traceability.sql`.
  * Columnas en `scout_profiles`: `accepted_terms`, `terms_version`, `terms_accepted_at`, `terms_ip_address`, `terms_user_agent`.
* **Backend (Spring Boot 3 / Java 21):**
  * Entidad JPA: `ScoutProfile.java` (campos Lombok, persistencia y trazabilidad de términos).
  * DTO: `RegisterScoutRequest.java` (validaciones `@NotNull` y `@AssertTrue`).
  * Controlador: `AuthController.java` (extracción de IP real mediante `CF-Connecting-IP`, `X-Forwarded-For` y `User-Agent`).
  * Servicio: `AuthService.java` (almacenamiento de trazabilidad temporal y versión de términos).
  * Suite de Pruebas: `AuthScoutRegistrationTest.java`.
* **Frontend (Angular 18+ / Bento Design):**
  * Componente Modal: `ScoutTermsModalComponent` (`scout-terms-modal.component.ts`, `.html`, `.css`).
  * Componente de Registro: `RegisterScoutComponent` (`register-scout.component.ts`, `.html`, `.css`).
  * Pruebas Unitarias: `scout-terms-modal.component.spec.ts`, `register-scout.component.spec.ts`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
cd talentus-scout-be && ./mvnw test -Dtest=AuthScoutRegistrationTest
```
**Resultado:** `BUILD SUCCESS` (8/8 pruebas exitosas, 0 fallos, 0 errores).

| Caso de Prueba | Descripción | Resultado |
|---|---|:---:|
| `registerScout_WithValidData_Returns201AndPendingVerificationStatus` | Valida registro exitoso con `acceptTerms=true`, cabeceras `CF-Connecting-IP` y `User-Agent`, verificando persistencia de los 5 campos en BD | **PASSED** |
| `registerScout_WithoutAcceptedTerms_Returns400BadRequest` | Rechaza registro con `acceptTerms=false` retornando HTTP 400 Bad Request y error de validación | **PASSED** |
| `registerScout_DuplicateEmail_Returns409Conflict` | Verifica rechazo de correo duplicado con términos aceptados | **PASSED** |
| `registerScout_MissingCredentialsFile_Returns400BadRequest` | Valida obligatoriedad de archivo de acreditación deportiva | **PASSED** |
| `registerScout_MissingSelfieOrIdDocument_Returns400BadRequest` | Valida obligatoriedad de selfie en vivo y documento de identidad | **PASSED** |
| `registerScout_WithOrganizationClubId_AssignsOfficialClubName` | Asigna nombre oficial de club verificado con consentimiento legal | **PASSED** |
| `registerScout_WithCustomClubOther_CreatesUnverifiedClubOrganization` | Registra club formativo no verificado con consentimiento legal | **PASSED** |
| `registerScout_AsIndependentAgent_AssignsIndependent` | Registra agente independiente con consentimiento y trazabilidad | **PASSED** |

### 2.2. Frontend (Angular 18+ / Jasmine / Karma)
Comando ejecutado:
```bash
cd talentus-scout-fe && CHROME_BIN=/usr/bin/google-chrome npm test -- --watch=false
```
**Resultado:** `TOTAL: 165 SUCCESS` (165 pruebas unitarias exitosas, 0 fallos).

Pruebas específicas de TS-68 cubiertas:
* `ScoutTermsModalComponent`:
  * Creación y renderizado condicional con `@if (isOpen)`.
  * Visualización íntegra de los 4 pilares Bento.
  * Emisión de eventos `closeModal` y `acceptTerms`.
* `RegisterScoutComponent`:
  * Validación reactiva de `acceptTerms: [false, [Validators.requiredTrue]]`.
  * Apertura y cierre interactivo del modal Bento sin abandonar el formulario.
  * Marcado automático del checkbox al confirmar en el modal (`onAcceptTermsFromModal`).
  * Inclusión de `acceptTerms: true` en el payload `FormData`.

### 2.3. Compilación de Producción Frontend y SSR
Comando ejecutado:
```bash
cd talentus-scout-fe && npm run build
```
**Resultado:** `Application bundle generation complete. Prerendered 16 static routes.` (Compilación sin errores).

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Prueba cURL Backend: Validación de Rechazo por Falta de Aceptación (HTTP 400)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-scout \
  -F "email=scout.test.rechazo@talentusscout.com" \
  -F "password=Password123*" \
  -F "fullName=Evaluador Sin Terminos" \
  -F "phoneNumber=+584121234567" \
  -F "organizationName=Club de Prueba" \
  -F "scoutRole=Reclutador" \
  -F "idDocumentType=V" \
  -F "idDocumentNumber=12345678" \
  -F "acceptTerms=false" \
  -F "credentialsFile=@/tmp/dummy_credential.pdf" \
  -F "idDocumentFile=@/tmp/dummy_id.pdf" \
  -F "selfieFile=@/tmp/dummy_selfie.jpg"
```
**Respuesta Esperada:**
```json
{
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "Debe aceptar obligatoriamente los Términos y Condiciones para Scouts y la cláusula de difusión institucional"
}
```

### 3.2. Prueba cURL Backend: Registro Exitoso con Trazabilidad (HTTP 201)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-scout \
  -H "CF-Connecting-IP: 200.74.192.10" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) TalentusClient/1.0" \
  -F "email=scout.oficial.exitoso@talentusscout.com" \
  -F "password=Password123*" \
  -F "fullName=Roberto Ojeador" \
  -F "phoneNumber=+584121234567" \
  -F "organizationName=Caracas FC" \
  -F "scoutRole=Reclutador Oficial" \
  -F "idDocumentType=V" \
  -F "idDocumentNumber=25678910" \
  -F "acceptTerms=true" \
  -F "credentialsFile=@/tmp/dummy_credential.pdf" \
  -F "idDocumentFile=@/tmp/dummy_id.pdf" \
  -F "selfieFile=@/tmp/dummy_selfie.jpg"
```
**Respuesta Esperada:**
* Código HTTP: `201 Created`
* Base de datos:
  ```sql
  SELECT accepted_terms, terms_version, terms_accepted_at, terms_ip_address, terms_user_agent 
  FROM scout_profiles 
  WHERE organization_name = 'Caracas FC';
  ```
  * `accepted_terms`: `true`
  * `terms_version`: `'1.0'`
  * `terms_accepted_at`: timestamp reciente
  * `terms_ip_address`: `'200.74.192.10'`
  * `terms_user_agent`: `'Mozilla/5.0 (X11; Linux x86_64) TalentusClient/1.0'`

### 3.3. Verificación Visual en Interfaz (Angular)
1. Navegar a `http://localhost:4200/auth/register-scout`.
2. Completar los campos de datos personales, club y credenciales.
3. Observar la sección final de consentimiento legal: el botón de envío permanece inhabilitado mientras `acceptTerms` esté desmarcado.
4. Hacer clic sobre el enlace *"Términos y Condiciones para Scouts"*:
   * Se abre el modal Bento oscuro con animación fluida.
   * Verificar los 4 pilares:
     * Pilar 1: Protección Integral del Menor (LOPNNA Art. 65 / FIFA Guardians).
     * Pilar 2: Uso Ético y Confidencial de Fichas Deportivas.
     * Pilar 3: Cláusula de Autorización Expresa de Difusión Institucional de Clubes.
     * Pilar 4: Declaración Jurada, Responsabilidad y Consecuencias de Falsedad.
5. Hacer clic en el botón *"Aceptar y Volver al Registro"*:
   * El modal se cierra.
   * La casilla de verificación queda automáticamente marcada como aceptada.
   * El botón de envío se activa.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Evidencia / Mecanismo de Verificación | Estado |
|---|---|:---:|
| 1. Migración DDL dbmate aplicada correctamente con columnas de trazabilidad | Migración `20261106220000_...` aplicada en PostgreSQL local con columnas añadidas a `scout_profiles` | **CUMPLIDO** |
| 2. Rechazo en backend y frontend si no se marca la casilla obligatoria | Validación `@NotNull` y `@AssertTrue` en DTO; control reactivo con `Validators.requiredTrue` | **CUMPLIDO** |
| 3. Modal Bento responsivo accesible con texto legal completo y cláusula de difusión | Componente `ScoutTermsModalComponent` standalone con diseño Bento, 4 pilares y diseño adaptativo | **CUMPLIDO** |
| 4. Registro almacena `accepted_terms = true`, `terms_version = '1.0'`, IP y User-Agent | Verificado en prueba de integración `registerScout_WithValidData_...` con aserciones directas sobre entidad | **CUMPLIDO** |
| 5. Suite de pruebas backend y frontend al 100% | `./mvnw test` (8/8) y `npm test` (165/165) pasan exitosamente | **CUMPLIDO** |
| 6. Pull Request generado y tarjeta en Trello en testing | PR creado en GitHub y tarjeta movida a `in testing` | **EN PROCESO (Finalizando)** |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas
* **Resolución de IP detrás de Cloudflare y Proxies Inversos:** Prioridad en cabecera `CF-Connecting-IP`, fallback a primer elemento de `X-Forwarded-For` y finalmente `getRemoteAddr()`, evitando direcciones IP internas del balanceador.
* **Integridad del consentimiento:** La propiedad `acceptTerms` es un booleano estricto validado a nivel de bean validation antes de llegar a la lógica de negocio.
* **Separación de Plantillas Angular:** `ScoutTermsModalComponent` y `RegisterScoutComponent` poseen plantillas HTML externas con `templateUrl`, cumpliendo con las directivas de modularidad y accesibilidad.
