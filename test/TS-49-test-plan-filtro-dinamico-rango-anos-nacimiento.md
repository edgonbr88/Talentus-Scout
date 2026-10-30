# Plan de Pruebas y Validación: [TS-49] Filtro Dinámico por Rango de Años de Nacimiento en Directorio de Scouts

**ID Tarea:** TS-49  
**Título:** Filtro Dinámico por Rango de Años de Nacimiento en Directorio de Scouts  
**Tarjeta Trello:** [https://trello.com/c/6ad6a2580ffd3379e2b14bdc](https://trello.com/c/6ad6a2580ffd3379e2b14bdc)  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-20  
**Estado:** VALIDADO / EN TESTING  
**Agente:** trello_implementer  

---

## 1. Alcance de las Pruebas
- **Backend (Spring Boot 3 / Java 21):**
  - `AthleteRepository`: Método de consulta nativa `findDistinctBirthYearsWithActiveRadar()`.
  - `AthleteSpecifications`: Especificación JPA `withBirthYearRange(Integer birthYearFrom, Integer birthYearTo)`.
  - `AthleteFilterCriteria`: DTO con campos `birthYearFrom` y `birthYearTo`.
  - `ScoutDirectoryService`: Métodos `getAvailableBirthYears()` y `searchDirectory()` con soporte de rango de fechas y normalización.
  - `ScoutDirectoryController`: Endpoint `GET /api/v1/scouts/directory/birth-years` protegido con seguridad `@PreAuthorize` y parámetros `birthYearFrom`, `birthYearTo` en `GET /api/v1/scouts/directory`.
- **Frontend (Angular 18+ Standalone / Signals):**
  - `ScoutDirectoryFilters` en `scout-directory.model.ts`.
  - `ScoutDirectoryService` con método `getAvailableBirthYears()`.
  - `ScoutDirectoryComponent` con signals reactivas `availableBirthYears`, `selectedBirthYearFrom`, `selectedBirthYearTo`, y manejadores `onYearFromChange`, `onYearToChange`, `selectCategory`, `resetFilters`.
  - `scout-directory.component.html` con selectores accesibles "Año Desde" y "Año Hasta" en el panel de filtros avanzados.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (`./mvnw test -Dtest=ScoutDirectoryIntegrationTest`)
- **Comando:** `./mvnw test -Dtest=ScoutDirectoryIntegrationTest`
- **Resultado:** **BUILD SUCCESS** (15 tests ejecutados, 0 fallos, 0 errores, 0 omitidos).
- **Casos de prueba clave validados:**
  1. `getAvailableBirthYears_ShouldReturnDistinctOrderedYearsOfEligibleAthletes`: Verifica respuesta HTTP 200, formato numérico ordenado y presencia de años con atletas públicos y verificados (2010, 2008).
  2. `getDirectory_FilterByBirthYearRange_Success`: Valida filtrado por rango cerrado (e.g. 2008 a 2009 incluye sólo atleta 2008; 2010 a 2012 incluye sólo atleta 2010; 2008 a 2010 incluye ambos).
  3. `getDirectory_FilterByBirthYearFromOnly_Success`: Valida rango abierto inferior (`birthYearFrom = 2009` retorna atletas nacidos a partir de 2009).
  4. `getDirectory_FilterByBirthYearToOnly_Success`: Valida rango abierto superior (`birthYearTo = 2009` retorna atletas nacidos hasta 2009).
  5. `getDirectory_FilterByInvertedBirthYearRange_NormalizesAndFilters`: Valida que rangos invertidos (`birthYearFrom = 2010` y `birthYearTo = 2008`) se normalicen automáticamente sin arrojar error ni resultados vacíos espurios.
  6. Pruebas de regresión: filtros por país de residencia, pasaporte europeo, video, club, posición y pierna hábil.

### 2.2. Frontend (`npm test -- --watch=false --browsers=ChromeHeadless`)
- **Comando:** `npm test -- --watch=false --browsers=ChromeHeadless`
- **Resultado:** **TOTAL: 116 SUCCESS** (116 tests ejecutados, 0 fallos).
- **Pruebas unitarias en `scout-directory.component.spec.ts`:**
  1. `debe cargar los años de nacimiento disponibles en ngOnInit (TS-49)`: Comprueba que se llame a `getAvailableBirthYears` y se pueble la signal `availableBirthYears`.
  2. `debe filtrar por rango de años y deseleccionar categoría rápida (TS-49)`: Comprueba que al cambiar Año Desde o Año Hasta se deseleccione el chip rápido (`selectedBirthYear = null`) y se envíen los parámetros al servicio.
  3. `debe reiniciar los selectores de rango al seleccionar un chip de categoría (TS-49)`: Comprueba que al pulsar un chip de categoría rápida se reinicien `selectedBirthYearFrom` y `selectedBirthYearTo` a `null`.
  4. `debe limpiar los selectores de rango de año al ejecutar resetFilters (TS-49)`: Comprueba que "Reiniciar filtros" limpie tanto los selectores de rango como el resto de filtros.

### 2.3. Compilación Frontend (`npm run build`)
- **Comando:** `npm run build`
- **Resultado:** Compilación exitosa de bundles cliente y servidor SSR (`Application bundle generation complete`), 0 errores de tipado o sintaxis.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Obtención de Token de Scout Autorizado
```bash
SCOUT_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "scout.verificado@talentus.test", "password": "Password123*"}' \
  | jq -r '.token')
```

### 3.2. Consulta de Años Disponibles en el Radar
```bash
curl -s -X GET "http://localhost:8080/api/v1/scouts/directory/birth-years" \
  -H "Authorization: Bearer $SCOUT_TOKEN"
```
- **Respuesta Esperada (HTTP 200 OK):**
```json
[2012, 2011, 2010, 2009, 2008, 2007]
```

### 3.3. Filtrado por Rango de Años (Desde - Hasta)
```bash
# Atletas nacidos entre 2008 y 2010
curl -s -X GET "http://localhost:8080/api/v1/scouts/directory?birthYearFrom=2008&birthYearTo=2010&page=0&size=10" \
  -H "Authorization: Bearer $SCOUT_TOKEN"
```
- **Respuesta Esperada (HTTP 200 OK):** Lista de atletas cuyo `birthYear` está en el rango [2008, 2010].

### 3.4. Filtrado Abierto (Solo Desde o Solo Hasta)
```bash
# Solo nacidos desde 2010 en adelante
curl -s -X GET "http://localhost:8080/api/v1/scouts/directory?birthYearFrom=2010" \
  -H "Authorization: Bearer $SCOUT_TOKEN"

# Solo nacidos hasta 2009
curl -s -X GET "http://localhost:8080/api/v1/scouts/directory?birthYearTo=2009" \
  -H "Authorization: Bearer $SCOUT_TOKEN"
```

### 3.5. Verificación Visual en Frontend (Angular)
1. Iniciar sesión como Scout acreditado y acceder a `/scout/directorio`.
2. Verificar que se cargan los chips de categoría superior (`Todos`, `Sub-15`, `Sub-17`, `Sub-20`).
3. Desplegar "Filtros tácticos" haciendo clic en el botón de engranaje.
4. Localizar los selectores "Año Desde" y "Año Hasta":
   - Comprobar que la primera opción es "Cualquier año".
   - Comprobar que las opciones subsiguientes corresponden a los años dinámicos recibidos del backend.
5. Seleccionar "Año Desde: 2009" y "Año Hasta: 2011":
   - Comprobar que cualquier chip de categoría rápida activo se deselecciona.
   - Comprobar que el radar se actualiza inmediatamente mostrando solo atletas en ese rango de cohortes.
   - Comprobar que aparece el botón "Reiniciar filtros".
6. Pulsar el chip rápido "Sub-15":
   - Comprobar que los selectores "Año Desde" y "Año Hasta" vuelven automáticamente a "Cualquier año".
7. Pulsar "Reiniciar filtros":
   - Comprobar que todos los selectores y chips vuelven al estado inicial de "Todos".

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
|---|---|---|
| El endpoint `GET /api/v1/scouts/directory/birth-years` responde 200 con años ordenados de atletas elegibles | **VERIFICADO** | `ScoutDirectoryIntegrationTest.getAvailableBirthYears_...` PASS |
| El endpoint `GET /api/v1/scouts/directory` filtra por `birthYearFrom`, `birthYearTo` y rango combinado | **VERIFICADO** | `ScoutDirectoryIntegrationTest.getDirectory_FilterByBirthYearRange_...` PASS |
| Retrocompatibilidad con `birthYear` preservada si no se envían límites de rango | **VERIFICADO** | Integración probada con chips y criterios tradicionales |
| Selectores "Año Desde" y "Año Hasta" renderizados dinámicamente en filtros tácticos | **VERIFICADO** | Plantilla HTML con `@for (year of availableBirthYears(); track year)` y Angular build PASS |
| Selección de rango desactiva chips de categoría rápida y actualiza resultados | **VERIFICADO** | Signal `selectedBirthYear` pasa a `null`; test unitario Jasmine PASS |
| Clic en chip de categoría rápida reinicia los selectores de rango a "Cualquier año" | **VERIFICADO** | Signals `selectedBirthYearFrom` y `selectedBirthYearTo` pasan a `null`; test unitario Jasmine PASS |
| Botón "Reiniciar filtros" limpia selectores de rango y restablece radar | **VERIFICADO** | `resetFilters()` limpia ambos selectores; test Jasmine PASS |
| Pruebas de backend pasan 100% en verde | **VERIFICADO** | 15 tests PASS en `ScoutDirectoryIntegrationTest` |
| Compilación de Angular sin errores de tipos ni linter | **VERIFICADO** | `npm run build` PASS, 116 tests Jasmine PASS |

---

## 5. Casos Borde y Consideraciones de Seguridad
1. **Rango Invertido (`birthYearFrom > birthYearTo`):** Normalizado en `AthleteSpecifications.withBirthYearRange` intercambiando automáticamente los valores `from` y `to` para evitar condiciones lógicas vacías accidentales causadas por el usuario.
2. **Protección LOPNNA Art. 65:** La consulta de años disponibles y la especificación de búsqueda filtran estrictamente por `is_public = TRUE`, `legal_verification_status = 'APPROVED'` y suscripción activa (`athlete_subscriptions`), asegurando que ningún menor en estado privado o no verificado sea expuesto en el radar.
3. **Acceso Restringido:** El endpoint `/api/v1/scouts/directory/birth-years` cuenta con `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`, protegiendo la información deportiva exclusivamente para scouts y administradores verificados.
