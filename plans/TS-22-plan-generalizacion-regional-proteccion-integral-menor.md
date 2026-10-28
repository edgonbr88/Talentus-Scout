# Plan de Implementación — TS-22: Generalización Regional: Reemplazo de 'LOPNNA' por 'Protección Integral del Menor y Consentimiento Legal'

---

## 1. Identificación
* **ID de Tarea:** `TS-22`
* **Título:** Generalización Regional: Reemplazo de 'LOPNNA' por 'Protección Integral del Menor y Consentimiento Legal'
* **Enlace a Trello:** https://trello.com/c/mZ57zK8n (ID: `6ac39344f3b3ba28b5ec57f4`)
* **Sprint:** Sprint 4 / Expansión Regional LatAm
* **Estado Inicial:** `in development`

---

## 2. Resumen y Contexto de Negocio
* **Justificación de la Iniciativa:**
  Talentus Scout expande su cobertura a múltiples países de Latinoamérica (Colombia, México, Argentina, Chile, Perú, etc.). El marco normativo "LOPNNA" es una sigla exclusiva de la legislación venezolana (*Ley Orgánica para la Protección de Niños, Niñas y Adolescentes*). Mantener referencias explícitas a "LOPNNA" en interfaces de usuario, formularios de tutor y documentos de exportación (CV en PDF) causa desorientación, dudas de validez jurídica y fricción en usuarios de otros países.
* **Estandarización Universal de Salvaguarda:**
  Se reemplaza toda referencia visual y de mensajería a "LOPNNA" por la terminología estándar y jurídicamente abarcadora: **"Protección Integral del Menor y Consentimiento Legal"**, alineada con las directrices de salvaguarda de FIFA Guardians y los convenios internacionales sobre los derechos de la niñez.
* **Compatibilidad Técnica y Continuidad Operativa:**
  No se alteran nombres de columnas de base de datos ni propiedades de contratos JSON internos (`acceptLopnnaTerms`, `accepted_lopnna_terms`), preservando total retrocompatibilidad y minimizando riesgos en APIs activas.

---

## 3. Arquitectura y Modelo de Datos
* **Base de Datos / DDL:**
  * No se requieren modificaciones DDL ni migraciones con dbmate.
  * La columna `accepted_lopnna_terms` en la tabla `tutor_legal_consents` se mantiene para salvaguardar la integridad de registros históricos.

---

## 4. Especificación Backend (Spring Boot 3.4 / Java 21)

### 4.1. DTO de Registro (`RegisterTutorRequest.java`)
* Ubicación: `talentus-scout-be/src/main/java/com/talentus/scout/web/dto/RegisterTutorRequest.java`.
* Modificaciones en validaciones Jakarta:
  ```java
  @NotNull(message = "El consentimiento legal de protección de menores es obligatorio")
  @AssertTrue(message = "Debe aceptar obligatoriamente los términos de protección integral del menor y consentimiento legal")
  private Boolean acceptLopnnaTerms;
  ```
  *(Se preserva el nombre de la variable para compatibilidad retroactiva de payloads).*

### 4.2. Generador de Hoja de Vida Deportiva en PDF (`AthleteCvPdfService.java`)
* Ubicación: `talentus-scout-be/src/main/java/com/talentus/scout/service/pdf/AthleteCvPdfService.java`.
* Sustitución del título del bloque legal inferior:
  * Anterior: `"SALVAGUARDA LEGAL Y PROTECCIÓN AL MENOR (LOPNNA Art. 65 / FIFA GUARDIANS):"`
  * Nuevo: `"SALVAGUARDA LEGAL Y PROTECCIÓN INTEGRAL DEL MENOR (FIFA GUARDIANS / NORMATIVA APLICABLE):"`
* El texto legal se mantiene enfocado en la estricta confidencialidad y canales oficiales de Talentus Scout sin referencias localistas.

### 4.3. Plantilla de Correo Electrónico (`email-verification.html`)
* Ubicación: `talentus-scout-be/src/main/resources/templates/mail/email-verification.html`.
* Sustitución del encabezado del card legal:
  * Anterior: `<p class="legal-title">Respaldo Jurídico LOPNNA (Art. 65)</p>`
  * Nuevo: `<p class="legal-title">Protección Integral del Menor y Salvaguarda Legal</p>`

### 4.4. Pruebas Backend (`RegisterTutorTest.java`)
* Ubicación: `talentus-scout-be/src/test/java/com/talentus/scout/web/controller/RegisterTutorTest.java`.
* Validar que la prueba `registrationWithLopnnaFalseShouldFailWith400BadRequest` verifique que el error retornado no contenga "LOPNNA" y confirme el nuevo mensaje amigable regional.

---

## 5. Especificación Frontend (Angular 18+ Standalone)

### 5.1. Formulario de Registro de Tutor (`register-tutor.component.ts`)
* Ubicación: `talentus-scout-fe/src/app/features/auth/register-tutor/register-tutor.component.ts`.
* Modificaciones en template:
  1. Header badge: `<span class="badge badge-legal">PROTECCIÓN INTEGRAL DEL MENOR</span>`.
  2. Título de tarjeta legal: `<span class="consent-title">Marco de Protección Integral del Menor y Consentimiento Legal</span>`.
  3. Cláusula descriptiva:
     > *"Conforme a las normativas de salvaguarda y protección integral de menores en el deporte y la legislación aplicable en su país, ninguna plataforma deportiva puede registrar datos de menores sin la debida autorización de su representante legal con patria potestad."*
  4. Mensaje de error reactivo:
     > `"Debe aceptar obligatoriamente los términos de protección integral del menor para continuar"`

### 5.2. Pantalla de Espera de Verificación (`verify-email-pending.component.ts`)
* Ubicación: `talentus-scout-fe/src/app/features/auth/verify-email-pending/verify-email-pending.component.ts`.
* Badge superior: sustituir `"Respaldo Legal LOPNNA Art. 65"` por `"Protección Integral del Menor y Salvaguarda Legal"`.

### 5.3. Pantalla de Confirmación de Verificación (`verify-email.component.ts`)
* Ubicación: `talentus-scout-fe/src/app/features/auth/verify-email/verify-email.component.ts`.
* Mensaje de éxito: sustituir `"tu expediente legal LOPNNA está activo"` por `"tu expediente de protección legal del menor está activo"`.

### 5.4. Dashboard del Tutor (`tutor-dashboard.component.ts`)
* Ubicación: `talentus-scout-fe/src/app/features/dashboard/tutor-dashboard.component.ts`.
* Badges de atletas:
  * `✓ DOC. LOPNNA CONSIGNADO` -> `✓ DOC. IDENTIDAD CONSIGNADO`
  * `⚠️ DOC. LOPNNA PENDIENTE` -> `⚠️ DOC. IDENTIDAD PENDIENTE`
* Modal de documento de identidad:
  * Badge: `<span class="badge badge-official">PROTECCIÓN INTEGRAL DEL MENOR</span>`
  * Texto explicativo:
    > *"Para respaldar jurídicamente la titularidad y patria potestad conforme a la normativa de protección integral del menor en el deporte, adjunta la partida de nacimiento, documento de identidad o pasaporte del menor."*

### 5.5. Estilos Globales (`styles.css`)
* Ubicación: `talentus-scout-fe/src/styles.css`.
* Definir alias `.badge-legal-protection` conservando `.badge-lopnna` para compatibilidad de estilos.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Automatizadas Backend
* Ejecutar `./mvnw test` asegurando 100% de tests aprobados.

### 6.2. Compilación Frontend
* Ejecutar `npm run build` en `talentus-scout-fe` garantizando 0 errores de TypeScript y plantillas.

### 6.3. Verificación de Cero Ocurrencias
* Ejecutar `grep -rnwi "LOPNNA" talentus-scout-fe/src/app/` asegurando que no queden referencias en interfaces de usuario ni textos visibles.

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [x] **Paso 1: Backend DTOs y Mensajes de Validación**
  - Modificar `RegisterTutorRequest.java` con mensajes neutros regionales.
- [x] **Paso 2: Backend PDF y Plantillas**
  - Modificar pie de página en `AthleteCvPdfService.java`.
  - Modificar tarjeta legal en `email-verification.html`.
- [x] **Paso 3: Frontend Registro de Tutor**
  - Actualizar `register-tutor.component.ts` (badge, título, texto legal y mensaje de validación).
- [x] **Paso 4: Frontend Vistas de Verificación de Email**
  - Actualizar `verify-email-pending.component.ts` (badge de salvaguarda).
  - Actualizar `verify-email.component.ts` (texto de expediente legal activo).
- [x] **Paso 5: Frontend Dashboard de Tutor y Estilos**
  - Actualizar badges y textos del modal en `tutor-dashboard.component.ts`.
  - Añadir alias de clase en `styles.css`.
- [x] **Paso 6: Auditoría de Textos UI**
  - Ejecutar búsqueda global para asegurar cero menciones de LOPNNA en UI de usuario final.
- [x] **Paso 7: Ejecución de Pruebas y Builds**
  - Ejecutar `./mvnw test` en backend.
  - Ejecutar `npm run build` en frontend.
- [x] **Paso 8: Documentación de Pruebas y Transición**
  - Generar `test/TS-22-test-plan-generalizacion-regional-proteccion-integral-menor.md`.
  - Mover tarjeta a `in testing` en Trello con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [x] Ninguna pantalla visible al usuario final (Landing, Registro de Tutor, Directorio de Atletas, Perfil Deportivo Bento, Modales de Contacto o Descarga) muestra la palabra "LOPNNA".
- [x] El formulario de registro de tutor muestra la tarjeta legal titulada "Marco de Protección Integral del Menor y Consentimiento Legal" con la cláusula descriptiva regional neutra acordada.
- [x] Si el tutor intenta registrarse sin marcar el consentimiento, el mensaje de error en pantalla y la respuesta de validación HTTP 400 del backend hacen referencia a "protección integral del menor y consentimiento legal", sin mencionar "LOPNNA".
- [x] El PDF de Hoja de Vida Deportiva (CV del Atleta) renderiza el bloque de salvaguarda legal bajo el título "SALVAGUARDA LEGAL Y PROTECCIÓN INTEGRAL DEL MENOR (FIFA GUARDIANS / NORMATIVA APLICABLE)".
- [x] La base de datos y la funcionalidad de autenticación/registro continúan operando con 100% de estabilidad sin romper endpoints existentes.
- [x] Pruebas automatizadas de backend (`./mvnw test`) y build de frontend (`ng build`) finalizan con éxito.
