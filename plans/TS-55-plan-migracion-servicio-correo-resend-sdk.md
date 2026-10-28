# Plan de Implementación — [TS-55] Migración de Servicio de Correo Transaccional de SMTP a Resend SDK (Java API REST)

## 1. Identificación de la Tarea
* **ID:** `TS-55`
* **Título:** Migración de Servicio de Correo Transaccional de SMTP a Resend SDK (Java API REST)
* **Tarjeta Trello:** [https://trello.com/c/vXOeh7wN](https://trello.com/c/vXOeh7wN) (ID: `6acc1d58bfc10e8f781eb0bf`)
* **Sprint:** Sprint 4 (Go-Live / Infraestructura)
* **Estado Actual:** `in development`
* **Agente Planificador:** `trello_planner`
* **Dependencias:** `TS-03` (Backend Spring Boot inicial), `TS-21` (Verificación de correo LOPNNA), `TS-43` (Notificaciones transaccionales).

---

## 2. Resumen y Contexto de Negocio

### 2.1 Justificación del Requerimiento y Valor Aportado
El sistema de notificaciones transaccionales de Talentus Scout es un pilar crítico para la comunicación oportuna y verificable con tutores legales, atletas, veedores deportivos (scouts) y administradores. 

La implementación previa basada en **SMTP tradicional** (`JavaMailSender` sobre puertos 587 o 465) presenta vulnerabilidades e ineficiencias severas en entornos serverless modernos como **Google Cloud Run**:
1. **Bloqueos y Restricciones de Red:** Muchos proveedores de nube pública limitan o cierran el tráfico saliente en puertos SMTP tradicionales (25, 465, 587) para prevenir spam, ocasionando timeouts de conexión (`SocketTimeoutException`).
2. **Latencia y Bloqueo de Hilos:** Las negociaciones TLS y handshakes SMTP son síncronos y lentos (2 a 5 segundos por correo), consumiendo valiosos recursos de CPU en instancias efímeras.
3. **Entregabilidad y Caída en SPAM:** Las cuentas SMTP genéricas carecen de reputación de IP dedicada, trazabilidad de rebotes y firma DKIM alineada con el dominio institucional `talentusscout.com`.

La migración al **SDK Oficial de Resend** (`com.resend:resend-java`) resuelve estos problemas de raíz al despachar todas las peticiones a través de la **API REST oficial de Resend sobre HTTPS (puerto 443 estándar)**, ofreciendo:
* Envío ultra-rápido en sub-segundos sin riesgos de bloqueo de puertos en Cloud Run.
* Trazabilidad completa con identificador único (`resend_id`) por cada correo enviado.
* Entregabilidad de clase mundial con soporte para DKIM y SPF en `talentusscout.com`.
* Modo mock transparente para desarrollo local sin costo ni consumo de cuota mensual.

### 2.2 Salvaguarda de Menores y Consideraciones Legales (LOPNNA Art. 65 / FIFA)
Los correos transaccionales procesan información altamente sensible: verificación de identidad de representantes legales, notificaciones de patria potestad, solicitudes de certificación de menores de edad y acreditación de veedores. El transporte cifrado mediante TLS 1.3 sobre HTTPS de la API de Resend asegura la confidencialidad de los datos biométricos y legales del menor en tránsito, previniendo intercepciones no autorizadas.

---

## 3. Arquitectura y Modelo de Datos

### 3.1 Base de Datos (PostgreSQL / Neon)
* **Impacto DDL:** Cero (0) cambios en tablas o migraciones dbmate.
* El despacho de correos es un servicio de infraestructura y comunicación sin estado persistido en base de datos.

---

## 4. Especificación Backend: Spring Boot 3 (Java 21)

### 4.1 Dependencias en `talentus-scout-be/pom.xml`
1. **Agregar Resend Java SDK:**
   ```xml
   <!-- Resend SDK Oficial: Envío transaccional vía HTTP REST API (Puerto 443) -->
   <dependency>
       <groupId>com.resend</groupId>
       <artifactId>resend-java</artifactId>
       <version>3.1.0</version>
   </dependency>
   ```
2. **Deprecar `spring-boot-starter-mail`:**
   * Retirar la dependencia `org.springframework.boot:spring-boot-starter-mail` de `pom.xml`, eliminando librerías heredadas de JavaMail (Angus Mail, Jakarta Mail) y reduciendo el tamaño del artefacto `.jar`.

### 4.2 Configuración y Propiedades de Entorno
* **En `talentus-scout-be/src/main/resources/application.yml`:**
  Retirar el bloque `spring.mail.*` y actualizar `talentus.mail`:
  ```yaml
  talentus:
    mail:
      enabled: ${MAIL_ENABLED:false}
      from: ${MAIL_FROM:contacto@talentusscout.com}
      api-key: ${RESEND_API_KEY:}
      branding:
        logo-url: ${TALENTUS_MAIL_LOGO_URL:https://i.imgur.com/9j8oQ2B.png}
  ```
* **En `talentus-scout-be/src/main/resources/application-prod.yml`:**
  Asegurar la configuración de producción:
  ```yaml
  talentus:
    mail:
      enabled: ${MAIL_ENABLED:true}
      from: ${MAIL_FROM:contacto@talentusscout.com}
      api-key: ${RESEND_API_KEY}
  ```

### 4.3 Nueva Clase de Configuración: `ResendConfig.java`
* **Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/config/ResendConfig.java`
* **Responsabilidad:** Instanciar el cliente `Resend` de forma resiliente. Si `RESEND_API_KEY` no está configurada (ej. en desarrollo local o tests), el bean se inicializa como `null` sin fallar el arranque de Spring Boot:
  ```java
  package com.talentus.scout.config;

  import com.resend.Resend;
  import lombok.extern.slf4j.Slf4j;
  import org.springframework.beans.factory.annotation.Value;
  import org.springframework.context.annotation.Bean;
  import org.springframework.context.annotation.Configuration;

  @Configuration
  @Slf4j
  public class ResendConfig {

      @Value("${talentus.mail.api-key:}")
      private String apiKey;

      @Bean
      public Resend resendClient() {
          if (apiKey == null || apiKey.trim().isEmpty()) {
              log.warn("RESEND_API_KEY no está configurada. El servicio de correo operará en modo simulador (Mock).");
              return null;
          }
          log.info("Cliente Resend inicializado exitosamente para envíos transaccionales.");
          return new Resend(apiKey.trim());
      }
  }
  ```
* **Eliminación:** Eliminar `talentus-scout-be/src/main/java/com/talentus/scout/config/MailConfig.java` (el cual configuraba `JavaMailSenderImpl` para SMTP).

### 4.4 Refactorización Integral de `EmailService.java`
* **Ubicación:** `talentus-scout-be/src/main/java/com/talentus/scout/service/mail/EmailService.java`
* **Anotaciones y Atributos:**
  ```java
  @Service
  @Slf4j
  public class EmailService {

      @Autowired(required = false)
      private Resend resend;

      @Value("${talentus.mail.enabled:false}")
      private boolean mailEnabled;

      @Value("${talentus.mail.from:contacto@talentusscout.com}")
      private String mailFrom;

      @Value("${talentus.mail.api-key:}")
      private String apiKey;

      @Value("${talentus.mail.branding.logo-url:https://i.imgur.com/9j8oQ2B.png}")
      private String brandingLogoUrl;

      private String certificationInviteTemplate;
      private String emailVerificationTemplate;
  ```
* **Método Centralizado de Despacho (`dispatchEmail`):**
  Para evitar código repetitivo y garantizar manejo uniforme de errores y logging:
  ```java
  private boolean dispatchEmail(String toEmail, String subject, String htmlBody, String mockDetails) {
      if (!mailEnabled || resend == null || apiKey == null || apiKey.trim().isEmpty()) {
          log.info("""
                  \n===================== [MOCK EMAIL SERVICE — RESEND] =====================
                  Para: {}
                  Asunto: {}
                  Remitente: {}
                  {}
                  =========================================================================""",
                  toEmail, subject, mailFrom, mockDetails);
          return true;
      }

      try {
          CreateEmailOptions params = CreateEmailOptions.builder()
                  .from(mailFrom)
                  .to(toEmail)
                  .subject(subject)
                  .html(htmlBody)
                  .build();

          CreateEmailResponse response = resend.emails().send(params);
          String resendId = response != null ? response.getId() : "DESCONOCIDO";
          log.info("Correo '{}' enviado exitosamente a {} vía Resend API. Resend ID: {}", subject, toEmail, resendId);
          return true;
      } catch (Exception e) {
          log.error("Fallo al enviar correo '{}' a {} vía Resend API: {}", subject, toEmail, e.getMessage(), e);
          return false;
      }
  }
  ```
* **Adaptación de los 6 Métodos de Negocio:**
  Cada uno de los métodos públicos construirá su `subject` y `htmlBody` (con plantillas o snippets estilizados con identidad oficial) y delegará en `dispatchEmail`:
  1. `sendEmailVerification(toEmail, recipientName, verificationLink)`
  2. `sendCertificationInvite(toEmail, recipientName, athleteName, tutorName, badgeTypeLabel, badgeTitle, certificationLink, expirationDays)`
  3. `sendPaymentStatusNotification(toEmail, tutorName, athleteName, planName, approved, reason)`
  4. `sendLegalVerificationResolutionNotification(toEmail, tutorName, athleteName, approved, reason)`
  5. `sendScoutVerificationResolutionNotification(toEmail, scoutName, approved, reason)`
  6. `sendBadgeCertificationResolutionNotification(toEmail, tutorName, athleteName, badgeTitle, badgeTypeLabel, approved, reason)`

---

## 5. Especificación Frontend: Angular 18+

* **Impacto en Frontend:** Cero (0) modificaciones requeridas en componentes de UI o servicios HTTP de Angular.
* Todas las acciones de registro, pagos, auditoría y certificación continúan consumiendo los endpoints REST existentes en `/api/v1/...`, los cuales despachan correos de forma desacoplada y transparente en el backend.

---

## 6. Pruebas y Validación

### 6.1 Pruebas Unitarias (`EmailServiceTest.java`)
* **Ubicación:** `talentus-scout-be/src/test/java/com/talentus/scout/service/mail/EmailServiceTest.java`
* **Casos de Prueba:**
  1. `testTemplatesContainOfficialLogo()`: Valida carga de templates y URL del logo.
  2. `testSendEmailVerificationMock()`: Valida que con `mailEnabled=false` retorna `true` y emite log mock sin lanzar excepciones.
  3. `testSendCertificationInviteMock()`: Valida despacho simulado de invitación de certificación.
  4. `testSendPaymentStatusNotificationMock()`: Valida ramas de pago aprobado y rechazado.
  5. `testSendLegalVerificationResolutionNotificationMock()`: Valida notificaciones de patria potestad.
  6. `testSendScoutVerificationResolutionNotificationMock()`: Valida notificaciones de acreditación de scouts.
  7. `testSendBadgeCertificationResolutionNotificationMock()`: Valida resolución de insignias.
  8. `testDispatchEmailRealSuccessWithMockedResend()`: Utiliza Mockito para simular el cliente `Resend` y `resend.emails().send(...)`, verificando que con `mailEnabled=true` y `apiKey="re_test"` se llama a la API y se captura el `id` de respuesta.
  9. `testDispatchEmailHandlesResendException()`: Simula una excepción de Resend (HTTP 401/422) y valida que `EmailService` captura el error, registra el log y retorna `false` de forma elegante sin propagar `NullPointerException` ni romper el hilo HTTP del controlador.

### 6.2 Comandos de Validación
```bash
# Ejecución de la suite completa de pruebas unitarias
./mvnw clean test -Dtest=EmailServiceTest
./mvnw test
```

---

## 7. Checklist de Implementación Paso a Paso (Para `trello_implementer`)

- [x] **Paso 1:** Actualizar `talentus-scout-be/pom.xml`:
  - Agregar dependencia `com.resend:resend-java:3.1.0`.
  - Remover `spring-boot-starter-mail`.
- [x] **Paso 2:** Modificar `talentus-scout-be/src/main/resources/application.yml` y `application-prod.yml`:
  - Retirar bloque `spring.mail.*`.
  - Configurar `talentus.mail.api-key: ${RESEND_API_KEY:}` y `from: ${MAIL_FROM:contacto@talentusscout.com}`.
- [x] **Paso 3:** Eliminar `talentus-scout-be/src/main/java/com/talentus/scout/config/MailConfig.java`.
- [x] **Paso 4:** Crear `talentus-scout-be/src/main/java/com/talentus/scout/config/ResendConfig.java` para instanciar el bean `Resend`.
- [x] **Paso 5:** Refactorizar `talentus-scout-be/src/main/java/com/talentus/scout/service/mail/EmailService.java`:
  - Inyectar `@Autowired(required = false) private Resend resend`.
  - Implementar método centralizado `dispatchEmail(...)`.
  - Conectar los 6 métodos de notificación a `dispatchEmail`.
- [x] **Paso 6:** Actualizar `talentus-scout-be/src/test/java/com/talentus/scout/service/mail/EmailServiceTest.java` para validar tanto el modo mock como el comportamiento ante el cliente `Resend`.
- [x] **Paso 7:** Ejecutar compilación y pruebas:
  - `./mvnw clean test` para asegurar 100% de tests en verde.
- [x] **Paso 8:** Generar plan de pruebas documentado en `test/TS-55-test-plan-migracion-servicio-correo-resend-sdk.md`.
- [x] **Paso 9:** Mover la tarjeta TS-55 en Trello de `in development` a `in testing` y reportar resultados.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)

1. **Compilación Limpia:** El backend compila con `./mvnw clean compile` utilizando Java 21 sin errores de dependencias.
2. **Envío Vía Resend API:** Todo correo real se despacha mediante HTTP REST API contra `api.resend.com` sobre puerto 443, sin usar conexiones SMTP sockets.
3. **Remitente Institucional:** La dirección remitente configurada por defecto es `contacto@talentusscout.com`.
4. **Modo Mock Funcional:** En ausencia de `RESEND_API_KEY` o con `talentus.mail.enabled=false`, el backend funciona sin fallas en desarrollo local y tests, simulando el envío en consola.
5. **Captura de Resend ID:** Los logs de envío exitoso capturan el `id` asignado por Resend para trazabilidad de entrega.
6. **Pruebas Automatizadas:** La suite de pruebas de `EmailServiceTest` y los tests de servicios dependientes (`CertificationServiceTest`, `AdminScoutServiceTest`, `AdminPaymentServiceTest`) pasan exitosamente al 100%.
