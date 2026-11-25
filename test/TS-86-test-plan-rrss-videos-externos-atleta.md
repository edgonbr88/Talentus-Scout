# Plan de Pruebas — [TS-86] Sección de RRSS y Plataformas de Video Externo en Ficha de Atleta

* **ID de Tarea:** `TS-86`
* **Tarjeta Trello:** [https://trello.com/c/e6SHBBr8](https://trello.com/c/e6SHBBr8)
* **Plan de Implementación:** [TS-86-plan-rrss-videos-externos-atleta.md](file:///home/edgar/Talentus%20Scout/plans/TS-86-plan-rrss-videos-externos-atleta.md)
* **Fecha de Validación:** 2026-11-25

---

## 1. Alcance de las Pruebas
* **Base de Datos (`talentus-scout-migrations`):**
  * Migración `20261125150000_add_social_video_links_to_athletes.sql` agregando `instagram_url`, `tiktok_url`, `youtube_url`, `other_video_platform_url` (`VARCHAR(500)`) y `other_video_platform_label` (`VARCHAR(60)`) a `public.athletes`.
* **Backend (`talentus-scout-be`):**
  * Entidad `Athlete`, DTOs `UpdateAthleteRequest`, `AthleteResponse`, `PublicSocialLinksDto`, `PublicAthleteResponse`.
  * Seguridad `ScoutSecurity.isApprovedScoutOrAdmin`.
  * Servicio `AthleteService` (`updateAthlete` con gate de suscripción `ACTIVE` + sanitización y allowlist `https://`, `getPublicAthleteBySlug` con aislamiento LOPNNA).
* **Frontend (`talentus-scout-fe`):**
  * Modelos `PublicSocialLinks`, `UpdateAthleteRequest`, `AthleteSummary`, `PublicAthleteResponse` y método `AthleteService.updateAthlete`.
  * Nuevo componente `EditAthleteModalComponent` (`.ts`, `.html`, `.css`, `.spec.ts`).
  * Integración en `TutorDashboardComponent` (botones `✏️ Editar Ficha`, `🌐 Redes y Videos` / `🔒 Redes y Videos (Requiere Pro)`).
  * Tarjeta Bento `"Redes y Videos Externos"` en `BentoProfileComponent` con protección SSR y LOPNNA.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Base de Datos (PostgreSQL Local — `dbmate`)
```bash
DATABASE_URL="postgres://postgres:postgrespassword2026@localhost:5432/talentus_scout_dev?sslmode=disable" \
  dbmate -d ./migrations --no-dump-schema up && \
  dbmate -d ./migrations --no-dump-schema down && \
  dbmate -d ./migrations --no-dump-schema up
```
* **Resultado:** `PASS` — Migración aplicada, revertida y reaplicada sin errores; las 5 columnas verificadas mediante `\d+ public.athletes`.

### 2.2. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
```bash
cd talentus-scout-be
./mvnw test -Dtest="AthleteSocialLinksIntegrationTest,AthleteControllerTest,AthletePublicControllerTest"
```
* **Resultado:** `BUILD SUCCESS` — **24 tests ejecutados, 0 fallos, 0 errores, 0 omitidos**:
  * `AthleteSocialLinksIntegrationTest` (5/5): guardado/limpieza con Plan Pro activo, bloqueo `403` sin suscripción activa + edición deportiva básica `200`, retención y visibilidad tras vencimiento de suscripción + bloqueo de edición `403`, validación estricta `https://` y dominios oficiales (`400`), aislamiento LOPNNA en ficha pública (`socialLinks` presente para `SCOUT` aprobado y `ADMIN`; `null` para anónimo, `TUTOR`, `ATHLETE` y `SCOUT` pendiente).
  * `AthleteControllerTest` (15/15): regresión completa de CRUD de atletas.
  * `AthletePublicControllerTest` (4/4): regresión completa de perfil público Bento.

### 2.3. Frontend (Angular 18+ / Karma ChromeHeadless + Build Browser/SSR)
```bash
cd talentus-scout-fe
npx ng test --watch=false --browsers=ChromeHeadless \
  --include="src/app/features/dashboard/edit-athlete-modal/edit-athlete-modal.component.spec.ts" \
  --include="src/app/features/dashboard/tutor-dashboard.component.spec.ts" \
  --include="src/app/features/public-profile/bento-profile.component.spec.ts"
```
* **Resultado:** `TOTAL: 60 SUCCESS` (60/60 pruebas unitarias pasando).
* **Build de producción (`npm run build`):** Validado para bundle browser y servidor SSR sin errores.

---

## 3. Guía de Verificación Manual (API & UI)

### 3.1. Guardar enlaces con suscripción Plan Pro activa (`200 OK`)
```bash
curl -i -X PUT "http://localhost:8080/api/v1/athletes/<ATHLETE_ID>" \
  -H "Authorization: Bearer <TUTOR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramUrl": "https://www.instagram.com/talento10/",
    "tiktokUrl": "https://www.tiktok.com/@talento10",
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
    "otherVideoPlatformUrl": "https://www.hudl.com/profile/12345",
    "otherVideoPlatformLabel": "Hudl"
  }'
```
* **Esperado:** `200 OK` devolviendo los 5 campos guardados.

### 3.2. Intentar agregar enlaces sin suscripción activa (`403 Forbidden`) vs editar datos deportivos (`200 OK`)
```bash
# Debe responder 403 Forbidden
curl -i -X PUT "http://localhost:8080/api/v1/athletes/<INACTIVE_ATHLETE_ID>" \
  -H "Authorization: Bearer <TUTOR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"instagramUrl": "https://instagram.com/bloqueado"}'

# Debe responder 200 OK
curl -i -X PUT "http://localhost:8080/api/v1/athletes/<INACTIVE_ATHLETE_ID>" \
  -H "Authorization: Bearer <TUTOR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"bio": "Mediocampista box-to-box", "heightCm": 175.0}'
```

### 3.3. Rechazar protocolo inseguro o dominio no oficial (`400 Bad Request`)
```bash
curl -i -X PUT "http://localhost:8080/api/v1/athletes/<ATHLETE_ID>" \
  -H "Authorization: Bearer <TUTOR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"instagramUrl": "http://instagram.com/no-https"}'

curl -i -X PUT "http://localhost:8080/api/v1/athletes/<ATHLETE_ID>" \
  -H "Authorization: Bearer <TUTOR_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"tiktokUrl": "https://vimeo.com/12345"}'
```
* **Esperado:** `400 Bad Request` con mensaje claro sobre `https://` o dominio oficial.

### 3.4. Verificar aislamiento LOPNNA en Ficha Pública
```bash
# Anónimo -> socialLinks: null
curl -s "http://localhost:8080/api/v1/athletes/public/<SLUG>" | jq '.socialLinks'

# Scout aprobado -> socialLinks con URLs
curl -s "http://localhost:8080/api/v1/athletes/public/<SLUG>" \
  -H "Authorization: Bearer <APPROVED_SCOUT_JWT>" | jq '.socialLinks'
```

### 3.5. Verificación en Interfaz (UI)
1. **Panel del Tutor (Atleta Pro activo):** Clic en **"🌐 Redes y Videos"** → abre `EditAthleteModalComponent` en pestaña *Redes y videos externos*, muestra el aviso de contenido deportivo y responsabilidad del tutor/atleta mayor (sin checkbox), permite guardar/limpiar enlaces con validación reactiva en tiempo real.
2. **Panel del Tutor (Atleta sin Plan Pro):** Botón muestra **"🔒 Redes y Videos (Requiere Pro)"** y redirige a `/pagos/:athleteId`. Clic en **"✏️ Editar Ficha"** permite editar datos deportivos y al cambiar a pestaña *Redes y videos externos* muestra campos bloqueados y botón **"Activar Plan Pro"**.
3. **Ficha Pública Bento (`/atleta/:slug`):**
   * Visitante anónimo, Tutor, Atleta o Scout pendiente → NO renderiza la tarjeta *"Redes y Videos Externos"*.
   * Scout aprobado o Admin → renderiza la tarjeta *"Redes y Videos Externos"* con íconos SVG oficiales de Instagram, TikTok, YouTube y plataforma externa (`target="_blank" rel="noopener noreferrer"`).

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| # | Criterio de Aceptación | Estado | Evidencia |
|---|---|---|---|
| 1 | Migración `dbmate` añade las 5 columnas a `public.athletes` con rollback limpio en local | ✅ Cumplido | `dbmate up/down/up` en PostgreSQL local |
| 2 | Gate Plan Pro activo en `PUT /api/v1/athletes/{id}` (`403` en RRSS, `200` en datos deportivos) | ✅ Cumplido | `AthleteSocialLinksIntegrationTest` |
| 3 | Suscripción expirada conserva enlaces y visibilidad a scouts, bloquea nuevas ediciones | ✅ Cumplido | `AthleteSocialLinksIntegrationTest` |
| 4 | Validación estricta `https://` y dominios oficiales (Instagram, TikTok, YouTube, otra plataforma) | ✅ Cumplido | `AthleteSocialLinksIntegrationTest` + `EditAthleteModalComponent` |
| 5 | Aislamiento LOPNNA en `GET /api/v1/athletes/public/{slug}` (solo `ADMIN` y `SCOUT` aprobado) | ✅ Cumplido | `AthleteSocialLinksIntegrationTest` + `BentoProfileComponent` |
| 6 | Modal con aviso visible de contenido deportivo y responsabilidad del tutor/atleta mayor + UI Pro | ✅ Cumplido | `EditAthleteModalComponent` + `TutorDashboardComponent` |
| 7 | Tarjeta Bento con íconos SVG oficiales y protección SSR/browser | ✅ Cumplido | `BentoProfileComponent` + `ng test` (60/60) + `npm run build` |

---

## 5. Casos Borde y Seguridad Validados
* Inyección de protocolo (`javascript:alert(1)`, `http://...`) rechazada en backend (`400`) y sanitizada doblemente en frontend (`isSafeExternalUrl`).
* Dominios engañosos tipo `notinstagram.com` rechazados mediante validación exacta de dominio o subdominio con punto (`.instagram.com`).
* Etiqueta de plataforma externa sin URL rechazada con `400`; al limpiar la URL sin enviar etiqueta, la etiqueta se limpia automáticamente a `null`.
* Cero filtración en SSR: `canViewSocialLinks()` requiere `isPlatformBrowser(this.platformId)` y el backend jamás serializa `socialLinks` sin `Authentication` de `ADMIN` o `SCOUT` (`APPROVED` + `ACTIVE`).
