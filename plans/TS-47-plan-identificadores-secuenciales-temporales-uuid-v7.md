# Plan de Implementación: [TS-47] Implementación de identificadores secuenciales temporales UUID v7 en JPA y PostgreSQL

**ID Tarea:** TS-47  
**Tarjeta Trello:** [https://trello.com/c/ghHL5Nlf/89-ts-47-implementaci%C3%B3n-de-identificadores-secuenciales-temporales-uuid-v7-en-jpa-y-postgresql](https://trello.com/c/ghHL5Nlf/89-ts-47-implementaci%C3%B3n-de-identificadores-secuenciales-temporales-uuid-v7-en-jpa-y-postgresql)  
**Fecha:** 2026-10-19  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema de Rendimiento e Indexación:** La plataforma utilizaba hasta ahora identificadores UUID v4 puramente aleatorios (`GenerationType.UUID` en JPA y `uuid_generate_v4()` / `gen_random_uuid()` en PostgreSQL). Debido a su distribución aleatoria, las inserciones continuas en tablas con alto volumen o crecimiento sostenido (`users`, `athletes`, `payment_transactions`, `athlete_videos`, `scout_activity_logs`, etc.) ocasionan una severa fragmentación en los árboles B-Tree (page splits frecuentes) en PostgreSQL, degradando la eficiencia de inserción y la localidad de referencia en caché de disco y memoria.
- **Solución con Estándar RFC 9562 (UUID v7):** La adopción de UUID v7 provee identificadores temporales secuenciales que incorporan en sus 48 bits iniciales una marca de tiempo Unix en milisegundos (`clock_timestamp()`), seguida de datos aleatorios criptográficamente seguros. Esto garantiza que las nuevas filas se inserten siempre de manera cuasi-secuencial (append-only) al final de los índices B-Tree, optimizando drásticamente la velocidad de inserción y permitiendo consultas ordenadas cronológicamente de forma nativa por clave primaria.
- **Transparencia e Integridad:** Los identificadores existentes permanecen 100% válidos (los tipos UUID en PostgreSQL y Java son agnósticos a la versión interna), manteniendo la integridad referencial y compatibilidad total con clientes web, móviles y APIs públicas.
- **Protección de Menores (LOPNNA Art. 65 / FIFA):** La generación de identificadores UUID v7 previene ataques de enumeración secuencial entera típica de `BIGSERIAL`, preservando la privacidad y seguridad criptográfica de los datos de atletas menores de edad y sus tutores legales.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes del Sistema Afectados:**
  1. **Base de Datos (PostgreSQL / dbmate):**
     - Habilitación de la extensión `pgcrypto` si no está presente.
     - Creación de la función canónica de generación temporal `uuid_generate_v7()` en PL/pgSQL.
     - Actualización de los valores `DEFAULT` en las columnas `id` de las tablas existentes que utilizan UUID.
  2. **Backend (Spring Boot 4.1.x / Hibernate 7.4.x / Java 21):**
     - En las entidades JPA de dominio (`com.talentus.scout.domain.entity`), reemplazar la anotación genérica `@GeneratedValue(strategy = GenerationType.UUID)` por `@UuidGenerator(style = UuidGenerator.Style.VERSION_7)` de `org.hibernate.annotations.UuidGenerator`.
     - Actualización de `AthleteVideo` para adoptar la misma convención `@UuidGenerator(style = UuidGenerator.Style.VERSION_7)` estandarizada en lugar de asignación manual de UUID.
     - Implementación de pruebas automatizadas en `UuidV7GenerationTest` para validar generación de versión 7, ordenamiento temporal cronológico y persistencia en base de datos.
  3. **Frontend (Angular 18+):**
     - Totalmente transparente. Los UUID v7 cumplen con el formato estándar de 36 caracteres hexadecimales (`xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx`), no requiriendo modificaciones en interfaces TypeScript ni componentes UI.

---

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)

### 3.1. Archivo de Migración DDL
- **Ruta de la Migración:** `talentus-scout-migrations/migrations/20261019180000_create_uuid_v7_function_and_update_defaults.sql`

```sql
-- migrate:up
-- 1. Habilitar extensión pgcrypto para generación de bytes pseudoaleatorios seguros
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Función canónica para generación de UUID v7 (RFC 9562) en PostgreSQL
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
    unix_time_ms bytea;
    uuid_bytes bytea;
BEGIN
    -- 6 bytes (48 bits) conteniendo la marca de tiempo Unix epoch en milisegundos
    unix_time_ms := substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3 for 6);
    -- 10 bytes pseudoaleatorios criptográficos para completar los 16 bytes (128 bits)
    uuid_bytes := unix_time_ms || gen_random_bytes(10);
    -- Establecer la versión 7 (0111xxxx) en el byte 7 (índice 6 base 0)
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    -- Establecer la variante RFC 4122/9562 (10xxxxxx) en el byte 9 (índice 8 base 0)
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
    RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. Actualización de valores por defecto en tablas existentes a uuid_generate_v7()
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE tutor_legal_consents ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE clubs_organizations ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE verifier_delegates ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE athletes ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE athlete_videos ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE athlete_badges ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE payment_transactions ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE athlete_subscriptions ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE scout_profiles ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE scout_activity_logs ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE user_social_identities ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE email_verification_tokens ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE discount_codes ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE discount_code_redemptions ALTER COLUMN id SET DEFAULT uuid_generate_v7();
ALTER TABLE certification_requests ALTER COLUMN id SET DEFAULT uuid_generate_v7();

-- migrate:down
-- Restaurar defaults a uuid_generate_v4() / gen_random_uuid()
ALTER TABLE certification_requests ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE discount_code_redemptions ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE discount_codes ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE email_verification_tokens ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE user_social_identities ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE scout_activity_logs ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE scout_profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE athlete_subscriptions ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE payment_transactions ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE athlete_badges ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE athlete_videos ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE athletes ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE verifier_delegates ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE clubs_organizations ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE tutor_legal_consents ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DROP FUNCTION IF EXISTS uuid_generate_v7();
```

---

## 4. Backend: Spring Boot (Hibernate 7 / Java 21)
- **Directiva de Modelado:** Usar `org.hibernate.annotations.UuidGenerator` con `style = UuidGenerator.Style.VERSION_7` junto a `@Id`.
- **Entidades a Modificar (`talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/`):**
  1. [User.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/User.java)
  2. [Athlete.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/Athlete.java)
  3. [PaymentTransaction.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/PaymentTransaction.java)
  4. [ClubOrganization.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/ClubOrganization.java)
  5. [AthleteVideo.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/AthleteVideo.java)
  6. [AthleteBadge.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/AthleteBadge.java)
  7. [AthleteSubscription.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/AthleteSubscription.java)
  8. [DiscountCode.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/DiscountCode.java)
  9. [DiscountCodeRedemption.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/DiscountCodeRedemption.java)
  10. [EmailVerificationToken.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/EmailVerificationToken.java)
  11. [ScoutProfile.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/ScoutProfile.java)
  12. [ScoutActivityLog.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/ScoutActivityLog.java)
  13. [TutorLegalConsent.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/TutorLegalConsent.java)
  14. [UserSocialIdentity.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/UserSocialIdentity.java)
  15. [CertificationRequest.java](file:///home/edgar/Talentus%20Scout/talentus-scout-be/src/main/java/com/talentus/scout/domain/entity/CertificationRequest.java)

- **Patrón de Anotación en cada Entidad:**
```java
import org.hibernate.annotations.UuidGenerator;

// ...
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;
```

---

## 5. Frontend: Angular 18+ (Standalone & SSR)
- **Impacto Frontend:** Ninguno. UUID v7 preserva la longitud canónica de 36 caracteres con guiones y codificación hexadecimal estándar, siendo completamente compatible con los tipos `string` en TypeScript, validaciones regex de UUID y rutas de la aplicación Angular (`/perfil/:id`, etc.).

---

## 6. Pruebas y Verificación
- **Clase de Pruebas Automatizadas:** `talentus-scout-be/src/test/java/com/talentus/scout/domain/entity/UuidV7GenerationTest.java`
  - Validar que al persistir una entidad (`User`, `Athlete`, `PaymentTransaction`, etc.), el identificador generado tiene `id.version() == 7`.
  - Validar que dos o más entidades persistidas secuencialmente con un breve retardo generan UUIDs monótonamente crecientes en orden cronológico (`id1.compareTo(id2) < 0`).
  - Validar que la extracción de la marca de tiempo de los 48 bits superiores coincide con el tiempo actual (con un margen razonable de milisegundos).
- **Ejecución de Regresión Completa:** Correr `./mvnw test` asegurando que los 169+ tests pasen al 100%.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Crear archivo de migración DDL en `talentus-scout-migrations/migrations/20261019180000_create_uuid_v7_function_and_update_defaults.sql`.
- [x] **Paso 2:** Modificar las 15 entidades JPA para incorporar `@UuidGenerator(style = UuidGenerator.Style.VERSION_7)` y ajustar `AthleteVideo`.
- [x] **Paso 3:** Implementar la suite de tests unitarios/integración `UuidV7GenerationTest.java`.
- [x] **Paso 4:** Compilar y ejecutar `./mvnw test` verificando que toda la suite pase en verde sin regresiones.
- [x] **Paso 5:** Generar el plan de pruebas documentado en `test/TS-47-test-plan-identificadores-secuenciales-temporales-uuid-v7.md`.
- [x] **Paso 6:** Marcar todos los checkboxes del checklist en este archivo de plan.
- [x] **Paso 7:** Mover la tarjeta TS-47 en Trello a `in testing` mediante el script correspondiente.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] La migración de base de datos define la función `uuid_generate_v7()` y actualiza los valores default de las columnas ID en las 16 tablas.
- [x] Las 15 entidades JPA generan identificadores con versión 7 al persistirse.
- [x] Los identificadores generados secuencialmente son cronológicamente ordenables (`id1.compareTo(id2) < 0`).
- [x] Compilación exitosa del proyecto con `./mvnw clean compile` y 0 errores.
- [x] Todos los tests unitarios y de integración pasan al 100% (`./mvnw test`).
- [x] Documento de plan de pruebas generado en `test/TS-47-test-plan-identificadores-secuenciales-temporales-uuid-v7.md`.
- [x] Tarjeta de Trello movida a la columna `in testing`.
