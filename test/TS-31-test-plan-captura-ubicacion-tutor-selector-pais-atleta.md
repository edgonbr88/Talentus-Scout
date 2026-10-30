# Plan de Pruebas: [TS-31] Captura de Ubicación y Domicilio en Registro de Tutor y Selector de País en Registro de Atleta

**ID Tarea:** TS-31  
**Tarjeta Trello:** https://trello.com/c/pV8JqBaI  
**Fecha:** 2026-10-13  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es certificar la captura y persistencia de ubicación y domicilio del tutor legal, así como la estandarización mediante selector de los 5 países autorizados para el registro de atletas:
1. Normalización y captura en base de datos de las columnas `country`, `state` y `address` en la tabla `users` mediante migración DDL dbmate.
2. Validación en backend de que el país del tutor pertenezca a la whitelist autorizada (Venezuela, Colombia, Chile, Perú, Ecuador).
3. Exposición de datos de ubicación del tutor en el perfil autenticado (`/api/v1/auth/me`).
4. Validación en backend de que la nacionalidad del atleta pertenezca a la whitelist de países autorizados.
5. Inclusión de campos de País (select con default "Venezuela"), Estado/Provincia (obligatorio) y Dirección de Habitación (opcional) en el formulario de registro de tutor en Frontend.
6. Reemplazo del input libre de nacionalidad por un select estandarizado con los 5 países autorizados en el modal de registro de atletas en Frontend.

### Componentes Impactados
* **Base de Datos / Migraciones (`talentus-scout-migrations`):**
  * `20261013150000_add_address_fields_to_users.sql`
* **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  * `com.talentus.scout.domain.entity.User`: Mapeo de `country`, `state`, `address`.
  * `com.talentus.scout.web.dto.RegisterTutorRequest`: Validaciones `@NotBlank`, `@Pattern`, `@Size`.
  * `com.talentus.scout.web.dto.UserProfileResponse`: Inclusión de `country`, `state`, `address`.
  * `com.talentus.scout.web.dto.CreateAthleteRequest`: Validación regex de nacionalidad autorizada.
  * `com.talentus.scout.service.AuthService`: Persistencia de ubicación en la creación de usuario.
  * `com.talentus.scout.web.controller.AuthController`: Mapeo de campos en `/api/v1/auth/me`.
  * `com.talentus.scout.web.controller.RegisterTutorTest`: Pruebas de registro con datos válidos e inválidos.
  * `com.talentus.scout.web.controller.AthleteControllerTest`: Pruebas de creación de atleta con país autorizado.
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `src/app/core/models/auth.model.ts` y `src/app/core/models/user.model.ts`: Atributos de ubicación.
  * `src/app/features/auth/register-tutor/register-tutor.component.ts` y `.html`: Formulario con selector de país, estado y dirección.
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts` y `.html`: Selector estandarizado de países.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
./mvnw test -Dtest=RegisterTutorTest,AthleteControllerTest
```

#### Resultados de Suite:
| Suite de Pruebas | Tests Ejecutados | Aprobados | Fallos | Estado |
|---|---|---|---|---|
| `RegisterTutorTest` | 6 | 6 | 0 | **PASSED** |
| `AthleteControllerTest` | 10 | 10 | 0 | **PASSED** |
| **Total Backend** | **16** | **16** | **0** | **100% OK** |

#### Casos de Prueba Verificados:
1. `registerTutor_WithValidAddressFields_Returns201AndSetsAddressFields`: Tutor registra país válido, estado y dirección, persistiendo correctamente.
2. `registerTutor_WithInvalidCountry_Returns400BadRequest`: Se rechaza registro si el país no pertenece a los 5 autorizados.
3. `registerTutor_WithMissingState_Returns400BadRequest`: Se rechaza registro si falta el estado/provincia.
4. `createAthlete_WithValidData_Returns201AndGeneratedSlug`: Creación exitosa de atleta con nacionalidad autorizada.
5. `createAthlete_WithInvalidNationality_Returns400BadRequest`: Rechazo con 400 Bad Request cuando la nacionalidad no está en la lista autorizada.

---

### 2.2. Frontend (Angular 18+ / Build de Producción)
Comando ejecutado:
```bash
npm run build
```

#### Resultados:
* Compilación exitosa sin errores de tipado o rutas.
* Generación de paquetes SSR y prerendering de 11 rutas estáticas.
* 100% libre de advertencias críticas o errores de compilación.

---

## 3. Matriz de Criterios de Aceptación (DoD)

| Criterio | Verificación | Estado |
|---|---|---|
| 1. Migración DDL creada y consistente con dbmate | `20261013150000_add_address_fields_to_users.sql` | **CUMPLIDO** |
| 2. Tutor puede registrarse indicando país, estado y dirección | Campos integrados y validados en backend/frontend | **CUMPLIDO** |
| 3. API rechaza países no autorizados con 400 | Verificado en `RegisterTutorTest` | **CUMPLIDO** |
| 4. Endpoint `/api/v1/auth/me` retorna ubicación | Mapeado en `UserProfileResponse` y `AuthController` | **CUMPLIDO** |
| 5. Creación de atleta valida 5 países autorizados | Whitelist validada en `CreateAthleteRequest` | **CUMPLIDO** |
| 6. Selector desplegable de país en modal de atleta | Implementado con `@for (c of authorizedCountries)` | **CUMPLIDO** |
| 7. Suites de backend y frontend compilan y pasan | Tests ejecutados exitosamente | **CUMPLIDO** |
| 8. Documento en `test/` generado | `test/TS-31-test-plan-captura-ubicacion-tutor-selector-pais-atleta.md` | **CUMPLIDO** |
| 9. Tarjeta movida a `in testing` | Acción ejecutada en Trello | **CUMPLIDO** |
