# Plan de Pruebas: [TS-39] Banner Global y Checklist Contextual de Visibilidad en Directorio de Scouts para Atletas en Dashboard

## 1. Alcance de las Pruebas
Este plan de pruebas valida la implementación de la tarea **[TS-39]**, enfocada en la transparencia, diagnóstico y orientación al tutor legal respecto a la visibilidad de sus representados en el Directorio Nacional de Scouts:
* **Frontend (`talentus-scout-fe`):**
  - `tutor-dashboard.component.ts`:
    - Métodos de diagnóstico `isAthleteVisible(athlete)`, `hasNonVisibleAthletes()`, y `getNonVisibleCount()`.
    - Lógica de visibilidad que exige `subscriptionStatus === 'ACTIVE'` y `hasIdentityDocument === true` para considerar al atleta como activo en el directorio.
    - Estilos Bento modernos con paleta intencional (ámbar para alertas, esmeralda para cumplimiento, azul para multimedia).
  - `tutor-dashboard.component.html`:
    - Banner global de alerta `.global-visibility-alert-banner` condicionado por `hasNonVisibleAthletes()`.
    - Checklist contextual `.visibility-checklist-card` dentro de cada atleta no visible con estados dinámicos (Plan Pro, Documento de Identidad, y recomendación multimedia).
    - Botones de llamada a la acción directa vinculados a `openCheckoutModal(athlete)`, `openIdentityModal(athlete)` y `openVideoUploaderForAthlete(athlete)`.
    - Indicador visual positivo `.visibility-status-active` para atletas completamente visibles y auditados.
  - `tutor-dashboard.component.spec.ts`:
    - Pruebas unitarias completas que cubren todas las combinaciones de estado, cálculos de conteo, renderizado condicional de elementos y detonación de modales.

---

## 2. Pruebas Automatizadas Ejecutadas

### 2.1 Frontend (`talentus-scout-fe`)
Comando ejecutado:
```bash
npm test -- --watch=false
```

Casos probados en `tutor-dashboard.component.spec.ts` dentro de la suite `TS-39 Global visibility banner and contextual checklist in tutor dashboard`:
1. `should correctly evaluate isAthleteVisible for different athlete states`:
   - Verifica que un atleta con Plan Pro y Documento de Identidad sea evaluado como visible (`true`).
   - Verifica que un atleta con Plan Pro pero sin Documento sea evaluado como no visible (`false`).
   - Verifica que un atleta con Documento pero sin Plan Pro sea evaluado como no visible (`false`).
   - Verifica que un atleta sin Plan Pro ni Documento sea evaluado como no visible (`false`).
2. `should compute hasNonVisibleAthletes and getNonVisibleCount correctly`:
   - Valida el conteo dinámico de atletas fuera del directorio y el cálculo booleano ante listas mixtas, listas 100% visibles y listas vacías.
3. `should render the global visibility banner when hasNonVisibleAthletes is true`:
   - Valida la presencia del banner superior y su texto con el conteo exacto de pendientes (`1 PENDIENTE`).
   - Valida que al tener solo atletas visibles, el banner desaparece del DOM.
4. `should render .visibility-checklist-card for non-visible athlete (mockAthlete2)`:
   - Valida la presencia de la tarjeta de checklist, textos de diagnóstico ("Perfil Fuera del Radar de Scouts", "Plan inactivo", "Documento legal pendiente") y la presencia de los botones de acción rápida.
5. `should render .visibility-status-active for fully visible athlete (mockAthlete1)`:
   - Valida que los atletas visibles no muestren el checklist de advertencia y en su lugar muestren el indicador verde de ficha activa en el directorio.
6. `should open checkout modal and identity modal from checklist action buttons`:
   - Valida que hacer clic en los botones del checklist (`.btn-activate-pro-checklist` y `.btn-upload-doc-checklist`) invoque directamente a `openCheckoutModal` y `openIdentityModal` pasando el atleta correspondiente.

---

## 3. Guía de Verificación Manual Paso a Paso

### 3.1 Verificación en Interfaz Web (UI)
1. **Acceso con Tutor con Atletas en Estado Mixto:**
   - Iniciar sesión como tutor legal en `/dashboard/tutor`.
2. **Constatación del Banner Global Superior:**
   - Si existen atletas con Plan Pro inactivo o sin documento de identidad:
     - Constatar que justo debajo del encabezado "Mis Atletas Representados" aparece el banner ámbar:
       `📡⚠️ Atletas fuera del Directorio Nacional de Scouts [X PENDIENTES]`
       `Los cazatalentos y clubes federados solo pueden descubrir fichas con Plan Pro activo y comprobante de patria potestad consignado...`
3. **Constatación de la Ficha del Atleta No Visible:**
   - Ubicar un atleta sin Plan Pro o sin documento.
   - Constatar la presencia del callout `🔒 Perfil Fuera del Radar de Scouts`:
     - Si el Plan Pro está inactivo: ver ícono `⚠️` con el botón `⚡ Activar Plan Pro`. Al pulsar el botón, verificar que se abre inmediatamente el modal de checkout de Pago Móvil.
     - Si el Documento Legal está pendiente: ver ícono `⚠️` con el botón `🪪 Consignar Documento`. Al pulsar el botón, verificar que se abre inmediatamente el modal de carga de documento.
     - Verificar la presencia de la recomendación multimedia con el botón `📹 Cargar Video`.
4. **Constatación de la Ficha del Atleta Visible:**
   - Ubicar un atleta que cuente con Plan Pro activo y documento de identidad consignado.
   - Constatar que NO se muestra el bloque de advertencia `🔒 Perfil Fuera del Radar de Scouts`.
   - Constatar la presencia del indicador positivo:
     `● ✓ Ficha activa y visible en el Directorio Nacional de Scouts`.
5. **Transición Dinámica al Completar Requisitos:**
   - Consignar el documento de identidad de un menor desde el modal.
   - Constatar que el checklist se actualiza mostrando `✓ Documento legal consignado conforme a normativa`.
   - Si se activa el Plan Pro, constatar que el atleta pasa a mostrar el indicador verde de visibilidad y el contador del banner global disminuye (o desaparece si no quedan más pendientes).

---

## 4. Matriz de Validación de Criterios de Aceptación (DoD)

| Criterio de Aceptación | Estado | Evidencia |
| :--- | :---: | :--- |
| **DoD 1:** Banner global visible cuando hay al menos un atleta no visible. | **CUMPLIDO** | `.global-visibility-alert-banner` condicionado por `hasNonVisibleAthletes()`. |
| **DoD 2:** Checklist contextual en cada ficha no visible detallando las condiciones pendientes. | **CUMPLIDO** | `.visibility-checklist-card` con ítems para Plan Pro y Documento de Identidad. |
| **DoD 3:** Botones de acción directa en el checklist que abren los modales correspondientes. | **CUMPLIDO** | `(click)="openCheckoutModal(athlete)"` y `(click)="openIdentityModal(athlete)"`. |
| **DoD 4:** Indicador positivo verde en atletas que cumplen ambas condiciones. | **CUMPLIDO** | `.visibility-status-active` con punto pulsante y mensaje afirmativo. |
| **DoD 5:** Pruebas unitarias y empaquetado de frontend al 100%. | **CUMPLIDO** | 66/66 pruebas unitarias exitosas en Karma y `npm run build` completado sin errores. |
| **DoD 6:** Despliegue de contenedores Docker actualizado. | **CUMPLIDO** | Imágenes reconstruidas y servicios corriendo saludablemente. |

---

## 5. Casos Borde y Seguridad
* **Protección del Menor (LOPNNA Art. 65):** Ningún atleta menor de edad puede figurar en el directorio público o en las búsquedas de scouts sin la verificación formal de su documento de identidad bajo patria potestad. El checklist educa al tutor en este principio legal fundamental.
* **Lista vacía de atletas:** Cuando el tutor no tiene ningún atleta registrado, ni el banner global ni los checklists son renderizados, mostrando limpiamente el empty-state de registro.
