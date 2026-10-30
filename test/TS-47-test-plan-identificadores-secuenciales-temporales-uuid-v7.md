# Plan de Pruebas: [TS-47] Implementación de identificadores secuenciales temporales UUID v7 en JPA y PostgreSQL

**ID Tarea:** TS-47  
**Tarjeta Trello:** [https://trello.com/c/ghHL5Nlf/89-ts-47-implementaci%C3%B3n-de-identificadores-secuenciales-temporales-uuid-v7-en-jpa-y-postgresql](https://trello.com/c/ghHL5Nlf/89-ts-47-implementaci%C3%B3n-de-identificadores-secuenciales-temporales-uuid-v7-en-jpa-y-postgresql)  
**Fecha:** 2026-10-19  
**Estado:** EJECUTADO Y VALIDADO  
**Responsable:** `trello_implementer`  

---

## 1. Alcance de las Pruebas

El objetivo de este plan de pruebas es validar la migración e implementación del estándar de identificadores secuenciales temporales **UUID v7 (RFC 9562)** a nivel de base de datos relacional (PostgreSQL 16) y capa de persistencia de backend (Spring Boot / Hibernate 7 / Java 21), garantizando:

1. **Función canónica en PostgreSQL:** Disponibilidad y correcto cómputo de la función `uuid_generate_v7()` en PL/pgSQL mediante `clock_timestamp()`, `int8send()`, `gen_random_bytes(10)` y manipulación precisa a nivel de bits de la versión 7 (`0111`) y variante IETF (`10`).
2. **Actualización de valores por defecto:** Asignación de `DEFAULT uuid_generate_v7()` en las columnas de clave primaria (`id`) en todas las tablas existentes que utilizan UUIDs en la plataforma.
3. **Generación automática en Hibernate 7 / Spring Data JPA:** Reemplazo de `@GeneratedValue(strategy = GenerationType.UUID)` por `@UuidGenerator(style = UuidGenerator.Style.VERSION_7)` en las 15 entidades JPA del dominio:
   - `User`
   - `Athlete`
   - `PaymentTransaction`
   - `ClubOrganization`
   - `AthleteVideo`
   - `AthleteBadge`
   - `AthleteSubscription`
   - `DiscountCode`
   - `DiscountCodeRedemption`
   - `EmailVerificationToken`
   - `ScoutProfile`
   - `ScoutActivityLog`
   - `TutorLegalConsent`
   - `UserSocialIdentity`
   - `CertificationRequest`
4. **Ordenamiento cronológico y no regresión:** Garantía de inserciones tipo append-only en índices B-Tree (identificadores generados consecutivamente son estrictamente crecientes: `uuid1.compareTo(uuid2) < 0`), preservación del timestamp Unix en los 48 bits superiores y compatibilidad total con clientes frontend y suite de pruebas integral del backend.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Suite de Pruebas Específica: `UuidV7GenerationTest`
Comando ejecutado:
```bash
./mvnw test -Dtest=UuidV7GenerationTest
```

#### Resultados:
| Prueba | Descripción | Resultado |
|---|---|---|
| `shouldGenerateUuidV7ForUser` | Valida que al persistir un `User` sin ID, Hibernate genera un ID con versión 7 (`version() == 7`), variante 2 RFC 4122/9562, y los 48 bits superiores coinciden con el epoch actual en milisegundos. | **PASSED** |
| `shouldGenerateChronologicallySortableUuidV7` | Valida que dos entidades persistidas consecutivamente con un intervalo temporal son monótonamente crecientes en orden lexicográfico (`user1.getId().compareTo(user2.getId()) < 0`). | **PASSED** |
| `shouldGenerateUuidV7ForAthleteAndClub` | Valida la persistencia en cascada de `ClubOrganization` y `Athlete`, comprobando que ambos reciben claves primarias UUID v7. | **PASSED** |
| `shouldGenerateUuidV7ForAthleteVideo` | Valida la persistencia de `AthleteVideo` sin ID manual, confirmando la asignación de UUID v7 por Hibernate. | **PASSED** |
| `shouldGenerateUuidV7ForTutorConsentAndScoutProfile` | Valida la persistencia y asignación de UUID v7 en `TutorLegalConsent` y `ScoutProfile`. | **PASSED** |

### 2.2. Suite de Regresión Completa del Backend
Comando ejecutado:
```bash
./mvnw test
```

#### Resultados Globales:
- **Total de pruebas ejecutadas:** 174
- **Fallos (Failures):** 0
- **Errores (Errors):** 0
- **Omitidos (Skipped):** 0
- **Resultado:** `BUILD SUCCESS` (100% de tests aprobados).

### 2.3. Validación de Compilación del Frontend (Angular 18+)
Comando ejecutado:
```bash
npm run build
```
- **Resultado:** Compilación exitosa de todos los bundles de navegador y servidor (SSR), con 13 rutas estáticas prerenderizadas y 0 errores de tipado o interfaces TypeScript.

---

## 3. Guía de Pruebas Manuales / Verificación Paso a Paso

### 3.1. Verificación Directa de la Función en PostgreSQL
Ejecutar consulta interactiva dentro del contenedor de PostgreSQL:
```bash
docker exec talentus-postgres-dev psql -U postgres -d talentus_scout_dev -c "SELECT uuid_generate_v7(), uuid_generate_v7();"
```
**Respuesta esperada:**
```
           uuid_generate_v7           |           uuid_generate_v7           
--------------------------------------+--------------------------------------
 01a155e0-b26b-7e2f-ba5b-622928264458 | 01a155e0-b270-7390-be84-7f21e8364471
```
*Observar que el 13.° carácter es `7` (versión 7) y el 17.° carácter pertenece al conjunto `[8, 9, a, b]` (variante RFC).*

### 3.2. Verificación de Migraciones y Defaults en el Esquema
Verificar que la columna `id` de las tablas principales posee el default `uuid_generate_v7()`:
```bash
docker exec talentus-postgres-dev psql -U postgres -d talentus_scout_dev -c "\d users"
```
**Respuesta esperada:**
```
 Column | Type | Collation | Nullable | Default 
--------+------+-----------+----------+---------
 id     | uuid |           | not null | uuid_generate_v7()
 ...
```

---

## 4. Matriz de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia de Validación |
|---|---|---|
| La migración de base de datos aplica exitosamente la función `uuid_generate_v7()` y actualiza los defaults de columnas ID. | **CUMPLIDO** | Migración `20261019180000_create_uuid_v7_function_and_update_defaults.sql` aplicada mediante `dbmate up` y validada en PostgreSQL. |
| Todas las 15 entidades JPA especificadas generan identificadores UUID con versión 7 al ser persistidas con Spring Data JPA. | **CUMPLIDO** | Reemplazo sistemático por `@UuidGenerator(style = UuidGenerator.Style.VERSION_7)` y comprobado mediante `UuidV7GenerationTest`. |
| Los identificadores generados consecutivamente son cronológicamente ordenables (`id1.compareTo(id2) < 0`). | **CUMPLIDO** | Validado mediante test `shouldGenerateChronologicallySortableUuidV7()`. |
| La suite de tests automatizados (`UuidV7GenerationTest`, tests de persistencia y tests de integración existentes) compila y pasa al 100% en verde. | **CUMPLIDO** | `./mvnw test` ejecutado exitosamente: 174 pruebas ejecutadas, 0 fallos, 0 errores. |
| Los registros existentes en la base de datos se mantienen íntegros y sus relaciones siguen operativas sin errores de integridad referencial. | **CUMPLIDO** | La migración preserva las claves primarias existentes y las restricciones de clave foránea siguen activas sin alteraciones. |
| Plan de pruebas documentado en `test/` y tarjeta en Trello trasladada a `in testing`. | **CUMPLIDO** | Documento generado en `test/TS-47-test-plan-identificadores-secuenciales-temporales-uuid-v7.md` y tarjeta transicionada. |

---

## 5. Casos Borde y Validaciones Críticas

1. **Riesgo de fragmentación de B-Tree:** Con UUID v4, los nuevos IDs caen aleatoriamente en cualquier página del índice B-Tree, forzando frecuentes *page splits* y escrituras aleatorias en disco. Con UUID v7, los 48 bits de timestamp garantizan que las inserciones ocurran en el extremo derecho del árbol (inserción apéndice secuencial), reduciendo el I/O y mejorando el *cache hit ratio* en Neon / PostgreSQL.
2. **Protección LOPNNA Art. 65:** A diferencia de `BIGSERIAL` o enteros auto-incrementales que son vulnerables a ataques de fuerza bruta o enumeración de perfiles de menores, UUID v7 contiene 80 bits de entropía pseudoaleatoria criptográfica generada por `gen_random_bytes(10)` en base de datos y SecureRandom en Hibernate, impidiendo la adivinación o scraping secuencial de perfiles.
3. **Persistencia de Entidades con subida de archivos (AthleteVideo):** El flujo de `VideoService.requestUpload` fue optimizado para permitir que Hibernate genere el identificador UUID v7 durante la inserción inicial en estado `PENDING_UPLOAD`, entregando dicho ID al proveedor de streaming (`UploadTicket`) y eliminando la generación manual previa de UUID v4.
