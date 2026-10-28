# Plan de Implementación: [TS-59] Selector de Clubes y Organizaciones Verificadas con Captura Completa de 'Otro' en Registro de Scouts y Atletas

**ID Tarea:** TS-59  
**Tarjeta Trello:** https://trello.com/c/6adf9fdbe57b3d1be26eb940  
**Fecha:** 2026-10-27  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  Actualmente, el registro de scouts en `/register-scout` utiliza un campo de entrada de texto libre (`organizationName`) para consignar la afiliación institucional del veedor, lo que propicia inconsistencias, faltas ortográficas y dispersión de datos que dificultan la auditoría y vinculación oficial con clubes registrados. Adicionalmente, cuando un atleta o scout pertenece a una academia o escuela formativa no verificada previamente y elige la opción "Otro", solo se capturaba el nombre de la organización, perdiéndose datos geográficos indispensables (ciudad, estado y país) para auditar, agrupar y homologar la entidad deportiva en la plataforma.
- **Gobernanza y Salvaguarda Deportiva (LOPNNA Art. 65 y FIFA):**
  Al estandarizar los selectores institucionales, se garantiza que los veedores seleccionen entidades verificadas oficialmente por Talentus Scout o se declaren como agentes independientes. Si se indica "Otro", el sistema captura con rigurosidad la procedencia geográfica de la entidad no oficial (`verified_official = false`), permitiendo su trazabilidad y futura homologación administrativa sin comprometer la seguridad ni otorgar insignias prematuras.
- **Impacto para el Negocio:**
  - Estandarización y enriquecimiento del directorio de clubes y academias deportivas en Venezuela y Latinoamérica.
  - Trazabilidad y consistencia relacional en perfiles de scouts y cédulas de atletas.
  - Crowdsourcing ordenado y estructurado de organizaciones formativas base.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Base de Datos (PostgreSQL / Neon):**
    - Sin cambios de esquema DDL. La tabla `clubs_organizations` cuenta con todas las columnas necesarias (`id`, `name`, `city`, `state`, `country`, `verified_official`, `federation_code`, `logo_url`).
  - **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
    - `com.talentus.scout.web.dto.RegisterScoutRequest`:
      - Añadir `organizationClubId` (UUID opcional).
      - Añadir `customClubCity`, `customClubState`, `customClubCountry` (Strings opcionales con `@Size(max = 100)`).
      - Ajustar validaciones para permitir que `organizationName` sea opcional si se suministra `organizationClubId` o si se procesa como independiente.
    - `com.talentus.scout.web.dto.CreateAthleteRequest`:
      - Añadir `customClubCity`, `customClubState`, `customClubCountry` (`@Size(max = 100)`).
    - `com.talentus.scout.service.ClubService`:
      - Añadir método sobrecargado `getOrCreateCustomClub(String name, String city, String state, String country)` con normalización y búsqueda insensible a mayúsculas/minúsculas.
      - Mantener compatibilidad con la sobrecarga `getOrCreateCustomClub(String clubName, User tutor)`.
    - `com.talentus.scout.service.AuthService`:
      - En `registerScout`, resolver la organización: si viene `organizationClubId`, obtener el club y fijar su nombre en `ScoutProfile.organizationName`. Si viene "Otro" con datos geográficos, invocar `clubService.getOrCreateCustomClub(...)` y fijar el nombre. Si es independiente, registrar "Agente Independiente".
    - `com.talentus.scout.service.AthleteService`:
      - En `createAthlete`, cuando `customClubName` esté presente, pasar `customClubCity`, `customClubState` y `customClubCountry` a `clubService.getOrCreateCustomClub(...)`.
    - `com.talentus.scout.web.controller.ClubController`:
      - Verificar y garantizar que `GET /api/v1/clubs` retorne los clubes ordenados alfabéticamente por nombre.
  - **Frontend (`talentus-scout-fe` — Angular 18+):**
    - `src/app/core/models/auth.model.ts`:
      - Extender `RegisterScoutRequest` con `organizationClubId`, `customClubCity`, `customClubState`, `customClubCountry`.
    - `src/app/core/models/athlete.model.ts`:
      - Extender `CreateAthleteRequest` con `customClubCity`, `customClubState`, `customClubCountry`.
    - `src/app/features/auth/register-scout/`:
      - `register-scout.component.ts`:
        - Inyectar `AthleteService` (o `ClubService`) para cargar la lista de clubes disponibles al iniciar.
        - Añadir campos reactivos: `organizationType` (`'CLUB' | 'INDEPENDENT' | 'OTHER'`), `organizationClubId`, `customClubName`, `customClubCity`, `customClubState`, `customClubCountry`.
        - Validaciones reactivas condicionales: si selecciona 'CLUB', `organizationClubId` es requerido; si selecciona 'OTHER', `customClubName`, `customClubCity`, `customClubState` y `customClubCountry` son requeridos; si selecciona 'INDEPENDENT', no requiere datos adicionales.
        - Armar el `FormData` con los nuevos campos de forma consistente.
      - `register-scout.component.html`:
        - Reemplazar el input de texto simple por el selector reactivo de filiación con opciones:
          - "Selecciona tu club u organización oficial..."
          - "Agente Independiente / Sin afiliación"
          - Lista de clubes verificados (`c.name (c.city, c.state)`)
          - "Otro (indicar club o academia)..."
        - Mostrar condicionalmente la cuadrícula de inputs cuando se elija "Otro" (Nombre, Ciudad, Región/Estado, Selector de País).
        - Directrices `fe-desing.md` y estilos CSS armónicos con el tema oscuro del formulario de scouts.
    - `src/app/features/dashboard/register-athlete-modal/`:
      - `register-athlete-modal.component.ts`:
        - Agregar `customClubCity`, `customClubState`, `customClubCountry` al `athleteForm`.
        - Al seleccionar 'OTHER', activar validadores para nombre, ciudad, estado y país (preseleccionando el país de nacionalidad/residencia).
        - En `onSubmit()`, incluir los nuevos campos en `CreateAthleteRequest`.
      - `register-athlete-modal.component.html`:
        - En la sección `@if (isOtherClubSelected)`, desplegar cuadrícula responsiva con: Nombre de la Escuela/Club, Ciudad, Estado/Región y País (selector de países autorizados).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **No se requieren migraciones DDL nuevas.**
- La tabla canónica `clubs_organizations` ya cuenta con la estructura óptima:
  ```sql
  CREATE TABLE public.clubs_organizations (
      id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
      name character varying(150) NOT NULL,
      federation_code character varying(50),
      city character varying(100) NOT NULL,
      state character varying(100) NOT NULL,
      country character varying(100) DEFAULT 'Venezuela'::character varying NOT NULL,
      logo_url text,
      verified_official boolean DEFAULT false NOT NULL,
      created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
  );
  ```

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. DTO `RegisterScoutRequest.java`
```java
public class RegisterScoutRequest {
    // Campos previos...
    
    // Organización
    @Size(max = 150, message = "El nombre de la organización no puede exceder 150 caracteres")
    private String organizationName;

    private UUID organizationClubId;

    @Size(max = 100, message = "La ciudad de la organización no puede exceder 100 caracteres")
    private String customClubCity;

    @Size(max = 100, message = "El estado de la organización no puede exceder 100 caracteres")
    private String customClubState;

    @Size(max = 100, message = "El país de la organización no puede exceder 100 caracteres")
    private String customClubCountry;

    // Resto de campos...
}
```

### 4.2. DTO `CreateAthleteRequest.java`
```java
public class CreateAthleteRequest {
    // Campos previos...
    private UUID currentClubId;

    @Size(max = 150, message = "El nombre del club personalizado no puede exceder 150 caracteres")
    private String customClubName;

    @Size(max = 100, message = "La ciudad del club personalizado no puede exceder 100 caracteres")
    private String customClubCity;

    @Size(max = 100, message = "El estado del club personalizado no puede exceder 100 caracteres")
    private String customClubState;

    @Size(max = 100, message = "El país del club personalizado no puede exceder 100 caracteres")
    private String customClubCountry;
}
```

### 4.3. Servicio `ClubService.java`
```java
@Transactional
public ClubOrganization getOrCreateCustomClub(String name, String city, String state, String country) {
    if (name == null || name.trim().isEmpty()) {
        return null;
    }
    String normalizedName = name.trim();
    return clubOrganizationRepository.findByNameIgnoreCase(normalizedName)
            .orElseGet(() -> {
                String resolvedCity = (city != null && !city.isBlank()) ? city.trim() : "No especificada";
                String resolvedState = (state != null && !state.isBlank()) ? state.trim() : "No especificado";
                String resolvedCountry = (country != null && !country.isBlank()) ? country.trim() : "Venezuela";

                ClubOrganization newClub = ClubOrganization.builder()
                        .name(normalizedName)
                        .city(resolvedCity)
                        .state(resolvedState)
                        .country(resolvedCountry)
                        .verifiedOfficial(false)
                        .build();
                return clubOrganizationRepository.save(newClub);
            });
}

@Transactional
public ClubOrganization getOrCreateCustomClub(String clubName, User tutor) {
    String state = (tutor != null && tutor.getState() != null && !tutor.getState().isBlank())
            ? tutor.getState() : "No especificado";
    String country = (tutor != null && tutor.getCountry() != null && !tutor.getCountry().isBlank())
            ? tutor.getCountry() : "Venezuela";
    return getOrCreateCustomClub(clubName, "No especificada", state, country);
}
```

### 4.4. Servicio `AuthService.java`
```java
// En registerScout(RegisterScoutRequest request, String credentialsUrl):
String finalOrgName = request.getOrganizationName();

if (request.getOrganizationClubId() != null) {
    ClubOrganization club = clubService.getClubById(request.getOrganizationClubId());
    if (club != null) {
        finalOrgName = club.getName();
    }
} else if (finalOrgName != null 
        && !finalOrgName.trim().equalsIgnoreCase("Agente Independiente")
        && !finalOrgName.trim().equalsIgnoreCase("Sin afiliación")
        && !finalOrgName.trim().equalsIgnoreCase("Independiente")
        && (request.getCustomClubCity() != null || request.getCustomClubState() != null || request.getCustomClubCountry() != null)) {
    ClubOrganization customClub = clubService.getOrCreateCustomClub(
        finalOrgName,
        request.getCustomClubCity(),
        request.getCustomClubState(),
        request.getCustomClubCountry()
    );
    if (customClub != null) {
        finalOrgName = customClub.getName();
    }
}

if (finalOrgName == null || finalOrgName.isBlank()) {
    finalOrgName = "Agente Independiente";
}

ScoutProfile profile = ScoutProfile.builder()
        .user(savedUser)
        .organizationName(finalOrgName)
        ...
```

### 4.5. Servicio `AthleteService.java`
```java
ClubOrganization club = null;
if (request.getCurrentClubId() != null) {
    club = clubService.getClubById(request.getCurrentClubId());
} else if (request.getCustomClubName() != null && !request.getCustomClubName().trim().isEmpty()) {
    String country = request.getCustomClubCountry() != null ? request.getCustomClubCountry() : (tutor != null ? tutor.getCountry() : null);
    club = clubService.getOrCreateCustomClub(
        request.getCustomClubName(),
        request.getCustomClubCity(),
        request.getCustomClubState(),
        country
    );
}
```

---

## 5. Frontend: Angular 18+ (Standalone & HTML Separado)

- **Directiva Obligatoria de Diseño:** Cumplir con `fe-desing.md` (paleta dark slate/emerald, Bento Grid, feedback visual, sin templates inline).
- **Componente `RegisterScoutComponent` (`register-scout.component.ts` y `.html`):**
  - Carga reactiva de clubes vía `athleteService.getClubs()`.
  - Selector con opciones:
    - `"INDEPENDENT"` -> Agente Independiente / Sin afiliación.
    - Lista de clubes verificados (`c.verifiedOfficial`).
    - `"OTHER"` -> Otro (indicar club o academia)...
  - Grid expandible para "Otro" con campos:
    - Nombre del Club/Escuela (`customClubName`)
    - Ciudad (`customClubCity`)
    - Región / Estado (`customClubState`)
    - País (`customClubCountry`) con lista de países autorizados.
- **Componente `RegisterAthleteModalComponent` (`register-athlete-modal.component.ts` y `.html`):**
  - Enriquecer el bloque `@if (isOtherClubSelected)` con inputs para Ciudad, Estado y País.
  - Mantener preseleccionado el país del tutor o la nacionalidad seleccionada.

---

## 6. Pruebas y Verificación
- **Pruebas Unitarias de Backend:**
  - `ClubServiceTest`: verificar creación de nuevo club no verificado con datos completos (`city`, `state`, `country`) y reutilización insensible a mayúsculas/minúsculas.
  - `AthleteServiceTest`: verificar que `createAthlete` con campos de club 'Otro' persiste la organización con su ciudad, estado y país correctos.
  - `AuthControllerTest` / `AuthServiceTest`: verificar registro de scout con club oficial (`organizationClubId`), agente independiente y club personalizado ('Otro').
- **Pruebas de Frontend:**
  - `register-scout.component.spec.ts`: pruebas de formulario con selección de club oficial, independiente y 'Otro'.
  - `register-athlete-modal.component.spec.ts`: pruebas de captura de ciudad, estado y país al seleccionar 'Otro'.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [ ] **Paso 1:** Actualizar DTOs en Backend (`RegisterScoutRequest`, `CreateAthleteRequest`).
- [ ] **Paso 2:** Extender `ClubService` con la sobrecarga `getOrCreateCustomClub(name, city, state, country)`.
- [ ] **Paso 3:** Actualizar `AthleteService` para pasar la ubicación geográfica completa al registrar atletas con club "Otro".
- [ ] **Paso 4:** Actualizar `AuthService` para soportar `organizationClubId` y creación/vinculación de club "Otro" en registro de scouts.
- [ ] **Paso 5:** Escribir y validar pruebas unitarias de Backend (`./mvnw test`).
- [ ] **Paso 6:** Actualizar modelos TypeScript en Frontend (`auth.model.ts`, `athlete.model.ts`).
- [ ] **Paso 7:** Implementar selector de clubes con opción "Otro" completa en `register-scout.component.ts` y `.html`.
- [ ] **Paso 8:** Extender campos geográficos de "Otro" en `register-athlete-modal.component.ts` y `.html`.
- [ ] **Paso 9:** Actualizar y correr pruebas unitarias de Frontend (`npm test -- --watch=false` o `ng test`).
- [ ] **Paso 10:** Validar compilación de producción (`npm run build`).
- [ ] **Paso 11:** Redactar documento de plan de pruebas en `test/TS-59-test-plan-selector-clubes-organizaciones-verificadas.md`.
- [ ] **Paso 12:** Mover tarjeta a `in testing` en Trello y reportar al usuario.

---

## 8. Criterios de Aceptación (DoD)
- [ ] En `/register-scout`, el usuario puede seleccionar su club desde una lista desplegable de organizaciones verificadas.
- [ ] Se permite seleccionar "Agente Independiente" o "Otro".
- [ ] Al seleccionar "Otro" (tanto en registro de scouts como en registro de atletas), se muestran los campos obligatorios: Nombre, Ciudad, Estado/Región y País.
- [ ] Al enviar con "Otro", el backend crea o reutiliza la fila en `clubs_organizations` con `verified_official = false` y los datos geográficos provistos.
- [ ] Pruebas unitarias de backend y frontend pasando sin errores.
- [ ] Compilación frontend limpia (`npm run build`).
