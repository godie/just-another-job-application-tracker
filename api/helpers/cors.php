<?php
/**
 * CORS headers and OPTIONS preflight.
 * Call before any output. Returns true if request was OPTIONS (caller should exit).
 *
 * @param string[] $allowedOrigins
 * @return bool true if OPTIONS was handled
 */
function corsSendHeaders(array $allowedOrigins): bool {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = in_array($origin, $allowedOrigins, true);

    if ($allowed) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Vary: Origin');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code($allowed ? 200 : 403);
        return true;
    }

    return false;
}
