<?php

declare(strict_types=1);

namespace OverPHP\Core;

/**
 * Security helper class for OverPHP framework.
 * Provides protection against CSRF, XSS, and more.
 */
final class Security
{
    private const CSRF_TOKEN_NAME = '_csrf_token';

    private static bool $csrfEnabled = true;

    private static ?bool $isSecureCache = null;

    /** @var string Default Content Security Policy */
    private static string $csp = "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none';";

    /**
     * Set whether CSRF protection is enabled.
     */
    public static function setCsrfEnabled(bool $enabled): void
    {
        self::$csrfEnabled = $enabled;
    }

    /**
     * Check if CSRF protection is enabled.
     */
    public static function isCsrfEnabled(): bool
    {
        return self::$csrfEnabled;
    }

    /**
     * Set a custom Content Security Policy.
     */
    public static function setCsp(string $csp): void
    {
        self::$csp = $csp;
    }

    /**
     * Start a secure session if not already started.
     */
    public static function startSecureSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start([
                'cookie_httponly'  => true,
                'cookie_secure'    => self::isConnectionSecure(),
                'cookie_samesite'  => 'Lax',
                'use_strict_mode'  => true,
                'use_only_cookies' => true,
                'cookie_lifetime'  => 0,
            ]);
        }
    }

    /**
     * Regenerate session ID to prevent session fixation.
     */
    public static function regenerateSessionId(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
    }

    /**
     * Generate a new CSRF token and store it in the session.
     * Reuses an existing token if available.
     */
    public static function generateCsrfToken(): string
    {
        self::startSecureSession();

        if (isset($_SESSION[self::CSRF_TOKEN_NAME])) {
            return (string) $_SESSION[self::CSRF_TOKEN_NAME];
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION[self::CSRF_TOKEN_NAME] = $token;
        return $token;
    }

    /**
     * Validate a CSRF token against the one stored in the session.
     */
    public static function validateCsrfToken(?string $token): bool
    {
        self::startSecureSession();
        $storedToken = $_SESSION[self::CSRF_TOKEN_NAME] ?? null;

        if ($storedToken === null || $token === null) {
            return false;
        }

        return hash_equals($storedToken, $token);
    }

    /**
     * Send essential security headers.
     */
    public static function sendSecurityHeaders(): void
    {
        if (headers_sent()) {
            return;
        }

        // Prevent MIME-sniffing
        header('X-Content-Type-Options: nosniff');

        // Prevent Clickjacking
        header('X-Frame-Options: DENY');

        // Basic XSS Protection
        header('X-XSS-Protection: 1; mode=block');

        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Content Security Policy
        header("Content-Security-Policy: " . self::$csp);

        // HSTS (Strict-Transport-Security)
        if (self::isConnectionSecure()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
        }
    }

    /**
     * Sanitize output to prevent XSS.
     */
    public static function escape(string $data): string
    {
        return htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * Securely encode data to JSON.
     */
    public static function jsonEncode(mixed $data): string|false
    {
        return json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
    }

    /**
     * Helper method to determine if the current connection is secure (HTTPS).
     */
    public static function isConnectionSecure(): bool
    {
        if (self::$isSecureCache !== null) {
            return self::$isSecureCache;
        }

        return self::$isSecureCache = (
            (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
            (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
        );
    }
}
