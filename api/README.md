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

| Método | Ruta | Controlador |
| --- | --- | --- |
| GET | `/auth/me` | `AppAuthController@me` |
| POST | `/auth/register` | `AppAuthController@register` |
| POST | `/auth/login` | `AppAuthController@login` |
| DELETE | `/auth/logout` | `AppAuthController@logout` |
| POST | `/auth/google` | `AppAuthController@google` |
| POST | `/auth/linkedin` | `AppAuthController@linkedin` |
| POST | `/auth/forgot` | `AppAuthController@forgot` |
| POST | `/auth/reset` | `AppAuthController@reset` |

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

> **Note:** `JobSearchController` exists at `api/src/Controllers/JobSearchController.php` but the `POST /job-search` route is not currently registered in `api/index.php`. The frontend implementation is complete and ready to connect once the route is wired.

### Sync (requiere app auth via `RequireAuth` middleware)

| Método | Ruta | Handler |
| --- | --- | --- |
| GET | `/sync/applications` | Closure → `SyncController@getApplications` |
| POST | `/sync/applications` | Closure → `SyncController@saveApplications` |
| GET | `/sync/opportunities` | Closure → `SyncController@getOpportunities` |
| POST | `/sync/opportunities` | Closure → `SyncController@saveOpportunities` |

### Agent API (requiere app auth via `RequireAuth` middleware)

| Método | Ruta | Handler |
| --- | --- | --- |
| POST | `/agent/job-applications` | Closure → `AgentJobApplicationController@store` |
| GET | `/agent/job-applications` | Closure → `AgentJobApplicationController@index` |

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

## Migraciones con Phinx

- Instalar dependencias PHP: `cd api && composer install`
- Ver estado: `cd api && composer phinx -- status -e development`
- Ejecutar baseline legacy en producción: `cd api && composer phinx -- migrate -e production -t 20260622090000`
- Ejecutar migraciones incrementales de esta rama: `cd api && composer phinx -- migrate -e production`
- Crear nuevas migraciones: `cd api && composer phinx -- create NombreDeMigracion`

Migraciones incrementales actuales:

- `20260622100000_UpgradeLegacySchemaForSessionAuth`
- `20260622100100_CreateAuthTokensAndAuditLogTables`
- `20260622100200_CreateAgentJobApplicationsTable`

`../phinx.php` reutiliza `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_CHARSET`, además de `api/config.php` o `api/config.example.php` como respaldo.

## Desarrollo local

Antes de levantar el backend la primera vez:

1. `cd api && cp .env.example .env` — crea tu archivo local de secrets a partir de la plantilla. El archivo real está en `.gitignore` así que no se commitea por accidente.
2. Edita `api/.env` y rellena al menos `LOGFIRE_TOKEN`. Para obtenerlo: crea el proyecto `godi/starter-project` en [https://logfire-us.pydantic.dev](https://logfire-us.pydantic.dev), copia el write token, pégalo en `LOGFIRE_TOKEN=`.
3. `composer install` — esto baja el SDK de OpenTelemetry y los exporters OTLP además del resto del core. Si lo omites, `index.php` cae al autoloader local copiado en `src/`, pero la telemetría queda deshabilitada.
4. Sirve el frontend desde la raíz del repo con `npm run dev`.

Notas sobre cada variable del archivo de entorno:

- `LOGFIRE_TOKEN` — opcional. Si está vacío, la clase `LogfireTelemetry` se vuelve un tracer no-op y el backend funciona igual pero sin enviar trazas. Nunca commitees tokens reales.
- `OTEL_SERVICE_NAME` — opcional. Default `overphp-api`. Es el valor que verás como `service.name` en Logfire Live view, útil para filtrar.
- `LOGFIRE_BASE_URL` — opcional. Solo cámbialo si auto-hospedas Logfire. Por defecto apunta al endpoint compartido `https://logfire-us.pydantic.dev`.
- `DB_*` — desactiva con `DB_ENABLED=false` para una sesión local sin MySQL. Actívalas cuando quieras probar rutas que tocan la base (auth, sync, agent).

El deploy a producción escribe un `.env` equivalente desde GitHub Secrets; ver `.github/workflows/deploy.yml` para el formato exacto.
