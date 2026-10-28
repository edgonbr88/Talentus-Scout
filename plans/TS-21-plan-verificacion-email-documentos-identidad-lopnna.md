# Plan de Implementación: [TS-21] Verificación Obligatoria de Correo Electrónico y Carga de Documentos de Identidad (Tutor y Atleta) para Respaldo Legal LOPNNA

**ID Tarea:** TS-21  
**Tarjeta Trello:** https://trello.com/c/6ac3a22c1f05ca89c490dbab  
**Fecha:** 2026-10-10  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

### 1.1. Problemática
En la versión actual de Talentus Scout, el registro de tutores activa inmediatamente la cuenta (`status = ACTIVE`) sin comprobar si el correo electrónico proporcionado es real ni requerir la evidencia física del documento de identidad del representante legal o del menor de edad. Esta ausencia representa dos riesgos críticos:
1. **Riesgo Legal y Regulatorio (LOPNNA Art. 65 / Normativa FIFA de Menores):** La plataforma requiere prueba fehaciente e inmutable de la patria potestad o tutela legal para autorizar la exposición y promoción del perfil deportivo de un menor.
2. **Cuentas Fantasma y Spam:** Permite el registro de cuentas con correos inexistentes o mal escritos, rompiendo el canal formal de notificaciones legales, auditoría y alertas de contacto de scouts.

### 1.2. Valor Aportado
* **Blindaje Jurídico LOPNNA:** Custodia segura y privada del documento de identidad del tutor (Cédula, DNI o Pasaporte) y del menor de edad (Partida de Nacimiento, Cédula o Pasaporte).
* **Verificación de Email Ineludible:** Garantiza que cada cuenta pertenezca a un tutor real con acceso verificado antes de permitir acceso a las operaciones del panel.
* **Flujo Sin Fricción:** Al hacer clic en el enlace recibido por correo, el usuario es activado e inicia sesión automáticamente en la aplicación web sin reingresar credenciales.

---

## 2. Alcance Técnico y Arquitectura

### 2.1. Componentes Afectados
1. **Base de Datos (PostgreSQL / dbmate):**
   * Incorporación del valor `PENDING_EMAIL_VERIFICATION` en el ENUM `account_status`.
   * Creación de la tabla `email_verification_tokens` con índice sobre token y expiración de 24 horas.
   * Adición de campos `id_document_type`, `id_document_number`, `id_document_file_url` en `tutor_legal_consents`.
   * Adición de campos `identity_document_type`, `identity_document_number`, `identity_document_file_url` en `athletes`.
2. **Backend (Spring Boot 3.4 / Java 21 / Spring Security 6):**
   * Endpoint de registro de tutor (`POST /api/v1/auth/register-tutor`) adaptado a `multipart/form-data` con almacenamiento seguro del documento de identidad vía `FileStorageService`, creación de usuario en `PENDING_EMAIL_VERIFICATION` y despacho de correo.
   * Endpoint público de verificación (`GET /api/v1/auth/verify-email?token={token}`) que activa la cuenta a `ACTIVE` y retorna `AuthResponse` con token JWT.
   * Endpoint público de reenvío (`POST /api/v1/auth/resend-verification-email`) con rate limiting / cooldown.
   * Manejo en login (`POST /api/v1/auth/login`): bloqueo con `HTTP 403 Forbidden` si la cuenta está en `PENDING_EMAIL_VERIFICATION`.
   * Endpoint dedicado para documento del menor (`POST /api/v1/athletes/{id}/identity-document`) con `multipart/form-data`.
   * Plantilla de correo HTML oficial `templates/mail/email-verification.html`.
3. **Frontend (Angular 18+ Standalone / SSR):**
   * Actualización del componente de registro de tutor (`register-tutor.component.ts`) con selector de documento, número y subida de archivo.
   * Nueva pantalla `/auth/verify-email-pending` (espera y reenvío con temporizador).
   * Nueva pantalla `/auth/verify-email` (activación y auto-login fluido).
   * Manejo de error 403 en `login.component.ts` con redirección a verificación pendiente.
   * Gestión y carga de documento del menor en `tutor-dashboard.component.ts` y servicio `AthleteService`.

### 2.2. Dependencias
* `TS-03` (Backend Spring Boot & EmailService)
* `TS-04` (Onboarding Legal Tutor LOPNNA)
* `TS-05` (Cédula Deportiva del Atleta)

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

**Archivo de Migración:**  
`talentus-scout-migrations/migrations/20261010183000_add_email_verification_and_identity_documents.sql`

```sql
-- migrate:up
-- 1. Incorporar PENDING_EMAIL_VERIFICATION al enum account_status si no existe
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'PENDING_EMAIL_VERIFICATION';

-- 2. Tabla para tokens criptográficos de verificación de correo
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- 3. Campos de documento de identidad en tutor_legal_consents
ALTER TABLE tutor_legal_consents
    ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS id_document_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS id_document_file_url VARCHAR(500);

-- 4. Campos de documento de identidad en athletes
ALTER TABLE athletes
    ADD COLUMN IF NOT EXISTS identity_document_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS identity_document_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS identity_document_file_url VARCHAR(500);

-- migrate:down
ALTER TABLE athletes
    DROP COLUMN IF EXISTS identity_document_file_url,
    DROP COLUMN IF EXISTS identity_document_number,
    DROP COLUMN IF EXISTS identity_document_type;

ALTER TABLE tutor_legal_consents
    DROP COLUMN IF EXISTS id_document_file_url,
    DROP COLUMN IF EXISTS id_document_number,
    DROP COLUMN IF EXISTS id_document_type;

DROP TABLE IF EXISTS email_verification_tokens;
```

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Paquetes y Clases
Paquete base: `com.talentus.scout`

#### 4.1.1. Modificación de Enums
* `domain/enums/AccountStatus.java`:
  ```java
  public enum AccountStatus {
      PENDING_VERIFICATION,
      PENDING_EMAIL_VERIFICATION,
      ACTIVE,
      SUSPENDED
  }
  ```

#### 4.1.2. Nuevas Entidades y Repositorios
* `domain/entity/EmailVerificationToken.java`:
  * `@Entity`, `@Table(name = "email_verification_tokens")`
  * Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
  * Campos: `id`, `user` (`@ManyToOne(fetch = FetchType.LAZY)`), `token`, `expiresAt`, `usedAt`, `createdAt`.
  * Métodos auxiliares: `isExpired()`, `isUsed()`.
* `repository/EmailVerificationTokenRepository.java`:
  * `Optional<EmailVerificationToken> findByToken(String token);`
  * `Optional<EmailVerificationToken> findTopByUserOrderByCreatedAtDesc(User user);`
  * `void deleteByUser(User user);`

#### 4.1.3. Actualización de Entidades Existentes
* `domain/entity/TutorLegalConsent.java`:
  * Nuevos atributos:
    * `@Column(name = "id_document_type", length = 30)` `private String idDocumentType;`
    * `@Column(name = "id_document_number", length = 50)` `private String idDocumentNumber;`
    * `@Column(name = "id_document_file_url", length = 500)` `private String idDocumentFileUrl;`
* `domain/entity/Athlete.java`:
  * Nuevos atributos:
    * `@Column(name = "identity_document_type", length = 30)` `private String identityDocumentType;`
    * `@Column(name = "identity_document_number", length = 50)` `private String identityDocumentNumber;`
    * `@Column(name = "identity_document_file_url", length = 500)` `private String identityDocumentFileUrl;`

#### 4.1.4. DTOs (Request / Response con Lombok y Jakarta Validation)
* Modificar `web/dto/RegisterTutorRequest.java`:
  * `@NotBlank(message = "El tipo de documento es obligatorio")` `private String idDocumentType;` (CEDULA, DNI, PASAPORTE)
  * `@NotBlank(message = "El número de documento es obligatorio")` `private String idDocumentNumber;`
  * `@NotNull(message = "El archivo del documento de identidad es obligatorio")` `private MultipartFile idDocumentFile;`
* Modificar `web/dto/RegisterTutorResponse.java`:
  * Agregar `private AccountStatus status;`
  * Agregar `private String message;`
* Nuevo DTO `web/dto/ResendVerificationEmailRequest.java`:
  * `@NotBlank(message = "El correo es obligatorio")` `@Email` `private String email;`
* Nuevo DTO `web/dto/UploadAthleteIdentityDocumentRequest.java`:
  * `@NotBlank(message = "El tipo de documento es obligatorio")` `private String documentType;`
  * `@NotBlank(message = "El número de documento es obligatorio")` `private String documentNumber;`
  * `@NotNull(message = "El archivo físico es obligatorio")` `private MultipartFile file;`
* Actualizar `web/dto/AthleteResponse.java`:
  * `identityDocumentType`, `identityDocumentNumber`, `identityDocumentFileUrl`, `hasIdentityDocument`.

#### 4.1.5. Excepciones Personalizadas
* `exception/AccountNotVerifiedException.java` (mapeada a `403 FORBIDDEN`).
* `exception/InvalidTokenException.java` (mapeada a `400 BAD_REQUEST`).

#### 4.1.6. Servicio de Correo Electrónico (`EmailService.java`)
* Incorporar método:
  ```java
  public boolean sendEmailVerification(String toEmail, String recipientName, String verificationLink)
  ```
* Plantilla: `src/main/resources/templates/mail/email-verification.html`:
  * Diseño profesional responsive con identidad Talentus Scout (Dark navy `#0A0F1D`, acento verde esmeralda `#10B981`, tipografía sans-serif limpia, botón CTA destacado "Verificar mi Correo Electrónico", texto legal de respaldo LOPNNA Art. 65 y mención de vigencia de 24 horas).

#### 4.1.7. Lógica en `AuthService.java`
* `registerTutor`:
  1. Validar unicidad del email.
  2. Almacenar archivo con `fileStorageService.storeFile(request.getIdDocumentFile(), "identity-documents/tutors")`.
  3. Crear `User` con `status = AccountStatus.PENDING_EMAIL_VERIFICATION`.
  4. Guardar `TutorLegalConsent` vinculando `idDocumentType`, `idDocumentNumber` y `idDocumentFileUrl`.
  5. Generar token seguro criptográfico (UUID aleatorio o token de 64 caracteres), calcular `expiresAt = Instant.now().plus(24, ChronoUnit.HOURS)` y guardar en `emailVerificationTokens`.
  6. Construir enlace: `${app.frontend.url}/auth/verify-email?token=${token}`.
  7. Despachar correo vía `emailService.sendEmailVerification(...)`.
  8. Retornar `RegisterTutorResponse` con `status = PENDING_EMAIL_VERIFICATION`, `token = null` y mensaje explicativo.
* `verifyEmail(String token)`:
  1. Buscar token en repositorio.
  2. Si no existe o `isUsed()` o `isExpired()`, arrojar excepción correspondiente.
  3. Establecer `token.setUsedAt(Instant.now())`.
  4. Actualizar `user.setStatus(AccountStatus.ACTIVE)`.
  5. Generar JWT para el usuario.
  6. Retornar `AuthResponse` con sesión lista.
* `resendVerificationEmail(String email)`:
  1. Buscar usuario por email.
  2. Si existe y su estado es `PENDING_EMAIL_VERIFICATION`:
     * Generar nuevo token y registrarlo.
     * Enviar correo con el nuevo enlace.
* En `AuthController.java`:
  * Actualizar `registerTutor` para consumir `MediaType.MULTIPART_FORM_DATA_VALUE` con `@ModelAttribute @Valid RegisterTutorRequest`.
  * Nuevo endpoint `GET /api/v1/auth/verify-email?token={token}`.
  * Nuevo endpoint `POST /api/v1/auth/resend-verification-email`.
  * En `login`: si `user.getStatus() == AccountStatus.PENDING_EMAIL_VERIFICATION`, arrojar `AccountNotVerifiedException`.

#### 4.1.8. Gestión de Documento del Menor en `AthleteService.java` y `AthleteController.java`
* Endpoint en `AthleteController.java`:
  ```java
  @PostMapping(value = "/{id}/identity-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("@athleteSecurity.isOwner(#id, authentication)")
  public ResponseEntity<AthleteResponse> uploadIdentityDocument(
          @PathVariable("id") UUID id,
          @Valid @ModelAttribute UploadAthleteIdentityDocumentRequest request
  )
  ```
* En `AthleteService.java`:
  1. Validar que el atleta pertenece al tutor autenticado.
  2. Guardar archivo con `fileStorageService.storeFile(request.getFile(), "identity-documents/athletes")`.
  3. Actualizar atleta: `identityDocumentType`, `identityDocumentNumber`, `identityDocumentFileUrl`.
  4. Retornar `AthleteResponse` actualizado.

---

## 5. Frontend: Angular 18+ (Standalone & SSR)

### 5.1. Directiva de Diseño y Estética (`fe-desing.md`)
* Seguir la guía de diseño institucional: paleta sobria deportiva (Dark Slate `#0b1120`, Emerald Green `#10b981`, Navy profundo `#030712`), tipografía jerárquica con Inter / Outfit, Bento layout en paneles, tarjetas con bordes suaves de 1px `border-slate-800`, estados de carga fluidos y copywriting empático sin jerga robótica.

### 5.2. Componentes y Vistas a Crear / Modificar

#### 5.2.1. Formulario de Registro de Tutor (`register-tutor.component.ts`)
* Agregar campos del documento de identidad:
  * Selector desplegable: `Tipo de Documento` (`Cédula de Identidad`, `DNI`, `Pasaporte`).
  * Input de texto: `Número de Documento de Identidad`.
  * Zona de carga de archivo (Drag & Drop o botón de examinar) con validación de extensión (`.jpg`, `.jpeg`, `.png`, `.pdf`) y tamaño máximo (5MB). Indicador visual de archivo seleccionado.
* Modificar el submit: enviar `FormData` con todos los campos y el binario.
* Al recibir respuesta exitosa: redirigir a `/auth/verify-email-pending?email=${encodeURIComponent(email)}`.

#### 5.2.2. Nueva Pantalla Standalone: `/auth/verify-email-pending`
* Ruta: `auth/verify-email-pending` en `app.routes.ts`.
* Componente: `src/app/features/auth/verify-email-pending/verify-email-pending.component.ts`.
* UI / UX:
  * Ilustración/Iconografía deportiva de sobre de correo y escudo de seguridad.
  * Mensaje claro: *"¡Casi listo! Hemos enviado un enlace de activación a **[email]**"*.
  * Instrucciones: *"Para proteger la identidad de los atletas y cumplir con el Art. 65 de la LOPNNA, debes verificar tu cuenta haciendo clic en el botón de tu correo electrónico antes de ingresar."*
  * Botón *"Reenviar correo de verificación"* con temporizador de espera (60 segundos de cooldown para evitar spam).
  * Enlace secundario: *"¿Te equivocaste de correo? Volver al inicio"*.

#### 5.2.3. Nueva Pantalla Standalone: `/auth/verify-email`
* Ruta: `auth/verify-email` en `app.routes.ts`.
* Componente: `src/app/features/auth/verify-email/verify-email.component.ts`.
* UI / UX:
  * Lee el query param `token`.
  * Si hay token: muestra spinner de activación deportiva con texto *"Verificando tu cuenta oficial..."*.
  * Invoca `authService.verifyEmail(token)`.
  * Si es exitoso: mensaje de éxito *"¡Cuenta verificada exitosamente! Entrando a Talentus Scout..."*, guarda la sesión JWT en `AuthService` y redirige a `/dashboard`.
  * Si falla (expirado/inválido): mensaje de alerta con botón para solicitar un nuevo enlace de activación.

#### 5.2.4. Manejo de Error en Login (`login.component.ts`)
* Si el login falla con estado `403` o mensaje de verificación pendiente:
  * Mostrar banner de advertencia: *"Tu correo aún no ha sido verificado."* con botón directo para reenviar correo o ir a `/auth/verify-email-pending`.

#### 5.2.5. Dashboard del Tutor y Cédula del Atleta (`tutor-dashboard.component.ts`)
* En la lista/tarjetas de atletas:
  * Mostrar badge de estado del documento LOPNNA:
    * Verde: *"Documento de Identidad Verificado"* (con visualizador o nombre).
    * Ámbar: *"Documento Legal Pendiente"* (con botón *"Adjuntar Documento del Menor"*).
* Modal o sección interactiva para subir el documento del menor (`identityDocumentType`, `identityDocumentNumber`, archivo físico) llamando a `POST /api/v1/athletes/{id}/identity-document`.

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Backend Automatizadas
1. `AuthServiceTest` / `AuthControllerTest`:
   * Registro exitoso de tutor con archivo -> Usuario en estado `PENDING_EMAIL_VERIFICATION`, token creado y guardado, email encolado/enviado.
   * Intento de login con cuenta no verificada -> Retorna `HTTP 403 Forbidden`.
   * Verificación exitosa con token válido -> Usuario pasa a `ACTIVE`, token marcado como usado, retorno de JWT.
   * Verificación con token expirado o reutilizado -> Retorna `HTTP 400 Bad Request`.
   * Reenvío de token -> Generación de nuevo token y envío de correo.
2. `AthleteControllerTest`:
   * Subida de documento de identidad del menor por el tutor propietario -> `200 OK` y actualización de campos.
   * Intento de subida por otro usuario no tutor -> `403 Forbidden`.

### 6.2. Comandos cURL de Verificación Manual

```bash
# 1. Registro de Tutor con Documento (Multipart)
curl -s -X POST http://localhost:8080/api/v1/auth/register-tutor \
  -F "fullName=Carlos Rodriguez" \
  -F "email=tutor.lopnna@test.com" \
  -F "password=Password123!" \
  -F "phoneNumber=+584121234567" \
  -F "acceptLopnnaTerms=true" \
  -F "idDocumentType=CEDULA" \
  -F "idDocumentNumber=V-18456789" \
  -F "idDocumentFile=@test/sample-id.png;type=image/png"

# 2. Intento de Login previo a verificación (Debe fallar con 403)
curl -s -i -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor.lopnna@test.com","password":"Password123!"}'

# 3. Verificación de Email con Token
curl -s -X GET "http://localhost:8080/api/v1/auth/verify-email?token=<TOKEN_EXTRAIDO>"

# 4. Login posterior a la verificación (Debe responder 200 con JWT)
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor.lopnna@test.com","password":"Password123!"}'

# 5. Carga de Documento de Identidad del Atleta
curl -s -X POST http://localhost:8080/api/v1/athletes/<ATHLETE_ID>/identity-document \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "documentType=PARTIDA_NACIMIENTO" \
  -F "documentNumber=PN-2012-0045" \
  -F "file=@test/sample-minor-id.pdf;type=application/pdf"
```

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Migración de Base de Datos**
  - Crear archivo `talentus-scout-migrations/migrations/20261010183000_add_email_verification_and_identity_documents.sql`.
  - Probar aplicación de migración con dbmate o validar sintaxis DDL.
- [x] **Paso 2: Entidades JPA, Enums y Repositorios**
  - Actualizar `AccountStatus.java` con `PENDING_EMAIL_VERIFICATION`.
  - Crear entidad `EmailVerificationToken.java` con anotaciones de Lombok.
  - Crear `EmailVerificationTokenRepository.java`.
  - Actualizar entidad `TutorLegalConsent.java` con `idDocumentType`, `idDocumentNumber`, `idDocumentFileUrl`.
  - Actualizar entidad `Athlete.java` con `identityDocumentType`, `identityDocumentNumber`, `identityDocumentFileUrl`.
- [x] **Paso 3: DTOs y Plantilla HTML de Correo**
  - Actualizar `RegisterTutorRequest.java` para soportar campos de documento y `MultipartFile idDocumentFile`.
  - Actualizar `RegisterTutorResponse.java` con estado y mensaje.
  - Crear `ResendVerificationEmailRequest.java` y `UploadAthleteIdentityDocumentRequest.java`.
  - Actualizar `AthleteResponse.java` con campos del documento.
  - Crear plantilla HTML `talentus-scout-be/src/main/resources/templates/mail/email-verification.html`.
- [x] **Paso 4: Lógica de Servicios y Seguridad Backend**
  - Agregar método `sendEmailVerification` en `EmailService.java`.
  - Actualizar `AuthService.java` (`registerTutor`, `verifyEmail`, `resendVerificationEmail`).
  - Actualizar `AuthController.java` con endpoints `register-tutor` multipart, `verify-email`, `resend-verification-email`, y bloqueo 403 en `login`.
  - Agregar método `uploadIdentityDocument` en `AthleteService.java` y endpoint en `AthleteController.java`.
- [x] **Paso 5: Frontend - Servicio y Nuevas Pantallas de Autenticación**
  - Actualizar `auth.service.ts` y modelos TypeScript con métodos para `verifyEmail` y `resendVerificationEmail`.
  - Modificar `register-tutor.component.ts` incorporando campos de documento de identidad y envío `multipart/form-data`.
  - Crear componente `verify-email-pending.component.ts` y configurar ruta `/auth/verify-email-pending`.
  - Crear componente `verify-email.component.ts` y configurar ruta `/auth/verify-email`.
  - Adaptar `login.component.ts` para capturar error 403 de verificación pendiente y ofrecer reenvío.
- [x] **Paso 6: Frontend - Gestión de Documento del Menor en Dashboard**
  - Actualizar `athlete.service.ts` con método `uploadIdentityDocument`.
  - Actualizar `tutor-dashboard.component.ts` con visualización de estado del documento LOPNNA y modal/formulario de subida de archivo.
- [x] **Paso 7: Pruebas Automatizadas y Validación de Compilación**
  - Escribir pruebas unitarias en `AuthServiceTest` / `AuthControllerTest` / `AthleteControllerTest`.
  - Ejecutar `./mvnw clean test` en backend y validar que pasen sin errores.
  - Ejecutar `npm run build` en frontend y verificar compilación limpia.
- [x] **Paso 8: Generación del Plan de Pruebas**
  - Redactar `test/TS-21-test-plan-verificacion-email-documentos-identidad-lopnna.md`.
  - Ejecutar `move_to_testing.py` para trasladar la tarjeta a la columna `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [x] Un nuevo usuario registrado no puede acceder a las funciones del dashboard hasta pulsar el enlace de verificación recibido por correo.
- [x] Al hacer clic en el enlace del correo, la cuenta se activa a `ACTIVE` y el frontend inicia sesión automáticamente sin pedir credenciales de nuevo.
- [x] La pantalla de espera permite reenviar el correo de verificación si el usuario no lo recibió, con cooldown de protección.
- [x] El formulario de registro de tutor exige adjuntar el archivo físico del documento de identidad (JPG, PNG, PDF; tamaño máx. 5MB).
- [x] El dashboard del tutor permite adjuntar y actualizar el documento de identidad del menor, quedando vinculado a la ficha del atleta.
- [x] Los archivos subidos se almacenan de forma segura y quedan vinculados en la base de datos al consentimiento del tutor y a la ficha del atleta.
- [x] Pruebas unitarias y de integración para la generación, caducidad y validación del token de verificación ejecutadas y aprobadas (`./mvnw test`).
- [x] Compilación limpia en backend y frontend (`mvn clean compile`, `ng build`).
