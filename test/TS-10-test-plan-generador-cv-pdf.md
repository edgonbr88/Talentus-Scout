# Plan de Pruebas y Reporte de Validación: [TS-10] Generador de Hoja de Vida Deportiva (CV en PDF) en 1 Clic

**ID Tarea:** TS-10  
**Título Trello:** `[TS-10] Generador de Hoja de Vida Deportiva (CV en PDF) en 1 Clic`  
**Tarjeta Trello:** [https://trello.com/c/4pc2IP9T](https://trello.com/c/4pc2IP9T) (ID: `6abbe1f89f9d40580bd9caa2`)  
**Sprint:** Sprint 2 — Multimedia, Perfil Público y Verificación  
**Fecha de Ejecución:** 7 de octubre de 2026  
**Agente Ejecutor:** `trello_implementer`  
**Estado:** VALIDADO SATISFACTORIAMENTE (LISTO PARA TESTING / QA)  

---

## 1. Alcance de las Pruebas

El objetivo de esta validación es certificar la funcionalidad integral de generación, descarga y renderizado de la **Ficha Técnica Oficial Deportiva (Curriculum Vitae en PDF)** con código QR dinámico interactivo, tanto a nivel de backend como de frontend, asegurando el cumplimiento de las normativas de protección al menor (LOPNNA Art. 65), restricciones de seguridad por roles y rendimiento del documento (<500ms y <300KB).

### Componentes y Artefactos Auditados
* **Backend (`talentus-scout-be`):**
  * `com.talentus.scout.service.pdf.AthleteCvPdfService`: Motor de construcción de documento A4 con OpenPDF (2.0.3) y generador de matrices QR con ZXing (3.5.3).
  * `com.talentus.scout.security.AthleteSecurity`: Regla de autorización `canDownloadCv` (permite a tutor propietario, scouts acreditados y administradores).
  * `com.talentus.scout.web.controller.AthleteController`: Endpoint `GET /api/v1/athletes/{id}/cv-pdf` con cabeceras `Content-Type: application/pdf`, `Content-Disposition: inline; filename=...` y control de caché.
  * Configuración en `application.yml`: `talentus.frontend.base-url`.
* **Frontend (`talentus-scout-fe`):**
  * `src/app/core/services/athlete.service.ts`: Método `downloadAthleteCvPdf(athleteId: string): Observable<Blob>`.
  * `src/app/features/dashboard/tutor-dashboard.component.ts`: Botón "Descargar CV (PDF)" en cada tarjeta de atleta con estado reactivo de generación y descarga directa de blob.
  * `src/app/features/public-profile/bento-profile.component.ts` y `.html`: Botón "Ficha Técnica (PDF)" en el dock flotante inferior y modal informativo/restricción de autenticación para salvaguardar datos bajo LOPNNA Art. 65.
  * `src/app/features/public-profile/bento-profile.component.css`: Tokens de diseño deportivo (`.btn-pdf-dock`, `.modal-backdrop-blur`, `.auth-prompt-card`).

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend: Suite de Pruebas JUnit 5 & Spring Boot Test
Comando ejecutado:
```bash
./mvnw test
```
**Resultado General:** `Tests run: 35, Failures: 0, Errors: 0, Skipped: 0` (BUILD SUCCESS, 01:25 min)

#### Detalle de Clases de Test Específicas
1. **`com.talentus.scout.service.pdf.AthleteCvPdfServiceTest`** (3 tests ejecutados, 100% PASS):
   * `generateAthleteCvPdf_Success_ReturnsValidPdfBytes`:
     * Valida que el arreglo de bytes no sea nulo.
     * Valida que comience con la cabecera mágica `%PDF-`.
     * Valida que el tiempo de generación sea inferior a 500ms (resultado: ~18ms en ejecución real).
     * Valida que el peso del archivo sea inferior a 300KB (resultado: ~44KB).
     * Valida la incorporación del código QR escaneable apuntando a la URL del perfil.
   * `generateAthleteCvPdf_WithMinimalData_GeneratesCleanPdf`:
     * Valida la tolerancia ante campos opcionales nulos (sin club, sin insignias previas, sin altura/peso, sin pasaportes secundarios).
   * `generateAthleteCvPdf_AthleteNotFound_ThrowsResourceNotFoundException`:
     * Valida que si el atleta no existe en la base de datos se lance `ResourceNotFoundException`.

2. **`com.talentus.scout.web.controller.AthleteControllerTest`** (8 tests ejecutados, 100% PASS):
   * `downloadCvPdf_WithoutToken_ReturnsUnauthorizedOrForbidden`:
     * Petición anónima a `GET /api/v1/athletes/{id}/cv-pdf` es rechazada con `401 Unauthorized` o `403 Forbidden`.
   * `downloadCvPdf_AsOwnerTutor_Returns200AndPdfContentType`:
     * El tutor autenticado propietario del atleta recibe `200 OK`, `Content-Type: application/pdf` y cabecera `Content-Disposition: inline; filename="CV_Deportivo_lucas-rivas-...pdf"`.
   * `downloadCvPdf_AsOtherTutor_Returns403Forbidden`:
     * Un tutor autenticado diferente al dueño recibe `403 Forbidden`.

### 2.2. Frontend: Compilación y Suite de Pruebas Karma / Jasmine
Comandos ejecutados:
```bash
npm run build
npm test -- --watch=false
```
**Resultado Build:** Browser y Server bundles (SSR) compilados sin errores ni advertencias (`Application bundle generation complete [30.068 s]`).  
**Resultado Tests:** `TOTAL: 16 SUCCESS` (100% PASS).
* `BentoProfileComponent`:
  * Valida creación del componente e hidratación de datos.
  * Valida renderizado del botón `btn-pdf-dock` en el dock de acciones flotante.
  * Valida que al hacer clic sin sesión activa se levante el modal de advertencia de autenticación `showAuthPrompt() == true`.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Prueba por cURL (API REST)

#### Paso 1: Obtener Token JWT como Tutor
```bash
LOGIN_RESP=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.perez@talentus.test","password":"Password123!"}')

TUTOR_TOKEN=$(echo $LOGIN_RESP | jq -r '.token')
echo "Token obtenido: $TUTOR_TOKEN"
```

#### Paso 2: Descargar el CV en PDF
```bash
# Consultar atleta existente
ATHLETE_ID="00000000-0000-0000-0000-000000000001"

curl -v -X GET "http://localhost:8080/api/v1/athletes/${ATHLETE_ID}/cv-pdf" \
  -H "Authorization: Bearer ${TUTOR_TOKEN}" \
  -o "cv_atleta_test.pdf"
```

#### Paso 3: Inspeccionar Metadatos del Archivo Generado
```bash
# Verificar firma mágica de PDF
head -c 5 cv_atleta_test.pdf
# Salida esperada: %PDF-

# Verificar peso del archivo
ls -lh cv_atleta_test.pdf
# Salida esperada: Entre 35KB y 75KB (Muy por debajo de los 300KB máximos)
```

### 3.2. Prueba de Interacción en el Frontend (Angular)

#### Caso A: Tutor en el Panel Privado (`/dashboard`)
1. Iniciar sesión como tutor legal en `http://localhost:4200/login`.
2. Acceder al panel de control (`/dashboard`).
3. En la sección "Mis Atletas Representados", observar la tarjeta del atleta.
4. Presionar el botón verde esmeralda **"📄 Descargar CV"**.
5. Verificar que el texto cambie temporalmente a **"⏳ Generando..."**.
6. Verificar que el navegador inicie la descarga inmediata del archivo `CV_Deportivo_{slug}.pdf`.
7. Abrir el PDF en un visor (Acrobat, Chrome, visor nativo):
   * La cabecera muestra `TALENTUS SCOUT • FICHA TÉCNICA OFICIAL` en fondo Slate oscuro `#0F172A`.
   * El código QR es nítido.
   * La sección de biotipo contiene estatura, peso, posición y pierna hábil.
   * Las insignias verificadas aparecen con tilde verde.
   * El pie de página contiene la cláusula legal de protección al menor LOPNNA Art. 65.

#### Caso B: Visitante en el Perfil Público (`/atleta/:slug`)
1. Abrir una ventana de incógnito o sin sesión iniciada en `http://localhost:4200/atleta/gabriel-perez-10`.
2. En la barra flotante inferior, observar el botón **"Ficha Técnica (PDF)"**.
3. Presionar el botón:
   * Se abre el modal con fondo desenfocado (Glassmorphism) informando: *"La descarga del CV Deportivo en PDF con código QR y certificación oficial está reservada para el representante legal del atleta, scouts y clubes acreditados bajo la normativa de protección de menores (LOPNNA Art. 65)"*.
   * El botón "Iniciar Sesión" redirige a `/login`.
4. Iniciar sesión como Scout o Tutor y presionar nuevamente el botón: la descarga se completa de forma directa.

---

## 4. Matriz de Criterios de Aceptación (Definition of Done - DoD)

| Criterio DoD | Especificación | Estado | Observaciones / Evidencia |
| :--- | :--- | :---: | :--- |
| **Tiempo de Generación** | < 500ms en backend | ✅ **CUMPLIDO** | ~18ms en pruebas unitarias y <50ms en integración local con OpenPDF. |
| **Tamaño del Documento** | < 300KB | ✅ **CUMPLIDO** | Tamaño real generado: ~44KB - 58KB. |
| **Código QR Escaneable** | Apunta al perfil público interactivo | ✅ **CUMPLIDO** | Renderizado con ZXing en 160x160 px apuntando a `https://talentus.app/atleta/{slug}` con corrección de errores nivel M. |
| **Protección LOPNNA Art. 65** | Sin datos privados del menor, pie legal | ✅ **CUMPLIDO** | No expone teléfonos ni emails de menores; incluye advertencia legal obligatoria. |
| **Seguridad de Endpoint** | Solo tutor dueño, scouts o admins | ✅ **CUMPLIDO** | Protegido con `@athleteSecurity.canDownloadCv(#id, authentication)`. |
| **Integración UI Frontend** | Botón en Dashboard y Perfil Público | ✅ **CUMPLIDO** | Integrado en `TutorDashboardComponent` y `BentoProfileComponent` con modal informativo. |
| **Pruebas Automatizadas** | 100% pruebas en verde | ✅ **CUMPLIDO** | 35 tests en Spring Boot y 16 tests en Angular pasando sin errores. |
| **Compilación Limpia** | Cero errores en BE y FE | ✅ **CUMPLIDO** | `./mvnw test` y `npm run build` ejecutados exitosamente. |

---

## 5. Casos Borde y Validaciones de Seguridad

1. **Atleta sin Datos Antropométricos:** Si el tutor no ha ingresado peso o altura, el servicio renderiza "Pendiente de medición" sin romper el layout ni generar tablas desalineadas.
2. **Atleta sin Insignias en Base de Datos:** Si aún no hay registros en `athlete_badges`, el servicio genera automáticamente las insignias oficiales basadas en la licencia federativa o el club activo si existen.
3. **Control de Acceso Cruzado:** Si el Tutor B intenta solicitar el PDF del Atleta del Tutor A mediante ID manipulado, Spring Security responde `403 Forbidden`.
4. **Resistencia Offline / Fallos de Red:** La generación del PDF utiliza gráficos vectoriales y fuentes nativas OpenPDF sin llamadas HTTP externas bloqueantes, garantizando consistencia determinista y cero fallos por latencia de red.
