# Plan de Implementación: [TS-39] Banner Global y Checklist Contextual de Visibilidad en Directorio de Scouts para Atletas en Dashboard

## 1. Identificación de la Tarea
* **ID:** `[TS-39]`
* **Título:** Banner Global y Checklist Contextual de Visibilidad en Directorio de Scouts para Atletas en Dashboard
* **Tablero:** Talentus Scout (`https://trello.com/b/rPHiaZJ1/talentus-scout`)
* **ID de la Tarjeta:** `6acc27139f88ff5c18c27f39`
* **Columna Actual:** `in development`
* **Sprint Asignado:** Sprint 3

---

## 2. Resumen y Contexto de Negocio
Para que un atleta menor de edad sea indexado en el Directorio Nacional de Scouts y en los radares de búsqueda de clubes y cazatalentos, debe contar simultáneamente con:
1. Una suscripción activa al **Plan Pro**.
2. Su **documento de identidad oficial consignado** bajo la patria potestad del tutor (LOPNNA Art. 65 / normativa FIFA).

Anteriormente, el dashboard del tutor solo mostraba una insignia estática ("🔒 NO VISIBLE EN DIRECTORIO"), sin explicar las causas ni los pasos a seguir para desbloquear la visibilidad. Este requerimiento añade:
* Un **Banner Global Superior** de alerta en la cabecera del listado cuando existan representados fuera del radar.
* Un **Checklist Contextual Interactivo** dentro de cada tarjeta de atleta no visible, con diagnósticos específicos de cada condición (Plan Pro, Documento de Identidad, y recomendación de video) y botones de acción directa (`⚡ Activar Plan Pro`, `🪪 Consignar Documento`, `📹 Cargar Video`).
* Un **Indicador Positivo** sutil y estilizado para los atletas que ya cumplen con todas las condiciones y se encuentran activos en el directorio.

---

## 3. Arquitectura y Modelo de Datos
* **Base de Datos / DDL:** No requiere modificaciones (el modelo `AthleteSummary` ya expone `subscriptionStatus` y `hasIdentityDocument`).
* **Backend:** No requiere cambios.

---

## 4. Especificación Frontend (Angular 18+ / CSS Bento)

### 4.1 Métodos de Diagnóstico en `tutor-dashboard.component.ts`
Implementar métodos para determinar la visibilidad de los atletas:
```typescript
isAthleteVisible(athlete: AthleteSummary): boolean {
  return athlete.subscriptionStatus === 'ACTIVE' && !!athlete.hasIdentityDocument;
}

hasNonVisibleAthletes(): boolean {
  return this.athletes.length > 0 && this.athletes.some(a => !this.isAthleteVisible(a));
}

getNonVisibleCount(): number {
  return this.athletes.filter(a => !this.isAthleteVisible(a)).length;
}
```

### 4.2 Banner Global Superior (`tutor-dashboard.component.html`)
Ubicado en la tarjeta principal de atletas (`bento-card col-span-12 md-col-8`), justo antes de `.athletes-list`:
```html
<div *ngIf="hasNonVisibleAthletes()" class="global-visibility-alert-banner">
  <div class="alert-banner-header">
    <span class="alert-banner-icon">📡⚠️</span>
    <div class="alert-banner-content">
      <div class="alert-banner-title">
        <strong>Atletas fuera del Directorio Nacional de Scouts</strong>
        <span class="badge-alert-count">{{ getNonVisibleCount() }} PENDIENTE{{ getNonVisibleCount() > 1 ? 'S' : '' }}</span>
      </div>
      <p class="alert-banner-desc">
        Los cazatalentos y clubes federados solo pueden descubrir fichas con Plan Pro activo y comprobante de patria potestad consignado. Revisa los requisitos de tus atletas a continuación para activar su visibilidad.
      </p>
    </div>
  </div>
</div>
```

### 4.3 Checklist Contextual dentro de `.athlete-card` (`tutor-dashboard.component.html`)
Insertado entre `.athlete-header-row` y `.athlete-actions-bar`:
* **Caso 1: No visible (`!isAthleteVisible(athlete)`):**
  Desplegar `.visibility-checklist-card` con:
  - Título: `🔒 Perfil Fuera del Radar de Scouts`
  - Subtítulo: `Los cazatalentos federados no pueden encontrar ni consultar esta ficha en el directorio hasta completar las siguientes condiciones:`
  - Checklist:
    1. **Plan Pro:**
       - Si `athlete.subscriptionStatus === 'ACTIVE'`: `✓ Plan Pro Activo`
       - Si no: `⚠️ Plan Pro Inactivo — Requiere membresía para aparecer en el directorio.` + botón `⚡ Activar Plan Pro` (`openCheckoutModal(athlete)`).
    2. **Documento de Identidad:**
       - Si `athlete.hasIdentityDocument`: `✓ Documento legal consignado conforme a LOPNNA`
       - Si no: `⚠️ Documento Legal Pendiente — Obligatorio para certificar la patria potestad.` + botón `🪪 Consignar Documento` (`openIdentityModal(athlete)`).
    3. **Recomendación Multimedia (Opcional):**
       - Consejo multimedia con botón `📹 Cargar Video` (`openVideoUploaderForAthlete(athlete)`).
* **Caso 2: Visible (`isAthleteVisible(athlete)`):**
  Desplegar `.visibility-status-active`:
  `✓ Ficha activa y visible en el Directorio Nacional de Scouts`

### 4.4 Estilos CSS en `tutor-dashboard.component.ts`
Diseñar con tokens de Bento Grid deportivo:
- `.global-visibility-alert-banner`: Fondo ámbar translúcido (`rgba(245, 158, 11, 0.08)`), borde ámbar (`rgba(245, 158, 11, 0.35)`), bordes redondeados (`12px`), tipografía nítida y botón de conteo.
- `.visibility-checklist-card`: Fondo oscuro contrastado (`rgba(15, 23, 42, 0.7)`), borde sutil (`#1e293b`), padding estructurado, badges de estado verde/ámbar, botones compactos integrados.
- `.visibility-status-active`: Fondo verde sutil (`rgba(16, 185, 129, 0.1)`), borde esmeralda (`1px solid rgba(16, 185, 129, 0.3)`), texto `#34d399`.

---

## 5. Pruebas y Validación

### 5.1 Pruebas Unitarias (`tutor-dashboard.component.spec.ts`)
Suite dedicada `describe('TS-39 Global visibility banner and contextual checklist in tutor dashboard', ...)`:
1. `isAthleteVisible`: retorna `true` cuando `subscriptionStatus === 'ACTIVE'` y `hasIdentityDocument === true`; retorna `false` si cualquiera falta.
2. `hasNonVisibleAthletes`: retorna `true` si al menos un atleta no es visible, `false` si todos son visibles o si no hay atletas.
3. `getNonVisibleCount`: calcula el número exacto de atletas no visibles.
4. Renderizado del banner global `.global-visibility-alert-banner` cuando hay atletas no visibles.
5. Renderizado del checklist `.visibility-checklist-card` dentro de la tarjeta de un atleta no visible con sus ítems de estado y botones correspondientes.
6. Renderizado de `.visibility-status-active` para atletas completamente verificados y activos.
7. Comportamiento de los botones de acción rápida detonando `openCheckoutModal` y `openIdentityModal`.

### 5.2 Comandos de Validación
- Frontend Tests: `npm test -- --watch=false`
- Frontend Build: `npm run build`
- Despliegue Local: `docker compose build` & `docker compose up -d`

---

## 6. Checklist de Implementación Paso a Paso (Para trello_implementer)
- [x] 1. Frontend: Implementar `isAthleteVisible`, `hasNonVisibleAthletes` y `getNonVisibleCount` en `tutor-dashboard.component.ts`.
- [x] 2. Frontend: Añadir estilos CSS de `.global-visibility-alert-banner`, `.visibility-checklist-card`, `.checklist-item`, `.visibility-status-active` en `tutor-dashboard.component.ts`.
- [x] 3. Frontend: Añadir el Banner Global Superior en `tutor-dashboard.component.html` en la cabecera de atletas.
- [x] 4. Frontend: Añadir el Checklist Contextual e Indicador Positivo en `tutor-dashboard.component.html` dentro de cada `.athlete-card`.
- [x] 5. Frontend: Añadir suite de pruebas unitarias en `tutor-dashboard.component.spec.ts`.
- [x] 6. Frontend: Ejecutar `npm test -- --watch=false` y asegurar 100% de pruebas exitosas.
- [x] 7. Frontend: Ejecutar `npm run build` para validar empaquetado de producción.
- [x] 8. Documentación: Redactar plan de pruebas en `test/TS-39-test-plan-banner-checklist-visibilidad-directorio-scouts.md`.
- [x] 9. Trello: Actualizar checkboxes en este plan, mover tarjeta a `in testing` mediante script y agregar comentario.
- [x] 10. Despliegue Local: Construir imágenes Docker actualizadas (`docker compose build`) y recrear contenedores (`docker compose up -d`).

---

## 7. Criterios de Aceptación (Definition of Done - DoD)
- [x] Si existen atletas no visibles, se visualiza el banner de alerta global en la parte superior del listado de atletas.
- [x] En la ficha de cada atleta no visible, se despliega el checklist contextual detallando qué condiciones (Plan Pro y/o Documento de Identidad) están pendientes.
- [x] Los botones directos en el checklist abren los modales correspondientes (`openCheckoutModal`, `openIdentityModal`, `openVideoUploaderForAthlete`).
- [x] Los atletas con ambas condiciones cumplidas muestran el indicador verde de visibilidad activa en el directorio.
- [x] Las pruebas unitarias de frontend (`npm test`) y la compilación (`npm run build`) pasan al 100%.
- [x] Imágenes Docker reconstruidas y contenedores en ejecución saludable.
