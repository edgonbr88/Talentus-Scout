# Plan de Pruebas: [TS-59] Selector de Clubes y Organizaciones Verificadas con Captura Completa de 'Otro' en Registro de Scouts y Atletas

**ID Tarea:** TS-59  
**Tarjeta Trello:** https://trello.com/c/6adf9fdbe57b3d1be26eb940  
**Fecha:** 2026-10-27  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es certificar la estandarización y captura estructurada de clubes y organizaciones deportivas en los formularios de Talentus Scout:
1. **Registro de Scouts (`/register-scout`):**
   - Reemplazo del campo de texto libre por el selector reactivo `#organizationSelect`.
   - Listado de clubes y academias oficiales verificadas (`verifiedOfficial = true`), ordenadas alfabéticamente.
   - Opción explícita `"INDEPENDENT"` ("Agente Independiente / Sin afiliación"), registrando `"Agente Independiente"` sin forzar pertenencia a un club.
   - Opción `"OTHER"` ("Otro (indicar club o academia)...") con despliegue de cuadrícula reactiva para capturar: Nombre de la Organización (`customClubName`), Ciudad (`customClubCity`), Estado/Región (`customClubState`) y País (`customClubCountry`).
   - Validaciones reactivas condicionales: los datos de la academia son obligatorios únicamente cuando se selecciona "Otro".
2. **Modal de Registro de Atletas (`register-athlete-modal`):**
   - Extensión del bloque reactivo condicional `@if (isOtherClubSelected)` para solicitar de forma estructurada: Nombre (`customClubName`), Ciudad (`customClubCity`), Estado/Región (`customClubState`) y País (`customClubCountry`).
   - Preselección del país de procedencia en el selector desplegable.
3. **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
   - En `RegisterScoutRequest`, soporte para `organizationClubId`, `customClubCity`, `customClubState` y `customClubCountry`.
   - En `CreateAthleteRequest`, soporte para `customClubCity`, `customClubState` y `customClubCountry`.
   - En `ClubService.getOrCreateCustomClub(name, city, state, country)`, creación y persistencia con `verified_official = false` y los datos geográficos suministrados, o reutilización insensible a mayúsculas/minúsculas.
   - En `AuthService.registerScout`, vinculación adecuada de la organización oficial, club creado/reutilizado o agente independiente.
   - En `AthleteService.createAthlete`, asociación del club con sus datos geográficos completos.

### Componentes Impactados
* **Backend (`talentus-scout-be`):**
  * `com.talentus.scout.web.dto.RegisterScoutRequest`
  * `com.talentus.scout.web.dto.CreateAthleteRequest`
  * `com.talentus.scout.service.ClubService`
  * `com.talentus.scout.service.AuthService`
  * `com.talentus.scout.service.AthleteService`
  * `com.talentus.scout.web.controller.AuthScoutRegistrationTest`
  * `com.talentus.scout.web.controller.AthleteControllerTest`
* **Frontend (`talentus-scout-fe`):**
  * `src/app/core/models/auth.model.ts`
  * `src/app/core/models/athlete.model.ts`
  * `src/app/features/auth/register-scout/register-scout.component.ts`
  * `src/app/features/auth/register-scout/register-scout.component.html`
  * `src/app/features/auth/register-scout/register-scout.component.css`
  * `src/app/features/auth/register-scout/register-scout.component.spec.ts`
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.spec.ts`

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest="AuthScoutRegistrationTest,AthleteControllerTest"
```

#### Resultados de Suite Backend:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Errores | Estado |
|---|---|---|---|---|---|
| `AthleteControllerTest` | 13 | 13 | 0 | 0 | **PASSED** |
| `AuthScoutRegistrationTest` | 6 | 6 | 0 | 0 | **PASSED** |
| **Total Backend** | **19** | **19** | **0** | **0** | **PASSED** |

#### Casos Específicos Validados:
1. `createAthlete_WithCustomClubFullLocation_CreatesUnverifiedClubWithLocation`:
   - Valida creación de atleta con club 'Otro' enviando ciudad ("Maracaibo"), estado ("Zulia") y país ("Venezuela").
   - Comprueba persistencia en base de datos con `verifiedOfficial = false` y los atributos geográficos correspondientes.
2. `createAthlete_WithExistingCustomClubCaseInsensitive_ReusesClub`:
   - Valida la reutilización de club sin duplicar registros al enviar el mismo nombre con variaciones de capitalización.
3. `registerScout_WithOrganizationClubId_AssignsOfficialClubName`:
   - Valida registro de scout seleccionando un club verificado mediante su UUID (`organizationClubId`).
   - Comprueba que en `ScoutProfile.organizationName` se asigna automáticamente el nombre oficial del club.
4. `registerScout_WithCustomClubOther_CreatesUnverifiedClubOrganization`:
   - Valida registro de scout seleccionando "Otro" con ciudad ("Mérida"), estado ("Mérida") y país ("Venezuela").
   - Comprueba creación de la entidad en `clubs_organizations` con `verifiedOfficial = false` y vinculación al perfil del scout.
5. `registerScout_AsIndependentAgent_AssignsIndependent`:
   - Valida registro seleccionando "Agente Independiente" sin club afiliado.

---

### 2.2. Frontend (Angular 18+ / Karma / ChromeHeadless)

#### Suite `RegisterScoutComponent`:
Comando ejecutado:
```bash
npm test -- --watch=false --include="src/app/features/auth/register-scout/**/*.spec.ts"
```
**Resultado:** `TOTAL: 9 SUCCESS` (0 fallos).
- `debe enviar el formulario válido con club oficial y redirigir a auditoría pendiente`: PASSED.
- `debe activar campos de organización personalizada si se selecciona "Otro"`: PASSED.
- `debe enviar datos geográficos completos cuando se selecciona "Otro"`: PASSED.
- Validaciones de formato telefónico, tamaño de credenciales y error 409 por duplicado: PASSED.

#### Suite `RegisterAthleteModalComponent`:
Comando ejecutado:
```bash
npm test -- --watch=false --include="src/app/features/dashboard/register-athlete-modal/**/*.spec.ts"
```
**Resultado:** `TOTAL: 11 SUCCESS` (0 fallos).
- `should activate and require custom club location fields when OTHER is selected`: PASSED.
- `should include custom club location fields when submitting with OTHER club`: PASSED.
- Carga de clubes, selección y reintento de foto de perfil: PASSED.

---

### 2.3. Compilación de Producción Frontend (Angular CLI / SSR)
Comando ejecutado:
```bash
npm run build
```
**Resultado:**
- Compilación exitosa en 35.95 segundos.
- 0 errores de compilación o de tipos TypeScript.
- Generación de bundles de navegador y SSR con 13 rutas estáticas prerenderizadas.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Verificación del Registro de Scout con Club Oficial
1. Navegar a `http://localhost:4200/register-scout`.
2. Completar nombre, correo, teléfono y contraseña.
3. En el selector desplegable **"Club, academia o afiliación deportiva"**:
   - Observar los grupos: "Agente Independiente / Sin afiliación", el grupo "Clubes y Academias Verificadas" (ej: Caracas FC, Deportivo Táchira), y la opción "Otro (indicar club o academia)...".
4. Seleccionar un club verificado de la lista (ej: Caracas FC).
5. Adjuntar una credencial válida (PDF/PNG/JPG).
6. Marcar la casilla de declaración jurada y enviar el formulario.
7. Comprobar redirección a `/auth/scout-pending-audit` con el parámetro de query `org=Caracas FC`.

### 3.2. Verificación del Registro de Scout con Opción "Otro"
1. En `/register-scout`, seleccionar la opción **"Otro (indicar club o academia)..."**.
2. Observar la aparición animada del bloque interactivo **"Registro de Organización o Club Formativo"**.
3. Intentar enviar el formulario sin completar los datos de la organización: verificar que se señalan como requeridos:
   - Nombre oficial del Club o Academia.
   - Ciudad.
   - Estado / Región.
   - País de sede.
4. Ingresar:
   - Nombre: `Escuela Comunitaria Nueva Esparta`
   - Ciudad: `Porlamar`
   - Estado: `Nueva Esparta`
   - País: `Venezuela`
5. Adjuntar credencial y enviar.
6. Verificar en base de datos (`SELECT * FROM clubs_organizations WHERE name ILIKE '%Nueva Esparta%';`) que el registro existe con `verified_official = false`, `city = 'Porlamar'`, `state = 'Nueva Esparta'`, `country = 'Venezuela'`.

### 3.3. Verificación del Registro de Scout como "Agente Independiente"
1. En `/register-scout`, seleccionar **"Agente Independiente / Sin afiliación"**.
2. Verificar que no se despliega la cuadrícula de organización y que el formulario queda válido.
3. Consignar la postulación y verificar que se registra en `scout_profiles` con `organization_name = 'Agente Independiente'`.

### 3.4. Verificación en el Modal de Atletas del Panel Tutor
1. Iniciar sesión como tutor legal y acceder al dashboard.
2. Hacer clic en **"Registrar Atleta"**.
3. En el campo **"Club o Academia Formativa Actual"**, seleccionar **"Otro (indicar club o academia)..."**.
4. Constatar el despliegue reactivo de los 4 campos obligatorios:
   - Nombre de tu Escuela o Club Formativo.
   - Ciudad de la Sede.
   - Estado / Región.
   - País de la Organización (selector con países autorizados: Venezuela, Colombia, Chile, Perú, Ecuador, Bolivia).
5. Completar los datos y registrar al atleta.
6. Comprobar que en la cédula deportiva se muestra la entidad formativa asociada y no verificada.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Evidencia / Mecanismo de Validación | Estado |
|---|---|---|
| En `/register-scout`, el usuario selecciona su club desde una lista desplegable de organizaciones verificadas. | Selector reactivo `#organizationSelect` poblado con `verifiedClubs` desde `AthleteService.getClubs()`. | **CUMPLIDO** |
| Se permite seleccionar "Agente Independiente" o "Otro". | Opciones `"INDEPENDENT"` y `"OTHER"` disponibles en el selector desplegable con comportamiento reactivo. | **CUMPLIDO** |
| Al seleccionar "Otro" (tanto en registro de scouts como en registro de atletas), se muestran los campos obligatorios: Nombre, Ciudad, Estado/Región y País. | Bloque `@if (isOtherOrganizationSelected)` en scout y `@if (isOtherClubSelected)` en atleta con validadores `Validators.required`. | **CUMPLIDO** |
| Al enviar el formulario con "Otro", el backend crea o reutiliza la fila en `clubs_organizations` con `verified_official = false` y asocia el ID al registro correspondiente. | `ClubService.getOrCreateCustomClub(name, city, state, country)` probado en `AthleteControllerTest` y `AuthScoutRegistrationTest`. | **CUMPLIDO** |
| Los campos de "Otro" son obligatorios únicamente cuando dicha opción está seleccionada. | Suscripción reactiva a `valueChanges` que activa y desactiva validadores dinámicamente. | **CUMPLIDO** |
| Pruebas unitarias/integración de backend pasan exitosamente (`mvn test`). | 19 pruebas ejecutadas y aprobadas (13 en `AthleteControllerTest` y 6 en `AuthScoutRegistrationTest`). | **CUMPLIDO** |
| Compilación limpia en el frontend (`npm run build`). | Build de producción y SSR completado con 0 errores. | **CUMPLIDO** |

---

## 5. Casos Borde y Consideraciones de Seguridad / Negocio Validadas

1. **Reutilización insensible a mayúsculas/minúsculas:**
   - Evita duplicación de registros por variaciones de tipeo (ej. `"academia golazo"` vs `"ACADEMIA GOLAZO"`).
2. **Salvaguarda Deportiva e Integridad Oficial:**
   - Las entidades creadas automáticamente vía "Otro" quedan con `verified_official = false`, evitando insignias prematuras o accesos indebidos antes de la auditoría.
3. **Agentes Independientes:**
   - No se exige vinculación artificial con un club existente para scouts independientes acreditados (Agentes FIFA / veedores libres).
4. **Respeto a Directrices de Diseño (`fe-desing.md`):**
   - Coherencia con paleta oscura, animaciones de entrada fluidas, cero templates inline y accesibilidad semántica.
