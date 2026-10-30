# Plan de Pruebas y Validación — TS-22: Generalización Regional: Reemplazo de 'LOPNNA' por 'Protección Integral del Menor y Consentimiento Legal'

---

## 1. Alcance de las Pruebas
* **Identificador de Tarea:** `[TS-22]`
* **Título:** Generalización Regional: Reemplazo de 'LOPNNA' por 'Protección Integral del Menor y Consentimiento Legal'
* **Componentes Backend Impactados:**
  * DTO `RegisterTutorRequest.java`:
    * Mensaje `@NotNull`: `"El consentimiento legal de protección de menores es obligatorio"`.
    * Mensaje `@AssertTrue`: `"Debe aceptar obligatoriamente los términos de protección integral del menor y consentimiento legal"`.
    * Preservación del campo `acceptLopnnaTerms` para total compatibilidad retroactiva.
  * Servicio de Exportación PDF `AthleteCvPdfService.java`:
    * Título del bloque legal inferior en la Ficha Técnica: `"SALVAGUARDA LEGAL Y PROTECCIÓN INTEGRAL DEL MENOR (FIFA GUARDIANS / NORMATIVA APLICABLE):"`.
  * Plantilla HTML de Correo `mail/email-verification.html`:
    * Encabezado de la tarjeta legal: `"Protección Integral del Menor y Salvaguarda Legal"`.
  * Pruebas de Integración `RegisterTutorTest.java`:
    * Verificación del rechazo con HTTP 400 y mensaje regional neutral cuando `acceptLopnnaTerms = false`.
* **Componentes Frontend Impactados:**
  * Vista Standalone `RegisterTutorComponent` (`register-tutor.component.ts`):
    * Badge de cabecera: `"PROTECCIÓN INTEGRAL DEL MENOR"`.
    * Título de bloque legal: `"Marco de Protección Integral del Menor y Consentimiento Legal"`.
    * Cláusula descriptiva regional neutra:
      > *"Conforme a las normativas de salvaguarda y protección integral de menores en el deporte y la legislación aplicable en su país, ninguna plataforma deportiva puede registrar datos de menores sin la debida autorización de su representante legal con patria potestad."*
    * Mensaje de error reactivo: `"Debe aceptar obligatoriamente los términos de protección integral del menor para continuar"`.
  * Vista Standalone `VerifyEmailPendingComponent` (`verify-email-pending.component.ts`):
    * Badge superior: `"Protección Integral del Menor y Salvaguarda Legal"`.
  * Vista Standalone `VerifyEmailComponent` (`verify-email.component.ts`):
    * Mensaje de éxito: `"tu expediente de protección legal del menor está activo"`.
  * Vista Standalone `TutorDashboardComponent` (`tutor-dashboard.component.ts`):
    * Badges de atletas: `"✓ DOC. IDENTIDAD CONSIGNADO"` y `"⚠️ DOC. IDENTIDAD PENDIENTE"`.
    * Modal de consignación de documento: badge `"PROTECCIÓN INTEGRAL DEL MENOR"` y texto adaptado a la normativa regional de menores en el deporte.
  * Estilos Globales `styles.css`:
    * Adición del selector `.badge-legal-protection` manteniendo compatibilidad con `.badge-lopnna`.
  * Auditoría UI: 0 ocurrencias visibles de "LOPNNA" en pantallas de usuario.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend (`./mvnw test`)
* **Resultado Global:** 128 de 128 pruebas aprobadas (0 fallos, 0 errores, 100% verde).
* **Pruebas Clave Ejecutadas:**
  * `RegisterTutorTest.registrationWithLopnnaFalseShouldFailWith400BadRequest`:
    * Valida que al enviar `acceptLopnnaTerms = false`, el servidor responde HTTP 400 Bad Request.
    * Valida que el error en `errors.acceptLopnnaTerms` corresponde exactamente a: `"Debe aceptar obligatoriamente los términos de protección integral del menor y consentimiento legal"`.
    * Valida que no se mencione "LOPNNA" ni legislaciones locales en el mensaje de error retornado al cliente.
  * `AthleteCvPdfServiceTest` (3/3 pruebas aprobadas):
    * Valida la correcta generación del binario PDF con el pie de página legal bajo el estándar FIFA Guardians / Normativa Aplicable.

### 2.2. Frontend (`npm run build`)
* **Comando:** `npm run build`
* **Resultado:** Compilación exitosa en 25.6 segundos con 0 errores de TypeScript y 0 advertencias de plantillas.
* **Auditoría de Textos:**
  * Búsqueda regex global (`grep -rnwi "LOPNNA" src/`): confirmó cero menciones visibles en plantillas HTML, badges o mensajes al usuario final.

---

## 3. Guía de Verificación Manual Paso a Paso (cURL / API)

### Paso 1: Validación de Rechazo por Falta de Consentimiento (Sin Mencionar LOPNNA)
```bash
echo "TEST_DOC" > /tmp/test_doc.png

curl -i -X POST http://localhost:8080/api/v1/auth/register-tutor \
  -F "email=tutor.regional.test@talentus.app" \
  -F "password=PasswordSeguro2026*" \
  -F "fullName=Andrés Morales Tutor" \
  -F "phoneNumber=+573001234567" \
  -F "acceptLopnnaTerms=false" \
  -F "idDocumentType=CEDULA" \
  -F "idDocumentNumber=CC-10203040" \
  -F "idDocumentFile=@/tmp/test_doc.png;type=image/png"
```
* **Respuesta Esperada (HTTP 400 Bad Request):**
```json
{
  "timestamp": "2026-10-10T19:14:00Z",
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "Error de validación en los datos enviados",
  "errors": {
    "acceptLopnnaTerms": "Debe aceptar obligatoriamente los términos de protección integral del menor y consentimiento legal"
  }
}
```
*(Verificado: El mensaje no contiene "LOPNNA" ni referencias localistas).*

---

### Paso 2: Registro Exitoso de Tutor con Consentimiento Aceptado
```bash
curl -X POST http://localhost:8080/api/v1/auth/register-tutor \
  -F "email=tutor.colombia@talentus.app" \
  -F "password=PasswordSeguro2026*" \
  -F "fullName=Andrés Morales Tutor" \
  -F "phoneNumber=+573001234567" \
  -F "acceptLopnnaTerms=true" \
  -F "idDocumentType=CEDULA" \
  -F "idDocumentNumber=CC-10203040" \
  -F "idDocumentFile=@/tmp/test_doc.png;type=image/png"
```
* **Respuesta Esperada (HTTP 201 Created):**
```json
{
  "userId": "uuid-generado",
  "email": "tutor.colombia@talentus.app",
  "accountStatus": "PENDING_EMAIL_VERIFICATION",
  "message": "Registro completado con éxito. Por favor verifica tu correo electrónico para activar tu cuenta."
}
```

---

### Paso 3: Verificación de Hoja de Vida Deportiva (CV PDF)
```bash
curl -X GET "http://localhost:8080/api/v1/athletes/<ATHLETE_ID>/cv" \
  -H "Authorization: Bearer <TOKEN_VALIDO>" \
  -o /tmp/cv_atleta_test.pdf
```
* **Validación en el archivo PDF:**
  * El pie de página legal inferior renderiza:
    > **SALVAGUARDA LEGAL Y PROTECCIÓN INTEGRAL DEL MENOR (FIFA GUARDIANS / NORMATIVA APLICABLE):**
    > *Este documento es expedido exclusivamente con fines deportivos, de visoría y convocatorias formativas. Se prohíbe expresamente la difusión no autorizada de datos de contacto de niños y adolescentes...*

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **Cero menciones de 'LOPNNA' en UI:** Ninguna pantalla visible muestra el término localista venezolano. | ✅ Cumplido | Auditoría grep en `talentus-scout-fe/src/app` con 0 ocurrencias visibles. |
| **Título y cláusula neutral en registro:** Formulario de registro muestra "Marco de Protección Integral del Menor y Consentimiento Legal". | ✅ Cumplido | Template actualizado en `register-tutor.component.ts`. |
| **Mensaje de error regional neutral:** Fallo de validación HTTP 400 hace referencia a protección integral del menor. | ✅ Cumplido | Validado en `RegisterTutorTest.registrationWithLopnnaFalseShouldFailWith400BadRequest`. |
| **PDF de Ficha Deportiva adaptado:** Título de pie de página legal usa "SALVAGUARDA LEGAL Y PROTECCIÓN INTEGRAL DEL MENOR (FIFA GUARDIANS / NORMATIVA APLICABLE)". | ✅ Cumplido | `AthleteCvPdfService.java` línea 356 actualizada y probada. |
| **Continuidad y compatibilidad técnica:** Endpoints, columnas y payloads existentes continúan operando sin interrupción. | ✅ Cumplido | 128/128 pruebas de backend aprobadas sin cambios en esquema DDL. |
| **Compilación limpia Frontend y Backend:** Ambos proyectos compilan con 0 errores. | ✅ Cumplido | `mvn test` exitoso y `ng build` exitoso. |

---

## 5. Casos Borde y Consideraciones de Negocio Validadas

1. **Retrocompatibilidad de Contrato JSON:** Se mantuvo deliberadamente el campo `acceptLopnnaTerms` en `RegisterTutorRequest.java` y `auth.model.ts` para no requerir actualización de versiones de clientes móviles o consumidores de la API.
2. **Alineación con FIFA Guardians:** La redacción adoptada se ajusta a los estándares globales de protección y salvaguarda para federaciones y clubes deportivos de FIFA.
3. **Persistencia Histórica en Base de Datos:** La columna `accepted_lopnna_terms` en PostgreSQL preserva la trazabilidad de los consentimientos legales otorgados con anterioridad.
