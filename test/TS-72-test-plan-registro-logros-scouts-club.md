# Plan de Pruebas: [TS-72] Registro y certificación de logros deportivos por scouts del mismo club

**ID Tarea:** TS-72  
**Tarjeta Trello:** https://trello.com/c/rlZf6XEf  
**Fecha:** 2026-11-15  
**Estado:** LISTO PARA TESTING  

---

## 1. Alcance de las Pruebas
- **Base de Datos (`talentus-scout-migrations`):**
  - `migrations/20261116120000_add_sport_achievement_to_badge_type_enum.sql`
  - `schema.sql` (agregado de `SPORT_ACHIEVEMENT` al ENUM `badge_type`)
- **Backend (`talentus-scout-be`):**
  - `src/main/java/com/talentus/scout/web/dto/UserProfileResponse.java`
  - `src/main/java/com/talentus/scout/web/controller/AuthController.java`
  - `src/main/java/com/talentus/scout/web/dto/CreateAthleteAchievementRequest.java`
  - `src/main/java/com/talentus/scout/service/ScoutAchievementService.java`
  - `src/main/java/com/talentus/scout/web/controller/ScoutProfileController.java`
  - `src/main/java/com/talentus/scout/service/pdf/AthleteCvPdfService.java`
  - `src/test/java/com/talentus/scout/service/ScoutAchievementServiceTest.java`
- **Frontend (`talentus-scout-fe`):**
  - `src/app/core/models/user.model.ts`, `auth.model.ts`, `athlete.model.ts`
  - `src/app/core/auth/auth.service.ts`
  - `src/app/core/services/scout-directory.service.ts`
  - `src/app/features/public-profile/bento-profile.component.ts`, `.html`, `.css`, `.spec.ts`

## 2. Pruebas Automatizadas Ejecutadas
- **Backend (`ScoutAchievementServiceTest` + `AthleteCvPdfServiceTest`):**
  - Comando: `cd talentus-scout-be && ./mvnw test -Dtest=ScoutAchievementServiceTest,AthleteCvPdfServiceTest`
  - Resultado: **PASS** (6 tests ejecutados, 0 fallos, 0 errores).
  - Nota sobre suite completa (`./mvnw test`): 282 de 285 tests en verde; 3 fallos preexistentes en `RegisterTutorTest` (no relacionados con TS-72).
- **Frontend Compilación (`npm run build`):**
  - Comando: `cd talentus-scout-fe && npm run build`
  - Resultado: **PASS** (código de salida `0`, 20 rutas estáticas prerenderizadas).
- **Frontend Pruebas Unitarias (`BentoProfileComponent`):**
  - Comando: `cd talentus-scout-fe && npx ng test --watch=false --browsers=ChromeHeadless --include="src/app/features/public-profile/bento-profile.component.spec.ts"`
  - Resultado: **PASS** (`TOTAL: 9 SUCCESS`).

## 3. Guía de Pruebas Manuales / cURL
### 3.1. Registro de logro por scout del mismo club (201 Created)
```bash
curl -X POST "http://localhost:8080/api/v1/scout/athletes/<ATHLETE_UUID>/achievements" \
  -H "Authorization: Bearer <SCOUT_SAME_CLUB_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Campeón Torneo Apertura Sub-16",
    "category": "TORNEO",
    "achievementDate": "2026-06-15",
    "description": "Titular en la final estatal"
  }'
```
- **Respuesta esperada (`201 Created`):**
  ```json
  {
    "type": "SPORT_ACHIEVEMENT",
    "title": "Campeón Torneo Apertura Sub-16 — Titular en la final estatal",
    "verified": true,
    "organizationName": "Caracas FC",
    "verifiedAt": "2026-11-15T..."
  }
  ```

### 3.2. Rechazo por scout de otro club (403 Forbidden)
```bash
curl -X POST "http://localhost:8080/api/v1/scout/athletes/<ATHLETE_UUID>/achievements" \
  -H "Authorization: Bearer <SCOUT_OTHER_CLUB_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MVP Copa Regional",
    "category": "INDIVIDUAL"
  }'
```
- **Respuesta esperada (`403 Forbidden`):** Mensaje `"Solo puedes certificar logros de atletas que pertenezcan a tu mismo club u organización"`.

### 3.3. Flujo UI en Angular
1. Iniciar sesión como Scout aprobado cuyo `organizationName` coincida con el club del atleta.
2. Abrir `/atleta/:slug`: en la tarjeta **Insignias de Confianza** aparece el botón **+ Registrar Logro de Club**.
3. Hacer clic, completar Título, Categoría, Fecha y Detalles, y presionar **Certificar logro**.
4. Verificar que el logro aparece inmediatamente al inicio de **Insignias de Confianza** sin recargar la página y también en el PDF al descargar **Ficha Técnica (PDF)**.

## 4. Matriz de Criterios de Aceptación (DoD)
- [x] Un scout autenticado solo puede registrar logros para atletas cuyo `current_club` coincida con su organización.
- [x] Si un scout intenta registrar un logro en un atleta de otro club, el backend rechaza la petición con `403 Forbidden`.
- [x] El logro registrado se almacena como `athlete_badges` con tipo `SPORT_ACHIEVEMENT` y estado `APPROVED`.
- [x] El logro se visualiza de inmediato en la sección "Insignias de Confianza" de `/atleta/:slug` y en el CV PDF exportable.
- [x] Pruebas unitarias en backend y frontend en verde, compilación limpia.
