# Plan de Pruebas y Validación — TS-69: Registro y Gestión Autónoma para Atletas Mayores de Edad (Rol ATHLETE)

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la integridad funcional, técnica, de seguridad y jurídica para el registro autónomo y la gestión de atletas mayores de edad (18+ años) bajo el rol `ATHLETE` en la plataforma Talentus Scout, asegurando el cumplimiento de normativas de protección a menores (LOPNNA Art. 65), la trazabilidad del consentimiento legal y la experiencia fluida en Frontend y Backend.

### Componentes y Artefactos Impactados:
* **Base de Datos (PostgreSQL / dbmate):**
  * Migración: `talentus-scout-migrations/migrations/20261109120000_add_athlete_role_and_legal_consents.sql`.
  * Tipo Enum: `user_role` ampliado con el valor `'ATHLETE'`.
  * Tabla nueva: `athlete_legal_consents` (trazabilidad legal: `athlete_id`, `user_id`, `accepted_terms`, `terms_version`, `accepted_at`, `ip_address`, `user_agent`).
  * Tabla `athletes`: soporte de auto-vinculación donde `tutor_id = user_id`.
* **Backend (Spring Boot 3 / Java 21):**
  * Enumeración: `UserRole.java` (`ATHLETE`).
  * Entidad JPA y Repositorio: `AthleteLegalConsent.java` y `AthleteLegalConsentRepository.java`.
  * DTOs: `RegisterAdultAthleteRequest.java` y `RegisterAdultAthleteResponse.java`.
  * Servicios:
    * `AuthService.java`: método `registerAdultAthlete` con validación estricta de mayoría de edad (`>= 18 años`), persistencia de usuario `ATHLETE`, registro de expediente de atleta y auditoría en `athlete_legal_consents`.
    * `VideoService.java`: autorización ampliada para permitir gestión de videos a usuarios con rol `ATHLETE`.
  * Controladores REST y Seguridad:
    * `AuthController.java`: endpoints `/api/v1/auth/register-athlete` (soporte `multipart/form-data` y `application/json`).
    * `@PreAuthorize` actualizado a `hasAnyRole('TUTOR', 'ATHLETE', 'ADMIN')` en `AthleteController.java`, `VideoController.java` y `PaymentController.java`.
  * Suite de Pruebas: `AuthAthleteRegistrationTest.java` (6/6 tests completados exitosamente).
* **Frontend (Angular 18+ / Bento Design):**
  * Modelos e Interfaces: `user.model.ts` (`ATHLETE`) y `auth.model.ts` (`RegisterAdultAthletePayload`).
  * Servicio de Autenticación: `auth.service.ts` (`isAthlete`, `canAccessAthleteDashboard`, `registerAdultAthlete`).
  * Componente Modal: `AthleteTermsModalComponent` (`athlete-terms-modal.component.ts`, `.html`, `.css`).
  * Componente de Registro: `RegisterAthleteComponent` (`register-athlete.component.ts`, `.html`, `.css`).
  * Adaptación del Dashboard: `tutor-dashboard.component.html` (ocultamiento de botón "Registrar otro atleta" cuando el usuario es `ATHLETE`).
  * Enrutamiento y Navegación: `app.routes.ts` (`/register-athlete`), enlaces en `navbar.component.html` y landing page.
  * Pruebas Unitarias: `register-athlete.component.spec.ts` y `athlete-terms-modal.component.spec.ts`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (Spring Boot 3 / JUnit 5 / MockMvc)
Comando ejecutado:
```bash
cd talentus-scout-be && ./mvnw test -Dtest=AuthAthleteRegistrationTest
```
**Resultado:** `BUILD SUCCESS` (6/6 pruebas exitosas, 0 fallos, 0 errores).

| Caso de Prueba | Descripción | Resultado |
|---|---|:---:|
| `testRegisterAdultAthlete_Success` | Valida registro exitoso de atleta de 19 años con rol `ATHLETE`, auto-vinculación en `athletes` (`tutor_id = user_id`), consentimiento legal registrado en `athlete_legal_consents` y tokens JWT emitidos | **PASSED** |
| `testRegisterAdultAthlete_Underage_Rejected` | Rechaza intento de registro con atleta menor de 18 años (16 años) retornando HTTP 400 Bad Request y mensaje explícito de protección al menor bajo LOPNNA Art. 65 | **PASSED** |
| `testRegisterAdultAthlete_TermsNotAccepted_Rejected` | Rechaza registro con `acceptedTerms=false` retornando HTTP 400 Bad Request | **PASSED** |
| `testRegisterAdultAthlete_DuplicateEmail_Rejected` | Rechaza registro con correo electrónico ya existente retornando HTTP 409 Conflict | **PASSED** |
| `testAthleteCanAccessMyAthletes` | Verifica que un atleta autenticado con rol `ATHLETE` puede acceder a su propio perfil mediante el endpoint `GET /api/v1/athletes/my-athletes` | **PASSED** |
| `testAthleteCannotAccessOtherTutorAthletes` | Valida que un atleta mayor de edad autenticado no puede acceder ni modificar expedientes pertenecientes a otros tutores o atletas ajenos (HTTP 403 Forbidden) | **PASSED** |

### 2.2. Frontend (Angular 18+ / Jasmine / Karma / TypeScript)
Pruebas unitarias de componentes de registro y términos:
* `AthleteTermsModalComponent`:
  * Renderizado condicional mediante `@if (isOpen)`.
  * Visualización de los 4 pilares legales de autonomía deportiva y uso de imagen.
  * Emisión de eventos `closeModal` y `acceptTerms`.
* `RegisterAthleteComponent`:
  * Flujo en 2 pasos (Paso 1: Credenciales, fecha de nacimiento y consentimientos; Paso 2: Perfil deportivo y documentación).
  * Cálculo dinámico de edad en tiempo real al ingresar la fecha de nacimiento.
  * Bloqueo visual e informativo cuando la edad es menor a 18 años, con botón de redirección hacia `/register-tutor`.
  * Apertura interactiva del modal de términos legales y vinculación automática al checkbox.
  * Envío de formulario mediante `FormData` con archivos adjuntos.

### 2.3. Compilación de Producción Frontend y Generación SSR
Comando ejecutado:
```bash
cd talentus-scout-fe && npm run build
```
**Resultado:** `Application bundle generation complete. Prerendered 17 static routes.` (Compilación sin errores de tipado o plantillas).

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Prueba cURL Backend: Rechazo de Menor de Edad (HTTP 400 - LOPNNA Art. 65)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-athlete \
  -H "Content-Type: application/json" \
  -d '{
    "email": "atleta.menor@talentusscout.com",
    "password": "Password123*",
    "fullName": "Joven Promesa",
    "phoneNumber": "+584121112233",
    "birthDate": "2010-05-15",
    "primaryPosition": "DELANTERO",
    "dominantFoot": "DIESTRO",
    "heightCm": 168.0,
    "weightKg": 58.0,
    "acceptedTerms": true
  }'
```
**Respuesta Esperada:**
```json
{
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "El registro autónomo de atletas está reservado exclusivamente para personas mayores de 18 años. De conformidad con el Artículo 65 de la LOPNNA y las normativas FIFA de protección al menor, los deportistas menores de edad deben ser registrados y representados por su padre, madre o tutor legal en la sección correspondiente."
}
```

### 3.2. Prueba cURL Backend: Rechazo por Falta de Aceptación de Términos (HTTP 400)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-athlete \
  -H "Content-Type: application/json" \
  -d '{
    "email": "atleta.sin.terminos@talentusscout.com",
    "password": "Password123*",
    "fullName": "Carlos Sin Consentimiento",
    "phoneNumber": "+584123334455",
    "birthDate": "2004-01-10",
    "primaryPosition": "MEDIOCAMPISTA",
    "dominantFoot": "ZURDO",
    "acceptedTerms": false
  }'
```
**Respuesta Esperada:**
```json
{
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "Debe aceptar obligatoriamente los Términos y Condiciones para Atletas Mayores de Edad y las Políticas de Privacidad"
}
```

### 3.3. Prueba cURL Backend: Registro Exitoso de Atleta Mayor de Edad (HTTP 201)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-athlete \
  -H "CF-Connecting-IP: 190.202.45.10" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) TalentusScoutApp" \
  -F "email=atleta.mayor.curl@talentusscout.com" \
  -F "password=Password123*" \
  -F "fullName=Marcos Adulto Goleador" \
  -F "phoneNumber=+584149876543" \
  -F "birthDate=2003-08-20" \
  -F "primaryPosition=DELANTERO" \
  -F "secondaryPosition=EXTREMO" \
  -F "dominantFoot=DIESTRO" \
  -F "heightCm=181.5" \
  -F "weightKg=75.0" \
  -F "currentClub=Deportivo Caracas FC" \
  -F "idDocumentType=V" \
  -F "idDocumentNumber=25678901" \
  -F "acceptedTerms=true" \
  -F "identityDocumentFile=@/tmp/dummy_id.pdf" \
  -F "profilePhoto=@/tmp/dummy_photo.jpg"
```
**Respuesta Esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "user": {
    "id": "<uuid-usuario>",
    "email": "atleta.mayor.curl@talentusscout.com",
    "fullName": "Marcos Adulto Goleador",
    "role": "ATHLETE"
  },
  "athleteId": "<uuid-atleta>",
  "message": "Registro de atleta completado exitosamente con gestión autónoma de perfil"
}
```

### 3.4. Prueba cURL Backend: Acceso a su Propio Expediente con Rol ATHLETE (HTTP 200)
```bash
curl -X GET http://localhost:8080/api/v1/athletes/my-athletes \
  -H "Authorization: Bearer <TOKEN_DE_ATLETA>"
```
**Respuesta Esperada:**
HTTP 200 OK con un arreglo que contiene exactamente su propio registro de atleta (`tutor_id = user_id`).

### 3.5. Verificación de UI en Frontend
1. Navegar a `http://localhost:4200/` y observar el botón "Soy Atleta Mayor de Edad" en la barra de navegación y en el Hero banner.
2. Hacer clic en "Registrarme como Atleta" y llegar a `/register-athlete`.
3. Ingresar una fecha de nacimiento que corresponda a un menor de 18 años (ej. año 2012):
   - Verificar la aparición del banner de alerta con advertencia jurídica LOPNNA Art. 65.
   - Constatar que el botón "Continuar al Perfil Deportivo" se deshabilita.
   - Constatar que el botón "Registrarme a través de mi Representante Legal" redirige a `/register-tutor`.
4. Cambiar la fecha de nacimiento a una persona de 20 años:
   - El mensaje de bloqueo desaparece y se muestra el indicador de mayoría de edad.
5. Hacer clic en el enlace "Leer Términos y Condiciones":
   - El modal Bento con los 4 pilares se abre.
   - Al pulsar "Acepto los Términos y Condiciones", el modal se cierra y el checkbox queda marcado automáticamente.
6. Completar el paso 2 con datos deportivos, club y adjuntos de documento y foto.
7. Al enviar, el usuario queda autenticado y es dirigido a `/dashboard`.
8. En el Dashboard, constatar que no aparece el botón "Registrar otro atleta", focalizando la interfaz en su perfil individual.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Cumplimiento |
|---|:---:|---|
| **DoD-1:** Rol `ATHLETE` creado en PostgreSQL y mapeado en `UserRole.java`. | **CUMPLIDO** | Migración `20261109120000_add_athlete_role_and_legal_consents.sql` ejecutada localmente y enum actualizado. |
| **DoD-2:** Tabla `athlete_legal_consents` con trazabilidad completa de consentimiento. | **CUMPLIDO** | Tabla creada con IP, User-Agent, versión '1.0' y timestamp de aceptación. |
| **DoD-3:** Auto-vinculación en `athletes` (`tutor_id = user_id`). | **CUMPLIDO** | `AuthService.java` asigna `athlete.setTutor(user)` garantizando auto-gestión del perfil. |
| **DoD-4:** Validación estricta de edad `>= 18` con mensaje explicativo de LOPNNA Art. 65. | **CUMPLIDO** | Validación tanto en Frontend (dinámica) como en Backend (`BusinessRuleException` probada en JUnit). |
| **DoD-5:** Formulario de registro en Frontend en 2 pasos bajo Bento Pitch design. | **CUMPLIDO** | `RegisterAthleteComponent` implementado con separación `.html`, `.ts`, `.css` y tokens de diseño. |
| **DoD-6:** Modal de lectura y aceptación de términos para atletas. | **CUMPLIDO** | `AthleteTermsModalComponent` implementado y probado. |
| **DoD-7:** Módulos de subida de documento de identidad y selfie/foto. | **CUMPLIDO** | Soporte multipart en backend y carga de archivos en frontend. |
| **DoD-8:** Autorización en controladores y servicios para `ATHLETE`. | **CUMPLIDO** | `@PreAuthorize` actualizado en `AthleteController`, `VideoController`, `PaymentController` y `VideoService`. |
| **DoD-9:** Dashboard adaptado para no permitir registrar atletas adicionales al rol `ATHLETE`. | **CUMPLIDO** | Directiva condicional `@if (!authService.isAthlete())` en `tutor-dashboard.component.html`. |
| **DoD-10:** Pruebas unitarias de Backend (6/6) y compilación exitosa de Frontend. | **CUMPLIDO** | `./mvnw test` OK y `npm run build` con SSR prerenderizado exitoso. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Cumplimiento Normativo LOPNNA Art. 65 y FIFA:**
   - Queda totalmente impedido que un menor de 18 años cree una cuenta autónoma sin supervisión legal. El sistema educa activamente al usuario dirigiéndolo al portal de tutores.
2. **Cálculo Exacto de Mayoría de Edad (Fechas Bisiestas y Días Exactos):**
   - Utilización de `Period.between(birthDate, LocalDate.now()).getYears()`, asegurando que una persona con 17 años y 364 días sea bloqueada hasta el cumplimiento efectivo de su cumpleaños número 18.
3. **Aislamiento Multitenant de Atletas:**
   - `AthleteSecurity.isOwner` y `AthleteRepository.findByTutorId` garantizan que un usuario con rol `ATHLETE` sólo tenga visibilidad y mutabilidad sobre su propio registro, protegiendo los perfiles de otros tutores y atletas.
4. **Resistencia de Carga y SSR:**
   - La página `/register-athlete` y los modelos TypeScript han sido diseñados compatibles con Server-Side Rendering (Angular SSR), evitando el uso de variables globales de navegador (`window`/`localStorage`) fuera de guards o servicios seguros.
