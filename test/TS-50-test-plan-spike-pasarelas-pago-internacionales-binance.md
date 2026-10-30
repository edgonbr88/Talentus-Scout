# Plan de Pruebas y Validación: [TS-50] Spike Operativo y Administrativo: Pasarelas de Pago Internacionales (Stripe/Chile vs Alternativas y Binance Pay Productivo)

**ID Tarea:** TS-50  
**Título:** Spike Operativo y Administrativo: Pasarelas de Pago Internacionales (Stripe/Chile vs Alternativas y Binance Pay Productivo)  
**Tarjeta Trello:** [https://trello.com/c/6ad613d90415418f75f8b964](https://trello.com/c/6ad613d90415418f75f8b964)  
**Sprint:** Sprint 4  
**Fecha:** 2026-10-20  
**Estado:** VALIDADO / EN TESTING  
**Agente:** trello_implementer  

---

## 1. Alcance de la Validación
- **Documentación Operativa y Administrativa:**
  - Archivo `docs/GUIA_ADMINISTRATIVA_PASARELAS_PAGO_STRIPE_BINANCE.md` generado en el repositorio oficial.
  - Evaluación legal, tributaria y financiera de Stripe Atlas (LLC en EE.UU.) vs pasarelas con empresa en Chile (dLocal Go, Flow.cl, Mercado Pago).
  - Diagnóstico técnico de la Merchant API de Binance Pay y diseño de la estrategia en dos fases (semiautomático con Pay ID inmediato vs automatización con cuenta institucional).
- **Backlog y Gobernanza de Trello:**
  - Verificación de la creación de las dos tareas técnicas derivadas: `[TS-51]` y `[TS-52]`.

---

## 2. Verificaciones Ejecutadas

### 2.1. Verificación del Documento Entregable
- **Ubicación:** `docs/GUIA_ADMINISTRATIVA_PASARELAS_PAGO_STRIPE_BINANCE.md`
- **Contenido Verificado:**
  1. *Resumen Ejecutivo:* Problemática de monetización transfronteriza y tutores en el exterior.
  2. *Matriz Comparativa de Pasarelas de Tarjetas:* Costos de setup, costos anuales, comisiones, soporte de USD nativo, plazos de payout y fricción de usuario.
  3. *Diagnóstico de Binance Pay:* Restricción de Merchant API a cuentas corporativas (KYB) y diseño del flujo alternativo en dos fases (Fase 1 con Pay ID/QR + auditoría admin; Fase 2 con Merchant API institucional).
  4. *Checklist de Acciones Directivas:* Pasos legales en Chile/EE.UU., trámite bancario y parametrización de variables.

### 2.2. Verificación de Creación de Tarjetas Derivadas en Trello
- **Tarjeta 1:** `[TS-51] Integración de Pasarela de Pago Internacional para Tarjetas de Crédito/Débito`
  - ID: `6ad7797af454b0eda0026bfb`
  - URL: [https://trello.com/c/CxViz0qU](https://trello.com/c/CxViz0qU)
  - Lista: `To Do`
  - Estado: Creada con especificación técnica de backend (`CardPaymentService`, webhooks, idempotencia) y frontend.
- **Tarjeta 2:** `[TS-52] Configuración y Pase a Producción de Binance Pay y Flujo Semiautomático con Pay ID`
  - ID: `6ad779854baced6211d06203`
  - URL: [https://trello.com/c/CnR3ZTDE](https://trello.com/c/CnR3ZTDE)
  - Lista: `To Do`
  - Estado: Creada con especificación técnica de captura de referencia de Binance Pay, auditoría y variables productivas.

---

## 3. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
|---|---|---|
| Documento `docs/GUIA_ADMINISTRATIVA_PASARELAS_PAGO_STRIPE_BINANCE.md` redactado e incorporado al repositorio | **VERIFICADO** | Archivo creado en `docs/` con análisis integral y diagramas Mermaid |
| Matriz de decisión clara con costos, comisiones, monedas y tiempos de liquidación (Stripe Atlas, dLocal Go, Flow.cl, Mercado Pago) | **VERIFICADO** | Tabla comparativa detallada en Sección 2.5 de la guía |
| Diagnóstico concluyente sobre viabilidad de Binance Pay Merchant API con cuenta personal y plan de acción recomendado | **VERIFICADO** | Diagnóstico en Sección 3 con estrategia en dos fases (Pay ID inmediato vs KYB institucional) |
| Checklist paso a paso de trámites administrativos, legales y fiscales para el equipo fundador | **VERIFICADO** | Sección 4 de la guía con checklists para Chile y Binance |
| Generación de las 2 nuevas tarjetas técnicas en el tablero de Trello con especificaciones técnicas | **VERIFICADO** | Tarjetas `TS-51` y `TS-52` creadas con éxito en la lista `To Do` |

---

## 4. Conclusiones y Próximos Pasos Recomendados
1. **Prioridad Inmediata:** Proceder con la implementación de `[TS-52]` para habilitar el cobro con criptoactivos en USDT de forma inmediata utilizando el Binance Pay ID de la cuenta personal, sin necesidad de esperar trámites corporativos.
2. **Definición de Pasarela de Tarjetas:** El equipo directivo debe seleccionar entre dLocal Go (manteniendo cobro puro en USD) o Flow.cl (inmediatez con empresa chilena) para proceder con el desarrollo de `[TS-51]`.
