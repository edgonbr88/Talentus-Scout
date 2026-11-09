# Plan de Implementación: [TS-69] Registro y Gestión Autónoma para Atletas Mayores de Edad (Rol ATHLETE)

**ID Tarea:** TS-69  
**Tarjeta Trello:** [https://trello.com/c/GgVvDc3c](https://trello.com/c/GgVvDc3c)  
**Fecha:** 2026-11-09  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
* **Problema:** En el diseño inicial del MVP, el acceso y administración de la cédula del futbolista estaba restringido exclusivamente a tutores legales para proteger a menores de edad bajo la LOPNNA (Art. 65). No obstante, en las categorías juveniles competitivas (Sub-18, Sub-19, Sub-20 y contratos de formación profesional) existe un segmento crucial de deportistas que ya han alcanzado la mayoría de edad (>= 18 años). Obligarlos a depender de un tutor para registrarse o actualizar sus videos y logros genera fricción operativa y limita la adopción directa de la plataforma.
* **Solución:** Habilitar un flujo de registro autónomo para atletas mayores de edad (`ATHLETE`) donde el usuario gestiona directamente su propio perfil deportivo, sube sus videos a Cloudflare Stream, actualiza métricas y administra su suscripción/pagos.
* **Restricciones Legales y Normativa LOPNNA / FIFA:**
  * Al contar con 18 años cumplidos al momento del registro, el atleta no requiere el consentimiento tutelar parental de la LOPNNA Art. 65.
  * Requiere aceptar directamente los Términos y Condiciones generales y la cláusula formal de cesión de derechos de imagen y difusión deportiva institucional.
  * Si un usuario menor de 18 años intenta registrarse por esta vía, el sistema valida su fecha de nacimiento y bloquea el registro con un mensaje explicativo y enlace hacia `/register-tutor`.

---

## 2. Alcance Técnico y Arquitectura
* **Submódulo `talentus-scout-migrations`:**
  * Migración DDL para agregar el valor `'ATHLETE'` al enum `user_role` de PostgreSQL.
  * Creación de la tabla de trazabilidad legal `athlete_legal_consents` (almacena auditoría de IP, User-Agent, versión de términos y fecha de aceptación).
* **Submódulo `talentus-scout-be` (Spring Boot 3 / Java 21):**
  * Actualización de `UserRole.java` (`ATHLETE`).
  * Creación de entidad `AthleteLegalConsent.java` y su repositorio JPA.
  * DTOs para registro de atleta mayor de edad (`RegisterAdultAthleteRequest`, `RegisterAdultAthleteResponse`).
  * Validador personalizado o validación en servicio de mayoría de edad (`birthDate <= LocalDate.now().minusYears(18)`).
  * Nuevo endpoint `POST /api/v1/auth/register-athlete` en `AuthController.java` y lógica en `AuthService.java`.
  * Ajuste de reglas de seguridad `@PreAuthorize` en controladores (`AthleteController`, `VideoController`, `PaymentController`) para admitir `ROLE_ATHLETE` en conjunción con `ROLE_TUTOR`.
* **Submódulo `talentus-scout-fe` (Angular 18+ Standalone & SSR):**
  * Nuevo componente `RegisterAthleteComponent` (`register-athlete.component.ts` y `register-athlete.component.html` separados) con flujo en 2 pasos:
    1. Paso 1: Cuenta, edad (cálculo dinámico en tiempo real y bloqueo si < 18) y consentimiento legal.
    2. Paso 2: Ficha deportiva inicial (posición, pie, datos físicos).
  * Actualización de `AuthService.ts` con signal/computed `isAthlete`.
  * Actualización de `tutor-dashboard.component.html` para adaptar la experiencia cuando `isAthlete()` (ocultar botón "Registrar otro atleta", acotando la vista a su perfil propio).
  * Enlaces de registro en Navbar y Landing page.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
* **Archivo de migración:** `talentus-scout-migrations/migrations/20261109120000_add_athlete_role_and_legal_consents.sql`
* **Directiva:** Queda terminantemente **PROHIBIDO ejecutar migraciones directamente en la base de datos de producción Neon**. Se ejecutan únicamente en el contenedor local de desarrollo (`talentus-postgres-dev`) mediante dbmate.

### Script DDL Canónico:
```sql
-- migrate:up
-- 1. Incorporar el nuevo rol ATHLETE al enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ATHLETE';

-- 2. Crear tabla de trazabilidad legal para consentimiento de atletas mayores de edad
CREATE TABLE IF NOT EXISTS athlete_legal_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_terms BOOLEAN NOT NULL DEFAULT TRUE,
    accepted_institutional_diffusion BOOLEAN NOT NULL DEFAULT TRUE,
    terms_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_athlete_legal_consents_athlete ON athlete_legal_consents(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_legal_consents_user ON athlete_legal_consents(user_id);

-- migrate:down
DROP TABLE IF EXISTS athlete_legal_consents;
```

---

## 4. Backend: Spring Boot 3 (Java 21)

### 4.1. Entidades y Enums
1. **`com.talentus.scout.domain.enums.UserRole`**:
   * Agregar valor `ATHLETE`:
   ```java
   public enum UserRole {
       TUTOR,
       SCOUT,
       VERIFIER_ORG,
       ADMIN,
       ATHLETE
   }
   ```
2. **`com.talentus.scout.domain.entity.AthleteLegalConsent`**:
   * Modelado con Lombok: `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
   * Campos:
     * `UUID id` (`@Id @UuidGenerator(style = UuidGenerator.Style.VERSION_7)`)
     * `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "athlete_id", nullable = false) private Athlete athlete;`
     * `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;`
     * `Boolean acceptedTerms;`
     * `Boolean acceptedInstitutionalDiffusion;`
     * `String termsVersion;`
     * `String ipAddress;`
     * `String userAgent;`
     * `Instant acceptedAt;`

### 4.2. Repositorios
* **`com.talentus.scout.repository.AthleteLegalConsentRepository`**:
  * `JpaRepository<AthleteLegalConsent, UUID>`

### 4.3. DTOs
1. **`com.talentus.scout.web.dto.RegisterAdultAthleteRequest`**:
   * `@Getter, @Setter, @NoArgsConstructor, @AllArgsConstructor, @Builder`
   * Datos de Usuario:
     * `@NotBlank @Email String email;`
     * `@NotBlank @Size(min = 8) String password;`
     * `@NotBlank String fullName;`
     * `@NotBlank String phoneNumber;`
     * `String country;`
     * `String state;`
     * `String address;`
     * `@NotNull LocalDate birthDate;`
     * `@AssertTrue(message = "Debes aceptar los términos y condiciones") Boolean acceptTerms;`
     * `@AssertTrue(message = "Debes autorizar la cláusula de difusión institucional") Boolean acceptInstitutionalDiffusion;`
   * Datos Deportivos:
     * `@NotBlank String primaryPosition;`
     * `String secondaryPosition;`
     * `@NotBlank String preferredFoot;` // LEFT, RIGHT, BOTH
     * `String gender;` // MALE, FEMALE
     * `String nationality;`
     * `String currentClubName;`
     * `BigDecimal heightCm;`
     * `BigDecimal weightKg;`
     * `String bio;`
     * `MultipartFile idDocumentFile;` (Opcional en registro inicial)
     * `MultipartFile selfieFile;` (Opcional en registro inicial)
2. **`com.talentus.scout.web.dto.RegisterAdultAthleteResponse`**:
   * `@Getter, @Setter, @NoArgsConstructor, @AllArgsConstructor, @Builder`
   * `UUID userId;`
   * `UUID athleteId;`
   * `String token;`
   * `String fullName;`
   * `String email;`
   * `String role;`
   * `String slug;`

### 4.4. Servicios (`AuthService`)
* Método `@Transactional public RegisterAdultAthleteResponse registerAdultAthlete(RegisterAdultAthleteRequest request, String ipAddress, String userAgent)`:
  1. Validar edad: Si `Period.between(request.getBirthDate(), LocalDate.now()).getYears() < 18`, arrojar `IllegalArgumentException` o `BusinessRuleException("El registro directo de atleta requiere tener al menos 18 años cumplidos. Si eres menor de edad, tu registro debe ser gestionado por tu tutor legal.")`.
  2. Validar que el email no esté registrado (`userRepository.existsByEmail(...)`).
  3. Crear `User` con `role = UserRole.ATHLETE`, `status = AccountStatus.ACTIVE`, `isProfileCompleted = true`.
  4. Generar slug único para el atleta (`slugService.generateUniqueSlug(firstName, lastName)`).
  5. Crear `Athlete` con `tutor = savedUser`, `birthDate = request.getBirthDate()`, `firstName`, `lastName`, etc.
  6. Crear `AthleteLegalConsent` guardando la trazabilidad de IP y User-Agent.
  7. Procesar subida de documento/selfie si fueron provistos en el request.
  8. Generar token JWT con claims `role: ATHLETE` y retornar respuesta.

### 4.5. Controladores y Seguridad
1. **`com.talentus.scout.web.controller.AuthController`**:
   * `POST /api/v1/auth/register-athlete` (consumes `multipart/form-data` o `application/json`).
2. **Ajuste de `@PreAuthorize` en Controladores**:
   * **`AthleteController`**:
     * `GET /api/v1/athletes/me` -> `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`
     * `GET /api/v1/athletes/{id}` -> `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE', 'ADMIN')")`
     * Endpoints de actualización, foto de perfil, etc., protegidos por `@athleteSecurity.isOwner(#id, authentication)` (funciona nativamente ya que `athlete.tutor_id == user.id`).
   * **`VideoController`**:
     * Endpoints de subida y eliminación de videos -> `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`
   * **`PaymentController`**:
     * Endpoints de checkout y pagos -> `@PreAuthorize("hasAnyRole('TUTOR', 'ATHLETE')")`

---

## 5. Frontend: Angular 18+ (Standalone & SSR)

### 5.1. Directiva de Diseño y Estilo
* Aplicar las directrices de `fe-desing.md`: Bento Grid, paleta intencional (fondo oscuro carbón, acentos en verde esmeralda y oro para fútbol), tipografía limpia y copywriting empático y humano.
* **Separación Obligatoria de Plantillas:** Prohibido el uso de templates inline. Cada componente debe tener sus archivos `.component.ts` y `.component.html` desacoplados.

### 5.2. Componentes a Crear / Modificar
1. **`RegisterAthleteComponent`**:
   * Ruta: `src/app/features/auth/register-athlete/`
   * Archivos: `register-athlete.component.ts`, `register-athlete.component.html`, `register-athlete.component.css`, `register-athlete.component.spec.ts`.
   * **Paso 1 (Identidad y Cuenta):**
     * Inputs: Nombre completo, correo, contraseña, teléfono, selector de fecha de nacimiento.
     * Al cambiar la fecha de nacimiento: cálculo automático de edad. Si `edad < 18`, bloquea el botón de continuar y despliega una alerta preventiva destacada: *"Según la normativa LOPNNA, los menores de 18 años deben ser registrados y representados por su tutor legal. [Haz clic aquí para registrarte como Tutor](/register-tutor)"*.
     * Checkboxes de aceptación de Términos de Servicio y Difusión Institucional (con modal de lectura reutilizando `ScoutTermsModalComponent` o equivalente adaptado).
   * **Paso 2 (Ficha Deportiva):**
     * Posición principal (Arquero, Defensa Central, Lateral, Mediocentro, Extremo, Delantero), pie preferido, club o academia actual, altura y peso opcionales.
     * Botón "Completar Registro y Entrar al Radar".
2. **`AuthService.ts`**:
   * Agregar `registerAdultAthlete(formData: FormData): Observable<RegisterAdultAthleteResponse>`.
   * Agregar computed signal: `readonly isAthlete = computed(() => this.currentUser()?.role === 'ATHLETE');`.
   * Actualizar computed signal de dashboard: `readonly canAccessAthleteDashboard = computed(() => this.isTutor() || this.isAthlete());`.
3. **`TutorDashboardComponent`**:
   * Ocultar condicionalmente los botones de añadir atletas adicionales cuando `authService.isAthlete()` es verdadero:
     * Botón `openAthleteModal()` en encabezado y vista vacía: `*ngIf="!authService.isAthlete() && athletes.length > 0"`.
   * El título del dashboard se personaliza: si es atleta, mostrar *"Mi Ficha de Atleta"* en lugar de *"Panel de Representante"*.
4. **Navegación y Landing (`navbar.component.html`, `landing.component.html`, `app.routes.ts`)**:
   * Ruta: `{ path: 'register-athlete', component: RegisterAthleteComponent, title: 'Registro de Atleta Mayor de Edad — Talentus Scout' }`.
   * Incorporar modal o enlaces para selección de tipo de cuenta en Navbar: "¿Cómo deseas registrarte? (Tutor / Atleta +18 / Scout)".

---

## 6. Pruebas y Verificación

### 6.1. Pruebas Automatizadas Backend (Spring Boot 3)
* **`AuthAthleteRegistrationTest.java`**:
  * Registro exitoso de atleta mayor de 18 años con token JWT y rol `ATHLETE`.
  * Verificación de que el registro en `athletes` tiene `tutor_id == user.getId()`.
  * Verificación de persistencia en `athlete_legal_consents` con IP y User-Agent.
  * Rechazo con HTTP 400 cuando la fecha de nacimiento corresponde a un menor de 18 años.
  * Rechazo con HTTP 409 cuando el correo ya existe.
  * Validación de autorización en `AthleteController` y `VideoController` para usuarios con `ROLE_ATHLETE`.

### 6.2. Pruebas Automatizadas Frontend (Angular 18+)
* **`register-athlete.component.spec.ts`**:
  * Validación de campos requeridos.
  * Bloqueo y mensaje de advertencia cuando la fecha de nacimiento ingresada tiene menos de 18 años.
  * Envío exitoso del formulario y redirección al dashboard del atleta.
* **`tutor-dashboard.component.spec.ts`**:
  * Verificación de que el botón de crear nuevos atletas no se renderiza para el rol `ATHLETE`.

### 6.3. Verificación Manual con cURL
```bash
# 1. Intento de registro con menor de edad (debe fallar con HTTP 400)
curl -s -X POST http://localhost:8080/api/v1/auth/register-athlete \
  -F "email=menor@example.com" \
  -F "password=Password123!" \
  -F "fullName=Carlos Menor" \
  -F "phoneNumber=+584121234567" \
  -F "birthDate=2010-05-15" \
  -F "primaryPosition=DELANTERO" \
  -F "preferredFoot=DERECHO" \
  -F "acceptTerms=true" \
  -F "acceptInstitutionalDiffusion=true"

# 2. Registro exitoso de atleta mayor de edad (>= 18 años)
curl -s -X POST http://localhost:8080/api/v1/auth/register-athlete \
  -F "email=atleta18@example.com" \
  -F "password=Password123!" \
  -F "fullName=Alejandro Mayor" \
  -F "phoneNumber=+584129876543" \
  -F "birthDate=2006-03-10" \
  -F "primaryPosition=MEDIOCENTRO" \
  -F "preferredFoot=DERECHO" \
  -F "gender=MALE" \
  -F "acceptTerms=true" \
  -F "acceptInstitutionalDiffusion=true"
```

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Fase 1: Base de Datos y Migración DDL**
  - [x] Crear migración `20261109120000_add_athlete_role_and_legal_consents.sql` en `talentus-scout-migrations/migrations/`.
  - [x] Ejecutar `dbmate up` localmente sobre `talentus-postgres-dev`.
  - [x] Confirmar que el tipo enum `user_role` y la tabla `athlete_legal_consents` existen.
- [x] **Fase 2: Backend (Spring Boot 3)**
  - [x] Actualizar enum `UserRole.java` con `ATHLETE`.
  - [x] Crear entidad `AthleteLegalConsent.java` y `AthleteLegalConsentRepository.java`.
  - [x] Crear DTOs `RegisterAdultAthleteRequest.java` y `RegisterAdultAthleteResponse.java`.
  - [x] Implementar método `registerAdultAthlete` en `AuthService.java` con validación estricta de edad >= 18 años y trazabilidad legal.
  - [x] Exponer endpoint `POST /api/v1/auth/register-athlete` en `AuthController.java`.
  - [x] Actualizar anotaciones `@PreAuthorize` en `AthleteController`, `VideoController` y `PaymentController` para autorizar a `ROLE_ATHLETE`.
  - [x] Crear pruebas de integración en `AuthAthleteRegistrationTest.java` y verificar con `./mvnw test`.
- [x] **Fase 3: Frontend (Angular 18+)**
  - [x] Crear componente standalone `RegisterAthleteComponent` con plantillas desacopladas (`.ts`, `.html`, `.css`).
  - [x] Implementar validación reactiva de edad en tiempo real con alerta legal LOPNNA si es menor de edad.
  - [x] Implementar modal de términos y cesión de imagen.
  - [x] Actualizar `AuthService.ts` con llamada HTTP y signal `isAthlete()`.
  - [x] Adaptar `TutorDashboardComponent` para ocultar opciones de creación de atletas múltiples cuando `isAthlete()`.
  - [x] Configurar ruta `/register-athlete` en `app.routes.ts` y enlaces en Navbar y Landing page.
  - [x] Ejecutar pruebas unitarias de frontend y verificar compilación (`npm run build`).
- [x] **Fase 4: Documentación y Trazabilidad**
  - [x] Generar plan de pruebas en `test/TS-69-test-plan-registro-gestion-autonoma-atletas-mayores-edad.md`.
  - [x] Crear ramas `feature/TS-69-...` en los submódulos afectados y en el repositorio principal.
  - [x] Subir commits y abrir Pull Requests en GitHub.
  - [x] Mover la tarjeta en Trello a `in testing` con el comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] El enum `user_role` en PostgreSQL y Spring Boot 3 incluye el valor `ATHLETE`.
- [x] El endpoint `POST /api/v1/auth/register-athlete` valida estrictamente mayoría de edad (rechaza con HTTP 400 si `edad < 18` años).
- [x] El registro crea el usuario con rol `ATHLETE`, la cédula deportiva en `athletes` con `tutor_id` autorreferenciado al usuario, y la trazabilidad de consentimiento legal en `athlete_legal_consents`.
- [x] El atleta adulto puede autenticarse, subir videos a Cloudflare Stream y gestionar sus métricas, perfil y pagos desde su dashboard.
- [x] El dashboard oculta el botón de agregar nuevos atletas cuando el usuario autenticado tiene rol `ATHLETE`.
- [x] El frontend cuenta con la ruta `/register-athlete` con diseño Bento/Dark, validación reactiva de edad y separación de plantillas HTML y TS.
- [x] Todas las pruebas unitarias y de integración pasan satisfactoriamente.
- [x] Pull Requests abiertos hacia `main` en los repositorios correspondientes.
