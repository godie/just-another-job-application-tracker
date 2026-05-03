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
    }

    protected function tearDown(): void
    {
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
}
