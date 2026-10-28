# Plan de Implementación — [TS-45] Filtro por País de Residencia en Directorio de Scouts y Habilitación de Bolivia en Registro

## 1. Identificación de la Tarea
* **ID:** `TS-45`
* **Título:** Filtro por país de residencia en directorio de scouts y habilitación de Bolivia en registro
* **Trello Card:** [https://trello.com/c/RRUSRUrY](https://trello.com/c/RRUSRUrY) (ID: `6ad60aa8bf50f5b482f4e47a`)
* **Sprint:** Sprint 4
* **Estado Actual:** `in development`
* **Dependencias:** `TS-13` (Directorio y Radar de Atletas para Scouts), `TS-28` (Auditoría de Patria Potestad)
* **Agente Planificador:** `trello_planner`

---

## 2. Resumen y Contexto de Negocio
Los scouts, agentes y directores deportivos necesitan filtrar y focalizar su búsqueda de talentos no solo por atributos biométricos y posiciones tácticas, sino también por ubicación geográfica y país de residencia legal en Sudamérica. Esto facilita la planificación de giras de observación, convocatorias regionales, evaluación de elegibilidad legal y logística de visados.

### Consideraciones Clave:
1. **Representación Legal (LOPNNA / Patria Potestad):** Al tratarse de atletas juveniles menores de edad, su país de residencia legal vinculante se deriva directamente del domicilio declarado por su tutor o representante legal (`users.country`).
2. **Países Habilitados en el Ecosistema Talentus Scout:** Se amplía la cobertura a 6 países oficiales: **Venezuela, Chile, Ecuador, Colombia, Bolivia y Perú**.
3. **Visibilidad en el Radar:** Cada tarjeta Bento de atleta en el directorio de scouts debe mostrar una insignia visible y distinguible con su país de residencia para una identificación visual inmediata.
4. **Habilitación en Registro:** Se autoriza formalmente a **Bolivia** como país válido en el registro de tutores legales y en el modal de registro de atletas.

---

## 3. Modelo de Datos y Migraciones
* **Impacto DDL:** **Ninguno (No requiere migraciones DDL)**.
* **Trazabilidad de Datos:**
  - La columna `users.country VARCHAR(100)` ya existe (creada en migración de `TS-31`).
  - La relación `athletes.tutor_id -> users.id` permite navegar desde la entidad JPA `Athlete` hacia `athlete.getTutor().getCountry()` directamente en las especificaciones Criteria.

---

## 4. Especificación Backend: Spring Boot 3 (Java 21)

### 4.1 Actualización de `RegisterTutorRequest.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/RegisterTutorRequest.java`
* **Cambio:** Actualizar la expresión regular `@Pattern` para incorporar a Bolivia:
  ```java
  @NotBlank(message = "El país es obligatorio")
  @Pattern(regexp = "^(Venezuela|Colombia|Chile|Perú|Peru|Ecuador|Bolivia)$", message = "El país debe ser uno de los autorizados: Venezuela, Colombia, Chile, Perú, Ecuador, Bolivia")
  private String country;
  ```

### 4.2 Actualización de `AthleteFilterCriteria.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/AthleteFilterCriteria.java`
* **Cambio:** Agregar campo:
  ```java
  private String residenceCountry;
  ```

### 4.3 Actualización de `AthleteSpecifications.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/specification/AthleteSpecifications.java`
* **Nuevo Método:**
  ```java
  public static Specification<Athlete> withResidenceCountry(String residenceCountry) {
      if (residenceCountry == null || residenceCountry.isBlank() || "ALL".equalsIgnoreCase(residenceCountry.trim()) || "TODOS".equalsIgnoreCase(residenceCountry.trim())) {
          return null;
      }
      String countryNormalized = residenceCountry.trim();
      if ("Peru".equalsIgnoreCase(countryNormalized) || "Perú".equalsIgnoreCase(countryNormalized)) {
          return (root, query, cb) -> cb.or(
                  cb.equal(cb.upper(root.get("tutor").get("country")), "PERU"),
                  cb.equal(cb.upper(root.get("tutor").get("country")), "PERÚ")
          );
      }
      return (root, query, cb) -> cb.equal(cb.upper(root.get("tutor").get("country")), countryNormalized.toUpperCase());
  }
  ```

### 4.4 Actualización de DTO `ScoutDirectoryAthleteItem.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/ScoutDirectoryAthleteItem.java`
* **Cambio:** Agregar atributo:
  ```java
  private String residenceCountry;
  ```

### 4.5 Actualización de `ScoutDirectoryService.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/ScoutDirectoryService.java`
* **Cambios:**
  - En `searchDirectory()`: aplicar `AthleteSpecifications.withResidenceCountry(criteria.getResidenceCountry())` si está presente.
  - En `mapToItem()`: resolver `String residenceCountry = athlete.getTutor() != null ? athlete.getTutor().getCountry() : null;` y asignarlo en el builder del item.

### 4.6 Pruebas Automatizadas Backend
1. **`RegisterTutorTest.java`:**
   - Añadir caso de prueba validando registro de tutor con `country = "Bolivia"` y validación de persistencia.
2. **`ScoutDirectoryIntegrationTest.java`:**
   - Añadir prueba integrando atleta de tutor con residencia en `Bolivia` y otro en `Colombia`.
   - Filtrar con `residenceCountry=Bolivia` y corroborar que solo retorna atletas correspondientes.
   - Filtrar con `residenceCountry=Colombia` y verificar exclusión mutua.

---

## 5. Especificación Frontend: Angular 18+ (Standalone)

### 5.1 Modelos TypeScript
* **Ruta:** `talentus-scout-fe/src/app/core/models/scout-directory.model.ts`
* **Cambios:**
  - En `ScoutDirectoryAthleteItem`: agregar `residenceCountry?: string;`.
  - En `ScoutDirectoryFilters`: agregar `residenceCountry?: string | null;`.

### 5.2 Servicio HTTP
* **Ruta:** `talentus-scout-fe/src/app/core/services/scout-directory.service.ts`
* **Cambio:** En `getDirectory()`, anexar el parámetro HTTP si `filters.residenceCountry` tiene valor:
  ```typescript
  if (filters.residenceCountry) {
    params = params.set('residenceCountry', filters.residenceCountry);
  }
  ```

### 5.3 Actualización de Países Autorizados
* **`register-tutor.component.ts`:**
  - Agregar `'Bolivia'` a `authorizedCountries: string[]`.
* **`register-athlete-modal.component.ts`:**
  - Agregar `'Bolivia'` a `authorizedCountries`.

### 5.4 Componente y Vistas del Directorio de Scouts
* **Ruta:** `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.ts`
  - Agregar signal `selectedResidenceCountry = signal<string>('');`.
  - Declarar lista oficial `readonly countryOptions: string[] = ['Venezuela', 'Colombia', 'Chile', 'Perú', 'Ecuador', 'Bolivia'];`.
  - En `fetchAthletes()`: enviar `residenceCountry: this.selectedResidenceCountry() || null`.
  - En `resetFilters()`: limpiar `this.selectedResidenceCountry.set('');`.
* **Ruta:** `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.html`
  - En el panel desplegable de filtros avanzados (`filters-grid`), añadir un selector `<select>` para país de residencia.
  - En la tarjeta Bento de cada atleta (`athlete-bento-card`), en la sección `.card-tags`, añadir chip con ícono y país:
    ```html
    <span class="tag-badge country-tag" [title]="'País de residencia legal: ' + (athlete.residenceCountry || 'Venezuela')">
      📍 {{ athlete.residenceCountry || 'Venezuela' }}
    </span>
    ```
* **Ruta:** `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.css`
  - Estilos intencionales para `.country-tag` alineados con la identidad visual del radar Bento (verde cancha sutil, borde tenue y tipografía legible).

### 5.5 Pruebas Automatizadas Frontend
* **Ruta:** `talentus-scout-fe/src/app/features/scout-directory/scout-directory.component.spec.ts`
  - Verificar que el selector de país de residencia actualice el signal y dispare `directoryService.getDirectory` con el parámetro `residenceCountry`.
  - Verificar que `resetFilters()` limpie `selectedResidenceCountry`.
  - Verificar la correcta renderización del tag de procedencia en las tarjetas de atletas.

---

## 6. Checklist de Implementación Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Backend - Habilitación de Bolivia en DTO de Registro**
  - Modificar `RegisterTutorRequest.java` actualizando el `@Pattern` de `country`.
- [x] **Paso 2: Backend - Criteria y Especificaciones de Búsqueda**
  - Modificar `AthleteFilterCriteria.java` agregando `residenceCountry`.
  - Modificar `AthleteSpecifications.java` creando `withResidenceCountry(...)`.
  - Modificar `ScoutDirectoryAthleteItem.java` agregando `residenceCountry`.
  - Modificar `ScoutDirectoryService.java` integrando la especificación y el mapeo del país del tutor.
- [x] **Paso 3: Backend - Pruebas Automatizadas**
  - Añadir pruebas en `RegisterTutorTest.java` para registro con tutor de Bolivia.
  - Añadir pruebas en `ScoutDirectoryIntegrationTest.java` para filtro por país.
  - Ejecutar `./mvnw test -Dtest=RegisterTutorTest,ScoutDirectoryIntegrationTest` y verificar paso en verde.
- [x] **Paso 4: Frontend - Modelos y Servicio**
  - Actualizar `ScoutDirectoryAthleteItem` y `ScoutDirectoryFilters` en `scout-directory.model.ts`.
  - Actualizar `getDirectory()` en `scout-directory.service.ts` para enviar `residenceCountry`.
- [x] **Paso 5: Frontend - Habilitación de Bolivia en Formularios de Registro**
  - Incorporar `'Bolivia'` en `register-tutor.component.ts`.
  - Incorporar `'Bolivia'` en `register-athlete-modal.component.ts`.
- [x] **Paso 6: Frontend - Selector de País y Tag Bento en Directorio**
  - Añadir selector de país en `scout-directory.component.ts` y plantilla HTML.
  - Añadir tag visual `country-tag` en las tarjetas Bento y sus estilos CSS.
- [x] **Paso 7: Frontend - Pruebas Unitarias y Validación**
  - Actualizar y ampliar pruebas en `scout-directory.component.spec.ts`.
  - Ejecutar `npm test` y verificar 100% éxito.
- [x] **Paso 8: Documentación y Transición**
  - Generar el documento de pruebas en `test/TS-45-test-plan-filtro-pais-residencia-directorio-scouts-bolivia.md`.
  - Mover la tarjeta Trello `TS-45` a `in testing` mediante script.

---

## 7. Criterios de Aceptación (Definition of Done - DoD)

1. **Filtrado Exclusivo por País:** El scout puede filtrar atletas en `/scout/directory` seleccionando cualquiera de los 6 países (Venezuela, Colombia, Chile, Perú, Ecuador, Bolivia) o "Todos los países".
2. **Asociación de Residencia por Tutor:** La consulta filtra determinísticamente según el país del tutor legal del atleta (`tutor.country`).
3. **Identificación Visual Inmediata:** Cada tarjeta de atleta en el radar muestra el tag Bento de país de residencia.
4. **Registro con Bolivia:** Los tutores pueden seleccionar `Bolivia` en `/auth/register-tutor` y en el modal de atleta sin rechazo de validación.
5. **Calidad y Regresiones Cero:** Todas las pruebas automatizadas backend y frontend pasan al 100% y el build compila sin errores.
