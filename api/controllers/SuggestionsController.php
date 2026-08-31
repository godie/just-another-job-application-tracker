<?php
/**
 * Suggestions: submit with captcha validation (POST).
 * Stores in SQLite.
 */
class SuggestionsController
{
    private const MAX_BODY_BYTES = 1_000_000;
    private const MAX_TYPES = 20;
    private const MAX_TYPE_LENGTH = 100;
    private const MAX_CAPTCHA_ATTEMPTS = 5;

    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config.php';
    }

    /** GET /suggestions - List all suggestions */
    public function index(): array
    {
        $authError = $this->requireAdmin();
        if ($authError !== null) {
            return $authError;
        }

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

        $payload = $this->getInputJson();

        if (!is_array($payload)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON payload.'];
        }

        $types = $payload['types'] ?? [];
        if (!is_array($types) || count($types) > self::MAX_TYPES) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Types must contain at most 20 items.'];
        }
        $types = array_values(array_filter(array_map(function ($item) {
            if (!is_string($item)) {
                return null;
            }
            $s = trim(strip_tags($item));
            if ($s === '' || mb_strlen($s) > self::MAX_TYPE_LENGTH) {
                return null;
            }
            return $s;
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
        $attempts = (int) ($captchaData['attempts'] ?? 0);

        if ($attempts >= self::MAX_CAPTCHA_ATTEMPTS) {
            unset($_SESSION['captchas'][$captchaId]);
            http_response_code(429);
            return ['success' => false, 'error' => 'Too many captcha attempts. Please request a new challenge.'];
        }

        if ($expiresAt < time()) {
            unset($_SESSION['captchas'][$captchaId]);
            http_response_code(400);
            return ['success' => false, 'error' => 'Captcha expired. Please try again.'];
        }

        if ($captchaAnswer !== (string) $expectedAnswer) {
            $attempts++;
            if ($attempts >= self::MAX_CAPTCHA_ATTEMPTS) {
                unset($_SESSION['captchas'][$captchaId]);
                http_response_code(429);
                return ['success' => false, 'error' => 'Too many captcha attempts. Please request a new challenge.'];
            }

            $_SESSION['captchas'][$captchaId]['attempts'] = $attempts;
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

        // Never derive links or mail headers from HTTP_HOST: it is request
        // input and can be poisoned to send administrators attacker-controlled
        // links or inject header content. Use deployment configuration only.
        $appUrl = rtrim((string) ($this->config['frontend_url'] ?? 'http://localhost:5173'), '/') . '?page=suggestions';
        $from = (string) ($this->config['smtp_from'] ?? 'noreply@jajat.godieboy.com');
        if (filter_var($from, FILTER_VALIDATE_EMAIL) === false) {
            $from = 'noreply@jajat.godieboy.com';
        }

        $message = "Has recibido una nueva sugerencia en JAJAT.\n\n";
        $message .= "Explicación:\n$explanation\n\n";
        $message .= "Puedes ver todas las sugerencias aquí: $appUrl\n";

        $headers = "From: JAJAT <{$from}>\r\n";
        $headers .= "Reply-To: {$from}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        // Use @ to suppress potential errors if mail() is not configured
        @mail($to, $subject, $message, $headers);
    }

    private function requireAdmin(): ?array
    {
        \OverPHP\Helpers\app_session_start();
        if (\OverPHP\Helpers\app_session_get_user_id() === null) {
            http_response_code(401);
            return ['success' => false, 'error' => 'Authentication required'];
        }
        if (!in_array(\OverPHP\Helpers\app_session_get_role(), ['owner', 'admin'], true)) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Administrator access required'];
        }
        return null;
    }

    protected function getInputJson(): mixed
    {
        $rawInput = file_get_contents('php://input', false, null, 0, self::MAX_BODY_BYTES + 1);
        if ($rawInput === false || $rawInput === '' || strlen($rawInput) > self::MAX_BODY_BYTES) {
            return null;
        }

        try {
            return json_decode($rawInput, true, 16, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return null;
        }
    }

    private function getSuggestionsDbPath(): string
    {
        return (string) (
            $this->config['paths']['suggestions_db'] ??
            (__DIR__ . '/../data/suggestions.db')
        );
    }
}
