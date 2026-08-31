<?php
/**
 * Captcha: generate numeric challenge (GET).
 * Session-based; used before submitting suggestions.
 */
class CaptchaController
{
    private const TTL = 300; // 5 minutes
    private const MAX_ACTIVE_CAPTCHAS = 10;
    private const MAX_ATTEMPTS = 5;

    /** GET /captcha - Generate new captcha */
    public function index(): array
    {
        if (!isset($_SESSION['captchas']) || !is_array($_SESSION['captchas'])) {
            $_SESSION['captchas'] = [];
        }

        $now = time();
        foreach ($_SESSION['captchas'] as $id => $captcha) {
            if (!is_array($captcha) || ($captcha['expiresAt'] ?? 0) < $now) {
                unset($_SESSION['captchas'][$id]);
            }
        }

        if (count($_SESSION['captchas']) >= self::MAX_ACTIVE_CAPTCHAS) {
            array_shift($_SESSION['captchas']);
        }

        try {
            $left = random_int(100, 999);
            $right = random_int(1, 99);
            $captchaValue = (string) ($left + $right);
            $captchaId = bin2hex(random_bytes(16));
        } catch (Exception $e) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to generate captcha.'];
        }

        $_SESSION['captchas'][$captchaId] = [
            'answer' => $captchaValue,
            'expiresAt' => $now + self::TTL,
        ];

        return [
            'success' => true,
            'captchaId' => $captchaId,
            // The answer stays in the server-side session; the client only
            // receives the question, not the value it must submit.
            'challenge' => "{$left} + {$right} = ?",
            'expiresIn' => self::TTL,
        ];
    }
}
