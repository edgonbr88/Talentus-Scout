# Plan de Implementación: [TS-32] Remoción de Ficha Federativa en Registro Inicial de Atleta y Redirección a Flujo de Certificación

**ID Tarea:** TS-32  
**Tarjeta Trello:** https://trello.com/c/xwZnY8nL  
**Fecha:** 2026-10-13  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:**
  En el fútbol formativo base y juvenil (categorías infantiles, semilleros barriales y academias comunitarias), una alta proporción de niños y adolescentes en formación no cuenta con un carnet o ficha federativa oficial activa en el momento de su alta inicial. Exigir o presentar dicho campo en el modal de registro genera fricción cognitiva, dudas innecesarias en los tutores legales y potencial abandono del proceso de incorporación.
- **Salvaguarda Deportiva y Rigor Probatorio:**
  Para los atletas que efectivamente disponen de ficha o carnet federativo oficial emitido por su respectiva federación o asociación deportiva (FVF, FCF, FPF, FEF, ANFP), la consignación de este dato debe efectuarse a través del módulo auditado de Certificaciones y Acreditaciones (`FEDERATION_LICENSE`, TS-15), donde el tutor adjunta la credencial digitalizada para ser validada con rigor por los auditores. Esto previene el ingreso de números arbitrarios o ficticios sin respaldo documental.
- **Impacto para el Usuario:**
  Un flujo de registro inicial de atleta mucho más ágil, intuitivo y sin barreras de entrada para el fútbol base, con una clara orientación contextual para validar credenciales federativas cuando corresponda.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - **Base de Datos / Migraciones (`talentus-scout-migrations`):**
    - No requiere modificaciones DDL. La columna `athletes.federation_license_number` ya es nullable y se preserva intacta para almacenar números validados a través de certificaciones oficiales aprobadas y renderizarse en la cédula pública y en el CV deportivo PDF (TS-10).
  - **Backend (`talentus-scout-be` — Spring Boot 3 / Java 21):**
    - `com.talentus.scout.web.dto.CreateAthleteRequest`: Mantener `federationLicenseNumber` opcional (o nulo por defecto) para preservar compatibilidad con APIs de integración previas sin obligatoriedad.
    - `com.talentus.scout.service.AthleteService`: Validar que la creación de atletas opere de manera transparente y desacoplada de la presencia de dicho campo.
    - `com.talentus.scout.web.controller.AthleteControllerTest`: Asegurar pruebas de integración que certifiquen el alta exitosa de un atleta sin enviar `federationLicenseNumber`.
  - **Frontend (`talentus-scout-fe` — Angular 18+):**
    - `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`:
      - Remover el input de texto `id="federationLicenseNumber"`.
      - Reorganizar la cuadrícula visual de la Sección 2 ("Posición y Lateralidad en Cancha") para asegurar simetría y balance estético.
      - Incorporar una nota informativa estilizada (`federation-info-card`), informando al tutor que si el atleta cuenta con carnet o ficha federativa, podrá tramitar su validación oficial desde la pestaña "Certificar" de su panel.
    - `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`:
      - Eliminar el control `federationLicenseNumber` de `athleteForm`.
      - Remover el mapeo y envío del campo `federationLicenseNumber` en el payload de `onSubmit()`.
      - Actualizar estilos CSS del componente con los tokens visuales para el nuevo bloque informativo de acreditación.
    - `src/app/core/models/athlete.model.ts`:
      - Mantener la propiedad opcional `federationLicenseNumber?: string` en `CreateAthleteRequest` o removerla de forma segura si no se utiliza en llamadas de frontend.
- **Dependencias:** `TS-05` (Cédula deportiva de atleta), `TS-08` (Cédula de atleta y registro), `TS-15` (Módulo de certificaciones e insignias).

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- **Estado DDL:** No se requieren migraciones SQL.
- La tabla `athletes` conserva la columna `federation_license_number VARCHAR(100)` con restricción nullable:
  ```sql
  -- Column definition en PostgreSQL existente:
  -- federation_license_number VARCHAR(100) NULL
  ```
- Esta columna continuará siendo actualizada cuando un tutor solicite la certificación de tipo `FEDERATION_LICENSE` y sea aprobada por un administrador del sistema en `AdminCertificationService`.

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Directiva Obligatoria de Modelado:** Mantener Lombok (`@Getter`, `@Setter`, `@Builder`, etc.) sin boilerplate.
- **DTO `CreateAthleteRequest.java`:**
  - Garantizar que `federationLicenseNumber` no posea validaciones de obligatoriedad:
    ```java
    private String federationLicenseNumber;
    ```
- **Servicio `AthleteService.java`:**
  - Garantiza que la entidad `Athlete` persiste nulo en `federationLicenseNumber` si el DTO no lo incluye.
- **Suite de Pruebas `AthleteControllerTest.java`:**
  - Validar que `createAthlete_WithValidData_Returns201AndGeneratedSlug` y nuevos tests verifiquen la creación sin `federationLicenseNumber`.

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)
- **Directivas Visuales ([fe-desing.md](file:///home/edgar/Talentus%20Scout/fe-desing.md)):**
  - Paleta sobria basada en tokens del sistema: `#0B0F17` (fondo de superficie oscura), `#1E293B` (bordes estructurales), `#38BDF8` (acento cian atlético/informativo), `#F8FAFC` (texto principal).
  - En la Sección 2 ("Posición y Lateralidad en Cancha"):
    - Fila 1: `Posición Principal *` (col 1) y `Posición Secundaria (Opcional)` (col 2).
    - Fila 2: `Pierna Hábil *` (col 1) y `Club o Academia Formativa Actual` (col 2, o club a ancho completo col-span-2 y pierna hábil equilibrada).
    - Alternativa recomendada para máxima armonía:
      - `primaryPosition` (col 1)
      - `secondaryPosition` (col 2)
      - `preferredFoot` (col-span-2 en móvil, col 1 en desktop)
      - `currentClubId` (col 2 en desktop o col-span-2)
      - Tarjeta informativa (`federation-info-box`) a ancho completo (`col-span-2`) con micro-icono de acreditación e indicación de certificación guiada.
  - **Copywriting Humano y Riguroso:**
    ```html
    <div class="federation-info-callout col-span-2">
      <div class="info-icon">📋</div>
      <div class="info-content">
        <p class="info-title">¿Tu representado cuenta con carnet o ficha federativa?</p>
        <p class="info-text">
          Para garantizar autenticidad ante cazatalentos certificados, podrás consignar el comprobante oficial y solicitar su validación auditada desde la sección <strong>"Certificar"</strong> de tu panel de tutor.
        </p>
      </div>
    </div>
    ```
- **Separación de Plantillas:**
  - Plantilla: `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.html`
  - Componente: `src/app/features/dashboard/register-athlete-modal/register-athlete-modal.component.ts`

---

## 6. Pruebas y Verificación
- **Backend:**
  - Ejecución de `./mvnw test -Dtest=AthleteControllerTest`.
  - Verificación de código HTTP `201 Created` en la creación de atleta sin `federationLicenseNumber`.
- **Frontend:**
  - Compilación sin errores (`npm run build`).
  - Verificación visual de renderizado armónico del modal sin espacios vacíos y con el callout informativo visible.

---

## 7. Checklist de Implementación Paso a Paso
- [x] **Paso 1:** Inspeccionar y confirmar que `CreateAthleteRequest.java` y `AthleteService.java` manejan `federationLicenseNumber` de forma opcional.
- [x] **Paso 2:** Modificar `register-athlete-modal.component.html` para remover el input de `federationLicenseNumber`, reorganizar la cuadrícula del formulario y añadir el callout informativo de certificación.
- [x] **Paso 3:** Modificar `register-athlete-modal.component.ts` eliminando `federationLicenseNumber` de `athleteForm` y del payload `onSubmit()`, y agregando los estilos para `.federation-info-callout`.
- [x] **Paso 4:** Modificar `athlete.model.ts` si corresponde para mantener la interfaz de frontend alineada.
- [x] **Paso 5:** Ejecutar pruebas de Backend (`./mvnw test -Dtest=AthleteControllerTest`).
- [x] **Paso 6:** Ejecutar compilación de Frontend (`npm run build`).
- [x] **Paso 7:** Redactar documento de pruebas `test/TS-32-test-plan-remocion-ficha-federativa-registro-atleta.md`.
- [x] **Paso 8:** Actualizar checklist de este plan a completado y mover la tarjeta TS-32 en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
1. El modal de registro de atleta no solicita el número de carnet o ficha federativa en su formulario inicial.
2. La cuadrícula del modal mantiene simetría y balance visual en todas las resoluciones (desktop y mobile).
3. Se despliega una nota informativa orientando al tutor a solicitar la verificación oficial en el módulo de Certificaciones.
4. El registro de atleta se procesa exitosamente en el backend (HTTP 201) sin recibir el campo.
5. Los atletas con ficha federativa previamente asignada mantienen su información intacta en perfil público y PDF.
6. La compilación de frontend (`npm run build`) y las pruebas de backend (`./mvnw test`) finalizan con éxito.
7. Documento `test/TS-32-test-plan-remocion-ficha-federativa-registro-atleta.md` generado en el workspace.
8. Tarjeta de Trello movida a la lista `in testing`.
