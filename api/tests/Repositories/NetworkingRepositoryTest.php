<?php

declare(strict_types=1);

namespace OverPHP\Tests\Repositories;

use OverPHP\Repositories\NetworkingRepository;
use PHPUnit\Framework\TestCase;
use PDO;

/**
 * Tests for NetworkingRepository. SQLite in-memory fixture mirrors the
 * Phinx migration shape so the SQL exercised here is what the production
 * MySQL path will see (modulo MySQL-only types).
 */
final class NetworkingRepositoryTest extends TestCase
{
    private PDO $db;
    private NetworkingRepository $repo;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA foreign_keys = ON;');

        $this->createSchema();
        $this->createUsers();
        $this->seedBaselineRows();
        $this->repo = new NetworkingRepository($this->db);
    }

    private function createSchema(): void
    {
        $this->db->exec(<<<'SQL'
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL
            )
        SQL);

        // Mirror of db/migrations/20260729090000_CreateNetworkingCrmTables.php
        // for SQLite. Production runs the Phinx migration against MySQL.
        $this->db->exec(<<<'SQL'
            CREATE TABLE network_contacts (
                id VARCHAR(200) PRIMARY KEY,
                owner_user_id INTEGER NOT NULL,
                name VARCHAR(300) NOT NULL,
                company VARCHAR(300),
                role VARCHAR(300),
                email VARCHAR(300),
                phone VARCHAR(300),
                linkedin_url VARCHAR(2048),
                location VARCHAR(300),
                relationship_type VARCHAR(32) NOT NULL,
                tags_json TEXT NOT NULL,
                notes TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
            )
        SQL);

        $this->db->exec(<<<'SQL'
            CREATE TABLE network_interactions (
                id VARCHAR(200) PRIMARY KEY,
                owner_user_id INTEGER NOT NULL,
                contact_id VARCHAR(200) NOT NULL,
                occurred_at DATETIME NOT NULL,
                channel VARCHAR(32) NOT NULL,
                summary VARCHAR(300) NOT NULL,
                notes TEXT NOT NULL,
                status VARCHAR(16) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE
            )
        SQL);

        $this->db->exec(<<<'SQL'
            CREATE TABLE network_follow_up_tasks (
                id VARCHAR(200) PRIMARY KEY,
                owner_user_id INTEGER NOT NULL,
                contact_id VARCHAR(200) NOT NULL,
                title VARCHAR(300) NOT NULL,
                due_at DATETIME NOT NULL,
                completed_at DATETIME,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE
            )
        SQL);

        $this->db->exec(<<<'SQL'
            CREATE TABLE network_contact_links (
                id VARCHAR(200) PRIMARY KEY,
                owner_user_id INTEGER NOT NULL,
                contact_id VARCHAR(200) NOT NULL,
                resource_type VARCHAR(32) NOT NULL,
                resource_id VARCHAR(200) NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE
            )
        SQL);

        $this->db->exec(<<<'SQL'
            CREATE TABLE network_referrals (
                id VARCHAR(200) PRIMARY KEY,
                owner_user_id INTEGER NOT NULL,
                contact_id VARCHAR(200) NOT NULL,
                resource_type VARCHAR(32) NOT NULL,
                resource_id VARCHAR(200) NOT NULL,
                status VARCHAR(32) NOT NULL,
                requested_at DATETIME NOT NULL,
                notes TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (contact_id) REFERENCES network_contacts(id) ON DELETE CASCADE
            )
        SQL);
    }

    private function createUsers(): void
    {
        $stmt = $this->db->prepare('INSERT INTO users (id, email) VALUES (:id, :email)');
        $stmt->execute(['id' => 10, 'email' => 'user10@example.com']);
        $stmt->execute(['id' => 11, 'email' => 'user11@example.com']);
    }

    /**
     * Seed baseline rows for user 11 so a replaceWorkspace(10, …) call cannot
     * physically affect user 11 — the assertions then verify "untouched".
     */
    private function seedBaselineRows(): void
    {
        $this->insertContact(
            ownerUserId: 11,
            id: 'contact-11-original',
            name: 'Other User Contact',
            relationshipType: 'peer',
        );
        $this->insertContact(
            ownerUserId: 10,
            id: 'contact-10-original',
            name: 'My Existing Contact',
            relationshipType: 'mentor',
        );
    }

    private function insertContact(
        int $ownerUserId,
        string $id,
        string $name,
        string $relationshipType,
    ): void {
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_contacts
                (id, owner_user_id, name, relationship_type, tags_json, notes, created_at, updated_at)
            VALUES
                (:id, :owner_user_id, :name, :relationship_type, '[]', '', '2026-08-20 12:00:00', '2026-08-20 12:00:00')
        SQL);
        $stmt->execute([
            'id' => $id,
            'owner_user_id' => $ownerUserId,
            'name' => $name,
            'relationship_type' => $relationshipType,
        ]);
    }

    public function testGetWorkspaceReturnsOnlyOwnersRows(): void
    {
        $workspace = $this->repo->getWorkspace(10);

        $this->assertSame(1, count($workspace['contacts']));
        $this->assertSame('contact-10-original', $workspace['contacts'][0]['id']);
    }

    public function testGetWorkspaceNeverLeaksOtherOwnersRows(): void
    {
        $workspace = $this->repo->getWorkspace(10);

        $ids = array_column($workspace['contacts'], 'id');
        $this->assertNotContains('contact-11-original', $ids);
    }

    public function testReplaceWorkspaceForUser10DoesNotTouchUser11sRows(): void
    {
        $newContact = [
            'id' => 'contact-10-fresh',
            'name' => 'Fresh Contact',
            'company' => null,
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
        ];

        $this->repo->replaceWorkspace(10, [
            'schemaVersion' => 1,
            'contacts' => [$newContact],
            'interactions' => [],
            'followUpTasks' => [],
            'contactLinks' => [],
            'referrals' => [],
        ]);

        // User 10's previous row must be gone, the new one persisted.
        $afterUser10 = $this->repo->getWorkspace(10);
        $this->assertSame(['contact-10-fresh'], array_column($afterUser10['contacts'], 'id'));

        // User 11's row is untouched.
        $user11Row = $this->db->query(
            "SELECT id FROM network_contacts WHERE id = 'contact-11-original'"
        )->fetchColumn();
        $this->assertSame('contact-11-original', $user11Row);
    }

    public function testReplaceWorkspaceIsAtomicWhenAChildRowIsInvalid(): void
    {
        // contact_id points at a contact that does not exist; FK should fail and
        // the whole replace must roll back, leaving prior rows intact.
        $beforeCount = (int) $this->db->query(
            'SELECT COUNT(*) FROM network_contacts WHERE owner_user_id = 10'
        )->fetchColumn();

        $this->expectException(\PDOException::class);

        try {
            $this->repo->replaceWorkspace(10, [
                'schemaVersion' => 1,
                'contacts' => [[
                    'id' => 'contact-10-new',
                    'name' => 'New',
                    'company' => null,
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
                    'id' => 'interaction-bad',
                    'contact_id' => 'no-such-contact',
                    'occurred_at' => '2026-08-21T10:00:00.000Z',
                    'channel' => 'email',
                    'summary' => '',
                    'notes' => '',
                    'status' => 'completed',
                    'created_at' => '2026-08-21T10:00:00.000Z',
                    'updated_at' => '2026-08-21T10:00:00.000Z',
                ]],
                'followUpTasks' => [],
                'contactLinks' => [],
                'referrals' => [],
            ]);
        } finally {
            $afterCount = (int) $this->db->query(
                'SELECT COUNT(*) FROM network_contacts WHERE owner_user_id = 10'
            )->fetchColumn();
            $this->assertSame(
                $beforeCount,
                $afterCount,
                'replaceWorkspace must roll back when an interior row violates a constraint',
            );
        }
    }

    public function testReplaceWorkspaceAcceptsEmptyWorkspaceAndClearsOwnersRows(): void
    {
        $this->repo->replaceWorkspace(10, [
            'schemaVersion' => 1,
            'contacts' => [],
            'interactions' => [],
            'followUpTasks' => [],
            'contactLinks' => [],
            'referrals' => [],
        ]);

        $after = $this->repo->getWorkspace(10);
        $this->assertSame([], $after['contacts']);
        $this->assertSame([], $after['interactions']);
        $this->assertSame([], $after['followUpTasks']);
        $this->assertSame([], $after['contactLinks']);
        $this->assertSame([], $after['referrals']);

        // User 11's baseline row survives the empty replace.
        $user11Still = (int) $this->db->query(
            "SELECT COUNT(*) FROM network_contacts WHERE owner_user_id = 11"
        )->fetchColumn();
        $this->assertSame(1, $user11Still);
    }

    public function testGetWorkspaceReturnsEmptyForUnknownOwner(): void
    {
        $workspace = $this->repo->getWorkspace(999);

        $this->assertSame(1, $workspace['schemaVersion']);
        $this->assertSame([], $workspace['contacts']);
        $this->assertSame([], $workspace['interactions']);
        $this->assertSame([], $workspace['followUpTasks']);
        $this->assertSame([], $workspace['contactLinks']);
        $this->assertSame([], $workspace['referrals']);
    }

    public function testReplaceWorkspacePersistsAllFiveEntityCollections(): void
    {
        $this->repo->replaceWorkspace(10, $this->buildFullWorkspace());

        $after = $this->repo->getWorkspace(10);
        $this->assertSame(['contact-full'], array_column($after['contacts'], 'id'));
        $this->assertSame(['interaction-full'], array_column($after['interactions'], 'id'));
        $this->assertSame(['task-full'], array_column($after['followUpTasks'], 'id'));
        $this->assertSame(['link-full'], array_column($after['contactLinks'], 'id'));
        $this->assertSame(['referral-full'], array_column($after['referrals'], 'id'));
    }

    private function buildFullWorkspace(): array
    {
        return [
            'schemaVersion' => 1,
            'contacts' => [[
                'id' => 'contact-full',
                'name' => 'Full',
                'company' => 'Acme',
                'role' => 'CTO',
                'email' => 'full@example.com',
                'phone' => null,
                'linkedin_url' => null,
                'location' => null,
                'relationship_type' => 'peer',
                'tags' => ['a'],
                'notes' => 'n',
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'interactions' => [[
                'id' => 'interaction-full',
                'contact_id' => 'contact-full',
                'occurred_at' => '2026-08-21T10:00:00.000Z',
                'channel' => 'email',
                'summary' => 'Intro',
                'notes' => 'n',
                'status' => 'completed',
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'followUpTasks' => [[
                'id' => 'task-full',
                'contact_id' => 'contact-full',
                'title' => 'Send intro',
                'due_at' => '2026-08-22T10:00:00.000Z',
                'completed_at' => null,
                'created_at' => '2026-08-21T10:00:00.000Z',
                'updated_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'contactLinks' => [[
                'id' => 'link-full',
                'contact_id' => 'contact-full',
                'resource_type' => 'application',
                'resource_id' => 'app-1',
                'created_at' => '2026-08-21T10:00:00.000Z',
            ]],
            'referrals' => [[
                'id' => 'referral-full',
                'contact_id' => 'contact-full',
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
