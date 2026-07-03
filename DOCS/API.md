# API (OverPHP actualizado)

Esta carpeta ahora usa el core actual de `OverPHP` dentro de `api/src`, manteniendo los controladores propios del proyecto en `api/controllers`.

## Estructura

- `index.php` bootstrap de OverPHP con CORS, headers de seguridad, sesión segura y registro de rutas.
- `src/` core actualizado de OverPHP (`Core`, `Libs`, `Helpers`).
- `controllers/` controladores existentes del proyecto, cargados mediante alias al namespace `OverPHP\Controllers`.
- `helpers/auth.php` y `helpers/db.php` helpers legacy que siguen usando algunos controladores del proyecto.
- `config.php` y `config.example.php` configuración compatible con OverPHP y con claves legacy de este proyecto.

## Rutas registradas

### Autenticación de aplicación (app auth)

| Método | Ruta | Controlador | Notas |
| --- | --- | --- | --- |
| GET | `/auth/me` | `AppAuthController@me` | Devuelve el usuario autenticado de la sesión actual |
| POST | `/auth/register` | `AppAuthController@register` | Registro con email/password |
| POST | `/auth/login` | `AppAuthController@login` | Login con email/password |
| DELETE | `/auth/logout` | `AppAuthController@logout` | Destruye la sesión |
| POST | `/auth/google` | `AppAuthController@google` | Login/link con Google OAuth |
| POST | `/auth/linkedin` | `AppAuthController@linkedin` | Login/link con LinkedIn OAuth |
| POST | `/auth/forgot` | `AppAuthController@forgot` | Solicitud de reset de password |
| POST | `/auth/reset` | `AppAuthController@reset` | Reset de password con token |

### Autenticación de servicios Google

| Método | Ruta | Controlador |
| --- | --- | --- |
| GET | `/auth/cookie` | `AuthController@show` |
| POST | `/auth/cookie` | `AuthController@store` |
| DELETE | `/auth/cookie` | `AuthController@destroy` |

### API pública

| Método | Ruta | Controlador |
| --- | --- | --- |
| GET | `/captcha` | `CaptchaController@index` |
| GET | `/suggestions` | `SuggestionsController@index` |
| POST | `/suggestions` | `SuggestionsController@store` |
| POST | `/google-sheets` | `GoogleSheetsController@index` |

> **Note:** `JobSearchController` exists at `api/src/Controllers/JobSearchController.php` but the `POST /job-search` route is not currently registered in `api/index.php`. The frontend implementation (`src/utils/jobSearchApi.ts`, `src/components/JobSearchForm.tsx`, `src/components/JobSearchResults.tsx`) is complete and ready to connect once the route is wired.

### Sync (requiere app auth via `RequireAuth` middleware)

| Método | Ruta | Handler | Notas |
| --- | --- | --- | --- |
| GET | `/sync/applications` | Closure → `SyncController@getApplications` | Requiere sesión activa |
| POST | `/sync/applications` | Closure → `SyncController@saveApplications` | Requiere sesión activa |
| GET | `/sync/opportunities` | Closure → `SyncController@getOpportunities` | Requiere sesión activa |
| POST | `/sync/opportunities` | Closure → `SyncController@saveOpportunities` | Requiere sesión activa |

### Agent API (requiere app auth via `RequireAuth` middleware)

| Método | Ruta | Handler | Notas |
| --- | --- | --- | --- |
| POST | `/agent/job-applications` | Closure → `AgentJobApplicationController@store` | Requiere sesión activa; idempotente por `(user_id, source_url)` |
| GET | `/agent/job-applications` | Closure → `AgentJobApplicationController@index` | Requiere sesión activa; filtros por query params |

### Misc

| Método | Ruta | Controlador |
| --- | --- | --- |
| GET | `/user/profile` | `UserController@profile` |
| GET | `/hello` | `HelloController@index` |

## Notas

- El prefijo de rutas sigue siendo `/api` por defecto.
- CSRF queda desactivado por defecto para no romper el frontend actual basado en cookies y `fetch`.
- Si instalas dependencias PHP dentro de `api/vendor`, `index.php` usará ese autoload; si no, funciona con el autoloader local del core copiado en `src/`.
- El plan de evolución para auth de aplicación, sync con cuentas y multitenancy está documentado en [DOCS/MULTITENANCY_AND_AUTH_PLAN.md](../DOCS/MULTITENANCY_AND_AUTH_PLAN.md).
