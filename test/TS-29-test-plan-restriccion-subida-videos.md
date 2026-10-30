# Plan de Pruebas: [TS-29] Restricción de Subida de Videos: Deshabilitación sin Atletas, Selector Rápido y Eliminación de Carga Demo

**ID Tarea:** TS-29  
**Tarjeta Trello:** https://trello.com/c/2yNej4fp  
**Fecha:** 2026-10-13  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es certificar que las subidas de material audiovisual estén rigurosamente restringidas y protegidas tanto a nivel de Frontend como de Backend, asegurando el cumplimiento estricto del Art. 65 de la LOPNNA (custodia de imagen y honor de menores de edad) y salvaguardas FIFA:
1. Impedir la existencia de clips de video o tickets de subida huérfanos sin atleta asignado.
2. Eliminar toda referencia residual o mocks de demostración en producción (`00000000-0000-0000-0000-000000000001`).
3. Forzar la verificación de titularidad del tutor en el backend (`VideoService`) ante solicitudes de upload tickets.
4. Deshabilitar el botón de subida en la interfaz cuando el tutor no posee atletas registrados.
5. Permitir selección rápida mediante modal Bento cuando el tutor gestiona múltiples atletas representados.

### Componentes Impactados
* **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  * `com.talentus.scout.service.VideoService`: Inyección de `UserRepository` y validación de titularidad (`athlete.getTutor().getId().equals(currentUser.getId())`) y excepción para rol `ADMIN`.
  * `com.talentus.scout.web.controller.VideoControllerTest`: Casos de prueba para validación de permisos 403 Forbidden, 404 Not Found y 201 Created para administradores y tutores legítimos.
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `tutor-dashboard.component.html`: Botón "Subir Video" en header con directiva `[disabled]="athletes.length === 0"`, eliminación del botón de demo en `empty-state-box`, y modal accesible selector de atletas para tutores con múltiples representados.
  * `tutor-dashboard.component.ts`: Métodos `openQuickVideoUploader()`, `selectAthleteForVideo()`, `closeAthleteSelectorModal()` y estilos de microinteracción.
  * `tutor-dashboard.component.spec.ts`: Suite de pruebas unitarias automatizadas con Jasmine y Karma / ChromeHeadless.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=VideoControllerTest
```

#### Resultados de Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `VideoControllerTest` | 7 | 7 | 0 | **PASSED** |

#### Casos Específicos Verificados:
1. `shouldRequestUploadTicketSuccessfully`: Tutor legítimo genera ticket 201 Created para su propio atleta.
2. `shouldRejectUploadTicketWhenAthleteBelongsToAnotherTutor`: Petición de subida de video por parte de un tutor ajeno es rechazada con `403 Forbidden` (`{"error":"FORBIDDEN","message":"No tienes autorización para cargar videos de este atleta."}`).
3. `shouldRejectUploadTicketWhenAthleteNotFound`: Petición con identificador UUID inexistente retorna `404 Not Found`.
4. `shouldAllowUploadTicketWhenUserIsAdmin`: Usuario con rol `ADMIN` puede generar tickets de subida para cualquier atleta legítimo (201 Created).
5. `shouldPerformMockUploadAndMarkVideoReady`: Subida de archivo mock procesa video y marca estado `READY`.
6. `shouldHandleWebhookPubliclyAndUpdateVideo`: Webhook de proveedor de streaming actualiza metadatos y duración.
7. `shouldGetVideosByAthletePublicly`: Consulta pública de videos por atleta retorna lista ordenada.

---

### 2.2. Frontend (Angular 18+ / Jasmine & Karma)
Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

#### Resultados de Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| Total Suites Frontend (`talentus-scout-fe`) | 39 | 39 | 0 | **100% SUCCESS** |
| `TutorDashboardComponent - TS-29` | 5 | 5 | 0 | **PASSED** |

#### Casos de Prueba Verificados en `tutor-dashboard.component.spec.ts`:
1. `should disable the header upload button and not open modals when tutor has 0 athletes`: Con 0 atletas, el botón del header está deshabilitado (`disabled = true`), con atributo de accesibilidad `title="Debes registrar al menos un atleta antes de subir videos"` y `openQuickVideoUploader()` no abre modales ni asigna IDs.
2. `should not contain any demo upload button in the empty state box`: La caja de estado vacío no contiene botones con texto demo o prueba; únicamente conserva el botón para registrar atleta menor de edad.
3. `should directly open the video uploader modal for the single athlete when tutor has 1 athlete`: Con 1 atleta, el botón del header está habilitado y abre inmediatamente el modal de carga preasignando el ID y nombre del atleta.
4. `should open the quick athlete selector modal when tutor has more than 1 athlete`: Con 2 o más atletas, abre el modal selector rápido con opciones para cada atleta, y al seleccionar uno abre el cargador con los datos correspondientes.
5. `should close the athlete selector modal when closeAthleteSelectorModal is invoked`: Cierra el modal de selección al interactuar con el botón de cierre.

---

### 2.3. Verificación de Compilación y Bundles Frontend
Comando ejecutado:
```bash
npm run build
```
Resultado:
- Generación de bundles de navegador y servidor completada en 20.191 segundos.
- 11 rutas estáticas prerenderizadas correctamente.
- 0 errores de compilación TypeScript / HTML.

---

## 3. Guía de Pruebas Manuales (cURL / Verificación Paso a Paso)

### 3.1. Rechazo 403 Forbidden cuando el Tutor no es el propietario del Atleta
```bash
curl -i -X POST http://localhost:8080/api/v1/videos/request-upload \
  -H "Authorization: Bearer <TOKEN_TUTOR_B>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<UUID_ATLETA_DE_TUTOR_A>",
    "title": "Intento de subida no autorizado",
    "category": "HIGHLIGHTS"
  }'
```
**Respuesta Esperada:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "FORBIDDEN",
  "message": "No tienes autorización para cargar videos de este atleta.",
  "timestamp": "2026-10-13T15:27:00Z"
}
```

### 3.2. Rechazo 404 Not Found ante Atleta Inexistente
```bash
curl -i -X POST http://localhost:8080/api/v1/videos/request-upload \
  -H "Authorization: Bearer <TOKEN_TUTOR_A>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "99999999-9999-9999-9999-999999999999",
    "title": "Atleta que no existe",
    "category": "HIGHLIGHTS"
  }'
```
**Respuesta Esperada:**
```http
HTTP/1.1 404 Not Found
```

### 3.3. Autorización Exitosa para Tutor Legítimo
```bash
curl -i -X POST http://localhost:8080/api/v1/videos/request-upload \
  -H "Authorization: Bearer <TOKEN_TUTOR_A>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "<UUID_ATLETA_DE_TUTOR_A>",
    "title": "Gol de tiro libre en torneo estadal",
    "category": "GOLES"
  }'
```
**Respuesta Esperada:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "videoId": "<UUID_VIDEO>",
  "directUploadUrl": "http://localhost:8080/api/v1/videos/mock-upload/<UUID_VIDEO>",
  "providerVideoId": "mock-...",
  "maxSizeBytes": 524288000
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
|---|---|---|
| Botón "Subir Video" en header deshabilitado cuando tutor tiene 0 atletas | **VERIFICADO** | `[disabled]="athletes.length === 0"`, cursor `not-allowed`, tooltip informativo, validado en test unitario. |
| Caja de estado vacío no contiene botones de prueba/demo | **VERIFICADO** | Eliminado botón de demo; únicamente presente botón para registrar atleta menor de edad. |
| Eliminación total del dummy UUID `00000000-0000-0000-0000-000000000001` y texto "Atleta de Demostración" | **VERIFICADO** | Búsqueda exhaustiva en proyecto arrojó 0 ocurrencias en código fuente frontend/backend. |
| Con 1 atleta registrado, el botón abre directamente el modal asignado a ese atleta | **VERIFICADO** | Método `openQuickVideoUploader()` evalúa `athletes.length === 1` e invoca `openVideoUploaderForAthlete(athletes[0])`. |
| Con 2 o más atletas registrados, el botón despliega un selector rápido para elegir atleta | **VERIFICADO** | Componente despliega `showAthleteSelectorModal = true` con Bento Dialog de selección rápida. |
| Backend valida titularidad del tutor autenticado (o rol ADMIN) antes de generar ticket de subida | **VERIFICADO** | `VideoService.java` valida pertenencia y lanza `AccessDeniedException` (403 Forbidden) si no coincide el tutor. |
| Pruebas automatizadas en backend y frontend pasan 100% en verde | **VERIFICADO** | Backend: 7/7 tests aprobados. Frontend: 39/39 tests aprobados. `npm run build` sin errores. |

---

## 5. Salvaguardas Legales y Consideraciones de Seguridad (LOPNNA Art. 65 / FIFA)
* **Principio de Trazabilidad:** Todo archivo o ticket de subida queda indisolublemente vinculado al ID de un atleta real cuya tutela legal corresponde al usuario autenticado.
* **Sin filtración de huérfanos:** No es posible forzar peticiones REST para crear registros de video desconectados de un menor debidamente registrado en el sistema.
* **UX Protectora:** La interfaz orienta al tutor hacia el registro y consentimiento legal previo antes de permitir cualquier interacción con medios audiovisuales.
