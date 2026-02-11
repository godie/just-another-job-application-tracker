<?php
/**
 * API entry point. CORS, session, then Router.
 */

// Secure Configuration: Disable error display in production
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);

$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/helpers/cors.php';

// Security Headers
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");

if (corsSendHeaders($config['allowed_origins'])) {
    exit;
}

// Secure Session Management
ini_set('session.use_only_cookies', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');

// Set secure flag if HTTPS is detected
$isSecure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if ($isSecure) {
    ini_set('session.cookie_secure', 1);
}

session_start();

require_once __DIR__ . '/Router.php';
$router = new Router();

// Auth cookie (Google OAuth)
$router->add('GET', '/auth/cookie', 'AuthController@show');
$router->add('POST', '/auth/cookie', 'AuthController@store');
$router->add('DELETE', '/auth/cookie', 'AuthController@destroy');

// Captcha (support form)
$router->add('GET', '/captcha', 'CaptchaController@index');

// Suggestions (support form)
$router->add('POST', '/suggestions', 'SuggestionsController@store');

// Google Sheets proxy (create, sync, get info)
$router->add('POST', '/google-sheets', 'GoogleSheetsController@index');

// Legacy / demo
$router->add('GET', '/user/profile', 'UserController@profile');
$router->add('GET', '/hello', 'HelloController@index');

$router->run();
