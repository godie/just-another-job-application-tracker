<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use function OverPHP\Helpers\app_session_start;
use function OverPHP\Helpers\app_session_get_user_id;
use function OverPHP\Helpers\app_session_set_user;
use function OverPHP\Helpers\app_session_destroy;
use OverPHP\Core\Security;
use OverPHP\Models\User;
use OverPHP\Repositories\UserRepository;
use OverPHP\Libs\Database;
use OverPHP\Core\Container;

class AppAuthController
{
    private UserRepository $userRepo;
    private array $config;

    public function __construct(?Database $db = null, ?Container $container = null)
    {
        $this->config = require __DIR__ . '/../../config.php';
        $database = $db ?? $container?->make(Database::class) ?? new Database($this->config);
        $this->userRepo = new UserRepository($database->getConnection());
    }

    public function me(): array
    {
        app_session_start();
        $userId = app_session_get_user_id();

        if ($userId === null) {
            return [
                'success' => true,
                'user' => null,
                'isAuthenticated' => false,
            ];
        }

        $user = $this->userRepo->findById($userId);
        if ($user === null) {
            app_session_destroy();
            return [
                'success' => true,
                'user' => null,
                'isAuthenticated' => false,
            ];
        }

        return [
            'success' => true,
            'user' => $user->toArray(),
            'isAuthenticated' => true,
        ];
    }

    public function register(): array
    {
        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $displayName = $data['displayName'] ?? null;

        if (!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Valid email is required'];
        }

        if (!is_string($password) || strlen($password) < 8) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password must be at least 8 characters'];
        }

        $existingUser = $this->userRepo->findByEmail($email);
        if ($existingUser !== null) {
            http_response_code(409);
            return ['success' => false, 'error' => 'Email already in use'];
        }

        $passwordHash = User::hashPassword($password);
        $user = User::create(
            email: $email,
            organizationId: null,
            passwordHash: $passwordHash,
            linkedinId: null,
            googleId: null,
            username: null,
            displayName: is_string($displayName) && $displayName !== '' ? $displayName : null,
            role: 'member'
        );

        $userId = $this->userRepo->create($user);
        $this->userRepo->createDefaultPreferences($userId);

        app_session_start();
        app_session_set_user($userId, null, 'member');

        $createdUser = $this->userRepo->findById($userId);

        return [
            'success' => true,
            'user' => $createdUser?->toArray() ?? null,
            'message' => 'Registration successful',
        ];
    }

    public function login(): array
    {
        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Valid email is required'];
        }

        if (!is_string($password) || $password === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password is required'];
        }

        $user = $this->userRepo->findByEmail($email);
        if ($user === null || !$user->verifyPassword($password)) {
            http_response_code(401);
            return ['success' => false, 'error' => 'Invalid email or password'];
        }

        if (!$user->isActive) {
            http_response_code(403);
            return ['success' => false, 'error' => 'Account is inactive'];
        }

        $this->userRepo->updateLastLogin($user->id);

        app_session_start();
        Security::regenerateSessionId();
        app_session_set_user($user->id, $user->organizationId, $user->role);

        return [
            'success' => true,
            'user' => $user->toArray(),
            'message' => 'Login successful',
        ];
    }

    public function logout(): array
    {
        app_session_destroy();

        return [
            'success' => true,
            'message' => 'Logged out successfully',
        ];
    }

    protected function getInputJson(): array
    {
        $json = file_get_contents('php://input') ?: '{}';
        return json_decode($json, true) ?? [];
    }

    public function google(): array
    {
        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $googleToken = $data['googleToken'] ?? null;
        if (!is_string($googleToken) || $googleToken === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'Google token is required'];
        }

        $googleUser = $this->verifyGoogleToken($googleToken);
        if (isset($googleUser['error'])) {
            http_response_code(401);
            return ['success' => false, 'error' => $googleUser['error']];
        }

        $user = $this->userRepo->findByGoogleId($googleUser['sub']);
        if ($user === null) {
            $userByEmail = $this->userRepo->findByEmail($googleUser['email']);
            if ($userByEmail !== null) {
                $this->userRepo->updateGoogleId($userByEmail->id, $googleUser['sub']);
                $user = $this->userRepo->findById($userByEmail->id);
            } else {
                $user = User::fromGoogle($googleUser);
                $userId = $this->userRepo->create($user);
                $this->userRepo->createDefaultPreferences($userId);
                $user = $this->userRepo->findById($userId);
            }
        }

        if ($user === null) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to create or find user'];
        }

        $this->userRepo->updateLastLogin($user->id);

        Security::regenerateSessionId();
        app_session_start();
        app_session_set_user($user->id, $user->organizationId, $user->role);

        return [
            'success' => true,
            'user' => $user->toArray(),
            'message' => 'Google login successful',
        ];
    }

    public function linkedin(): array
    {
        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $code = $data['code'] ?? null;
        $redirectUri = $data['redirectUri'] ?? null;

        if (!is_string($code) || $code === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'Authorization code is required'];
        }

        if (!is_string($redirectUri) || $redirectUri === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'Redirect URI is required'];
        }

        $allowed = $this->config['allowed_origins'] ?? [];
        if (!in_array($redirectUri, $allowed, true)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Redirect URI not allowed'];
        }

        $accessToken = $this->exchangeLinkedInCodeForToken($code, $redirectUri);
        if (isset($accessToken['error'])) {
            http_response_code(401);
            return ['success' => false, 'error' => $accessToken['error']];
        }

        $linkedinUser = $this->getLinkedInUserInfo($accessToken['access_token']);
        if (isset($linkedinUser['error'])) {
            http_response_code(401);
            return ['success' => false, 'error' => $linkedinUser['error']];
        }

        $user = $this->userRepo->findByLinkedInId($linkedinUser['sub']);
        if ($user === null) {
            $userByEmail = $this->userRepo->findByEmail($linkedinUser['email']);
            if ($userByEmail !== null) {
                $this->userRepo->updateLinkedInId($userByEmail->id, $linkedinUser['sub']);
                $user = $this->userRepo->findById($userByEmail->id);
            } else {
                $user = User::fromLinkedIn($linkedinUser);
                $userId = $this->userRepo->create($user);
                $this->userRepo->createDefaultPreferences($userId);
                $user = $this->userRepo->findById($userId);
            }
        }

        if ($user === null) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Failed to create or find user'];
        }

        $this->userRepo->updateLastLogin($user->id);

        Security::regenerateSessionId();
        app_session_start();
        app_session_set_user($user->id, $user->organizationId, $user->role);

        return [
            'success' => true,
            'user' => $user->toArray(),
            'message' => 'LinkedIn login successful',
        ];
    }

    public function forgot(): array
    {
        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $email = $data['email'] ?? null;

        if (!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Valid email is required'];
        }

        $user = $this->userRepo->findByEmail($email);

        if ($user === null) {
            return [
                'success' => true,
                'message' => 'If that email exists, a reset link has been sent',
            ];
        }

        if ($user->passwordHash === null) {
            return [
                'success' => true,
                'message' => 'If that email exists, a reset link has been sent',
            ];
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600);

        $this->userRepo->saveResetToken($user->id, $token, $expiresAt);

        $resetLink = $this->buildResetLink($token);
        $this->sendPasswordResetEmail($email, $resetLink);

        return [
            'success' => true,
            'message' => 'If that email exists, a reset link has been sent',
        ];
    }

    public function reset(): array
    {
        $data = $this->getInputJson();

        if (!is_array($data)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid JSON body'];
        }

        $token = $data['token'] ?? null;
        $password = $data['password'] ?? null;

        if (!is_string($token) || $token === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'Token is required'];
        }

        if (!is_string($password) || strlen($password) < 8) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Password must be at least 8 characters'];
        }

        $user = $this->userRepo->findByResetToken($token);
        if ($user === null) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid or expired token'];
        }

        $passwordHash = User::hashPassword($password);
        $this->userRepo->updatePassword($user->id, $passwordHash);
        $this->userRepo->clearResetToken($user->id);

        return [
            'success' => true,
            'message' => 'Password has been reset successfully',
        ];
    }

    private function buildResetLink(string $token): string
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['ORIGIN'] ?? 'http://localhost:5173';
        $frontendUrl = rtrim($origin, '/');
        return $frontendUrl . '/reset-password?token=' . $token;
    }

    private function sendPasswordResetEmail(string $email, string $resetLink): void
    {
        $smtpHost = $this->config['smtp_host'] ?? null;
        if ($smtpHost === null) {
            return;
        }

        $subject = 'Reset your password';
        $message = "Click the following link to reset your password: $resetLink\n\nThis link expires in 1 hour.";
        $headers = ['From' => $this->config['smtp_from'] ?? 'noreply@example.com'];

        mail($email, $subject, $message, $headers);
    }

    protected function verifyGoogleToken(string $token): array
    {
        $clientId = $this->config['google_client_id'] ?? '';
        if ($clientId === '') {
            return ['error' => 'Google OAuth not configured'];
        }

        $opts = [
            'http' => [
                'method' => 'GET',
                'ignore_errors' => true,
            ],
        ];
        $ctx = stream_context_create($opts);
        $result = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($token), false, $ctx);

        if ($result === false) {
            return ['error' => 'Failed to verify Google token'];
        }

        $decoded = json_decode($result, true);
        if (!is_array($decoded)) {
            return ['error' => 'Invalid response from Google'];
        }

        if (isset($decoded['error'])) {
            return ['error' => $decoded['error_description'] ?? 'Invalid Google token'];
        }

        if (($decoded['aud'] ?? '') !== $clientId) {
            return ['error' => 'Token was not intended for this application'];
        }

        return [
            'sub' => $decoded['sub'] ?? '',
            'email' => $decoded['email'] ?? '',
            'name' => $decoded['name'] ?? null,
            'picture' => $decoded['picture'] ?? null,
        ];
    }

    protected function exchangeLinkedInCodeForToken(string $code, string $redirectUri): array
    {
        $clientId = $this->config['linkedin_client_id'] ?? '';
        $clientSecret = $this->config['linkedin_client_secret'] ?? '';

        if ($clientId === '' || $clientSecret === '') {
            return ['error' => 'LinkedIn OAuth not configured'];
        }

        $body = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
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
        $result = @file_get_contents('https://www.linkedin.com/oauth/v2/accessToken', false, $ctx);

        if ($result === false) {
            return ['error' => 'Failed to exchange code with LinkedIn'];
        }

        $decoded = json_decode($result, true);
        if (!is_array($decoded)) {
            return ['error' => 'Invalid response from LinkedIn'];
        }

        if (isset($decoded['error'])) {
            return ['error' => $decoded['error_description'] ?? 'Token exchange failed'];
        }

        if (empty($decoded['access_token'])) {
            return ['error' => 'No access token in LinkedIn response'];
        }

        return ['access_token' => $decoded['access_token']];
    }

    protected function getLinkedInUserInfo(string $accessToken): array
    {
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => "Authorization: Bearer $accessToken\r\n",
                'ignore_errors' => true,
            ],
        ];
        $ctx = stream_context_create($opts);
        $result = @file_get_contents('https://api.linkedin.com/v2/userinfo', false, $ctx);

        if ($result === false) {
            return ['error' => 'Failed to get LinkedIn user info'];
        }

        $decoded = json_decode($result, true);
        if (!is_array($decoded)) {
            return ['error' => 'Invalid response from LinkedIn'];
        }

        if (isset($decoded['serviceErrors']) || isset($decoded['message'])) {
            return ['error' => $decoded['message'] ?? 'Failed to get LinkedIn profile'];
        }

        return [
            'sub' => $decoded['sub'] ?? '',
            'email' => $decoded['email'] ?? '',
            'name' => $decoded['name'] ?? ($decoded['firstName'] . ' ' . ($decoded['lastName'] ?? '')),
            'picture' => $decoded['picture'] ?? null,
        ];
    }
}