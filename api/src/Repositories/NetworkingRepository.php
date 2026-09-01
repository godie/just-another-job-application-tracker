<?php

declare(strict_types=1);

namespace OverPHP\Repositories;

use PDO;

/**
 * Owner-scoped CRUD over the networking CRM workspace.
 *
 * All deletes and inserts are bound to {@see $ownerUserId} — the caller is
 * expected to obtain that from the authenticated session, never from
 * client input. The replace strategy is "wipe owner rows, insert incoming
 * rows" inside a single transaction; a foreign-key violation aborts the
 * whole replacement and the caller's prior state survives.
 */
final class NetworkingRepository
{
    /** @var array<string, true> */
    private const TABLES = [
        'network_referrals' => true,
        'network_contact_links' => true,
        'network_follow_up_tasks' => true,
        'network_interactions' => true,
        'network_contacts' => true,
    ];

    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Read the owner's full workspace, returning a Task 1-shape array with
     * `schemaVersion` intact. Empty collections are returned as `[]` so the
     * controller can pass them straight back to the client.
     *
     * @return array{
     *     schemaVersion: int,
     *     contacts: array<int, array<string, mixed>>,
     *     interactions: array<int, array<string, mixed>>,
     *     followUpTasks: array<int, array<string, mixed>>,
     *     contactLinks: array<int, array<string, mixed>>,
     *     referrals: array<int, array<string, mixed>>
     * }
     */
    public function getWorkspace(int $ownerUserId): array
    {
        $contacts = $this->db->prepare(
            'SELECT * FROM network_contacts WHERE owner_user_id = :owner ORDER BY created_at ASC'
        );
        $contacts->execute(['owner' => $ownerUserId]);

        $interactions = $this->db->prepare(
            'SELECT * FROM network_interactions WHERE owner_user_id = :owner ORDER BY occurred_at ASC'
        );
        $interactions->execute(['owner' => $ownerUserId]);

        $followUpTasks = $this->db->prepare(
            'SELECT * FROM network_follow_up_tasks WHERE owner_user_id = :owner ORDER BY due_at ASC'
        );
        $followUpTasks->execute(['owner' => $ownerUserId]);

        $contactLinks = $this->db->prepare(
            'SELECT * FROM network_contact_links WHERE owner_user_id = :owner ORDER BY created_at ASC'
        );
        $contactLinks->execute(['owner' => $ownerUserId]);

        $referrals = $this->db->prepare(
            'SELECT * FROM network_referrals WHERE owner_user_id = :owner ORDER BY requested_at ASC'
        );
        $referrals->execute(['owner' => $ownerUserId]);

        return [
            'schemaVersion' => 1,
            'contacts' => $this->stripOwner($contacts->fetchAll(PDO::FETCH_ASSOC)),
            'interactions' => $this->stripOwner($interactions->fetchAll(PDO::FETCH_ASSOC)),
            'followUpTasks' => $this->stripOwner($followUpTasks->fetchAll(PDO::FETCH_ASSOC)),
            'contactLinks' => $this->stripOwner($contactLinks->fetchAll(PDO::FETCH_ASSOC)),
            'referrals' => $this->stripOwner($referrals->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    /**
     * Replace the owner's full workspace atomically. The incoming shape is
     * trusted to be structurally validated by the controller — but owner
     * scoping and FK integrity are enforced here.
     *
     * @param array{
     *     schemaVersion: int,
     *     contacts: array<int, array<string, mixed>>,
     *     interactions: array<int, array<string, mixed>>,
     *     followUpTasks: array<int, array<string, mixed>>,
     *     contactLinks: array<int, array<string, mixed>>,
     *     referrals: array<int, array<string, mixed>>
     * } $workspace
     */
    public function replaceWorkspace(int $ownerUserId, array $workspace): void
    {
        $this->db->beginTransaction();

        try {
            // Delete in dependency order: children before parents.
            $this->deleteByOwner('network_referrals', $ownerUserId);
            $this->deleteByOwner('network_contact_links', $ownerUserId);
            $this->deleteByOwner('network_follow_up_tasks', $ownerUserId);
            $this->deleteByOwner('network_interactions', $ownerUserId);
            $this->deleteByOwner('network_contacts', $ownerUserId);

            foreach ($workspace['contacts'] as $row) {
                $this->insertContact($ownerUserId, $row);
            }
            foreach ($workspace['interactions'] as $row) {
                $this->insertInteraction($ownerUserId, $row);
            }
            foreach ($workspace['followUpTasks'] as $row) {
                $this->insertFollowUpTask($ownerUserId, $row);
            }
            foreach ($workspace['contactLinks'] as $row) {
                $this->insertContactLink($ownerUserId, $row);
            }
            foreach ($workspace['referrals'] as $row) {
                $this->insertReferral($ownerUserId, $row);
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function deleteByOwner(string $table, int $ownerUserId): void
    {
        if (!isset(self::TABLES[$table])) {
            throw new \InvalidArgumentException('Unknown networking table.');
        }

        $stmt = $this->db->prepare("DELETE FROM {$table} WHERE owner_user_id = :owner");
        $stmt->execute(['owner' => $ownerUserId]);
    }

    private function insertContact(int $ownerUserId, array $row): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_contacts
                (id, owner_user_id, name, company, role, email, phone, linkedin_url, location,
                 relationship_type, tags_json, notes, created_at, updated_at)
            VALUES
                (:id, :owner, :name, :company, :role, :email, :phone, :linkedin_url, :location,
                 :relationship_type, :tags_json, :notes, :created_at, :updated_at)
        SQL);
        $stmt->execute([
            'id' => (string) $row['id'],
            'owner' => $ownerUserId,
            'name' => (string) $row['name'],
            'company' => $row['company'] ?? null,
            'role' => $row['role'] ?? null,
            'email' => $row['email'] ?? null,
            'phone' => $row['phone'] ?? null,
            'linkedin_url' => $row['linkedin_url'] ?? null,
            'location' => $row['location'] ?? null,
            'relationship_type' => (string) $row['relationship_type'],
            'tags_json' => json_encode((array) ($row['tags'] ?? []), JSON_THROW_ON_ERROR),
            'notes' => (string) ($row['notes'] ?? ''),
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ]);
    }

    private function insertInteraction(int $ownerUserId, array $row): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_interactions
                (id, owner_user_id, contact_id, occurred_at, channel, summary, notes, status,
                 created_at, updated_at)
            VALUES
                (:id, :owner, :contact_id, :occurred_at, :channel, :summary, :notes, :status,
                 :created_at, :updated_at)
        SQL);
        $stmt->execute([
            'id' => (string) $row['id'],
            'owner' => $ownerUserId,
            'contact_id' => (string) $row['contact_id'],
            'occurred_at' => (string) $row['occurred_at'],
            'channel' => (string) $row['channel'],
            'summary' => (string) $row['summary'],
            'notes' => (string) ($row['notes'] ?? ''),
            'status' => (string) $row['status'],
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ]);
    }

    private function insertFollowUpTask(int $ownerUserId, array $row): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_follow_up_tasks
                (id, owner_user_id, contact_id, title, due_at, completed_at,
                 created_at, updated_at)
            VALUES
                (:id, :owner, :contact_id, :title, :due_at, :completed_at,
                 :created_at, :updated_at)
        SQL);
        $stmt->execute([
            'id' => (string) $row['id'],
            'owner' => $ownerUserId,
            'contact_id' => (string) $row['contact_id'],
            'title' => (string) $row['title'],
            'due_at' => (string) $row['due_at'],
            'completed_at' => $row['completed_at'] ?? null,
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ]);
    }

    private function insertContactLink(int $ownerUserId, array $row): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_contact_links
                (id, owner_user_id, contact_id, resource_type, resource_id, created_at)
            VALUES
                (:id, :owner, :contact_id, :resource_type, :resource_id, :created_at)
        SQL);
        $stmt->execute([
            'id' => (string) $row['id'],
            'owner' => $ownerUserId,
            'contact_id' => (string) $row['contact_id'],
            'resource_type' => (string) $row['resource_type'],
            'resource_id' => (string) $row['resource_id'],
            'created_at' => (string) $row['created_at'],
        ]);
    }

    private function insertReferral(int $ownerUserId, array $row): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
            INSERT INTO network_referrals
                (id, owner_user_id, contact_id, resource_type, resource_id, status,
                 requested_at, notes, created_at, updated_at)
            VALUES
                (:id, :owner, :contact_id, :resource_type, :resource_id, :status,
                 :requested_at, :notes, :created_at, :updated_at)
        SQL);
        $stmt->execute([
            'id' => (string) $row['id'],
            'owner' => $ownerUserId,
            'contact_id' => (string) $row['contact_id'],
            'resource_type' => (string) $row['resource_type'],
            'resource_id' => (string) $row['resource_id'],
            'status' => (string) $row['status'],
            'requested_at' => (string) $row['requested_at'],
            'notes' => (string) ($row['notes'] ?? ''),
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ]);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function stripOwner(array $rows): array
    {
        return array_map(
            static function (array $row): array {
                unset($row['owner_user_id']);
                // SQLite columns are usually returned keyed by snake_case; the
                // client's expected camelCase for tags needs unserialization.
                if (isset($row['tags_json']) && is_string($row['tags_json'])) {
                    $decoded = json_decode($row['tags_json'], true);
                    $row['tags'] = is_array($decoded) ? $decoded : [];
                    unset($row['tags_json']);
                }
                return $row;
            },
            $rows,
        );
    }
}
