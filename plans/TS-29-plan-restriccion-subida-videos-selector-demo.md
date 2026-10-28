# Plan de Implementación: [TS-29] Restricción de Subida de Videos: Deshabilitación sin Atletas, Selector Rápido y Eliminación de Carga Demo

**ID Tarea:** TS-29  
**Tarjeta Trello:** https://trello.com/c/2yNej4fp  
**Fecha:** 2026-10-13  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** En Talentus Scout, los videos de jugadas y clips son evidencia deportiva vinculada a la cédula deportiva de un atleta específico. Habilitar botones de subida de video cuando el tutor no tiene atletas registrados, o permitir flujos con identificadores dummy/mock (`00000000-0000-0000-0000-000000000001`), genera registros huérfanos, rompe la integridad referencial y causa confusión operativa. Asimismo, cuando un tutor gestiona múltiples atletas representados, el botón global del header no ofrecía claridad sobre a cuál atleta se asignaría el video.
- **Impacto:** Brinda una experiencia de usuario clara, sin callejones sin salida ni botones falsos. Garantiza que cada video subido pertenezca a un atleta real y legítimo del tutor.
- **Restricciones Legales (LOPNNA Art. 65 / Normas FIFA):** Todo material audiovisual de menores de edad requiere consentimiento legal activo y custodia verificable de patria potestad. Bloquear cargas huérfanas o no autorizadas tanto en Frontend como en Backend asegura la trazabilidad jurídica de cada contenido multimedia.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Backend (`talentus-scout-be`):**
    - `com.talentus.scout.service.VideoService`: Validación de existencia de atleta y comprobación estricta de titularidad del tutor autenticado (`tutor.id == currentUser.id`) o rol `ADMIN` en `requestUpload`.
    - `com.talentus.scout.web.controller.VideoControllerTest`: Casos de prueba verificando rechazo 403 Forbidden cuando el atleta pertenece a otro tutor, y 404 Not Found si no existe.
  - **Frontend (`talentus-scout-fe`):**
    - `tutor-dashboard.component.html`: Deshabilitación del botón "Subir Video" en el header con tooltip explicativo cuando `athletes.length === 0`. Eliminación del botón "Probar Subida de Video (Demo)" en la caja de estado vacío. Modal/selector rápido para tutores con múltiples atletas (`athletes.length > 1`).
    - `tutor-dashboard.component.ts`: Lógica de apertura según cantidad de atletas (0 -> bloqueado, 1 -> directo, >1 -> selector). Eliminación del UUID dummy `'00000000-0000-0000-0000-000000000001'` y etiqueta "Atleta de Demostración".
    - `tutor-dashboard.component.spec.ts`: Tests unitarios validando estados del botón, apertura de uploader y selector rápido.
- **Dependencias:** TS-08 (Carga de Videos), TS-14 (Integración Video Streaming) y TS-17 (Dashboard de Tutor).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Impacto DDL:** No requiere migraciones DDL nuevas. La tabla `athlete_videos` ya cuenta con clave foránea obligatoria `athlete_id NOT NULL REFERENCES athletes(id)` y la tabla `athletes` cuenta con `tutor_id NOT NULL REFERENCES users(id)`.

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Clases a Modificar:**
  1. `com.talentus.scout.service.VideoService`:
     - Inyectar `UserRepository`.
     - En `requestUpload(RequestUploadRequest request, String currentUserEmail)`:
       - Buscar atleta por `request.athleteId()`, lanzar `ResourceNotFoundException` si no existe.
       - Si `currentUserEmail != null`:
         - Obtener `User currentUser` mediante `userRepository.findByEmail(currentUserEmail)` (lanzar `ResourceNotFoundException` si no se halla).
         - Si `currentUser.getRole() != UserRole.ADMIN`:
           - Validar que `athlete.getTutor() != null && athlete.getTutor().getId().equals(currentUser.getId())`.
           - Si no coincide, lanzar `org.springframework.security.access.AccessDeniedException("No tienes autorización para cargar videos de este atleta.")`.
  2. `com.talentus.scout.web.controller.VideoControllerTest`:
     - Agregar test: `shouldRejectUploadTicketWhenAthleteBelongsToAnotherTutor` -> 403 Forbidden.
     - Agregar test: `shouldRejectUploadTicketWhenAthleteNotFound` -> 404 Not Found.
     - Agregar test: `shouldAllowUploadTicketWhenUserIsAdmin` -> 201 Created.

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directiva de Diseño ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Mantener la estética deportiva moderna (Dark Slate `#070B14`, Midnight Navy `#0E1527`, Emerald Green `#10B981`).
  - Estado deshabilitado del botón en header: `opacity: 0.5`, `cursor: not-allowed`, tooltip accesible vía `title`.
  - Selector rápido de atletas: Bento dialog elegante con avatar, nombre, posición, club y botón de selección rápida con efecto hover atenuado.
  - Eliminar botón de demo en `empty-state-box`, conservando únicamente la llamada a la acción principal: "Registrar Atleta Menor de Edad".
- **Archivos a Modificar:**
  1. `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.html`
  2. `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.ts`
  3. `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.spec.ts`

---

## 6. Pruebas y Verificación
- **Backend:**
  - `./mvnw test -Dtest=VideoControllerTest`
  - Validar códigos de respuesta HTTP:
    - 201 Created cuando el tutor autenticado es el propietario del atleta.
    - 201 Created cuando el usuario autenticado tiene rol `ADMIN`.
    - 403 Forbidden cuando el tutor intenta subir un video para un atleta de otro tutor.
    - 404 Not Found cuando el `athleteId` no existe.
- **Frontend:**
  - `npm test -- --watch=false` en `talentus-scout-fe`
  - Verificación en navegador / DOM:
    - Botón "Subir Video" deshabilitado cuando `athletes.length === 0`.
    - Al tener 1 atleta, el botón abre directamente el modal asignado a ese atleta.
    - Al tener más de 1 atleta, abre el selector rápido para elegirlo.
    - Caja de estado vacío sin botón de demo.

---

## 7. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Backend: Inyectar `UserRepository` en `VideoService.java` y agregar validación de titularidad de tutor (`AccessDeniedException`) y rol `ADMIN`.
- [x] 2. Backend: Actualizar `VideoControllerTest.java` con casos de prueba para 403 Forbidden (tutor ajeno), 404 Not Found (atleta inexistente) y autorización para ADMIN.
- [x] 3. Backend: Compilar y ejecutar pruebas de backend con `./mvnw test -Dtest=VideoControllerTest`.
- [x] 4. Frontend: Actualizar `tutor-dashboard.component.html` para deshabilitar botón de header si no hay atletas, eliminar botón demo en estado vacío, y añadir modal selector de atletas.
- [x] 5. Frontend: Actualizar `tutor-dashboard.component.ts` con flujo `openQuickVideoUploader()`, eliminación de UUID demo y manejo del selector de atleta.
- [x] 6. Frontend: Añadir estilos CSS correspondientes para el botón deshabilitado y el modal selector en `tutor-dashboard.component.ts`.
- [x] 7. Frontend: Actualizar o agregar pruebas unitarias en `tutor-dashboard.component.spec.ts`.
- [x] 8. Verificación: Compilar frontend (`npm run build`).
- [x] 9. Documentar el Plan de Pruebas en `test/TS-29-test-plan-restriccion-subida-videos.md`.
- [x] 10. Mover la tarjeta en Trello a `in testing` y actualizar checkboxes de este plan.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Con 0 atletas, el botón "Subir Video" en el header se encuentra deshabilitado con estilos `not-allowed` y tooltip explicativo.
- [x] La caja de estado vacío no muestra ningún botón de demostración ni prueba de subida de video; únicamente el botón para registrar un atleta.
- [x] No existe ninguna referencia a UUID dummy (`00000000-0000-0000-0000-000000000001`) ni a "Atleta de Demostración".
- [x] Con 1 atleta registrado, el botón del header abre el modal de subida preasignado a ese atleta.
- [x] Con 2 o más atletas registrados, el botón del header despliega un selector para escoger a cuál atleta subir el video.
- [x] El backend (`VideoService`) valida que el atleta pertenezca al tutor autenticado (o rol `ADMIN`) antes de generar el ticket de carga, retornando 403 si pertenece a otro tutor o 404 si no existe.
- [x] Todas las pruebas automatizadas (`./mvnw test`, `npm run build`) pasan exitosamente sin errores.
