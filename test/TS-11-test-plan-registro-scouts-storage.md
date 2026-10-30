# Plan de Pruebas y Reporte de Validación: [TS-11] Registro de Scouts con Carga de Credenciales (Storage Local) y Estado PENDIENTE_VERIFICACION

**ID Tarea:** TS-11  
**Título Trello:** `[TS-11] Registro de Scouts con Carga de Credenciales (Storage Local) y Estado PENDIENTE_VERIFICACION`  
**Tarjeta Trello:** [https://trello.com/c/PQtr2ZMD](https://trello.com/c/PQtr2ZMD) (ID: `6abbe1f953c19f2d58b1b076`)  
**Sprint:** Sprint 3 — Directorio de Scouts Acreditados y Contacto Seguro WhatsApp  
**Fecha de Ejecución:** 7 de octubre de 2026  
**Agente Ejecutor:** `trello_implementer`  
**Estado:** VALIDADO SATISFACTORIAMENTE (LISTO PARA TESTING / QA)  

---

## 1. Alcance de las Pruebas

El objetivo de esta suite de pruebas es validar el flujo seguro de registro para reclutadores deportivos (scouts) con carga obligatoria de credenciales comprobables (PDF/imágenes), almacenamiento desacoplado en sistema de archivos local (`uploads/credentials/`), creación de usuarios con rol `SCOUT` y estado `PENDIENTE_VERIFICACION`, y la aplicación estricta de la regla de protección de menores LOPNNA Art. 65 (bloqueando consultas al directorio de atletas con `403 Forbidden` hasta que la cuenta sea auditada y aprobada por un administrador).

### Componentes y Artefactos Auditados
* **Backend (`talentus-scout-be`):**
  * `com.talentus.scout.domain.enums.ScoutVerificationStatus`: Enum con estados `PENDING`, `APPROVED`, `REJECTED`.
  * `com.talentus.scout.domain.entity.ScoutProfile`: Entidad JPA que vincula el usuario, organización deportiva, rol de scout, documento de credenciales y auditoría administrativa.
  * `com.talentus.scout.repository.ScoutProfileRepository`: Repositorio Spring Data JPA.
  * `com.talentus.scout.service.storage.FileStorageService` & `LocalFileStorageService`: Capa de almacenamiento desacoplada con validación de extensiones permitidas, prevención de path traversal y asignación de identificadores UUID únicos.
  * `com.talentus.scout.security.ScoutSecurity`: Componente de seguridad `@scoutSecurity.isVerifiedScout(authentication)` que verifica estatus `APPROVED` y cuenta `ACTIVE`.
  * `com.talentus.scout.web.exception.GlobalExceptionHandler`: Capturador de `AccessDeniedException` retornando `403 FORBIDDEN` con mensaje de auditoría en curso.
  * `com.talentus.scout.web.controller.AuthController`: Endpoint `POST /api/v1/auth/register-scout` (multipart/form-data).
  * `com.talentus.scout.web.controller.ScoutDirectoryController`: Endpoint representativo `GET /api/v1/scouts/directory` protegido.
  * `com.talentus.scout.config.WebMvcConfig`: ResourceHandler para `/uploads/credentials/**`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend: Suite de Pruebas JUnit 5 & Spring Boot Test
Comando ejecutado:
```bash
./mvnw test
```
**Resultado General:** `Tests run: 47, Failures: 0, Errors: 0, Skipped: 0` (BUILD SUCCESS, 01:04 min)

#### Detalle de Clases de Test Específicas
1. **`com.talentus.scout.service.storage.LocalFileStorageServiceTest`** (5 tests ejecutados, 100% PASS):
   * `storeFile_ValidPdfFile_StoresSuccessfully`: Valida guardado de credencial en formato PDF en `/uploads/credentials/` con nombre UUID único.
   * `storeFile_ValidImageFile_StoresSuccessfully`: Valida guardado de credenciales en formato PNG/JPG.
   * `storeFile_DisallowedExtension_ThrowsIllegalArgumentException`: Rechaza extensiones no autorizadas o ejecutables (`.sh`, `.exe`).
   * `storeFile_EmptyFile_ThrowsIllegalArgumentException`: Rechaza archivos multipart vacíos.
   * `deleteFile_ExistingFile_DeletesCleanly`: Valida eliminación limpia del archivo en disco.

2. **`com.talentus.scout.web.controller.AuthScoutRegistrationTest`** (3 tests ejecutados, 100% PASS):
   * `registerScout_WithValidData_Returns201AndPendingVerificationStatus`:
     * Petición multipart a `POST /api/v1/auth/register-scout` con credencial PDF.
     * Retorna `201 Created` con token JWT, `role=SCOUT`, `accountStatus=PENDING_VERIFICATION` y `verificationStatus=PENDING`.
     * Valida persistencia atómica en base de datos en `users` y `scout_profiles`.
   * `registerScout_DuplicateEmail_Returns409Conflict`:
     * Rechaza registro de scout si el email ya existe en la plataforma (`409 Conflict`).
   * `registerScout_MissingCredentialsFile_Returns400BadRequest`:
     * Rechaza la solicitud si no se adjunta el archivo de credenciales obligatorio (`400 Bad Request`).

3. **`com.talentus.scout.web.controller.ScoutDirectorySecurityTest`** (4 tests ejecutados, 100% PASS):
   * `getDirectory_WithoutToken_ReturnsUnauthorizedOrForbidden`: Valida rechazo a usuarios no autenticados (401/403).
   * `getDirectory_AsPendingScout_Returns403ForbiddenWithAuditMessage` (**Criterio DoD Crítico**):
     * Valida que un scout recién registrado con estado `PENDING_VERIFICATION` al invocar `GET /api/v1/scouts/directory` reciba `403 Forbidden` con mensaje explícito: *"Auditoría en curso: tu perfil de scout está siendo verificado por el equipo de Talentus Scout."*.
   * `getDirectory_AsApprovedScout_Returns200Ok`:
     * Valida que una vez auditado y aprobado (`APPROVED` / `ACTIVE`), el scout accede al directorio con `200 OK`.
   * `getDirectory_AsAdmin_Returns200Ok`:
     * Valida que los administradores del sistema tienen acceso irrestricto.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Prueba por cURL (API REST)

#### Paso 1: Registrar un Scout con Credencial en PDF
```bash
# Crear un archivo PDF dummy para prueba
echo "%PDF-1.4 Credencial de Scout Profesional" > /tmp/test_credencial.pdf

# Ejecutar POST multipart a register-scout
REGISTER_RESP=$(curl -s -X POST http://localhost:8080/api/v1/auth/register-scout \
  -F "email=mateo.scout@sevilla-fc.test" \
  -F "password=Password123!" \
  -F "fullName=Mateo Falcon" \
  -F "phoneNumber=+584121234567" \
  -F "organizationName=Sevilla FC Cantera" \
  -F "scoutRole=Ojeador Internacional" \
  -F "linkedinUrl=https://linkedin.com/in/mateo-falcon" \
  -F "credentialsFile=@/tmp/test_credencial.pdf;type=application/pdf")

echo $REGISTER_RESP | jq .
```
**Respuesta esperada (HTTP 201 Created):**
```json
{
  "scoutProfileId": "...",
  "userId": "...",
  "token": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "role": "SCOUT",
  "accountStatus": "PENDING_VERIFICATION",
  "verificationStatus": "PENDING",
  "email": "mateo.scout@sevilla-fc.test",
  "fullName": "Mateo Falcon",
  "organizationName": "Sevilla FC Cantera",
  "scoutRole": "Ojeador Internacional",
  "credentialsDocumentUrl": "/uploads/credentials/...pdf",
  "message": "Registro exitoso. Tu perfil se encuentra en auditoría por el equipo de Talentus Scout antes de habilitar el acceso al directorio de atletas."
}
```

#### Paso 2: Intentar Consultar el Directorio de Atletas con el Scout Pendiente
```bash
SCOUT_TOKEN=$(echo $REGISTER_RESP | jq -r '.token')

curl -v -X GET http://localhost:8080/api/v1/scouts/directory \
  -H "Authorization: Bearer $SCOUT_TOKEN"
```
**Respuesta esperada (HTTP 403 Forbidden):**
```json
{
  "error": "FORBIDDEN",
  "message": "Auditoría en curso: tu perfil de scout está siendo verificado por el equipo de Talentus Scout.",
  "timestamp": "..."
}
```

#### Paso 3: Verificar que el Archivo se Almacenó Físicamente en Disco
```bash
CRED_URL=$(echo $REGISTER_RESP | jq -r '.credentialsDocumentUrl')
ls -la "uploads/${CRED_URL#/uploads/}"
# El archivo existe en disco y tiene permisos de lectura
```

---

## 4. Matriz de Criterios de Aceptación (Definition of Done - DoD)

| Criterio DoD | Especificación | Estado | Observaciones / Evidencia |
| :--- | :--- | :---: | :--- |
| **Endpoint de Registro** | `POST /api/v1/auth/register-scout` (multipart) | ✅ **CUMPLIDO** | Recibe datos del scout y archivo obligatorio; responde `201 CREATED`. |
| **Almacenamiento Desacoplado** | `FileStorageService` guarda en `uploads/credentials/` | ✅ **CUMPLIDO** | Archivos sanitizados con UUID y protegidos contra path traversal. |
| **Estado PENDIENTE_VERIFICACION** | Usuario `PENDING_VERIFICATION` y perfil `PENDING` | ✅ **CUMPLIDO** | Persistido atómicamente en PostgreSQL. |
| **Bloqueo 403 Forbidden** | Acceso denegado a directorio para scout pendiente | ✅ **CUMPLIDO** | `ScoutSecurity` y `GlobalExceptionHandler` retornan `403 FORBIDDEN` con mensaje de auditoría en curso. |
| **Pruebas Automatizadas** | 100% tests en verde | ✅ **CUMPLIDO** | 47 tests en Spring Boot pasando sin errores ni regresiones. |
| **Compilación Limpia** | Build BE y FE sin errores | ✅ **CUMPLIDO** | `./mvnw test` y `npm run build` ejecutados exitosamente. |

---

## 5. Casos Borde y Validaciones Críticas de Seguridad

1. **Prevención de Carga de Archivos Maliciosos:** Si un atacante intenta enviar un archivo ejecutable (ej. `.exe`, `.sh`, `.php`), el servicio de storage lo rechaza con `400 Bad Request`.
2. **Defensa contra Path Traversal:** Los nombres de archivo se reemplazan por un UUID aleatorio generado en servidor, garantizando que manipulaciones de cabecera como `../../etc/passwd` sean inocuas.
3. **Persistencia Atómica Transaccional:** Si la inserción en `scout_profiles` falla, la transacción de Spring `@Transactional` hace rollback completo de la creación del usuario en `users`.
4. **Protección LOPNNA Art. 65:** Ningún scout en estado de auditoría puede consultar la lista de atletas o sus fichas privadas hasta su validación formal por el administrador (habilitado en la siguiente tarjeta TS-12).
