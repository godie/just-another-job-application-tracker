<?php

declare(strict_types=1);

namespace OverPHP\Tests\Controllers;

use OverPHP\Controllers\AppAuthController;
use OverPHP\Libs\Database;
use OverPHP\Models\User;
use OverPHP\Repositories\UserRepository;
use PHPUnit\Framework\TestCase;

/**
 * Testable subclass that overrides external HTTP calls and input reading.
 */
class TestableAppAuthController extends AppAuthController
{
    public ?array $mockInput = null;
    public array $mockGoogleUser = [];
    public array $mockGoogleToken = [];
    public array $mockLinkedInToken = [];
    public array $mockLinkedInUser = [];

    protected function getInputJson(): array
    {
        return $this->mockInput ?? [];
    }

    protected function verifyGoogleToken(string $token): array
    {
        return $this->mockGoogleUser;
    }

    protected function exchangeGoogleCodeForToken(string $code, string $redirectUri): array
    {
        return $this->mockGoogleToken;
    }

    protected function exchangeLinkedInCodeForToken(string $code, string $redirectUri): array
    {
        return $this->mockLinkedInToken;
    }

    protected function getLinkedInUserInfo(string $accessToken): array
    {
        return $this->mockLinkedInUser;
    }
}

class AppAuthControllerTest extends TestCase
{
    private ?\PDO $db = null;
    private TestableAppAuthController $controller;

    protected function setUp(): void
    {
        $this->db = new \PDO('sqlite::memory:');
        $this->db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA foreign_keys=ON;');

        $this->createSchema();

        $config = [
            'database' => [
                'enabled' => true,
                'driver' => 'sqlite',
                'sqlite' => [
                    'path' => ':memory:',
                    'options' => [],
                ],
            ],
        ];
        $database = new Database($config);
        // Inject our in-memory PDO connection
        $reflection = new \ReflectionClass($database);
        $connectionProp = $reflection->getProperty('connection');
        $connectionProp->setAccessible(true);
        $connectionProp->setValue($database, $this->db);

        $this->controller = new TestableAppAuthController($database);
        http_response_code(200);
    }

    protected function tearDown(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];
        $this->db = null;
    }

    private function createSchema(): void
    {
        $this->db->exec('
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1
            )
        ');

        $this->db->exec('
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                organization_id INTEGER DEFAULT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                google_id TEXT UNIQUE,
                linkedin_id TEXT UNIQUE,
                username TEXT UNIQUE,
                display_name TEXT,
                avatar_url TEXT,
                is_public INTEGER DEFAULT 0,
                bio TEXT,
                role TEXT DEFAULT \'member\',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login_at TEXT
            )
        ');

        $this->db->exec('
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY,
                theme TEXT DEFAULT \'system\',
                language TEXT DEFAULT \'en\',
                preferred_view TEXT DEFAULT \'table\',
                page_size INTEGER DEFAULT 10,
                date_format TEXT DEFAULT \'YYYY-MM-DD\',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ');
    }

    private function createTestUser(
        string $email,
        ?string $password = null,
        ?string $googleId = null,
        ?string $linkedinId = null,
        string $displayName = 'Test User',
    ): User {
        $passwordHash = $password !== null ? User::hashPassword($password) : null;
        $user = User::create(
            email: $email,
            passwordHash: $passwordHash,
            googleId: $googleId,
            linkedinId: $linkedinId,
            displayName: $displayName,
        );

        $repo = new UserRepository($this->db);
        $userId = $repo->create($user);
        return $repo->findById($userId);
    }

    public function testLoginRegeneratesSessionId(): void
    {
        $user = $this->createTestUser('session-test@example.com', 'oldpassword123');
        $this->controller->mockInput = [
            'email' => 'session-test@example.com',
            'password' => 'oldpassword123',
        ];

        $_SESSION = [];

        $sessionIdBefore = session_id();
        $result = $this->controller->login();
        $sessionIdAfter = session_id();

        $this->assertTrue($result['success']);
        $this->assertNotEquals($sessionIdBefore, $sessionIdAfter, 'Session ID should be regenerated after login');
    }

    public function testGoogleLoginAutoCreatesUserWhenEmailNotFound(): void
    {
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-user-123',
            'email' => 'newgoogleuser@example.com',
            'name' => 'New Google User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        $this->assertTrue($result['success']);
        $this->assertEquals('Google login successful', $result['message']);
        $this->assertNotNull($result['user']);
        $this->assertEquals('newgoogleuser@example.com', $result['user']['email']);
        $this->assertEquals('New Google User', $result['user']['displayName']);

        // Verify user was actually created in the database with google_id
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findByGoogleId('google-user-123');
        $this->assertNotNull($dbUser);
        $this->assertEquals('newgoogleuser@example.com', $dbUser->email);
    }

    public function testGoogleLoginLinksExistingUserByEmail(): void
    {
        // Create an existing user with email/password (no google_id)
        $existingUser = $this->createTestUser('existing@example.com', 'password123');
        $this->assertNull($existingUser->googleId);

        // Now simulate Google login with same email
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-linked-456',
            'email' => 'existing@example.com',
            'name' => 'Existing User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        $this->assertTrue($result['success']);
        $this->assertEquals('Google login successful', $result['message']);
        $this->assertEquals($existingUser->id, $result['user']['id']);

        // Verify the google_id was linked
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findById($existingUser->id);
        $this->assertNotNull($dbUser);
        $this->assertEquals('google-linked-456', $dbUser->googleId);

        // Verify subsequent login finds user directly by google_id
        $this->controller->mockGoogleUser = [
            'sub' => 'google-linked-456',
            'email' => 'existing@example.com',
            'name' => 'Existing User',
        ];
        $result2 = $this->controller->google();
        $this->assertTrue($result2['success']);
        $this->assertEquals($existingUser->id, $result2['user']['id']);
    }

    public function testGoogleLoginReturnsErrorForInvalidToken(): void
    {
        $this->controller->mockInput = ['googleToken' => 'invalid-token'];
        $this->controller->mockGoogleUser = ['error' => 'Invalid Google token'];

        $result = $this->controller->google();

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid Google token', $result['error']);
    }

    public function testLinkedInLoginAutoCreatesUserWhenEmailNotFound(): void
    {
        $this->controller->mockInput = [
            'code' => 'mock-linkedin-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockLinkedInToken = ['access_token' => 'mock-access-token'];
        $this->controller->mockLinkedInUser = [
            'sub' => 'linkedin-user-789',
            'email' => 'newlinkedinuser@example.com',
            'name' => 'New LinkedIn User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->linkedin();

        $this->assertTrue($result['success']);
        $this->assertEquals('LinkedIn login successful', $result['message']);
        $this->assertNotNull($result['user']);
        $this->assertEquals('newlinkedinuser@example.com', $result['user']['email']);

        // Verify user was created with linkedin_id
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findByLinkedInId('linkedin-user-789');
        $this->assertNotNull($dbUser);
        $this->assertEquals('newlinkedinuser@example.com', $dbUser->email);
    }

    public function testLinkedInLoginLinksExistingUserByEmail(): void
    {
        // Create an existing user with email/password (no linkedin_id)
        $existingUser = $this->createTestUser('existing-linkedin@example.com', 'password123');
        $this->assertNull($existingUser->linkedinId);

        // Now simulate LinkedIn login with same email
        $this->controller->mockInput = [
            'code' => 'mock-linkedin-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockLinkedInToken = ['access_token' => 'mock-access-token'];
        $this->controller->mockLinkedInUser = [
            'sub' => 'linkedin-linked-012',
            'email' => 'existing-linkedin@example.com',
            'name' => 'Existing LinkedIn User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->linkedin();

        $this->assertTrue($result['success']);
        $this->assertEquals('LinkedIn login successful', $result['message']);
        $this->assertEquals($existingUser->id, $result['user']['id']);

        // Verify the linkedin_id was linked
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findById($existingUser->id);
        $this->assertNotNull($dbUser);
        $this->assertEquals('linkedin-linked-012', $dbUser->linkedinId);

        // Verify subsequent login finds user directly by linkedin_id
        $this->controller->mockLinkedInUser = [
            'sub' => 'linkedin-linked-012',
            'email' => 'existing-linkedin@example.com',
            'name' => 'Existing LinkedIn User',
        ];
        $result2 = $this->controller->linkedin();
        $this->assertTrue($result2['success']);
        $this->assertEquals($existingUser->id, $result2['user']['id']);
    }

    public function testLinkedInLoginReturnsErrorForInvalidCode(): void
    {
        $this->controller->mockInput = [
            'code' => 'invalid-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockLinkedInToken = ['error' => 'Invalid authorization code'];

        $result = $this->controller->linkedin();

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid authorization code', $result['error']);
    }

    public function testGoogleLoginRegeneratesSessionId(): void
    {
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-session-test',
            'email' => 'session-google@example.com',
            'name' => 'Session Test',
        ];

        $_SESSION = [];

        $sessionIdBefore = session_id();
        $result = $this->controller->google();
        $sessionIdAfter = session_id();

        $this->assertTrue($result['success']);
        $this->assertNotEquals($sessionIdBefore, $sessionIdAfter, 'Session ID should be regenerated after Google login');
    }

    public function testLinkedInLoginRegeneratesSessionId(): void
    {
        $this->controller->mockInput = [
            'code' => 'mock-linkedin-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockLinkedInToken = ['access_token' => 'mock-access-token'];
        $this->controller->mockLinkedInUser = [
            'sub' => 'linkedin-session-test',
            'email' => 'session-linkedin@example.com',
            'name' => 'Session Test',
        ];

        $_SESSION = [];

        $sessionIdBefore = session_id();
        $result = $this->controller->linkedin();
        $sessionIdAfter = session_id();

        $this->assertTrue($result['success']);
        $this->assertNotEquals($sessionIdBefore, $sessionIdAfter, 'Session ID should be regenerated after LinkedIn login');
    }

    public function testGoogleLoginExistingUserByGoogleId(): void
    {
        // Create a user that already has a google_id set
        $existingUser = $this->createTestUser(
            email: 'google-existing@example.com',
            password: 'password123',
            googleId: 'google-direct-789',
        );
        $this->assertEquals('google-direct-789', $existingUser->googleId);

        // Simulate Google login with same google_id — should find user directly
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-direct-789',
            'email' => 'google-existing@example.com',
            'name' => 'Updated Name',
            'picture' => 'https://example.com/new.jpg',
        ];

        $result = $this->controller->google();

        $this->assertTrue($result['success']);
        $this->assertEquals('Google login successful', $result['message']);
        $this->assertEquals($existingUser->id, $result['user']['id']);
        $this->assertEquals('google-existing@example.com', $result['user']['email']);

        // Verify no duplicate user was created
        $repo = new UserRepository($this->db);
        $allUsers = $repo->findByEmail('google-existing@example.com');
        $this->assertNotNull($allUsers);
        $this->assertEquals($existingUser->id, $allUsers->id);
    }

    public function testLinkedInLoginExistingUserByLinkedInId(): void
    {
        // Create a user that already has a linkedin_id set
        $existingUser = $this->createTestUser(
            email: 'linkedin-existing@example.com',
            password: 'password123',
            linkedinId: 'linkedin-direct-321',
        );
        $this->assertEquals('linkedin-direct-321', $existingUser->linkedinId);

        // Simulate LinkedIn login with same linkedin_id — should find user directly
        $this->controller->mockInput = [
            'code' => 'mock-linkedin-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockLinkedInToken = ['access_token' => 'mock-access-token'];
        $this->controller->mockLinkedInUser = [
            'sub' => 'linkedin-direct-321',
            'email' => 'linkedin-existing@example.com',
            'name' => 'Updated Name',
            'picture' => 'https://example.com/new.jpg',
        ];

        $result = $this->controller->linkedin();

        $this->assertTrue($result['success']);
        $this->assertEquals('LinkedIn login successful', $result['message']);
        $this->assertEquals($existingUser->id, $result['user']['id']);
        $this->assertEquals('linkedin-existing@example.com', $result['user']['email']);

        // Verify no duplicate user was created
        $repo = new UserRepository($this->db);
        $allUsers = $repo->findByEmail('linkedin-existing@example.com');
        $this->assertNotNull($allUsers);
        $this->assertEquals($existingUser->id, $allUsers->id);
    }

    public function testOAuthLoginUpdatesLastLoginTimestamp(): void
    {
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-lastlogin-test',
            'email' => 'lastlogin@example.com',
            'name' => 'Last Login Test',
        ];

        // First login — creates the user
        $result = $this->controller->google();
        $this->assertTrue($result['success']);

        $repo = new UserRepository($this->db);
        $userAfterFirstLogin = $repo->findByGoogleId('google-lastlogin-test');
        $this->assertNotNull($userAfterFirstLogin);
        $this->assertNotNull($userAfterFirstLogin->lastLoginAt, 'lastLoginAt should be set after first login');

        // Force an old timestamp so the next update is guaranteed to be greater
        $this->db->prepare(
            'UPDATE users SET last_login_at = :old WHERE google_id = :gid'
        )->execute([
            ':old' => '2000-01-01 00:00:00',
            ':gid' => 'google-lastlogin-test',
        ]);

        // Ensure no active session so the second call is treated as login, not link
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];

        // Second login — should update last_login_at
        $result2 = $this->controller->google();
        $this->assertTrue($result2['success']);

        $userAfterSecondLogin = $repo->findByGoogleId('google-lastlogin-test');
        $this->assertNotNull($userAfterSecondLogin);
        $this->assertNotNull($userAfterSecondLogin->lastLoginAt, 'lastLoginAt should be set after second login');
        $this->assertGreaterThan(
            '2000-01-01 00:00:00',
            $userAfterSecondLogin->lastLoginAt,
            'lastLoginAt should be updated on subsequent login'
        );
    }

    // ── Task 5.3: Link Google account tests ────────────────────────────

    /**
     * With active session and free google_id: verify linking succeeds
     * and returns success:true with the updated user (Property 5).
     * Requirements: 3.2, 3.5
     */
    public function testLinkGoogleWithActiveSessionLinksSuccessfully(): void
    {
        // Create a user without google_id
        $user = $this->createTestUser('link-test@example.com', 'password123');
        $this->assertNull($user->googleId);

        // Set up active session as this user
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $_SESSION['user_id'] = $user->id;

        // Mock Google token and user info
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-link-new-456',
            'email' => 'link-test@example.com',
            'name' => 'Link Test User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        // Assert successful linking
        $this->assertTrue($result['success']);
        $this->assertEquals('Google account linked successfully', $result['message']);
        $this->assertNotNull($result['user']);
        $this->assertEquals($user->id, $result['user']['id']);
        $this->assertEquals('google-link-new-456', $result['user']['googleId']);

        // Verify the google_id was persisted in the database
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findById($user->id);
        $this->assertNotNull($dbUser);
        $this->assertEquals('google-link-new-456', $dbUser->googleId);

        // Clean up session
        session_destroy();
        $_SESSION = [];
    }

    /**
     * With active session and google_id already in use by another user:
     * should return 409 conflict (Req 3.3).
     * Requirements: 3.2, 3.3
     */
    public function testLinkGoogleReturns409WhenGoogleIdAlreadyInUse(): void
    {
        // Create user A: the session user (no google_id)
        $userA = $this->createTestUser('user-a@example.com', 'password123');
        $this->assertNull($userA->googleId);

        // Create user B: already has the google_id we are trying to link
        $userB = $this->createTestUser(
            email: 'user-b@example.com',
            password: 'password456',
            googleId: 'google-conflict-789',
        );
        $this->assertEquals('google-conflict-789', $userB->googleId);

        // Set up active session as user A
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $_SESSION['user_id'] = $userA->id;

        // Mock Google token — same sub as user B's google_id
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-conflict-789',
            'email' => 'user-a@example.com',
            'name' => 'User A',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        // Assert 409 conflict
        $this->assertFalse($result['success']);
        $this->assertEquals(
            'Esta cuenta de Google ya está vinculada a otro usuario',
            $result['error']
        );
        $this->assertEquals(409, http_response_code());

        // Verify user A's google_id was NOT changed
        $repo = new UserRepository($this->db);
        $dbUserA = $repo->findById($userA->id);
        $this->assertNotNull($dbUserA);
        $this->assertNull($dbUserA->googleId, 'User A google_id should remain null after conflict');

        // Clean up session
        session_destroy();
        $_SESSION = [];
    }

    /**
     * Without active session: the method should proceed to the normal
     * OAuth login flow (auto-create or find user) — Req 3.4.
     * Requirements: 3.4
     */
    public function testGoogleWithoutActiveSessionProceedsToNormalLogin(): void
    {
        // Ensure no active session
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];

        // Mock Google token for a brand new user
        $this->controller->mockInput = ['googleToken' => 'mock-google-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-login-no-session',
            'email' => 'nosession@example.com',
            'name' => 'No Session User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        // Should behave as normal login (handleOAuthLogin path)
        $this->assertTrue($result['success']);
        $this->assertEquals('Google login successful', $result['message']);
        $this->assertNotNull($result['user']);
        $this->assertEquals('nosession@example.com', $result['user']['email']);
        $this->assertEquals('No Session User', $result['user']['displayName']);

        // Verify user was created with google_id
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findByGoogleId('google-login-no-session');
        $this->assertNotNull($dbUser);
        $this->assertEquals('nosession@example.com', $dbUser->email);

        // Clean up
        session_destroy();
        $_SESSION = [];
    }

    /**
     * Missing googleToken in request body returns 400.
     * Requirements: 3.5
     */
    public function testGoogleReturns400WhenGoogleTokenIsMissing(): void
    {
        $this->controller->mockInput = ['someOtherField' => 'value'];

        $result = $this->controller->google();

        $this->assertFalse($result['success']);
        $this->assertEquals('Google token is required', $result['error']);
        $this->assertEquals(400, http_response_code());
    }

    /**
     * Empty googleToken in request body also returns 400.
     * Requirements: 3.5
     */
    public function testGoogleReturns400WhenGoogleTokenIsEmpty(): void
    {
        $this->controller->mockInput = ['googleToken' => ''];

        $result = $this->controller->google();

        $this->assertFalse($result['success']);
        $this->assertEquals('Google token is required', $result['error']);
        $this->assertEquals(400, http_response_code());
    }

    /**
     * When redirectUri is provided, the backend should exchange the auth code
     * for an ID token before verifying.
     * Requirements: 3.5
     */
    public function testGoogleLoginWithAuthCodeExchangesAndCreatesUser(): void
    {
        // Simulate auth-code flow: input has both googleToken (code) and redirectUri
        $this->controller->mockInput = [
            'googleToken' => '4/0Agoogle-auth-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        // Mock exchange returning an ID token
        $this->controller->mockGoogleToken = ['id_token' => 'exchanged-id-token'];
        // Mock ID token verification result
        $this->controller->mockGoogleUser = [
            'sub' => 'google-code-flow-123',
            'email' => 'codeflow@example.com',
            'name' => 'Code Flow User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        $this->assertTrue($result['success']);
        $this->assertEquals('Google login successful', $result['message']);
        $this->assertNotNull($result['user']);
        $this->assertEquals('codeflow@example.com', $result['user']['email']);

        // Verify user was created with google_id
        $repo = new UserRepository($this->db);
        $dbUser = $repo->findByGoogleId('google-code-flow-123');
        $this->assertNotNull($dbUser);
        $this->assertEquals('codeflow@example.com', $dbUser->email);
    }

    /**
     * When redirectUri is provided but code exchange fails, return 401.
     */
    public function testGoogleLoginWithAuthCodeExchangeFailureReturns401(): void
    {
        $this->controller->mockInput = [
            'googleToken' => 'invalid-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockGoogleToken = ['error' => 'Invalid authorization code'];

        $result = $this->controller->google();

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid authorization code', $result['error']);
        $this->assertEquals(401, http_response_code());
    }

    /**
     * Link Google account via auth-code flow (redirectUri provided).
     */
    public function testLinkGoogleWithAuthCodeFlowLinksSuccessfully(): void
    {
        $user = $this->createTestUser('link-code@example.com', 'password123');
        $this->assertNull($user->googleId);

        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $_SESSION['user_id'] = $user->id;

        $this->controller->mockInput = [
            'googleToken' => '4/0Agoogle-link-code',
            'redirectUri' => 'http://localhost:5173',
        ];
        $this->controller->mockGoogleToken = ['id_token' => 'exchanged-link-token'];
        $this->controller->mockGoogleUser = [
            'sub' => 'google-link-code-456',
            'email' => 'link-code@example.com',
            'name' => 'Link Code User',
            'picture' => 'https://example.com/photo.jpg',
        ];

        $result = $this->controller->google();

        $this->assertTrue($result['success']);
        $this->assertEquals('Google account linked successfully', $result['message']);
        $this->assertNotNull($result['user']);
        $this->assertEquals('google-link-code-456', $result['user']['googleId']);

        session_destroy();
        $_SESSION = [];
    }

    /**
     * exchangeGoogleCodeForToken returns 'Redirect URI not allowed' when
     * redirectUri is not in allowed_origins (mirrors LinkedIn behavior).
     * Requirements: 3.5
     */
    public function testExchangeGoogleCodeRejectsRedirectUriNotInAllowedOrigins(): void
    {
        // Use reflection to inject a limited allowed_origins config
        // so we can test the real exchangeGoogleCodeForToken method
        $testConfig = $this->config;
        $testConfig['allowed_origins'] = ['https://trusted.example.com'];
        $testConfig['google_client_id'] = 'test-client-id';
        $testConfig['google_client_secret'] = 'test-client-secret';

        // config is on the parent AppAuthController, not TestableAppAuthController
        $reflection = new \ReflectionClass(AppAuthController::class);
        $configProp = $reflection->getProperty('config');
        $configProp->setAccessible(true);
        $configProp->setValue($this->controller, $testConfig);

        // Attempt exchange with an untrusted redirectUri
        // Use reflection to invoke the protected method
        $method = $reflection->getMethod('exchangeGoogleCodeForToken');
        $method->setAccessible(true);
        $result = $method->invoke($this->controller, 'any-auth-code', 'https://evil.attacker.com');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('error', $result);
        $this->assertEquals('Redirect URI not allowed', $result['error']);
    }
}
