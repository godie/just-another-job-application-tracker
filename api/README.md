# API (OverPHP actualizado)

Esta carpeta ahora usa el core actual de `OverPHP` dentro de `api/src`, manteniendo los controladores propios del proyecto en `api/controllers`.

## Estructura

- `index.php` bootstrap de OverPHP con CORS, headers de seguridad, sesión segura y registro de rutas.
- `src/` core actualizado de OverPHP (`Core`, `Libs`, `Helpers`).
- `controllers/` controladores existentes del proyecto, cargados mediante alias al namespace `OverPHP\Controllers`.
- `helpers/auth.php` y `helpers/db.php` helpers legacy que siguen usando algunos controladores del proyecto.
- `config.php` y `config.example.php` configuración compatible con OverPHP y con claves legacy de este proyecto.

## Rutas registradas

| Método | Ruta | Controlador |
| --- | --- | --- |
| GET | `/auth/cookie` | `AuthController@show` |
| POST | `/auth/cookie` | `AuthController@store` |
| DELETE | `/auth/cookie` | `AuthController@destroy` |
| GET | `/captcha` | `CaptchaController@index` |
| GET | `/suggestions` | `SuggestionsController@index` |
| POST | `/suggestions` | `SuggestionsController@store` |
| POST | `/google-sheets` | `GoogleSheetsController@index` |
| GET | `/sync/applications` | `SyncController@getApplications` |
| POST | `/sync/applications` | `SyncController@saveApplications` |
| GET | `/sync/opportunities` | `SyncController@getOpportunities` |
| POST | `/sync/opportunities` | `SyncController@saveOpportunities` |
| GET | `/user/profile` | `UserController@profile` |
| GET | `/hello` | `HelloController@index` |

## Notas

- El prefijo de rutas sigue siendo `/api` por defecto.
- CSRF queda desactivado por defecto para no romper el frontend actual basado en cookies y `fetch`.
- Si instalas dependencias PHP dentro de `api/vendor`, `index.php` usará ese autoload; si no, funciona con el autoloader local del core copiado en `src/`.
- El plan de evolución para auth de aplicación, sync con cuentas y multitenancy está documentado en [DOCS/MULTITENANCY_AND_AUTH_PLAN.md](../DOCS/MULTITENANCY_AND_AUTH_PLAN.md).
