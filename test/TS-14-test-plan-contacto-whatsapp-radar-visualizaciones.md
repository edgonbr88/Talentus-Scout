# Plan y Reporte de Pruebas — [TS-14] Botón de Contacto Seguro WhatsApp y Radar de Visualizaciones

## 1. Alcance de las Pruebas

Este documento detalla el plan y la ejecución exhaustiva de pruebas para la tarea **[TS-14]**, garantizando el blindaje de la privacidad de los atletas menores de edad, el canal de comunicación seguro y auditado hacia el representante legal vía WhatsApp, y la telemetría en tiempo real del radar de visualizaciones para el tutor.

### 1.1. Artefactos y Componentes Impactados
* **Base de Datos & Entidades:**
  * Tabla `scout_activity_logs` con columnas: `id`, `scout_id`, `athlete_id`, `action_type`, `created_at`, `ip_address`, `metadata_json`.
  * Índices relacionales: `idx_scout_activity_scout`, `idx_scout_activity_athlete`, `idx_scout_activity_type`.
  * Entidad JPA: `ScoutActivityLog` (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).
  * Repositorio: `ScoutActivityLogRepository` con queries agregadas por tipo de acción (`SEARCH_APPEARANCE`, `PROFILE_VIEW`, `WHATSAPP_CONTACT`) y timeline ordenado.
* **Backend (Spring Boot 3 / Java 21):**
  * `ScoutContactService`:
    * Sanitización de números telefónicos internacionales (`+58 412 1234567` -> `584121234567`).
    * Construcción de enlaces seguros WhatsApp (`https://wa.me/{phone}?text={encodedMsg}`).
    * Verificación de rol `ROLE_SCOUT` con estado verificado (`APPROVED`).
    * Verificación de consentimiento del representante legal activo antes de habilitar el contacto.
    * Registro de auditoría con tipo `WHATSAPP_CONTACT` y `PROFILE_VIEW`.
    * Cálculo y agregación de métricas para el radar del tutor (`TutorRadarMetricsResponse`).
  * Endpoints REST:
    * `POST /api/v1/scouts/contact-click` (Roles: `SCOUT`, `ADMIN`).
    * `POST /api/v1/scouts/log-view` (Roles: `SCOUT`, `ADMIN`).
    * `GET /api/v1/athletes/radar` (Roles: `TUTOR`, `ADMIN`).
  * DTOs con validación Jakarta & Lombok: `ContactClickRequest`, `ContactClickResponse`, `TutorRadarMetricsResponse`, `ScoutInteractionItem`, `AthleteRadarMetricItem`.
* **Frontend (Angular 18+ SSR):**
  * Modelos TypeScript: `scout-contact.model.ts`.
  * Servicios: `scout-directory.service.ts` (`contactAthleteTutor`, `logAthleteView`), `athlete.service.ts` (`getTutorRadarMetrics`).
  * Componentes UI:
    * `scout-directory.component`: Botón "Contactar Representante" / "Contactar Tutor" con icono oficial de WhatsApp y feedback visual.
    * `bento-profile.component`: Botón de contacto directo por WhatsApp en la cabecera y registro automático de vista para scouts.
    * `tutor-dashboard.component`: Widget Bento Grid con Radar de Visualizaciones en tiempo real, KPIs numéricos y feed de scouts activos.
  * Cumplimiento de regla de diseño y UX: **Cero uso de la palabra LOPNNA** en botones, labels, badges o textos visibles al usuario, empleando términos claros como "Representante Legal", "Protección al Menor" y "Consentimiento Legal Activo".

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Backend Unit & Integration Tests

Comando ejecutado:
```bash
./mvnw test -Dtest=ScoutContactServiceTest,ScoutContactControllerIntegrationTest,ScoutDirectoryIntegrationTest
```

#### Resultados:
1. **`ScoutContactServiceTest` (5/5 Pasadas):**
   * `processContactClick_Success_ReturnsValidWhatsAppUrlAndLogsActivity`: Valida generación de URL de WhatsApp con mensaje codificado y persistencia del log.
   * `processContactClick_SanitizesPhoneNumber_Correctly`: Valida sanitización de prefijos internacionales con signos de más, guiones y espacios (`+58 412 123-4567` -> `584121234567`).
   * `processContactClick_PendingScout_ThrowsAccessDeniedException`: Valida que scouts pendientes de aprobación sean rechazados con HTTP 403.
   * `processContactClick_NoConsent_ThrowsIllegalStateException`: Valida que si el representante no tiene consentimiento activo, se deniegue el contacto.
   * `getRadarMetricsForTutor_AggregatesCountsAndBuildsFeed`: Valida el cálculo de contadores totales y el armado cronológico de interacciones de veedores.

2. **`ScoutContactControllerIntegrationTest` (3/3 Pasadas):**
   * `contactClick_ApprovedScout_Returns200AndWhatsAppUrl`: Valida el endpoint `POST /api/v1/scouts/contact-click` con autenticación JWT de veedor aprobado.
   * `contactClick_PendingScout_Returns403Forbidden`: Valida bloqueo de seguridad para veedores no verificados.
   * `getTutorRadarMetrics_AuthenticatedTutor_Returns200AndMetrics`: Valida el endpoint `GET /api/v1/athletes/radar` retornando métricas y feed del radar.

3. **`ScoutDirectoryIntegrationTest` (8/8 Pasadas):**
   * Valida compatibilidad y desempeño del directorio (< 100ms en búsquedas filtradas complejas con índices PostgreSQL).

### 2.2. Frontend Build & Static Generation

Comando ejecutado:
```bash
cd talentus-scout-fe && npm run build
```

#### Resultado:
* Compilación exitosa (`Application bundle generation complete` con 0 errores).
* Generación de bundles de navegador y servidor para Angular SSR.
* Prerenderizado de 6 rutas estáticas completado satisfactoriamente.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Pruebas de Endpoints con cURL

#### Paso 1: Inicio de Sesión de Veedor Aprobado
```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "scout.aprobado@deportivomiranda.com",
    "password": "Password123!"
  }' | jq .
```
*Respuesta esperada:* Token JWT emitido para usuario con rol `ROLE_SCOUT`.

#### Paso 2: Solicitud de Clic de Contacto Seguro WhatsApp
```bash
curl -s -X POST http://localhost:8080/api/v1/scouts/contact-click \
  -H "Authorization: Bearer <TOKEN_SCOUT>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "37dba76d-c28d-4164-a01d-09d2e1f38878"
  }' | jq .
```
*Respuesta esperada (HTTP 200 OK):*
```json
{
  "whatsAppUrl": "https://wa.me/584129998877?text=Hola%20Carlos%20Mendoza%2C%20soy%20Alejandro%20Cichero%20%28Scout%20en%20Deportivo%20Miranda%29...",
  "cleanPhoneNumber": "584129998877",
  "tutorFullName": "Carlos Mendoza",
  "relationshipToMinor": "PADRE",
  "logged": true
}
```

#### Paso 3: Registro de Vista de Perfil por Veedor
```bash
curl -s -X POST http://localhost:8080/api/v1/scouts/log-view \
  -H "Authorization: Bearer <TOKEN_SCOUT>" \
  -H "Content-Type: application/json" \
  -d '{
    "athleteId": "37dba76d-c28d-4164-a01d-09d2e1f38878"
  }' | jq .
```
*Respuesta esperada (HTTP 200 OK):* `{"logged": true}`.

#### Paso 4: Consulta del Radar de Visualizaciones por el Tutor
```bash
curl -s -X GET http://localhost:8080/api/v1/athletes/radar \
  -H "Authorization: Bearer <TOKEN_TUTOR>" | jq .
```
*Respuesta esperada (HTTP 200 OK):*
```json
{
  "totalSearchAppearances": 14,
  "totalProfileViews": 8,
  "totalWhatsAppContacts": 3,
  "athleteMetrics": [
    {
      "athleteId": "37dba76d-c28d-4164-a01d-09d2e1f38878",
      "athleteFullName": "Santiago Mendoza",
      "searchAppearances": 14,
      "profileViews": 8,
      "whatsAppContacts": 3
    }
  ],
  "recentScoutInteractions": [
    {
      "scoutFullName": "Alejandro Cichero",
      "organization": "Deportivo Miranda",
      "scoutBadge": "APPROVED",
      "actionType": "WHATSAPP_CONTACT",
      "athleteFullName": "Santiago Mendoza",
      "timestamp": "2026-10-09T09:58:09.614Z"
    }
  ]
}
```

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia / Implementación |
| :--- | :---: | :--- |
| **Contacto Únicamente al Representante Legal** | Cumplido | El número del menor nunca se expone; el número del tutor legal es el único destino del enlace de WhatsApp. |
| **Sanitización de Teléfono Internacional** | Cumplido | Formato `wa.me/{clean_phone}` sin caracteres especiales (`+`, espacios, guiones). |
| **Mensaje Prediseñado de Cortesía** | Cumplido | Incluye nombre del scout, club/agencia, nombre del atleta y enlace al perfil oficial. |
| **Auditoría Estricta de Contactos y Vistas** | Cumplido | Toda interacción persiste en `scout_activity_logs` con IP, fecha y usuario. |
| **Radar de Telemetría para el Tutor** | Cumplido | Endpoint `/api/v1/athletes/radar` y widget Bento Grid en el dashboard del tutor. |
| **Cero uso de 'LOPNNA' en Botones y Labels** | Cumplido | Verificación exhaustiva: los botones indican "Contactar Representante" / "Contactar Tutor", badges indican "Protección al Menor" y "Representante Legal". |
| **Modelado Lombok Completo en Backend** | Cumplido | Todas las entidades y DTOs aplican `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`. |
| **Pruebas Automatizadas >80% Cobertura** | Cumplido | Pruebas unitarias e integración en verde (`ScoutContactServiceTest`, `ScoutContactControllerIntegrationTest`). |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Veedor No Aprobado / Pendiente:**
   * Al intentar accionar el botón de WhatsApp o invocar `/api/v1/scouts/contact-click`, el backend lanza `AccessDeniedException` (HTTP 403 Forbidden).
2. **Atleta sin Consentimiento Legal Activo:**
   * Si el tutor no ha activado el consentimiento o éste fue revocado, la API bloquea el contacto seguro garantizando la protección del menor.
3. **Múltiples Atletas por Representante:**
   * El radar agrega métricas consolidadas del hogar y métricas discriminadas por cada hijo o atleta bajo tutela.
4. **Protección Anti-Scraping de Datos Telefónicos:**
   * El scout nunca recibe el teléfono en crudo en las listas o búsquedas generales; únicamente se le abre el canal mediante la acción explícita de contacto registrado en auditoría.
