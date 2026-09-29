# Plan de Implementación: [TS-01] Orquestador Docker Compose (talentus-net) y Repo de Migraciones con dbmate & PostgreSQL

**ID Tarea:** TS-01  
**Tarjeta Trello:** [Ver en Trello](https://trello.com/c/pubBY6Ag/38-ts-01-orquestador-docker-compose-talentus-net-y-repo-de-migraciones-con-dbmate-postgresql) (ID: `6abbe1f192330f55fb666892`)  
**Fecha:** 29 de septiembre de 2026  
**Sprint:** Sprint 1 — Cimientos Locales  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación

* **Problema:** Desarrollar directamente contra bases de datos en la nube (como Neon) desde el inicio introduce fricción de red, costos innecesarios y riesgo de modificaciones destructivas desordenadas. Además, se requiere un entorno estandarizado que cualquier desarrollador pueda levantar con un solo comando.
* **Solución:** Establecer la infraestructura de desarrollo local integral mediante Docker Compose sobre una red bridge dedicada (`talentus-net`). En esta primera fase se orquesta el servicio de base de datos (`docker-postgresql` con PostgreSQL 16) y el servicio de migraciones automatizadas (`dbmate`), montado sobre el repositorio independiente `talentus-scout-migrations`.
* **Impacto en el Negocio:** Permite iterar velozmente en el diseño de las entidades del atleta, tutor y LOPNNA en local, manteniendo un repositorio de migraciones canónico que más adelante se desplegará a Neon con total paridad.

---

## 2. Alcance Técnico y Arquitectura de Contenedores

```mermaid
graph TD
    subgraph HostEngine ["Host: Máquina Local"]
        Compose["docker-compose.yml"]
        subgraph Network ["Red Bridge: talentus-net"]
            Postgres["Servicio: docker-postgresql<br/>• Imagen: postgres:16-alpine<br/>• Puerto: 5432:5432<br/>• Healthcheck: pg_isready"]
            Dbmate["Servicio: dbmate<br/>• Imagen: amacneil/dbmate:latest<br/>• Script: /db/init_dbmate.sh<br/>• Volumen: ./talentus-scout-migrations:/db"]
        end
        StorageVol[("Volumen Host: ./postgresql/data")]
        GHRepo["GitHub: edgonbr88/talentus-scout-migrations"]
    end

    Compose --> Network
    Postgres --> StorageVol
    Postgres -->|"condition: service_healthy"| Dbmate
    Dbmate -->|"Sincroniza esquema DDL"| Postgres
    Dbmate -.->|"Código y migraciones"| GHRepo
```

---

## 3. Especificación de Infraestructura y Archivos a Crear

### 3.1. Archivo `.env` (Variables de Entorno Locales)
Ruta: `/home/edgar/Talentus Scout/.env`
```env
# Configuración PostgreSQL Local
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword2026
POSTGRES_DB=talentus_scout_dev
POSTGRES_PORT=5432

# URL de Conexión interna para dbmate
DATABASE_URL=postgres://postgres:postgrespassword2026@docker-postgresql:5432/talentus_scout_dev?sslmode=disable
```

### 3.2. Archivo `docker-compose.yml` (Orquestador Base)
Ruta: `/home/edgar/Talentus Scout/docker-compose.yml`
```yaml
version: '3.8'

services:
  # 1. BASE DE DATOS LOCAL
  docker-postgresql:
    image: postgres:16-alpine
    container_name: talentus-postgres-dev
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgrespassword2026}
      POSTGRES_DB: ${POSTGRES_DB:-talentus_scout_dev}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - ./postgresql/data:/var/lib/postgresql/data
    networks:
      - talentus-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-talentus_scout_dev}"]
      interval: 3s
      timeout: 3s
      retries: 5

  # 2. CONTENEDOR DE MIGRACIONES AUTOMÁTICAS (dbmate)
  dbmate:
    image: amacneil/dbmate:latest
    container_name: talentus-dbmate
    volumes:
      - ./talentus-scout-migrations:/db
    environment:
      DATABASE_URL: "postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgrespassword2026}@docker-postgresql:5432/${POSTGRES_DB:-talentus_scout_dev}?sslmode=disable"
    depends_on:
      docker-postgresql:
        condition: service_healthy
    entrypoint: [ "/bin/sh", "-c" ]
    command: "/db/init_dbmate.sh"
    networks:
      - talentus-net

networks:
  talentus-net:
    driver: bridge
```

### 3.3. Estructura de `talentus-scout-migrations`
Ruta: `/home/edgar/Talentus Scout/talentus-scout-migrations/`
* `migrations/`: Directorio donde residirán los archivos de migración `.sql`.
* `init_dbmate.sh`: Script ejecutable dentro del contenedor con lógica de espera activa:
```bash
#!/bin/sh
set -e
echo "[dbmate] Iniciando sincronización de migraciones..."
echo "[dbmate] Target: $DATABASE_URL"

until dbmate --migrations-dir /db/migrations status > /dev/null 2>&1; do
  echo "[dbmate] Esperando a que PostgreSQL acepte conexiones..."
  sleep 1
done

dbmate --migrations-dir /db/migrations up
echo "[dbmate] Migraciones aplicadas con éxito."
```

### 3.4. Scripts de Conveniencia Local
* `scripts/dev-up.sh`: `docker compose up -d`
* `scripts/dev-down.sh`: `docker compose down`
* `scripts/db-status.sh`: Ejecuta status de dbmate

---

## 4. Repositorios Remotos en GitHub

Utilizando la sesión autenticada de `gh` (`edgonbr88`):
1. **`talentus-scout-migrations`:**
   * Crear repositorio público o privado en GitHub: `gh repo create talentus-scout-migrations --public --source=./talentus-scout-migrations --push`
2. **Repositorio Orquestador (`talentus-scout`):**
   * Crear repositorio para la raíz del proyecto si no existe: `gh repo create Talentus-Scout --public --source=. --push`

---

## 5. Plan de Pruebas y Validación

1. **Prueba de Healthcheck de PostgreSQL:**
   * Comando: `docker compose ps`
   * Esperado: `talentus-postgres-dev` en estado `healthy` y puerto `5432` escuchando.
2. **Prueba de Conexión de dbmate:**
   * Comando: `docker compose logs dbmate`
   * Esperado: Registro `[dbmate] Migraciones aplicadas con éxito.` y código de salida 0 (`Exited (0)`).
3. **Prueba de Persistencia de Datos:**
   * Reiniciar contenedores (`docker compose restart docker-postgresql`) y verificar que los datos en `./postgresql/data` se mantienen intactos.
4. **Verificación de Sincronización en GitHub:**
   * Comando: `gh repo view talentus-scout-migrations`
   * Esperado: Repositorio accesible y actualizado en GitHub.

---

## 6. Checklist de Implementación Paso a Paso (Para `trello_implementer`)

- [x] **Paso 1:** Configurar `.gitignore` en la raíz para ignorar `postgresql/data`, `.env` y temporales.
- [x] **Paso 2:** Crear el archivo `.env` con las variables de base de datos local.
- [x] **Paso 3:** Crear el archivo `docker-compose.yml` con la red `talentus-net`, los servicios `docker-postgresql` y `dbmate`.
- [x] **Paso 4:** Crear el directorio `talentus-scout-migrations` con su carpeta `migrations/` y el archivo ejecutable `init_dbmate.sh` (`chmod +x`).
- [x] **Paso 5:** Crear scripts auxiliares `scripts/dev-up.sh` y `scripts/dev-down.sh` (`chmod +x`).
- [x] **Paso 6:** Levantar el entorno con `docker compose up -d` y verificar logs del contenedor `docker-postgresql` y `dbmate`.
- [x] **Paso 7:** Inicializar git y publicar los repositorios en GitHub mediante `gh repo create`.
- [x] **Paso 8:** Validar Criterios de Aceptación (DoD) y ejecutar `move_to_testing.py 6abbe1f192330f55fb666892`.

---

## 7. Criterios de Aceptación (Definition of Done - DoD)

1. `docker compose up -d` inicia `docker-postgresql` en estado `healthy`.
2. El contenedor `dbmate` ejecuta `init_dbmate.sh` sin errores y se apaga con código 0.
3. El directorio `talentus-scout-migrations` está inicializado como repositorio Git y sincronizado en la cuenta de GitHub `edgonbr88`.
4. El archivo `.env` y el directorio `postgresql/data` están excluidos del control de versiones vía `.gitignore`.
5. La tarjeta `[TS-01]` es trasladada a la columna **`in testing`** en Trello con su respectivo comentario de resumen.
