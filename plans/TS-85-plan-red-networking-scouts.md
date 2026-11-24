# Plan de Implementación: [TS-85] Red y Directorio de Networking entre Scouts (Colegas, Filtros, Foto Pública y Contacto Seguro)

**ID Tarea:** TS-85  
**Tarjeta Trello:** https://trello.com/c/al6Jz2Cv  
**Fecha:** 2026-11-24  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Los scouts y reclutadores aprobados en Talentus Scout requieren un directorio profesional (**Red de Scouts**) para localizar y contactar a otros colegas acreditados, coordinar referencias de futbolistas y fortalecer alianzas de reclutamiento nacional e internacional.
- **Protección de Datos, KYC y LOPNNA:**
  - Acceso exclusivo para `SCOUT` en estado `APPROVED` (`AccountStatus.ACTIVE`) y `ADMIN` (`@scoutSecurity.isVerifiedScout`). Bloquea anónimos, `TUTOR`, `ATHLETE` y scouts `PENDING`/`REJECTED`.
  - **Aislamiento KYC:** Nunca se exponen `selfie_url`, `id_document_url`, `id_document_number` ni `credentials_document_url`. Se usa el campo público opcional `profile_photo_url`.
  - **Privacidad configurable:** Toggles individuales `show_in_network`, `show_whatsapp_in_network` y `show_email_in_network` (activos por defecto).
  - **Anti-scraping:** El listado paginado nunca devuelve `phoneNumber` ni `email` crudos; los enlaces `wa.me` y `mailto:` se generan bajo demanda mediante `POST /api/v1/scouts/network/{scoutProfileId}/contact` registrando trazabilidad inmutable en `scout_network_contact_logs`.

---

## 2. Alcance Técnico y Arquitectura
- **Repositorios afectados:**
  1. `talentus-scout-migrations`: Nueva migración `dbmate` (validada exclusivamente en PostgreSQL local, nunca en Neon).
  2. `talentus-scout-be`: Entidades (`ScoutProfile`, `ScoutNetworkContactLog`, enum `ScoutContactChannel`), repositorios (`ScoutProfileRepository` con `JpaSpecificationExecutor`, `ScoutNetworkContactLogRepository`), `ScoutProfileSpecifications`, servicios (`ScoutNetworkService`, `ScoutProfileService`), controladores (`ScoutNetworkController`, `ScoutProfileController`) y suite de pruebas de integración y seguridad.
  3. `talentus-scout-fe`: Ruta `/scout/network` (`[authGuard, scoutGuard]`), enlace en `NavbarComponent`, acceso rápido en `ScoutDirectoryComponent`, modelos/servicio (`scout-network.model.ts`, `scout-network.service.ts`), componente `ScoutNetworkComponent` (`.ts`, `.html`, `.css` siguiendo `fe-desing.md`) y pruebas unitarias.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL Local-First)
- **Archivo (`talentus-scout-migrations/migrations/20261124140000_add_scout_network_profile_and_contact_logs.sql`):**
  ```sql
  -- migrate:up
  ALTER TABLE public.scout_profiles
      ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS show_in_network BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS show_whatsapp_in_network BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS show_email_in_network BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

  CREATE TABLE IF NOT EXISTS public.scout_network_contact_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      target_scout_profile_id UUID NOT NULL REFERENCES public.scout_profiles(id) ON DELETE CASCADE,
      channel VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_scout_profiles_network_visible
      ON public.scout_profiles (verification_status, show_in_network, organization_name);

  CREATE INDEX IF NOT EXISTS idx_scout_network_contact_logs_requester
      ON public.scout_network_contact_logs (requester_user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_scout_network_contact_logs_target
      ON public.scout_network_contact_logs (target_scout_profile_id, created_at DESC);

  -- migrate:down
  DROP INDEX IF EXISTS public.idx_scout_network_contact_logs_target;
  DROP INDEX IF EXISTS public.idx_scout_network_contact_logs_requester;
  DROP INDEX IF EXISTS public.idx_scout_profiles_network_visible;
  DROP TABLE IF EXISTS public.scout_network_contact_logs;
  ALTER TABLE public.scout_profiles
      DROP COLUMN IF EXISTS updated_at,
      DROP COLUMN IF EXISTS show_email_in_network,
      DROP COLUMN IF EXISTS show_whatsapp_in_network,
      DROP COLUMN IF EXISTS show_in_network,
      DROP COLUMN IF EXISTS profile_photo_url;
  ```

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Directiva Lombok:** Todas las entidades y DTOs con `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`.
- **Entidades y Enum:**
  - `domain/enums/ScoutContactChannel.java`: `WHATSAPP`, `EMAIL`.
  - `domain/entity/ScoutProfile.java`: añadir `profilePhotoUrl`, `showInNetwork = true`, `showWhatsappInNetwork = true`, `showEmailInNetwork = true`, `updatedAt` (con `@PrePersist` / `@PreUpdate`).
  - `domain/entity/ScoutNetworkContactLog.java`.
- **Repositorios y Especificaciones:**
  - `repository/ScoutProfileRepository.java`: extender `JpaSpecificationExecutor<ScoutProfile>`.
  - `repository/ScoutNetworkContactLogRepository.java`.
  - `specification/ScoutProfileSpecifications.java`: filtros obligatorios (`APPROVED`, `ACTIVE`, `deletedAt IS NULL`, `showInNetwork = true`) + opcionales (`query`, `organizationName`, `country`, `excludeUserId`).
- **DTOs (`web/dto/scoutnetwork/`):**
  - `ScoutNetworkItemResponse` (sin `phoneNumber`, sin `email`, sin campos KYC).
  - `ScoutNetworkOrganizationOption`, `ScoutNetworkFiltersResponse`.
  - `ScoutNetworkContactRequest` (`@NotNull ScoutContactChannel channel`), `ScoutNetworkContactResponse`.
  - `ScoutNetworkSettingsResponse`, `UpdateScoutNetworkSettingsRequest`, `ScoutPhotoResponse`.
- **Servicios y Controladores:**
  - `service/ScoutNetworkService.java` y `web/controller/ScoutNetworkController.java` (`/api/v1/scouts/network`, `/filters`, `/{scoutProfileId}/contact`) protegidos con `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`.
  - `service/ScoutProfileService.java` y `web/controller/ScoutProfileController.java` (`/api/v1/scout/profile/network-settings`, `/photo`) protegidos con `@PreAuthorize("hasRole('SCOUT') and @scoutSecurity.isVerifiedScout(authentication)")`.
    - Foto pública: valida extensión/MIME (`PNG`, `JPG`, `JPEG`, `WEBP`), máximo `5MB`, borra foto anterior, almacena en `photos/scouts` (bucket público CDN en R2).

---

## 5. Frontend: Angular 18+ (Standalone & SSR)
- **Directiva de Diseño:** Seguir [fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md) (`frontend-design`) y separación estricta `.ts` / `.html` (`templateUrl`) / `.css`.
- **Rutas y Navegación:**
  - `app.routes.ts`: ruta lazy `/scout/network` con `[authGuard, scoutGuard]`.
  - `navbar.component.html`: enlace `Red de Scouts` bajo `@if (authService.canAccessDirectory())`.
  - `scout-directory.component.html`: botón de acceso rápido `Red de Scouts` en `.header-actions-group`.
- **Modelos y Servicio:**
  - `core/models/scout-network.model.ts`
  - `core/services/scout-network.service.ts`
- **Componente `ScoutNetworkComponent` (`features/scout-network/`):**
  - Cabecera con contador de colegas visibles y botón `"Mi Perfil y Privacidad"` (solo rol `SCOUT`).
  - Filtros: buscador con debounce (350ms) + Enter, selector de Club/Organización, selector de País, chip rápido `"Colegas de mi mismo club"` y botón reiniciar filtros.
  - Grilla Bento de tarjetas de colegas con foto pública o avatar de iniciales + logo del club, distintivo `"Tu mismo club"`, país/estado, enlace seguro a LinkedIn, botones **WhatsApp** y **Correo** (con estado de carga por tarjeta o indicador `"Canal oculto por privacidad"`).
  - Modal **"Mi Perfil y Privacidad en la Red"** (solo `SCOUT`) para subir/eliminar foto pública, switches de visibilidad y edición de país/estado/LinkedIn.

---

## 6. Pruebas y Verificación
- **Migrations:** `dbmate up`, `dbmate down`, `dbmate up` en PostgreSQL local (`talentus-postgres-dev`).
- **Backend:** `ScoutNetworkControllerIntegrationTest` y `ScoutProfileControllerIntegrationTest` (`./mvnw test`).
- **Frontend:** `scout-network.component.spec.ts` y `scout-directory.component.spec.ts` (`ng test` y `npm run build`).

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear y validar migración `dbmate` en `talentus-scout-migrations` (exclusivamente en PostgreSQL local).
- [x] Paso 2: Implementar entidades, enum, repositorios, especificaciones y DTOs en `talentus-scout-be`.
- [x] Paso 3: Implementar `ScoutNetworkService`, `ScoutNetworkController`, `ScoutProfileService` y `ScoutProfileController`.
- [x] Paso 4: Crear y ejecutar pruebas de integración en backend (`./mvnw test`).
- [x] Paso 5: Implementar modelos, servicio, rutas, navegación y `ScoutNetworkComponent` (`.ts`, `.html`, `.css`) en `talentus-scout-fe`.
- [x] Paso 6: Crear y ejecutar pruebas unitarias (`ng test`) y compilación SSR/browser (`npm run build`) en frontend.
- [x] Paso 7: Documentar plan de pruebas en `test/TS-85-test-plan-red-networking-scouts.md`, actualizar checklist, crear PRs en los 3 submódulos, pushear docs en `main` y mover tarjeta Trello a `in testing`.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] Migración SQL aplicada y revertida limpiamente en PostgreSQL local (sin tocar Neon).
- [x] `GET /api/v1/scouts/network` filtra `APPROVED`, `ACTIVE` y `show_in_network = true`, sin exponer KYC ni teléfonos/correos crudos.
- [x] Filtros y facetas (`/filters`) funcionales con paginación.
- [x] `POST /api/v1/scouts/network/{id}/contact` valida privacidad, audita en `scout_network_contact_logs` y retorna `wa.me` o `mailto:`.
- [x] Gestión de foto pública (`photos/scouts`) y switches de privacidad en `/api/v1/scout/profile/*` y UI `/scout/network`.
- [x] Seguridad por roles (`403` para `TUTOR`, `ATHLETE` y `SCOUT` no aprobado; acceso para `ADMIN` y `SCOUT` aprobado).
- [x] Pruebas y compilación en verde en Backend y Frontend.
