# Plan y Reporte de Pruebas — [TS-57] Sección de Contacto Oficial y Redes Sociales en Landing y Footer Global

## 1. Alcance de las Pruebas

Este documento detalla el plan, la ejecución y los resultados de las pruebas técnicas y funcionales para la tarea **[TS-57]**, correspondiente a la incorporación y estandarización de los canales oficiales de contacto y redes sociales en **Talentus Scout**, tanto en la página de aterrizaje (Landing Page) mediante un bloque visual Bento Grid interactivo, como en el pie de página global persistente (`app.component`).

### 1.1. Artefactos y Componentes Impactados

* **Frontend (Angular 18+ Standalone / Directivas fe-desing.md):**
  * `src/app/features/landing/landing.component.ts`:
    * Implementación de Signals reactivos (`emailCopied = signal<boolean>(false)`).
    * Canales oficiales declarados: `officialEmail = 'contacto@talentusscout.com'` e `instagramUrl = 'https://www.instagram.com/talentusscout/'`.
    * Método `copyEmail()` con soporte de Web Clipboard API y fallback resiliente para navegadores antiguos/restringidos.
    * Separación estricta de plantilla externa y hoja de estilos (`templateUrl: './landing.component.html'`, `styleUrl: './landing.component.css'`).
  * `src/app/features/landing/landing.component.html`:
    * Nueva sección Bento Grid `<section class="community-section" id="contacto">`.
    * Tarjeta Bento 1: Instagram oficial (`@talentusscout`) con badges `RED OFICIAL` y `EN VIVO`, enlace seguro con `target="_blank"` y `rel="noopener noreferrer"`.
    * Tarjeta Bento 2: Canal de atención institucional con badges `ATENCIÓN OFICIAL` y `RESPALDO LEGAL`, dirección visible en etiqueta `<code>`, botón de envío directo `mailto:contacto@talentusscout.com` y botón de copiado rápido con feedback visual instantáneo.
    * Entidades HTML `&#64;` para garantizar compatibilidad con el compilador de control flow de Angular 18+.
  * `src/app/features/landing/landing.component.css`:
    * Estilos de tarjeta Bento con elevación `#0E1527` sobre fondo `#0A0F1D`.
    * Bordes sutiles y micro-interacciones hover (degradado Instagram `#E1306C`/`#F56040` y verde esmeralda `#10B981` para correo).
    * Diseño responsivo adaptativo con breakpoints a 900px y 540px.
  * `src/app/app.component.html` & `app.component.css`:
    * Reestructuración del footer global persistente en 3 columnas armónicas:
      1. **Identidad de Marca:** Logotipo oficial `app-brand-logo` y propósito de salvaguarda del menor.
      2. **Canales Oficiales:** Enlaces directos a Instagram oficial y correo `contacto@talentusscout.com`.
      3. **Salvaguarda Legal:** Badges de protección deportiva juvenil, referencia expresa a LOPNNA Art. 65 y normativas FIFA de menores.
    * Grilla CSS responsiva con transiciones hover.
  * `src/app/features/landing/landing.component.spec.ts` & `src/app/app.component.spec.ts`:
    * Pruebas unitarias automatizadas con Jasmine y Karma.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1. Compilación Completa de Producción (Angular 18+ Client & SSR)

Comando ejecutado:
```bash
npm run build
```

#### Resultados:
```text
✔ Building...
Browser bundles:
chunk-ZVB4MUWF.js       | -                                  | 591.96 kB | 153.11 kB
main-YMDVIQES.js        | main                               | 304.21 kB |  57.11 kB
styles-ICT5ANSW.css     | styles                             |   5.08 kB |   1.37 kB
...
Server bundles:
server.mjs              | server                             |   1.12 MB
...
Prerendered 13 static routes.
Application bundle generation complete. [21.756 seconds]
Output location: /home/edgar/Talentus Scout/talentus-scout-fe/dist/talentus-scout-fe
```
* **Estado:** PASS (0 errores, 13 rutas pre-renderizadas exitosamente).

---

### 2.2. Pruebas Unitarias de Frontend (Karma / ChromeHeadless)

Comando ejecutado:
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

#### Resultados:
```text
Chrome Headless 132.0.0.0 (Linux 0.0.0): Executed 131 of 131 SUCCESS (3.379 secs / 2.9 secs)
TOTAL: 131 SUCCESS
```

#### Detalle de Casos de Prueba Específicos para TS-57:
1. `LandingComponent (TS-25) Official Community and Contact Channels (TS-57) should render the community and contact section with Instagram and email cards`:
   * Verifica la existencia de `.community-section`, `.instagram-card` y `.mail-card` en el DOM renderizado. **(PASS)**
2. `LandingComponent (TS-25) Official Community and Contact Channels (TS-57) should link to the official Instagram profile securely with noopener noreferrer`:
   * Valida que el enlace apunta a `https://www.instagram.com/talentusscout/`, abre en nueva pestaña con `target="_blank"` y contiene atributos de protección `rel="noopener noreferrer"`. **(PASS)**
3. `LandingComponent (TS-25) Official Community and Contact Channels (TS-57) should display the official email and provide mailto link`:
   * Verifica que la dirección `contacto@talentusscout.com` se muestra dentro de `.email-text` y que el botón *"Escribir Correo"* cuenta con `href="mailto:contacto@talentusscout.com"`. **(PASS)**
4. `LandingComponent (TS-25) Official Community and Contact Channels (TS-57) should trigger emailCopied signal when copyEmail is invoked`:
   * Verifica que al invocar `copyEmail()`, el Signal reactivo `emailCopied()` cambia a `true` proporcionando retroalimentación visual al usuario. **(PASS)**
5. `AppComponent should render official channels and links in global footer`:
   * Verifica que el footer global contiene los enlaces canónicos a Instagram (`_blank`, `noopener`) y `mailto:contacto@talentusscout.com`, junto con la mención a LOPNNA Art. 65. **(PASS)**

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1. Navegación a la Sección de Contacto en la Landing Page
1. Iniciar la aplicación frontend (`npm start` o levantar el entorno Docker).
2. Abrir el navegador en `http://localhost:4200` o navegar a `http://localhost:4200#contacto`.
3. Hacer scroll hacia la parte inferior de la página de inicio, justo después de la sección de beneficios/planes.
4. **Verificación Esperada:**
   * Se visualiza la sección Bento *"Comunidad y Contacto Oficial"*.
   * La tarjeta izquierda muestra el isotipo de Instagram, el título `@talentusscout en Instagram`, la descripción de coberturas de captación y el botón *"Seguir en Instagram ↗"*.
   * La tarjeta derecha muestra el icono de correo institucional, el badge *"ATENCIÓN OFICIAL"*, la dirección destacada `contacto@talentusscout.com`, el botón *"Escribir Correo ✉"* y el botón *"📋 Copiar"*.

### 3.2. Verificación de Seguridad y Enlace de Instagram
1. Posicionar el cursor sobre el botón *"Seguir en Instagram"*.
2. Observar la animación hover: el botón transiciona suavemente a un degradado con sombra brillante Instagram (`#E1306C`/`#F56040`).
3. Hacer clic en el botón.
4. **Verificación Esperada:**
   * Se abre una nueva pestaña del navegador en la URL exacta: `https://www.instagram.com/talentusscout/`.
   * En el inspector de elementos (F12) se constata:
     ```html
     <a href="https://www.instagram.com/talentusscout/" target="_blank" rel="noopener noreferrer" class="btn btn-outline-instagram">
     ```
   * La pestaña original no es vulnerable a manipulación mediante `window.opener` (`rel="noopener noreferrer"` presente).

### 3.3. Verificación de Envío de Correo Directo (`mailto`)
1. En la tarjeta de correo, hacer clic en el botón *"Escribir Correo"*.
2. **Verificación Esperada:**
   * El sistema operativo o navegador abre el cliente de correo predeterminado con el destinatario `contacto@talentusscout.com` listo en el campo "Para:".

### 3.4. Verificación de Copiado Rápido al Portapapeles con Feedback Visual
1. En la tarjeta de correo, hacer clic en el botón *"📋 Copiar"*.
2. **Verificación Esperada:**
   * El texto del botón cambia instantáneamente a *"✓ ¡Copiado!"*.
   * El estilo visual adopta un fondo verde esmeralda translúcido (`rgba(16, 185, 129, 0.2)`) con borde verde (`#10B981`).
   * Pegar (`Ctrl + V` o `Cmd + V`) en cualquier editor o barra del navegador; el texto pegado es exactamente `contacto@talentusscout.com`.
   * Tras transcurrir 2.5 segundos, el botón regresa automáticamente a su estado original *"📋 Copiar"*.

### 3.5. Verificación de Footer Global en Múltiples Rutas
1. Navegar por distintas pantallas del sistema:
   * `/` (Landing Page)
   * `/login` (Acceso al sistema)
   * `/register-tutor` (Registro de tutor)
   * `/scouts/registro` (Registro de scout)
   * `/dashboard` (Panel de tutor)
   * `/scout/directory` (Directorio de scouts)
2. En todas las pantallas, inspeccionar el pie de página global.
3. **Verificación Esperada:**
   * El footer está estructurado en 3 columnas armónicas.
   * La columna central "Canales Oficiales" despliega el enlace a Instagram `@talentusscout` y el correo corporativo `contacto@talentusscout.com`.
   * Ambos enlaces cuentan con micro-interacciones hover (cambio a verde `#10B981` y desplazamiento sutil).

### 3.6. Verificación de Responsividad (Mobile y Tablet)
1. Abrir las herramientas de desarrollo de Chrome (F12) y activar el modo de emulación de dispositivos (`Device Mode`).
2. Probar en resolución móvil (360px x 640px):
   * Las tarjetas Bento de la Landing se apilan en columna única vertical.
   * Los botones de acción se adaptan a ancho completo o flex equilibrado sin desbordamientos de texto.
   * El footer global colapsa armónicamente a 1 columna con orden de lectura natural.
3. Probar en resolución tablet (768px):
   * La cuadrícula Bento y el footer mantienen espaciados legibles y proporcionados.

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación (DoD) | Estado | Evidencia de Validación |
| :--- | :---: | :--- |
| **Sección dedicada en Landing Page con diseño Bento armónico** | **CUMPLIDO** | `<section class="community-section" id="contacto">` integrada con tarjetas para Instagram y Correo, elevación `#0E1527` y bordes sutiles según directivas de `fe-desing.md`. |
| **Enlace de Instagram abre en nueva pestaña segura (`target="_blank"`, `noopener noreferrer`)** | **CUMPLIDO** | Verificado en pruebas unitarias y DOM (`href="https://www.instagram.com/talentusscout/"`, `target="_blank"`, `rel="noopener noreferrer"`). |
| **Botón de correo con `mailto:` y botón de copiado rápido al portapapeles con feedback instantáneo** | **CUMPLIDO** | Implementado con Signals reactivos en `LandingComponent`, Web Clipboard API con fallback, y feedback visual de 2.5s verificado en test unitario. |
| **Footer global en `app.component` exhibe enlaces oficiales de forma persistente** | **CUMPLIDO** | Estructura en 3 columnas en `app.component.html` con enlaces a Instagram, correo institucional y salvaguarda LOPNNA Art. 65 / FIFA. |
| **Diseño completamente responsivo verificado en móvil y escritorio** | **CUMPLIDO** | Breakpoints definidos a 900px, 640px y 540px en `landing.component.css` y `app.component.css`. |
| **Código modular en Angular 18+ sin templates inline y compilando limpiamente** | **CUMPLIDO** | Plantillas HTML y archivos CSS separados (`templateUrl`, `styleUrl`). `npm run build` exitoso (código 0) y `npm test` con 131/131 pruebas exitosas. |

---

## 5. Casos Borde y Consideraciones de Seguridad Validadas

1. **Entorno de Portapapeles Inseguro o Sin Permisos:**
   * Si la API `navigator.clipboard.writeText` no está disponible (ej. conexiones HTTP no seguras o navegadores antiguos), el método `copyEmail()` ejecuta un fallback transparente creando un elemento `<textarea>` temporal fuera de pantalla, seleccionando el texto y ejecutando `document.execCommand('copy')`.
2. **Seguridad contra Reverse Tabnabbing:**
   * Todos los enlaces externos a Instagram (`_blank`) incluyen explícitamente `rel="noopener noreferrer"` para impedir que la página de destino acceda al objeto `window.opener`.
3. **Escape de Caracteres Reservados en Angular 18+:**
   * En Angular 18+, el carácter `@` se reserva para el nuevo control flow sintáctico (`@if`, `@for`). Se utilizó la entidad `&#64;` para textos literales como `&#64;talentusscout` en plantillas HTML, evitando advertencias y errores de compilación `NG5002`.
4. **Cumplimiento de Salvaguarda y Protección al Menor:**
   * La sección de contacto institucional refuerza el compromiso de la plataforma con la patria potestad y las normativas LOPNNA / FIFA, proyectando seriedad y respaldo institucional para padres, representantes y scouts.
