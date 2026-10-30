# Plan de Pruebas: [TS-45] Filtro por País de Residencia en Directorio de Scouts y Habilitación de Bolivia en Registro

**ID Tarea:** TS-45  
**Tarjeta Trello:** [https://trello.com/c/RRUSRUrY](https://trello.com/c/RRUSRUrY)  
**Fecha:** 2026-10-19  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** `trello_implementer`  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la incorporación y funcionamiento integral del **filtro por país de residencia** en el directorio/radar de talentos para scouts (`/scout/directory`), así como la habilitación oficial de **Bolivia** dentro del listado de países autorizados en los procesos de registro de tutores y atletas.

La implementación abarca el ciclo completo:
1. **Reglas de Registro y Validación (Backend & Frontend):** Habilitación de Bolivia como país válido en `RegisterTutorRequest` (`@Pattern`) y en los formularios de registro de tutores (`register-tutor.component.ts`) y modales de registro de atletas (`register-athlete-modal.component.ts`). La lista regional oficial consolidada queda conformada por: **Venezuela, Colombia, Chile, Perú, Ecuador y Bolivia**.
2. **Criterios de Búsqueda y Especificaciones JPA (Backend):** Soporte en `AthleteFilterCriteria` y `AthleteSpecifications.withResidenceCountry(...)` para filtrar determinísticamente atletas según el país del tutor legal (`users.country`), admitiendo variantes tipográficas (Perú / Peru) y manejando limpiamente valores comodín (`ALL`, `TODOS`).
3. **Contrato de API REST (Backend):** Mapeo de `residenceCountry` en `ScoutDirectoryAthleteItem` a partir de `athlete.getTutor().getCountry()` (con fallback seguro a `"Venezuela"` para registros legados) y exposición del parámetro `residenceCountry` en `ScoutDirectoryController.getDirectory(...)`.
4. **Experiencia de Usuario Bento y Filtros Reactivos (Frontend):** Inclusión de un selector de país de residencia en el panel de filtros avanzados de `ScoutDirectoryComponent` y renderizado de un chip o badge visual Bento (`📍 {{ athlete.residenceCountry || 'Venezuela' }}`) en las tarjetas de perfil del radar.

### Componentes Impactados
* **Backend (`talentus-scout-be`):**
  * `com.talentus.scout.web.dto.RegisterTutorRequest`: Actualización de expresión regular en `@Pattern(regexp = "^(Venezuela|Colombia|Chile|Perú|Peru|Ecuador|Bolivia)$")`.
  * `com.talentus.scout.domain.criteria.AthleteFilterCriteria`: Nuevo campo `residenceCountry`.
  * `com.talentus.scout.domain.specification.AthleteSpecifications`: Especificación `withResidenceCountry(String residenceCountry)` mediante join con `tutor`.
  * `com.talentus.scout.web.dto.ScoutDirectoryAthleteItem`: Nuevo campo `residenceCountry`.
  * `com.talentus.scout.web.controller.ScoutDirectoryController`: Parámetro `@RequestParam(required = false) String residenceCountry`.
  * `com.talentus.scout.service.ScoutDirectoryService`: Inclusión de `withResidenceCountry` en `searchDirectory(...)` y asignación en `mapToItem(...)`.
  * `com.talentus.scout.web.controller.RegisterTutorTest`: Prueba unitaria de registro con país `Bolivia`.
  * `com.talentus.scout.web.controller.ScoutDirectoryIntegrationTest`: Pruebas de integración con filtrado por país de residencia.
* **Frontend (`talentus-scout-fe`):**
  * `src/app/features/scout/models/scout-directory.model.ts`: Actualización de interfaces `ScoutDirectoryAthleteItem` y `ScoutDirectoryFilters`.
  * `src/app/features/scout/services/scout-directory.service.ts`: Envío de `residenceCountry` como parámetro HTTP en `getDirectory(...)`.
  * `src/app/features/auth/register-tutor/register-tutor.component.ts`: Inclusión de `'Bolivia'` en `authorizedCountries`.
  * `src/app/features/athlete/components/register-athlete-modal/register-athlete-modal.component.ts`: Inclusión de `'Bolivia'` en `authorizedCountries`.
  * `src/app/features/scout/directory/scout-directory.component.ts`: Signal `selectedResidenceCountry`, constante `countryOptions`, reseteo y sincronización de filtros.
  * `src/app/features/scout/directory/scout-directory.component.html`: Selector `<select id="countryFilter">` y badge `<span class="tag-badge country-tag">`.
  * `src/app/features/scout/directory/scout-directory.component.css`: Estilos visuales Bento para `.country-tag`.
  * `src/app/features/scout/directory/scout-directory.component.spec.ts`: Pruebas unitarias de filtrado por país, reseteo de filtros y renderizado de badge.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=RegisterTutorTest,ScoutDirectoryIntegrationTest
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Errores | Estado |
|---|---|---|---|---|---|
| `RegisterTutorTest` | 9 | 9 | 0 | 0 | **PASSED** |
| `ScoutDirectoryIntegrationTest` | 8 | 8 | 0 | 0 | **PASSED** |
| **Total Backend** | **17** | **17** | **0** | **0** | **100% OK** |

#### Casos de Prueba Verificados en Backend:
1. `registrationWithBoliviaShouldSucceedWith201Created`: Registro exitoso de tutor legal con país de residencia `"Bolivia"`, validando la aceptación por la expresión regular del DTO.
2. `getDirectory_FilterByResidenceCountry_Success`: Consulta al directorio de scouts filtrando por `residenceCountry=Bolivia`, validando que se retorna exactamente el atleta asociado al tutor boliviano y se excluyen los atletas con tutores de otros países (ej. Venezuela).
3. `getDirectory_DefaultFilters_Success`: Verificación de que la consulta estándar sin filtro de país devuelve todos los atletas visibles aprobados con sus respectivos países de residencia.
4. `getDirectory_EmptyResults_WhenNoMatches`: Validación de que filtros combinados que no producen coincidencias responden con lista vacía sin errores `500`.

---

### 2.2. Frontend (Angular 18+ / Jasmine & Karma)
Comando ejecutado:
```bash
npm test -- --watch=false
```

#### Resultados de la Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `ScoutDirectoryComponent` (focalizada) | 12 | 12 | 0 | **PASSED** |
| **Suite Completa Frontend** | **104** | **104** | **0** | **100% OK** |

#### Compilación de Producción (`npm run build`):
* **Resultado:** `Application bundle generation complete. [18.944 seconds]`
* **Estado:** Exitoso (código de salida 0). Prerenderizado de 13 rutas estáticas y generación completa de bundles cliente y servidor SSR sin errores.

#### Casos de Prueba Verificados en Frontend:
1. `debe inicializar con los países autorizados en countryOptions`: Constata la presencia de Venezuela, Colombia, Chile, Perú, Ecuador y Bolivia.
2. `debe enviar residenceCountry al seleccionar un país en el filtro`: Comprueba que `fetchAthletes()` despacha el filtro `{ residenceCountry: 'Bolivia' }` al servicio `ScoutDirectoryService`.
3. `debe resetear selectedResidenceCountry a cadena vacía al llamar resetFilters()`: Garantiza que la acción de reiniciar filtros limpie la selección de país y recargue los datos sin parámetro de país.
4. `debe renderizar el tag de país de residencia en las tarjetas de atletas`: Valida la existencia del badge `.country-tag` con el texto `📍 Bolivia` o `📍 Venezuela`.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Caso 1: Registro de Tutor con Residencia en Bolivia (REST)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-tutor \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Carlos",
    "lastName": "Mesa",
    "email": "carlos.mesa@talentusscout.test",
    "password": "Password123!",
    "phone": "+59171234567",
    "country": "Bolivia",
    "city": "La Paz",
    "address": "Av. 16 de Julio 123",
    "identityDocumentType": "CI",
    "identityDocumentNumber": "LP-8844221",
    "relationship": "PADRE",
    "acceptedTerms": true
  }'
```
* **Respuesta Esperada (`201 CREATED`):**
```json
{
  "id": "...",
  "email": "carlos.mesa@talentusscout.test",
  "role": "TUTOR",
  "country": "Bolivia",
  "status": "PENDING_VERIFICATION"
}
```

---

### 3.2. Caso 2: Filtrado por País en Directorio de Scouts (REST)
```bash
# Filtrar exclusivamente atletas con tutores en Bolivia
curl -X GET "http://localhost:8080/api/v1/scout/directory?residenceCountry=Bolivia" \
  -H "Authorization: Bearer <TOKEN_SCOUT_VERIFICADO>"
```
* **Respuesta Esperada (`200 OK`):**
```json
{
  "content": [
    {
      "id": "7b8f9a12-...",
      "fullName": "Joaquín Mesa",
      "primaryPosition": "CENTROCAMPISTA",
      "residenceCountry": "Bolivia",
      "visible": true
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

---

### 3.3. Caso 3: Interacción Visual en Radar de Scouts (`/scout/directory`)
1. Iniciar sesión con un usuario con rol `SCOUT` verificado y acceder a la ruta `/scout/directory`.
2. Observar las tarjetas de atleta en la grilla Bento: cada una despliega un tag con icono de ubicación y el país de residencia (ej. `📍 Venezuela` o `📍 Bolivia`).
3. En la barra de filtros superiores, localizar el selector **"País de residencia"**.
4. Desplegar el selector y constatar que contiene las 6 opciones autorizadas:
   * *Todos los países*
   * *Venezuela*
   * *Colombia*
   * *Chile*
   * *Perú*
   * *Ecuador*
   * *Bolivia*
5. Seleccionar **"Bolivia"**: la grilla se actualiza reactivamente mostrando únicamente los talentos tutelados desde Bolivia.
6. Presionar el botón **"Limpiar Filtros"**: el selector regresa a *"Todos los países"* y la grilla restaura el listado completo.

---

## 4. Matriz de Criterios de Aceptación (DoD)

- [x] **Filtrado Exclusivo por País:** El scout puede filtrar atletas en `/scout/directory` seleccionando cualquiera de los 6 países autorizados o restablecer a "Todos los países".
- [x] **Asociación Determinista por Tutor:** La consulta filtra a nivel de base de datos (`users.country`) mediante `AthleteSpecifications.withResidenceCountry(...)`, asociando la residencia legal del atleta a la de su tutor.
- [x] **Identificación Visual Inmediata:** Cada tarjeta Bento en el radar despliega el badge `.country-tag` con el país de residencia correspondiente.
- [x] **Habilitación de Bolivia en Registro:** Tutores y atletas pueden registrarse seleccionando Bolivia tanto en frontend como en los endpoints REST sin errores de validación.
- [x] **Calidad y Regresiones Cero:** Suite completa backend (17 tests) y frontend (104 tests) 100% aprobadas; `npm run build` compila limpiamente sin errores de tipo ni de empaquetado.

---

## 5. Casos Borde y Validaciones Críticas

* **Registros Legados con País Nulo:** En caso de existir atletas vinculados a usuarios con `country` nulo o vacío en base de datos, `ScoutDirectoryService.mapToItem(...)` y la plantilla de Angular aplican un fallback transparente a `"Venezuela"`.
* **Manejo de Acentos (Perú vs Peru):** `AthleteSpecifications.withResidenceCountry(...)` evalúa ambas variantes ortográficas (`Perú` y `Peru`) para prevenir discrepancias por normalización tipográfica.
* **Comodines de Descarte:** Si el cliente frontend envía `"ALL"`, `"TODOS"` o cadena vacía `""`, la especificación se desactiva limpiamente retornando una conjunción neutra.
* **Respaldo de Auditoría y Verificación:** Los registros desde Bolivia conservan las mismas reglas de validación LOPNNA y cédula de identidad requeridas en la plataforma.
