# Plan de Pruebas y Reporte de Validación: [TS-13] Directorio de Búsqueda de Atletas con Filtros Avanzados para Scouts

**ID Tarea:** TS-13  
**Título Trello:** `[TS-13] Directorio de Búsqueda de Atletas con Filtros Avanzados para Scouts`  
**Tarjeta Trello:** [https://trello.com/c/FCVIHqfM](https://trello.com/c/FCVIHqfM) (ID: `6abbe1fa9605ce715fd033ac`)  
**Sprint:** Sprint 3 — Directorio de Scouts Acreditados y Contacto Seguro WhatsApp  
**Fecha de Ejecución:** 8 de octubre de 2026  
**Agente Ejecutor:** `trello_implementer`  
**Estado:** VALIDADO SATISFACTORIAMENTE (LISTO PARA TESTING / QA)  

---

## 1. Alcance de las Pruebas

El objetivo de esta suite de pruebas es validar de extremo a extremo el Directorio de Búsqueda de Talentos Deportivos para reclutadores acreditados:
1. **Control de Acceso y Salvaguarda de Seguridad:**
   - Restricción estricta del endpoint `GET /api/v1/scouts/directory` a usuarios con rol `SCOUT` aprobados (`ScoutVerificationStatus.APPROVED`) o `ADMIN`.
   - Verificación de rechazo inmediato con `403 Forbidden` para scouts en estado `PENDING_VERIFICATION` o usuarios no autorizados.
2. **Protección LOPNNA (Artículo 65):**
   - Garantía de que únicamente atletas con consentimiento digital activo (`is_public = true`) figuran en los resultados del directorio.
   - Atletas privados (`is_public = false`) son excluidos sin excepción.
3. **Filtros Tácticos Dinámicos (Spring Data JPA Specifications):**
   - Filtrado por año de nacimiento / categoría (`birthYear` evaluado por rango de fechas para aprovechar el índice B-tree `idx_athletes_filter`).
   - Filtrado por posición primaria (`primaryPosition`).
   - Filtrado por pierna hábil / perfil técnico (`preferredFoot`).
   - Filtrado por club formativo (`clubId`).
   - Filtrado por proyección internacional / comunitaria (`hasEuropeanPassport` comprobando pasaportes secundarios válidos).
   - Filtrado por evidencia audiovisual (`hasVideo` comprobando videos con estatus `READY` vía subconsulta JPA).
4. **Rendimiento (< 100ms en local):**
   - Medición de tiempos de respuesta en consultas filtradas para asegurar latencias inferiores a 100ms.
5. **Componente de Frontend Angular 18 (Standalone & Bento Grid):**
   - Componente `ScoutDirectoryComponent` en `/scout/directory` con estética atlética conforme a `fe-desing.md`.
   - Barra de chips rápidos por categorías: `Todos`, `Sub-15 (2011-2012)`, `Sub-17 (2009-2010)`, `Sub-20 (2007-2008)`.
   - Panel de filtros avanzados colapsable.
   - Modal interactivo de reproducción rápida de video (`<app-video-player>`) sin abandonar la sesión de scouting.
   - Protección de ruta en el cliente con `scoutGuard`.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend: Suite JUnit 5 & Spring Boot Test
Comandos ejecutados:
```bash
./mvnw test -Dtest=ScoutDirectoryIntegrationTest,ScoutDirectorySecurityTest
./mvnw test
```
**Resultado General Backend:** `Tests run: 62, Failures: 0, Errors: 0, Skipped: 0` (**BUILD SUCCESS**)

#### Detalle de Pruebas en `ScoutDirectoryIntegrationTest` (8 tests):
1. `getDirectory_WithoutFilters_ReturnsPublicAthletes`:
   - Verifica que la consulta general retorna a los atletas públicos y excluye al atleta privado (`is_public = false`).
2. `getDirectory_FilterByBirthYear_ReturnsMatchingAthletes`:
   - Filtro `birthYear=2010`: incluye atletas nacidos en 2010 y excluye atletas nacidos en 2008.
3. `getDirectory_FilterByPosition_ReturnsMatchingAthletes`:
   - Filtro `primaryPosition=DELANTERO_CENTRO`: incluye únicamente delanteros y excluye defensas centrales.
4. `getDirectory_FilterByPreferredFoot_ReturnsMatchingAthletes`:
   - Filtro `preferredFoot=ZURDO`: incluye únicamente atletas zurdos y excluye diestros.
5. `getDirectory_FilterByEuropeanPassport_ReturnsMatchingAthletes`:
   - Filtro `hasEuropeanPassport=true`: incluye al atleta con pasaporte secundario y excluye al que no posee.
6. `getDirectory_FilterByHasVideo_ReturnsOnlyAthletesWithReadyVideos`:
   - Filtro `hasVideo=true`: incluye al atleta con video `READY`, mapeando `hasVideo: true` y la URL `featuredVideoPlaybackUrl`.
7. `getDirectory_FilterByClubId_ReturnsMatchingAthletes`:
   - Filtro por UUID de club afiliado: retorna atletas vinculados al club especificado.
8. `getDirectory_PerformanceRequirement_ExecutesUnder100ms`:
   - Ejecuta consulta multivariable combinada y valida que el tiempo de ejecución es instantáneo (DoD < 100ms).

#### Detalle de Pruebas en `ScoutDirectorySecurityTest` (4 tests):
1. `getDirectory_WithoutToken_ReturnsUnauthorizedOrForbidden`: Valida bloqueo de peticiones anónimas.
2. `getDirectory_AsPendingScout_Returns403ForbiddenWithAuditMessage`: Valida bloqueo a scouts pendientes con mensaje explicativo de auditoría.
3. `getDirectory_AsApprovedScout_Returns200Ok`: Valida acceso concedido a scouts con `APPROVED`.
4. `getDirectory_AsAdmin_Returns200Ok`: Valida acceso concedido a usuarios administradores.

---

### 2.2. Frontend: Suite Jasmine & Karma (ChromeHeadless)
Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```
**Resultado General Frontend:** `TOTAL: 28 SUCCESS` (**100% pruebas unitarias en verde**)

#### Pruebas Unitarias de `scout.guard.spec.ts` (3 tests):
1. `debe permitir acceso cuando el usuario está autenticado y tiene acceso al directorio`: Retorna `true`.
2. `debe redirigir a /login cuando el usuario no está autenticado`: Retorna `false` y redirige a `/login`.
3. `debe redirigir a /dashboard cuando el usuario está autenticado pero no tiene permiso de directorio`: Retorna `false` y redirige a `/dashboard`.

#### Pruebas Unitarias de `scout-directory.component.spec.ts` (6 tests):
1. `debe crearse correctamente`: Inicialización exitosa del componente Standalone.
2. `debe cargar los atletas iniciales del directorio`: Invoca `ScoutDirectoryService.getDirectory` y puebla la señal `athletes`.
3. `debe filtrar por chip de categoría`: Actualiza `selectedBirthYear` al hacer clic en un chip de categoría y refrezca el listado.
4. `debe alternar los filtros de video y pasaporte`: Actualiza reactivamente los estados toggle pill.
5. `debe abrir y cerrar el modal interactivo de video`: Establece `activeVideoModal` al invocar `openVideoModal` y lo limpia al cerrar.
6. `debe calcular la clase CSS táctica de la posición`: Asigna clases de color diferenciadas para ataque, medio campo, defensa y portería.

---

### 2.3. Frontend: Compilación de Producción y SSR
Comando ejecutado:
```bash
npm run build
```
**Resultado:** `Application bundle generation complete` (Salida: `dist/talentus-scout-fe`).
- Generación de chunk diferido `chunk-Q6YIAGT4.js` para `scout-directory-component`.
- Generación de bundle de servidor `server.mjs` y `chunk-CGRQMK6Y.mjs`.
- Cero errores de sintaxis o incompatibilidad de tipado TypeScript.

---

## 3. Guía de Verificación Manual (cURL Reproducibles)

### 3.1. Búsqueda con Filtros Combinados (Scout Aprobado)
```bash
curl -X GET "http://localhost:8080/api/v1/scouts/directory?birthYear=2010&primaryPosition=DELANTERO_CENTRO&preferredFoot=ZURDO&hasEuropeanPassport=true&hasVideo=true&page=0&size=10" \
  -H "Authorization: Bearer <TOKEN_JWT_SCOUT_APROBADO>" \
  -H "Accept: application/json"
```

**Respuesta Esperada (`200 OK`):**
```json
{
  "content": [
    {
      "id": "e932efba-407b-449e-b9b5-680c2fdb5a10",
      "firstName": "Alejandro",
      "lastName": "Gómez",
      "birthDate": "2010-05-20",
      "birthYear": 2010,
      "category": "Sub-17",
      "primaryPosition": "DELANTERO_CENTRO",
      "secondaryPosition": "EXTREMO_IZQUIERDO",
      "preferredFoot": "ZURDO",
      "nationality": "Venezolana",
      "secondaryPassports": "Español (UE)",
      "hasEuropeanPassport": true,
      "clubName": "Caracas FC Academy",
      "slug": "alejandro-gomez-176000",
      "verifiedBadgesCount": 1,
      "hasVideo": true,
      "featuredVideoPlaybackUrl": "https://videodelivery.net/stream/video-demo.m3u8",
      "featuredVideoTitle": "Compilado de Goles 2026"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### 3.2. Intento de Acceso por Scout No Verificado
```bash
curl -X GET "http://localhost:8080/api/v1/scouts/directory" \
  -H "Authorization: Bearer <TOKEN_JWT_SCOUT_PENDIENTE>" \
  -H "Accept: application/json"
```

**Respuesta Esperada (`403 Forbidden`):**
```json
{
  "error": "FORBIDDEN",
  "message": "Auditoría en curso: Tu cuenta de scout está en proceso de verificación por la administración..."
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio DoD | Verificación Técnica | Estado |
| :--- | :--- | :---: |
| Endpoint `GET /api/v1/scouts/directory` con JPA Specifications | Implementado con `AthleteSpecifications` y `AthleteFilterCriteria` | ✅ CUMPLIDO |
| Filtros avanzados: `birthYear`, `primaryPosition`, `preferredFoot`, `clubId`, `hasEuropeanPassport`, `hasVideo` | Cubierto en backend y probado en `ScoutDirectoryIntegrationTest` | ✅ CUMPLIDO |
| Consultas tardan menos de 100ms en local gracias a índices | Validado con índice `idx_athletes_filter` y aserción en integración | ✅ CUMPLIDO |
| Exclusión estricta de atletas privados (`is_public = false`) | Validado por LOPNNA Art. 65 en especificación y pruebas | ✅ CUMPLIDO |
| Componente Angular con filtros rápidos por chips (Sub-15, Sub-17, Sub-20) | Implementado en `ScoutDirectoryComponent` con señales reactivas | ✅ CUMPLIDO |
| Tarjetas Bento con posición, club, insignias y botón de reproducción rápida | Diseñado con estética táctica deportiva conforme a `fe-desing.md` | ✅ CUMPLIDO |
| Modal de video interactivo integrado en el directorio | Implementado con `<app-video-player>` e interacción vía teclado | ✅ CUMPLIDO |
| Protección de acceso en cliente (`scoutGuard`) | Implementado y verificado con 100% de tests unitarios | ✅ CUMPLIDO |
| 100% tests backend y frontend en verde | 62 tests backend en verde, 28 tests frontend en verde | ✅ CUMPLIDO |
| Compilación de producción limpia | `npm run build` y `./mvnw compile` exitosos | ✅ CUMPLIDO |

---

## 5. Casos Borde y Validaciones Críticas

1. **Atleta sin pasaporte secundario:** Si `secondaryPassports` es `null` o está vacío, `hasEuropeanPassport` evalúa como `false`.
2. **Atleta con videos pero ninguno en estado READY:** No califica como `hasVideo = true` y no expone URLs de reproducción provisionales.
3. **Persistencia de sesión y navegación:** Si un scout navega directamente a `/scout/directory`, el `scoutGuard` valida su estatus en `authService.canAccessDirectory()`; si su cuenta es rechazada o pendiente, se le redirige de forma segura.
4. **Optimización de índices SQL:** El filtro por `birthYear` evalúa un rango `BETWEEN 'YYYY-01-01' AND 'YYYY-12-31'` en lugar de funciones de extracción de año, garantizando que PostgreSQL utilice el índice B-Tree existente (`idx_athletes_filter`).
