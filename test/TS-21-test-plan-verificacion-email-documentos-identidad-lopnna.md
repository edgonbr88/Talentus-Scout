# Plan de Pruebas y Validación — TS-21: Verificación Obligatoria de Correo Electrónico y Carga de Documentos de Identidad (Tutor y Atleta) para Respaldo Legal LOPNNA

---

## 1. Alcance de las Pruebas
* **Identificador de Tarea:** `[TS-21]`
* **Título:** Verificación Obligatoria de Correo Electrónico y Carga de Documentos de Identidad (Tutor y Atleta) para Respaldo Legal LOPNNA
* **Componentes de Base de Datos Impactados:**
  * Migración dbmate: `20261010183000_add_email_verification_and_identity_documents.sql`.
  * Tabla `email_verification_tokens` (id, user_id, token, expires_at, created_at, used_at).
  * Columnas en `tutor_legal_consents`: `id_document_type`, `id_document_number`, `id_document_file_url`.
  * Columnas en `athletes`: `identity_document_type`, `identity_document_number`, `identity_document_file_url`.
  * Valor agregado al tipo ENUM PostgreSQL `account_status`: `PENDING_EMAIL_VERIFICATION`.
* **Componentes Backend Impactados:**
  * Entidad JPA `EmailVerificationToken.java`, Enum `AccountStatus.java`.
  * Entidades JPA `TutorLegalConsent.java` y `Athlete.java` (campos de identidad y documento adjunto).
  * Repositorio `EmailVerificationTokenRepository.java`.
  * DTOs: `RegisterTutorRequest.java` (multipart), `RegisterTutorResponse.java`, `ResendVerificationEmailRequest.java`, `UploadAthleteIdentityDocumentRequest.java`, `AthleteResponse.java`.
  * Excepciones: `AccountNotVerifiedException.java` (HTTP 403), `InvalidTokenException.java` (HTTP 400), registradas en `GlobalExceptionHandler.java`.
  * Plantilla HTML de correo: `mail/email-verification.html` (Thymeleaf, diseño deportivo responsivo con soporte modo oscuro).
  * Servicio `EmailService.java` (`sendEmailVerification`).
  * Servicio `AuthService.java` (flujo multipart, token de 24h, activación de cuenta, reenvío con revocación de tokens anteriores).
  * Servicio `AthleteService.java` (`uploadIdentityDocument` con validación estricta de propiedad de tutor).
  * Controladores: `AuthController.java` (`/register-tutor`, `/login` con bloqueo 403, `/verify-email`, `/resend-verification-email`), `AthleteController.java` (`POST /{id}/identity-document`).
* **Componentes Frontend Impactados:**
  * Modelos `auth.model.ts`, `user.model.ts`, `athlete.model.ts`.
  * Servicios `auth.service.ts` y `athlete.service.ts`.
  * Vistas Standalone:
    * `RegisterTutorComponent`: formulario ampliado con tipo de documento, número y dropzone de carga de archivo de identidad (CI / Pasaporte); envío vía `FormData` multipart; redirección inmediata a `/auth/verify-email-pending`.
    * `VerifyEmailPendingComponent` (`/auth/verify-email-pending`): pantalla con aviso amigable, botón para reenvío con temporizador cooldown de 60 segundos y feedback visual.
    * `VerifyEmailComponent` (`/auth/verify-email`): validación de token desde URL, spinner de carga, estado exitoso con botón de login o estado de error con enlace para solicitar un nuevo token.
    * `LoginComponent`: intercepción de error HTTP 403 `ACCOUNT_NOT_VERIFIED`, banner informativo y enlace directo para reenviar el correo.
    * `TutorDashboardComponent`: badges de estado del documento de identidad en las tarjetas de atletas representados, botón "🪪 Doc. Identidad" y modal dedicado para adjuntar Cédula o Partida de Nacimiento con control de tamaño (< 5MB) y tipos permitidos.
  * Rutas `app.routes.ts`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (`./mvnw test`)
* **Resultado Global:** 128 de 128 pruebas pasaron con éxito (0 fallos, 0 errores, 100% verde).
* **Suites de Pruebas Específicas TS-21:**
  1. `RegisterTutorTest` (4 de 4 pruebas aprobadas):
     * `registerTutor_MultipartWithDocument_CreatesPendingUserAndVerificationToken`: Valida que el registro mediante `multipart/form-data` almacene el archivo de identidad del tutor, cree el registro de consentimiento legal, genere el token en `email_verification_tokens`, y retorne `accountStatus = PENDING_EMAIL_VERIFICATION` sin emitir token JWT de sesión.
     * `login_UnverifiedAccount_ReturnsForbidden403WithAccountNotVerified`: Valida que el intento de autenticación con credenciales válidas pero estado `PENDING_EMAIL_VERIFICATION` sea bloqueado con HTTP 403 Forbidden y payload `{"code": "ACCOUNT_NOT_VERIFIED", "status": "PENDING_EMAIL_VERIFICATION"}`.
     * `verifyEmail_ValidToken_ActivatesAccountAndMarksTokenUsed`: Valida que invocar `GET /api/v1/auth/verify-email?token=...` active la cuenta a `ACTIVE`, registre `used_at` en el token y permita logins futuros.
     * `login_AfterEmailVerification_Success`: Valida que tras la verificación exitosa de correo el tutor pueda iniciar sesión y recibir su token JWT Bearer.
  2. `AthleteIdentityDocumentTest` (2 de 2 pruebas aprobadas):
     * `uploadAthleteIdentityDocument_Success`: Valida que el tutor propietario del atleta pueda cargar el documento de identidad del menor (`POST /api/v1/athletes/{id}/identity-document`), actualizando `identityDocumentType`, `identityDocumentNumber` y `identityDocumentFileUrl`.
     * `uploadAthleteIdentityDocument_UnauthorizedTutor_ReturnsForbidden`: Valida que un tutor que no posee la patria potestad del atleta reciba HTTP 403 Forbidden al intentar cargar o alterar documentos de identidad ajenos.

### 2.2. Frontend (`npm run build`)
* **Comando:** `npm run build`
* **Resultado:** Compilación exitosa en 17.476 segundos con 0 errores de TypeScript y 0 advertencias de plantillas.
* **Artefactos Verificados:**
  * Generación de bundles de cliente y SSR (`server.mjs`).
  * 10 rutas estáticas prerenderizadas exitosamente.
  * Lazy loading de `chunk-XEC76YY4.js` (`verify-email-pending-component`) y `chunk-EFMT3QDO.js` (`verify-email-component`).

---

## 3. Guía de Verificación Manual Paso a Paso (cURL / API)

### Paso 1: Registro de Tutor con Documento de Identidad Adjunto (Multipart)
```bash
# Crear un archivo de prueba simulando documento de identidad
echo "CONTENIDO_SIMULADO_CEDULA_TUTOR_PDF" > /tmp/cedula_tutor.pdf

curl -X POST http://localhost:8080/api/v1/auth/register-tutor \
  -F "email=tutor.lopnna@talentus.app" \
  -F "password=TutorPassword2026*" \
  -F "fullName=Roberto Gómez Tutor" \
  -F "phoneNumber=+584141234567" \
  -F "termsAccepted=true" \
  -F "dataProcessingConsent=true" \
  -F "parentalAuthorization=true" \
  -F "idDocumentType=CEDULA" \
  -F "idDocumentNumber=V-14567890" \
  -F "idDocumentFile=@/tmp/cedula_tutor.pdf;type=application/pdf"
```
* **Respuesta Esperada (HTTP 201 Created):**
```json
{
  "userId": "uuid-generado",
  "email": "tutor.lopnna@talentus.app",
  "accountStatus": "PENDING_EMAIL_VERIFICATION",
  "message": "Registro completado con éxito. Por favor verifica tu correo electrónico para activar tu cuenta."
}
```
*(Nota: No se devuelve ningún token JWT, garantizando que el usuario no acceda a recursos protegidos sin verificar su email).*

---

### Paso 2: Intento de Inicio de Sesión Previo a la Verificación (Bloqueo 403)
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tutor.lopnna@talentus.app",
    "password": "TutorPassword2026*"
  }'
```
* **Respuesta Esperada (HTTP 403 Forbidden):**
```json
{
  "code": "ACCOUNT_NOT_VERIFIED",
  "message": "Tu cuenta no ha sido verificada. Por favor revisa tu bandeja de entrada o solicita un nuevo correo de activación.",
  "status": "PENDING_EMAIL_VERIFICATION"
}
```

---

### Paso 3: Reenvío de Correo de Verificación (Cooldown & Token Regeneration)
```bash
curl -X POST http://localhost:8080/api/v1/auth/resend-verification-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tutor.lopnna@talentus.app"
  }'
```
* **Respuesta Esperada (HTTP 200 OK):**
```json
{
  "message": "Si la cuenta existe y está pendiente de verificación, se ha enviado un nuevo enlace de activación."
}
```

---

### Paso 4: Confirmación del Correo Electrónico mediante Token
Obtén el token generado desde la base de datos o desde el log del servicio de correo (`MOCK EMAIL VERIFICATION`):
```bash
# Consulta opcional de token en DB local
TOKEN=$(docker compose exec -T postgres psql -U postgres -d talentus_scout_dev -t -A -c "SELECT token FROM email_verification_tokens WHERE used_at IS NULL ORDER BY created_at DESC LIMIT 1;")

curl -i -X GET "http://localhost:8080/api/v1/auth/verify-email?token=$TOKEN"
```
* **Respuesta Esperada (HTTP 200 OK):**
```json
{
  "message": "¡Tu correo electrónico ha sido verificado con éxito! Ya puedes iniciar sesión."
}
```

---

### Paso 5: Login Posterior a la Verificación (Exitoso)
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tutor.lopnna@talentus.app",
    "password": "TutorPassword2026*"
  }'
```
* **Respuesta Esperada (HTTP 200 OK con JWT Bearer):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "role": "TUTOR"
}
```

---

### Paso 6: Carga de Documento de Identidad del Atleta Menor (Partida de Nacimiento / Cédula)
```bash
echo "CONTENIDO_SIMULADO_PARTIDA_NACIMIENTO_PDF" > /tmp/partida_nacimiento.pdf

curl -X POST "http://localhost:8080/api/v1/athletes/<ATHLETE_ID>/identity-document" \
  -H "Authorization: Bearer <TUTOR_JWT_TOKEN>" \
  -F "documentType=PARTIDA_NACIMIENTO" \
  -F "documentNumber=ACTA-2012-9981" \
  -F "file=@/tmp/partida_nacimiento.pdf;type=application/pdf"
```
* **Respuesta Esperada (HTTP 200 OK):**
```json
{
  "id": "<ATHLETE_ID>",
  "fullName": "Mateo Gómez",
  "identityDocumentType": "PARTIDA_NACIMIENTO",
  "identityDocumentNumber": "ACTA-2012-9981",
  "hasIdentityDocument": true,
  "identityDocumentFileUrl": "/uploads/identities/athletes/..."
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **Carga de Documento de Identidad del Tutor:** El formulario de registro de tutor exige tipo, número y archivo adjunto del documento de identidad. | ✅ Cumplido | `RegisterTutorRequest`, `RegisterTutorComponent` con dropzone y validaciones. |
| **Respaldo Legal LOPNNA Art. 65 en BD:** Se persisten `id_document_type`, `id_document_number` y URL en `tutor_legal_consents`. | ✅ Cumplido | Migración dbmate ejecutada, persistencia verificada en `RegisterTutorTest`. |
| **Estado `PENDING_EMAIL_VERIFICATION`:** El registro no emite JWT y asigna estado pendiente de verificación. | ✅ Cumplido | `AccountStatus.PENDING_EMAIL_VERIFICATION`, respuesta 201 sin JWT. |
| **Bloqueo de Login No Verificado:** Login con credenciales válidas pero cuenta no verificada retorna HTTP 403 Forbidden estructurado. | ✅ Cumplido | `AccountNotVerifiedException` (403), intercepción en `login.component.ts`. |
| **Reenvío de Enlace con Expiración:** Endpoint `/resend-verification-email` genera nuevo token con validez de 24 horas revocando los previos. | ✅ Cumplido | `AuthService.resendVerificationEmail` con invalidación de tokens activos anteriores. |
| **Páginas de Frontend Dedicadas:** Vistas `/auth/verify-email-pending` y `/auth/verify-email` con diseño deportivo y UX responsiva. | ✅ Cumplido | Componentes Standalone Angular 18 integrados en `app.routes.ts`. |
| **Carga de Documento de Identidad del Atleta:** Endpoint multipart y modal en el panel de tutor para consignar documento del menor. | ✅ Cumplido | `POST /api/v1/athletes/{id}/identity-document`, modal en `TutorDashboardComponent`. |
| **Control de Acceso y Autorización:** Solo el tutor asignado con patria potestad puede subir o actualizar el documento del atleta. | ✅ Cumplido | Validación de tutor en `AthleteService.uploadIdentityDocument`, probado en `AthleteIdentityDocumentTest`. |

---

## 5. Casos Borde y Consideraciones de Seguridad / LOPNNA Validadas

1. **Tokens de Un Solo Uso y Expiración:** Cada token en `email_verification_tokens` es un token criptográfico único con expiración de 24 horas. Al utilizarlo o al solicitar un reenvío, el estado previo queda invalidado, impidiendo ataques de repetición.
2. **Reserva y Confidencialidad de Documentos de Identidad (LOPNNA Art. 65):**
   * Las URLs de los documentos de identidad nunca se exponen en perfiles públicos de scouts ni en el visor público SSR del atleta.
   * La respuesta DTO pública únicamente expone el booleano `hasIdentityDocument: true/false`, garantizando la acreditación legal sin filtrar datos personales o copias escaneadas a terceros no autorizados.
3. **Validación de Tamaño y Formatos Permitidos:** Tanto en frontend como en backend se impone límite estricto de 5MB por archivo, restringiendo la carga únicamente a documentos PDF, JPG o PNG.
4. **Resiliencia ante Intentos de Ataque por Enumeración:** El endpoint de reenvío de correo `/resend-verification-email` responde siempre con mensaje neutro independientemente de si el correo existe o no en la base de datos, evitando fugas de información.
