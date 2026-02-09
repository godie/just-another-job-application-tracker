<?php
/**
 * API entry point. CORS, session, then Router.
 */
$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/helpers/cors.php';

if (corsSendHeaders($config['allowed_origins'])) {
    exit;
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
