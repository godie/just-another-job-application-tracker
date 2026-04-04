<?php

declare(strict_types=1);

return [
    'allowed_origins' => [
        'http://localhost:5173',
        'https://jajat.godieboy.com',
    ],
    'route_prefix' => getenv('API_PREFIX') ?: '/api',
    'controller_namespace' => getenv('CONTROLLER_NAMESPACE') ?: 'OverPHP\\Controllers',
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
];
