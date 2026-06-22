<?php

declare(strict_types=1);

namespace OverPHP\Tests\Models;

use OverPHP\Controllers\AppAuthController;
use OverPHP\Libs\Database;
use OverPHP\Models\ModelMapper;
use OverPHP\Models\User;
use OverPHP\Repositories\AgentJobApplicationRepository;
use OverPHP\Repositories\UserRepository;
use PHPUnit\Framework\TestCase;

/**
 * Tests the user-deactivation contract on top of the FK RESTRICT on
 * agent_job_applications.user_id (and the other per-user tables).
 *
 * Contract: users are never hard-deleted because per-user rows must be
 * preserved for audit. Deactivation flips is_active = 0; login flow
 * already rejects inactive users.
 */
class ModelMapperUserDeactivationTest extends TestCase
{
    private \PDO $db;
    private ModelMapper $mapper;
    private UserRepository $userRepo;
    private AgentJobApplicationRepository $agentRepo;

    protected function setUp(): void
    {
        $this->db = new \PDO('sqlite::memory:');
        $this->db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA foreign_keys=ON;');

        // Minimal reproductions of the relevant tables. The agents table uses
        // RESTRICT to mirror api/data/schema.sql and the Phinx migration.
        $this->db->exec('
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                role VARCHAR(20) DEFAULT "member",
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP NULL
            )
        ');
        $this->db->exec('
            CREATE TABLE agent_job_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                idempotency_hash VARCHAR(64) UNIQUE NOT NULL,
                job_title VARCHAR(255) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                applied_at DATETIME NOT NULL,
                source_url TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
            )
        ');

        $config = [
            'database' => [
                'enabled' => true,
                'driver' => 'sqlite',
                'sqlite' => [
                    'path' => ':memory:',
                    'options' => [],
                ],
            ],
            'security' => ['csrf_enabled' => false],
        ];

        $database = new Database($config);
        $reflection = new \ReflectionClass($database);
        $prop = $reflection->getProperty('connection');
        $prop->setAccessible(true);
        $prop->setValue($database, $this->db);

        $this->mapper = new ModelMapper($this->db);
        $this->userRepo = new UserRepository($this->db);
        $this->agentRepo = new AgentJobApplicationRepository($this->db);

        app_session_start_clean();
    }

    protected function tearDown(): void
    {
        app_session_reset();
    }

    public function testDeleteUserFlipsIsActiveWithoutRemovingRow(): void
    {
        $userId = $this->createUser('user1@example.com', 'pw1');

        $this->assertTrue($this->mapper->deleteUser($userId));

        $row = $this->fetchUser($userId);
        $this->assertNotNull($row, 'user row must remain in the DB');
        $this->assertSame(0, (int) $row['is_active'], 'is_active must flip to 0');
    }

    public function testDeleteUserSucceedsEvenWhenUserOwnsAgentRows(): void
    {
        $userId = $this->createUser('user1@example.com', 'pw1');
        $this->createAgentRow($userId, 'h1');

        // Should NOT raise — soft-delete bypasses ON DELETE RESTRICT because
        // it is an UPDATE, not a DELETE.
        $this->assertTrue($this->mapper->deleteUser($userId));

        $row = $this->fetchUser($userId);
        $this->assertNotNull($row);
        $this->assertSame(0, (int) $row['is_active']);

        // Agent rows still exist and still point to the user_id — audit preserved.
        $count = (int) $this->db
            ->query("SELECT COUNT(*) FROM agent_job_applications WHERE user_id = {$userId}")
            ->fetchColumn();
        $this->assertSame(1, $count, 'agent audit row must survive deactivation');
    }

    public function testHardDeleteFromUsersFailsWhenAgentRowsExist(): void
    {
        $userId = $this->createUser('user2@example.com', 'pw2');
        $this->createAgentRow($userId, 'h2');

        // Should raise an FK constraint violation. PDO with ERRMODE_EXCEPTION
        // converts the SQLite constraint failure to a PDOException.
        $this->expectException(\PDOException::class);
        $this->db->exec("DELETE FROM users WHERE id = {$userId}");
    }

    public function testAppAuthLoginRejectsDeactivatedUser(): void
    {
        $userId = $this->createUser('user4@example.com', User::hashPassword('correct-horse'));
        $this->mapper->deleteUser($userId);

        $controller = $this->makeAuthController();
        $controller->mockInput = [
            'email' => 'user4@example.com',
            'password' => 'correct-horse',
        ];
        $result = $controller->login();

        $this->assertFalse($result['success']);
        $this->assertSame('Account is inactive', $result['error']);
    }

    public function testAppAuthLoginStillAllowsActiveUser(): void
    {
        $this->createUser('user5@example.com', User::hashPassword('swordfish'));

        $controller = $this->makeAuthController();
        $controller->mockInput = [
            'email' => 'user5@example.com',
            'password' => 'swordfish',
        ];
        $result = $controller->login();

        $this->assertTrue($result['success']);
        $this->assertSame('Login successful', $result['message']);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function createUser(string $email, string $passwordHash): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (email, password_hash, is_active) VALUES (:email, :hash, 1)',
        );
        $stmt->execute(['email' => $email, 'hash' => $passwordHash]);
        return (int) $this->db->lastInsertId();
    }

    private function createAgentRow(int $userId, string $hash): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO agent_job_applications
             (user_id, idempotency_hash, job_title, company_name, applied_at, source_url)
             VALUES (:uid, :h, :jt, :cn, :aa, :url)',
        );
        $stmt->execute([
            'uid' => $userId,
            'h' => $hash,
            'jt' => 'Software Engineer',
            'cn' => 'Acme',
            'aa' => '2026-01-15T10:30:00',
            'url' => 'https://example.com/jobs/123',
        ]);
    }

    private function fetchUser(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function makeAuthController(): TestableAppAuthController
    {
        // AppAuthController loads its own config via require __DIR__ . '/../../config.php';
        // we only need to inject the Database. The Testable subclass accepts it via
        // the constructor's first arg ($db) — the second ($container) is optional.
        // config.php on the test machine exists because Composer runs phpunit from
        // api/ which is the directory containing config.php.
        return new TestableAppAuthController($this->buildDatabaseFromCurrentPdo());
    }

    private function buildDatabaseFromCurrentPdo(): Database
    {
        $database = new Database([
            'database' => [
                'enabled' => true,
                'driver' => 'sqlite',
                'sqlite' => ['path' => ':memory:', 'options' => []],
            ],
        ]);
        $reflection = new \ReflectionClass($database);
        $prop = $reflection->getProperty('connection');
        $prop->setAccessible(true);
        $prop->setValue($database, $this->db);
        return $database;
    }
}

/**
 * Testable AppAuthController that exposes the request body via $mockInput.
 * Mirrors the testable pattern used in AgentJobApplicationControllerTest.
 */
class TestableAppAuthController extends AppAuthController
{
    public array $mockInput = [];

    protected function getInputJson(): array
    {
        return $this->mockInput;
    }
}

/**
 * Isolated session helpers (separate from the production app_session_*
 * which shares state with the rest of the test process).
 */
function app_session_start_clean(): void
{
    if (session_status() === \PHP_SESSION_NONE) {
        @session_start();
    }
    $_SESSION = [];
}

function app_session_reset(): void
{
    if (session_status() === \PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        session_destroy();
    }
}
