# Plan de Implementación: [TS-50] Spike Operativo y Administrativo: Pasarelas de Pago Internacionales (Stripe/Chile vs Alternativas y Binance Pay Productivo)

**ID Tarea:** TS-50  
**Tarjeta Trello:** [https://trello.com/c/6ad613d90415418f75f8b964](https://trello.com/c/6ad613d90415418f75f8b964)  
**Fecha:** 2026-10-20  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Talentus Scout busca monetizar su radar de visibilidad para futbolistas juveniles mediante el cobro de planes Pro (mensuales/anuales) a tutores en el exterior o bancarizados internacionalmente. Si bien el sistema ya cuenta con Pago Móvil para Venezuela, se necesita habilitar cobros en divisas mediante tarjetas de crédito/débito internacionales y criptoactivos (USDT).
- **Desafíos Administrativos y Fintech Identificados:**
  1. *Stripe:* No opera formalmente en Venezuela ni Chile directamente para la creación de cuentas merchant estándar, planteando la disyuntiva entre constituir una LLC en EE.UU. (vía Stripe Atlas) o utilizar pasarelas compatibles con personas jurídicas en Chile (dLocal Go, Flow.cl, Mercado Pago).
  2. *Binance Pay:* El backend ya tiene desarrollada la integración de órdenes y webhooks (`BinancePayService`), pero la cuenta de Binance de los fundadores es personal. Es indispensable evaluar la viabilidad de obtener API keys institucionales versus habilitar un flujo semiautomatizado vía Binance Pay ID.
- **Protección al Menor y Cumplimiento:** Los tutores deben tener total transparencia de costos y comisiones; el procesamiento no debe retener números de tarjeta ni datos financieros en servidores de Talentus Scout (cumplimiento PCI-DSS vía tokens/checkout hosted).

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - Documentación de Arquitectura y Negocio: `docs/GUIA_ADMINISTRATIVA_PASARELAS_PAGO_STRIPE_BINANCE.md`.
  - Backend: Revisión del modelo de transacciones (`PaymentTransaction`), enum `PaymentMethod`, configuración de variables de entorno de Binance Pay y diseño de endpoints futuros para la pasarela de tarjetas.
  - Tablero de Trello: Generación formal de dos tarjetas técnicas derivadas:
    - `[TS-51]` para la integración técnica de la pasarela internacional de tarjetas.
    - `[TS-52]` para el pase a producción y activación de Binance Pay.

---

## 3. Matriz Comparativa y Hallazgos del Spike

### A. Opciones de Tarjetas Internacionales
1. **Stripe Atlas (LLC en EE.UU. - Delaware/Wyoming):**
   - Costo de constitución: ~$500 USD (one-time).
   - Mantenimiento anual (Agente registrado + Franchise Tax + reporte tributario IRS 5472/1120): ~$400 - $800 USD/año.
   - Cuenta bancaria: Mercury Bank o Brex (USD nativo).
   - Comisiones Stripe: 2.9% + $0.30 USD por transacción exitosa (+1% para tarjetas internacionales fuera de EE.UU.).
   - Payouts: 2 a 3 días hábiles directo en USD.
   - Viabilidad: Alta solidez global, ideal para captar tutores e inversores internacionales sin fricción cambiaria.
2. **dLocal Go (Empresa en Chile):**
   - Costo de setup: $0 USD.
   - Comisiones: ~4.5% + $0.30 USD a 5.0% por pagos transfronterizos.
   - Monedas: Soporta cobro y liquidación en USD hacia cuenta bancaria internacional o en CLP para banco en Chile.
   - Viabilidad: Excelente alternativa intermedia para evitar la carga tributaria inicial de una LLC estadounidense.
3. **Flow.cl / Webpay Plus (Transbank) (Empresa en Chile):**
   - Costo de setup: Gratuito o mínimo con RUT chileno.
   - Comisiones para tarjetas extranjeras: ~3.19% + IVA a 3.5% + IVA.
   - Limitación: El cobro se procesa primariamente en CLP (pesos chilenos). Tutores en el extranjero verán el cargo convertido a su moneda local, lo que puede introducir volatilidad por tasa cambiaria frente a un precio fijado en USD.
4. **Mercado Pago Chile:**
   - Comisiones: ~3.19% + IVA. Diseñado prioritariamente para el mercado doméstico chileno; mayor tasa de rechazo en tarjetas emitidas en bancos venezolanos/europeos/estadounidenses.

### B. Diagnóstico de Binance Pay con Cuenta Personal
- **Binance Pay Merchant API:** Requiere verificación institucional (KYB - Know Your Business), certificado de incorporación empresarial y aprobación por el equipo de compliance de Binance. Una cuenta Binance personal **no** tiene acceso al Merchant Portal para emitir API Keys con capacidad de Webhook oficial.
- **Rutas de Acción:**
  - *Ruta Inmediata (MVP Semiautomatizado):* Habilitar opción de pago con Binance Pay ID / QR oficial en el checkout del tutor. El tutor transfiere desde la app de Binance y suministra el Order ID / Referencia de Binance Pay. El pago entra en estado `PENDING_AUDIT` y el administrador lo aprueba en 1 clic desde `/admin/pagos`, reutilizando la arquitectura de auditoría ya operativa.
  - *Ruta Definitiva (Escalamiento Automatizado):* Una vez constituida la empresa (Chile o EE.UU.), tramitar la cuenta corporativa Binance Institutional y registrarse en Binance Pay Merchant para activar las credenciales productivas ya codificadas en `BinancePayService`.

---

## 4. Checklist Paso a Paso (Para trello_implementer)
- [x] 1. Redactar el documento exhaustivo `docs/GUIA_ADMINISTRATIVA_PASARELAS_PAGO_STRIPE_BINANCE.md` con tablas comparativas, diagramas de flujo, procedimientos legales y fiscales.
- [x] 2. Calcular los siguientes identificadores disponibles en Trello (`TS-51` y `TS-52`).
- [x] 3. Crear la tarjeta `[TS-51] Integración de Pasarela de Pago Internacional para Tarjetas de Crédito/Débito` en la columna `To Do` de Trello con especificación técnica completa.
- [x] 4. Crear la tarjeta `[TS-52] Configuración y Pase a Producción de Binance Pay y Flujo Semiautomático con Pay ID` en la columna `To Do` de Trello con especificación técnica completa.
- [x] 5. Redactar el documento de validación y plan de pruebas en `test/TS-50-test-plan-spike-pasarelas-pago-internacionales-binance.md`.
- [x] 6. Marcar el checklist completado en este plan.
- [x] 7. Mover la tarjeta [TS-50] a `in testing` con comentario de trazabilidad en Trello.

---

## 5. Criterios de Aceptación (Definition of Done - DoD)
- [x] Documento `docs/GUIA_ADMINISTRATIVA_PASARELAS_PAGO_STRIPE_BINANCE.md` creado en el repositorio con rigor técnico y financiero.
- [x] Matriz comparativa entre Stripe Atlas, dLocal Go, Flow.cl y Mercado Pago con estimaciones de costos, comisiones y liquidez.
- [x] Diagnóstico concluyente sobre Binance Pay personal y roadmap de dos fases (semiautomático inmediato vs merchant API institucional).
- [x] Checklist administrativo y de cumplimiento paso a paso para el equipo directivo.
- [x] Dos tarjetas técnicas derivadas creadas y vinculadas en el tablero oficial de Trello (`TS-51` y `TS-52`).
