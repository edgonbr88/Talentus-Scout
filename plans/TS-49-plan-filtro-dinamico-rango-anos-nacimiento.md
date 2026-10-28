# Plan de Implementación: [TS-49] Filtro Dinámico por Rango de Años de Nacimiento en Directorio de Scouts

**ID Tarea:** TS-49  
**Tarjeta Trello:** [https://trello.com/c/6ad6a2580ffd3379e2b14bdc](https://trello.com/c/6ad6a2580ffd3379e2b14bdc)  
**Fecha:** 2026-10-20  
**Estado del Plan:** LISTO PARA IMPLEMENTACIÓN  
**Agente Revisor/Planificador:** trello_planner  

---

## 1. Contexto de Negocio y Justificación
- **Problema que resuelve:** Los scouts y directores deportivos organizan visorías y captaciones por categorías y cohortes etarias anuales (Sub-13, Sub-15, Sub-17, etc.) reguladas por FIFA y confederaciones deportivas. Anteriormente, el radar solo permitía chips de categorías fijas (ej. Sub-15 = 2011) o un año fijo. Esta tarea permite afinar búsquedas mediante selectores dinámicos de rango ("Año Desde" y "Año Hasta") con años reales disponibles de atletas en el radar.
- **Impacto:** Permite al scout encontrar cohortes específicas (ej. 2008 a 2010), facilitando el scouting generacional sin perder de vista los chips de acceso rápido.
- **Protección al Menor (LOPNNA Art. 65 / FIFA):** Solo se incluyen en la lista de años y en los resultados aquellos atletas con verificación legal aprobada (`legalVerificationStatus = APPROVED`), perfil público (`isPublic = TRUE`) y suscripción activa.

---

## 2. Alcance Técnico y Arquitectura
- **Componentes Afectados:**
  - Base de Datos: Consulta JPQL/SQL optimizada con índice `idx_athletes_filter`.
  - Backend:
    - `AthleteRepository`: Nuevo método `findDistinctBirthYearsWithActiveRadar()`.
    - `AthleteSpecifications`: Nuevo predicado `withBirthYearRange(Integer birthYearFrom, Integer birthYearTo)`.
    - `AthleteFilterCriteria`: Nuevos atributos `birthYearFrom` y `birthYearTo`.
    - `ScoutDirectoryService`: Método `getAvailableBirthYears()` e integración del rango en `searchDirectory()`.
    - `ScoutDirectoryController`: Endpoint `GET /api/v1/scouts/directory/birth-years` y parámetros `birthYearFrom`, `birthYearTo` en `GET /api/v1/scouts/directory`.
    - `ScoutDirectoryIntegrationTest`: Pruebas de integración de endpoint y filtros por rango.
  - Frontend:
    - `scout-directory.model.ts`: Atributos opcionales `birthYearFrom`, `birthYearTo`.
    - `scout-directory.service.ts`: Método `getAvailableBirthYears()`.
    - `scout-directory.component.ts`: Signals `availableBirthYears`, `selectedBirthYearFrom`, `selectedBirthYearTo` y manejadores de evento.
    - `scout-directory.component.html`: Selectores estilizados en el panel de filtros avanzados.
    - `scout-directory.component.css`: Ajustes de diseño bento/táctico.

---

## 3. Modelo de Datos y Consultas
- No requiere migraciones DDL nuevas; la columna `birth_date` ya existe en `athletes` y está cubierta por el índice B-Tree compuesto `idx_athletes_filter`.
- Consulta nativa optimizada en `AthleteRepository`:
```java
@Query(value = "SELECT DISTINCT CAST(EXTRACT(YEAR FROM a.birth_date) AS INTEGER) " +
        "FROM athletes a " +
        "INNER JOIN athlete_subscriptions s ON a.id = s.athlete_id " +
        "WHERE a.is_public = TRUE " +
        "AND a.legal_verification_status = 'APPROVED' " +
        "AND a.birth_date IS NOT NULL " +
        "AND s.status = 'ACTIVE' " +
        "AND s.end_date >= NOW() " +
        "ORDER BY 1 DESC", nativeQuery = true)
List<Integer> findDistinctBirthYearsWithActiveRadar();
```

---

## 4. Backend: Spring Boot 3 (Java 21)
- **Directivas de Modelado:**
  - `AthleteFilterCriteria`: Atributos `birthYearFrom` y `birthYearTo` con anotaciones Lombok `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`.
  - `ScoutDirectoryController`:
    - Endpoint: `GET /api/v1/scouts/directory/birth-years`
    - Seguridad: `@PreAuthorize("hasAnyRole('SCOUT', 'ADMIN') and @scoutSecurity.isVerifiedScout(authentication)")`
    - Retorno: `ResponseEntity<List<Integer>>`
  - `AthleteSpecifications`:
    - Normalización automática si `birthYearFrom > birthYearTo` (intercambiar límites).
    - Creación de predicados `cb.between`, `cb.greaterThanOrEqualTo` y `cb.lessThanOrEqualTo` usando `LocalDate.of(year, 1, 1)` y `LocalDate.of(year, 12, 31)`.
  - `ScoutDirectoryService`:
    - Incorporar `getAvailableBirthYears()` llamando al repositorio.
    - Actualizar `searchDirectory()` para aplicar `withBirthYearRange` con fallback a `withBirthYear`.

---

## 5. Frontend: Angular 18+ (Standalone & Design System)
- **Directivas de Diseño (`fe-desing.md`):**
  - Selectores dentro de `advanced-filters-panel` con estética táctica y atlética de Talentus Scout.
  - Opciones de año ordenadas descendentemente con opción por defecto "Cualquier año".
  - Transiciones fluidas y microinteracciones limpias.
  - Sincronización mutua: seleccionar rango desactiva chips de categoría rápida; seleccionar un chip reinicia los selectores de rango.
- **Separación Obligatoria de Plantillas:**
  - Código TS en `scout-directory.component.ts`.
  - Vista en `scout-directory.component.html` con `templateUrl`.
  - Estilos en `scout-directory.component.css`.

---

## 6. Pruebas y Verificación
- **Pruebas de Integración (`ScoutDirectoryIntegrationTest.java`):**
  - `getAvailableBirthYears_ShouldReturnDistinctOrderedYearsOfEligibleAthletes()`
  - `getScoutDirectory_WithBirthYearRange_ShouldFilterAthletesCorrectly()`
  - `getScoutDirectory_WithBirthYearFromOnly_ShouldFilterAthletesCorrectly()`
  - `getScoutDirectory_WithBirthYearToOnly_ShouldFilterAthletesCorrectly()`
  - `getScoutDirectory_WithInvertedBirthYearRange_ShouldNormalizeAndFilterCorrectly()`
- **Compilación Frontend:**
  - `npm run build` en `talentus-scout-fe`.

---

## 7. Checklist Paso a Paso (Para trello_implementer)
- [x] 1. Añadir `findDistinctBirthYearsWithActiveRadar()` en `AthleteRepository.java`.
- [x] 2. Añadir `birthYearFrom` y `birthYearTo` en `AthleteFilterCriteria.java`.
- [x] 3. Añadir `withBirthYearRange(Integer birthYearFrom, Integer birthYearTo)` en `AthleteSpecifications.java`.
- [x] 4. Actualizar `ScoutDirectoryService.java` con `getAvailableBirthYears()` y manejo del filtro de rango.
- [x] 5. Actualizar `ScoutDirectoryController.java` con endpoint `/birth-years` y parámetros `birthYearFrom`, `birthYearTo`.
- [x] 6. Actualizar `scout-directory.model.ts` en Angular.
- [x] 7. Actualizar `scout-directory.service.ts` en Angular con `getAvailableBirthYears()`.
- [x] 8. Actualizar `scout-directory.component.ts` con signals reactivas y lógica de sincronización.
- [x] 9. Actualizar `scout-directory.component.html` y `.css` con los selectores de rango.
- [x] 10. Implementar pruebas automatizadas en `ScoutDirectoryIntegrationTest.java`.
- [x] 11. Ejecutar pruebas unitarias backend (`./mvnw test -Dtest=ScoutDirectoryIntegrationTest`) y compilar frontend (`npm run build`).
- [x] 12. Generar plan de pruebas en `test/TS-49-test-plan-filtro-dinamico-rango-anos-nacimiento.md`.
- [x] 13. Marcar checklist completado en este plan.
- [x] 14. Mover tarjeta en Trello a `in testing` con comentario de trazabilidad.

---

## 8. Criterios de Aceptación (Definition of Done - DoD)
- [x] El endpoint `GET /api/v1/scouts/directory/birth-years` responde 200 con la lista ordenada de años de nacimiento distintos de atletas elegibles en el radar.
- [x] El endpoint `GET /api/v1/scouts/directory` filtra correctamente por `birthYearFrom`, `birthYearTo` y rango combinado, manteniendo compatibilidad con `birthYear`.
- [x] En el frontend, el panel de filtros avanzados renderiza los dos selectores ("Año Desde" y "Año Hasta") con las opciones obtenidas dinámicamente del backend.
- [x] Al seleccionar un año o rango en los selectores, se desactiva visualmente cualquier chip rápido de categoría y los resultados se actualizan reactivamente.
- [x] Al hacer clic en un chip de categoría rápida, los selectores de rango de año se reinician a "Cualquier año".
- [x] El botón "Reiniciar filtros" limpia los selectores de año y restablece el radar a su estado inicial.
- [x] Pruebas unitarias y de integración en backend pasan en verde al 100%.
- [x] El build de Angular compila limpiamente sin errores de tipos o sintaxis.
