# Directorio de Planes de Pruebas (`test/`)

Este directorio contiene los **Planes de Pruebas y Validación** generados por el agente **`trello_implementer`** para cada tarea implementada de **Talentus Scout** antes de transicionar la tarjeta de Trello a `in testing`.

---

## Propósito
Centralizar y documentar la evidencia técnica, la batería de pruebas automatizadas y la guía de pruebas manuales para que el equipo de QA, los desarrolladores o los revisores puedan verificar de forma exhaustiva y reproducible que la funcionalidad implementada cumple con la Definición de Hecho (Definition of Done - DoD).

---

## Convención de Nombres
Cada plan de pruebas debe nombrarse siguiendo el formato:
```
test/<TS-ID>-test-plan-<slug-descriptivo>.md
```
*Ejemplos:*
* `test/TS-01-test-plan-orquestador-docker-dbmate.md`
* `test/TS-04-test-plan-onboarding-tutor-lopnna.md`
* `test/TS-07-test-plan-pipeline-video-streaming.md`

---

## Estructura Obligatoria de un Plan de Pruebas

1. **Identificación:** ID de la tarea, Título, Enlace a Trello, Sprint y fecha de ejecución.
2. **Alcance de Pruebas:** Módulos, entidades, servicios, controladores REST o componentes de Angular impactados.
3. **Pruebas Automatizadas Ejecutadas:**
   * Backend: Clases de test (`@SpringBootTest`, `@WebMvcTest`, tests unitarios), comando de ejecución (`./mvnw test`), aserciones verificadas y resultado obtenido.
   * Frontend: Tests unitarios/integración con Jasmine/Karma (`npm test`) si aplica.
4. **Guía de Pruebas Manuales / Verificación Paso a Paso:**
   * Comandos `cURL` reproducibles con headers de autenticación (`Bearer <TOKEN>`), payloads JSON y códigos HTTP esperados (200, 201, 400, 403, etc.).
   * Flujos de interacción en UI (Angular) paso a paso con comportamientos esperados.
5. **Matriz de Criterios de Aceptación (DoD):** Checkboxes de los criterios especificados en el plan técnico original marcados como verificados.
6. **Casos Borde y Validaciones Críticas:** Restricciones de seguridad (JWT, roles), reglas legales (LOPNNA Art. 65) y manejo de errores.
