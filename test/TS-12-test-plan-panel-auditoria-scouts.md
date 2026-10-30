# Plan de Pruebas y Reporte de Validación: [TS-12] Panel de Auditoría y Aprobación de Scouts para Administradores

**ID Tarea:** TS-12  
**Título Trello:** `[TS-12] Panel de Auditoría y Aprobación de Scouts para Administradores`  
**Tarjeta Trello:** [https://trello.com/c/VXpBeI6X](https://trello.com/c/VXpBeI6X) (ID: `6abbe1fa0ebb368bf92f3f04`)  
**Sprint:** Sprint 3 — Directorio de Scouts Acreditados y Contacto Seguro WhatsApp  
**Fecha de Ejecución:** 7 de octubre de 2026  
**Agente Ejecutor:** `trello_implementer`  
**Estado:** VALIDADO SATISFACTORIAMENTE (LISTO PARA TESTING / QA)  

---

## 1. Alcance de las Pruebas

El objetivo de esta suite de pruebas es validar el flujo integral de auditoría administrativa y acreditación de reclutadores deportivos (scouts):
1. **Control de Acceso y Seguridad de Rol:** Restricción absoluta de los endpoints administrativos `GET /api/v1/admin/scouts/pending` y `POST /api/v1/admin/scouts/{scoutProfileId}/review` exclusivamente a usuarios con rol `ADMIN`.
2. **Cola Paginada de Scouts Pendientes:** Extracción ordenada y paginada de reclutadores en estado `PENDING`, exponiendo los datos de su perfil, organización, rol y el enlace directo al documento probatorio (`credentialsDocumentUrl`).
3. **Flujo de Aprobación en 1 Clic (`APPROVE`):** Transición atómica de `ScoutProfile.verificationStatus` a `APPROVED`, activación de la cuenta `User.status` a `ACTIVE`, registro del identificador del administrador auditor y fecha de auditoría, eliminando cualquier causa de rechazo previa.
4. **Flujo de Rechazo Motivado (`REJECT`):** Transición de `ScoutProfile.verificationStatus` a `REJECTED`, persistencia obligatoria del motivo en `rejectionReason`, manteniendo la cuenta en `PENDING_VERIFICATION` para que el scout pueda autenticarse y consultar en `/api/v1/auth/me` la justificación técnica del rechazo.
5. **Panel de Gestión Angular (Frontend):** Interfaz basada en Bento Grid conforme a `fe-desing.md`, con métricas operativas en tiempo real, visor de credenciales, botones reactivos de aprobación instantánea y modal de rechazo con justificación obligatoria. Protección de la ruta `/admin/scouts` mediante `adminGuard`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend: Suite de Pruebas JUnit 5 & Spring Boot Test
Comandos ejecutados:
```bash
./mvnw test -Dtest=AdminScoutWorkflowTest
./mvnw test
```
**Resultado General Backend:** `Tests run: 54, Failures: 0, Errors: 0, Skipped: 0` (**BUILD SUCCESS**)

#### Detalle de Casos de Prueba en `AdminScoutWorkflowTest`:
1. `getPendingScouts_AsAdmin_Returns200AndPendingList`:
   - Valida que un usuario autenticado con rol `ADMIN` recibe `200 OK` y una lista paginada (`Page<PendingScoutResponse>`) con los scouts pendientes y sus credenciales adjuntas.
2. `getPendingScouts_AsScout_Returns403Forbidden`:
   - Valida que un usuario con rol `SCOUT` recibe `403 Forbidden` al intentar consultar la cola administrativa.
3. `getPendingScouts_Unauthenticated_ReturnsForbiddenOrUnauthorized`:
   - Valida que peticiones sin cabecera `Authorization` son rechazadas por Spring Security.
4. `reviewScout_ApproveDecision_UpdatesStatusToApprovedAndUserToActive`:
   - Valida la decisión `APPROVE`:
     - Retorna `200 OK` con DTO `ScoutReviewResponse`.
     - `ScoutProfile.verificationStatus == APPROVED`.
     - `User.status == ACTIVE`.
     - Trazabilidad de auditoría: `reviewedByAdmin` asignado al usuario administrador y `reviewedAt` persistido.
5. `reviewScout_RejectDecisionWithReason_UpdatesStatusToRejectedAndKeepsUserPending`:
   - Valida la decisión `REJECT`:
     - Retorna `200 OK`.
     - `ScoutProfile.verificationStatus == REJECTED`.
     - `ScoutProfile.rejectionReason` coincide con el texto enviado.
     - `User.status == PENDING_VERIFICATION`.
     - Consulta subsiguiente a `GET /api/v1/auth/me` por parte del scout retorna el estado `REJECTED` y la razón exacta del rechazo.
6. `reviewScout_RejectDecisionWithoutReason_Returns400BadRequest`:
   - Valida que rechazar sin proporcionar una justificación es bloqueado con `400 Bad Request`.
7. `reviewScout_NonExistentProfile_Returns404NotFound`:
   - Valida que intentar auditar un perfil inexistente devuelve `404 Not Found`.

---

### 2.2. Frontend: Suite de Pruebas Jasmine & Karma (ChromeHeadless)
Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```
**Resultado General Frontend:** `TOTAL: 19 SUCCESS` (100% pruebas unitarias superadas)

#### Casos de Prueba Específicos de `admin.guard.spec.ts`:
1. `adminGuard -> debe permitir acceso cuando el usuario está autenticado y tiene rol ADMIN`: Superado (permite navegación a `/admin/scouts`).
2. `adminGuard -> debe redirigir a /login cuando el usuario no está autenticado`: Superado.
3. `adminGuard -> debe redirigir a /dashboard cuando el usuario está autenticado pero no es ADMIN`: Superado.

---

### 2.3. Frontend: Compilación y Build Producción
Comando ejecutado:
```bash
npm run build
```
**Resultado:** `Application bundle generation complete` (Salida: `dist/talentus-scout-fe` tanto en bundle de navegador como SSR de servidor `main.server.mjs`).

---

## 3. Guía de Verificación Manual (cURL Reproducibles)

### 3.1. Listar Scouts Pendientes de Auditoría (Admin)
```bash
curl -X GET "http://localhost:8080/api/v1/admin/scouts/pending?page=0&size=10" \
  -H "Authorization: Bearer <TOKEN_JWT_ADMIN>" \
  -H "Accept: application/json"
```
**Respuesta esperada (`200 OK`):**
```json
{
  "content": [
    {
      "scoutProfileId": "7b049d5a-4933-4f9e-a0e2-66ffcb015243",
      "userId": "1b6375bc-ee7a-4293-8a39-ecbd69165d44",
      "fullName": "Carlos Reclutador",
      "email": "scout@clubdeportivo.com",
      "phoneNumber": "+584121234567",
      "organizationName": "Academia Rayo Vallecano",
      "scoutRole": "Reclutador Oficial",
      "credentialsDocumentUrl": "/uploads/credentials/cred-7b049d5a.pdf",
      "linkedinUrl": "https://linkedin.com/in/carlos-scout",
      "verificationStatus": "PENDING",
      "createdAt": "2026-10-07T12:00:00Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

---

### 3.2. Aprobar Acreditación en 1 Clic
```bash
curl -X POST "http://localhost:8080/api/v1/admin/scouts/7b049d5a-4933-4f9e-a0e2-66ffcb015243/review" \
  -H "Authorization: Bearer <TOKEN_JWT_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "APPROVE"
  }'
```
**Respuesta esperada (`200 OK`):**
```json
{
  "scoutProfileId": "7b049d5a-4933-4f9e-a0e2-66ffcb015243",
  "userId": "1b6375bc-ee7a-4293-8a39-ecbd69165d44",
  "fullName": "Carlos Reclutador",
  "verificationStatus": "APPROVED",
  "accountStatus": "ACTIVE",
  "reviewedByAdminId": "c4d1668e-e2c7-43f1-b94a-810a0eb47d08",
  "reviewedByAdminName": "Administrador General",
  "reviewedAt": "2026-10-07T13:45:00Z",
  "rejectionReason": null,
  "message": "Reclutador aprobado exitosamente y habilitado para búsqueda de talentos."
}
```

---

### 3.3. Rechazar Solicitud con Justificación
```bash
curl -X POST "http://localhost:8080/api/v1/admin/scouts/7b049d5a-4933-4f9e-a0e2-66ffcb015243/review" \
  -H "Authorization: Bearer <TOKEN_JWT_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "REJECT",
    "rejectionReason": "La credencial adjunta no contiene sello de acreditación federativa legible."
  }'
```
**Respuesta esperada (`200 OK`):**
```json
{
  "scoutProfileId": "7b049d5a-4933-4f9e-a0e2-66ffcb015243",
  "userId": "1b6375bc-ee7a-4293-8a39-ecbd69165d44",
  "fullName": "Carlos Reclutador",
  "verificationStatus": "REJECTED",
  "accountStatus": "PENDING_VERIFICATION",
  "reviewedByAdminId": "c4d1668e-e2c7-43f1-b94a-810a0eb47d08",
  "reviewedByAdminName": "Administrador General",
  "reviewedAt": "2026-10-07T13:45:00Z",
  "rejectionReason": "La credencial adjunta no contiene sello de acreditación federativa legible.",
  "message": "Solicitud de reclutador rechazada con motivo documentado."
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Detalle de Cumplimiento |
| :--- | :---: | :--- |
| **Endpoint Paginado de Pendientes** | **CUMPLIDO** | `GET /api/v1/admin/scouts/pending` retorna `Page<PendingScoutResponse>` con URL de credenciales. |
| **Endpoint Atómico de Revisión** | **CUMPLIDO** | `POST /api/v1/admin/scouts/{id}/review` actualiza atómicamente `scout_profiles` y `users`. |
| **Aprobación en 1 Clic** | **CUMPLIDO** | Activa cuenta a `ACTIVE` y estatus a `APPROVED` inmediatamente. |
| **Rechazo Motivado** | **CUMPLIDO** | Almacena `rejection_reason` y mantiene acceso a `/me` con estado `REJECTED`. |
| **Control de Acceso RBAC (ROLE_ADMIN)** | **CUMPLIDO** | Bloqueo con `403 Forbidden` a scouts, tutores y usuarios no administradores. |
| **Panel Angular Intencional (Bento Grid)** | **CUMPLIDO** | `AdminScoutsComponent` con métricas, tarjetas Bento, visor de documentos y modal de rechazo. |
| **Protección de Rutas Frontend** | **CUMPLIDO** | `adminGuard` restringe acceso a `/admin/scouts` exclusivamente a administradores. |
| **Pruebas Automatizadas 100% Verdes** | **CUMPLIDO** | 54/54 tests backend y 19/19 tests frontend en verde. Cero regresiones. |
| **Compilación Limpia** | **CUMPLIDO** | Build de Angular superado con éxito. |

---

## 5. Consideraciones de Seguridad y Salvaguarda (LOPNNA Art. 65)

* **Prevención de Suplantación:** Solo administradores pueden dictaminar una aprobación. Al ser aprobados, el reclutador pasa a `APPROVED`, condición obligatoria evaluada por `@scoutSecurity.isVerifiedScout` (implementado en TS-11) para permitir el acceso al directorio de atletas en TS-13.
* **Trazabilidad:** Cada acción de auditoría registra de forma inmutable el ID del administrador evaluador (`reviewed_by_admin_id`) y la marca temporal exacta (`reviewed_at`).
