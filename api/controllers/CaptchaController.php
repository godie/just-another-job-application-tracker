<?php
/**
 * Captcha: generate numeric challenge (GET).
 * Session-based; used before submitting suggestions.
 */
class CaptchaController
{
    private const TTL = 300; // 5 minutes

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

        try {
            $captchaValue = (string) random_int(10000, 99999);
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
            'challenge' => $captchaValue,
            'expiresIn' => self::TTL,
        ];
    }
}
