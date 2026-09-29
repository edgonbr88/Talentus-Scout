# Talentus Scout — Documento de Especificación de Requerimientos y Diseño Técnico del MVP

**Versión:** 1.0.0  
**Fecha de Emisión:** 29 de septiembre de 2026  
**Estado:** Documento de Arquitectura y Especificación Técnica Aprobado  
**Documento Fuente:** [Talentus Scout — Resumen Estratégico y Técnico Inicial.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Resumen%20Estrat%C3%A9gico%20y%20T%C3%A9cnico%20Inicial.md)

---

## 1. Resumen Ejecutivo y Objetivos de Ingeniería

Talentus Scout es una plataforma web deportiva orientada a visibilizar y certificar a jóvenes futbolistas en Sudamérica (comenzando por Venezuela). El MVP debe validar la tracción con 100–200 atletas federados, monetizar desde el Día 1 y conectar con reclutadores acreditados sin fricciones operativas.

### Objetivos No Funcionales Clave:
* **Rendimiento en Redes Móviles Lentas (3G/4G Latam):** Carga del perfil público Bento en menos de 1.8 segundos; reproducción de video adaptativa vía HLS sin saturar ancho de banda de subida ni de descarga.
* **Seguridad y Cumplimiento LOPNNA / FIFA:** Privacidad estricta de menores; consentimiento digital registrado; canalización de contactos exclusivamente hacia el tutor legal vía WhatsApp; acceso al directorio restringido a scouts auditados.
* **Costos Operativos Ultrabajos y Escalabilidad Serverless:** Arquitectura sin servidores dedicados sobredimensionados; subida de video directa cliente-a-nube (Direct-to-Cloud); procesamiento en GCP Cloud Run con Neon Serverless Postgres.

---

## 2. Arquitectura General del Sistema

```mermaid
graph TD
    ClientMobile["Atleta / Tutor / Scout (Web Móvil / Desktop)"]
    CDN["Cloudflare Edge / CDN (SSL, Caching, WAF)"]
    AngularSSR["Frontend: Angular 18+ (SSR en Cloud Run / Cloudflare Pages)"]
    SpringBootAPI["Backend: Spring Boot 3 (Java 21 en GCP Cloud Run)"]
    NeonDB[("Base de Datos: Neon Serverless PostgreSQL")]
    StreamProvider["Cloudflare Stream / Bunny.net (Video HLS)"]
    WhatsAppAPI["WhatsApp Web / App (Protocolo wa.me)"]
    PaymentWebhooks["Pasarelas / Webhooks (Binance Pay, Stripe)"]

    ClientMobile --> CDN
    CDN --> AngularSSR
    CDN --> SpringBootAPI
    SpringBootAPI --> NeonDB
    ClientMobile -.->|"Carga Directa TUS/Presigned URL"| StreamProvider
    StreamProvider -->|"Webhook Video Ready"| SpringBootAPI
    PaymentWebhooks -->|"Webhooks de Pago"| SpringBootAPI
    ClientMobile -->|"Botón Contacto Seguro"| WhatsAppAPI
```

---

## 3. Modelo de Datos Relacional y Migraciones con dbmate

El modelo está normalizado en 3FN, asegurando integridad referencial, trazabilidad de auditoría (`created_at`, `updated_at`) y separación estricta entre la identidad de adultos (tutores/scouts/verificadores) y los perfiles de los menores.

### 3.1. Estrategia de Migraciones Local-First con dbmate
* Las migraciones se gestionan de forma canónica y agnóstica al framework mediante **`dbmate`** en la carpeta `db/migrations/`.
* **Entorno Local:** Se ejecutan contra un contenedor Docker local de PostgreSQL 16 (`talentus-postgres-dev`) vía `DATABASE_URL="postgres://postgres:postgrespassword2026@localhost:5432/talentus_scout_dev?sslmode=disable" dbmate up`.
* **Promoción a Nube:** En la fase de despliegue a producción (Sprint 4), la misma suite de migraciones se ejecuta directamente contra Neon PostgreSQL Serverless sin modificaciones sintácticas.

### 3.2. DDL de Tablas Principales (db/migrations/YYYYMMDDHHMMSS_initial_schema.sql)

```sql
-- 1. EXTENSIONES Y TIPOS ENUMERADOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('TUTOR', 'SCOUT', 'VERIFIER_ORG', 'ADMIN');
CREATE TYPE account_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');
CREATE TYPE scout_verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE video_status AS ENUM ('PENDING_UPLOAD', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE badge_type AS ENUM ('FEDERATION_LICENSE', 'CLUB_AFFILIATION', 'MEDICAL_ANTHRO', 'SCOUT_ENDORSEMENT');
CREATE TYPE badge_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE payment_method AS ENUM ('PAGO_MOVIL', 'BINANCE_PAY', 'ZINLI_WALLY_ZELLE', 'STRIPE');
CREATE TYPE payment_status AS ENUM ('PENDING_AUDIT', 'APPROVED', 'REJECTED', 'AUTO_CONFIRMED');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- 2. TABLA DE USUARIOS (Adultos responsables: Tutores, Scouts, Verificadores y Admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(30) NOT NULL, -- Número principal con código de país para WhatsApp (+58...)
    role user_role NOT NULL DEFAULT 'TUTOR',
    status account_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CONSENTIMIENTO LEGAL LOPNNA (Art. 65)
CREATE TABLE tutor_legal_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_lopnna_terms BOOLEAN NOT NULL DEFAULT TRUE,
    terms_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLUBES Y ORGANIZACIONES DEPORTIVAS
CREATE TABLE clubs_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    federation_code VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Venezuela',
    logo_url TEXT,
    verified_official BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DELEGADOS VERIFICADORES DE ORGANIZACIONES (Rol VERIFIER_ORG)
CREATE TABLE verifier_delegates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES clubs_organizations(id) ON DELETE CASCADE,
    position_title VARCHAR(100) NOT NULL, -- ej. Director Deportivo, Coordinador de Fichaje
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_org UNIQUE (user_id, organization_id)
);

-- 6. PERFILES DE ATLETAS (Menores de Edad)
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL DEFAULT 'MALE',
    primary_position VARCHAR(50) NOT NULL, -- ej. Delantero Centro, Extremo Derecho, Portero
    secondary_position VARCHAR(50),
    preferred_foot VARCHAR(20) NOT NULL, -- DERECHO, ZURDO, AMBIDIESTRO
    nationality VARCHAR(50) NOT NULL DEFAULT 'Venezolana',
    secondary_passports VARCHAR(150), -- ej. Español (UE), Italiano, Estadounidense
    current_club_id UUID REFERENCES clubs_organizations(id) ON DELETE SET NULL,
    federation_license_number VARCHAR(50), -- Cédula federativa Asociación de Caracas / FVF
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    profile_photo_url TEXT,
    bio TEXT,
    slug VARCHAR(120) UNIQUE NOT NULL, -- Para URL pública: talentus.app/atleta/gabriel-perez-10
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SISTEMA DE MULTICERTIFICACIÓN (Moat de Insignias de Confianza)
CREATE TABLE athlete_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    badge_type badge_type NOT NULL,
    organization_id UUID REFERENCES clubs_organizations(id) ON DELETE SET NULL,
    verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status badge_status NOT NULL DEFAULT 'PENDING',
    evidence_document_url TEXT, -- Foto de carnet federativo, informe médico, etc.
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. VIDEOS DE JUGADAS DESTACADAS (Streaming)
CREATE TABLE athlete_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'HIGHLIGHTS', -- GOLES, ASISTENCIAS, DEFENSA, PARTIDO_COMPLETO
    provider_video_id VARCHAR(100) NOT NULL, -- ID devuelto por Cloudflare Stream o Bunny
    playback_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INT DEFAULT 0,
    status video_status NOT NULL DEFAULT 'PENDING_UPLOAD',
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ACREDITACIÓN DE SCOUTS Y RECLUTADORES
CREATE TABLE scout_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(150) NOT NULL, -- ej. Academia Rayo Vallecano, Caracas FC, Scouting Vinotinto
    scout_role VARCHAR(100) NOT NULL, -- Reclutador Oficial, Entrenador Universitario, Agente
    credentials_document_url TEXT NOT NULL, -- Foto de carnet profesional, acreditación o carta oficial
    linkedin_url TEXT,
    verification_status scout_verification_status NOT NULL DEFAULT 'PENDING',
    reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PLANES Y MONETIZACIÓN (Día 1)
CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY, -- 'FREE_BASIC', 'PRO_MONTHLY', 'SEASON_PASS_6M'
    name VARCHAR(100) NOT NULL,
    price_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    duration_days INT NOT NULL DEFAULT 30,
    max_videos INT NOT NULL DEFAULT 1,
    has_radar_views BOOLEAN NOT NULL DEFAULT FALSE,
    has_pdf_cv BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE athlete_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status subscription_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TRANSACCIONES Y PAGOS (Híbrido Venezuela / Latam)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    method payment_method NOT NULL,
    amount_usd NUMERIC(10,2) NOT NULL,
    amount_ves NUMERIC(15,2),
    bcv_exchange_rate NUMERIC(10,4),
    reference_number VARCHAR(100), -- Número de referencia Pago Móvil / Binance TxId
    proof_image_url TEXT, -- Captura de pantalla de la transferencia
    status payment_status NOT NULL DEFAULT 'PENDING_AUDIT',
    audited_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    audited_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. RADAR DE ACTIVIDAD Y RETENCIÓN (Métricas de visualización)
CREATE TABLE scout_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    video_id UUID REFERENCES athlete_videos(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'PROFILE_VIEW', 'VIDEO_PLAY', 'WHATSAPP_CONTACT_CLICK'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES ESTRATÉGICOS DE BÚSQUEDA Y RENDIMIENTO
CREATE INDEX idx_athletes_slug ON athletes(slug);
CREATE INDEX idx_athletes_filter ON athletes(birth_date, primary_position, current_club_id);
CREATE INDEX idx_videos_athlete ON athlete_videos(athlete_id, sort_order);
CREATE INDEX idx_badges_athlete ON athlete_badges(athlete_id, status);
CREATE INDEX idx_scout_activity ON scout_activity_logs(athlete_id, created_at DESC);
```

---

## 4. Diseño y Contrato de APIs REST (Spring Boot 3)

Todas las rutas privadas requieren encabezado `Authorization: Bearer <JWT>`. La gestión de errores responde con estándar RFC 7807 (`ProblemDetail`).

### 4.1. Módulo de Autenticación y Onboarding Legal

#### `POST /api/v1/auth/register-tutor`
Registra al tutor legal y registra el consentimiento inequívoco de la LOPNNA en una sola transacción atómica.
* **Payload:**
```json
{
  "fullName": "Carlos Pérez",
  "email": "carlos.perez@gmail.com",
  "password": "PasswordSeguro2026*",
  "phoneNumber": "+584121234567",
  "acceptLopnnaTerms": true
}
```
* **Respuesta (201 Created):**
```json
{
  "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "role": "TUTOR"
}
```

#### `POST /api/v1/auth/register-scout`
Registra al scout en estado inicial `PENDIENTE_VERIFICACION`.
* **Payload:** `multipart/form-data`
  * `fullName`: Texto
  * `email`: Texto
  * `password`: Texto
  * `phoneNumber`: Texto
  * `organizationName`: "Caracas FC - Scouting Formativo"
  * `scoutRole`: "Scout Sub-17"
  * `linkedinUrl`: "https://linkedin.com/in/scout-ejemplo"
  * `credentialsFile`: Archivo PDF o imagen (carnet de club o credencial de federación).
* **Respuesta (201 Created):**
```json
{
  "userId": "e8a946b2-6019-4db8-b570-36f1c42db231",
  "status": "PENDING_VERIFICATION",
  "message": "Registro completado. Tu cuenta será evaluada en un plazo máximo de 24 horas para acceder al directorio."
}
```

---

### 4.2. Módulo de Atletas y Perfil Bento Público

#### `POST /api/v1/athletes` (Rol TUTOR)
Crea la cédula deportiva del menor asociada al tutor autenticado.
* **Payload:**
```json
{
  "firstName": "Gabriel",
  "lastName": "Pérez",
  "birthDate": "2010-06-15",
  "primaryPosition": "DELANTERO_CENTRO",
  "secondaryPosition": "EXTREMO_DERECHO",
  "preferredFoot": "DERECHO",
  "currentClubId": "4c9e8312-3269-42b7-8ce6-90be5c276321",
  "federationLicenseNumber": "CCS-2024-9841",
  "secondaryPassports": "Español (UE)",
  "heightCm": 174.5,
  "weightKg": 63.0,
  "bio": "Goleador en Liga Colegial y Torneo Distrital de Caracas 2025. Rápido en transiciones."
}
```

#### `GET /api/v1/athletes/public/{slug}` (Público - Sin Autenticación)
Entrega el JSON optimizado para hidratar la vista Bento móvil del atleta y renderizar tarjetas Open Graph en el SSR de Angular.
* **Respuesta (200 OK):**
```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "slug": "gabriel-perez-10",
  "fullName": "Gabriel Pérez",
  "age": 16,
  "birthDate": "2010-06-15",
  "primaryPosition": "Delantero Centro",
  "secondaryPosition": "Extremo Derecho",
  "preferredFoot": "Derecho",
  "nationality": "Venezolana",
  "secondaryPassports": "Español (UE)",
  "club": {
    "name": "Deportivo Miranda Sub-16",
    "logoUrl": "https://cdn.talentus.app/logos/miranda.png"
  },
  "metrics": {
    "heightCm": 174.5,
    "weightKg": 63.0
  },
  "badges": [
    { "type": "FEDERATION_LICENSE", "title": "Federado Oficial - Asoc. Caracas", "verified": true },
    { "type": "CLUB_AFFILIATION", "title": "Ficha Activa - Dep. Miranda", "verified": true }
  ],
  "videos": [
    {
      "id": "vid-01",
      "title": "Goles y Definiciones Torneo Clausura",
      "playbackUrl": "https://videodelivery.net/cf783b92019/manifest/video.m3u8",
      "thumbnailUrl": "https://videodelivery.net/cf783b92019/thumbnails/thumbnail.jpg",
      "durationSeconds": 85
    }
  ]
}
```

---

### 4.3. Módulo de Video: Pipeline de Carga Directa (Direct-to-Cloud)

Para evitar que videos de 200MB a 1GB saturen la memoria RAM y el ancho de banda del backend en Cloud Run, Talentus Scout utiliza URLs de subida directa directa a Cloudflare Stream o Bunny.net.

```mermaid
sequenceDiagram
    autonumber
    actor Tutor as Tutor (Móvil)
    participant Backend as Spring Boot API
    participant StreamProvider as Cloudflare / Bunny Stream
    participant DB as Neon PostgreSQL

    Tutor->>Backend: POST /api/v1/videos/request-upload (title, athleteId)
    Backend->>StreamProvider: Solicitar Direct Upload URL (API Key)
    StreamProvider-->>Backend: Devuelve Upload URL + ProviderVideoId
    Backend->>DB: Guarda Video en estado 'PENDING_UPLOAD'
    Backend-->>Tutor: Devuelve Upload URL firmada
    Tutor->>StreamProvider: Carga directa binaria del video (TUS / HTTP PUT)
    StreamProvider->>StreamProvider: Transcodificación automática HLS
    StreamProvider->>Backend: Webhook POST /api/v1/videos/webhook (Status: READY)
    Backend->>DB: Actualiza Video a estado 'READY' y playback_url
```

#### `POST /api/v1/videos/request-upload` (Rol TUTOR)
* **Payload:**
```json
{
  "athleteId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "title": "Jugadas Individuales vs Petare FC",
  "category": "HIGHLIGHTS"
}
```
* **Respuesta (200 OK):**
```json
{
  "videoId": "c711202e-c5c7-43cf-bc0a-fc8c614b14d2",
  "directUploadUrl": "https://upload.videodelivery.net/tus/39bf9302194...",
  "maxSizeBytes": 524288000
}
```

#### `POST /api/v1/videos/webhook` (Callback de Cloudflare/Bunny)
Valida la firma HMAC en el encabezado `Webhook-Signature` y activa el video para visualización pública.

---

### 4.4. Módulo de Verificación Dual (Insignias de Confianza)

#### Vía 1: Portal de Organización Verificadora (`VERIFIER_ORG`)
* `GET /api/v1/verifier/pending-athletes`: Lista de atletas del club pendientes de ratificación de ficha federativa.
* `POST /api/v1/verifier/certify`:
```json
{
  "athleteId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "badgeType": "FEDERATION_LICENSE",
  "decision": "APPROVE",
  "comments": "Ficha validada en el libro de registros de la Asociación de Caracas 2026."
}
```

#### Vía 2: Fast-Track Asistido (`TUTOR` y `ADMIN`)
* `POST /api/v1/athletes/{id}/submit-evidence`: El representante sube la foto de la credencial o carnet.
* `POST /api/v1/admin/badges/{badgeId}/review`: El admin audita el carnet contra el listado CSV de la asociación y aprueba la insignia en 1 clic.

---

### 4.5. Módulo del Directorio de Scouts y Contacto Seguro

#### `GET /api/v1/scouts/directory` (Rol SCOUT aprobado)
Búsqueda con paginación, filtros por categoría (año de nacimiento), posición, club y pierna hábil.
* **Query Params:** `?birthYear=2010&position=DELANTERO_CENTRO&hasPassports=true&page=0&size=20`

#### `POST /api/v1/scouts/contact-click` (Rol SCOUT aprobado)
Registra la interacción para las analíticas del atleta y devuelve la URL formateada hacia WhatsApp del tutor legal:
* **Payload:**
```json
{
  "athleteId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
* **Lógica del Backend:**
  1. Extrae el número del tutor (`+584121234567`) de la base de datos.
  2. Registra el evento en `scout_activity_logs`.
  3. Codifica el mensaje estructurado:
     `https://wa.me/584121234567?text=Hola%20Carlos%20P%C3%A9rez%2C%20soy%20Manuel%20Silva%20de%20Caracas%20FC.%20He%20visto%20el%20perfil%20de%20Gabriel%20P%C3%A9rez%20en%20Talentus%20Scout%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20su%20proyecci%C3%B3n%20deportiva.`
* **Respuesta (200 OK):**
```json
{
  "whatsappUrl": "https://wa.me/584121234567?text=...",
  "tutorName": "Carlos Pérez"
}
```

---

### 4.6. Módulo de Pagos y Monetización Día 1

#### `POST /api/v1/payments/report-pago-movil` (Rol TUTOR)
* **Payload:** `multipart/form-data`
  * `athleteId`: UUID
  * `planId`: "PRO_MONTHLY"
  * `referenceNumber`: "0849201"
  * `amountVes`: 1850.50
  * `bcvRate`: 125.00
  * `proofFile`: Imagen del comprobante bancario.
* **Respuesta (201 Created):**
```json
{
  "transactionId": "f1839a90-...",
  "status": "PENDING_AUDIT",
  "message": "Reporte recibido. Tu pase Pro se activará en pocos minutos tras la conciliación."
}
```

#### `POST /api/v1/admin/payments/{transactionId}/audit` (Rol ADMIN)
El administrador valida en su banca el número de referencia y aprueba la transacción. Al aprobarse:
1. Cambia el estado de `payment_transactions` a `APPROVED`.
2. Inserta o renueva el registro en `athlete_subscriptions`.
3. Notifica al representante legal.

---

## 5. Arquitectura del Frontend (Angular 18+)

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/ (auth.guard, auth.interceptor, auth.service)
│   │   │   ├── models/ (athlete.model, user.model, video.model)
│   │   │   └── services/ (api.service, payment.service, video-upload.service)
│   │   ├── features/
│   │   │   ├── bento-profile/ (perfil público optimizado SSR con Open Graph)
│   │   │   ├── tutor-dashboard/ (gestión de atletas, suscripción, radar de vistas)
│   │   │   ├── scout-directory/ (directorio con filtros rápidos y botón WhatsApp)
│   │   │   ├── verifier-portal/ (panel de aprobación para clubes)
│   │   │   ├── admin-panel/ (auditoría de scouts y pagos móviles)
│   │   │   └── checkout/ (pasarela de pago móvil, Binance Pay y Stripe)
│   │   └── shared/ (componentes Bento, badge visual, video-player HLS)
│   ├── index.html
│   └── main.server.ts (Angular SSR Engine)
```

### Optimización Open Graph en Angular SSR:
Para que cuando una familia o scout comparta el enlace `https://talentus.app/atleta/gabriel-perez-10` en WhatsApp o Instagram aparezca una tarjeta rica:
```html
<meta property="og:title" content="Gabriel Pérez (2010) — Delantero Centro | Talentus Scout" />
<meta property="og:description" content="Ficha deportiva oficial y jugadas destacadas en Deportivo Miranda. Verificado por Asoc. Caracas." />
<meta property="og:image" content="https://cdn.talentus.app/cards/gabriel-perez-10.jpg" />
<meta property="og:url" content="https://talentus.app/atleta/gabriel-perez-10" />
```

---

## 6. Estrategia de Infraestructura y Despliegue

| Componente | Tecnología / Proveedor | Justificación Técnica | Costo Estimado MVP |
| :--- | :--- | :--- | :--- |
| **Backend API** | GCP Cloud Run (Spring Boot 3 en Docker) | Autoescalado a cero si no hay peticiones; escala instantánea ante picos de scouting. | ~$5 – $15 USD/mes |
| **Base de Datos** | Neon Serverless PostgreSQL | Conexiones pooled vía HikariCP; escalado automático y backups por punto en el tiempo. | ~$0 – $19 USD/mes |
| **Frontend SSR** | Cloudflare Pages / GCP Cloud Run | Distribución perimetral ultrarrápida para celulares en Venezuela. | ~$0 – $5 USD/mes |
| **Video HLS** | Cloudflare Stream o Bunny.net | Carga directa sin consumo de CPU backend; bitrate adaptativo según velocidad móvil. | ~$10 – $30 USD/mes |
| **Almacenamiento** | Cloudflare R2 / AWS S3 (Compatible) | Almacenamiento de comprobantes de pago y fotos de perfiles sin costos de egreso. | ~$1 – $3 USD/mes |

---

## 7. Plan de Sprints de Desarrollo del MVP (Estrategia Local-First & Cloud Promotion)

### Sprint 1: Cimientos Locales, GitHub, Migraciones dbmate en Docker y Auth LOPNNA
* Creación e inicialización de repositorios en GitHub (`gh repo create`) con estructura base.
* Configuración de entorno local con `docker-compose.yml` (PostgreSQL 16 en contenedor).
* Creación del repositorio/carpeta de migraciones canónicas con **`dbmate`** (`db/migrations/`).
* Implementación de Spring Security 6 con JWT y control de roles contra PostgreSQL local.
* Endpoint y flujo de registro atómico del Tutor con aceptación legal LOPNNA (Art. 65).
* CRUD de atleta (entidades JPA validadas contra el esquema de `dbmate`).

### Sprint 2: Workspace Frontend Angular Local, Componentes Bento y Video Streaming
* Inicialización del proyecto Angular 18+ (Standalone components) conectado a backend local.
* Capa de abstracción para Video Streaming (`VideoStreamProvider` con implementación Mock local y cliente Cloudflare/Bunny).
* Componente de subida de video con barra de progreso.
* Vista pública del Atleta estilo Bento Grid con soporte Angular SSR y meta tags Open Graph.
* Generador de PDF descargable de la Hoja de Vida Deportiva.

### Sprint 3: Directorio de Scouts Acreditados y Contacto Seguro WhatsApp
* Registro de scouts con carga de credenciales (almacenamiento local con interfaz lista para S3/R2) y panel de auditoría para Admin (`PENDIENTE_VERIFICACION`).
* Directorio de búsqueda con filtros por categoría (año), posición y club optimizados con índices.
* Botón de WhatsApp integrado con generación de mensaje predeterminado y registro de logs de actividad.
* Radar de visualizaciones en el panel del atleta.

### Sprint 4: Verificación Dual, Monetización Día 1 y Promoción a la Nube
* Módulo dual de verificación: panel para organizaciones verificadoras y fast-track para admins.
* Pasarela de cobro: formulario de reporte de Pago Móvil con carga de captura, integración de Binance Pay y panel de conciliación rápida para admin.
* **Promoción de Base de Datos a la Nube:** Ejecución de la suite canónica de migraciones de `dbmate` contra **Neon Serverless PostgreSQL**.
* **Despliegue a Producción:** Construcción de imágenes Docker y despliegue del backend en **GCP Cloud Run** y frontend en CDN, con pipeline de GitHub Actions y dominio productivo.
