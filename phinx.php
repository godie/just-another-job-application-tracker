<?php

declare(strict_types=1);

/**
 * Minimal Phinx bootstrap.
 *
 * Reuses the same DB_* environment variables and the existing API config file
 * so migrations stay aligned with the production application settings.
 */

$apiDir = __DIR__ . '/api';
$envFile = $apiDir . '/.env';

if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if ($name !== '' && getenv($name) === false) {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

$configFile = is_file($apiDir . '/config.php')
    ? $apiDir . '/config.php'
    : $apiDir . '/config.example.php';

$appConfig = require $configFile;
$databaseConfig = $appConfig['database'] ?? [];
$mysqlConfig = $databaseConfig['mysql'] ?? [];

$buildMysqlEnvironment = static function () use ($databaseConfig, $mysqlConfig): array {
    return [
        'adapter' => 'mysql',
        'host' => getenv('DB_HOST') ?: ($mysqlConfig['host'] ?? '127.0.0.1'),
        'name' => getenv('DB_NAME') ?: ($mysqlConfig['database'] ?? ''),
        'user' => getenv('DB_USER') ?: ($mysqlConfig['username'] ?? ''),
        'pass' => getenv('DB_PASSWORD') ?: ($mysqlConfig['password'] ?? ''),
        'port' => (int) (getenv('DB_PORT') ?: ($mysqlConfig['port'] ?? 3306)),
        'charset' => getenv('DB_CHARSET') ?: ($mysqlConfig['charset'] ?? 'utf8mb4'),
        'collation' => getenv('DB_COLLATION') ?: 'utf8mb4_unicode_ci',
        'table_prefix' => getenv('DB_TABLE_PREFIX') ?: '',
    ];
};

return [
    'paths' => [
        'migrations' => __DIR__ . '/db/migrations',
        'seeds' => __DIR__ . '/db/seeds',
    ],
    'environments' => [
        'default_migration_table' => 'phinxlog',
        'default_environment' => getenv('PHINX_ENVIRONMENT') ?: 'development',
        'development' => $buildMysqlEnvironment(),
        'production' => $buildMysqlEnvironment(),
    ],
    'version_order' => 'creation',
];
