<?php
session_start();

$allowedOrigins = ['http://localhost:5173', 'https://jajat.godieboy.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use POST.'
    ]);
    exit();
}

if (!isset($_SESSION['captchas']) || !is_array($_SESSION['captchas'])) {
    $_SESSION['captchas'] = [];
}

$rawInput = file_get_contents('php://input') ?: '';
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON payload.'
    ]);
    exit();
}

$types = $payload['types'] ?? [];
if (!is_array($types)) {
    $types = [];
}
$types = array_values(array_filter(array_map(function ($item) {
    if (!is_string($item)) {
        return null;
    }
    $sanitized = trim(strip_tags($item));
    return $sanitized !== '' ? $sanitized : null;
}, $types)));

$explanation = isset($payload['explanation']) ? trim((string) $payload['explanation']) : '';
$captchaId = isset($payload['captchaId']) ? trim((string) $payload['captchaId']) : '';
$captchaAnswer = isset($payload['captchaAnswer']) ? trim((string) $payload['captchaAnswer']) : '';

if ($explanation === '' || mb_strlen($explanation) > 5000) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Explanation is required and must be under 5000 characters.'
    ]);
    exit();
}

if ($captchaId === '' || $captchaAnswer === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Captcha validation failed.'
    ]);
    exit();
}

if (!isset($_SESSION['captchas'][$captchaId])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Captcha expired or invalid. Please refresh.'
    ]);
    exit();
}

$captchaData = $_SESSION['captchas'][$captchaId];
$expiresAt = $captchaData['expiresAt'] ?? 0;
$expectedAnswer = $captchaData['answer'] ?? '';

if ($expiresAt < time()) {
    unset($_SESSION['captchas'][$captchaId]);
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Captcha expired. Please try again.'
    ]);
    exit();
}

if ($captchaAnswer !== (string) $expectedAnswer) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Incorrect captcha answer.'
    ]);
    exit();
}

unset($_SESSION['captchas'][$captchaId]);

$typesJson = json_encode($types, JSON_UNESCAPED_UNICODE);
if ($typesJson === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to encode suggestion types.'
    ]);
    exit();
}

$dbPath = __DIR__ . '/suggestions.db';
try {
    $db = new SQLite3($dbPath, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to open suggestions database.'
    ]);
    exit();
}

$db->exec('CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    types TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
)');

$stmt = $db->prepare('INSERT INTO suggestions (types, explanation, created_at, ip_address, user_agent) VALUES (:types, :explanation, :created_at, :ip_address, :user_agent)');

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to prepare database statement.'
    ]);
    $db->close();
    exit();
}

$createdAt = gmdate('c');
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

$stmt->bindValue(':types', $typesJson, SQLITE3_TEXT);
$stmt->bindValue(':explanation', $explanation, SQLITE3_TEXT);
$stmt->bindValue(':created_at', $createdAt, SQLITE3_TEXT);
$stmt->bindValue(':ip_address', $ipAddress, SQLITE3_TEXT);
$stmt->bindValue(':user_agent', $userAgent, SQLITE3_TEXT);

$result = $stmt->execute();

if ($result === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save suggestion.'
    ]);
    $stmt->close();
    $db->close();
    exit();
}

$stmt->close();
$db->close();

echo json_encode([
    'success' => true,
    'message' => 'Suggestion stored successfully.'
]);
