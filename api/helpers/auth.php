<?php
/**
 * Resolve a valid Google OAuth access token from cookies, refreshing if expired.
 * Use this wherever the backend needs to call Google APIs (Sheets, etc.) so the token is always valid.
 *
 * @param array $config From config.php (cookie_name, access_expires_cookie_name, refresh_cookie_name, etc.)
 * @return string|null Valid access token or null if not logged in / refresh failed
 */
function get_valid_access_token(array $config): ?string
{
    $name = $config['cookie_name'] ?? 'google_auth_token';
    $expiresName = $config['access_expires_cookie_name'] ?? 'google_auth_expires';
    $refreshName = $config['refresh_cookie_name'] ?? 'google_refresh_token';

    $accessToken = isset($_COOKIE[$name]) && is_string($_COOKIE[$name]) ? trim($_COOKIE[$name]) : '';
    $expiresAt = isset($_COOKIE[$expiresName]) && is_string($_COOKIE[$expiresName])
        ? (int) $_COOKIE[$expiresName]
        : 0;
    $refreshToken = isset($_COOKIE[$refreshName]) && is_string($_COOKIE[$refreshName]) ? trim($_COOKIE[$refreshName]) : '';

    $now = time();
    $accessValid = $accessToken !== '' && $expiresAt > $now + 60;

    if ($accessValid && preg_match('/^[a-zA-Z0-9\-_.~+\/=]*$/', $accessToken)) {
        return $accessToken;
    }

    if ($refreshToken === '') {
        return null;
    }

    $refreshed = auth_refresh_token($refreshToken, $config);
    if (isset($refreshed['error'])) {
        auth_clear_cookies($config);
        return null;
    }

    $expiresIn = (int) ($refreshed['expires_in'] ?? 3600);
    auth_set_access_cookies($refreshed['access_token'], $expiresIn, $config);
    return $refreshed['access_token'];
}

/**
 * Exchange refresh_token for new access_token.
 *
 * @return array{access_token: string, expires_in?: int}|array{error: string}
 */
function auth_refresh_token(string $refreshToken, array $config): array
{
    $clientId = $config['google_client_id'] ?? '';
    $clientSecret = $config['google_client_secret'] ?? '';
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
    $result = @file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);

    if ($result === false) {
        return ['error' => 'Failed to refresh token'];
    }

    $decoded = json_decode($result, true);
    if (!is_array($decoded) || empty($decoded['access_token'])) {
        return ['error' => 'Invalid refresh response'];
    }

    return $decoded;
}

function auth_set_access_cookies(string $accessToken, int $expiresInSeconds, array $config): void
{
    $name = $config['cookie_name'] ?? 'google_auth_token';
    $expiresName = $config['access_expires_cookie_name'] ?? 'google_auth_expires';
    $expiresAt = time() + $expiresInSeconds;
    $secure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    auth_set_cookie($name, $accessToken, $expiresAt, $secure);
    auth_set_cookie($expiresName, (string) $expiresAt, $expiresAt, $secure);
}

function auth_set_cookie(string $name, string $value, int $expiresAt, bool $secure): void
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

function auth_clear_cookies(array $config): void
{
    $secure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $past = time() - 3600;

    $names = [
        $config['cookie_name'] ?? 'google_auth_token',
        $config['access_expires_cookie_name'] ?? 'google_auth_expires',
        $config['refresh_cookie_name'] ?? 'google_refresh_token',
    ];

    foreach ($names as $n) {
        if (PHP_VERSION_ID >= 70300) {
            setcookie($n, '', [
                'expires' => $past,
                'path' => '/',
                'domain' => '',
                'secure' => $secure,
                'httponly' => true,
                'samesite' => 'Strict',
            ]);
        } else {
            $header = $n . '=';
            $header .= '; expires=' . gmdate('D, d M Y H:i:s T', $past);
            $header .= '; path=/; httponly; samesite=Strict';
            if ($secure) {
                $header .= '; secure';
            }
            header('Set-Cookie: ' . $header, false);
        }
        unset($_COOKIE[$n]);
    }
}
