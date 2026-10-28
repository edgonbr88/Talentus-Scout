# Plan de Implementación — [TS-42] Portal y Flujo de Registro de Scouts en Frontend (Formulario con Credenciales, Landing Page, Navbar y Vista de Auditoría Pendiente)

## 1. Identificación de la Tarea
* **ID:** `TS-42`
* **Título:** Portal y Flujo de Registro de Scouts en Frontend (Formulario con Credenciales, Landing Page, Navbar y Vista de Auditoría Pendiente)
* **Trello Card:** [https://trello.com/c/341HlE9G](https://trello.com/c/341HlE9G) (ID: `6acfafde2819c8438db8561b`)
* **Sprint:** Sprint 3
* **Estado Actual:** `in development`
* **Dependencias:** `TS-11` (Registro y Storage de Scouts en Backend), `TS-14` (Panel de Auditoría de Scouts), `TS-34` (Patrón de validaciones visuales reactivas)

---

## 2. Resumen y Contexto de Negocio
Los cazatalentos, directores deportivos, agentes FIFA y analistas de clubes profesionales requieren un canal institucional intuitivo, transparente y seguro para solicitar su acreditación oficial como veedores en Talentus Scout.

Si bien el backend ya cuenta con el endpoint multipart seguro `POST /api/v1/auth/register-scout` (implementado en `TS-11`) y el módulo administrativo de aprobación (implementado en `TS-12`), el frontend no disponía de la interfaz de registro, de los puntos de acceso de captación en la Landing Page / Navbar / Login, ni de la pantalla informativa que explica al postulante el estado de su auditoría y los plazos de revisión deportiva.

### Marco Legal y Salvaguarda del Menor (LOPNNA / FIFA)
* **LOPNNA Art. 65 & Salvaguarda FIFA:** Ningún usuario registrado con rol `SCOUT` tendrá acceso al Directorio de Atletas menores de edad (`/scout/directory`) ni a sus datos biométricos y de contacto mientras su perfil permanezca en estado `PENDING_VERIFICATION` / `PENDING`.
* **Aviso Legal Visible en Formulario:** El formulario de registro debe advertir expresamente que Talentus Scout realiza una auditoría rigurosa de identidad y legitimidad deportiva previa a habilitar cualquier visualización de talento juvenil.
* **Transparencia en el Proceso:** Tras consignar su solicitud y documento probatorio, el scout es guiado a una pantalla de confirmación (`/auth/scout-pending-audit`) donde se clarifica que el proceso toma entre 24 y 48 horas hábiles, detallando qué criterios evalúa el comité de admisiones.

---

## 3. Arquitectura y Modelo de Datos

### 3.1 Base de Datos (PostgreSQL / Neon)
* No requiere modificaciones DDL. Las tablas `users` y `scout_profiles` con sus enums correspondientes (`UserRole.SCOUT`, `AccountStatus.PENDING_VERIFICATION`, `ScoutVerificationStatus.PENDING`) ya están operativas en producción.

### 3.2 Almacenamiento de Credenciales
* El documento de credencial física (PDF, PNG, JPG de hasta 10MB) es almacenado por el backend en el directorio seguro `uploads/credentials/` a través de `LocalFileStorageService`.

---

## 4. Backend: Spring Boot 3 (Java 21) — Estado y Contratos Operativos
El backend ya cuenta con la infraestructura lista y testeada (`AuthScoutRegistrationTest.java`). Se detalla el contrato exacto para integración frontend:

* **Endpoint:** `POST /api/v1/auth/register-scout`
* **Content-Type:** `multipart/form-data`
* **Campos del FormData (`RegisterScoutRequest`):**
  - `fullName`: String (Obligatorio, máx. 150 caracteres).
  - `email`: String (Obligatorio, formato email válido, máx. 255 caracteres).
  - `password`: String (Obligatorio, mín. 8 caracteres, máx. 100 caracteres).
  - `phoneNumber`: String (Obligatorio, regex `^\+[1-9]\d{7,14}$`).
  - `organizationName`: String (Obligatorio, máx. 150 caracteres).
  - `scoutRole`: String (Obligatorio, máx. 100 caracteres; ej: 'Reclutador Oficial', 'Director Deportivo', 'Agente FIFA', 'Entrenador', 'Analista de Rendimiento').
  - `linkedinUrl`: String (Opcional, máx. 255 caracteres).
  - `credentialsFile`: MultipartFile (Obligatorio, archivo en PDF, PNG o JPG de hasta 10MB).
* **Respuestas HTTP:**
  - `201 CREATED`: Retorna `RegisterScoutResponse` con token JWT temporal, perfil creado y estados `AccountStatus.PENDING_VERIFICATION` y `ScoutVerificationStatus.PENDING`.
  - `400 BAD REQUEST`: Errores de validación en los campos o formato inválido.
  - `409 CONFLICT`: Error si el correo electrónico ya se encuentra registrado.

---

## 5. Frontend: Angular 18+ (Standalone, SSR y Directivas de Diseño)

### 5.1 Directivas de Diseño (`fe-desing.md` / `frontend-design`)
1. **Identidad Atlética y Profesional:** Evitar templates genéricos tipo SaaS y paletas genéricas. Utilizar la atmósfera nocturna de estadio de Talentus Scout:
   - Fondo de página: `#0a0e17` / `#0b0f19` con sutiles destellos de iluminación de campo de juego.
   - Tarjetas de superficie: `#111827` con bordes nítidos `#1f293d` y acento esmeralda deportivo `#10b981` / cian radar `#38bdf8`.
   - Tipografía: Sin All-Caps estridentes innecesarios; jerarquía tipográfica limpia, números legibles y redacción sobria y respetuosa.
2. **Separación Obligatoria de Plantillas:** Prohibido el uso de `template: \`...\`` inline. Se exige estrictamente el desglose modular en archivos independientes:
   - `register-scout.component.ts` con `templateUrl: './register-scout.component.html'` y `styleUrl: './register-scout.component.css'`.
   - `scout-pending-audit.component.ts` con `templateUrl: './scout-pending-audit.component.html'` y `styleUrl: './scout-pending-audit.component.css'`.

### 5.2 Modelos de TypeScript (`src/app/core/models/auth.model.ts`)
Agregar interfaces para tipado estricto:

```typescript
export interface RegisterScoutRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  organizationName: string;
  scoutRole: string;
  linkedinUrl?: string;
  credentialsFile: File;
}

export interface RegisterScoutResponse {
  scoutProfileId: string;
  userId: string;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  role: UserRole;
  accountStatus: UserStatus;
  verificationStatus: ScoutVerificationStatus;
  email: string;
  fullName: string;
  organizationName: string;
  scoutRole: string;
  credentialsDocumentUrl?: string;
  message?: string;
}
```

### 5.3 Servicio de Autenticación (`src/app/core/auth/auth.service.ts`)
Incorporar el método de registro de scout consumiendo el endpoint multipart:

```typescript
registerScout(data: FormData): Observable<RegisterScoutResponse> {
  return this.http.post<RegisterScoutResponse>('/api/v1/auth/register-scout', data);
}
```

### 5.4 Componente de Registro de Scouts (`src/app/features/auth/register-scout/`)
* **Ubicación:** `src/app/features/auth/register-scout/`
* **Archivos:**
  - `register-scout.component.ts`
  - `register-scout.component.html`
  - `register-scout.component.css`
  - `register-scout.component.spec.ts`
* **Formulario Reactivo:**
  - `fullName`: `['', [Validators.required, Validators.maxLength(150)]]`
  - `email`: `['', [Validators.required, Validators.email, Validators.maxLength(255)]]`
  - `password`: `['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]]`
  - `phoneNumber`: `['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]]`
  - `organizationName`: `['', [Validators.required, Validators.maxLength(150)]]`
  - `scoutRole`: `['', [Validators.required, Validators.maxLength(100)]]`
    - Opciones en selector: `Reclutador Oficial`, `Director Deportivo`, `Agente FIFA`, `Entrenador Principal`, `Analista de Rendimiento`, `Otro (especificar)`.
  - `linkedinUrl`: `['', [Validators.maxLength(255)]]`
  - `acceptTerms`: `[false, [Validators.requiredTrue]]`
* **Zona de Dropzone y Selector de Credenciales:**
  - Soporte Drag-and-Drop y click selector.
  - Formatos aceptados: `.pdf, .png, .jpg, .jpeg` (hasta 10MB).
  - Previsualización del archivo cargado (nombre del archivo, tamaño en MB, icono de archivo o imagen).
  - Botón para remover archivo y volver a cargar.
  - Validación reactiva con mensaje de error en rojo si se intenta enviar sin credencial física o si el archivo supera los 10MB.
* **Manejo de Errores y Feedback:**
  - Indicador de carga animado en el botón de acción ("Procesando postulación...").
  - Si el servidor responde `409 Conflict`: Banner rojo informativo indicando que el correo ya está registrado con enlace directo a `/login`.
  - Si responde `400 Bad Request`: Mensaje legible con el motivo del rechazo.
* **Redirección:**
  - Al completar con éxito, redirigir a `/auth/scout-pending-audit` pasando parámetros de contexto opcionales (email u organización).

### 5.5 Componente de Auditoría Pendiente (`src/app/features/auth/scout-pending-audit/`)
* **Ubicación:** `src/app/features/auth/scout-pending-audit/`
* **Archivos:**
  - `scout-pending-audit.component.ts`
  - `scout-pending-audit.component.html`
  - `scout-pending-audit.component.css`
  - `scout-pending-audit.component.spec.ts`
* **Contenido Visual y Estructura:**
  - Badge institucional: `SOLICITUD EN PROCESO DE AUDITORÍA`.
  - Encabezado: "Acreditación Deportiva en Evaluación".
  - Mensaje explicativo: En resguardo de la privacidad de los atletas juveniles y en cumplimiento con la normativa legal LOPNNA Art. 65 y lineamientos FIFA, cada solicitud de scout es auditada individualmente por nuestro comité de admisiones.
  - Timeline/Cards de proceso:
    1. **Paso 1: Solicitud Consignada (Completado):** Datos y credenciales recibidos.
    2. **Paso 2: Validación de Filiación y Antecedentes (En curso):** Verificación de club, federación o agencia deportiva (Plazo estimado: 24 a 48 horas hábiles).
    3. **Paso 3: Notificación y Activación:** Recibirás un correo oficial una vez aprobado para ingresar al Directorio de Talentos.
  - Botones de acción:
    - "Iniciar Sesión" (`routerLink="/login"`).
    - "Volver a la Página Principal" (`routerLink="/"`).

### 5.6 Configuración de Rutas (`src/app/app.routes.ts`)
Registrar las dos nuevas rutas con carga perezosa (`loadComponent`):
```typescript
{
  path: 'register-scout',
  loadComponent: () => import('./features/auth/register-scout/register-scout.component').then(m => m.RegisterScoutComponent),
  title: 'Registro y Acreditación de Scouts — Talentus Scout'
},
{
  path: 'auth/scout-pending-audit',
  loadComponent: () => import('./features/auth/scout-pending-audit/scout-pending-audit.component').then(m => m.ScoutPendingAuditComponent),
  title: 'Solicitud de Scout en Auditoría — Talentus Scout'
}
```

### 5.7 Puntos de Acceso en la Interfaz (Touchpoints)
1. **Landing Page (`src/app/features/landing/landing.component.html`):**
   - **Hero Section:** Añadir botón de acción secundario/terciario junto a los existentes: `"Acceso para Scouts y Clubes"` con `routerLink="/register-scout"`.
   - **Bento Grid / Banner Scouts:** Agregar tarjeta Bento o banner de llamado a la acción específicamente diseñado para directores deportivos y scouts profesionales: "Red de Captación y Visoría Oficial — Solicita tu acreditación como veedor autorizado".
2. **Navbar Global (`src/app/shared/components/navbar/navbar.component.html`):**
   - Para usuarios no autenticados, agregar enlace de acceso rápido: `"¿Eres Scout?"` con `routerLink="/register-scout"`.
3. **Página de Login (`src/app/features/auth/login/login.component.html`):**
   - En la sección inferior (`auth-footer`), incorporar el enlace secundario: `"¿Eres cazatalentos o club federado? Solicita tu acreditación de Scout aquí"` con `routerLink="/register-scout"`.

---

## 6. Plan de Pruebas y Validación

### 6.1 Pruebas Unitarias Frontend (Jasmine/Karma)
1. `register-scout.component.spec.ts`:
   - Inicialización correcta del formulario con controles vacíos e inválidos.
   - Validación de formato de teléfono internacional (`+58...`).
   - Validación de archivo obligatorio y restricción de tamaño (bloquear > 10MB).
   - Simulación de envío exitoso: verifica llamada a `AuthService.registerScout` con `FormData` y redirección a `/auth/scout-pending-audit`.
   - Manejo de error 409 (correo existente): visualización del banner de error y sugerencia de login.
2. `scout-pending-audit.component.spec.ts`:
   - Renderizado correcto del mensaje informativo, plazos de auditoría (24-48h) y botones de navegación.

### 6.2 Verificación Manual de Flujo Completo
1. Navegación desde la Landing Page (Hero, Banner), Navbar y Login hacia `/register-scout`.
2. Completar formulario con credencial física y enviar solicitud.
3. Verificar la llegada a `/auth/scout-pending-audit`.
4. Verificar en base de datos la creación del usuario con rol `SCOUT`, estatus `PENDING_VERIFICATION` y perfil con `PENDING`.
5. Intentar navegar directamente a `/scout/directory` con dicho usuario y confirmar que el `scoutGuard` bloquea el acceso redirigiendo adecuadamente.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] **Paso 1:** Actualizar `src/app/core/models/auth.model.ts` con `RegisterScoutRequest` y `RegisterScoutResponse`.
- [x] **Paso 2:** Incorporar método `registerScout(data: FormData)` en `src/app/core/auth/auth.service.ts`.
- [x] **Paso 3:** Crear componente `src/app/features/auth/register-scout/` con archivos `.component.ts`, `.component.html`, `.component.css` y `.component.spec.ts`.
- [x] **Paso 4:** Crear componente `src/app/features/auth/scout-pending-audit/` con archivos `.component.ts`, `.component.html`, `.component.css` y `.component.spec.ts`.
- [x] **Paso 5:** Registrar rutas `/register-scout` y `/auth/scout-pending-audit` en `src/app/app.routes.ts`.
- [x] **Paso 6:** Integrar puntos de acceso en `src/app/features/landing/landing.component.html` (botón en Hero y tarjeta Bento / banner de scouts).
- [x] **Paso 7:** Añadir enlace "¿Eres Scout?" en `src/app/shared/components/navbar/navbar.component.html`.
- [x] **Paso 8:** Añadir enlace de solicitud de acreditación en `src/app/features/auth/login/login.component.html`.
- [x] **Paso 9:** Ejecutar suite de pruebas unitarias (`npm test -- --watch=false` o comandos correspondientes de Angular) y validar compilación (`npx ng build`).
- [x] **Paso 10:** Documentar resultados en `test/TS-42-test-plan-portal-flujo-registro-scouts-frontend.md`.
- [x] **Paso 11:** Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] La ruta `/register-scout` es accesible desde Hero, banner de captación, Navbar superior y pie de Login.
- [x] El formulario valida en tiempo real con alertas en rojo para campos obligatorios, formato de email, longitud mínima de clave (8 caracteres), formato internacional de teléfono y archivo de credenciales.
- [x] La zona de carga de credenciales soporta PDF, PNG y JPG de hasta 10MB, con visualización de nombre, tamaño y botón de remoción.
- [x] El envío genera una petición multipart contra `/api/v1/auth/register-scout` y tras el éxito redirige inmediatamente a `/auth/scout-pending-audit`.
- [x] La pantalla de auditoría pendiente detalla con claridad el marco legal de protección al menor (LOPNNA / FIFA) y el plazo de evaluación (24 a 48 horas).
- [x] Los usuarios en auditoría pendiente son bloqueados por `scoutGuard` si intentan acceder al Directorio de Atletas antes de ser aprobados.
- [x] En caso de email duplicado (409), el formulario informa claramente al usuario y ofrece enlace a Iniciar Sesión.
- [x] Pruebas unitarias en verde y compilación exitosa sin advertencias críticas.

