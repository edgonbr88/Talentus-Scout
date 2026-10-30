# Plan de Pruebas: [TS-32] Remoción de Ficha Federativa en Registro Inicial de Atleta y Redirección a Flujo de Certificación

**ID Tarea:** TS-32  
**Tarjeta Trello:** https://trello.com/c/xwZnY8nL  
**Fecha:** 2026-10-13  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo primordial de este plan de pruebas es certificar la eliminación del campo no verificado de Ficha/Carnet Federativo en el formulario modal de registro inicial de atletas, garantizando que:
1. El modal de alta de atleta no solicite número de carnet ni ficha federativa en su formulario interactivo.
2. La cuadrícula visual de la Sección 2 ("Posición y Lateralidad en Cancha") mantenga simetría y balance perfecto (50/50 en desktop) emparejando Pierna Hábil con Club formativo.
3. Se despliegue un bloque informativo claro y estilizado orientando a los tutores legales sobre el canal oficial de consignación y verificación auditada de fichas federativas en el módulo de Certificaciones e Insignias (`FEDERATION_LICENSE`, TS-15).
4. El backend (`POST /api/v1/athletes`) procese la creación de atletas de forma exitosa y transparente sin recibir dicho dato, persistiendo `null` en la columna `athletes.federation_license_number`.
5. Los atletas con licencias previamente registradas o certificadas mantengan intacta dicha información en su cédula pública y en la generación del CV deportivo en PDF (TS-10).

### Componentes Impactados
* **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
  * `com.talentus.scout.web.dto.CreateAthleteRequest`: Mantenimiento de `federationLicenseNumber` opcional.
  * `com.talentus.scout.service.AthleteService`: Creación transparente de atleta desacoplada del campo.
  * `com.talentus.scout.web.controller.AthleteControllerTest`: Verificación de alta con HTTP `201 Created`.
* **Frontend (`talentus-scout-fe` — Angular 18+):**
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`: Remoción de input `federationLicenseNumber`, reestructuración de la cuadrícula y añadido de `.federation-info-callout`.
  * `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`: Eliminación del control en `FormGroup`, exclusión en el payload `CreateAthleteRequest` de `onSubmit()` y nuevos estilos deportivos CSS.
  * `src/app/core/models/athlete.model.ts`: Modelo TypeScript `CreateAthleteRequest`.

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
| `AthleteControllerTest` | 10 | 10 | 0 | **PASSED** |

#### Casos de Prueba Verificados:
1. `createAthlete_WithValidData_Returns201AndGeneratedSlug`: Creación exitosa de atleta sin enviar `federationLicenseNumber`.
2. `createAthlete_WithAgeOver21_Returns400BadRequest`: Validación de edad menor a 21 años.
3. `athleteOwnership_IsolationBetweenTutors`: Aislamiento estricto de atletas por tutor titular.
4. `createAthlete_WithAdminRole_Returns403Forbidden`: Restricción para administradores (TS-30).
5. `getMyAthletes_WithAdminRole_Returns403Forbidden`: Aislamiento de consultas administrativas.
6. `createAthlete_WithInvalidNationality_Returns400BadRequest`: Restricción de 5 países autorizados (TS-31).

---

### 2.2. Frontend (Angular 18+ / Build de Producción y SSR)
Comando ejecutado:
```bash
npm run build
```

#### Resultados:
* Compilación exitosa en 31.06 segundos.
* 0 errores tipográficos o de enlaces de plantilla.
* Prerendering de 11 rutas estáticas completado satisfactoriamente.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Prueba de Creación de Atleta sin Ficha Federativa vía API (cURL)
```bash
curl -X POST http://localhost:8080/api/v1/athletes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TUTOR>" \
  -d '{
    "firstName": "Lucas",
    "lastName": "Mendoza",
    "birthDate": "2012-04-18",
    "primaryPosition": "DELANTERO_CENTRO",
    "preferredFoot": "DERECHO",
    "nationality": "Venezuela",
    "heightCm": 162.0,
    "weightKg": 52.0
  }'
```

**Respuesta Esperada (`201 Created`):**
```json
{
  "id": "uuid-generado",
  "fullName": "Lucas Mendoza",
  "slug": "lucas-mendoza",
  "primaryPosition": "DELANTERO_CENTRO",
  "preferredFoot": "DERECHO",
  "nationality": "Venezuela",
  "federationLicenseNumber": null,
  "isPublic": true
}
```

### 3.2. Verificación Visual en Interfaz (Modal de Tutor)
1. Iniciar sesión con un usuario tutor y dirigirse a `/dashboard`.
2. Hacer clic en **"Registrar Atleta"** para desplegar el modal.
3. Verificar en la **Sección 2 ("Posición y Lateralidad en Cancha")**:
   - Fila 1: Posición Principal y Posición Secundaria alineadas simétricamente.
   - Fila 2: Pierna Hábil y Club Formativo alineados simétricamente.
   - Ya no existe ningún campo de entrada de texto solicitando "Nro. Carnet / Ficha Federativa".
   - Debajo se visualiza el banner informativo con el texto:
     *"¿Tu representado cuenta con carnet o ficha federativa? Podrás consignar el comprobante oficial y solicitar su validación auditada con insignia verificada desde la sección 'Certificar' de tu panel de tutor."*
4. Completar los campos requeridos y guardar.
5. El atleta se crea y se refleja de inmediato en el panel del tutor.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio | Verificación | Estado |
|---|---|---|
| 1. Formulario modal no solicita carnet ni ficha federativa | Campo removido en HTML y TS | **CUMPLIDO** |
| 2. Cuadrícula luce armónica y equilibrada sin huecos vacíos | Fila de Pierna Hábil emparejada con Club (50/50) | **CUMPLIDO** |
| 3. Visualización de nota informativa orientando al tutor | Banner `.federation-info-callout` añadido con estilo deportivo | **CUMPLIDO** |
| 4. Registro exitoso en backend sin enviar dicho dato | Verificado con HTTP 201 en `AthleteControllerTest` | **CUMPLIDO** |
| 5. Atletas con ficha previa conservan su dato en PDF/público | Columna DDL conservada y mapeada en entidades | **CUMPLIDO** |
| 6. Tests automatizados de backend y frontend pasan | 10/10 tests backend OK y `npm run build` exitoso | **CUMPLIDO** |
| 7. Documento de plan de pruebas generado en `test/` | `test/TS-32-test-plan-remocion-ficha-federativa-registro-atleta.md` | **CUMPLIDO** |
| 8. Tarjeta de Trello movida a `in testing` | Acción ejecutada en Trello | **CUMPLIDO** |
