# Plan de Implementación: [TS-14] Botón de Contacto Seguro WhatsApp y Radar de Visualizaciones

**ID de la Tarea:** TS-14  
**Título Trello:** `[TS-14] Botón de Contacto Seguro WhatsApp LOPNNA y Radar de Visualizaciones`  
**Enlace a Trello:** [https://trello.com/c/oBFwfO0e](https://trello.com/c/oBFwfO0e) (ID: `6abbe1fb50f5eef1b1745b0d`)  
**Sprint Asignado:** Sprint 3 — Directorio de Scouts Acreditados y Contacto Seguro WhatsApp  
**Fecha de Creación:** 9 de octubre de 2026  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Planificador:** `trello_planner`  

---

## 1. Identificación y Contexto de Negocio

### 1.1. Contexto y Justificación
En el ecosistema de captación y reclutamiento juvenil en Venezuela, el contacto entre cazatalentos y futbolistas menores de edad exige estrictas salvaguardas legales e institucionales. La plataforma Talentus Scout opera como puente seguro eliminando cualquier canal no supervisado:
1. **Canalización Exclusiva hacia el Representante Legal:** Los scouts nunca acceden a números telefónicos directos de los menores. Toda comunicación se canaliza al número verificado del tutor legal mediante un enlace seguro y preformateado de WhatsApp (`https://wa.me/{phone}?text=...`).
2. **Registro de Auditoría e Interacción:** Cada clic en el botón de contacto se audita e inserta en la tabla `scout_activity_logs` con `activity_type = 'WHATSAPP_CONTACT_CLICK'`.
3. **Loop de Retención y Valor Percibido (Radar de Visualizaciones):** Las familias de los atletas necesitan recibir retroalimentación constante sobre el interés que sus representados despiertan en los clubes profesionales. En el panel del tutor (`TutorDashboardComponent`), un widget interactivo de analíticas mostrará:
   - *"Tu perfil apareció en X búsquedas"*
   - *"Scouts de [Club / Organización] vieron tu perfil"*
   - Historial de interacciones recientes de cazatalentos verificados.
4. **Directiva Obligatoria de Interfaz (Cero Clichés / Cero mención 'LOPNNA' en Botones y Labels):** Por directriz explícita del producto, los botones, etiquetas (labels) e insignias de usuario jamás deben mostrar la palabra "LOPNNA". Se empleará terminología profesional y amigable orientada al usuario: *"Contactar al Representante Legal"*, *"Contacto Seguro vía WhatsApp"*, *"Protección al Menor"*, *"Consentimiento Legal Activo"*, etc.

---

## 2. Alcance Técnico y Arquitectura

### 2.1. Componentes del Sistema Afectados
* **Base de Datos (Neon PostgreSQL):** Tabla existente `scout_activity_logs` (creada en la migración fundacional `20260929171117_create_initial_schema.sql`).
* **Backend Spring Boot 3 (Java 21):**
  - Entidad JPA `ScoutActivityLog` mapeando `scout_activity_logs`.
  - Repositorio `ScoutActivityLogRepository`.
  - DTOs Lombok: `ContactClickRequest`, `ContactClickResponse`, `TutorRadarMetricsResponse`, `ScoutInteractionItem`, `AthleteRadarMetricItem`.
  - Servicio `ScoutContactService` para orquestar la generación del enlace seguro de WhatsApp, logging inmutable y agregación de métricas de radar.
  - Controlador `ScoutDirectoryController` / `ScoutContactController` para el endpoint `POST /api/v1/scouts/contact-click` y registro de vistas.
  - Controlador `AthleteController` para el endpoint protegido `GET /api/v1/athletes/radar` que alimenta el dashboard del tutor.
* **Frontend Angular 18+ (Standalone):**
  - Botón de Contacto Seguro en tarjetas de `ScoutDirectoryComponent` (directorio) y modal de previsualización.
  - Botón de Contacto Seguro en `BentoProfileComponent` (visible para scouts acreditados autenticados).
  - Servicio Angular `ScoutContactService` / extensión de `ScoutDirectoryService`.
  - Widget reactivo de **Radar de Actividad de Scouts** en `TutorDashboardComponent`.
  - Limpieza exhaustiva de etiquetas, botones e insignias con la palabra "LOPNNA" en la UI de toda la aplicación.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)

### 3.1. Estado de la Tabla `scout_activity_logs`
La estructura ya está desplegada y versionada en `talentus-scout-migrations/migrations/20260929171117_create_initial_schema.sql`:
```sql
CREATE TABLE scout_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    video_id UUID REFERENCES athlete_videos(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scout_activity ON scout_activity_logs(athlete_id, created_at DESC);
```
**Conclusión DDL:** No se requiere migración DDL adicional en PostgreSQL / dbmate; todos los campos, claves foráneas e índices necesarios están presentes.

---

## 4. Especificación Backend (Spring Boot 3 / Java 21)

### 4.1. Directiva Obligatoria de Modelado
Uso estricto de Project Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`, `@Builder.Default`). Instanciación mediante `.builder()`.

### 4.2. Clases a Crear o Modificar

#### 1. Entidad JPA: `ScoutActivityLog.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/ScoutActivityLog.java`
* **Mapeo:**
  - `@ManyToOne(fetch = FetchType.LAZY) User scout`
  - `@ManyToOne(fetch = FetchType.LAZY) Athlete athlete`
  - `@ManyToOne(fetch = FetchType.LAZY) AthleteVideo video`
  - `@Column(name = "activity_type", nullable = false) String activityType`
  - `@Column(name = "created_at", updatable = false) Instant createdAt`

#### 2. Enum o Constantes: `ActivityTypeConstants` o `ScoutActivityType`
* Valores soportados: `WHATSAPP_CONTACT_CLICK`, `PROFILE_VIEW`, `VIDEO_PLAY`, `SEARCH_APPEARANCE`.

#### 3. Repositorio: `ScoutActivityLogRepository.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/repository/ScoutActivityLogRepository.java`
* **Métodos clave:**
  - `long countByAthleteIdAndActivityType(UUID athleteId, String activityType)`
  - `long countByAthleteTutorIdAndActivityType(UUID tutorId, String activityType)`
  - `List<ScoutActivityLog> findTop15ByAthleteTutorIdOrderByCreatedAtDesc(UUID tutorId)`
  - `List<ScoutActivityLog> findTop10ByAthleteIdOrderByCreatedAtDesc(UUID athleteId)`

#### 4. DTOs:
* `ContactClickRequest`: `@NotNull private UUID athleteId;`
* `ContactClickResponse`: `private String whatsappUrl; private String tutorName; private String athleteName;`
* `TutorRadarMetricsResponse`: Métricas consolidadas (búsquedas, vistas, contactos), lista de interacciones de scouts con club y tiempo relativo.
* `ScoutInteractionItem`: `scoutName`, `scoutClub`, `scoutRole`, `activityType`, `athleteName`, `timestamp`.
* `AthleteRadarMetricItem`: Desglose por cada atleta representado.

#### 5. Servicio: `ScoutContactService.java`
* **Ruta:** `talentus-scout-be/src/main/java/com/talentus/scout/service/ScoutContactService.java`
* **Lógica `registerContactClick`:**
  1. Busca el atleta y valida que exista.
  2. Obtiene el tutor legal (`athlete.getTutor()`) y su número de teléfono.
  3. Sanitiza el teléfono a formato internacional sin símbolos: `+58 412-1234567` -> `584121234567`.
  4. Obtiene el usuario Scout autenticado y su club/organización desde `ScoutProfile`.
  5. Construye el mensaje predeterminado:
     `"Hola " + tutor.getFullName() + ", soy " + scoutName + " de " + clubName + ". He visto el perfil de " + athlete.getFullName() + " en Talentus Scout y me gustaría conversar sobre su proyección deportiva."`
  6. Codifica la URL con `URLEncoder.encode(..., StandardCharsets.UTF_8).replace("+", "%20")`.
  7. Inserta registro en `scout_activity_logs` con `activity_type = 'WHATSAPP_CONTACT_CLICK'`.
  8. Retorna `ContactClickResponse`.
* **Lógica `getTutorRadarMetrics`:**
  1. Identifica al tutor legal autenticado.
  2. Consulta totales de `SEARCH_APPEARANCE`, `PROFILE_VIEW` y `WHATSAPP_CONTACT_CLICK`.
  3. Mapea las interacciones recientes extrayendo el club del perfil del scout (`scoutProfileRepository.findByUser(scout)`).
  4. Retorna el DTO `TutorRadarMetricsResponse`.

#### 6. Endpoints REST:
* `POST /api/v1/scouts/contact-click`:
  - Seguridad: `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`
* `POST /api/v1/scouts/log-view`:
  - Registra `PROFILE_VIEW` cuando un scout abre una ficha.
* `GET /api/v1/athletes/radar`:
  - Seguridad: `@PreAuthorize("hasRole('TUTOR') or hasRole('ADMIN')")`
  - Retorna las métricas del radar para el tutor autenticado.

---

## 5. Frontend: Angular 18+ (Standalone & UI Design)

### 5.1. Regla Mandatoria de Estilo y Nomenclatura
* Cero uso de "LOPNNA" en botones, etiquetas, badges o textos visibles al usuario.
* En el botón de contacto en el directorio:
  - Botón distintivo verde esmeralda institucional: `"Contactar al Representante"` con ícono SVG de WhatsApp.
  - Al hacer clic, ejecuta `POST /api/v1/scouts/contact-click`, obtiene la URL de WhatsApp y abre una nueva pestaña (`window.open(res.whatsappUrl, '_blank')`).
* En el panel del tutor (`TutorDashboardComponent`):
  - Nuevo widget Bento Grid: **Radar de Actividad de Scouts** (`bento-card col-span-12 md-col-6`).
  - Métricas destacadas:
    - *"Tu perfil apareció en X búsquedas"*
    - *"X scouts vieron tu perfil"*
    - *"X solicitudes de contacto directo"*
  - Lista de actividad con insignias por club: *"Scout de Caracas FC consultó la ficha de Gabriel"*.
* Limpieza en otros componentes:
  - `navbar.component.ts`: Cambiar `"Registro Tutor LOPNNA"` por `"Registro de Representante"`.
  - `tutor-dashboard.component.ts`: Cambiar `"LOPNNA ART. 65 ACTIVO"` por `"CONSENTIMIENTO LEGAL ACTIVO"`, y `"Blindaje Legal LOPNNA"` por `"Protección Legal del Menor"`.
  - `register-tutor.component.ts`: Cambiar etiquetas de consentimiento para usar `"Marco de Protección Legal al Menor"`.

---

## 6. Plan de Pruebas y Validación

### 6.1. Pruebas Backend
* Pruebas unitarias de `ScoutContactService`:
  - Generación adecuada de URL de WhatsApp con codificación correcta de espacios (`%20`).
  - Sanitización de números telefónicos venezolanos e internacionales.
  - Registro efectivo en `ScoutActivityLogRepository`.
  - Manejo de excepciones si el tutor no tiene teléfono o si el atleta no existe.
* Pruebas de integración de endpoints:
  - `POST /api/v1/scouts/contact-click` con usuario scout verificado -> 200 OK y URL formateada.
  - `POST /api/v1/scouts/contact-click` con usuario tutor o no autorizado -> 403 Forbidden.
  - `GET /api/v1/athletes/radar` con tutor autenticado -> 200 OK con métricas y lista de scouts.

### 6.2. Pruebas Frontend
* Verificación de apertura de ventana de WhatsApp en `ScoutDirectoryComponent`.
* Verificación del renderizado del widget de Radar en `TutorDashboardComponent`.
* Verificación visual y textual de ausencia total de la palabra "LOPNNA" en botones y labels.

---

## 7. Checklist Paso a Paso (Para trello_implementer)

- [ ] **Paso 1: Entidad y Repositorio Backend**
  - [ ] Crear entidad `ScoutActivityLog.java` con Lombok.
  - [ ] Crear repositorio `ScoutActivityLogRepository.java`.
- [ ] **Paso 2: DTOs Backend**
  - [ ] Crear `ContactClickRequest.java` y `ContactClickResponse.java`.
  - [ ] Crear `TutorRadarMetricsResponse.java`, `ScoutInteractionItem.java` y `AthleteRadarMetricItem.java`.
- [ ] **Paso 3: Lógica de Negocio y Servicio**
  - [ ] Implementar `ScoutContactService.java` con métodos para click de WhatsApp, logging de visitas y métricas del tutor.
  - [ ] Añadir método en `ScoutDirectoryService` para registrar impresiones de búsqueda si aplica.
- [ ] **Paso 4: Controladores REST**
  - [ ] Añadir endpoint `POST /api/v1/scouts/contact-click` y `POST /api/v1/scouts/log-view` en `ScoutDirectoryController.java`.
  - [ ] Añadir endpoint `GET /api/v1/athletes/radar` en `AthleteController.java`.
- [ ] **Paso 5: Pruebas Backend**
  - [ ] Crear y ejecutar pruebas unitarias para `ScoutContactService`.
  - [ ] Compilar y verificar con `./mvnw clean test-compile`.
- [ ] **Paso 6: Servicios y Modelos Frontend**
  - [ ] Crear interfaces de radar y contacto en `talentus-scout-fe`.
  - [ ] Crear `ScoutContactService` en Angular.
- [ ] **Paso 7: Botón de Contacto en Directorio de Scouts**
  - [ ] Agregar botón "Contactar al Representante" con ícono de WhatsApp en `scout-directory.component.html` y `.ts`.
  - [ ] Agregar integración de contacto seguro en `bento-profile.component.html` para scouts autenticados.
- [ ] **Paso 8: Widget de Radar en Tutor Dashboard**
  - [ ] Implementar la carga y visualización de métricas en tiempo real en `tutor-dashboard.component.ts` y `.html`.
  - [ ] Diseñar el widget con estética premium Bento Grid y tarjetas de métricas.
- [ ] **Paso 9: Limpieza de la palabra LOPNNA en Botones y Labels**
  - [ ] Modificar `navbar.component.ts`.
  - [ ] Modificar `tutor-dashboard.component.ts`.
  - [ ] Modificar `register-tutor.component.ts`.
  - [ ] Modificar `landing.component.ts`, `login.component.ts`, `admin-scouts.component.html` y `bento-profile.component.html`.
- [ ] **Paso 10: Compilación y Verificación Global**
  - [ ] Ejecutar `./mvnw test` en backend.
  - [ ] Ejecutar `npm run build` en frontend.
  - [ ] Redactar `test/TS-14-test-plan-contacto-whatsapp-radar-visualizaciones.md`.
  - [ ] Mover tarjeta en Trello de `in development` a `in testing` con comentario de cierre.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

- [ ] El scout nunca ve el número de teléfono del menor (estricta privacidad y canalización al tutor).
- [ ] El botón abre WhatsApp directamente con el texto prellenado listo para enviar.
- [ ] Cada clic de contacto queda registrado en `scout_activity_logs`.
- [ ] El panel del tutor muestra el radar con métricas reales de visualizaciones e interacciones de scouts.
- [ ] Ningún botón ni label de la interfaz de usuario contiene la palabra "LOPNNA".
- [ ] Compilación backend (`mvn compile`) y frontend (`ng build`) pasan limpiamente sin errores.
