# Plan de Implementación: [TS-31] Captura de Ubicación y Domicilio en Registro de Tutor y Selector de País en Registro de Atleta

**ID Tarea:** TS-31  
**Tarjeta Trello:** https://trello.com/c/pV8JqBaI  
**Fecha:** 2026-10-13  
**Estado del Plan:** COMPLETADO Y VERIFICADO  
**Agente Revisor/Planificador:** trello_planner / trello_implementer  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  1. Durante el onboarding del tutor legal, actualmente solo se capturan datos básicos de identidad (nombres, documento, teléfono, email, contraseña). Para efectos de formalización legal del expediente parental, verificación de patria potestad (LOPNNA Art. 65) y auditoría de identidad domiciliaria, es indispensable capturar el país de residencia, estado o provincia, y dirección de habitación física.
  2. En el registro de atletas, el campo de "Nacionalidad Principal" se encontraba como un campo de texto libre. Esto generaba inconsistencias de normalización (por ejemplo, "venezuela", "VE", "Vzla", "venezolana") y dificultaba los filtros por país en el directorio de talentos. Se requiere estandarizar la selección a los 5 países autorizados en el MVP: Venezuela, Colombia, Chile, Perú y Ecuador.
- **Impacto:** Normalización estricta de datos geográficos, expedientes de tutores completos y auditables, y selección fluida y sin errores tipográficos en el registro de atletas.
- **Restricciones Legales (LOPNNA / FIFA):** La verificación de residencia y domicilio del tutor fortalece la certeza jurídica sobre la jurisdicción y tribunal de protección del menor que ejerce la patria potestad.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Base de Datos / Migraciones (`talentus-scout-migrations`):**
    - Nueva migración dbmate `20261013150000_add_address_fields_to_users.sql` agregando columnas `country VARCHAR(100)`, `state VARCHAR(100)`, `address VARCHAR(255)` a la tabla `users`.
  - **Backend (`talentus-scout-be`):**
    - `User.java`: Mapear `country`, `state`, `address` con anotaciones Lombok.
    - `RegisterTutorRequest.java`: Añadir `country` (obligatorio, validado por whitelist de 5 países), `state` (obligatorio), `address` (opcional, máx 255 chars).
    - `AuthService.java`: Persistir `country`, `state`, `address` al registrar al tutor.
    - `UserProfileResponse.java`: Exponer `country`, `state`, `address`.
    - `AuthController.java`: Mapear campos en `/api/v1/auth/me`.
    - `CreateAthleteRequest.java`: Validar que la nacionalidad pertenezca a la whitelist autorizada (`Venezuela`, `Colombia`, `Chile`, `Perú`/`Peru`, `Ecuador` o sus gentilicios equivalentes).
    - Pruebas automatizadas en `RegisterTutorTest.java` y `AthleteControllerTest.java`.
  - **Frontend (`talentus-scout-fe`):**
    - `auth.model.ts` y `user.model.ts`: Actualizar interfaces con `country`, `state`, `address`.
    - `register-tutor.component.ts` y `register-tutor.component.html`:
      - Añadir campo selector para país (lista de 5 países, default 'Venezuela').
      - Añadir campo de texto para estado/provincia (obligatorio).
      - Añadir campo de texto para dirección de habitación (opcional).
      - Enviar campos en el `FormData` al servicio de registro.
    - `register-athlete-modal.component.ts` y `register-athlete-modal.component.html`:
      - Reemplazar input libre por selector de países autorizados (`Venezuela`, `Colombia`, `Chile`, `Perú`, `Ecuador`), inicializado en `'Venezuela'`.
    - Pruebas y compilación frontend (`npm test`, `npm run build`).
- **Dependencias:** TS-02 (Esquema DDL), TS-03 (Backend Spring Boot), TS-04 (Onboarding Tutor), TS-05 (Cédula de Atleta), TS-06 (Frontend Angular).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Archivo de Migración:** `talentus-scout-migrations/migrations/20261013150000_add_address_fields_to_users.sql`
- **DDL SQL:**
  ```sql
  -- migrate:up
  ALTER TABLE users
      ADD COLUMN country VARCHAR(100),
      ADD COLUMN state VARCHAR(100),
      ADD COLUMN address VARCHAR(255);

  -- migrate:down
  ALTER TABLE users
      DROP COLUMN IF EXISTS address,
      DROP COLUMN IF EXISTS state,
      DROP COLUMN IF EXISTS country;
  ```

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Directiva Obligatoria de Backend (Spring Boot 3 / Lombok):**
  - Entidad `User.java`: Incorporar `country`, `state`, `address` con `@Getter`, `@Setter`, `@Builder.Default` o builder pattern.
  - DTO `RegisterTutorRequest.java`:
    ```java
    @NotBlank(message = "El país es obligatorio")
    @Pattern(regexp = "^(Venezuela|Colombia|Chile|Perú|Peru|Ecuador)$", message = "El país debe ser uno de los autorizados: Venezuela, Colombia, Chile, Perú, Ecuador")
    private String country;

    @NotBlank(message = "El estado o provincia es obligatorio")
    private String state;

    @Size(max = 255, message = "La dirección no puede exceder 255 caracteres")
    private String address;
    ```
  - DTO `CreateAthleteRequest.java`:
    ```java
    @NotBlank(message = "La nacionalidad principal es obligatoria")
    @Pattern(regexp = "^(Venezuela|Colombia|Chile|Perú|Peru|Ecuador|Venezolana|Colombiana|Chilena|Peruana|Ecuatoriana)$", message = "La nacionalidad debe corresponder a un país autorizado (Venezuela, Colombia, Chile, Perú, Ecuador)")
    private String nationality;
    ```
  - Servicio `AuthService.java`:
    - Setear `.country(request.getCountry())`, `.state(request.getState())`, `.address(request.getAddress())` en la construcción de `User`.
  - Controlador `AuthController.java` y `UserProfileResponse.java`:
    - Incluir `country`, `state`, `address` en el DTO de respuesta y en el endpoint `GET /api/v1/auth/me`.

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directivas Visuales ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Uso de tokens de diseño sobrios, paleta oscura refinada (`#0B0F17` / `#111827`), bordes sutiles, microinteracciones y estados de foco de alto contraste.
  - Campos de formulario agrupados lógicamente en bloque "Ubicación y Domicilio":
    - Selector desplegable de País estilizado.
    - Input de Estado / Provincia con validación y mensaje de error accesible.
    - Input de Dirección de Habitación con placeholder orientativo ("Av. Principal, Edif. Los Olivos, Apto 4B").
  - En Modal de Registro de Atleta: Reemplazar el input libre por `<select>` estandarizado con opciones de los 5 países.
- **Separación de Plantillas:**
  - `register-tutor.component.html` y `register-tutor.component.ts`.
  - `register-athlete-modal.component.html` y `register-athlete-modal.component.ts`.

---

## 6. Pruebas y Validación
- **Backend:**
  - Pruebas de registro de tutor con país autorizado y persistencia exitosa.
  - Pruebas de rechazo con 400 Bad Request cuando el país no está en la whitelist.
  - Pruebas de creación de atleta validando país/nacionalidad autorizada.
- **Frontend:**
  - Validación de campos reactivos y renderizado en formulario de registro.
  - Compilación exitosa con `npm run build` y ejecución de tests con `npm test`.

---

## 7. Checklist de Implementación Paso a Paso
- [x] **Paso 1:** Crear migración SQL `talentus-scout-migrations/migrations/20261013150000_add_address_fields_to_users.sql`.
- [x] **Paso 2:** Modificar `User.java` mapeando `country`, `state`, `address`.
- [x] **Paso 3:** Modificar `RegisterTutorRequest.java` con validaciones `@NotBlank`, `@Pattern`, `@Size`.
- [x] **Paso 4:** Modificar `CreateAthleteRequest.java` con validación de nacionalidad autorizada.
- [x] **Paso 5:** Modificar `AuthService.java` para persistir ubicación y domicilio en `User`.
- [x] **Paso 6:** Modificar `UserProfileResponse.java` y `AuthController.java` para exponer los campos en `/api/v1/auth/me`.
- [x] **Paso 7:** Actualizar / Añadir pruebas unitarias y de integración en Backend (`./mvnw test`).
- [x] **Paso 8:** Actualizar modelos de Frontend `auth.model.ts` y `user.model.ts`.
- [x] **Paso 9:** Modificar `register-tutor.component.ts` y `register-tutor.component.html` con campos de ubicación y selector de país.
- [x] **Paso 10:** Modificar `register-athlete-modal.component.ts` y `register-athlete-modal.component.html` con selector de país.
- [x] **Paso 11:** Ejecutar pruebas de Frontend (`npm test`, `npm run build`).
- [x] **Paso 12:** Redactar documento de pruebas `test/TS-31-test-plan-captura-ubicacion-tutor-selector-pais-atleta.md`.
- [x] **Paso 13:** Actualizar checkboxes del plan y mover la tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (DoD)
1. Migración DDL creada y consistente con dbmate.
2. Tutor puede registrarse indicando país (de 5 autorizados), estado/provincia obligatorio y dirección física opcional.
3. La API rechaza registros de tutor con países no autorizados con código HTTP `400 Bad Request`.
4. El endpoint `/api/v1/auth/me` retorna `country`, `state` y `address` del usuario autenticado.
5. El registro de atleta solo admite nacionalidades correspondientes a los 5 países autorizados.
6. El modal de registro de atleta en Frontend utiliza un `<select>` con los 5 países autorizados.
7. Las suites de pruebas en Backend y Frontend compilan y pasan exitosamente.
8. Documento `test/TS-31-test-plan-captura-ubicacion-tutor-selector-pais-atleta.md` redactado.
9. Tarjeta de Trello movida a `in testing`.
