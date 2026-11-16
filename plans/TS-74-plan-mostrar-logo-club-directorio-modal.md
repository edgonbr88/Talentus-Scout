# Plan de Implementación: [TS-74] Mostrar logo oficial del club en tarjetas del directorio de scouts y modal de video

**ID Tarea:** TS-74  
**Tarjeta Trello:** https://trello.com/c/FWY6t2Pj  
**ID Tarjeta en Trello:** `6af7e190e53d4a3326aa1938`  
**Fecha:** 2026-11-16  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema:** En el Directorio Oficial de Talentos de Talentus Scout y en el Modal de Reproducción Rápida de Video, la información del club de origen del futbolista se muestra acompañada de un emoji genérico `🏟️` junto al nombre. Aunque el backend y la base de datos ya disponen de los escudos oficiales (`clubs_organizations.logo_url` y `ScoutDirectoryAthleteItem.clubLogoUrl`), la interfaz desaprovecha este activo visual fundamental, restando jerarquía institucional y profesionalismo.
- **Impacto:** Para los scouts y directores deportivos de academias y selecciones, identificar el escudo oficial del club de procedencia genera reconocimiento inmediato del linaje y procedencia formativa del jugador. Además, sustituir el emoji `🏟️` por un escudo/emblema SVG vectorial discreto cuando no exista logo eleva la consistencia visual y estética Bento (según `fe-desing.md` y `TS-60`).

---

## 2. Alcance Técnico y Arquitectura
- **Base de Datos:** Sin cambios de esquema DDL ni migraciones relacionales (`clubs_organizations.logo_url` ya existe y está poblado).
- **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  - Sanitizar `clubLogoUrl` en `ScoutDirectoryService.mapToItem(...)`: convertir strings vacíos o en blanco a `null` de forma defensiva.
  - Ampliar pruebas de integración en `ScoutDirectoryIntegrationTest.java` para verificar que `GET /api/v1/scouts/directory` devuelve `clubLogoUrl` cuando existe y `null` cuando no o cuando el atleta es independiente.
- **Frontend (`talentus-scout-fe` — Angular 18+ Standalone):**
  - **`scout-directory.component.ts`:**
    - Agregar signal `failedClubLogos = signal<Set<string>>(new Set())` para registrar atletas cuyo escudo falle al cargar (`(error)` event).
    - Agregar signal `modalClubLogoFailed = signal<boolean>(false)` para el modal de video rápido.
    - Métodos auxiliares `onClubLogoError(athleteId: string)`, `isClubLogoLoaded(athlete: ScoutDirectoryAthleteItem)` y `onModalClubLogoError()`.
  - **`scout-directory.component.html`:**
    - En cada `.athlete-bento-card`, reemplazar `<span class="club-icon">🏟️</span>` por renderizado condicional:
      - Si `isClubLogoLoaded(athlete)` es verdadero: `<img [src]="athlete.clubLogoUrl! | mediaUrl" [alt]="athlete.clubName || 'Escudo del club'" class="club-logo-mini" loading="lazy" (error)="onClubLogoError(athlete.id)" />`.
      - Si es falso o `null`: `<span class="club-icon-fallback" aria-hidden="true"><svg class="club-crest-svg" ...></svg></span>`.
    - En `.quick-video-dialog` (`activeVideoModal`):
      - Renderizar junto a `activeVideoModal()?.clubName` el escudo del club (`18px–20px`) con `| mediaUrl`, manejando fallback SVG si no existe o falla la carga.
  - **`scout-directory.component.css`:**
    - Estilos de `.club-logo-mini`: `width: 22px; height: 22px; object-fit: contain; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03); padding: 2px;`.
    - Estilos de `.club-icon-fallback` y `.club-crest-svg`: contenedor centrado `22px` con icono SVG vectorial sutil.
    - Estilos en modal para `.modal-club-logo` y `.modal-club-icon-fallback`.
  - **`scout-directory.component.spec.ts`:**
    - Tests para: renderizado de imagen de club con `| mediaUrl`, fallback a SVG cuando `clubLogoUrl` es `null`, fallback a SVG ante error de carga `(error)`, y visualización de logo en modal de video.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No aplica (tarea puramente de frontend, mapeo backend y pruebas).

---

## 4. Backend: Spring Boot 3 (Java 21)
- Clases a modificar:
  - `src/main/java/com/talentus/scout/service/ScoutDirectoryService.java`
  - `src/test/java/com/talentus/scout/web/controller/ScoutDirectoryIntegrationTest.java`

---

## 5. Frontend: Angular 18+
- Archivos a modificar:
  - `src/app/features/scout-directory/scout-directory.component.ts`
  - `src/app/features/scout-directory/scout-directory.component.html`
  - `src/app/features/scout-directory/scout-directory.component.css`
  - `src/app/features/scout-directory/scout-directory.component.spec.ts`

---

## 6. Pruebas y Verificación
- Backend: `./mvnw test -Dtest=ScoutDirectoryIntegrationTest,ScoutDirectorySecurityTest`
- Frontend: `npm test -- --watch=false` y `npm run build`
- Verificación en navegador y UI.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] Paso 1: Crear ramas Git `feature/TS-74-mostrar-logo-club-directorio-modal` en subrepositorios y orquestador.
- [x] Paso 2: Backend — Refinar sanitización de `clubLogoUrl` en `ScoutDirectoryService.java` y agregar aserciones en `ScoutDirectoryIntegrationTest.java`.
- [x] Paso 3: Backend — Ejecutar `./mvnw test -Dtest=ScoutDirectoryIntegrationTest,ScoutDirectorySecurityTest`.
- [x] Paso 4: Frontend — Implementar manejo de señales de error y lógica de renderizado en `scout-directory.component.ts`.
- [x] Paso 5: Frontend — Actualizar plantilla `scout-directory.component.html` (tarjetas Bento y modal de video) con el escudo del club y SVG fallback.
- [x] Paso 6: Frontend — Definir estilos CSS en `scout-directory.component.css`.
- [x] Paso 7: Frontend — Agregar y ejecutar pruebas unitarias en `scout-directory.component.spec.ts` y validar `npm run build`.
- [x] Paso 8: Generar plan de pruebas `test/TS-74-test-plan-mostrar-logo-club-directorio-modal.md`.
- [ ] Paso 9: Realizar commits, push y abrir Pull Requests en GitHub.
- [ ] Paso 10: Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (DoD)
- [x] Las tarjetas del directorio de scouts muestran el escudo real del club (`20px–24px`, `object-fit: contain`) junto al nombre del club cuando `clubLogoUrl` existe.
- [x] Si el club no tiene logo, el atleta no pertenece a un club o la imagen falla al cargar, se muestra automáticamente un ícono SVG vectorial discreto en lugar del emoji `🏟️`.
- [x] La cabecera del modal de reproducción rápida de video (`activeVideoModal`) muestra el logo del club (cuando existe) junto al nombre del club.
- [x] Se utiliza `MediaUrlPipe` para resolver tanto URLs CDN/externas como rutas relativas locales.
- [x] El diseño conserva la alineación, truncado con elipsis y altura uniforme de las tarjetas en el Bento Grid.
- [x] Pruebas unitarias de backend y frontend en verde al 100%.
