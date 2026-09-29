# Talentus Scout — Biblia Estratégica, de Negocio y Técnica

**Fecha de última actualización:** 29 de septiembre de 2026  
**Nombre del Producto:** Talentus Scout  
**Estado:** Documento Maestro y Fuente de Verdad del Proyecto (Single Source of Truth)  
**Mercado Objetivo Inicial:** Venezuela (Caracas / Miranda)  
**Proyección Regional:** Chile, Miami (EE. UU.) y resto de Latinoamérica  

---

## 1. Visión General y Tesis de Negocio

* **Problema:** Enorme masa de talento deportivo formativo invisible; carencia de herramientas digitales accesibles, estructuradas y profesionales para scouting, vitrina y seguimiento en Sudamérica.
* **Propuesta de Valor:** Democratizar la visibilidad del atleta joven mediante una cédula deportiva digital verificable, centralizando su perfil, métricas y material audiovisual en un formato estándar y profesional.
* **Canal de Adquisición y Tracción Inicial (Unfair Advantage):** Alianza y distribución directa con la **Asociación de Fútbol de Caracas** y sus clubes afiliados, otorgando acceso inmediato a una masa cautiva de ~15.000 atletas federados.
* **Puentes Internacionales Estratégicos:**
  * **Chile:** Red de academias formativas (puente competitivo regional).
  * **Miami (EE. UU.) / Entorno Juan Arango:** Conexión directa hacia academias de MLS Next, ligas USL y programas de becas universitarias deportivas (NCAA / NAIA).

---

## 2. El Lado de la Demanda: Scouts y Reclutadores

* **Perfil de Scouts Prioritarios:**
  * Reclutadores de las selecciones formativas de Venezuela (Vinotinto Sub-15, Sub-17, Sub-20).
  * Cuerpos técnicos y scouts de clubes de la **Liga FUTVE** (Primera y Segunda División).
  * Academias formativas aliadas en el exterior (Chile, Colombia, EE. UU.).
  * Entrenadores y "college scouts" para colocación en programas universitarios en EE. UU.
* **Política de Acceso y Acreditación de Seguridad:**
  * **100% Gratuito pero Estrictamente Verificado**. Para proteger a los atletas menores de edad y mantener la seriedad de la plataforma, el registro no es de libre acceso inmediato.
  * **Proceso de Acreditación Obligatorio:** Todo reclutador debe registrarse y adjuntar documentación que certifique su rol (carnet federativo o de club, carta institucional, acreditación de scouting o perfil profesional comprobable). Su cuenta entra en estado `PENDIENTE_VERIFICACION` y es auditada y aprobada por el equipo de administración de Talentus Scout antes de tener visibilidad sobre el directorio de atletas.
* **Mecanismo de Contacto Scout ↔ Atleta / Representante:**
  * **Canal Directo Anti-Fricción al Representante Legal (Vía WhatsApp):** El scout acreditado cuenta con un botón de contacto directo que abre WhatsApp apuntando *exclusivamente* al número telefónico verificado del representante legal (prohibido el contacto directo con el menor).
  * **Mensaje Preformateado Obligatorio:** Al pulsar el botón, se genera automáticamente un texto base estructurado y profesional:
    > *"Hola [Nombre del Representante], soy [Nombre del Scout] de [Club / Organización]. He visto el perfil de [Nombre del Atleta] en Talentus Scout y me gustaría conversar sobre su proyección deportiva."*
* **Ficha Técnica y Datos Deportivos Clave:**
  * Categoría, año de nacimiento exacto y edad cronológica.
  * Posición principal y secundaria, pierna hábil / lateralidad.
  * Club actual, minutos jugados y trayectoria deportiva.
  * Pasaportes secundarios (comunitario/europeo, estadounidense, etc.) — *factor crítico de contratación internacional*.
  * **Perfil Antropométrico y Biotipo:** Estatura, peso, envergadura, velocidad/resistencia. *(Nota: punto marcado para profundización técnica específica según el deporte).*

---

## 3. Sistema de Certificación y Confianza (Moat / Foso Defensivo)

Para evitar el "hype" sin fundamento o la alteración de datos por parte de terceros, la plataforma adopta un **modelo abierto, acumulativo y dual de multicertificación**:

* **Entidades Certificadoras Válidas:**
  1. **Club de origen:** Avala pertenencia al plantel, minutos y posición.
  2. **Asociación regional (ej. Asociación de Caracas):** Valida número de ficha federativa y estatus oficial de atleta federado.
  3. **Entrenador / Agente / Scout acreditado:** Validación técnica externa (prohibido que sea el propio padre o familiar).
  4. **Centros médicos / deportivos:** Certificación de métricas antropométricas, pruebas físicas y aptitud médica.

* **Arquitectura Operativa de Verificación (Esquema Dual):**
  * **1. Perfil / Rol de "Organización Verificadora" (Portal Especializado):**
    * Usuarios delegados de clubes, asociaciones y federaciones cuentan con un perfil institucional con privilegios de verificación.
    * Disponen de un panel donde pueden buscar a los atletas de su club/organización y estampar la validación digital oficial de ficha federativa, pertenencia al plantel y categoría con un solo clic.
  * **2. Opción Rápida / Operativa ("Fast-Track" Asistido por Admin):**
    * Para evitar cuellos de botella iniciales si un club tarda en digitalizarse o no tiene personal activo en la plataforma, el atleta o su representante puede adjuntar foto de su carnet federativo, carnet de club o constancia oficial.
    * El equipo de Talentus Scout valida directamente contra listados oficiales (cruces con archivos CSV/Excel provistos por la Asociación de Caracas) y activa la insignia de confianza desde el panel administrativo central.

* **Dinámica:** Un perfil puede acumular múltiples sellos de verificación ("Insignias de Confianza"), incrementando progresivamente su credibilidad ante los scouts.

---

## 4. Modelo de Negocio y Estrategia de Pagos

* **Estructura de Producto (B2C / B2B2C) — Monetización Activa desde el Día 1:**
  * La plataforma cobra desde el lanzamiento del piloto inicial para validar de inmediato la disposición a pagar (WTP) de las familias y garantizar la sostenibilidad operativa de la infraestructura.
  * **Cédula Deportiva Básica (Freemium):** Registro gratuito vía alianza institucional (ficha técnica estandarizada, club de pertenencia y 1 video corto de muestra transcodificado).
  * **Suscripción Pro / Pase de Temporada (Pago Activo):**
    * Soporte para 3+ videos de jugadas en alta definición con streaming adaptativo.
    * Radar de visualizaciones (notificaciones de qué scouts y clubes han visto el perfil o reproducido sus videos).
    * Descarga de CV Deportivo en PDF profesional en 1 clic.
    * Enlace web público personalizado y posición destacada en el directorio de talentos.
  * **Servicios On-Demand (Edición de Video):** Paquetes de recorte y etiquetado de jugadas destacadas. *(Pospuesto para definición y diseño operativo en etapas posteriores).*

* **Estrategia de Pagos Anti-Fricción y Conciliación Híbrida (Venezuela y Latam):**
  * **Soporte de Modalidades:** Suscripción mensual/anual recurrente y pases prepagados de temporada (3, 6 y 12 meses) para eliminar la fricción de tarjetas bancarias en Venezuela.
  * **Métodos de Pago Integrados:**
    * **Pago Móvil (Bolívares - Tasa Oficial BCV):** Flujo de reporte de referencia bancaria y captura dentro de la app, con validación rápida administrativa / semiautomatizada en el MVP.
    * **Criptoactivos:** Binance Pay / USDT (confirmación y activación automática vía webhook).
    * **Billeteras Digitales:** Zinli, Wally, Zelle (reporte de transacción y confirmación asistida).
    * **Tarjetas Internacionales:** Débito / Crédito mediante pasarela global (Stripe u operador similar) para representantes en el exterior o bancarizados internacionalmente.

---

## 5. Dinámica de Retención y Valor Percibido (Loop de la Familia)

Para evitar cancelaciones tempranas si un scout no contacta inmediatamente al jugador:

* **Feedback Continuo de Actividad:**
  * Métricas transparentes en el panel del atleta: *"Tu perfil apareció en 18 búsquedas esta semana"*, *"Un scout de Liga FUTVE reprodujo tu video"*.
* **Utilidad Inmediata "Día 1" (Sin depender de los scouts):**
  * **Enlace Público Compartible:** Página personal con diseño moderno estilo Bento/Linktree deportivo, optimizada para compartir en bio de Instagram y WhatsApp.
  * **Curriculum Vitae Deportivo (PDF en 1 Clic):** Hoja de vida deportiva estandarizada y descargable para presentar en pruebas presenciales, convocatorias y viajes.

---

## 6. Marco Legal y Protección de Menores

* **LOPNNA (Venezuela - Cumplimiento Estricto):**
  * **Art. 65:** Consentimiento expreso, inequívoco y verificable del representante legal para la publicación de imagen, videos y datos del menor.
  * La cuenta titular, de administración, autorización y facturación pertenece exclusivamente al representante legal.
  * **Protección de Datos Privados y Canalización de Contacto:** Queda estrictamente prohibida la publicación pública de datos de ubicación privada (colegio, dirección de residencia, teléfonos directos del menor). Todo enlace o botón de contacto comercial o deportivo está canalizado directa y exclusivamente hacia el teléfono de WhatsApp verificado del tutor legal.
* **Filtro de Seguridad para Scouts:** Acceso condicionado a revisión de identidad y documentación profesional para asegurar que ningún agente no acreditado acceda a la base de datos de jóvenes deportistas.
* **Normativa FIFA (Reglamento sobre el Estatuto y la Transferencia de Jugadores - RETJ):**
  * La plataforma opera estrictamente como **directorio y vitrina digital deportiva**.
  * No ejerce labores de intermediación, agencia de representación, ni cobro de comisiones por transferencia de menores.

---

## 7. Alcance del MVP Quirúrgico (Fase 1)

El objetivo es salir a canchas a validar con los primeros 100-200 atletas federados con la menor fricción técnica posible, cobrando desde el día 1 y garantizando máxima seguridad legal:

1. **Onboarding Legal del Representante:** Registro del tutor, verificación de identidad básica y firma/aceptación de términos LOPNNA.
2. **Cédula Deportiva del Atleta:** Ficha técnica estructurada (categoría, año de nacimiento, posición, club actual, pasaportes y campo para número de ficha federativa).
3. **Módulo de Video de Alto Rendimiento:** Carga optimizada de 1-2 clips cortos directo desde el móvil con transcodificación automática vía Cloudflare/Bunny.
4. **Perfil Público Compartible (Bento Deportivo):** Vista web móvil de alta fidelidad estética con botón de compartir por WhatsApp y descarga de ficha básica / CV en PDF.
5. **Módulo de Monetización y Cobro Día 1:** Activación de Cédula Básica vs. Suscripción Pro / Pase de Temporada, con recepción de pagos vía Pago Móvil (formulario de reporte de referencia), Binance Pay y pasarela internacional.
6. **Directorio Básico para Scouts Acreditados:** Vista de búsqueda y filtros rápidos (por categoría/año, club y posición), con flujo de registro de scout (`PENDIENTE_VERIFICACION` con carga de credencial) y aprobación previa por el administrador.
7. **Canal de Contacto Seguro:** Botón de WhatsApp integrado en la ficha del atleta que conecta directamente al scout con el representante legal mediante mensaje predeterminado.
8. **Módulo de Verificación Dual:**
   * Panel para **Organizaciones Verificadoras** (clubes/asociación) para validar fichas de sus atletas.
   * Flujo **Fast-Track** para carga de carnet federativo por parte del atleta y activación manual de insignias de confianza por el administrador.

---

## 8. Stack Técnico y Arquitectura de Infraestructura

* **Frontend:** **Angular** (con soporte SSR / Server-Side Rendering para perfiles públicos ultrarrápidos y generación dinámica de tarjetas Open Graph / SEO para WhatsApp e Instagram) alojado en servicios en la nube / CDN (ej. Firebase Hosting, Vercel o Cloudflare Pages).
* **Backend:** **Java con Spring Boot** (Spring Boot 3 / Java 17/21) modular y contenerizado (Docker), desplegado en **GCP Cloud Run** (o contenedor administrado) para APIs REST, lógica de negocio, seguridad y gestión de eventos (~$5 - $40/mes según demanda).
* **Base de Datos:** **Neon** (Serverless PostgreSQL) con escalado automático y backups (~$5 - $25/mes).
* **Video y Streaming (Núcleo Operativo):** **Cloudflare Stream** o **Bunny.net Stream**:
  * Carga directa cliente-a-nube vía URLs prefirmadas (sin saturar ni pasar gigabytes por el backend).
  * Transcodificación automática a HLS multipantalla adaptada a conexiones móviles lentas.
  * Costo unitario proyectado: ~$5 USD por cada 1.000 minutos almacenados y ~$1 USD por cada 1.000 minutos reproducidos.

---

## 9. Estimación de Costos Operativos por Escenario

| Escenario | Atletas Activos | Video Almacenado (6 min c/u) | Streaming Estimado | Costo Total Infraestructura |
| :--- | :--- | :--- | :--- | :--- |
| **Piloto / Validación** | 1.000 | 6.000 min | 60.000 min | **~$125 – $130 USD/mes** |
| **Tracción Media** | 5.000 | 30.000 min | 300.000 min | **~$505 – $530 USD/mes** |
| **Escala Completa** | 15.000 | 90.000 min | 900.000 min | **~$1.450 – $1.550 USD/mes** |

*Costo marginal de infraestructura por atleta: ~$0.10 - $0.12 USD/mes.*  
*Una tasa de conversión del 3% al 5% en suscripciones o pases de temporada de $3 a $5 USD/mes financia la totalidad de la infraestructura y genera margen operativo positivo.*
