# Plan de Implementación — [TS-48] Corrección de persistencia, resolución de URLs y visualización de foto de perfil del atleta en entorno local

**ID Tarea:** TS-48  
**Tarjeta Trello:** [https://trello.com/c/B8iN8dE6](https://trello.com/c/B8iN8dE6) (ID: `6ad6164a7dfe04d17e2eadb5`)  
**Fecha:** 2026-10-19  
**Estado del Plan:** IMPLEMENTACIÓN COMPLETADA — EN TESTING  
**Agente Revisor/Planificador:** trello_planner / trello_implementer  

---

## 1. Contexto de Negocio y Justificación

En Talentus Scout, la fotografía del atleta es el elemento visual primario de su identidad deportiva en el ecosistema:
1. Permite a cazatalentos, scouts y clubes federados identificar rápidamente al jugador en el Directorio Nacional de Scouts (`/scout/directory`).
2. Enriquece la Cédula Deportiva pública y la ficha Bento Grid (`/atleta/:slug`).
3. Facilita la gestión visual y afectiva de los representados en el panel del tutor legal (`/dashboard`).

### Problema Identificado en Entorno Local
Durante el uso de la plataforma en desarrollo local se detectó una doble falla técnica que impedía la correcta persistencia y visualización de la fotografía:
- **Fallo de Origen y Preflight CORS:** Al realizar peticiones `multipart/form-data` o cargar recursos estáticos desde orígenes locales alternativos (como `http://localhost:3000` o peticiones directas desde puertos de desarrollo), se producían bloqueos en solicitudes pre-flight `OPTIONS`.
- **Resolución de Rutas Relativas 404:** El backend retorna rutas relativas canónicas (`/uploads/photos/<uuid>.<ext>`). Al renderizarse en el cliente de Angular (`http://localhost:4200`), el navegador solicitaba los recursos al servidor de desarrollo de Angular en lugar de Spring Boot (`localhost:8080`), resultando en errores HTTP 404.
- **Falta de Resiliencia en Registro Inicial:** En el modal de registro de atleta (`RegisterAthleteModalComponent`), si la subida de foto fallaba tras la creación del atleta, el error era silenciado silenciosamente y el modal se cerraba sin advertir al tutor ni ofrecer una opción de reintento.

### Salvaguarda Legal y del Menor (LOPNNA Art. 65 / FIFA)
* Toda carga o actualización de imagen de menores requiere la ratificación de patria potestad amparada bajo el Art. 65 de la LOPNNA.
* La fotografía sigue siendo estrictamente opcional. Si no se proporciona o si se elimina, el sistema garantiza el renderizado elegante del avatar con iniciales en todas las vistas.
* El tutor puede eliminar la fotografía en cualquier momento, provocando la eliminación física inmediata del archivo en disco.

---

## 2. Alcance Técnico y Arquitectura

* **Base de Datos:** No requiere migraciones DDL adicionales; la columna `profile_photo_url TEXT` ya existe en la tabla `athletes`.
* **Backend (`talentus-scout-be`):**
  - `SecurityConfig.java`: Ampliar `CorsConfigurationSource` para permitir orígenes `http://localhost:3000`, `http://127.0.0.1:3000`, cabeceras estándar y pre-flights `OPTIONS`.
  - `LocalFileStorageService.java`: Asegurar la inicialización y existencia automática del subdirectorio `uploads/photos` en disco al arrancar el servicio.
  - `WebMvcConfig.java`: Configurar `ResourceHandlerRegistry` con cabeceras de caché públicas y agregar mapeo CORS explícito en `WebMvcConfigurer` para `/uploads/**`.
  - Pruebas unitarias: Verificar y ampliar `AthletePhotoControllerTest.java` para validar subidas, eliminaciones y restricciones de tamaño/formato.
* **Frontend (`talentus-scout-fe`):**
  - `proxy.conf.json`: Crear configuración de proxy para desarrollo local redirigiendo `/api` y `/uploads` hacia `http://localhost:8080`.
  - `angular.json`: Vincular `proxyConfig: "proxy.conf.json"` en la configuración de `serve:development`.
  - `environment.ts` / `environment.prod.ts`: Definir `backendOrigin` (`http://localhost:8080` en dev, `''` en prod).
  - `MediaUrlPipe` y función helper `resolveAssetUrl`: Crear pipe standalone `mediaUrl` en `src/app/core/pipes/media-url.pipe.ts` que resuelva rutas relativas `/uploads/**` anteponiendo el origen del backend si aplica.
  - `RegisterAthleteModalComponent`: Manejo visual reactivo si la subida de foto falla tras crear la cédula, ofreciendo botón de reintento (`Reintentar Subida de Foto`) y botón para continuar al panel sin reiniciar el formulario.
  - `TutorDashboardComponent`, `ScoutDirectoryComponent` y `BentoProfileComponent`: Integrar `MediaUrlPipe` en las plantillas HTML para la resolución segura de las fotos de perfil, manteniendo avatares con iniciales como fallback.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)

* No se requieren migraciones DDL ni cambios en Flyway/dbmate.
* Estructura existente en tabla `athletes`:
  ```sql
  -- profile_photo_url TEXT NULL
  ```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1 `SecurityConfig.java`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/config/SecurityConfig.java`
* Actualizar `corsConfigurationSource()`:
  - Incluir `http://localhost:3000` y `http://127.0.0.1:3000` en la lista de orígenes permitidos.
  - Mantener métodos `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `PATCH`, `HEAD`.
  - Mantener cabeceras autorizadas `Authorization`, `Content-Type`, `Range`, `Accept`, `Origin`, `X-Requested-With`.
  - Mantener `allowCredentials(true)`.

### 4.2 `LocalFileStorageService.java`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/service/storage/LocalFileStorageService.java`
* En el constructor o método de inicialización:
  - Garantizar la creación recursiva de los directorios clave:
    ```java
    Files.createDirectories(this.baseStorageLocation.resolve("photos"));
    Files.createDirectories(this.baseStorageLocation.resolve("videos"));
    Files.createDirectories(this.baseStorageLocation.resolve("documents"));
    ```

### 4.3 `WebMvcConfig.java`
Ruta: `talentus-scout-be/src/main/java/com/talentus/scout/config/WebMvcConfig.java`
* En `addResourceHandlers`:
  - Agregar `CacheControl.maxAge(Duration.ofDays(7)).cachePublic()` a `/uploads/**`.
* Implementar `addCorsMappings`:
  ```java
  @Override
  public void addCorsMappings(CorsRegistry registry) {
      registry.addMapping("/uploads/**")
              .allowedOrigins("http://localhost:4200", "http://localhost:3000", "http://localhost", "http://127.0.0.1:4200", "http://127.0.0.1:3000", "http://127.0.0.1")
              .allowedMethods("GET", "HEAD", "OPTIONS");
  }
  ```

### 4.4 Pruebas Automatizadas de Backend
Ruta: `talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AthletePhotoControllerTest.java`
* Validar que la suite existente cubra:
  1. Subida exitosa con HTTP 200 y retorno de ruta `/uploads/photos/...`.
  2. Eliminación exitosa de foto y limpieza de campo.
  3. Rechazo de archivos > 5MB con HTTP 400.
  4. Rechazo de extensiones no permitidas con HTTP 400.
  5. Rechazo de accesos no autorizados con HTTP 403.

---

## 5. Especificación Frontend (Angular 18+ / Standalone)

### 5.1 Configuración de Desarrollo Local y Proxy
1. **Archivo `proxy.conf.json`:**
   Ruta: `talentus-scout-fe/proxy.conf.json`
   ```json
   {
     "/api": {
       "target": "http://localhost:8080",
       "secure": false,
       "changeOrigin": true,
       "logLevel": "debug"
     },
     "/uploads": {
       "target": "http://localhost:8080",
       "secure": false,
       "changeOrigin": true,
       "logLevel": "debug"
     }
   }
   ```
2. **`angular.json`:**
   Ruta: `talentus-scout-fe/angular.json`
   - En `projects.talentus-scout-fe.architect.serve.configurations.development`:
     - Agregar `"proxyConfig": "proxy.conf.json"`.

3. **Ambientes (`environment.ts` y `environment.prod.ts`):**
   - En `talentus-scout-fe/src/environments/environment.ts`:
     - Añadir `backendOrigin: 'http://localhost:8080'`.
   - En `talentus-scout-fe/src/environments/environment.prod.ts`:
     - Añadir `backendOrigin: ''`.

### 5.2 Pipe y Helper de Resolución de URLs Multimedia (`MediaUrlPipe`)
Ruta: `talentus-scout-fe/src/app/core/pipes/media-url.pipe.ts`
* Pipe Standalone `@Pipe({ name: 'mediaUrl', standalone: true })`.
* Función exportada: `export function resolveAssetUrl(url?: string | null): string`.
* Lógica:
  - Si `url` es nulo, indefinido o vacío: retornar `''`.
  - Si empieza con `http://`, `https://`, `data:`, `blob:`: retornar `url`.
  - Si empieza con `/uploads/`:
    - Anteponer `environment.backendOrigin` si está definido (ej. `http://localhost:8080/uploads/...`), permitiendo resolución directa en navegador tanto si se usa proxy como si no.
  - Retornar `url` por defecto.

### 5.3 Modal de Registro de Atleta (`RegisterAthleteModalComponent`)
Rutas:
* `talentus-scout-fe/src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`
* `talentus-scout-fe/src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`

1. **Gestión de Estados Reactivos:**
   - Propiedades:
     - `createdAthlete: AthleteSummary | null = null;`
     - `photoUploadFailed = false;`
     - `photoUploadErrorMessage: string | null = null;`
     - `isRetryingPhoto = false;`
2. **Modificación de `onSubmit()`:**
   - Al crear el atleta con éxito:
     - Guardar `this.createdAthlete = created;`.
     - Si hay `selectedPhotoFile`:
       - Invocar `uploadAthletePhoto(created.id, this.selectedPhotoFile)`.
       - Si es exitoso: emitir `athleteCreated(withPhoto)` y cerrar.
       - Si falla: no cerrar el modal; marcar `photoUploadFailed = true`, detener spinner `isSubmitting = false` y mostrar panel de advertencia/reintento.
     - Si no hay foto: emitir `athleteCreated(created)` y cerrar.
3. **Métodos de Recuperación:**
   - `retryPhotoUpload()`:
     - Invoca nuevamente `uploadAthletePhoto(this.createdAthlete!.id, this.selectedPhotoFile!)`.
     - Si tiene éxito: emitir `athleteCreated(withPhoto)` y cerrar.
     - Si falla: mostrar mensaje de error en el banner y mantener opciones.
   - `continueWithoutPhoto()`:
     - Emite `athleteCreated(this.createdAthlete!)` y cierra el modal para que el tutor pueda acceder al dashboard.
4. **Diseño de Interfaz del Banner de Reintento (HTML / CSS):**
   - Banner estilizado con paleta de advertencia ámbar/esmeralda según directivas de `fe-desing.md`.
   - Claridad informativa: notificar que la cédula ya fue registrada y no se duplicará.

### 5.4 Integración en Dashboard, Directorio y Perfil Público
1. **`TutorDashboardComponent`:**
   - Importar `MediaUrlPipe` en `imports`.
   - En `tutor-dashboard.component.html`:
     - Aplicar `[src]="athlete.profilePhotoUrl | mediaUrl"` en los avatares de atletas y en el modal de gestión de foto.
2. **`ScoutDirectoryComponent`:**
   - Importar `MediaUrlPipe` en `imports`.
   - En `scout-directory.component.html`:
     - Aplicar `[src]="athlete.profilePhotoUrl | mediaUrl"` en las tarjetas de jugadores del radar.
3. **`BentoProfileComponent`:**
   - Importar `MediaUrlPipe` en `imports`.
   - En `bento-profile.component.html`:
     - Aplicar `[src]="a.profilePhotoUrl | mediaUrl"` en el hero del perfil público.

---

## 6. Plan de Pruebas y Validación

### 6.1 Pruebas Backend
* Ejecutar: `./mvnw test -Dtest=AthletePhotoControllerTest` en `talentus-scout-be`.
* Ejecutar suite completa: `./mvnw test` en `talentus-scout-be`.

### 6.2 Pruebas Frontend
* Crear prueba unitaria para `MediaUrlPipe` (`media-url.pipe.spec.ts`).
* Actualizar pruebas unitarias de `RegisterAthleteModalComponent` (`register-athlete-modal.component.spec.ts`) para validar el flujo de fallo y reintento de foto.
* Actualizar pruebas de `TutorDashboardComponent` si aplica.
* Ejecutar: `npm test -- --watch=false` en `talentus-scout-fe`.
* Ejecutar validación de empaquetado SSR: `npm run build` en `talentus-scout-fe`.

### 6.3 Verificación Manual (Checklist End-to-End)
1. Subir foto desde el modal de registro y verificar creación inmediata y renderizado en tarjeta de dashboard.
2. Simular fallo de subida de foto y validar que el modal ofrece los botones de reintento y continuación al panel.
3. Abrir el modal de foto en el dashboard, actualizar la imagen y verificar cambio inmediato en dashboard.
4. Navegar a `/scout/directory` y verificar que la imagen del atleta se visualiza sin errores 404 ni problemas de CORS.
5. Navegar a `/atleta/:slug` y corroborar el renderizado en la ficha Bento Grid.
6. Eliminar la foto desde el dashboard y verificar que el avatar regresa a las iniciales con estilo atlético.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] 1. Backend: Actualizar `SecurityConfig.java` incorporando `http://localhost:3000` y `http://127.0.0.1:3000` en `CorsConfigurationSource`.
- [x] 2. Backend: Asegurar creación automática del directorio `uploads/photos` en `LocalFileStorageService.java`.
- [x] 3. Backend: Configurar `ResourceHandlerRegistry` con cache-control y mapeo CORS en `WebMvcConfig.java`.
- [x] 4. Backend: Ejecutar `./mvnw test -Dtest=AthletePhotoControllerTest` y suite completa `./mvnw test`.
- [x] 5. Frontend: Crear `proxy.conf.json` en `talentus-scout-fe/` y vincularlo en `angular.json` (`serve.configurations.development`).
- [x] 6. Frontend: Configurar `backendOrigin` en `environment.ts` y `environment.prod.ts`.
- [x] 7. Frontend: Crear `MediaUrlPipe` y función `resolveAssetUrl` en `src/app/core/pipes/media-url.pipe.ts` con sus pruebas en `media-url.pipe.spec.ts`.
- [x] 8. Frontend: Implementar manejo de reintento de foto en `RegisterAthleteModalComponent` (`.ts` y `.html`).
- [x] 9. Frontend: Integrar `MediaUrlPipe` en `TutorDashboardComponent`, `ScoutDirectoryComponent` y `BentoProfileComponent`.
- [x] 10. Frontend: Ejecutar pruebas unitarias (`npm test -- --watch=false`) y verificar suite en verde.
- [x] 11. Frontend: Ejecutar `npm run build` validando SSR y bundling.
- [x] 12. Pruebas y Trello: Redactar documento de pruebas en `test/TS-48-test-plan-persistencia-resolucion-urls-foto-perfil-atleta-local.md`, mover tarjeta a `in testing` y dejar comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [x] Al registrar un atleta con foto desde el modal, la imagen se almacena en `uploads/photos/` sin errores de CORS ni timeouts.
- [x] La foto del atleta es visible inmediatamente en la tarjeta del Dashboard del tutor (`/dashboard`).
- [x] La foto del atleta se renderiza correctamente en las tarjetas de jugadores del Directorio de Scouts (`/scout/directory`) y en la Cédula Deportiva (`/atleta/:slug`).
- [x] Si la subida de foto experimenta un fallo temporal en el registro, la interfaz notifica al usuario con opción clara de reintento sin duplicar al atleta.
- [x] La eliminación de foto desde el modal del Dashboard elimina el archivo del disco y restablece el avatar con iniciales.
- [x] Todas las pruebas unitarias y de integración de frontend (`npm test`) y backend (`./mvnw test`) pasan exitosamente.
