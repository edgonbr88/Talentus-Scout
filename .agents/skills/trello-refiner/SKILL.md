---
name: trello-refiner
description: >-
  Reads raw cards from the 'to refine' column in the Talentus Scout Trello board,
  analyzes them against the project's strategic and technical documentation,
  interviews the user to clarify ambiguities, refines the card with technical specs,
  acceptance criteria, tags, and standard TS-XX naming, and moves it to the 'To Do' column.
---

# Trello Refiner Skill

This skill guides the agent in executing the role of **`trello_refiner`** for Talentus Scout.

## Objective
Take raw, ambiguous, or incomplete cards from the **`to refine`** column on the Trello board, deeply analyze them against the project's business and technical documentation ("La Biblia" and the MVP Technical Specification), ask the user targeted clarifying questions to resolve any doubts or missing requirements, format the card into the standard production-ready structure (`[TS-XX]`), and move it to the **`To Do`** column.

---

## Required Context Files (Must Consult During Analysis)
Always cross-reference the card's requirements with these sources of truth:
* [Talentus Scout — Resumen Estratégico y Técnico Inicial.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Resumen%20Estrat%C3%A9gico%20y%20T%C3%A9cnico%20Inicial.md)
* [Talentus Scout — Especificación y Diseño Técnico del MVP.md](file:///home/edgar/Talentus%20Scout/Talentus%20Scout%20%E2%80%94%20Especificaci%C3%B3n%20y%20Dise%C3%B1o%20T%C3%A9cnico%20del%20MVP.md)
* DDL canónico y migraciones existentes en `talentus-scout-migrations/migrations/`

---

## Trello Connection Parameters
* **Tablero:** `Talentus Scout` (`https://trello.com/b/rPHiaZJ1/talentus-scout`)
* **ID del Tablero:** `6abbbd64c01fb9f0420685dc`
* **ID de la Columna `to refine`:** `6abc04998f4a3cbb55c8280d`
* **ID de la Columna `To Do`:** `6abbbd64c01fb9f0420685d8`
* **Credenciales:** Variables `TRELLO_API_KEY` y `TRELLO_TOKEN` o configuradas en los scripts auxiliares.

---

## Step-by-Step Procedure

### 1. Fetch Cards Pending Refinement
Execute the helper script to list pending cards in `to refine`:
```bash
python3 .agents/skills/trello-refiner/scripts/fetch_to_refine.py
```
*Si no hay tarjetas en `to refine`, informa al usuario inmediatamente de que la columna está limpia.*  
*Si hay múltiples tarjetas, muéstralas al usuario y procede con la tarjeta prioritaria o la indicada por el usuario.*

### 2. Business and Technical Impact Analysis
For the target card:
1. Examine its title and existing raw description.
2. Cross-reference with the master project documents:
   * **Propuesta de valor y lógica de negocio:** ¿Cómo encaja en el loop de retención, modelo de negocio o perfil deportivo?
   * **Blindaje legal y protección de menores:** ¿Involucra datos de menores de edad? ¿Afecta el consentimiento LOPNNA Art. 65, términos de servicio o normativa FIFA?
   * **Arquitectura:** ¿Requiere cambios DDL en PostgreSQL (nuevas tablas, columnas, ENUMs)? ¿Endpoints REST en Spring Boot 3? ¿Componentes o guards en Angular 18+?
   * **Seguridad y roles:** ¿Aplica a tutores, scouts, organizaciones verificadoras o administradores?

### 3. Clarification Gate: Ask the User (OBLIGATORIO)
**Nunca asumas decisiones críticas de negocio o diseño técnico.**
Antes de redactar la especificación final o mover la tarjeta:
* Identifica vacíos, ambigüedades, preguntas de alcance o alternativas técnicas.
* Formula preguntas directas, estructuradas y con opciones claras al usuario:
  * *Ejemplo de duda de alcance:* "¿El registro con Google/Microsoft aplica únicamente a cuentas de tutores y scouts, o también a organizaciones verificadoras?"
  * *Ejemplo de duda de reglas de negocio:* "¿Al iniciar sesión con Google se creará la cuenta automáticamente en estado ACTIVE, o requerirá igualmente completar el paso de aceptación de términos legales antes de habilitar el perfil?"
* Espera la respuesta del usuario antes de proceder a mover la tarjeta.

### 4. Determine Next Task ID (`[TS-XX]`)
Run the helper script to identify the next sequential TS ID:
```bash
python3 .agents/skills/trello-refiner/scripts/get_next_ts_id.py
```
*(Por ejemplo, retornará `TS-20` si la última tarjeta existente es `TS-19`).*

### 5. Format Standard Card Specification
Redacta la tarjeta utilizando el formato estándar y riguroso de Talentus Scout:

* **Título:** `[TS-XX] <Título Descriptivo y Claro>`
* **Cuerpo de la Descripción:**
```markdown
* **Lista en Trello:** `To Do`
* **Etiquetas:** `Backend`, `Frontend`, `<Categoría>`, `Sprint X`
* **Contexto de Negocio:**
  * <Justificación del requerimiento, valor aportado y usuarios impactados.>
  * <Consideraciones de protección al menor (LOPNNA / FIFA) si aplican.>
* **Especificación Técnica:**
  1. <Base de datos: tablas impactadas, nuevas columnas o migraciones DDL con dbmate.>
  2. <Backend: endpoints REST (métodos, URLs), servicios, validaciones y seguridad Spring Security.>
  3. <Frontend: componentes Angular 18+, formularios, navegación, manejo de estados.>
* **Criterios de Aceptación (DoD):**
  * <Criterio 1 medible y verificable.>
  * <Criterio 2 medible y verificable.>
  * <Criterio 3...>
* **Dependencias:** `TS-YY` (si requiere tareas previas).
```

### 6. Update Card and Move to `To Do`
Usa el script automatizado para actualizar la tarjeta y moverla a la columna `To Do`:
```bash
python3 .agents/skills/trello-refiner/scripts/refine_card.py <CARD_ID> \
  --title "[TS-XX] <Nuevo Título>" \
  --desc-file path/to/temp_desc.md \
  --comment "Tarjeta refinada por trello_refiner y movida a 'To Do'. Se incorporaron especificaciones técnicas y resolución de dudas del usuario."
```

### 7. Final Report to the User
Reporta al usuario:
* ID asignado (`[TS-XX]`) y título final.
* Enlace directo a la tarjeta en Trello.
* Resumen de las aclaraciones acordadas.
* Confirmación del traslado a la columna **`To Do`**.
