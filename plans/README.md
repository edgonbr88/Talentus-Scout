# Directorio de Planes de Implementación (`plans/`)

Este directorio contiene los planes técnicos generados por el agente **`trello_planner`** para cada tarjeta del tablero de Trello de **Talentus Scout** que entra a desarrollo (`in development`).

---

## Convención de Nombres
Cada plan debe nombrarse siguiendo el formato:
```
plans/<TS-ID>-plan-<slug-descriptivo>.md
```
*Ejemplos:*
* `plans/TS-01-plan-configuracion-repositorios-neon.md`
* `plans/TS-02-plan-seguridad-spring-security-jwt.md`
* `plans/TS-03-plan-onboarding-tutor-lopnna.md`

---

## Ciclo de Vida de un Plan

1. **Generación (`trello_planner`):**
   * El planificador lee la tarjeta en la columna `in development` de Trello.
   * Cruza la información con la especificación técnica (`Talentus Scout — Especificación y Diseño Técnico del MVP.md`) y el resumen estratégico (`Talentus Scout — Resumen Estratégico y Técnico Inicial.md`).
   * Redacta el plan técnico con checklist paso a paso.
2. **Ejecución (`trello_implementer`):**
   * El implementador toma el checklist, escribe el código y ejecuta las pruebas.
   * Marca los checkboxes `[x]` a medida que avanza.
3. **Cierre:**
   * Cuando todos los criterios de aceptación están en verde, se mueve la tarjeta a `in testing` en Trello.
