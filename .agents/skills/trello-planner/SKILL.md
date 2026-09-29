---
name: trello-planner
description: >-
  Reads active cards from the 'in development' column in the Talentus Scout Trello board,
  contextualizes them with the technical specification and strategic summary documents,
  and generates an exhaustive implementation plan markdown file inside the plans/ folder.
---

# Trello Planner Skill

This skill guides the agent in executing the role of **`trello_planner`** for Talentus Scout.

## Objective
Inspect the **`in development`** column of the Trello board, analyze the active card(s) against the project's technical and strategic specifications, and write a complete, unambiguous implementation plan for the **`trello_implementer`** agent inside `plans/`.

---

## Required Context Files (Must Read Before Planning)
Always consult these single sources of truth in this workspace:
* [Talentus Scout — Especificación y Diseño Técnico del MVP.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Especificaci%C3%B3n%20y%20Dise%C3%B1o%20T%C3%A9cnico%20del%20MVP.md)
* [Talentus Scout — Resumen Estratégico y Técnico Inicial.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Resumen%20Estrat%C3%A9gico%20y%20T%C3%A9cnico%20Inicial.md)

---

## Step-by-Step Procedure

### 1. Fetch Cards in Development
Execute the helper script to query the Trello API:
```bash
python3 .agents/skills/trello-planner/scripts/fetch_in_dev.py
```
Or query via HTTP directly:
* **List ID `in development`:** `6abbbdd8ad4beef505ef70e1`
* **Endpoint:** `GET https://api.trello.com/1/lists/6abbbdd8ad4beef505ef70e1/cards?key={KEY}&token={TOKEN}`

*If no cards are in `in development`, inform the user immediately and list the top candidates in `To Do` or `prioritized`.*

### 2. Deep Technical Contextualization
For each card in `in development`:
1. Extract the card ID, name (e.g. `[TS-01] Configuración de Repositorios...`), and description.
2. Locate the corresponding section in [Talentus Scout — Especificación y Diseño Técnico del MVP.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Especificaci%C3%B3n%20y%20Dise%C3%B1o%20T%C3%A9cnico%20del%20MVP.md) and [Talentus Scout — Resumen Estratégico y Técnico Inicial.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Resumen%20Estrat%C3%A9gico%20y%20T%C3%A9cnico%20Inicial.md).
3. Map out:
   * **Database:** DDL changes, Flyway migration files (`V...__description.sql`), Neon PostgreSQL constraints.
   * **Backend:** Spring Boot 3 classes, packages, interfaces, DTOs, Jakarta validations, Spring Security roles.
   * **Frontend:** Angular 18+ components (standalone), routing, services, SSR considerations, responsive styles.
   * **Security/Legal:** LOPNNA Art. 65 safeguards, WhatsApp contact links, scout access guards.

### 3. Generate Implementation Plan
Write a new markdown file in the `plans/` directory:
* **File Path Format:** `plans/<TASK-ID>-plan-<slug>.md`
  *(Example: `plans/TS-01-plan-configuracion-repositorios-neon.md`)*

#### Standard Plan Structure:
```markdown
# Plan de Implementación: [TS-XX] <Título de la Tarea>

**ID Tarea:** TS-XX  
**Tarjeta Trello:** <URL de la tarjeta>  
**Fecha:** <Fecha actual>  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- ¿Qué problema resuelve esta tarea?
- ¿Cómo impacta al atleta, tutor, scout o club?
- Restricciones legales aplicables (LOPNNA, FIFA).

## 2. Alcance Técnico y Arquitectura
- Componentes del sistema afectados.
- Dependencias con otras tareas.

## 3. Modelo de Datos y Migraciones (PostgreSQL / Neon)
- Script SQL DDL exacto.
- Nombre del archivo de migración Flyway: `src/main/resources/db/migration/V...__...sql`.

## 4. Backend: Spring Boot 3 (Java 21)
- Paquete: `com.talentus.scout...`
- Clases a crear o modificar:
  - Entidad JPA
  - Repositorio Spring Data
  - DTOs (Request / Response)
  - Servicio / Lógica de negocio
  - Controller REST con anotaciones de seguridad (`@PreAuthorize`)

## 5. Frontend: Angular 18+ (Standalone & SSR)
- Módulos / Componentes:
  - Archivo `.ts`, `.html`, `.css`
  - Servicio HTTP en `core/services/`
  - Rutas y Guards

## 6. Pruebas y Verificación
- Casos de prueba unitarios e integración.
- Comandos cURL de prueba con respuestas esperadas.

## 7. Checklist Paso a Paso (Para trello_implementer)
- [ ] Paso 1: ...
- [ ] Paso 2: ...
- [ ] Paso 3: ...

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [ ] Compilación sin errores (`mvn clean compile`, `ng build`).
- [ ] Pruebas automatizadas en verde.
- [ ] Criterios específicos de la tarjeta verificados.
```

### 4. Notification to the User
Report that the plan has been generated with a direct clickable file link and a brief summary of the architectural decisions made.
