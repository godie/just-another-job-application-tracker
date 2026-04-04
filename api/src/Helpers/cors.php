<?php

declare(strict_types=1);

namespace OverPHP\Helpers;

/** @param array<int,string> $allowedOrigins */
function corsSendHeaders(array $allowedOrigins): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = in_array($origin, $allowedOrigins, true);

    if ($allowed) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Vary: Origin');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code($allowed ? 200 : 403);
        return true;
    }

    return false;
}
