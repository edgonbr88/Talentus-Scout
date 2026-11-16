# Plan de Implementación: [TS-72] Registro y certificación de logros deportivos por scouts del mismo club

**ID Tarea:** TS-72  
**Tarjeta Trello:** https://trello.com/c/rlZf6XEf  
**Fecha:** 2026-11-15  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema:** Los scouts acreditados necesitan enriquecer y certificar el palmarés deportivo de los atletas que pertenecen a su misma organización o club deportivo (títulos de torneos, premios MVP/Goleador, convocatorias).
- **Impacto:** Fortalece la vitrina deportiva del atleta de forma inmediata bajo el respaldo oficial del club, mostrándose en las "Insignias de Confianza" de la ficha pública y en el CV PDF exportable.
- **Restricciones de seguridad y negocio:** Un scout solo puede certificar logros de atletas cuyo club actual coincida con su organización. Si pertenece a otro club o el atleta no tiene club, la petición debe ser rechazada con `403 Forbidden`.

## 2. Alcance Técnico y Arquitectura
- **Dependencias:** `TS-71` (completada).
- **Base de Datos:** Sin cambios DDL estructurales. Reutiliza la tabla `athlete_badges` con `badge_type = 'SPORT_ACHIEVEMENT'` y `status = 'APPROVED'`.
- **Backend (Spring Boot 3 / Java 21):**
  - `UserProfileResponse.java` y `AuthController.java`: Exponer `organizationName` en `/api/v1/auth/me` para usuarios `SCOUT`.
  - `CreateAthleteAchievementRequest.java`: Nuevo DTO con Lombok y Jakarta Validation (`title`, `category`, `achievementDate`, `description`).
  - `ScoutAchievementService.java`: Servicio con validación de rol/acreditación, validación de pertenencia al mismo club (`403 Forbidden` si difiere), persistencia de `AthleteBadge` (`SPORT_ACHIEVEMENT`, `APPROVED`, `verifiedAt = Instant.now()`), y retorno de `PublicBadgeDto`.
  - `ScoutProfileController.java`: Nuevo endpoint `POST /api/v1/scout/athletes/{athleteId}/achievements` (`@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN')")`).
  - `AthleteCvPdfService.java`: Actualizar `resolveBadgeTitle` para renderizar `verificationNotes` cuando `badgeType == SPORT_ACHIEVEMENT`.
  - Pruebas unitarias/integración (`ScoutAchievementServiceTest.java` / `ScoutProfileControllerAchievementTest.java`).
- **Frontend (Angular 18+):**
  - `user.model.ts`, `auth.model.ts`, `auth.service.ts`: Mapear `organizationName` del scout autenticado.
  - `scout-directory.service.ts` y `athlete.model.ts`: Método `createAthleteAchievement(athleteId, payload)` e interfaz `CreateAthleteAchievementRequest`.
  - `BentoProfileComponent` (`.ts`, `.html`, `.css`, `.spec.ts`):
    - Computed `canRegisterClubAchievement` (`isScout` aprobado o `ADMIN` y mismo club que el atleta).
    - Botón `+ Registrar Logro de Club` en la tarjeta `Insignias de Confianza`.
    - Modal ergonómico Bento (Título, Categoría, Fecha, Descripción) con validación y actualización reactiva de `athlete().badges`.

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- Migración DDL dbmate: `migrations/20261116120000_add_sport_achievement_to_badge_type_enum.sql`.
  - Agrega el valor `SPORT_ACHIEVEMENT` al tipo `ENUM badge_type` en PostgreSQL (`ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'SPORT_ACHIEVEMENT';`).
  - Permite la inserción en `athlete_badges` con `badge_type = 'SPORT_ACHIEVEMENT'` y `status = 'APPROVED'`.

## 4. Backend: Spring Boot 3 (Java 21)
- Paquete DTO: `com.talentus.scout.web.dto.CreateAthleteAchievementRequest` con `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
- Validaciones Jakarta:
  - `title`: `@NotBlank`, `@Size(max = 150)`
  - `category`: `@NotBlank`, `@Pattern(regexp = "^(TORNEO|INDIVIDUAL|CONVOCATORIA|OTRO)$")`
  - `achievementDate`: `@PastOrPresent`
  - `description`: `@Size(max = 500)`
- Endpoint: `POST /api/v1/scout/athletes/{athleteId}/achievements` retornando `201 Created` con `PublicBadgeDto`.
- Seguridad: `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN')")` + validación de scout aprobado (`ScoutSecurity.isVerifiedScout`) + comparación normalizada (`trim().equalsIgnoreCase`) de `scoutProfile.getOrganizationName()` contra `athlete.getCurrentClub().getName()` (si no coincide -> `AccessDeniedException` -> HTTP `403 Forbidden`).

## 5. Frontend: Angular 18+ (Standalone & SSR)
- Diseño siguiendo `fe-desing.md` (paleta `#0A0F1D`, `#141D30`, `#22314D`, `#10B981`, `#F59E0B`, foco accesible, sin plantillas inline).
- Plantillas HTML separadas en `.component.html` (`templateUrl`).

## 6. Pruebas y Verificación
- Backend: `./mvnw test` verificando éxito (mismo club -> 201 Created + badge `APPROVED`), rechazo por club distinto (`403 Forbidden`), y validación de DTO (`400 Bad Request`).
- Frontend: `npm run build` y `ng test` en `BentoProfileComponent`.

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Exponer `organizationName` en `UserProfileResponse` y `AuthController.getCurrentUser`.
- [x] Paso 2: Crear `CreateAthleteAchievementRequest` con Lombok y Jakarta Validation.
- [x] Paso 3: Crear `ScoutAchievementService` y exponer `POST /api/v1/scout/athletes/{athleteId}/achievements` en `ScoutProfileController`.
- [x] Paso 4: Actualizar `AthleteCvPdfService.resolveBadgeTitle` para `SPORT_ACHIEVEMENT`.
- [x] Paso 5: Crear pruebas backend para escenarios de éxito (mismo club) y rechazo (`403 Forbidden` club distinto).
- [x] Paso 6: Actualizar modelos frontend (`user.model.ts`, `auth.model.ts`, `auth.service.ts`, `athlete.model.ts`) y `ScoutDirectoryService.createAthleteAchievement`.
- [x] Paso 7: Implementar botón `+ Registrar Logro de Club` y modal Bento en `BentoProfileComponent` (`.ts`, `.html`, `.css`, `.spec.ts`).
- [x] Paso 8: Ejecutar `./mvnw test`, `npm run build` y `ng test`.

## 8. Criterios de Aceptación (DoD)
- [x] Un scout autenticado solo puede registrar logros para atletas cuyo `current_club` coincida con su organización.
- [x] Si un scout intenta registrar un logro en un atleta de otro club, el backend rechaza la petición con `403 Forbidden`.
- [x] El logro registrado se almacena como `athlete_badges` con tipo `SPORT_ACHIEVEMENT` y estado `APPROVED`.
- [x] El logro se visualiza de inmediato en la sección "Insignias de Confianza" de `/atleta/:slug` y en el CV PDF exportable.
- [x] Pruebas unitarias/integración en backend y frontend en verde, compilación limpia.
