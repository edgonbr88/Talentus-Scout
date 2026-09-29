# Talentus Scout — Backlog de Tareas para Trello (Columna: To Do)

**Objetivo:** Este documento contiene las tarjetas detalladas para poblar la columna **To Do** del tablero de Trello [Talentus Scout](https://trello.com/b/rPHiaZJ1/talentus-scout).  
**Estrategia:** **Entorno Local Integral con Docker Compose & dbmate.** Todos los servicios (`docker-postgresql`, `dbmate`, `talentus-scout-be`, `talentus-scout-fe`) conviven en una red interna de Docker (`talentus-net`). En GitHub se crean los repositorios modulares al inicio (`talentus-scout-migrations`, `talentus-scout-be`, `talentus-scout-fe`), y la promoción a la nube (Neon y Cloud Run) se ejecuta al final.  
**Destinatarios:** Diseñado con el nivel de rigor, contexto técnico, legal y criterios de aceptación requeridos por un **Agente Planificador** y un **Agente Implementador**.

---

## 📌 SPRINT 1: Orquestador Docker Compose, Migraciones dbmate, Backend y Auth LOPNNA

---

### [TS-01] Orquestador Docker Compose (talentus-net) y Repo de Migraciones con dbmate & PostgreSQL

* **Lista en Trello:** `To Do`
* **Etiquetas:** `DevOps`, `Docker`, `dbmate`, `Sprint 1`
* **Contexto de Negocio:**
  * Fundamento de infraestructura de desarrollo. Orquesta en una sola red Docker (`talentus-net`) la base de datos PostgreSQL y el contenedor de migraciones automáticas `dbmate`. Permite que cualquier desarrollador o agente levante la infraestructura local con un solo comando (`docker compose up -d`).
* **Especificación Técnica:**
  1. Crear repositorio en GitHub `talentus-scout-migrations` y repositorio orquestador del workspace.
  2. Crear archivo `docker-compose.yml` en la raíz definiendo la red `talentus-net`:
     * **Servicio `docker-postgresql`:** Imagen `postgres:16-alpine`, puerto `5432:5432`, volumen persistente `./postgresql/data`, healthcheck con `pg_isready`.
     * **Servicio `dbmate`:** Imagen `amacneil/dbmate:latest`, volumen montado `./talentus-scout-migrations:/db`, `depends_on` de `docker-postgresql` (`condition: service_healthy`), comando ejecutor `/db/init_dbmate.sh`.
  3. Crear script `talentus-scout-migrations/init_dbmate.sh` que espere a PostgreSQL y ejecute `dbmate --migrations-dir /db/migrations up`.
  4. Crear archivo `.env` local con credenciales (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`).
  5. Configurar scripts de conveniencia `scripts/dev-up.sh` y `scripts/dev-down.sh`.
* **Criterios de Aceptación (DoD):**
  * `docker compose up -d` arranca PostgreSQL y pasa su healthcheck.
  * El contenedor `dbmate` espera a PostgreSQL, ejecuta el script `init_dbmate.sh` y sale con código 0.
  * El repositorio `talentus-scout-migrations` queda versionado y sincronizado con GitHub.
* **Dependencias:** Ninguna.

---

### [TS-02] Esquema DDL Canónico de Talentus Scout con dbmate (Users, LOPNNA, Athletes, Badges, Videos, Pagos)

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Database`, `dbmate`, `PostgreSQL`, `Sprint 1`
* **Contexto de Negocio:**
  * Modela la totalidad de los datos del MVP con rigor relacional en 3FN, separación de identidades adultos vs menores, auditoría LOPNNA Art. 65 y sellos de multicertificación. Las migraciones son SQL puro y agnósticas al framework.
* **Especificación Técnica:**
  1. En `talentus-scout-migrations/migrations/`, crear la migración inicial `YYYYMMDDHHMMSS_initial_schema.sql`.
  2. En el bloque `-- migrate:up`:
     * Extensión `uuid-ossp`.
     * ENUMs: `user_role`, `account_status`, `scout_verification_status`, `video_status`, `badge_type`, `badge_status`, `payment_method`, `payment_status`, `subscription_status`.
     * Tablas completas: `users`, `tutor_legal_consents`, `clubs_organizations`, `verifier_delegates`, `athletes`, `athlete_badges`, `athlete_videos`, `scout_profiles`, `subscription_plans`, `athlete_subscriptions`, `payment_transactions`, `scout_activity_logs`.
     * Índices en `slug`, combinados de búsqueda de scouts y claves foráneas.
  3. En el bloque `-- migrate:down`:
     * Sentencias `DROP TABLE IF EXISTS ... CASCADE` y `DROP TYPE IF EXISTS ...` en orden inverso de dependencias.
  4. Ejecutar el contenedor `dbmate` para aplicar los cambios y generar el archivo canónico `talentus-scout-migrations/schema.sql`.
* **Criterios de Aceptación (DoD):**
  * Al levantar `docker compose up dbmate`, todas las 12 tablas se crean exitosamente en `docker-postgresql`.
  * `schema.sql` refleja la estructura canónica idéntica a la especificación técnica.
* **Dependencias:** `TS-01`.

---

### [TS-02B] Seed Inicial de Clubes y Organizaciones en talentus-scout-migrations

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Database`, `dbmate`, `Core Domain`, `Sprint 1`
* **Contexto de Negocio:**
  * Precarga en la base de datos la lista inicial de los 30 clubes y academias afiliados a la Asociación de Fútbol de Caracas y Liga FUTVE para permitir que los atletas completen su ficha sin errores de tipeo.
* **Especificación Técnica:**
  1. Crear migración `YYYYMMDDHHMMSS_seed_clubs.sql` en `talentus-scout-migrations/migrations/`.
  2. Insertar registros oficiales (Caracas FC, Deportivo Miranda, Petare FC, Fratelsa Sport, etc.) con sus ciudades, estados y códigos federativos.
  3. Ejecutar migración vía `docker compose up dbmate`.
* **Criterios de Aceptación (DoD):**
  * La tabla `clubs_organizations` contiene los 30 registros oficiales listos para ser consumidos por el backend.
* **Dependencias:** `TS-02`.

---

### [TS-03] Inicialización del Backend Spring Boot (talentus-scout-be) en Docker Compose con Spring Security 6

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Docker`, `Security`, `Sprint 1`
* **Contexto de Negocio:**
  * Servicio central de lógica de negocio y APIs REST. Corre dentro de la red `talentus-net` conectándose internamente al host `docker-postgresql:5432`, arrancando solo después de que `dbmate` haya aplicado las migraciones.
* **Especificación Técnica:**
  1. Crear repositorio en GitHub `talentus-scout-be`.
  2. Inicializar proyecto Spring Boot 3.3+ (Java 21, Maven Wrapper `./mvnw`).
  3. Crear `Dockerfile` multi-stage para construir la imagen `talentus-scout-be:latest`.
  4. Configurar el servicio `talentus-scout-be` en `docker-compose.yml`:
     * `depends_on: dbmate` (`condition: service_completed_successfully`).
     * Variables de entorno: `DB_HOST=docker-postgresql`, `DB_PORT=5432`, `DB_USER`, `DB_PWD`, `DB_NAME`, `JWT_SECRET_KEY`.
     * Puerto expuesto: `8080:8080`.
     * Red: `talentus-net`.
  5. Configurar Spring Security 6 stateless con JWT, filtro de autorización y endpoint `POST /api/v1/auth/login`.
* **Criterios de Aceptación (DoD):**
  * `docker compose up talentus-scout-be` compila, arranca y conecta a PostgreSQL a través de la red interna.
  * Endpoint `/api/v1/auth/login` responde `200 OK` con JWT válido ante credenciales correctas.
* **Dependencias:** `TS-01`, `TS-02`.

---

### [TS-04] Onboarding Legal del Tutor y Registro de Consentimiento LOPNNA (Art. 65)

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Legal / LOPNNA`, `Sprint 1`
* **Contexto de Negocio:**
  * Requisito legal no negociable en Venezuela. Para publicar fotos o videos de menores, el tutor legal debe prestar consentimiento explícito, inmutable y auditable (Art. 65 LOPNNA).
* **Especificación Técnica:**
  1. Crear endpoint `POST /api/v1/auth/register-tutor`.
  2. DTO de entrada: `fullName`, `email`, `password`, `phoneNumber` (formato E.164, ej: `+584121234567`), `acceptLopnnaTerms` (boolean obligatorio `true`).
  3. En una sola transacción `@Transactional`:
     * Crear registro en tabla `users` con rol `TUTOR` y estado `ACTIVE`.
     * Capturar IP del cliente (`HttpServletRequest.getRemoteAddr()`) y User-Agent.
     * Insertar registro en `tutor_legal_consents` vinculando `tutor_id`, IP, versión de términos (`1.0`) y timestamp exacto.
  4. Retornar token JWT listo para iniciar sesión inmediatamente.
* **Criterios de Aceptación (DoD):**
  * Si `acceptLopnnaTerms` es `false`, la API responde `400 Bad Request` y no crea el usuario.
  * El número telefónico se valida con expresión regular para garantizar que sea un número válido para WhatsApp.
  * Queda registrado el log inmutable del consentimiento legal en `tutor_legal_consents`.
* **Dependencias:** `TS-02`, `TS-03`.

---

### [TS-05] Cédula Deportiva del Atleta: Entidades JPA, DTOs y CRUD del Representante

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Core Domain`, `Sprint 1`
* **Contexto de Negocio:**
  * Permite al tutor registrar a sus hijos/representados deportistas, generando su cédula digital y su URL única amigable (`slug`).
* **Especificación Técnica:**
  1. Crear entidad JPA `Athlete` con relación `ManyToOne` hacia `User` (tutor).
  2. Implementar servicio generador de `slug` único (ej: `gabriel-perez-10`) a partir de nombre, apellido y número aleatorio/dorsal.
  3. Crear endpoints protegidos para el tutor:
     * `POST /api/v1/athletes`: Crear nuevo atleta con validación de edad (menor a 21 años).
     * `GET /api/v1/athletes/my-athletes`: Listar los atletas bajo la tutela del usuario autenticado.
     * `PUT /api/v1/athletes/{id}`: Actualizar ficha deportiva (posición, altura, peso, club actual).
  4. Endpoint público `GET /api/v1/clubs`: Autocompletado de clubes para el formulario.
  5. Seguridad: Validar que el `tutor_id` del atleta coincida estrictamente con el ID del usuario en el JWT (`@PreAuthorize("@athleteSecurity.isOwner(#id, principal)")`).
* **Criterios de Aceptación (DoD):**
  * Un tutor no puede ver ni modificar atletas de otro tutor.
  * El slug generado es URL-safe y único en la base de datos.
* **Dependencias:** `TS-02B`, `TS-03`, `TS-04`.

---

## 📌 SPRINT 2: Frontend Angular en Docker Compose, Bento Grid y Streaming de Video

---

### [TS-06] Inicialización del Frontend Angular (talentus-scout-fe) en Docker Compose con Nginx

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Frontend`, `Angular`, `Docker`, `Nginx`, `Sprint 2`
* **Contexto de Negocio:**
  * Interfaz de usuario servida mediante Nginx en los puertos 80 y 443 en el contenedor `talentus-scout-fe`, comunicada con `talentus-scout-be:8080` a través de la red interna `talentus-net`.
* **Especificación Técnica:**
  1. Crear repositorio en GitHub `talentus-scout-fe`.
  2. Inicializar proyecto Angular 18+ (Standalone components, routing, CSS).
  3. Configurar Nginx (`nginx.conf`) para servir la SPA y hacer proxy reverso hacia `http://talentus-scout-be:8080/api/`.
  4. Crear `Dockerfile` multi-stage (Node 22 para build, Nginx Alpine para runtime).
  5. Configurar el servicio `talentus-scout-fe` en `docker-compose.yml`:
     * Puertos: `80:80`, `443:443`.
     * Red: `talentus-net`.
     * Volumen para certificados SSL locales: `./nginx/ssl:/etc/nginx/ssl:ro`.
  6. Crear componentes de autenticación: Login y Registro de Tutor con validación LOPNNA.
* **Criterios de Aceptación (DoD):**
  * `docker compose up talentus-scout-fe` levanta Nginx en `http://localhost`.
  * La aplicación carga en el navegador y puede autenticar al tutor consumiendo el backend local.
* **Dependencias:** `TS-03`, `TS-04`.

---

### [TS-07] Pipeline de Video Streaming con Abstracción de Proveedor (Mock Local / Cloudflare)

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Video / Streaming`, `Sprint 2`
* **Contexto de Negocio:**
  * Permite subir y reproducir videos en local durante el desarrollo sin requerir cuenta paga de Cloudflare de inmediato, pero dejando el adaptador listo para activarla cuando pasemos a la nube.
* **Especificación Técnica:**
  1. Crear interfaz Java `VideoStreamProvider`:
     * `UploadTicket requestUploadTicket(String athleteId, String title);`
     * `VideoDetails parseWebhook(String payload, String signature);`
  2. Implementar `MockLocalVideoStreamProvider` (almacena en carpeta local `uploads/videos/` y genera URLs estáticas de prueba para desarrollo).
  3. Implementar `CloudflareStreamProvider` (cliente HTTP con API Key para producción).
  4. Endpoint `POST /api/v1/videos/request-upload` y `POST /api/v1/videos/webhook`.
* **Criterios de Aceptación (DoD):**
  * En entorno local, el sistema simula la carga y estado `READY` del video sin fallar por falta de credenciales de Cloudflare.
* **Dependencias:** `TS-03`, `TS-05`.

---

### [TS-08] Componente Frontend de Subida de Video con Barra de Progreso y Miniatura

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Frontend`, `Angular`, `Sprint 2`
* **Contexto de Negocio:**
  * Los padres graban desde teléfonos celulares. La subida debe mostrar el progreso en tiempo real y ser tolerante a fallos.
* **Especificación Técnica:**
  1. Crear componente standalone `VideoUploaderComponent` en Angular 18+.
  2. Barra de progreso dinámica con porcentaje y velocidad estimada.
  3. Feedback visual de transcodificación (spinner "Procesando video...").
  4. Validación de formatos (MP4, MOV) y tamaño máximo de 500MB.
* **Criterios de Aceptación (DoD):**
  * Barra de progreso fluida e integración con el endpoint `request-upload`.
* **Dependencias:** `TS-06`, `TS-07`.

---

### [TS-09] Perfil Público del Atleta en Angular con SSR y Open Graph Dinámico

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Frontend`, `SSR`, `Design`, `Sprint 2`
* **Contexto de Negocio:**
  * Vitrina pública compartible. Cuando un padre comparte `https://talentus.app/atleta/gabriel-perez-10` en WhatsApp o Instagram, debe aparecer una previsualización atractiva y abrir una vista Bento Grid móvil ultrarrápida.
* **Especificación Técnica:**
  1. Activar `@angular/ssr` para Server-Side Rendering de la ruta `/atleta/:slug`.
  2. Inyección dinámica de meta-tags Open Graph (`og:title`, `og:image`, `og:description`).
  3. Maquetado Bento Grid deportivo:
     * Tarjeta 1: Foto, nombre, edad cronológica, pierna hábil y club.
     * Tarjeta 2: Biotipo y antropometría (altura, peso, pasaportes).
     * Tarjeta 3: Reproductor de video HLS optimizado con `hls.js`.
     * Tarjeta 4: Insignias de confianza verificadas.
     * Botón flotante: "Compartir por WhatsApp".
* **Criterios de Aceptación (DoD):**
  * `curl -A "WhatsApp/2.0" http://localhost/atleta/slug` retorna el HTML con los meta-tags OG listos para preview.
* **Dependencias:** `TS-05`, `TS-06`.

---

### [TS-10] Generador de Hoja de Vida Deportiva (CV en PDF) en 1 Clic

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Feature`, `Sprint 2`
* **Contexto de Negocio:**
  * Valor inmediato Día 1. Descarga de la ficha técnica estandarizada y estética en PDF para pruebas presenciales, convocatorias y consulados.
* **Especificación Técnica:**
  1. Implementar servicio en backend con librería PDF (OpenPDF / iText o Flying Saucer).
  2. Endpoint: `GET /api/v1/athletes/{id}/cv-pdf`.
  3. Diseño estructurado: Foto, datos de nacimiento, club, trayectoria, badges de certificación y código QR que apunta al perfil web público interactivo.
* **Criterios de Aceptación (DoD):**
  * PDF generado en < 500ms con peso < 300KB.
  * El código QR escaneable abre el perfil del atleta.
* **Dependencias:** `TS-05`, `TS-09`.

---

## 📌 SPRINT 3: Directorio de Scouts Acreditados y Contacto Seguro WhatsApp

---

### [TS-11] Registro de Scouts con Carga de Credenciales (Storage Local) y Estado `PENDIENTE_VERIFICACION`

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Security`, `Scouts`, `Sprint 3`
* **Contexto de Negocio:**
  * Protección de menores (LOPNNA). No cualquier usuario puede ver el directorio de jóvenes deportistas. El scout debe enviar credenciales comprobables para ser auditado antes de tener acceso.
* **Especificación Técnica:**
  1. Endpoint `POST /api/v1/auth/register-scout` (multipart/form-data).
  2. Capa de almacenamiento desacoplada (`FileStorageService`) que en local guarda en `uploads/credentials/`.
  3. Crea el usuario con rol `SCOUT` y estado `PENDIENTE_VERIFICACION`.
  4. Inserta registro en `scout_profiles` con `verification_status = 'PENDING'`.
* **Criterios de Aceptación (DoD):**
  * Si un scout pendiente intenta consultar el directorio, recibe `403 Forbidden` con mensaje de auditoría en curso.
* **Dependencias:** `TS-03`.

---

### [TS-12] Panel de Auditoría y Aprobación de Scouts para Administradores

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `Admin`, `Sprint 3`
* **Contexto de Negocio:**
  * Permite al equipo de Talentus Scout revisar la documentación consignada por los scouts y aprobar o rechazar su ingreso en menos de 24 horas.
* **Especificación Técnica:**
  1. Endpoint `GET /api/v1/admin/scouts/pending`: Lista paginada con enlace para ver la credencial consignada.
  2. Endpoint `POST /api/v1/admin/scouts/{scoutProfileId}/review`:
     * Payload: `decision` (`APPROVE` o `REJECT`), `rejectionReason`.
     * Si es aprobado: cambia `scout_profiles.verification_status` a `APPROVED` y activa el usuario.
  3. Vista sencilla en Angular para el Administrador con botón de aprobar/rechazar.
* **Criterios de Aceptación (DoD):**
  * Aprobación en 1 solo clic. Al ser aprobado, el scout puede iniciar sesión inmediatamente y buscar talentos.
* **Dependencias:** `TS-11`.

---

### [TS-13] Directorio de Búsqueda de Atletas con Filtros Avanzados para Scouts

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `Scouts`, `Sprint 3`
* **Contexto de Negocio:**
  * Los scouts necesitan encontrar perfiles específicos en segundos (ej. "Delanteros zurdos nacidos en 2010 con pasaporte europeo").
* **Especificación Técnica:**
  1. Endpoint `GET /api/v1/scouts/directory` con Spring Data JPA Specifications:
     * Filtros: `birthYear`, `primaryPosition`, `preferredFoot`, `clubId`, `hasEuropeanPassport`, `hasVideo`.
     * Paginación (`Pageable`) y ordenamiento por fecha de actualización o cantidad de insignias.
  2. Componente Angular `ScoutDirectoryComponent`:
     * Barra de filtros rápidos por chips (categorías Sub-15, Sub-17, Sub-20).
     * Cuadrícula de tarjetas de atletas con foto, posición, club actual, insignias de verificación y botón de reproducción rápida de video.
* **Criterios de Aceptación (DoD):**
  * Consultas con filtros tardan menos de 100ms en local gracias a los índices definidos en la migración de dbmate.
* **Dependencias:** `TS-05`, `TS-09`, `TS-12`.

---

### [TS-14] Botón de Contacto Seguro WhatsApp LOPNNA y Radar de Visualizaciones

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `Retention`, `Sprint 3`
* **Contexto de Negocio:**
  * Canaliza la comunicación directo al tutor legal vía WhatsApp con mensaje predeterminado. Registra la métrica para mostrarla en el panel de la familia y alimentar el loop de retención.
* **Especificación Técnica:**
  1. Endpoint `POST /api/v1/scouts/contact-click`:
     * Recibe `{ athleteId }`.
     * Extrae el teléfono verificado del tutor.
     * Inserta evento en `scout_activity_logs` con `activity_type = 'WHATSAPP_CONTACT_CLICK'`.
     * Genera y retorna el link `https://wa.me/{tutor_phone}?text={mensaje_preformateado}` con los nombres del scout, su club y el atleta.
  2. En el panel del tutor (`TutorDashboardComponent`), mostrar widget de analíticas:
     * *"Tu perfil apareció en X búsquedas"*
     * *"Scouts de [Club] vieron tu perfil"*
* **Criterios de Aceptación (DoD):**
  * El scout nunca ve el número de teléfono del menor (estricta privacidad).
  * El botón abre WhatsApp directamente con el texto prellenado listo para enviar.
* **Dependencias:** `TS-05`, `TS-13`.

---

## 📌 SPRINT 4: Verificación Dual, Monetización Día 1 y Promoción a la Nube

---

### [TS-15] Portal de Organización Verificadora y Fast-Track Asistido

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `Verification`, `Sprint 4`
* **Contexto de Negocio:**
  * Doble vía de certificación: los clubes afiliados validan fichas desde su portal, o el admin lo hace por vía rápida cotejando fotos de carnets federativos cargados por los padres.
* **Especificación Técnica:**
  1. Rol `VERIFIER_ORG` asociado a un club deportivo.
  2. Endpoint `GET /api/v1/verifier/athletes` y `POST /api/v1/verifier/certify`.
  3. Endpoint `POST /api/v1/athletes/{id}/submit-evidence` para carga de carnet por la familia.
  4. Panel de revisión rápida para Admin contra listado CSV oficial.
* **Criterios de Aceptación (DoD):**
  * Al certificar, la insignia aparece inmediatamente en el perfil público del atleta.
* **Dependencias:** `TS-02B`, `TS-05`.

---

### [TS-16] Módulo de Monetización Día 1: Planes Pro y Reporte de Pago Móvil con Captura

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `Payments`, `Sprint 4`
* **Contexto de Negocio:**
  * Cobro activo desde el lanzamiento del piloto con Pago Móvil en bolívares a tasa oficial BCV.
* **Especificación Técnica:**
  1. Semilla de planes en `subscription_plans`: `FREE_BASIC` ($0), `PRO_MONTHLY` ($5/mes), `SEASON_PASS_6M` ($25/semestre).
  2. Endpoint público `GET /api/v1/payments/bcv-rate` (consulta y cachea tasa oficial).
  3. Endpoint `POST /api/v1/payments/report-pago-movil` (referencia bancaria + captura).
  4. Panel Admin `GET /api/v1/admin/payments/pending` y `POST /api/v1/admin/payments/{id}/approve`.
* **Criterios de Aceptación (DoD):**
  * Al aprobar el pago, el perfil del atleta pasa instantáneamente a estado `PRO`.
* **Dependencias:** `TS-05`.

---

### [TS-17] Panel de Conciliación de Pagos para Administradores y Webhook Binance Pay

* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `Payments`, `Sprint 4`
* **Contexto de Negocio:**
  * Permite validar los pagos en bolívares en menos de 15 minutos para activar las funciones Pro de inmediato, además de automatizar los pagos en criptoactivos (USDT).
* **Especificación Técnica:**
  1. Endpoint `GET /api/v1/admin/payments/pending`: Cola de pagos reportados con referencia bancaria y vista previa de la captura.
  2. Endpoint `POST /api/v1/admin/payments/{transactionId}/approve`.
  3. Webhook `POST /api/v1/payments/binance-pay/webhook` para activación 100% automática.
* **Criterios de Aceptación (DoD):**
  * Flujo de conciliación y activación automática validado.
* **Dependencias:** `TS-16`.

---

### [TS-18] Promoción de Base de Datos a la Nube (Neon Serverless Postgres con dbmate)

* **Lista en Trello:** `To Do`
* **Etiquetas:** `DevOps`, `Database`, `Neon`, `Sprint 4`
* **Contexto de Negocio:**
  * Una vez que todo el backend y frontend han sido probados y validados exhaustivamente en el PostgreSQL local de Docker, se promociona la base de datos a Neon en la nube con cero fricción.
* **Especificación Técnica:**
  1. Crear proyecto y base de datos en [Neon.tech](https://neon.tech).
  2. Configurar la cadena de conexión de Neon en la variable de entorno:
     `DATABASE_URL="postgres://usuario:password@ep-...neon.tech/neondb?sslmode=require"`
  3. Ejecutar las migraciones canónicas de dbmate contra Neon:
     `dbmate up` (o correr el contenedor `dbmate` apuntando a Neon).
  4. Verificar paridad exacta de tablas, índices y secuencias entre local y Neon con `dbmate status`.
  5. Configurar `application-prod.yml` en Spring Boot apuntando al pool JDBC de Neon con SSL obligatorio.
* **Criterios de Aceptación (DoD):**
  * `dbmate up` aplica todas las migraciones en Neon sin discrepancias de esquema.
  * El backend Spring Boot se conecta a Neon y supera los tests de integración en la nube.
* **Dependencias:** `TS-02`, `TS-16`.

---

### [TS-19] Despliegue de Producción en GCP Cloud Run y Vercel/Cloudflare con CI/CD

* **Lista en Trello:** `To Do`
* **Etiquetas:** `DevOps`, `Cloud Run`, `CI/CD`, `Sprint 4`
* **Contexto de Negocio:**
  * Pase final a producción para recibir a los primeros 100 atletas federados en canchas reales.
* **Especificación Técnica:**
  1. Configurar `Dockerfile` multi-stage para Spring Boot 3 con Eclipse Temurin 21.
  2. Configurar `Dockerfile` o pipeline de Cloudflare Pages / Vercel para Angular SSR.
  3. Configurar GitHub Actions (`.github/workflows/deploy.yml`):
     * Test & Build.
     * Construcción y push de imagen Docker a GCP Artifact Registry.
     * Despliegue automático a **GCP Cloud Run** con variables y secretos inyectados desde Secret Manager.
  4. Validación de dominio de producción con certificado SSL.
* **Criterios de Aceptación (DoD):**
  * La plataforma es 100% operativa en producción bajo dominio público.
  * Pipeline de CI/CD despliega cambios automáticamente tras merge a `main`.
* **Dependencias:** `TS-18`.
