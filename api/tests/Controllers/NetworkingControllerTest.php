<?php

declare(strict_types=1);

namespace OverPHP\Tests\Controllers;

use OverPHP\Controllers\NetworkingController;
use OverPHP\Core\Response;
use OverPHP\Libs\Database;
use PHPUnit\Framework\TestCase;

use function OverPHP\Helpers\app_session_start;

/**
 * Auth model mirrors AgentJobApplicationController: user_id is read from the
 * session, and every read/write is scoped to that owner. Cross-owner tests
 * exist alongside the single-owner happy path.
 */
final class NetworkingControllerTest extends TestCase
{
    private ?\PDO $db = null;
    private TestableNetworkingController $controller;

    protected function setUp(): void
    {
        $this->db = new \PDO('sqlite::memory:');
        $this->db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA foreign_keys = ON;');

        $this->createSchema();
        $this->createUsers();
        $this->loginAs(10);

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
        $reflection = new \ReflectionClass($database);
        $connectionProp = $reflection->getProperty('connection');
        $connectionProp->setAccessible(true);
        $connectionProp->setValue($database, $this->db);

        $this->controller = new TestableNetworkingController($database);
        http_response_code(200);
    }

    protected function tearDown(): void
    {
        if (\PHP_SESSION_ACTIVE === session_status()) {
            $_SESSION = [];
            session_destroy();
        }
        $this->db = null;
    }

    private function createSchema(): void
    {
        $this->db->exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email VARCHAR(255) UNIQUE NOT NULL)');

        // Same shape as NetworkingRepositoryTest's SQLite schema; production
        // runs the Phinx migration against MySQL.
        foreach ([
            'network_contacts' => "id VARCHAR(200) PRIMARY KEY, owner_user_id INTEGER NOT NULL, name VARCHAR(300) NOT NULL, company VARCHAR(300), role VARCHAR(300), email VARCHAR(300), phone VARCHAR(300), linkedin_url VARCHAR(2048), location VARCHAR(300), relationship_type VARCHAR(32) NOT NULL, tags_json TEXT NOT NULL, notes TEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT",
            'network_interactions' => "id VARCHAR(200) PRIMARY KEY, owner_user_id INTEGER NOT NULL, contact_id VARCHAR(200) NOT NULL, occurred_at DATETIME NOT NULL, channel VARCHAR(32) NOT NULL, summary VARCHAR(300) NOT NULL, notes TEXT NOT NULL, status VARCHAR(16) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE",
            'network_follow_up_tasks' => "id VARCHAR(200) PRIMARY KEY, owner_user_id INTEGER NOT NULL, contact_id VARCHAR(200) NOT NULL, title VARCHAR(300) NOT NULL, due_at DATETIME NOT NULL, completed_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE",
            'network_contact_links' => "id VARCHAR(200) PRIMARY KEY, owner_user_id INTEGER NOT NULL, contact_id VARCHAR(200) NOT NULL, resource_type VARCHAR(32) NOT NULL, resource_id VARCHAR(200) NOT NULL, created_at DATETIME NOT NULL, FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE",
            'network_referrals' => "id VARCHAR(200) PRIMARY KEY, owner_user_id INTEGER NOT NULL, contact_id VARCHAR(200) NOT NULL, resource_type VARCHAR(32) NOT NULL, resource_id VARCHAR(200) NOT NULL, status VARCHAR(32) NOT NULL, requested_at DATETIME NOT NULL, notes TEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT, FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE",
        ] as $table => $cols) {
            $this->db->exec("CREATE TABLE {$table} ({$cols})");
        }
    }

    private function createUsers(): void
    {
        $stmt = $this->db->prepare('INSERT INTO users (id, email) VALUES (:id, :email)');
        $stmt->execute(['id' => 10, 'email' => 'user10@example.com']);
        $stmt->execute(['id' => 11, 'email' => 'user11@example.com']);
    }

    private function loginAs(int $userId): void
    {
        app_session_start();
        $_SESSION['user_id'] = $userId;
    }

    public function testGetReturns401WithoutSession(): void
    {
        $_SESSION = [];
        if (\PHP_SESSION_ACTIVE === session_status()) {
            session_destroy();
        }

        $response = $this->controller->get();

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testGetReturnsEmptyWorkspaceForUnknownOwner(): void
    {
        // No db rows for owner 10.
        $response = $this->controller->get();

        $this->assertSame(200, $response->getStatusCode());
        $body = $response->getContent();
        $this->assertIsArray($body);
        $this->assertTrue($body['success'] ?? false);
        $this->assertSame([], $body['contacts']);
        $this->assertSame([], $body['interactions']);
        $this->assertSame([], $body['followUpTasks']);
        $this->assertSame([], $body['contactLinks']);
        $this->assertSame([], $body['referrals']);
    }

    public function testPostReturns401WithoutSession(): void
    {
        $_SESSION = [];
        if (\PHP_SESSION_ACTIVE === session_status()) {
            session_destroy();
        }
        $this->controller->mockInput = $this->validWorkspace();

        $response = $this->controller->save();

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testSaveReturns400ForMalformedJson(): void
    {
        $this->controller->simulateInvalidJson = true;

        $response = $this->controller->save();

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testSaveReturns422ForUnknownRelationshipType(): void
    {
        $payload = $this->validWorkspace();
        $payload['contacts'][0]['relationship_type'] = 'martian';
        $this->controller->mockInput = $payload;

        $response = $this->controller->save();

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSaveReturns422ForUnknownInteractionChannel(): void
    {
        $payload = $this->validWorkspace();
        $payload['interactions'][0]['channel'] = 'carrier_pigeon';
        $this->controller->mockInput = $payload;

        $response = $this->controller->save();

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSaveReturns422ForUnknownResourceType(): void
    {
        $payload = $this->validWorkspace();
        $payload['contactLinks'][0]['resource_type'] = 'resume';
        $this->controller->mockInput = $payload;

        $response = $this->controller->save();

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSaveReturns422ForMalformedIsoDate(): void
    {
        $payload = $this->validWorkspace();
        $payload['followUpTasks'][0]['due_at'] = 'tomorrow';
        $this->controller->mockInput = $payload;

        $response = $this->controller->save();

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSaveRejectsTopLevelShapeMissingKeys(): void
    {
        $this->controller->mockInput = [
            'schemaVersion' => 1,
            'contacts' => [],
            // missing interactions/followUpTasks/contactLinks/referrals
        ];

        $response = $this->controller->save();

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSavePersistsValidWorkspaceAndReturns200(): void
    {
        $this->controller->mockInput = $this->validWorkspace();

        $response = $this->controller->save();

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(
            1,
            (int) $this->db->query('SELECT COUNT(*) FROM network_contacts WHERE owner_user_id = 10')->fetchColumn(),
        );
    }

    public function testSaveDoesNotTouchOtherUsersRows(): void
    {
        // Pre-seed user 11 with a row.
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_contacts
                (id, owner_user_id, name, company, role, email, phone, linkedin_url, location,
                 relationship_type, tags_json, notes, created_at, updated_at)
            VALUES
                (:id, 11, 'Their Row', NULL, NULL, NULL, NULL, NULL, NULL, 'peer', '[]', '',
                 '2026-08-20 00:00:00', '2026-08-20 00:00:00')
        SQL);
        $stmt->execute(['id' => 'contact-11-untouched']);

        $this->controller->mockInput = $this->validWorkspace();

        $response = $this->controller->save();

        $this->assertSame(200, $response->getStatusCode());

        $preserved = (int) $this->db->query(
            "SELECT COUNT(*) FROM network_contacts WHERE id = 'contact-11-untouched'"
        )->fetchColumn();
        $this->assertSame(1, $preserved, 'user 11 row must survive user 10 save');
    }

    public function testSaveReturns422ForUnknownReferralStatus(): void
    {
        $payload = $this->validWorkspace();
        $payload['referrals'][0]['status'] = 'ghosted';
        $this->controller->mockInput = $payload;

        $response = $this->controller->save();

        $this->assertSame(422, $response->getStatusCode());
    }

    private function validWorkspace(): array
    {
        return [
            'schemaVersion' => 1,
            'contacts' => [[
                'id' => 'contact-1',
                'name' => 'Ada',
                'company' => 'Acme',
                'role' => null,
                'email' => null,
                'phone' => null,
                'linkedin_url' => null,
                'location' => null,
                'relationship_type' => 'peer',
                'tags' => [],
                'notes' => '',
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'interactions' => [[
                'id' => 'interaction-1',
                'contact_id' => 'contact-1',
                'occurred_at' => '2026-08-21T10:00:00.000Z',
                'channel' => 'email',
                'summary' => 'Intro',
                'notes' => '',
                'status' => 'completed',
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'followUpTasks' => [[
                'id' => 'task-1',
                'contact_id' => 'contact-1',
                'title' => 'Send intro',
                'due_at' => '2026-08-22T10:00:00.000Z',
                'completed_at' => null,
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'contactLinks' => [[
                'id' => 'link-1',
                'contact_id' => 'contact-1',
                'resource_type' => 'application',
                'resource_id' => 'app-1',
                'created_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'referrals' => [[
                'id' => 'referral-1',
                'contact_id' => 'contact-1',
                'resource_type' => 'opportunity',
                'resource_id' => 'opp-1',
                'status' => 'requested',
                'requested_at' => '2026-08-21T10:00:00.000Z',
                'notes' => '',
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
        ];
    }
}

/**
 * Subclass that overrides the input JSON hook so tests can feed the controller
 * payloads directly without stubbing the php://input stream.
 */
class TestableNetworkingController extends NetworkingController
{
    public mixed $mockInput = [];
    public bool $simulateInvalidJson = false;

    protected function getInputJson(): mixed
    {
        if ($this->simulateInvalidJson) {
            return null;
        }
        return is_array($this->mockInput) ? $this->mockInput : [];
    }
}
