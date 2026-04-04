<?php
/**
 * Suggestions: submit with captcha validation (POST).
 * Stores in SQLite.
 */
class SuggestionsController
{
    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config.php';
    }

    /** GET /suggestions - List all suggestions */
    public function index(): array
    {
        $dbPath = $this->getSuggestionsDbPath();
        if (!file_exists($dbPath)) {
            return ['success' => true, 'suggestions' => []];
        }

        try {
            $db = new SQLite3($dbPath, SQLITE3_OPEN_READONLY);
            $db->busyTimeout(5000);
        } catch (Exception $e) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to open suggestions database.'];
        }

        $results = $db->query('SELECT * FROM suggestions ORDER BY created_at DESC');
        $suggestions = [];
        if ($results) {
            while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
                $row['types'] = json_decode($row['types'] ?: '[]', true);
                $suggestions[] = $row;
            }
        }

        $db->close();

        return [
            'success' => true,
            'suggestions' => $suggestions,
        ];
    }

    /** POST /suggestions - Validate captcha and store suggestion */
    public function store(): array
    {
        if (!isset($_SESSION['captchas']) || !is_array($_SESSION['captchas'])) {
            $_SESSION['captchas'] = [];
        }

        $rawInput = file_get_contents('php://input') ?: '{}';
        $payload = json_decode($rawInput, true);

        if (!is_array($payload)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON payload.'];
        }

        $types = $payload['types'] ?? [];
        if (!is_array($types)) {
            $types = [];
        }
        $types = array_values(array_filter(array_map(function ($item) {
            if (!is_string($item)) {
                return null;
            }
            // Slicer: Never trust user input. Use strict sanitization.
            $s = trim($item);
            // We use htmlspecialchars on output, but for storage we keep it clean.
            // strip_tags is okay for basic removal, but not for security.
            $s = strip_tags($s);
            return $s !== '' ? $s : null;
        }, $types)));

        $explanation = isset($payload['explanation']) ? trim((string) $payload['explanation']) : '';
        $captchaId = isset($payload['captchaId']) ? trim((string) $payload['captchaId']) : '';
        $captchaAnswer = isset($payload['captchaAnswer']) ? trim((string) $payload['captchaAnswer']) : '';

        if ($explanation === '' || mb_strlen($explanation) > 5000) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => 'Explanation is required and must be under 5000 characters.',
            ];
        }

        if ($captchaId === '' || $captchaAnswer === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'Captcha validation failed.'];
        }

        if (!isset($_SESSION['captchas'][$captchaId])) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Captcha expired or invalid. Please refresh.'];
        }

        $captchaData = $_SESSION['captchas'][$captchaId];
        $expiresAt = $captchaData['expiresAt'] ?? 0;
        $expectedAnswer = $captchaData['answer'] ?? '';

        if ($expiresAt < time()) {
            unset($_SESSION['captchas'][$captchaId]);
            http_response_code(400);
            return ['success' => false, 'error' => 'Captcha expired. Please try again.'];
        }

        if ($captchaAnswer !== (string) $expectedAnswer) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Incorrect captcha answer.'];
        }

        unset($_SESSION['captchas'][$captchaId]);

        $typesJson = json_encode($types, JSON_UNESCAPED_UNICODE);
        if ($typesJson === false) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to encode suggestion types.'];
        }

        $dbPath = $this->getSuggestionsDbPath();
        $dbDir = dirname($dbPath);
        if (!is_dir($dbDir)) {
            mkdir($dbDir, 0755, true);
        }

        try {
            $db = new SQLite3($dbPath, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
            $db->busyTimeout(5000); // Slicer: Prevent database locks
        } catch (Exception $e) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to open suggestions database.'];
        }

        // Slicer: Ensure schema exists.
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
            $db->close();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to prepare database statement.'];
        }

        $createdAt = gmdate('c');
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

        $stmt->bindValue(':types', $typesJson, SQLITE3_TEXT);
        $stmt->bindValue(':explanation', $explanation, SQLITE3_TEXT);
        $stmt->bindValue(':created_at', $createdAt, SQLITE3_TEXT);
        $stmt->bindValue(':ip_address', $ipAddress, SQLITE3_TEXT);
        $stmt->bindValue(':user_agent', $userAgent, SQLITE3_TEXT);

        if ($stmt->execute() === false) {
            $stmt->close();
            $db->close();
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to save suggestion.'];
        }

        $stmt->close();
        $db->close();

        // Send email notification
        $this->notifyByEmail($explanation);

        return [
            'success' => true,
            'message' => 'Suggestion stored successfully.',
        ];
    }

    /** Helper to send email notification */
    private function notifyByEmail(string $explanation): void
    {
        $to = 'godie.mendoza@gmail.com';
        $subject = 'New JAJAT - Sugerencia';

        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'jajat.godieboy.com';
        // Direct link to the suggestions page using the ?page=suggestions parameter we will add to App.tsx
        $appUrl = "$protocol://$host?page=suggestions";

        $message = "Has recibido una nueva sugerencia en JAJAT.\n\n";
        $message .= "Explicación:\n$explanation\n\n";
        $message .= "Puedes ver todas las sugerencias aquí: $appUrl\n";

        $headers = "From: JAJAT <no-reply@$host>\r\n";
        $headers .= "Reply-To: no-reply@$host\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        // Use @ to suppress potential errors if mail() is not configured
        @mail($to, $subject, $message, $headers);
    }

    private function getSuggestionsDbPath(): string
    {
        return (string) (
            $this->config['paths']['suggestions_db'] ??
            (__DIR__ . '/../data/suggestions.db')
        );
    }
}
