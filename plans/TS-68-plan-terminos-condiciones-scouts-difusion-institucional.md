# Plan de Implementación — TS-68: Términos y Condiciones para Scouts: Cláusula de Difusión Institucional de Clubes, Modal de Lectura y Trazabilidad Legal

## 1. Identificación
* **ID:** `TS-68`
* **Título:** Términos y Condiciones para Scouts: Cláusula de Difusión Institucional de Clubes, Modal de Lectura y Trazabilidad Legal
* **Enlace a Trello:** [Tarjeta TS-68 en Trello](https://trello.com/c/QzYvjW9l) (ID: `6aee00e72d75b516fe44a1c2`)
* **Sprint / Fase:** Sprint 4 / Marco Legal y Seguridad
* **Estado:** En Planificación / Implementación
* **Dependencias:** `TS-14`, `TS-67`

---

## 2. Resumen y Contexto de Negocio
Talentus Scout es una plataforma de descubrimiento deportivo que conecta atletas juveniles con evaluadores y cazatalentos profesionales. Para maximizar el valor de la plataforma e incentivar el registro de nuevos talentos, es fundamental transparentar en redes sociales, plataformas y canales institucionales la presencia activa de cazatalentos vinculados a clubes, federaciones y academias oficiales (ej. *"Scouts del Caracas FC, Deportivo Táchira o clubes formativos están utilizando Talentus Scout para descubrir promesas"*).

Para sustentar esta estrategia sin riesgos jurídicos ni contingencias de marca:
1. **Consentimiento Expreso y Cláusula de Difusión Institucional:** Todo scout u ojeador que se registre debe autorizar expresamente a Talentus Scout a mencionar institucionalmente a su club u organización deportiva en publicaciones y notas oficiales.
2. **Cumplimiento Normativo (LOPNNA Art. 65 y FIFA Guardians):** El scout declara bajo fe de juramento la veracidad de su vinculación deportiva y asume el compromiso de confidencialidad y protección integral de menores.
3. **Trazabilidad Probatoria en Base de Datos:** Se registra la aceptación formal vinculada a la cuenta con sellado de tiempo (`TIMESTAMP WITH TIME ZONE`), versión de los términos (`1.0`), dirección IP real (resolviendo cabeceras `CF-Connecting-IP` y `X-Forwarded-For`) y `User-Agent`.

---

## 3. Arquitectura y Modelo de Datos

### 3.1. Migración DDL con dbmate (`talentus-scout-migrations`)
Se creará el archivo de migración:  
`talentus-scout-migrations/migrations/20261106220000_add_scout_terms_and_institutional_diffusion_traceability.sql`

```sql
-- migrate:up
ALTER TABLE scout_profiles
    ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS terms_ip_address VARCHAR(45),
    ADD COLUMN IF NOT EXISTS terms_user_agent TEXT;

-- migrate:down
ALTER TABLE scout_profiles
    DROP COLUMN IF EXISTS terms_user_agent,
    DROP COLUMN IF EXISTS terms_ip_address,
    DROP COLUMN IF EXISTS terms_accepted_at,
    DROP COLUMN IF EXISTS terms_version,
    DROP COLUMN IF EXISTS accepted_terms;
```

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Entidad JPA: `ScoutProfile`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/ScoutProfile.java`
* **Anotaciones Lombok:** `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`
* **Nuevos Atributos:**
  ```java
  @Builder.Default
  @Column(name = "accepted_terms", nullable = false)
  private boolean acceptedTerms = false;

  @Builder.Default
  @Column(name = "terms_version", nullable = false, length = 20)
  private String termsVersion = "1.0";

  @Column(name = "terms_accepted_at")
  private Instant termsAcceptedAt;

  @Column(name = "terms_ip_address", length = 45)
  private String termsIpAddress;

  @Column(name = "terms_user_agent", columnDefinition = "TEXT")
  private String termsUserAgent;
  ```

### 4.2. DTO de Registro: `RegisterScoutRequest`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/RegisterScoutRequest.java`
* **Nuevos Atributos y Validaciones:**
  ```java
  @NotNull(message = "La aceptación de los términos y condiciones es obligatoria")
  @AssertTrue(message = "Debe aceptar obligatoriamente los Términos y Condiciones para Scouts y la cláusula de difusión institucional")
  private Boolean acceptTerms;
  ```

### 4.3. Controlador: `AuthController`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/web/controller/AuthController.java`
* **Método `registerScout`:**
  * Inyectar `HttpServletRequest httpRequest`.
  * Mejorar `extractClientIp` para verificar prioritariamente la cabecera `CF-Connecting-IP` antes de `X-Forwarded-For` y `getRemoteAddr()`.
  * Extraer `clientIp` y `userAgent`.
  * Pasar `clientIp` y `userAgent` al servicio `authService.registerScout`.

### 4.4. Servicio: `AuthService`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/AuthService.java`
* **Actualización de `registerScout`:**
  * Recibir `clientIp` y `userAgent`.
  * Asignar en `ScoutProfile.builder()`:
    * `acceptedTerms(Boolean.TRUE.equals(request.getAcceptTerms()))`
    * `termsVersion("1.0")`
    * `termsAcceptedAt(Instant.now())`
    * `termsIpAddress(clientIp)`
    * `termsUserAgent(userAgent)`

### 4.5. Pruebas Unitarias y de Integración Backend
* **Ruta:** `talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AuthScoutRegistrationTest.java`
* **Casos de Prueba:**
  1. Registro exitoso de Scout con `acceptTerms = true`: valida respuesta 201 Created y almacenamiento de campos de auditoría.
  2. Rechazo de Scout cuando `acceptTerms = false` o `null`: valida respuesta 400 Bad Request con mensaje descriptivo de validación.

---

## 5. Especificación Frontend (Angular 18+ / Bento Design)

### 5.1. Componente Modal: `ScoutTermsModalComponent`
* **Ubicación:** `talentus-scout-fe/src/app/features/auth/register-scout/scout-terms-modal/`
  * `scout-terms-modal.component.ts` (Componente Standalone)
  * `scout-terms-modal.component.html` (Plantilla HTML separada)
  * `scout-terms-modal.component.css` (Estilos Bento oscuros conforme a `fe-desing.md`)
* **Contenido de los 4 Pilares:**
  1. *Pilar 1: Protección Integral del Menor (LOPNNA Art. 65 y FIFA Guardians).*
  2. *Pilar 2: Uso Ético y Confidencial de Fichas Deportivas (Prohibición estricta de contacto directo no intermediado con menores).*
  3. *Pilar 3: Cláusula de Autorización de Difusión Institucional de Clubes (Publicación y difusión institucional en medios y redes de Talentus Scout).*
  4. *Pilar 4: Veracidad de Acreditaciones y Consecuencias de Falsedad Documental.*
* **Eventos y Controles:**
  * Botón para cerrar modal (`close`).
  * Botón de acción principal *"Aceptar y Volver al Registro"* (`accepted`), que cierra el modal y marca la casilla en el formulario principal.

### 5.2. Formulario de Registro de Scout: `RegisterScoutComponent`
* **Ubicación:** `talentus-scout-fe/src/app/features/auth/register-scout/`
  * `register-scout.component.ts`
  * `register-scout.component.html`
* **Ajustes:**
  * Importar `ScoutTermsModalComponent`.
  * Variable de estado `showTermsModal = false`.
  * Agregar control de formulario reactivo `acceptTerms: [false, [Validators.requiredTrue]]`.
  * Renderizar checkbox estilizado y enlace interactivo *"Términos y Condiciones para Scouts"*.
  * Al enviar el formulario (`onSubmit`), anexar `formData.append('acceptTerms', 'true')`.
  * Actualizar pruebas en `register-scout.component.spec.ts`.

---

## 6. Plan de Pruebas y Validación
1. **Base de Datos:**
   * Validar sintaxis y rollback del archivo SQL de migración dbmate.
2. **Backend:**
   * Ejecutar suite de pruebas con `./mvnw test -Dtest=AuthScoutRegistrationTest`.
   * Verificar que `./mvnw clean test` compila sin errores.
3. **Frontend:**
   * Ejecutar pruebas con `npm test -- --watch=false`.
   * Ejecutar compilación de producción con `npm run build`.
4. **Verificación Manual:**
   * Enviar petición multipart cURL a `/api/v1/auth/register-scout` sin `acceptTerms` -> esperar 400.
   * Enviar petición con `acceptTerms=true` -> esperar 201 y verificar persistencia en BD.

---

## 7. Checklist de Implementación Paso a Paso
- [ ] **1. Git Branching:** Crear y posicionarse en la rama `feature/TS-68-terminos-condiciones-scouts-difusion-institucional` en el repositorio principal y submódulos.
- [ ] **2. Migración DDL:** Crear migración en `talentus-scout-migrations/migrations/` con columnas de términos y trazabilidad.
- [ ] **3. Backend Entity & DTO:** Modificar `ScoutProfile` y `RegisterScoutRequest` con Lombok y validaciones `@NotNull`, `@AssertTrue`.
- [ ] **4. Backend Controller & Service:** Actualizar `AuthController` y `AuthService` para capturar `clientIp` y `userAgent` y persistir la auditoría de términos.
- [ ] **5. Backend Tests:** Actualizar y ejecutar pruebas de registro de scout en `AuthScoutRegistrationTest`.
- [ ] **6. Frontend Modal:** Crear `scout-terms-modal` (HTML, TS, CSS) con diseño Bento y los 4 pilares.
- [ ] **7. Frontend Form:** Integrar modal y checkbox reactivo `acceptTerms` en `register-scout.component`.
- [ ] **8. Frontend Tests & Build:** Validar pruebas y compilar Angular (`npm run build`).
- [ ] **9. Plan de Pruebas:** Generar documento en `test/TS-68-test-plan-terminos-condiciones-scouts-difusion-institucional.md`.
- [ ] **10. Git Commit, Push & PR:** Crear commits en submódulos y repo principal, push a GitHub y abrir Pull Request con `gh pr create`.
- [ ] **11. Trello Transition:** Mover tarjeta a `in testing` y añadir comentario con resumen de la entrega y enlace al PR.

---

## 8. Criterios de Aceptación (DoD)
1. Migración DDL de dbmate creada y testeable con `accepted_terms`, `terms_version`, `terms_accepted_at`, `terms_ip_address`, `terms_user_agent`.
2. Backend rechaza registros sin `acceptTerms=true` con error 400 Bad Request.
3. Modal Bento de términos disponible e interactivo en el frontend, permitiendo lectura y aceptación fluida.
4. Registro exitoso almacena correctamente los 5 atributos de trazabilidad legal.
5. Suite completa de pruebas pasa al 100% en backend y frontend.
6. Pull Request creado en GitHub y tarjeta en Trello trasladada a `in testing`.
