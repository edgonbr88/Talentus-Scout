# Plan de Pruebas y Validación: [TS-67] Expediente de Identidad Reforzado para Scouts y Tutores: Captura de Documento, Selfie con Cámara y Poder de Representación

**ID Tarea:** TS-67  
**Título:** Expediente de Identidad Reforzado para Scouts y Tutores: Captura de Documento, Selfie con Cámara y Poder de Representación  
**Tarjeta Trello:** [https://trello.com/c/p3HCAY2X](https://trello.com/c/p3HCAY2X)  
**ID de Tarjeta en Trello:** `6aedffaa16546ebcee230296`  
**Sprint:** Sprint 4  
**Fecha:** 2026-11-06  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

Este plan de pruebas certifica el refuerzo integral del expediente de identidad y cotejo documental de Scouts y Tutores Legales en Talentus Scout bajo cumplimiento estricto de la LOPNNA (Art. 65) y normativas FIFA de salvaguardia infantil:
1. **Base de Datos (`talentus-scout-migrations`):**
   * Migración `20261106140000_add_enhanced_identity_documents_to_scouts_and_tutors.sql` que incorpora a `scout_profiles`: `id_document_type`, `id_document_number`, `id_document_url` y `selfie_url`; y a `tutor_legal_consents`: `relationship_type` (default `'PARENT'`), `selfie_file_url` y `representation_document_file_url`.
   * Aplicada exitosamente tanto en el PostgreSQL local de desarrollo como en la base de datos de producción Neon.
2. **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21 / Lombok):**
   * Entidades JPA: `ScoutProfile` y `TutorLegalConsent` actualizadas con Project Lombok (`@Getter`, `@Setter`, `@Builder`, `@Builder.Default`).
   * DTOs: `RegisterScoutRequest` (con `idDocumentType`, `idDocumentNumber`, `idDocumentFile`, `selfieFile`), `RegisterTutorRequest` (con `relationshipType`, `selfieFile`, `representationDocumentFile` y `@AssertTrue`), `PendingScoutResponse` y `LegalVerificationPendingItemResponse`.
   * Servicios y Almacenamiento: `R2FileStorageService` protegiendo `selfies` y `tutor-representations` en bucket privado con URLs prefirmadas temporales de 5 minutos; `AuthService` y `AuthController` orquestando la persistencia de archivos multipart; `AdminScoutService` y `LegalVerificationService` resolviendo URLs prefirmadas para la auditoría de scouts y patria potestad.
3. **Frontend (`talentus-scout-fe` — Angular 18+ / `fe-desing.md`):**
   * Componente Standalone Reutilizable `WebcamSelfieCaptureComponent`: Integración nativa con `navigator.mediaDevices.getUserMedia`, guía ovalada biométrica de encuadre, captura a canvas, preview instantáneo y fallback para subida de archivo.
   * Registro de Scouts (`register-scout.component`): Incorporación de selector de documento oficial (Cédula, Pasaporte, DNI), número de documento, dropzone de copia física y captura de selfie en vivo.
   * Registro de Tutores (`register-tutor.component`): Selector de parentesco (`Padre / Madre` vs `Representante Legal Autorizado`), captura de selfie en vivo y dropzone condicional obligatorio para Poder Notariado / Tutela Legal.
   * Panel de Auditoría de Scouts (`admin-scouts.component`): Despliegue del trío de documentos (Credencial Oficial, Documento de Identidad y Selfie de Validación).
   * Panel de Verificación de Patria Potestad (`admin-legal-verification.component`): Pestañas dinámicas del expediente del tutor (Cédula, Selfie en Vivo y Poder Notariado) para cotejo directo contra la partida de nacimiento del menor.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
cd talentus-scout-be && ./mvnw test -Dtest=AuthControllerTest,AuthScoutRegistrationTest,AdminScoutWorkflowTest,AdminLegalVerificationControllerIntegrationTest
```

| Clase de Prueba | Casos Verificados | Resultado |
| :--- | :--- | :--- |
| `AuthControllerTest` | Verificación de healthcheck, autenticación JWT admin y endpoints protegidos. | **PASS** (5/5) |
| `AuthScoutRegistrationTest` | Registro completo de scout con los 3 documentos (Credencial, Cédula y Selfie), persistencia en `scout_profiles` con URLs en `/uploads/`, validación de unicidad de correo (409 Conflict), validación de obligatoriedad de credenciales y selfie (400 Bad Request), registro con clubes oficiales y no verificados. | **PASS** (7/7) |
| `AdminScoutWorkflowTest` | Consulta administrativa de scouts pendientes con retorno de URLs prefirmadas para credencial, cédula y selfie, aprobación con activación de cuenta `ACTIVE` y rechazo motivado con notificación por correo. | **PASS** (7/7) |
| `AdminLegalVerificationControllerIntegrationTest` | Consulta de expedientes pendientes de patria potestad con documentos completos del tutor y menor, aprobación, rechazo motivado y métricas operativas. | **PASS** (7/7) |

**Resultado Backend:** `26 tests run, 0 failures, 0 errors (BUILD SUCCESS)`.

### 2.2. Frontend (Angular 18+ / Production Build)
Comando ejecutado:
```bash
cd talentus-scout-fe && npm run build
```

| Módulo / Componente | Verificación | Resultado |
| :--- | :--- | :--- |
| `WebcamSelfieCaptureComponent` | Compilación Standalone, manejo de eventos `@Output() photoSelected` y `@Output() photoCleared`, compatibilidad con SSR y tipado TypeScript estricto. | **PASS** |
| `RegisterScoutComponent` | Enlace de formulario reactivo con campos de identidad, integración del componente de selfie y empaquetado en `FormData`. | **PASS** |
| `RegisterTutorComponent` | Enlace de selector de parentesco (`PARENT` vs `LEGAL_REPRESENTATIVE`), validación condicional de poder notariado y empaquetado `FormData`. | **PASS** |
| `AdminScoutsComponent` | Visualización en Bento grid del trío de documentos probatorios del reclutador. | **PASS** |
| `AdminLegalVerificationComponent` | Pestañas de inspección documental del tutor (`ID`, `SELFIE`, `REPRESENTATION`) y badge de calidad legal. | **PASS** |
| Build de Producción (`ng build`) | 16 rutas estáticas pre-renderizadas, bundle de cliente y servidor generados sin errores. | **PASS** |

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Flujo de Registro de Scout con Expediente Reforzado
1. Navegar a `/auth/register-scout`.
2. Completar los datos personales y deportivos:
   * Nombre: `Diego Simeone Scout`
   * Correo: `scout.verif@atleti.es`
   * Teléfono: `+584121112233`
   * Organización: `Club Deportivo / Atlético`
   * Cargo: `Director Deportivo`
3. Consignar Credencial Deportiva: Adjuntar archivo PDF o imagen.
4. Consignar Documento de Identidad:
   * Tipo: `Cédula de Identidad`
   * Número: `V-14555888`
   * Archivo: Adjuntar copia de cédula.
5. Capturar Selfie en Vivo:
   * Hacer clic en "Activar Cámara" (permitir permisos en el navegador) o hacer clic en "Subir archivo" para cargar una foto de prueba.
   * Verificar que la vista previa muestra "Foto cargada con éxito" con botón de "Tomar otra foto".
6. Aceptar declaración jurada y enviar postulación.
7. Verificar que la solicitud es creada con estatus `PENDING_VERIFICATION` y redirige a `/auth/scout-pending-audit`.

### 3.2. Flujo de Registro de Tutor con Declaración de Parentesco y Selfie
1. Navegar a `/auth/register-tutor`.
2. Completar datos personales y de residencia:
   * Nombre: `Carmen Morales`
   * Correo: `tutor.carmen@test.com`
   * Teléfono: `+584129990011`
   * País: `Venezuela`, Estado: `Distrito Capital`
3. En la sección "Documento de Identidad y Representación Legal":
   * Seleccionar `Padre / Madre`: Constatar que el campo de poder notariado permanece oculto.
   * Seleccionar `Representante Legal Autorizado`: Constatar que se despliega el bloque de "Poder de Representación o Sentencia de Tutela Notariada".
4. Adjuntar cédula del tutor.
5. Si se seleccionó `Representante Legal Autorizado`, adjuntar archivo del poder notariado.
6. En el componente de Selfie, capturar foto con la cámara o subir archivo.
7. Aceptar términos LOPNNA y enviar formulario.
8. Verificar respuesta `201 Created` y redirección a verificación de correo.

### 3.3. Auditoría Administrativa de Scouts (`/admin/scouts`)
1. Iniciar sesión como administrador (`admin@talentus.app`).
2. Ingresar a `/admin/scouts`.
3. Localizar al scout en la cola de pendientes.
4. Verificar que la tarjeta presenta los 3 botones de inspección:
   * `🪪 Credencial Oficial`
   * `📄 Documento de Identidad (V-14555888)`
   * `📸 Selfie en Vivo`
5. Hacer clic en cada uno y comprobar que abren en una pestaña nueva la URL prefirmada de R2.
6. Aprobar la acreditación o rechazar con motivo justificado.

### 3.4. Auditoría de Patria Potestad del Menor (`/admin/verificacion-legal`)
1. Ingresar a `/admin/verificacion-legal`.
2. Abrir la inspección de un atleta menor pendiente.
3. En la columna izquierda (Menor): Visualizar la partida de nacimiento / cédula del atleta.
4. En la columna derecha (Representante):
   * Comprobar el badge de parentesco (`👨‍👩‍👧 Padre / Madre` o `⚖️ Representante Legal`).
   * Usar las pestañas `📄 Cédula / DNI`, `📸 Selfie en Vivo` y `📜 Poder Notariado` para contrastar la filiación y titularidad con el documento del menor.
5. Aprobar o solicitar subsanación.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio | Descripción | Estado |
| :---: | :--- | :---: |
| **DoD 1** | Formulario de scouts exige credencial deportiva, documento oficial de identidad (tipo, número, archivo) y captura de selfie (o subida manual como fallback). | **CUMPLIDO** |
| **DoD 2** | Formulario de tutores exige documento de identidad, selector de parentesco (`Padre/Madre` vs `Representante Legal`), selfie con cámara/fallback y poder notariado condicional obligatorio para representantes legales. | **CUMPLIDO** |
| **DoD 3** | Retrocompatibilidad: Scouts y tutores previamente registrados conservan su estatus activo sin requerir re-subida obligatoria. | **CUMPLIDO** |
| **DoD 4** | Panel `/admin/scouts` muestra el trío consolidado de documentos con URLs prefirmadas de 5 min para su auditoría previa. | **CUMPLIDO** |
| **DoD 5** | Panel `/admin/verificacion-legal` dispone del expediente documental íntegro del tutor (cédula, selfie y poder) en pestañas intuitivas junto a la partida de nacimiento del menor. | **CUMPLIDO** |
| **DoD 6** | Los archivos sensibles de selfies y poderes de representación se almacenan en el bucket privado de Cloudflare R2 (`talentus-private-documents`). | **CUMPLIDO** |
| **DoD 7** | Compilación y pruebas de backend (`./mvnw test`) y frontend (`npm run build`) ejecutadas al 100% sin errores. | **CUMPLIDO** |
