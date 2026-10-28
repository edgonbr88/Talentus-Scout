# Guía de Obtención y Configuración de Client IDs: Google & Microsoft OAuth2

Esta guía detalla paso a paso cómo crear y configurar credenciales oficiales de OAuth 2.0 / OpenID Connect (OIDC) en **Google Cloud Console** y **Microsoft Entra ID (Azure Portal)** para realizar pruebas locales con inicio de sesión y registro directo en **Talentus Scout**.

---

## 1. Obtener Google Client ID (Google Cloud Console)

### Paso 1.1: Crear o Seleccionar un Proyecto
1. Ingresa a la consola de Google Cloud: [https://console.cloud.google.com/](https://console.cloud.google.com/) con tu cuenta de Google.
2. En la barra superior, haz clic en el selector de proyectos y pulsa **"Proyecto nuevo"**.
3. Asigna un nombre (ej. `Talentus-Scout-Dev`) y haz clic en **"Crear"**.

### Paso 1.2: Configurar la Pantalla de Consentimiento OAuth
1. En el menú de navegación lateral, dirígete a **"APIs y servicios"** > **"Pantalla de consentimiento de OAuth"** (OAuth consent screen).
2. Selecciona el tipo de usuario: **"Externo"** (External) y haz clic en **"Crear"**.
3. Completa los datos obligatorios:
   * **Nombre de la aplicación:** `Talentus Scout Local`
   * **Correo electrónico de asistencia al usuario:** Tu correo de Gmail.
   * **Datos de contacto del desarrollador:** Tu correo de Gmail.
4. En la sección **"Permisos" (Scopes)**:
   * Haz clic en **"Agregar o quitar permisos"**.
   * Selecciona los 3 permisos básicos de OpenID Connect:
     * `.../auth/userinfo.email`
     * `.../auth/userinfo.profile`
     * `openid`
   * Haz clic en **"Actualizar"** y luego en **"Guardar y continuar"**.
5. En la sección **"Usuarios de prueba" (Test Users)**:
   > ⚠️ **Muy Importante:** Mientras la aplicación esté en estado *"En prueba"* (Testing), Google solo permitirá autenticar a los correos registrados en esta lista.
   * Haz clic en **"+ Add users"** y añade tu dirección de correo electrónico personal/de prueba con la que harás el login.
   * Haz clic en **"Guardar y continuar"**.

### Paso 1.3: Crear la Credencial OAuth (Client ID)
1. En el menú lateral, dirígete a **"APIs y servicios"** > **"Credenciales"** (Credentials).
2. Haz clic en **"+ Crear credenciales"** > **"ID de cliente de OAuth"**.
3. Selecciona:
   * **Tipo de aplicación:** `Aplicación web` (Web application).
   * **Nombre:** `Talentus Scout Web Local`.
4. En la sección **"Orígenes de JavaScript autorizados"**:
   * Haz clic en **"+ Agregar URI"** y añade:
     * `http://localhost`
     * `http://localhost:80`
     * `http://localhost:4200`
5. En la sección **"URIs de redireccionamiento autorizados"**:
   * Haz clic en **"+ Agregar URI"** y añade:
     * `http://localhost/auth/login`
     * `http://localhost:80/auth/login`
     * `http://localhost:4200/auth/login`
6. Haz clic en **"Crear"**.
7. Se abrirá una ventana emergente: copia el valor de **"ID de cliente"** (Client ID). Tiene un formato como:
   ```text
   123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

---

## 2. Obtener Microsoft Client ID (Microsoft Entra ID / Azure Portal)

### Paso 2.1: Registrar la Aplicación
1. Ingresa a [https://portal.azure.com/](https://portal.azure.com/) o [https://entra.microsoft.com/](https://entra.microsoft.com/) con tu cuenta Microsoft.
2. Busca en la barra superior o en el menú lateral **"Microsoft Entra ID"** (anteriormente Azure Active Directory).
3. En el menú de navegación izquierdo, selecciona **"Registros de aplicaciones"** (App registrations) > **"Nuevo registro"** (New registration).
4. Completa la configuración:
   * **Nombre:** `Talentus Scout Local`
   * **Tipos de cuenta compatibles:** Selecciona la tercera opción:
     * **"Cuentas en cualquier directorio organizativo (cualquier inquilino de Microsoft Entra ID: multiinquilino) y cuentas de Microsoft personales (como Skype, Xbox)"**.
     *(Esto permite que usuarios con cuentas @outlook.com, @hotmail.com o cuentas corporativas puedan iniciar sesión).*
   * **URI de redirección (opcional):**
     * Selecciona la plataforma: **"SPA" (Single-page application)** o **"Web"**.
     * URI: `http://localhost/auth/login`.
5. Haz clic en **"Registrar"** (Register).

### Paso 2.2: Habilitar Emisión de ID Tokens (OpenID Connect)
1. En la página de tu aplicación recién creada, en el menú izquierdo, haz clic en **"Autenticación"** (Authentication).
2. Si no agregaste la URI de redirección antes, pulsa **"Agregar una plataforma"** > **"Aplicación de página única (SPA)"** y coloca `http://localhost/auth/login` (y opcionalmente `http://localhost:4200/auth/login`).
3. Desplázate hacia abajo hasta la sección **"Concesión implícita y flujos híbridos"** (Implicit grant and hybrid flows):
   * ✅ Marca la casilla: **"Tokens de id (se usan para flujos implícitos y flujos híbridos)"** (`ID tokens`).
4. Haz clic en **"Guardar"** (Save).

### Paso 2.3: Copiar el Client ID
1. En el menú izquierdo, haz clic en **"Información general"** (Overview).
2. Copia el valor del campo **"Id. de aplicación (cliente)"** (Application / Client ID). Tiene un formato GUID como:
   ```text
   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

---

## 3. Cómo Usar tus Client IDs en Talentus Scout Local

Tienes dos opciones muy sencillas para configurar tus credenciales en el entorno de desarrollo:

### Opción A: Desde la Interfaz Web (Recomendada y sin recompilar)
1. Abre tu navegador en [http://localhost/auth/login](http://localhost/auth/login) (o [http://localhost/register-tutor](http://localhost/register-tutor)).
2. Haz clic en el botón con el ícono **"⚙️ Configurar Client IDs de OAuth2"** (o directamente en *"Continuar con Google"* / *"Continuar con Microsoft"* si aún no los has configurado).
3. Se abrirá la ventana emergente de configuración:
   * Pega tu **Google Client ID**.
   * Pega tu **Microsoft Client ID**.
4. Pulsa **"Guardar y Continuar"**.
   * Las claves se guardarán en tu almacenamiento local (`localStorage`) y podrás probar el flujo en vivo inmediatamente sin reiniciar contenedores.

### Opción B: Mediante Archivo de Entorno de Angular
Si deseas dejar tus credenciales preconfiguradas en el código fuente para compilaciones posteriores:
1. Abre el archivo [talentus-scout-fe/src/environments/environment.ts](file:///home/edgar/Talentus%20Scout/talentus-scout-fe/src/environments/environment.ts).
2. Añade tus Client IDs:
   ```typescript
   export const environment = {
     production: false,
     apiBaseUrl: '/api/v1',
     googleClientId: 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
     microsoftClientId: 'TU_MICROSOFT_APPLICATION_CLIENT_ID_GUID',
     microsoftRedirectUri: 'http://localhost/auth/login'
   };
   ```
3. Recompila la imagen del frontend con Docker Compose si estás corriendo bajo contenedores:
   ```bash
   docker compose build talentus-scout-fe
   docker compose up -d talentus-scout-fe
   ```

---

## 4. Flujo de Prueba de Autenticación Social

1. **Prueba con Google:**
   * Haz clic en **"Continuar con Google"**.
   * Se abrirá la ventana emergente oficial de Google Accounts.
   * Selecciona tu cuenta de Google (debe estar en la lista de *Test Users* de tu proyecto).
   * Al autorizar, la ventana se cerrará sola y el backend recibirá tu token de identidad real de Google.
   * **Si es un usuario nuevo:** El sistema detectará que requiere completar perfil (`needsProfileCompletion: true`) y te redirigirá a `/auth/complete-profile` para seleccionar rol (Tutor o Scout) y validar el consentimiento legal de menores LOPNNA.
   * **Si el usuario ya existía con ese correo:** Se vinculará de forma transparente y accederás directamente a tu panel de control.

2. **Prueba con Microsoft:**
   * Haz clic en **"Continuar con Microsoft"**.
   * Se abrirá la ventana emergente oficial de Microsoft Login.
   * Ingresa tu correo (@outlook, @hotmail o corporativo) y contraseña.
   * Al otorgar permisos, la ventana retornará el token OIDC y se cerrará automáticamente.
   * El backend procesará los claims oficiales (`oid`, `email`/`preferred_username`, `name`) y habilitará la sesión.
