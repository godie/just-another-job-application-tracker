<?php

declare(strict_types=1);

use OverPHP\Core\Benchmark;
use OverPHP\Core\Container;
use OverPHP\Core\Router;
use OverPHP\Core\Security;
use OverPHP\Libs\Database;
use function OverPHP\Helpers\corsSendHeaders;

error_reporting(~E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
ini_set('log_errors', '1');

$config = file_exists(__DIR__ . '/config.php')
    ? require __DIR__ . '/config.php'
    : require __DIR__ . '/config.example.php';

$controllerNamespace = rtrim((string) ($config['controller_namespace'] ?? 'OverPHP\\Controllers'), '\\');
if ($controllerNamespace === '') {
    $controllerNamespace = 'OverPHP\\Controllers';
}

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} else {
    require_once __DIR__ . '/src/Helpers/cors.php';
    require_once __DIR__ . '/src/Helpers/database.php';

    spl_autoload_register(function (string $class) use ($controllerNamespace): void {
        $prefix = 'OverPHP\\';
        if (!str_starts_with($class, $prefix)) {
            return;
        }

        if ($class === $controllerNamespace || str_starts_with($class, $controllerNamespace . '\\')) {
            return;
        }

        $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
        $file = __DIR__ . '/src/' . $relative . '.php';
        if (is_file($file)) {
            require_once $file;
        }
    });
}

spl_autoload_register(function (string $class) use ($controllerNamespace): void {
    if ($class !== $controllerNamespace && !str_starts_with($class, $controllerNamespace . '\\')) {
        return;
    }

    $relative = ltrim(substr($class, strlen($controllerNamespace)), '\\');
    $relativePath = str_replace('\\', '/', $relative);
    $legacyName = basename($relativePath);
    $legacyFile = __DIR__ . '/controllers/' . $legacyName . '.php';

    if (is_file($legacyFile)) {
        require_once $legacyFile;
        if (class_exists($legacyName, false) && !class_exists($class, false)) {
            class_alias($legacyName, $class);
        }
        return;
    }

    $file = __DIR__ . '/src/Controllers/' . $relativePath . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

$container = Container::getInstance();
$container->singleton(Database::class, function () use ($config) {
    return new Database($config);
});

Benchmark::start((bool) ($config['benchmark']['enabled'] ?? false));
Security::sendSecurityHeaders();
Security::setCsrfEnabled((bool) ($config['security']['csrf_enabled'] ?? false));

if (corsSendHeaders($config['allowed_origins'] ?? [])) {
    return;
}

Security::startSecureSession();

$routePrefix = (string) ($config['route_prefix'] ?? '/api');
$clientConfig = (array) ($config['client'] ?? []);

$router = new Router($controllerNamespace, $routePrefix, $container, $clientConfig);

$router->add('GET', '/auth/cookie', 'AuthController@show');
$router->add('POST', '/auth/cookie', 'AuthController@store');
$router->add('DELETE', '/auth/cookie', 'AuthController@destroy');

$router->add('GET', '/captcha', 'CaptchaController@index');

$router->add('GET', '/suggestions', 'SuggestionsController@index');
$router->add('POST', '/suggestions', 'SuggestionsController@store');

$router->add('POST', '/google-sheets', 'GoogleSheetsController@index');

$router->add('GET', '/sync/applications', 'SyncController@getApplications');
$router->add('POST', '/sync/applications', 'SyncController@saveApplications');
$router->add('GET', '/sync/opportunities', 'SyncController@getOpportunities');
$router->add('POST', '/sync/opportunities', 'SyncController@saveOpportunities');

$router->add('GET', '/user/profile', 'UserController@profile');
$router->add('GET', '/hello', 'HelloController@index');

$router->run();
