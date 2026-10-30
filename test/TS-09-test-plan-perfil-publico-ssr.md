# Plan y Reporte de Pruebas: [TS-09] Perfil Público del Atleta en Angular con SSR y Open Graph Dinámico

**ID de Tarea:** TS-09  
**Tarjeta Trello:** [TS-09 Perfil Público del Atleta en Angular con SSR y Open Graph Dinámico](https://trello.com/c/2J1D83FU/46-ts-09-perfil-p%C3%BAblico-del-atleta-en-angular-con-ssr-y-open-graph-din%C3%A1mico) (ID: `6abbe1f7742bfe58a08fc79a`)  
**Fecha de Ejecución:** 6 de octubre de 2026  
**Responsable:** trello_implementer  
**Estado:** VALIDADO / LISTO PARA TESTING  

---

## 1. Alcance de las Pruebas

El objetivo de esta fase de pruebas es certificar la funcionalidad integral, renderizado en servidor (SSR), inyección de meta-etiquetas Open Graph dinámicas, maquetación Bento Grid atlética y estricta protección de datos conforme a la LOPNNA (Art. 65) para el perfil público del atleta (`/atleta/:slug`).

### 1.1. Artefactos y Componentes Impactados

#### Backend (Spring Boot 3 / Java 21)
* **Modelos y Enums:**
  * [`com.talentus.scout.domain.enums.BadgeType`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/enums/BadgeType.java) (`CLUB_VERIFIED`, `FEDERATION_LICENSED`, `SCOUT_APPROVED`, `ACADEMY_PROSPECT`).
  * [`com.talentus.scout.domain.enums.BadgeStatus`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/enums/BadgeStatus.java) (`ACTIVE`, `REVOKED`, `PENDING`).
  * [`com.talentus.scout.domain.entity.AthleteBadge`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/AthleteBadge.java): Entidad JPA con Lombok (`@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`).
* **Repositorios:**
  * [`com.talentus.scout.repository.AthleteBadgeRepository`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/repository/AthleteBadgeRepository.java): Consulta de insignias activas por atleta.
* **DTOs de Exposición Pública (`com.talentus.scout.web.dto.publicprofile`):**
  * `PublicAthleteResponse`: Respuesta principal de perfil público.
  * `PublicClubDto`: Club actual formateado sin datos confidenciales.
  * `AthleteMetricsDto`: Altura y peso del biotipo.
  * `PublicBadgeDto`: Insignias de confianza validadas.
  * `PublicVideoDto`: Videos públicos optimizados para streaming HLS.
* **Capa de Servicios y Controladores:**
  * [`com.talentus.scout.service.AthleteService`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/service/AthleteService.java): Método `getPublicAthleteBySlug(String slug)`.
  * [`com.talentus.scout.web.controller.AthleteController`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/web/controller/AthleteController.java): Endpoint público `@GetMapping("/public/{slug}")`.
  * [`com.talentus.scout.config.SecurityConfig`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/config/SecurityConfig.java): Regla `permitAll()` para `/api/v1/athletes/public/**`.

#### Frontend (Angular 18+ Standalone / SSR)
* **Arquitectura SSR:**
  * [`talentus-scout-fe/server.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/server.ts): Servidor Express SSR que ejecuta `CommonEngine` de Angular.
  * [`talentus-scout-fe/src/app/app.config.server.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/app.config.server.ts) y [`main.server.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/main.server.ts).
  * [`talentus-scout-fe/src/app/core/interceptors/server-url.interceptor.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/interceptors/server-url.interceptor.ts): Reescritura de URLs relativas a `http://talentus-scout-be:8080` durante la ejecución en Node.
* **Servicios:**
  * [`talentus-scout-fe/src/app/core/services/seo.service.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/services/seo.service.ts): Inyección dinámica de meta etiquetas Open Graph (`og:title`, `og:image`, `og:description`, `og:url`), Twitter Cards y Title.
  * [`talentus-scout-fe/src/app/core/services/athlete.service.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/core/services/athlete.service.ts): Método `getPublicAthleteBySlug(slug)`.
* **Componentes de UI:**
  * [`talentus-scout-fe/src/app/shared/components/video-player/video-player.component.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/shared/components/video-player/video-player.component.ts): Reproductor HLS con `hls.js`, controles adaptativos y protección contra ejecución en servidor (`isPlatformBrowser`).
  * [`talentus-scout-fe/src/app/features/public-profile/bento-profile.component.ts`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/app/features/public-profile/bento-profile.component.ts): Bento Grid atlético con diseño visual distintivo (Hero Card, Biotipo, Video HLS, Insignias y Dock Flotante de WhatsApp).

#### Infraestructura y Despliegue
* [`talentus-scout-fe/Dockerfile`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/Dockerfile): Contenedor dual con Alpine, Node 22 SSR y Nginx 1.27.
* [`talentus-scout-fe/entrypoint.sh`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/entrypoint.sh): Orquestación simultánea de Node Express (puerto 4000) y Nginx (puertos 80/443).
* [`talentus-scout-fe/nginx.conf`](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/nginx.conf): Proxy reverso de `/atleta` hacia el proceso SSR en `127.0.0.1:4000`, proxy de `/api/` hacia el backend y entrega de activos estáticos con caché prolongada.

---

## 2. Pruebas Automatizadas

### 2.1. Pruebas Backend (JUnit 5 + MockMvc)
Ubicación: [`talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AthletePublicControllerTest.java`](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/test/java/com/talentus/scout/web/controller/AthletePublicControllerTest.java)

| ID | Caso de Prueba | Descripción | Resultado Esperado | Estado |
|---|---|---|---|:---:|
| **BE-01** | `getPublicAthleteBySlug_whenSlugExistsAndPublic_shouldReturn200` | Consulta de atleta existente con `isPublic = true`. | Retorna `200 OK` con JSON completo (slug, biotipo, club, insignias y videos). | ✅ PASÓ |
| **BE-02** | `getPublicAthleteBySlug_whenAthleteIsPrivate_shouldReturn404` | Consulta de atleta existente con `isPublic = false`. | Retorna `404 Not Found` impidiendo acceso anónimo. | ✅ PASÓ |
| **BE-03** | `getPublicAthleteBySlug_whenSlugNotFound_shouldReturn404` | Consulta de un slug inexistente en base de datos. | Retorna `404 Not Found`. | ✅ PASÓ |
| **BE-04** | `getPublicAthleteBySlug_verifyLopnnaProtection_noSensitiveDataExposed` | Verificación de respuesta JSON pública de menor de edad. | Retorna 200 sin campos sensibles (cédula, correo tutor, teléfono, dirección). | ✅ PASÓ |

**Resultado de la Suite Backend:**
* **Comando:** `./mvnw test`
* **Pruebas ejecutadas:** 30
* **Fallos / Errores:** 0
* **Tiempo:** 13.9 s
* **Código de salida:** `0`

### 2.2. Pruebas y Compilación Frontend (Angular 18+ SSR)
* **Comando ejecutado:** `npm run build` en `talentus-scout-fe/`
* **Salida de compilación:**
  ```text
  Initial chunk files   | Names         |  Raw size | Estimated transfer size
  chunk-5A4P6JWD.js     | -             | 394.02 kB |               107.03 kB
  main-PL75KBLJ.js      | main          | 350.14 kB |                87.26 kB
  chunk-55K3DF24.js     | -             | 106.63 kB |                25.13 kB
  polyfills-FFHMD2TL.js | polyfills     |  34.52 kB |                11.28 kB
  styles-XGFLW4SF.css   | styles        |  15.22 kB |                 3.40 kB
                        | Initial total | 900.52 kB |               234.09 kB

  Lazy chunk files      | Names         |  Raw size | Estimated transfer size
  chunk-6Y3O7Z3R.js     | bento-profile |  24.58 kB |                 5.85 kB

  Server chunk files    | Names         |  Raw size
  server.mjs            | main          |   1.06 MB
  polyfills.server.mjs  | polyfills     | 262.30 kB
  index.server.html     | -             |  14.88 kB

  Application bundle generation complete. [20.767 seconds]
  Exit Code: 0
  ```

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Simulación de Rastreador de WhatsApp (DoD Primordial)
* **Comando ejecutado:**
  ```bash
  curl -i -A "WhatsApp/2.0" http://localhost/atleta/gabriel-perez
  ```
* **Cabeceras HTTP recibidas:**
  ```http
  HTTP/1.1 200 OK
  Server: nginx
  Content-Type: text/html; charset=utf-8
  X-Powered-By: Express
  ```
* **Etiquetas Open Graph y Twitter verificadas en el cuerpo HTML:**
  ```html
  <title>Gabriel Pérez (2010) — DELANTERO_CENTRO | Talentus Scout</title>
  <meta name="description" content="Ficha deportiva oficial y jugadas destacadas de Gabriel Pérez (16 años), DELANTERO_CENTRO. Ficha verificada en Talentus Scout.">
  <meta property="og:title" content="Gabriel Pérez — DELANTERO_CENTRO | Talentus Scout">
  <meta property="og:description" content="Ficha deportiva oficial y jugadas destacadas de Gabriel Pérez (16 años), DELANTERO_CENTRO. Ficha verificada en Talentus Scout.">
  <meta property="og:image" content="https://cdn.talentus.app/cards/default-athlete-scout.jpg">
  <meta property="og:url" content="https://talentus.app/atleta/gabriel-perez">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Talentus Scout">
  <meta property="profile:first_name" content="Gabriel">
  <meta property="profile:last_name" content="Pérez">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Gabriel Pérez — DELANTERO_CENTRO | Talentus Scout">
  <meta name="twitter:description" content="Ficha deportiva oficial y jugadas destacadas de Gabriel Pérez (16 años), DELANTERO_CENTRO. Ficha verificada en Talentus Scout.">
  <meta name="twitter:image" content="https://cdn.talentus.app/cards/default-athlete-scout.jpg">
  ```

### 3.2. Verificación del Endpoint Público Backend vía Nginx
* **Comando ejecutado:**
  ```bash
  curl -s http://localhost/api/v1/athletes/public/gabriel-perez
  ```
* **Respuesta JSON:**
  ```json
  {
    "id": "8e78905d-310b-4f74-bf02-8736c67a9636",
    "slug": "gabriel-perez",
    "firstName": "Gabriel",
    "lastName": "Pérez",
    "fullName": "Gabriel Pérez",
    "age": 16,
    "birthDate": "2010-06-15",
    "gender": "MALE",
    "primaryPosition": "DELANTERO_CENTRO",
    "secondaryPosition": null,
    "preferredFoot": "DERECHO",
    "nationality": "Venezolana",
    "secondaryPassports": null,
    "profilePhotoUrl": null,
    "bio": null,
    "club": null,
    "metrics": {
      "heightCm": 174.50,
      "weightKg": 63.00
    },
    "badges": [],
    "videos": []
  }
  ```

### 3.3. Verificación de Perfil Privado (Protección LOPNNA)
* **Comando ejecutado:**
  ```bash
  curl -s http://localhost/atleta/atleta-privado-1791298407171
  ```
* **Respuesta HTML renderizada:**
  * Despliega la tarjeta segura de error: `<h2 class="error-title">Ficha no disponible</h2>`.
  * Ningún dato del menor privado es renderizado en el DOM ni filtrado en el script de transferencia de estado (`ng-state`).

### 3.4. Verificación de Perfil Inexistente
* **Comando ejecutado:**
  ```bash
  curl -s http://localhost/atleta/slug-inexistente-xyz
  ```
* **Resultado:**
  * Despliega de forma limpia el estado de error amigable: `<h2 class="error-title">Ficha no disponible</h2>`.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| # | Criterio de Aceptación (DoD) | Evidencia de Validación | Estado |
|---|---|---|:---:|
| **1** | **Compilación Limpia:** Backend compila y corre tests (`./mvnw test`). Frontend compila en modo SSR (`npm run build`). | 30 tests unitarios/integración en verde en backend. Frontend genera `browser` y `server/server.mjs`. | ✅ CUMPLIDO |
| **2** | **Endpoint Público Operativo:** `GET /api/v1/athletes/public/{slug}` responde `200 OK` sin requerir token JWT, entregando biotipo, club, videos e insignias. Responde `404` si es privado o inexistente. | Endpoint probado tanto directamente como a través del proxy reverso Nginx (`/api/v1/...`). | ✅ CUMPLIDO |
| **3** | **Validación SSR & Open Graph (Criterio Primordial):** `curl -A "WhatsApp/2.0" http://localhost/atleta/:slug` retorna HTML con `og:title`, `og:image` y `og:description`. | Verificado en vivo contra contenedor Docker con respuesta `200 OK` y tags Open Graph inyectados. | ✅ CUMPLIDO |
| **4** | **Experiencia Bento Grid Móvil:** Maquetado atlético con Bento Grid, reproductor HLS funcional y botón flotante de WhatsApp. | Componente `BentoProfileComponent` implementado siguiendo directivas de `fe-desing.md` y contenedor dock flotante. | ✅ CUMPLIDO |
| **5** | **Protección LOPNNA Art. 65:** Ningún dato confidencial (documento de identidad del menor, correo del tutor, teléfonos) es visible ni expuesto en el HTML o JSON. | Validado mediante `AthletePublicControllerTest` e inspección del payload en terminal. | ✅ CUMPLIDO |
| **6** | **Documentación de Pruebas:** Archivo de pruebas generado en `test/TS-09-test-plan-perfil-publico-ssr.md`. | Documento actual redactado según directivas de `AGENTS.md`. | ✅ CUMPLIDO |
| **7** | **Trello Actualizado:** Tarjeta `[TS-09]` movida a `in testing` con comentario detallado. | Ejecución del script de transición a `in testing`. | ✅ CUMPLIDO |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Aislamiento de Plataforma SSR (`isPlatformBrowser`):**
   * En Angular SSR, el acceso directo a `window`, `document` o APIs de medios del navegador produce excepciones fatales (`ReferenceError`).
   * `VideoPlayerComponent` protege la inicialización de `hls.js` con `isPlatformBrowser(this.platformId)`, garantizando una renderización sin errores en Node.js.
2. **Reescritura de Rutas Relativas en Servidor:**
   * Node.js carece de origen de navegador por defecto. El interceptor `serverUrlInterceptor` detecta el entorno servidor y redirige las llamadas `/api/...` hacia la red interna de Docker (`http://talentus-scout-be:8080`), permitiendo que el servidor SSR obtenga los datos del atleta y pre-renderice la vista antes de enviar el HTML al cliente.
3. **Caché de Transferencia (`ng-state`):**
   * Los datos consumidos durante el SSR se serializan en el script `<script id="ng-state">`, evitando peticiones duplicadas durante la hidratación del cliente en el navegador.
4. **Cumplimiento LOPNNA Art. 65:**
   * Los DTOs públicos excluyen intencionalmente `nationalId`, `phoneNumber`, `email`, y direcciones residenciales.
   * Atletas con bandera `isPublic = false` retornan inmediatamente 404, protegiendo a los menores cuyos tutores no han activado la visibilidad pública.
