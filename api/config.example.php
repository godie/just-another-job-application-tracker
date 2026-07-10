<?php

declare(strict_types=1);

// Load .env file if it exists
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (isset($line[0]) && $line[0] !== '#') {
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $value = trim($parts[1], " \t\n\r\0\x0B\"'");
                putenv(trim($parts[0]) . '=' . $value);
            }
        }
    }
}

$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,https://jajat.godieboy.com')
)));

return [
    'allowed_origins' => $allowedOrigins,
    'route_prefix' => getenv('API_PREFIX') ?: '/api',
    'controller_namespace' => getenv('CONTROLLER_NAMESPACE') ?: 'OverPHP\\Controllers',
    // Descriptive logging toggle. Off by default in the production template
    // (set LOGGING_ENABLED=true in .env to enable). Output goes to PHP's
    // error_log destination (typically stderr in containerized deploys, or
    // the file configured by the `error_log` ini setting).
    'logging' => [
        'enabled' => filter_var(getenv('LOGGING_ENABLED') ?: 'false', FILTER_VALIDATE_BOOLEAN),
    ],
    'benchmark' => [
        'enabled' => filter_var(getenv('BENCHMARK_ENABLED') ?: 'false', FILTER_VALIDATE_BOOLEAN),
    ],
    'client' => [
        'enabled' => filter_var(getenv('CLIENT_ENABLED') ?: 'false', FILTER_VALIDATE_BOOLEAN),
        'path' => getenv('CLIENT_PATH') ?: __DIR__ . '/../dist',
        'fallback_index' => 'index.html',
    ],
    'security' => [
        'csrf_enabled' => filter_var(getenv('CSRF_ENABLED') ?: 'false', FILTER_VALIDATE_BOOLEAN),
    ],
    'database' => [
        'enabled' => filter_var(getenv('DB_ENABLED') ?: 'false', FILTER_VALIDATE_BOOLEAN),
        'driver' => getenv('DB_DRIVER') ?: 'mysql',
        'mysql' => [
            'host' => getenv('DB_HOST') ?: '__DB_HOST__',
            'port' => (int) (getenv('DB_PORT') ?: '__DB_PORT__'),
            'database' => getenv('DB_NAME') ?: '__DB_NAME__',
            'username' => getenv('DB_USER') ?: '__DB_USER__',
            'password' => getenv('DB_PASSWORD') ?: '__DB_PASSWORD__',
            'charset' => getenv('DB_CHARSET') ?: 'utf8mb4',
            'options' => [],
        ],
        'sqlite' => [
            'path' => getenv('DB_SQLITE_PATH') ?: __DIR__ . '/data/jajat.sqlite',
            'options' => [],
        ],
    ],
    'paths' => [
        'suggestions_db' => getenv('SUGGESTIONS_DB_PATH') ?: __DIR__ . '/data/suggestions.db',
    ],
    'cookie_name' => 'google_auth_token',
    'access_expires_cookie_name' => 'google_auth_expires',
    'cookie_expiry_seconds' => 3600,
    'refresh_cookie_name' => 'google_refresh_token',
    'refresh_cookie_days' => 30,
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '__VITE_GOOGLE_CLIENT_ID__',
    'google_client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: '__VITE_GOOGLE_CLIENT_SECRET__',
    'linkedin_client_id' => getenv('LINKEDIN_CLIENT_ID') ?: '__LINKEDIN_CLIENT_ID__',
    'linkedin_client_secret' => getenv('LINKEDIN_CLIENT_SECRET') ?: '__LINKEDIN_CLIENT_SECRET__',

    'logfire' => [
        'token' => getenv('LOGFIRE_TOKEN') ?: '',
        'service_name' => getenv('OTEL_SERVICE_NAME') ?: 'overphp-api',
        'base_url' => getenv('LOGFIRE_BASE_URL') ?: 'https://logfire-us.pydantic.dev',
    ],
    'job_search' => [
        'jooble_api_key' => getenv('JOOBLE_API_KEY') ?: '__JOOBLE_API_KEY__',
        'theirstack_api_key' => getenv('THEIRSTACK_API_KEY') ?: '__THEIRSTACK_API_KEY__',
        'adzuna_app_id' => getenv('ADZUNA_APP_ID') ?: '__ADZUNA_APP_ID__',
        'adzuna_api_key' => getenv('ADZUNA_API_KEY') ?: '__ADZUNA_API_KEY__',
        'careerjet_api_key' => getenv('CAREERJET_API_KEY') ?: '__CAREERJET_API_KEY__',
        'careerjet_affid' => getenv('CAREERJET_AFFID') ?: '__CAREERJET_AFFID__',
        'default_source' => 'jooble',
        'results_per_page' => 20,
        'max_results' => 200,
        'cache_ttl_seconds' => 300,
    ],
];
