# Plan de Pruebas: [TS-33] Opción "Otro" en Selector de Club con Captura de Texto y Creación Automática de Organización No Verificada

**ID Tarea:** TS-33  
**Tarjeta Trello:** https://trello.com/c/Ze5rDp7s  
**Fecha:** 2026-10-13  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es certificar la funcionalidad que permite a los tutores registrar atletas asociados a clubes, academias o escuelas comunitarias no listadas en el directorio predeterminado:
1. Opción `"OTHER"` en el selector desplegable de club en el modal de registro de atletas.
2. Despliegue interactivo del campo de texto reactivo `customClubName` con validación obligatoria (`Validators.required`, `Validators.maxLength(150)`).
3. Ocultamiento y limpieza del campo cuando el tutor selecciona un club existente o "Sin afiliación".
4. En backend, creación transparente de una nueva entidad `ClubOrganization` con `verified_official = false` y los datos geográficos del tutor.
5. Reutilización del club existente cuando otro usuario introduce el mismo nombre (búsqueda insensible a mayúsculas/minúsculas vía `findByNameIgnoreCase`).
6. Vinculación automática del club al atleta registrado y disponibilidad en el listado para futuros registros.

### Componentes Impactados
* **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  * `com.talentus.scout.web.dto.CreateAthleteRequest`: Campo `customClubName`.
  * `com.talentus.scout.repository.ClubOrganizationRepository`: Método `findByNameIgnoreCase`.
  * `com.talentus.scout.service.ClubService`: Método `getOrCreateCustomClub(String clubName, User tutor)`.
  * `com.talentus.scout.service.AthleteService`: Lógica de fallback para resolución de club personalizado.
  * `com.talentus.scout.web.controller.AthleteControllerTest`: Suites de prueba automatizadas.
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `src/app/core/models/athlete.model.ts`: Propiedad `customClubName?: string` en `CreateAthleteRequest`.
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`: Opción `<option value="OTHER">` y bloque `@if (isOtherClubSelected)`.
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`: Control reactivo, listener de cambio, validación condicional y mapeo en `onSubmit()`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=AthleteControllerTest
```

#### Resultados de Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `AthleteControllerTest` | 12 | 12 | 0 | **PASSED** |

#### Casos de Prueba Específicos de TS-33:
1. `createAthlete_WithCustomClub_CreatesUnverifiedClubOrganization`:
   - Crea un atleta enviando `customClubName = "Escuela Comunitaria <timestamp>"`.
   - Verifica respuesta HTTP `201 Created`.
   - Verifica `currentClub.name` con el nombre indicado y `currentClub.verifiedOfficial = false`.
2. `createAthlete_WithExistingCustomClubCaseInsensitive_ReusesClub`:
   - Registra un primer atleta con `customClubName = "semillero barrial <timestamp>"` (minúsculas).
   - Registra un segundo atleta con otro tutor enviando `customClubName = "SEMILLERO BARRIAL <timestamp>"` (mayúsculas).
   - Verifica que ambos atletas quedan vinculados exactamente al mismo `currentClub.id` sin duplicar registros.

---

### 2.2. Frontend (Angular 18+ / Build de Producción y SSR)
Comando ejecutado:
```bash
npm run build
```

#### Resultados:
* Compilación exitosa en 15.62 segundos.
* 0 errores de tipado o vinculación de formularios reactivos.
* 11 rutas estáticas prerenderizadas con SSR.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Creación de Atleta con Club Personalizado vía cURL
```bash
curl -X POST http://localhost:8080/api/v1/athletes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_TUTOR>" \
  -d '{
    "firstName": "Santiago",
    "lastName": "Paredes",
    "birthDate": "2013-09-14",
    "primaryPosition": "DELANTERO_CENTRO",
    "preferredFoot": "DERECHO",
    "nationality": "Venezuela",
    "customClubName": "Academia Talentos del Barrio FC"
  }'
```

**Respuesta Esperada (`201 Created`):**
```json
{
  "id": "uuid-generado",
  "fullName": "Santiago Paredes",
  "slug": "santiago-paredes",
  "currentClub": {
    "id": "uuid-del-club",
    "name": "Academia Talentos del Barrio FC",
    "city": "No especificada",
    "state": "Carabobo",
    "country": "Venezuela",
    "verifiedOfficial": false
  }
}
```

### 3.2. Verificación en Interfaz de Usuario
1. Iniciar sesión como tutor e ingresar a `/dashboard`.
2. Abrir el modal **"Registrar Atleta"**.
3. En la Sección 2, desplegar el selector **"Club o Academia Formativa Actual"**.
4. Seleccionar la opción **"Otro (indicar club o academia)..."**.
5. Verificar que se despliega inmediatamente el campo **"Nombre de tu Escuela o Club Formativo *"**.
6. Intentar enviar el formulario dejando este campo vacío; confirmar que se muestra el error en rojo: *"Indica el nombre de la escuela o club formativo (máx. 150 caracteres)"*.
7. Tipear un nombre de club válido (ej. "Academia Monagas Junior") y completar los demás datos obligatorios.
8. Enviar el formulario y verificar que el atleta se guarda y despliega el nombre de la academia en su tarjeta del dashboard.
9. Volver a abrir el modal y constatar que al seleccionar "Sin afiliación" o un club existente, el campo de texto se oculta automáticamente y no genera errores de validación.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio | Verificación | Estado |
|---|---|---|
| 1. Selector de club incluye opción "Otro" | `<option value="OTHER">` en template | **CUMPLIDO** |
| 2. Despliegue interactivo de campo de texto para el club | Directiva `@if (isOtherClubSelected)` y animación CSS | **CUMPLIDO** |
| 3. Campo obligatorio mientras "Otro" esté seleccionado | `setValidators([Validators.required])` reactivo | **CUMPLIDO** |
| 4. Ocultamiento al elegir otra opción sin bloquear el form | `clearValidators()` y reset a `""` | **CUMPLIDO** |
| 5. Creación en backend con `verified_official = false` | Verificado en `AthleteControllerTest` | **CUMPLIDO** |
| 6. Reutilización insensible a mayúsculas/minúsculas | Verificado con `findByNameIgnoreCase` en test | **CUMPLIDO** |
| 7. Club disponible para futuros registros | Persistido en `clubs_organizations` | **CUMPLIDO** |
| 8. Tests de backend y build de frontend en verde | 12/12 tests OK y `npm run build` exitoso | **CUMPLIDO** |
| 9. Documento de pruebas generado en `test/` | Archivo generado en workspace | **CUMPLIDO** |
| 10. Tarjeta movida a `in testing` | Acción en Trello completada | **CUMPLIDO** |
