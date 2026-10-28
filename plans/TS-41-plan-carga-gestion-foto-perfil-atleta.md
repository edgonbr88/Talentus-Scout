# Plan de Implementación — [TS-41] Carga y Gestión de Foto de Perfil del Atleta (Dashboard Tutor, Registro y Cédula Deportiva)

## 1. Identificación de la Tarea
* **ID:** `TS-41`
* **Título:** Carga y Gestión de Foto de Perfil del Atleta (Dashboard Tutor, Registro y Cédula Deportiva)
* **Trello Card:** [https://trello.com/c/v4s61Jc7](https://trello.com/c/v4s61Jc7) (ID: `6acf9368312ef864358b9703`)
* **Sprint:** Sprint 3
* **Estado Actual:** `in development`
* **Dependencias:** `TS-05`, `TS-09`

---

## 2. Resumen y Contexto de Negocio
La fotografía del atleta es el elemento visual primario de su identidad deportiva en Talentus Scout. Permite a los cazatalentos, directores técnicos y clubes federados identificarlo al instante en el Directorio Nacional de Scouts, enriquece la Cédula Deportiva pública (Bento Grid) al compartirla en redes o informes de visoría, y humaniza la gestión de representados en el panel del tutor legal.

### Marco Legal y Salvaguarda del Menor (LOPNNA / FIFA)
* **LOPNNA Art. 65 (Derecho al Honor, Reputación y Propia Imagen):** La difusión y publicación de imágenes de menores de edad requiere consentimiento expreso de quien ejerza la patria potestad o tutela legal.
* **Declaración Jurada en Interfaz:** Todo componente de carga de foto incorpora un aviso legal explícito donde el tutor declara bajo fe de juramento que ostenta la patria potestad o representación legal y autoriza el uso de la fotografía con propósitos de captación formativa deportiva.
* **Carácter Opcional y Derecho al Olvido:** La foto no es obligatoria para registrar al atleta. Si no se provee, la plataforma utiliza un avatar deportivo estilizado con las iniciales del jugador. El tutor puede revocar el consentimiento y eliminar la fotografía en cualquier momento, provocando la eliminación física inmediata del archivo en el servidor.

---

## 3. Arquitectura y Modelo de Datos

### 3.1 Base de Datos (PostgreSQL)
* La columna `profile_photo_url TEXT` ya existe en la tabla `athletes` (creada en la migración canónica `20260929171117_create_initial_schema.sql`).
* No se requieren migraciones DDL adicionales para esta tarea.

### 3.2 Almacenamiento Físico y Servicio de Archivos
* **Subdirectorio:** `uploads/photos/`
* **Formato de Nombres:** `<UUID>.<extension>` (ej. `a3b8c2d1-....jpg`), generado por `LocalFileStorageService`.
* **Ruta Relativa Expuesta:** `/uploads/photos/<UUID>.<ext>`
* **Exposición HTTP:** Servido por Spring Boot a través de `WebMvcConfig` (`/uploads/**`) y proxy de Nginx (`location ^~ /uploads/`).
* **Seguridad y Limpieza:** Cuando se sube una nueva foto y el atleta ya poseía una anterior, el archivo antiguo se borra del disco mediante `fileStorageService.deleteFile()`. Igualmente al invocar la eliminación de foto.

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1 Modificaciones en `AthleteService.java`
Ruta: `src/main/java/com/talentus/scout/service/AthleteService.java`

1. **Método `uploadProfilePhoto(UUID athleteId, MultipartFile file)`:**
   - Validar que el archivo no sea nulo ni vacío.
   - Validar tamaño máximo: 5 MB (`5 * 1024 * 1024`).
   - Validar tipo MIME y extensiones permitidas: `image/jpeg`, `image/jpg`, `image/png`, `image/webp` (extensiones `.jpg`, `.jpeg`, `.png`, `.webp`).
   - Obtener la entidad `Athlete` existente.
   - Si `athlete.getProfilePhotoUrl()` no es nulo/vacío, ejecutar `fileStorageService.deleteFile(athlete.getProfilePhotoUrl())`.
   - Persistir nuevo archivo con `fileStorageService.storeFile(file, "photos")`.
   - Asignar `athlete.setProfilePhotoUrl(storedUrl)`.
   - Guardar entidad en repositorio y retornar `new AthleteResponse(updated)`.

2. **Método `deleteProfilePhoto(UUID athleteId)`:**
   - Obtener la entidad `Athlete` existente.
   - Si `athlete.getProfilePhotoUrl()` no es nulo/vacío, ejecutar `fileStorageService.deleteFile(athlete.getProfilePhotoUrl())`.
   - Asignar `athlete.setProfilePhotoUrl(null)`.
   - Guardar entidad en repositorio y retornar `new AthleteResponse(updated)`.

### 4.2 Modificaciones en `AthleteController.java`
Ruta: `src/main/java/com/talentus/scout/web/controller/AthleteController.java`

1. **Endpoint `POST /api/v1/athletes/{id}/photo`:**
   - Anotación: `@PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)`
   - Seguridad: `@PreAuthorize("@athleteSecurity.isOwner(#id, authentication)")`
   - Parámetros: `@PathVariable("id") UUID id, @RequestParam("file") MultipartFile file`
   - Retorno: `ResponseEntity<AthleteResponse>` (HTTP 200 OK).

2. **Endpoint `DELETE /api/v1/athletes/{id}/photo`:**
   - Anotación: `@DeleteMapping("/{id}/photo")`
   - Seguridad: `@PreAuthorize("@athleteSecurity.isOwner(#id, authentication)")`
   - Parámetros: `@PathVariable("id") UUID id`
   - Retorno: `ResponseEntity<AthleteResponse>` (HTTP 200 OK).

### 4.3 Pruebas Automatizadas de Backend
Ruta: `src/test/java/com/talentus/scout/web/controller/AthletePhotoControllerTest.java`:
- Subida exitosa de foto por el tutor propietario (HTTP 200, URL de foto asignada).
- Rechazo de subida de foto por usuario no propietario / otro tutor (HTTP 403 Forbidden).
- Rechazo de formato no soportado (ej. `.pdf`, `.txt`) con HTTP 400 Bad Request.
- Rechazo de archivo que excede 5MB con HTTP 400 Bad Request.
- Eliminación exitosa de foto por el tutor propietario (HTTP 200, `profilePhotoUrl` queda en null).
- Rechazo de eliminación de foto por usuario no propietario (HTTP 403 Forbidden).

---

## 5. Especificación Frontend (Angular 18+)

### 5.1 Servicio `AthleteService`
Ruta: `src/app/core/services/athlete.service.ts`
- `uploadAthletePhoto(athleteId: string, file: File): Observable<AthleteSummary>`:
  Realiza `POST /api/v1/athletes/${athleteId}/photo` con `FormData` que incluye `'file'`.
- `deleteAthletePhoto(athleteId: string): Observable<AthleteSummary>`:
  Realiza `DELETE /api/v1/athletes/${athleteId}/photo`.

### 5.2 Dashboard del Tutor (`tutor-dashboard.component`)
Rutas:
- `src/app/features/dashboard/tutor-dashboard.component.ts`
- `src/app/features/dashboard/tutor-dashboard.component.html`

1. **Puntos de Entrada para Gestión de Foto:**
   - En la tarjeta del atleta, el avatar circular `.athlete-avatar` incorpora indicador hover con ícono de cámara y evento click `(click)="openPhotoModal(athlete)"`.
   - En la barra de acciones de la tarjeta del atleta (`.athlete-actions-bar`), se agrega el botón secundario `📷 Foto Perfil` con `(click)="openPhotoModal(athlete)"`.
2. **Modal Interactivo de Foto de Perfil (`showPhotoModal`):**
   - Encabezado con badge y título *"Fotografía de Perfil del Atleta"*.
   - Área de previsualización:
     - Si ya tiene foto o se seleccionó una nueva, muestra la imagen en marco circular con borde atlético.
     - Si no tiene foto y no ha seleccionado archivo, muestra el avatar de iniciales con gradiente deportivo.
   - Dropzone de selección (Drag & Drop y botón de archivo):
     - Soporta arrastrar o seleccionar archivos JPG, PNG, WEBP (máximo 5 MB).
     - Validación reactiva de tamaño y formato con mensaje de error claro en interfaz.
   - **Cláusula Legal LOPNNA Art. 65:**
     - Bloque visual destacado con ícono de salvaguarda legal:
       *"Al subir esta fotografía, declaras bajo fe de juramento que ostentas la patria potestad o tutela legal del menor y autorizas el uso de su imagen con propósitos de captación deportiva formativa."*
   - Botón *"Guardar Fotografía"* con indicador de carga `isUploadingPhoto`. Deshabilitado si no hay archivo seleccionado.
   - Si el atleta ya cuenta con foto guardada:
     - Botón *"Eliminar Foto"* con confirmación para regresar al avatar con iniciales.
   - Notificación toast de éxito al actualizar o eliminar la foto.

### 5.3 Modal de Registro de Atleta (`register-athlete-modal.component`)
Rutas:
- `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`
- `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`

1. **Sección Opcional de Fotografía Deportiva:**
   - Añadir sección antes de los botones de envío: *"Fotografía de Perfil (Opcional)"*.
   - Selector / Dropzone compacto con preview circular instantáneo.
   - Botón para descartar la foto seleccionada antes de enviar el formulario.
   - Cláusula de advertencia legal LOPNNA Art. 65 visible.
2. **Encadenamiento en `onSubmit()`:**
   - Crea el atleta mediante `athleteService.createAthlete(...)`.
   - Si se seleccionó una foto, encadena inmediatamente `athleteService.uploadAthletePhoto(created.id, photoFile)`.
   - Emite el atleta finalizado con su foto persistida hacia el dashboard del tutor.

### 5.4 Verificación en Cédula Deportiva Pública y Directorio
- Validar que `bento-profile.component` y `scout-directory.component` rendericen correctamente la nueva foto con `object-fit: cover` y proporciones armónicas.

---

## 6. Plan de Pruebas y Validación

### 6.1 Pruebas Backend
- Ejecutar `./mvnw test` en `talentus-scout-be`, verificando la suite completa y las nuevas pruebas de `AthleteController` / `AthleteSecurity`.

### 6.2 Pruebas Frontend
- Crear/actualizar pruebas unitarias en `talentus-scout-fe` (`tutor-dashboard.component.spec.ts` y `register-athlete-modal.component.spec.ts` o spec específico de servicio).
- Ejecutar `npm test -- --watch=false` en `talentus-scout-fe`.
- Ejecutar `npm run build` en `talentus-scout-fe` para validar empaquetado SSR.

### 6.3 Despliegue Local Docker
- Reconstruir imágenes de frontend y backend: `docker compose build`.
- Levantar contenedores: `docker compose up -d`.
- Verificar logs y endpoints saludables.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Backend: Implementar `uploadProfilePhoto` y `deleteProfilePhoto` en `AthleteService.java`.
- [x] 2. Backend: Implementar endpoints `POST /api/v1/athletes/{id}/photo` y `DELETE /api/v1/athletes/{id}/photo` en `AthleteController.java`.
- [x] 3. Backend: Escribir pruebas unitarias e integración en `AthletePhotoControllerTest.java` o ampliar pruebas de controlador.
- [x] 4. Backend: Ejecutar `./mvnw test` y asegurar 100% de pruebas pasando.
- [x] 5. Frontend: Agregar métodos `uploadAthletePhoto` y `deleteAthletePhoto` en `AthleteService` (`athlete.service.ts`).
- [x] 6. Frontend: Implementar modal de gestión de foto en `tutor-dashboard.component.ts` y `.html` con preview, dropzone, cláusula LOPNNA y eliminación.
- [x] 7. Frontend: Implementar selector opcional de foto en `register-athlete-modal.component.ts` y `.html` con preview y encadenamiento al crear atleta.
- [x] 8. Frontend: Ejecutar pruebas unitarias (`npm test -- --watch=false`) y verificar suite en verde.
- [x] 9. Frontend: Ejecutar `npm run build` para asegurar empaquetado SSR exitoso.
- [x] 10. Documentación: Redactar plan de pruebas en `test/TS-41-test-plan-carga-gestion-foto-perfil-atleta.md`.
- [x] 11. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario.
- [ ] 12. Despliegue Local: Construir imágenes Docker actualizadas (`docker compose build`) y recrear contenedores (`docker compose up -d`).

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] El tutor legal puede subir una foto (JPG, PNG, WEBP, máx 5MB) para su atleta desde el Dashboard y opcionalmente durante el registro inicial.
- [x] La foto se previsualiza antes de guardar y muestra el disclaimer legal de patria potestad LOPNNA Art. 65.
- [x] Al confirmarse la subida, la foto es visible en el Dashboard, en la Cédula Deportiva pública (`/atleta/:slug`) y en el Directorio de Scouts (`/directorio-scouts`).
- [x] Si el atleta ya tenía una foto previa y se sube una nueva, el archivo anterior se elimina físicamente del almacenamiento.
- [x] El tutor puede eliminar la foto de su atleta, restableciendo inmediatamente el avatar con iniciales y eliminando el archivo del almacenamiento.
- [x] Intentos de subir o borrar fotos por usuarios no dueños del atleta son rechazados con HTTP 403 Forbidden.
- [x] Archivos mayores a 5MB o formatos no soportados son rechazados en backend y frontend con mensaje de error comprensible.
- [x] Pruebas automatizadas de backend (`AthletePhotoControllerTest`) y frontend cubren los nuevos flujos satisfactoriamente.
- [ ] Imágenes Docker reconstruidas y contenedores locales en ejecución saludable.
