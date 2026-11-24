# Plan de Pruebas: [TS-85] Red y Directorio de Networking entre Scouts

**ID Tarea:** TS-85  
**Tarjeta Trello:** https://trello.com/c/al6Jz2Cv  
**Fecha:** 2026-11-24  
**Plan de Implementación:** [TS-85-plan-red-networking-scouts.md](file:///home/edgar/Talentus%20Scout/plans/TS-85-plan-red-networking-scouts.md)

---

## 1. Alcance de Pruebas
- **Migraciones (`talentus-scout-migrations`):**
  - `migrations/20261124140000_add_scout_network_profile_and_contact_logs.sql` (nuevas columnas en `scout_profiles`, tabla `scout_network_contact_logs`, 3 índices).
- **Backend (`talentus-scout-be`):**
  - `ScoutProfile`, `ScoutNetworkContactLog`, `ScoutContactChannel`.
  - `ScoutProfileRepository`, `ScoutNetworkContactLogRepository`, `ScoutProfileSpecifications`.
  - `ScoutNetworkService`, `ScoutNetworkController` (`/api/v1/scouts/network`, `/filters`, `/{scoutProfileId}/contact`).
  - `ScoutProfileService`, `ScoutProfileController` (`/api/v1/scout/profile/network-settings`, `/photo`).
- **Frontend (`talentus-scout-fe`):**
  - `scout-network.model.ts`, `scout-network.service.ts`.
  - `ScoutNetworkComponent` (`/scout/network`), enlace en `NavbarComponent` y acceso directo en `ScoutDirectoryComponent`.

---

## 2. Pruebas Automatizadas Ejecutadas
### Migraciones (Local PostgreSQL únicamente — nunca Neon)
- **Comando:** `dbmate up && dbmate down && dbmate up` contra `localhost:5432/talentus_scout_dev`.
- **Resultado:** **PASS** (aplicación, rollback y re-aplicación sin errores).

### Backend
- **Comando:**
  ```bash
  cd talentus-scout-be && ./mvnw test -Dtest=ScoutNetworkControllerIntegrationTest,ScoutDirectorySecurityTest,ScoutDirectoryIntegrationTest
  ```
- **Resultado:** `Tests run: 29, Failures: 0, Errors: 0, Skipped: 0` (**PASS** — 5 tests en `ScoutNetworkControllerIntegrationTest`, 4 en `ScoutDirectorySecurityTest`, 20 en `ScoutDirectoryIntegrationTest`).

### Frontend
- **Comando:**
  ```bash
  cd talentus-scout-fe && npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/features/scout-network/scout-network.component.spec.ts" --include="src/app/features/scout-directory/scout-directory.component.spec.ts" && npm run build
  ```
- **Resultado:** `TOTAL: 22 SUCCESS` (**PASS** — 4 tests en `scout-network.component.spec.ts` + 18 tests en `scout-directory.component.spec.ts`) y `npm run build` (browser + SSR) exitoso.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Verificación API REST (`cURL`)
1. **Listado de la Red de Scouts:**
   ```bash
   curl -s -H "Authorization: Bearer <SCOUT_JWT>" \
     "http://localhost:8080/api/v1/scouts/network?sameClubOnly=true&page=0&size=12"
   ```
   - **Esperado:** `200 OK`, únicamente scouts `APPROVED` + `ACTIVE` + `showInNetwork = true`, sin `selfieUrl`, `idDocumentNumber`, `phoneNumber` ni `email`.

2. **Contacto auditado (WhatsApp / Correo):**
   ```bash
   curl -s -X POST -H "Authorization: Bearer <SCOUT_JWT>" -H "Content-Type: application/json" \
     -d '{"channel":"WHATSAPP"}' \
     "http://localhost:8080/api/v1/scouts/network/<TARGET_SCOUT_PROFILE_ID>/contact"
   ```
   - **Esperado:** `200 OK` con `contactUrl: "https://wa.me/..."` y fila insertada en `scout_network_contact_logs` (o `403` si el colega ocultó ese canal).

3. **Foto pública y privacidad:**
   ```bash
   curl -s -X PUT -H "Authorization: Bearer <SCOUT_JWT>" -H "Content-Type: application/json" \
     -d '{"showInNetwork":true,"showWhatsappInNetwork":true,"showEmailInNetwork":false}' \
     "http://localhost:8080/api/v1/scout/profile/network-settings"
   ```

### 3.2. Verificación UI en Angular
1. Iniciar sesión como `SCOUT` aprobado (o `ADMIN`) y acceder desde el Navbar **Red de Scouts** o desde el botón rápido en `/scout/directory`.
2. Probar buscador de texto (debounce 350ms + Enter), filtros por Club/Organización, País y chip **Colegas de mi mismo club**.
3. Probar botones **WhatsApp** y **Correo** en una tarjeta y verificar que se muestra `"Canal oculto por privacidad"` cuando ambos están deshabilitados.
4. Como `SCOUT`, abrir **Mi Perfil y Privacidad**, subir/eliminar foto pública y guardar los toggles de visibilidad.

---

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] Migración SQL validada con `dbmate up` y `dbmate down` en PostgreSQL local (sin tocar Neon).
- [x] `GET /api/v1/scouts/network` filtra `APPROVED`, `ACTIVE` y `show_in_network = true`, sin exponer KYC ni teléfonos/correos crudos.
- [x] Filtros y facetas (`/filters`) funcionales con paginación.
- [x] `POST /api/v1/scouts/network/{id}/contact` valida privacidad, audita en `scout_network_contact_logs` y retorna `wa.me` o `mailto:`.
- [x] Gestión de foto pública (`photos/scouts`) y switches de privacidad en `/api/v1/scout/profile/*` y UI `/scout/network`.
- [x] Seguridad por roles (`403` para `TUTOR`, `ATHLETE` y `SCOUT` no aprobado; acceso para `ADMIN` y `SCOUT` aprobado).

---

## 5. Casos Borde y Validaciones Críticas
- **Aislamiento KYC:** `ScoutNetworkItemResponse` omite completamente `selfieUrl`, `idDocumentUrl`, `idDocumentNumber` y `credentialsDocumentUrl`.
- **Bucket público R2:** `photos/scouts` no coincide con `isPrivateSubDirectory(...)` en `R2FileStorageService`, por lo que se almacena en el bucket público CDN.
- **Auto-contacto:** `POST /api/v1/scouts/network/{ownId}/contact` responde `400 Bad Request`.
