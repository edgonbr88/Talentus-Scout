# Plan de Pruebas y Validación: [TS-74] Mostrar logo oficial del club en tarjetas del directorio de scouts y modal de video

**ID Tarea:** TS-74  
**Título:** Mostrar logo oficial del club en tarjetas del directorio de scouts y modal de video  
**Tarjeta Trello:** [https://trello.com/c/FWY6t2Pj](https://trello.com/c/FWY6t2Pj)  
**ID Tarjeta en Trello:** `6af7e190e53d4a3326aa1938`  
**Sprint:** Sprint 4 / Experiencia de Scouting y Visualización  
**Fecha:** 2026-11-16  
**Estado:** LISTO PARA TESTING  
**Agente Implementador:** trello_implementer  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es garantizar la correcta visualización de los escudos oficiales de las organizaciones y clubes deportivos en el Directorio Nacional de Talentos y en el Modal de Reproducción Rápida de Video, erradicando el uso del emoji `🏟️` y proporcionando un fallback SVG vectorial consistente ante ausencia de imagen o fallos de red:

* **Backend (`ScoutDirectoryService.java` y `ScoutDirectoryAthleteItem.java`):**
  * Sanitización defensiva de `clubLogoUrl`: si el club tiene `logoUrl` vacío o compuesto únicamente por espacios en blanco (`isBlank()`), se normaliza a `null`.
  * Verificación de que el DTO `ScoutDirectoryAthleteItem` transporte `clubLogoUrl` intacto hacia el cliente HTTP en el endpoint `GET /api/v1/scouts/directory`.

* **Frontend (`ScoutDirectoryComponent`):**
  * **Tarjetas Bento de Atletas (`scout-directory.component.html` / `.ts` / `.css`):**
    * Renderizado condicional de la imagen del escudo (`<img [src]="athlete.clubLogoUrl | mediaUrl" ... class="club-logo-mini" />`) con tamaño óptimo de `22px×22px`, `object-fit: contain`, borde sutil y fondo traslúcido.
    * Erradicación total del emoji `🏟️`.
    * Mecanismo reactivo con Angular Signals (`failedClubLogos = signal<Set<string>>(new Set())`) para detectar errores de carga `(error)` y conmutar inmediatamente al ícono SVG vectorial de escudo (`.club-crest-svg`).
    * Truncado con elipsis (`text-overflow: ellipsis`) en nombres extensos de clubes para salvaguardar la cuadrícula Bento.
  * **Modal de Reproducción Rápida (`activeVideoModal`):**
    * Inclusión del mini-escudo del club (`18px×18px`) en `.modal-video-meta` junto al nombre del club y título del video.
    * Fallback SVG (`.club-crest-svg-sm`) en caso de ausencia de escudo o fallo `(error)` en el modal.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Pruebas Unitarias y de Integración Backend (Spring Boot 3 / Java 21)
Comando ejecutado:
```bash
cd talentus-scout-be && ./mvnw test -Dtest=ScoutDirectoryIntegrationTest,ScoutDirectorySecurityTest
```
**Resultado:** `BUILD SUCCESS` — **21 pruebas ejecutadas, 0 errores, 0 fallos.**

| Clase de Prueba | Pruebas | Estado | Descripción de Casos Validados |
| :--- | :---: | :---: | :--- |
| `ScoutDirectoryIntegrationTest` | 17 | ✅ PASS | • `getDirectory_ReturnsClubLogoUrl_WhenAvailable_AndNullWhenMissing`: Valida que `clubLogoUrl` se retorne correctamente cuando el club posee escudo y que se sanitice a `null` cuando no posee o está en blanco.<br>• Pruebas de filtros tácticos (año de nacimiento, posición, pierna hábil, pasaporte comunitario, video destacado, clubId).<br>• Filtro de visibilidad pública LOPNNA Art. 65 y rendimiento sub-100ms. |
| `ScoutDirectorySecurityTest` | 4 | ✅ PASS | Validación de control de acceso RBAC para veedores acreditados en estado `APPROVED`. |

---

### 2.2. Pruebas Unitarias Frontend (Angular 18+ / Jasmine & Karma)
Comando ejecutado:
```bash
cd talentus-scout-fe && npm test -- --watch=false --include=src/app/features/scout-directory/scout-directory.component.spec.ts
```
**Resultado:** `TOTAL: 17 SUCCESS` — **17 pruebas ejecutadas, 0 fallos.**

| Prueba Unitaria | Estado | Verificación Específica |
| :--- | :---: | :--- |
| `debe renderizar el escudo del club cuando el atleta posee clubLogoUrl y no mostrar emoji (TS-74)` | ✅ PASS | Valida existencia de `.club-logo-mini`, atributo `src` con `MediaUrlPipe`, `alt` descriptivo y ausencia de `🏟️`. |
| `debe renderizar el ícono SVG de fallback cuando el atleta no posee clubLogoUrl (TS-74)` | ✅ PASS | Valida que si `clubLogoUrl` es `undefined`/`null`, no se renderice `<img>` y se dibuje el SVG `.club-crest-svg`. |
| `debe conmutar al ícono SVG de fallback ante un evento (error) en la imagen del escudo (TS-74)` | ✅ PASS | Valida que el método `onClubLogoError(id)` registre el fallo en la Signal reactiva y sustituya la imagen por el SVG. |
| `debe mostrar el logo del club y fallback en el modal de video rápido (TS-74)` | ✅ PASS | Valida el mini-escudo en la cabecera del modal y la conmutación a SVG ante `onModalClubLogoError()`. |
| Pruebas de filtros y paginación preexistentes (TS-13, TS-45, TS-49) | ✅ PASS | Todas las pruebas de catálogo y filtros se mantienen 100% estables. |

---

### 2.3. Verificación de Compilación Frontend (Angular 18+ SSR)
Comando ejecutado:
```bash
cd talentus-scout-fe && npm run build
```
**Resultado:** `Application bundle generation complete. [32.763 seconds]`
* Verificación exitosa de los 20 prerenders estáticos y generación de chunks de cliente y servidor sin errores de tipado o plantillas.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Escenario 1: Directorio de Scouts con Clubes Oficiales
1. Iniciar sesión como Scout acreditado (`scout@talentusscout.com` o veedor aprobado).
2. Navegar a `/scout/directory`.
3. Observar las tarjetas Bento de los atletas:
   * Los atletas pertenecientes a clubes con escudo oficial cargado (ej. Caracas FC, Academia Secasports) muestran su logo nítido de `22px×22px` a la izquierda del nombre del club.
   * La tarjeta no contiene ningún emoji `🏟️`.
   * La altura de las tarjetas y el alineamiento de la grilla Bento se mantiene uniforme.

---

### 3.2. Escenario 2: Atleta Independiente o Club sin Logo
1. Localizar un atleta independiente ("Club Independiente") o cuyo club no haya cargado escudo.
2. Comprobar que en su tarjeta aparece un ícono SVG estilizado de escudo deportivo en tono gris mate (`var(--color-text-dim)`).
3. Verificar que no se producen errores de consola ni peticiones fallidas a imágenes inexistentes.

---

### 3.3. Escenario 3: Modal de Reproducción Rápida de Video
1. En una tarjeta de atleta con video disponible, hacer clic en el botón **Ver Jugadas** (o ícono `▶`).
2. Se despliega el modal interactivo de scouting rápido:
   * En el subtítulo superior, junto al nombre del club, aparece el escudo del club en tamaño compacto (`18px×18px`).
   * Si el club no posee logo, se visualiza el escudo SVG de fallback.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Cumplimiento |
| :--- | :---: | :--- |
| Escudo real del club en tarjetas del directorio (`20px–24px`, `contain`) | ✅ CUMPLIDO | Implementado con `.club-logo-mini` (`22px×22px`, fondo traslúcido y borde sutil). |
| Sustitución de emoji `🏟️` por SVG vectorial discreto en atletas sin escudo | ✅ CUMPLIDO | Eliminado `🏟️`; renderizado condicional con `.club-crest-svg`. |
| Logo del club visible en el modal de video rápido (`activeVideoModal`) | ✅ CUMPLIDO | Integrado en `.modal-video-meta` con clase `.modal-club-logo`. |
| Soporte de URLs relativas y externas mediante `MediaUrlPipe` | ✅ CUMPLIDO | Utilizado `| mediaUrl` en tarjetas y modal de video. |
| Mantenimiento de alineación, truncado con elipsis y Bento Grid | ✅ CUMPLIDO | `.club-name` y `.modal-club-name` con `text-overflow: ellipsis` y `white-space: nowrap`. |
| Pruebas automatizadas en verde al 100% | ✅ CUMPLIDO | 21 tests de backend y 17 tests de frontend aprobados; build exitoso. |

---

## 5. Casos Borde y Consideraciones de Robustez

1. **Escudos oscuros sobre tema Dark:**
   * Se aplicó `background: rgba(255, 255, 255, 0.03)` y `border: 1px solid rgba(255, 255, 255, 0.08)`, lo que asegura contraste y legibilidad perimetral incluso si el escudo original del club es de tonalidad negra o azul marino.
2. **URLs rotas o fallos de red (404/CORS):**
   * El manejador reactivo `(error)="onClubLogoError(athlete.id)"` previene imágenes rotas en el navegador y conmuta al instante al escudo SVG vectorial sin parpadeos.
3. **Strings en blanco en Base de Datos:**
   * La sanitización con `isBlank()` en `ScoutDirectoryService` evita que se envíen strings de espacios al frontend, garantizando `null` limpio.
