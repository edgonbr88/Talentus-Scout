# Plan de Implementación: [TS-33] Opción "Otro" en Selector de Club con Captura de Texto y Creación Automática de Organización No Verificada

**ID Tarea:** TS-33  
**Tarjeta Trello:** https://trello.com/c/Ze5rDp7s  
**Fecha:** 2026-10-13  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  Muchos prospectos en categorías infantiles y juveniles entrenan en escuelas de fútbol formativo base, academias comunitarias o ligas locales que no están dadas de alta en el directorio oficial preexistente de Talentus Scout. Al limitar al tutor a elegir de una lista estática o seleccionar "Sin afiliación / Independiente", se pierde la identidad deportiva del atleta y se desincentiva el registro.
- **Gobernanza y Salvaguarda Deportiva:**
  Al permitir la opción *"Otro (indicar club o academia)..."*, el tutor puede registrar su escuela formativa. El backend crea o vincula de forma transparente la entidad en `clubs_organizations` con `verified_official = false`. Así, el atleta refleja su club real de inmediato, sin otorgar insignias o verificaciones oficiales no auditadas. Si múltiples tutores registran el mismo club (incluso con distinta capitalización), el sistema lo reutiliza para evitar duplicados dispersos.
- **Impacto para el Negocio:**
  Nutrición orgánica y crowdsourcing de academias y clubes de fútbol base en Venezuela y la región, facilitando que futuros atletas seleccionen los clubes agregados y permitiendo que la administración identifique organizaciones activas para contactar y verificar.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Base de Datos (PostgreSQL / Neon):**
    - Sin cambios DDL. La tabla `clubs_organizations` ya posee `verified_official BOOLEAN DEFAULT FALSE`, `name`, `city`, `state`, `country`.
  - **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
    - `com.talentus.scout.web.dto.CreateAthleteRequest`:
      - Añadir campo `customClubName` (`@Size(max = 150)`).
    - `com.talentus.scout.repository.ClubOrganizationRepository`:
      - Añadir método `Optional<ClubOrganization> findByNameIgnoreCase(String name)`.
    - `com.talentus.scout.service.ClubService`:
      - Crear método `ClubOrganization getOrCreateCustomClub(String clubName, User tutor)`.
      - Normalizar el nombre (trim) y buscar por `findByNameIgnoreCase`.
      - Si existe, reutilizar. Si no, instanciar con `verifiedOfficial = false`, ciudad "No especificada", estado/país contextuales del tutor, y persistir.
    - `com.talentus.scout.service.AthleteService`:
      - En `createAthlete`, si `currentClubId` es nulo pero `customClubName` contiene texto válido, llamar a `clubService.getOrCreateCustomClub(request.getCustomClubName(), tutor)` y asociarlo al atleta.
    - `com.talentus.scout.web.controller.AthleteControllerTest`:
      - Pruebas automatizadas de creación con club "Otro" (verificando `verifiedOfficial = false` y nombre del club asignado) y de reutilización insensible a mayúsculas.
  - **Frontend (`talentus-scout-fe` — Angular 18+):**
    - `src/app/core/models/athlete.model.ts`:
      - Extender `CreateAthleteRequest` con `customClubName?: string`.
    - `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`:
      - Añadir opción `<option value="OTHER">Otro (indicar club o academia)...</option>` en `#currentClubId`.
      - Renderizar condicionalmente el campo reactivo de texto `customClubName` a ancho completo cuando `currentClubId === 'OTHER'`.
    - `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`:
      - Incorporar `customClubName: ['']` en `athleteForm`.
      - Escuchar cambios reactivos en `currentClubId` para activar `Validators.required` y `Validators.maxLength(150)` en `customClubName` cuando sea `'OTHER'`, o limpiarlo y deshabilitar validadores en caso contrario.
      - En `onSubmit()`, transformar `currentClubId: undefined` y enviar `customClubName: raw.customClubName.trim()` cuando corresponda.
- **Dependencias:** `TS-05` (Cédula de atleta), `TS-08` (Cédula de atleta y registro), `TS-32` (Remoción de ficha federativa y balance de cuadrícula).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- No se requieren migraciones DDL (`talentus-scout-migrations`).
- La tabla `clubs_organizations` cumple con los requisitos:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `name VARCHAR(150) NOT NULL`
  - `city VARCHAR(100) NOT NULL` (usar "No especificada" como fallback)
  - `state VARCHAR(100) NOT NULL` (heredado del tutor o "No especificado")
  - `country VARCHAR(100) NOT NULL DEFAULT 'Venezuela'` (heredado del tutor)
  - `verified_official BOOLEAN NOT NULL DEFAULT FALSE`

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Directiva Obligatoria de Modelado:** Lombok (`@Getter`, `@Setter`, `@Builder`, etc.).
- **DTO `CreateAthleteRequest.java`:**
  ```java
  @Size(max = 150, message = "El nombre del club personalizado no puede exceder 150 caracteres")
  private String customClubName;
  ```
- **Repositorio `ClubOrganizationRepository.java`:**
  ```java
  Optional<ClubOrganization> findByNameIgnoreCase(String name);
  ```
- **Servicio `ClubService.java`:**
  ```java
  @Transactional
  public ClubOrganization getOrCreateCustomClub(String clubName, User tutor) {
      if (clubName == null || clubName.trim().isEmpty()) {
          return null;
      }
      String normalizedName = clubName.trim();
      return clubOrganizationRepository.findByNameIgnoreCase(normalizedName)
              .orElseGet(() -> {
                  String state = (tutor != null && tutor.getState() != null && !tutor.getState().isBlank())
                          ? tutor.getState() : "No especificado";
                  String country = (tutor != null && tutor.getCountry() != null && !tutor.getCountry().isBlank())
                          ? tutor.getCountry() : "Venezuela";
                  ClubOrganization newClub = ClubOrganization.builder()
                          .name(normalizedName)
                          .city("No especificada")
                          .state(state)
                          .country(country)
                          .verifiedOfficial(false)
                          .build();
                  return clubOrganizationRepository.save(newClub);
              });
  }
  ```
- **Servicio `AthleteService.java`:**
  ```java
  ClubOrganization club = null;
  if (request.getCurrentClubId() != null) {
      club = clubService.getClubById(request.getCurrentClubId());
  } else if (request.getCustomClubName() != null && !request.getCustomClubName().trim().isEmpty()) {
      club = clubService.getOrCreateCustomClub(request.getCustomClubName(), tutor);
  }
  ```

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directivas Visuales ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Select estilizado con opción distinguible:
    `<option value="OTHER">Otro (indicar club o academia)...</option>`
  - Despliegue con transición fluida del input de texto a ancho completo (`col-span-2`) cuando la opción seleccionada es `'OTHER'`.
  - Placeholder orientativo y profesional: `"ej. Academia Tricolor FC"`.
  - Manejo de validación reactiva en rojo (`.form-error`) si el usuario selecciona "Otro" pero intenta enviar el formulario en blanco.
- **Separación de Plantillas:**
  - `register-athlete-modal.component.html` y `register-athlete-modal.component.ts`.

---

## 6. Pruebas y Verificación
- **Backend (`./mvnw test -Dtest=AthleteControllerTest`):**
  - `createAthlete_WithCustomClub_CreatesUnverifiedClubOrganization`: Registrar atleta con club "Otro", verificar que se crea con `verifiedOfficial = false` y queda vinculado al atleta.
  - `createAthlete_WithExistingCustomClubCaseInsensitive_ReusesClub`: Verificar que enviar el mismo nombre con variaciones de mayúsculas/minúsculas reutiliza el ID de la organización.
- **Frontend (`npm run build`):**
  - Compilación sin errores TypeScript o HTML.
  - Comprobación de tipos en `CreateAthleteRequest`.

---

## 7. Checklist de Implementación Paso a Paso
- [x] **Paso 1:** Añadir `findByNameIgnoreCase(String name)` en `ClubOrganizationRepository.java`.
- [x] **Paso 2:** Implementar `getOrCreateCustomClub(String clubName, User tutor)` en `ClubService.java`.
- [x] **Paso 3:** Modificar `CreateAthleteRequest.java` incorporando `customClubName`.
- [x] **Paso 4:** Modificar `AthleteService.java` para invocar `getOrCreateCustomClub` cuando `currentClubId` es nulo y `customClubName` tiene valor.
- [x] **Paso 5:** Agregar pruebas unitarias/integración en `AthleteControllerTest.java` y verificar con `./mvnw test`.
- [x] **Paso 6:** Modificar `athlete.model.ts` con `customClubName?: string`.
- [x] **Paso 7:** Modificar `register-athlete-modal.component.html` y `register-athlete-modal.component.ts` agregando la opción `'OTHER'`, control `customClubName`, validación condicional y payload en `onSubmit()`.
- [x] **Paso 8:** Compilar frontend con `npm run build`.
- [x] **Paso 9:** Redactar documento de pruebas en `test/TS-33-test-plan-opcion-otro-selector-club.md`.
- [x] **Paso 10:** Marcar checklist como completado y mover la tarjeta TS-33 a `in testing` en Trello con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (DoD)
1. El selector de club en el modal de atleta incluye la opción `"Otro (indicar club o academia)..."`.
2. Al seleccionar "Otro", aparece el campo de texto a ancho completo con validación obligatoria.
3. Al seleccionar un club de la lista o "Sin afiliación", el input se oculta y no bloquea el formulario.
4. En backend, el club personalizado se crea con `verified_official = false` y los datos geográficos del tutor.
5. El club se reutiliza sin duplicados si se envía con diferente capitalización (`findByNameIgnoreCase`).
6. El club queda disponible en la lista de clubes para futuros atletas.
7. Suites de backend (`./mvnw test`) y compilación frontend (`npm run build`) en verde.
8. Documento `test/TS-33-test-plan-opcion-otro-selector-club.md` generado.
9. Tarjeta TS-33 movida a `in testing`.
