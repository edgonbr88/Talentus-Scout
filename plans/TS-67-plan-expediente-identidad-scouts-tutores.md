# Plan de Implementación: [TS-67] Expediente de Identidad Reforzado para Scouts y Tutores: Captura de Documento, Selfie con Cámara y Poder de Representación

**ID Tarea:** TS-67  
**Título:** Expediente de Identidad Reforzado para Scouts y Tutores: Captura de Documento, Selfie con Cámara y Poder de Representación  
**Tarjeta Trello:** [https://trello.com/c/p3HCAY2X](https://trello.com/c/p3HCAY2X)  
**ID de Tarjeta en Trello:** `6aedffaa16546ebcee230296`  
**Columna Trello:** `in development`  
**Sprint:** Sprint 4  
**Fecha:** 2026-11-06  
**Estado del Plan:** IMPLEMENTACIÓN COMPLETADA — EN TESTING  
**Agente Revisor/Planificador:** trello_planner  
**Agente Implementador:** trello_implementer  

---

## 1. Contexto de Negocio y Justificación

* **Blindaje y Protección Integral de Menores (LOPNNA Art. 65 y Normativas FIFA de Salvaguardia Infantil):**  
  Talentus Scout conecta a jóvenes promesas del fútbol menor con ojeadores, academias y clubes profesionales. Para garantizar un entorno 100% seguro y prevenir suplantaciones de identidad o intermediaciones ilícitas de terceros no autorizados, es imperativo reforzar el expediente documental tanto de los **Scouts** como de los **Tutores Legales**:
  * **Scouts:** Deben consignar obligatoriamente 3 elementos:
    1. Credencial o acreditación oficial del club / federación / agencia deportiva.
    2. Documento oficial de identidad nacional o pasaporte (tipo, número y archivo adjunto).
    3. Fotografía selfie en tiempo real (con cámara o subida de archivo como fallback accesible) para validar biométricamente la titularidad del documento.
  * **Tutores / Representantes Legales:**
    1. Documento oficial de identidad (tipo, número y archivo adjunto) — ya activo en el registro.
    2. Fotografía selfie en tiempo real con el documento o selfie personal (con cámara o subida de archivo) que certifique la presencia física del registrante.
    3. Declaración de parentesco: `Padre / Madre` vs `Representante Legal Autorizado`.
    4. En caso de ser `Representante Legal Autorizado`, es requisito excluyente adjuntar el Poder Notariado o Documento Judicial de Tutela / Custodia Legal.
* **Dinámica Operativa de Auditoría y Verificación:**
  * **Auditoría de Scouts (`/admin/scouts`):** El panel administrativo debe presentar de forma consolidada los 3 documentos (Credencial oficial + Cédula de identidad + Selfie) con previsualización o enlaces seguros con URLs prefirmadas de 5 minutos, permitiendo al administrador aprobar o rechazar con causal fundada.
  * **Auditoría de Patria Potestad del Atleta (`/admin/verificacion-legal`):** Conforme a las decisiones acordadas con el Product Owner, la cuenta del tutor se activa para operar sin requerir aprobación previa independiente de su identidad individual. Sin embargo, al momento de auditar la **patria potestad y representación legal del atleta menor** que el tutor registra, el auditor en `/admin/verificacion-legal` debe contar con la totalidad del expediente del tutor (cédula, selfie y poder si aplica) junto a la partida de nacimiento del menor, permitiendo un cotejo documental integral e inequívoco.
* **Retrocompatibilidad:**  
  Los registros de scouts y tutores ya existentes y verificados conservan su estatus sin interrupciones operativas. El nuevo expediente se exigirá a los nuevos registros y en re-subidas tras observaciones administrativas.

---

## 2. Alcance Técnico y Arquitectura

1. **Base de Datos / DDL (`talentus-scout-migrations`):**
   * Migración `migrations/20261106140000_add_enhanced_identity_documents_to_scouts_and_tutors.sql`:
     * En tabla `scout_profiles`:
       * `id_document_type VARCHAR(30)`
       * `id_document_number VARCHAR(50)`
       * `id_document_url TEXT`
       * `selfie_url TEXT`
     * En tabla `tutor_legal_consents`:
       * `relationship_type VARCHAR(30) NOT NULL DEFAULT 'PARENT'` (valores `'PARENT'`, `'LEGAL_REPRESENTATIVE'`)
       * `selfie_file_url TEXT`
       * `representation_document_file_url TEXT`
2. **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21 / Project Lombok):**
   * **Entidades JPA:**
     * `ScoutProfile`: Mapear `idDocumentType`, `idDocumentNumber`, `idDocumentUrl`, `selfieUrl` con Lombok.
     * `TutorLegalConsent`: Mapear `relationshipType`, `selfieFileUrl`, `representationDocumentFileUrl` con Lombok (`@Builder.Default` para `relationshipType = "PARENT"`).
   * **DTOs de Entrada (`com.talentus.scout.web.dto`):**
     * `RegisterScoutRequest`:
       * `idDocumentType` (`@NotBlank`, `@Size(max = 30)`)
       * `idDocumentNumber` (`@NotBlank`, `@Size(max = 50)`)
       * `idDocumentFile` (`@NotNull(message = "El documento de identidad es obligatorio") MultipartFile`)
       * `selfieFile` (`@NotNull(message = "La fotografía selfie es obligatoria") MultipartFile`)
     * `RegisterTutorRequest`:
       * `relationshipType` (`@NotBlank`, `@Pattern(regexp = "^(PARENT|LEGAL_REPRESENTATIVE)$")`)
       * `selfieFile` (`@NotNull(message = "La fotografía selfie es obligatoria") MultipartFile`)
       * `representationDocumentFile` (`MultipartFile`, opcional si es PARENT, obligatorio si es LEGAL_REPRESENTATIVE validado mediante `@AssertTrue`)
   * **Servicio de Almacenamiento Seguro (`R2FileStorageService`):**
     * Actualizar `isPrivateSubDirectory(pathOrDir)` para marcar como privados y restringidos los subdirectorios `selfies`, `selfie`, `tutor-representations` y `representations`, garantizando que se almacenen en `talentus-private-documents` y se protejan con URLs prefirmadas temporales de 5 minutos.
   * **DTOs de Respuesta y Servicios de Negocio:**
     * `PendingScoutResponse`: Agregar `idDocumentType`, `idDocumentNumber`, `idDocumentUrl`, `selfieUrl`.
     * `AdminScoutService`: Resolver URLs prefirmadas de 5 min para credencial, cédula y selfie del scout.
     * `LegalVerificationPendingItemResponse`: Agregar `tutorRelationshipType`, `tutorSelfieUrl`, `tutorRepresentationDocumentUrl`.
     * `LegalVerificationService`: Enriquecer `mapToItemResponse` generando URLs prefirmadas para la cédula, la selfie y el poder notariado del tutor asociado al atleta auditado.
     * `AuthService`:
       * En `registerScout`: Recibir y almacenar en storage privado `credentialsFile`, `idDocumentFile` y `selfieFile`.
       * En `registerTutor`: Recibir y almacenar en storage privado `idDocumentFile`, `selfieFile` y `representationDocumentFile` (si fue adjuntado).
     * `AuthController`: Actualizar las firmas y deserialización Multipart de `/auth/register-scout` y `/auth/register-tutor`.
3. **Frontend (`talentus-scout-fe` — Angular 18+ Standalone / Signals / Directivas `fe-desing.md`):**
   * **Componente de Cámara Web / Selfie Reutilizable:**
     * Crear `src/app/shared/components/webcam-selfie-capture/`:
       * `webcam-selfie-capture.component.ts`
       * `webcam-selfie-capture.component.html`
       * `webcam-selfie-capture.component.css`
       * Soporta inicialización de cámara con `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })`, captura a `<canvas>`, previsualización instantánea, opción de repetir foto, y fallback accesible e intuitivo para arrastrar o seleccionar archivo de imagen si el dispositivo carece de cámara o el usuario deniega los permisos.
   * **Registro de Scouts (`register-scout.component`):**
     * Agregar sección Bento para "Documento de Identidad Oficial" (selector de Tipo: Cédula de Identidad, Pasaporte, DNI/DNIe; input de Número; dropzone de archivo).
     * Integrar el componente `app-webcam-selfie-capture` para la selfie oficial del scout.
     * Empaquetar todo en el `FormData` enviado a `AuthService.registerScout`.
   * **Registro de Tutores (`register-tutor.component`):**
     * Agregar selector Bento de "Parentesco o Calidad de Representación" (`Padre / Madre` vs `Representante Legal Autorizado`).
     * Integrar el componente `app-webcam-selfie-capture` para la selfie del tutor.
     * Si selecciona `Representante Legal Autorizado`, desplegar con animación suave el dropzone para adjuntar el "Poder Notariado / Documento de Tutela Legal".
     * Empaquetar en el `FormData` enviado a `AuthService.registerTutor`.
   * **Panel de Auditoría de Scouts (`admin-scouts.component`):**
     * En el modal de detalle del scout, presentar los 3 documentos en tarjetas Bento comparativas:
       1. Credencial / Acreditación Deportiva.
       2. Documento de Identidad Oficial.
       3. Fotografía Selfie de Validación.
   * **Panel de Verificación de Patria Potestad (`admin-legal-verification.component`):**
     * En el modal de auditoría de patria potestad del atleta, estructurar el expediente en dos columnas:
       * **Columna Izquierda (Atleta):** Partida de Nacimiento / Cédula del menor.
       * **Columna Derecha (Tutor / Representante):** Tipo de Parentesco (Badge `Padre/Madre` o `Representante Legal`), Cédula de identidad, Fotografía Selfie, y Poder de Representación (si aplica).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / dbmate)

**Archivo:** `talentus-scout-migrations/migrations/20261106140000_add_enhanced_identity_documents_to_scouts_and_tutors.sql`

```sql
-- migrate:up
-- 1. Agregar campos de expediente de identidad a scout_profiles
ALTER TABLE scout_profiles
    ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS id_document_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS id_document_url TEXT,
    ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- 2. Agregar campos de parentesco, selfie y poder de representación a tutor_legal_consents
ALTER TABLE tutor_legal_consents
    ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(30) NOT NULL DEFAULT 'PARENT',
    ADD COLUMN IF NOT EXISTS selfie_file_url TEXT,
    ADD COLUMN IF NOT EXISTS representation_document_file_url TEXT;

-- migrate:down
ALTER TABLE tutor_legal_consents
    DROP COLUMN IF EXISTS representation_document_file_url,
    DROP COLUMN IF EXISTS selfie_file_url,
    DROP COLUMN IF EXISTS relationship_type;

ALTER TABLE scout_profiles
    DROP COLUMN IF EXISTS selfie_url,
    DROP COLUMN IF EXISTS id_document_url,
    DROP COLUMN IF EXISTS id_document_number,
    DROP COLUMN IF EXISTS id_document_type;
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Entidades JPA
* `ScoutProfile.java`:
  ```java
  @Column(name = "id_document_type", length = 30)
  private String idDocumentType;

  @Column(name = "id_document_number", length = 50)
  private String idDocumentNumber;

  @Column(name = "id_document_url", columnDefinition = "TEXT")
  private String idDocumentUrl;

  @Column(name = "selfie_url", columnDefinition = "TEXT")
  private String selfieUrl;
  ```
* `TutorLegalConsent.java`:
  ```java
  @Builder.Default
  @Column(name = "relationship_type", nullable = false, length = 30)
  private String relationshipType = "PARENT";

  @Column(name = "selfie_file_url", columnDefinition = "TEXT")
  private String selfieFileUrl;

  @Column(name = "representation_document_file_url", columnDefinition = "TEXT")
  private String representationDocumentFileUrl;
  ```

### 4.2. DTOs
* `RegisterScoutRequest.java`:
  * `idDocumentType`: `@NotBlank`, `@Size(max = 30)`
  * `idDocumentNumber`: `@NotBlank`, `@Size(max = 50)`
  * `idDocumentFile`: `@NotNull(message = "El documento de identidad es obligatorio") MultipartFile`
  * `selfieFile`: `@NotNull(message = "La fotografía selfie es obligatoria") MultipartFile`
* `RegisterTutorRequest.java`:
  * `relationshipType`: `@NotBlank`, `@Pattern(regexp = "^(PARENT|LEGAL_REPRESENTATIVE)$")`
  * `selfieFile`: `@NotNull(message = "La fotografía selfie es obligatoria") MultipartFile`
  * `representationDocumentFile`: `MultipartFile`
  * `@AssertTrue` validando presencia de `representationDocumentFile` si `relationshipType == "LEGAL_REPRESENTATIVE"`.
* `PendingScoutResponse.java`:
  * Agregar `idDocumentType`, `idDocumentNumber`, `idDocumentUrl`, `selfieUrl`.
* `LegalVerificationPendingItemResponse.java`:
  * Agregar `tutorRelationshipType`, `tutorSelfieUrl`, `tutorRepresentationDocumentUrl`.

### 4.3. Servicios y Controladores
* `R2FileStorageService.java`:
  * Incluir `selfies`, `selfie`, `tutor-representations`, `representations` en `isPrivateSubDirectory`.
* `AuthService.java`:
  * `registerScout(RegisterScoutRequest request, String credentialsUrl, String idDocUrl, String selfieUrl)`
  * `registerTutor`: Guardar `idDocumentFile` en `identity-documents/tutors`, `selfieFile` en `selfies/tutors`, y `representationDocumentFile` en `tutor-representations`.
* `AdminScoutService.java`:
  * Generar presigned URLs para `credentialsDocumentUrl`, `idDocumentUrl`, `selfieUrl`.
* `LegalVerificationService.java`:
  * Generar presigned URLs para `idDocumentFileUrl`, `selfieFileUrl`, `representationDocumentFileUrl` del tutor.

---

## 5. Especificación Frontend (Angular 18+)

1. **Componente Standalone Reutilizable:**
   * `WebcamSelfieCaptureComponent` en `src/app/shared/components/webcam-selfie-capture/`:
     * Archivos: `webcam-selfie-capture.component.ts`, `webcam-selfie-capture.component.html`, `webcam-selfie-capture.component.css`.
     * Control de estados: `camera-inactive`, `camera-live`, `photo-captured`, `file-uploaded`.
     * Emite `(photoCaptured)="onSelfieCaptured($event)"` con un `File`/`Blob` formateado.
2. **Componentes de Registro:**
   * `register-scout.component`: Integrar documento de identidad y cámara selfie.
   * `register-tutor.component`: Integrar selector de parentesco (`PARENT` vs `LEGAL_REPRESENTATIVE`), dropzone condicional para poder notariado y cámara selfie.
3. **Componentes de Administración:**
   * `admin-scouts.component`: Visualizador de 3 tarjetas de documentos en el modal de detalle del scout.
   * `admin-legal-verification.component`: Visualizador del expediente completo del tutor (Cédula, Selfie, Poder de Representación) en el cotejo de patria potestad del menor.
4. **Modelos TypeScript:**
   * `admin-scout.model.ts`: Campos `idDocumentType`, `idDocumentNumber`, `idDocumentUrl`, `selfieUrl`.
   * `admin-legal-verification.model.ts`: Campos `tutorRelationshipType`, `tutorSelfieUrl`, `tutorRepresentationDocumentUrl`.

---

## 6. Plan de Pruebas y Validación

1. **Pruebas de Base de Datos:**
   * Ejecución de `dbmate up` y validación de columnas en PostgreSQL local.
2. **Pruebas de Backend:**
   * Pruebas unitarias y de integración en Spring Boot:
     * `AuthControllerTest` / `AuthControllerIntegrationTest`.
     * `AdminScoutServiceTest` / `AdminScoutControllerTest`.
     * `LegalVerificationServiceTest`.
   * Compilación sin errores `./mvnw clean test-compile` y `./mvnw test`.
3. **Pruebas de Frontend:**
   * `npm run build` para asegurar tipado TypeScript estricto y cero errores de compilación de plantillas.
   * Tests unitarios con `npm test`.

---

## 7. Checklist de Implementación Paso a Paso

- [x] **Paso 1: Migración DDL**
  - [x] Crear archivo `migrations/20261106140000_add_enhanced_identity_documents_to_scouts_and_tutors.sql`.
  - [x] Aplicar migración con `dbmate -d migrations up`.
- [x] **Paso 2: Entidades y Modelos Backend**
  - [x] Actualizar `ScoutProfile.java` con nuevos campos.
  - [x] Actualizar `TutorLegalConsent.java` con nuevos campos.
  - [x] Actualizar `RegisterScoutRequest.java` con validaciones y campos multipart.
  - [x] Actualizar `RegisterTutorRequest.java` con `relationshipType`, `selfieFile`, `representationDocumentFile`.
  - [x] Actualizar `PendingScoutResponse.java`.
  - [x] Actualizar `LegalVerificationPendingItemResponse.java`.
- [x] **Paso 3: Servicios y Controladores Backend**
  - [x] Actualizar `R2FileStorageService.java` para reconocer rutas privadas de selfies y representaciones.
  - [x] Actualizar `AuthService.java` y `AuthController.java` para procesar archivos en registro de scouts y tutores.
  - [x] Actualizar `AdminScoutService.java` para generar URLs prefirmadas de credencial, cédula y selfie.
  - [x] Actualizar `LegalVerificationService.java` para enriquecer el detalle de verificación con selfie y poder del tutor.
  - [x] Actualizar y ejecutar tests de Spring Boot (`./mvnw test`).
- [x] **Paso 4: Componente Reutilizable Frontend `WebcamSelfieCaptureComponent`**
  - [x] Crear `webcam-selfie-capture.component.ts`.
  - [x] Crear `webcam-selfie-capture.component.html`.
  - [x] Crear `webcam-selfie-capture.component.css`.
- [x] **Paso 5: Vistas de Registro Frontend**
  - [x] Actualizar `register-scout.component.ts/html/css` para incluir captura de documento y selfie.
  - [x] Actualizar `register-tutor.component.ts/html/css` para incluir selector de parentesco, selfie y poder condicional.
- [x] **Paso 6: Vistas de Auditoría Admin Frontend**
  - [x] Actualizar `admin-scout.model.ts` y vista `admin-scouts.component.ts/html/css`.
  - [x] Actualizar `admin-legal-verification.model.ts` y vista `admin-legal-verification.component.ts/html/css`.
  - [x] Validar compilación frontend con `npm run build`.
- [x] **Paso 7: Documentación de Pruebas y Cierre**
  - [x] Crear informe de pruebas `test/TS-67-test-plan-expediente-identidad-scouts-tutores.md`.
  - [x] Mover tarjeta en Trello a `in testing` y publicar comentario de trazabilidad.

---

## 8. Criterios de Aceptación (DoD)

1. **Registro Scout:** El formulario exige documento de identidad (tipo, número, archivo) y captura de selfie (o subida manual como fallback), además de las credenciales deportivas.
2. **Registro Tutor:** El formulario exige documento de identidad, selfie y selector de parentesco. Si el tutor indica `Representante Legal Autorizado`, el poder notariado es estrictamente obligatorio.
3. **Auditoría de Scouts:** El administrador puede inspeccionar claramente en `/admin/scouts` los 3 documentos del postulante antes de aprobarlo o rechazarlo.
4. **Auditoría de Patria Potestad:** En `/admin/verificacion-legal`, el auditor dispone del expediente completo del tutor (cédula, selfie y poder si aplica) junto a la partida de nacimiento del menor.
5. **Seguridad y Privacidad:** Todos los archivos sensibles se almacenan en el bucket privado de R2 y se consumen mediante URLs prefirmadas de expiración corta (5 minutos).
6. **Calidad de Código y Pruebas:** Todos los tests de backend y frontend compilan y pasan exitosamente sin errores (`./mvnw test` y `npm run build`).
