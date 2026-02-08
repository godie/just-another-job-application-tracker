<?php
session_start();

$allowedOrigins = ['http://localhost:5173', 'https://jajat.godieboy.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (in_array($origin, $allowedOrigins, true)) {
        http_response_code(200);
    } else {
        http_response_code(403);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use GET.'
    ]);
    exit();
}

if (!isset($_SESSION['captchas']) || !is_array($_SESSION['captchas'])) {
    $_SESSION['captchas'] = [];
}

$now = time();
foreach ($_SESSION['captchas'] as $id => $captcha) {
    if (!is_array($captcha) || ($captcha['expiresAt'] ?? 0) < $now) {
        unset($_SESSION['captchas'][$id]);
    }
}

try {
    $captchaValue = (string) random_int(10000, 99999);
    $captchaId = bin2hex(random_bytes(16));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to generate captcha.'
    ]);
    exit();
}

$_SESSION['captchas'][$captchaId] = [
    'answer' => $captchaValue,
    'expiresAt' => $now + 300 // 5 minutes
];

echo json_encode([
    'success' => true,
    'captchaId' => $captchaId,
    'challenge' => $captchaValue,
    'expiresIn' => 300
]);
