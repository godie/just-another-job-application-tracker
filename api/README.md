# API (PHP)

Mini framework con router y controladores. Toda la entrada pasa por `index.php`.

## Estructura

- **config.example.php** – Plantilla de configuración (CORS, cookie, DB de sugerencias, OAuth). En **local**: copia a `config.php` y pon tus valores reales en `google_client_id` y `google_client_secret` (config.php está en .gitignore). En **deploy**: el workflow genera config.php desde esta plantilla e inyecta los secrets desde GitHub Actions.
- **helpers/cors.php** – Cabeceras CORS y respuesta a `OPTIONS`.
- **helpers/auth.php** – `get_valid_access_token($config)`: devuelve un access token válido (refrescando con refresh_token si está expirado). Lo usan AuthController y GoogleSheetsController para no enviar tokens caducados a Google.
- **Router.php** – Despacha por método y path a controladores o closures.
- **controllers/** – Lógica por recurso:
  - **AuthController** – Cookie de Google OAuth: GET/POST/DELETE `/auth/cookie`. POST acepta `access_token` (legacy) o `code` + `redirect_uri` (flujo authorization code; el backend guarda refresh token y renueva el access cuando expire). GET devuelve el access token y, si está expirado, lo renueva con el refresh token.
  - **CaptchaController** – GET `/captcha` (genera desafío numérico en sesión).
  - **SuggestionsController** – POST `/suggestions` (valida captcha y guarda en SQLite).
  - **GoogleSheetsController** – POST `/google-sheets` (proxy: `create_sheet`, `sync_data`, `get_sheet_info`).
  - **HelloController** – GET `/hello` (demo).
  - **UserController** – GET `/user/profile` (demo).

## Rutas

| Método | Ruta            | Controlador                  |
|--------|-----------------|-----------------------------|
| GET    | /auth/cookie    | AuthController@show         |
| POST   | /auth/cookie    | AuthController@store        |
| DELETE | /auth/cookie    | AuthController@destroy      |
| GET    | /captcha        | CaptchaController@index     |
| POST   | /suggestions    | SuggestionsController@store |
| POST   | /google-sheets  | GoogleSheetsController@index |
| GET    | /hello          | HelloController@index       |
| GET    | /user/profile   | UserController@profile      |

El frontend usa `VITE_API_BASE_URL` (p. ej. `/api`); las peticiones son a `/api/auth/cookie`, `/api/captcha`, `/api/suggestions`. El router elimina el prefijo `/api` del URI antes de emparejar.

