<?php
/**
 * Auth cookie: set (POST), get (GET), clear (DELETE).
 * Supports:
 * - Legacy: POST with access_token (no refresh).
 * - Authorization code: POST with code + redirect_uri → exchange for access + refresh, then refresh when access expires.
 */
class AuthController
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config.php';
    }

    /** POST /auth/cookie - Store token: body is { access_token } or { code, redirect_uri } */
    public function store(): array
    {
        $json = file_get_contents('php://input') ?: '{}';
        $data = json_decode($json, true);

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        if (isset($data['code']) && is_string($data['code']) && trim($data['code']) !== '') {
            return $this->storeFromCode($data);
        }

        if (isset($data['access_token']) && is_string($data['access_token']) && trim($data['access_token']) !== '') {
            return $this->storeFromAccessToken(trim($data['access_token']));
        }

        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Missing access_token or (code + redirect_uri) in request body',
        ];
    }

    private function storeFromCode(array $data): array
    {
        // Slicer: Validate code format
        if (!is_string($data['code']) || !preg_match('/^[a-zA-Z0-9\-_.~+\/=]*$/', $data['code'])) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid code format'];
        }
        $code = trim($data['code']);
        $redirectUri = isset($data['redirect_uri']) && is_string($data['redirect_uri'])
            ? trim($data['redirect_uri'])
            : '';

        if ($redirectUri === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'redirect_uri required when using code'];
        }

        $allowed = $this->config['allowed_origins'];
        if (!in_array($redirectUri, $allowed, true)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'redirect_uri not allowed'];
        }

        $clientId = $this->config['google_client_id'] ?? '';
        $clientSecret = $this->config['google_client_secret'] ?? '';
        if ($clientId === '' || $clientSecret === '') {
            http_response_code(503);
            return ['success' => false, 'error' => 'Server OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)'];
        }

        $response = $this->exchangeCodeForTokens($code, $redirectUri, $clientId, $clientSecret);
        if (isset($response['error'])) {
            http_response_code(400);
            return ['success' => false, 'error' => $response['error']];
        }

        $accessToken = $response['access_token'] ?? '';
        $expiresIn = (int) ($response['expires_in'] ?? 3600);
        $refreshToken = $response['refresh_token'] ?? '';

        if ($accessToken === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'No access_token in Google response'];
        }

        $this->setAccessCookie($accessToken, $expiresIn);
        if ($refreshToken !== '') {
            $this->setRefreshCookie($refreshToken);
        }

        return [
            'success' => true,
            'message' => 'Cookie set successfully',
            'expires_in' => $expiresIn,
        ];
    }

    private function storeFromAccessToken(string $accessToken): array
    {
        if (!preg_match('/^[a-zA-Z0-9\-_.~+\/=]*$/', $accessToken)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid token format'];
        }

        $expiresIn = (int) ($this->config['cookie_expiry_seconds'] ?? 3600);
        $this->setAccessCookie($accessToken, $expiresIn);
        // Legacy flow: no refresh cookie

        return [
            'success' => true,
            'message' => 'Cookie set successfully',
            'expires_in' => $expiresIn,
        ];
    }

    private function exchangeCodeForTokens(string $code, string $redirectUri, string $clientId, string $clientSecret): array
    {
        $body = http_build_query([
            'code' => $code,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ]);

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $body,
                'ignore_errors' => true,
            ],
        ];
        $ctx = stream_context_create($opts);
        $result = @file_get_contents(self::TOKEN_URL, false, $ctx);

        if ($result === false) {
            return ['error' => 'Failed to exchange code with Google'];
        }

        $decoded = json_decode($result, true);
        if (!is_array($decoded)) {
            return ['error' => 'Invalid response from Google'];
        }

        if (isset($decoded['error'])) {
            $msg = $decoded['error_description'] ?? $decoded['error'];
            return ['error' => is_string($msg) ? $msg : 'Token exchange failed'];
        }

        return $decoded;
    }

    private function refreshAccessToken(string $refreshToken): array
    {
        $clientId = $this->config['google_client_id'] ?? '';
        $clientSecret = $this->config['google_client_secret'] ?? '';
        if ($clientId === '' || $clientSecret === '') {
            return ['error' => 'Server OAuth not configured'];
        }

        $body = http_build_query([
            'refresh_token' => $refreshToken,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'grant_type' => 'refresh_token',
        ]);

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $body,
                'ignore_errors' => true,
            ],
        ];
        $ctx = stream_context_create($opts);
        $result = @file_get_contents(self::TOKEN_URL, false, $ctx);

        if ($result === false) {
            return ['error' => 'Failed to refresh token'];
        }

        $decoded = json_decode($result, true);
        if (!is_array($decoded) || empty($decoded['access_token'])) {
            return ['error' => 'Invalid refresh response'];
        }

        return $decoded;
    }

    private function setAccessCookie(string $accessToken, int $expiresInSeconds): void
    {
        $name = $this->config['cookie_name'];
        $expiresAt = time() + $expiresInSeconds;
        $secure = $this->isSecure();

        $this->setCookie($name, $accessToken, $expiresAt, $secure);

        $expiresName = $this->config['access_expires_cookie_name'] ?? 'google_auth_expires';
        $this->setCookie($expiresName, (string) $expiresAt, $expiresAt, $secure);
    }

    private function setRefreshCookie(string $refreshToken): void
    {
        $name = $this->config['refresh_cookie_name'];
        $days = (int) ($this->config['refresh_cookie_days'] ?? 30);
        $expiresAt = time() + ($days * 24 * 60 * 60);
        $secure = $this->isSecure();
        $this->setCookie($name, $refreshToken, $expiresAt, $secure);
    }

    private function setCookie(string $name, string $value, int $expiresAt, bool $secure): void
    {
        if (PHP_VERSION_ID >= 70300) {
            setcookie($name, $value, [
                'expires' => $expiresAt,
                'path' => '/',
                'domain' => '',
                'secure' => $secure,
                'httponly' => true,
                'samesite' => 'Strict',
            ]);
        } else {
            $header = $name . '=' . urlencode($value);
            $header .= '; expires=' . gmdate('D, d M Y H:i:s T', $expiresAt);
            $header .= '; path=/; httponly; samesite=Strict';
            if ($secure) {
                $header .= '; secure';
            }
            header('Set-Cookie: ' . $header, false);
        }
    }

    /** GET /auth/cookie - Return current access token; refresh if expired and refresh_token present */
    public function show(): array
    {
        require_once __DIR__ . '/../helpers/auth.php';
        $accessToken = get_valid_access_token($this->config);

        if ($accessToken !== null && $accessToken !== '') {
            return [
                'success' => true,
                'access_token' => $accessToken,
                'token_type' => 'Bearer',
            ];
        }

        http_response_code(404);
        return [
            'success' => false,
            'error' => 'No authentication token found in cookies',
            'message' => 'User is not logged in or token has expired',
        ];
    }

    /** DELETE /auth/cookie - Clear all auth cookies */
    public function destroy(): array
    {
        $this->clearAllAuthCookies();
        return [
            'success' => true,
            'message' => 'Cookie cleared successfully',
        ];
    }

    private function clearAllAuthCookies(): void
    {
        $secure = $this->isSecure();
        $past = time() - 3600;

        $names = [
            $this->config['cookie_name'],
            $this->config['access_expires_cookie_name'] ?? 'google_auth_expires',
            $this->config['refresh_cookie_name'],
        ];

        foreach ($names as $name) {
            if (PHP_VERSION_ID >= 70300) {
                setcookie($name, '', [
                    'expires' => $past,
                    'path' => '/',
                    'domain' => '',
                    'secure' => $secure,
                    'httponly' => true,
                    'samesite' => 'Strict',
                ]);
            } else {
                $header = $name . '=';
                $header .= '; expires=' . gmdate('D, d M Y H:i:s T', $past);
                $header .= '; path=/; httponly; samesite=Strict';
                if ($secure) {
                    $header .= '; secure';
                }
                header('Set-Cookie: ' . $header, false);
            }
            unset($_COOKIE[$name]);
        }
    }

    private function isSecure(): bool
    {
        return (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    }
}
