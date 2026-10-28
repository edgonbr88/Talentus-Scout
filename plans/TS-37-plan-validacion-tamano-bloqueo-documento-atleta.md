# Plan de Implementación: [TS-37] Validación de Tamaño Máximo (5MB) y Bloqueo de Guardado Incompleto en Modal de Documento de Atleta

**ID Tarea:** TS-37  
**Tarjeta Trello:** https://trello.com/c/39yAknmP (ID: `6acc2598021ee52d95a17383`)  
**Fecha:** 2026-10-14  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**  
  Durante la consignación del comprobante de identidad y patria potestad del menor en el panel del tutor, permitir el envío de archivos mayores a 5MB generaba errores técnicos no controlados en el servidor o bloqueos silenciosos en la interfaz, dejando al tutor desorientado. Además, si el usuario hacía clic en guardar con campos vacíos (sin número/folio de documento o sin archivo), se producían llamadas erróneas o estados inconsistentes.
- **Impacto y Experiencia de Usuario:**  
  Implementar validación preventiva reactiva en el Frontend (deshabilitando el botón de guardado hasta que Tipo, Folio y Archivo <= 5MB estén presentes) y mensajes de error con el peso exacto en MB del archivo rechazado brinda claridad y confianza operativa al tutor.
- **Rigor Jurídico y Protección Integral (LOPNNA Art. 65 / FIFA):**  
  Para certificar legalmente la patria potestad y custodia sobre un atleta menor de edad, el tipo de documento, su folio oficial y el archivo físico probatorio deben estar íntegramente consignados y validados antes de persistirse.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
    - `src/main/resources/application.yml`: Configuración de límites `spring.servlet.multipart` (10MB) para permitir procesamiento seguro de uploads en capa servlet y capturar desbordamientos.
    - `com.talentus.scout.web.exception.GlobalExceptionHandler`: Manejador `@ExceptionHandler(MaxUploadSizeExceededException.class)` retornando HTTP `413 Payload Too Large` con mensaje JSON estructurado.
    - `com.talentus.scout.web.dto.UploadAthleteIdentityDocumentRequest`: Anotación `@NotBlank` en `documentNumber`.
    - `com.talentus.scout.service.AthleteService`: Validación estricta de tamaño máximo (5MB), formatos permitidos (PDF, PNG, JPG, JPEG) y presencia de número de documento en `uploadIdentityDocument`.
    - `com.talentus.scout.web.controller.AthleteIdentityDocumentTest`: Nuevas pruebas automatizadas para rechazo de archivos > 5MB, rechazo de folios vacíos y rechazo de formatos inválidos.
  - **Frontend (`talentus-scout-fe` — Angular 18+):**
    - `src/app/features/dashboard/tutor-dashboard.component.ts`:
      - Validación de tamaño con cálculo dinámico en megabytes (`{X.X} MB`) y mensaje explicativo claro en `handleIdentityFile`.
      - Getter `canSaveIdentityDocument` evaluando `identityDocType`, `identityDocNumber.trim()`, `identityFile`, límite de 5MB y estado `!isUploadingIdentity`.
    - `src/app/features/dashboard/tutor-dashboard.component.html`:
      - Botón de guardado vinculado reactivamente a `[disabled]="!canSaveIdentityDocument"`.
    - `src/app/features/dashboard/tutor-dashboard.component.spec.ts`:
      - Casos de prueba unitarios validando la condición de habilitación del botón y el mensaje detallado de 5MB.
- **Dependencias:**  
  - `TS-08` (Cédula de Atleta) y `TS-36` (Dropzone de documento).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No aplica (sin impacto en base de datos; los campos `identity_document_type`, `identity_document_number` y `identity_document_file_url` ya existen en la tabla `athletes`).

---

## 4. Backend: Spring Boot 3 (Java 21)
1. **Configuración Multipart (`application.yml`):**
   ```yaml
   spring:
     servlet:
       multipart:
         max-file-size: 10MB
         max-request-size: 10MB
   ```
2. **Global Exception Handler (`GlobalExceptionHandler.java`):**
   ```java
   @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
   public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
       Map<String, Object> body = new HashMap<>();
       body.put("error", "PAYLOAD_TOO_LARGE");
       body.put("message", "El archivo excede el tamaño máximo permitido por el servidor (5MB). Por favor adjunta un documento más liviano.");
       body.put("timestamp", Instant.now().toString());
       return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(body);
   }
   ```
3. **DTO (`UploadAthleteIdentityDocumentRequest.java`):**
   - `@NotBlank(message = "El número de documento es obligatorio")` en `documentNumber`.
4. **Lógica de Servicio (`AthleteService.java`):**
   - Validación `file.getSize() > 5 * 1024 * 1024` lanzando `IllegalArgumentException("El archivo excede el tamaño máximo permitido (5MB)")`.
   - Validación de extensiones (`.pdf`, `.png`, `.jpg`, `.jpeg`).
   - Validación de `documentNumber` no nulo ni en blanco.

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
1. **Lógica del Componente (`tutor-dashboard.component.ts`):**
   - En `handleIdentityFile(file: File)`:
     ```typescript
     const maxBytes = 5 * 1024 * 1024;
     const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
     if (file.size > maxBytes) {
       this.identityUploadError = `El archivo seleccionado (${sizeMb} MB) supera el límite máximo permitido de 5MB. Por favor selecciona un documento más liviano o comprimido.`;
       this.identityFile = null;
       return;
     }
     ```
   - Getter de validación:
     ```typescript
     get canSaveIdentityDocument(): boolean {
       return !!this.identityDocType &&
              !!this.identityDocNumber?.trim() &&
              !!this.identityFile &&
              this.identityFile.size <= 5 * 1024 * 1024 &&
              !this.isUploadingIdentity;
     }
     ```
2. **Plantilla (`tutor-dashboard.component.html`):**
   - `[disabled]="!canSaveIdentityDocument"` en el botón "Guardar Documento Legal".

---

## 6. Pruebas y Verificación
- **Backend:**
  - `./mvnw test -Dtest=AthleteIdentityDocumentTest`
  - Validar códigos de respuesta HTTP 400 Bad Request ante archivo > 5MB, folio vacío o extensión no autorizada.
- **Frontend:**
  - `npm test -- --watch=false`
  - `npm run build`
- **Integración Local:**
  - Despliegue con `docker compose build` y `docker compose up -d`.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Backend: Configurar `spring.servlet.multipart.max-file-size: 10MB` y `max-request-size: 10MB` en `application.yml`.
- [x] 2. Backend: Añadir `@ExceptionHandler(MaxUploadSizeExceededException.class)` con status 413 en `GlobalExceptionHandler.java`.
- [x] 3. Backend: Añadir validaciones en `UploadAthleteIdentityDocumentRequest.java` y `AthleteService.java` (5MB, extensiones y número de documento no vacío).
- [x] 4. Backend: Añadir casos de prueba para archivo > 5MB, extensiones inválidas y número de documento vacío en `AthleteIdentityDocumentTest.java`.
- [x] 5. Backend: Ejecutar pruebas unitarias de backend (`./mvnw test -Dtest=AthleteIdentityDocumentTest`).
- [x] 6. Frontend: Actualizar `handleIdentityFile` con cálculo exacto de MB en mensaje de error y añadir getter `canSaveIdentityDocument` en `tutor-dashboard.component.ts`.
- [x] 7. Frontend: Vincular `[disabled]="!canSaveIdentityDocument"` en el botón de guardado en `tutor-dashboard.component.html`.
- [x] 8. Frontend: Añadir pruebas unitarias validando `canSaveIdentityDocument` y mensaje detallado de 5MB en `tutor-dashboard.component.spec.ts`.
- [x] 9. Frontend: Ejecutar pruebas unitarias (`npm test -- --watch=false`) y compilar con `npm run build`.
- [x] 10. Documentación: Redactar plan de pruebas en `test/TS-37-test-plan-validacion-tamano-bloqueo-documento-atleta.md`.
- [x] 11. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario.
- [x] 12. Despliegue Local: Construir imágenes Docker actualizadas (`docker compose build`) y recrear contenedores (`docker compose up -d`).

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Si se selecciona o arrastra un archivo > 5MB, el modal muestra alerta con el tamaño exacto del archivo en MB y el límite de 5MB, descartando el archivo.
- [x] El botón "Guardar Documento Legal" permanece deshabilitado hasta que tipo, número/folio y archivo (<= 5MB) estén completamente diligenciados.
- [x] El backend rechaza archivos > 5MB o sin folio con mensaje claro en 400 Bad Request o 413 Payload Too Large.
- [x] `GlobalExceptionHandler` captura `MaxUploadSizeExceededException` y retorna HTTP 413 con JSON estandarizado.
- [x] Todas las pruebas automatizadas de backend (`./mvnw test`) y frontend (`npm test`) pasan al 100%.
- [x] Imágenes Docker reconstruidas y contenedores locales en ejecución saludable.
