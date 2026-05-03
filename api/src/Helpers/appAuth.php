<?php

declare(strict_types=1);

namespace OverPHP\Helpers;

function app_session_start(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on'
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function app_session_get_user_id(): ?int
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return null;
    }

    $userId = $_SESSION['user_id'] ?? null;
    if ($userId === null) {
        return null;
    }

    return is_numeric($userId) ? (int) $userId : null;
}

function app_session_get_organization_id(): ?int
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return null;
    }

    $orgId = $_SESSION['organization_id'] ?? null;
    if ($orgId === null) {
        return null;
    }

    return is_numeric($orgId) ? (int) $orgId : null;
}

function app_session_get_role(): string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return 'guest';
    }

    return $_SESSION['role'] ?? 'guest';
}

function app_session_set_user(int $userId, ?int $organizationId = null, string $role = 'member'): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        app_session_start();
    }

    $_SESSION['user_id'] = $userId;
    $_SESSION['organization_id'] = $organizationId;
    $_SESSION['role'] = $role;
    $_SESSION['authenticated_at'] = time();
}

function app_session_destroy(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        session_destroy();
    }
}

function app_require_auth(): ?array
{
    app_session_start();
    $userId = app_session_get_user_id();

    if ($userId === null) {
        http_response_code(401);
        return [
            'success' => false,
            'error' => 'Authentication required',
            'message' => 'Please log in to access this resource',
        ];
    }

    return null;
}

function app_get_current_user_data(): array
{
    app_session_start();

    return [
        'user_id' => app_session_get_user_id(),
        'organization_id' => app_session_get_organization_id(),
        'role' => app_session_get_role(),
        'is_authenticated' => app_session_get_user_id() !== null,
    ];
}