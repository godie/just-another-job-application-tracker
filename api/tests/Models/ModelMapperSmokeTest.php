<?php

declare(strict_types=1);

namespace OverPHP\Tests\Models;

use OverPHP\Models\ModelMapper;
use PDO;
use PHPUnit\Framework\TestCase;

/**
 * Smoke tests for ModelMapper's SQL-building pattern.
 *
 * Background (from Phase 8 code review):
 *
 *   ModelMapper has 12 sites using the typed-closure widening
 *   `fn(int|string $k): string => ":$k"` (and the untyped variant
 *   `fn($k): string => "$k = :$k"`) to build SQL placeholders from
 *   `array_keys($data)`. In normal usage the $data array is always
 *   built by `Model::toDatabase()` or `mapTypeScriptToDatabase()`,
 *   which produce string keys, so the integer-key path is unreachable
 *   in production. The concern: if a future maintainer introduces an
 *   integer-keyed data path, the resulting SQL is invalid (e.g.,
 *   `UPDATE users SET 0 = :0` is a syntax error in every SQL dialect).
 *
 *   `updateUser(int $id, array $data)` is the only ModelMapper method
 *   that takes a raw $data array directly without an intervening
 *   string-key-mapping step, so it's the canonical surface to test the
 *   integer-key contract. The other INSERT/UPDATE methods route
 *   through toDatabase()/mapTypeScriptToDatabase() which always
 *   produce string keys, so the same runtime-safety guarantee holds
 *   transitively.
 *
 * What this test locks in:
 *
 *   1. With string keys: updateUser works as expected.
 *   2. With integer or hostile keys (e.g. a JSON-array payload or an
 *      injected SQL fragment): the update is rejected before PDO prepares
 *      any SQL.
 *   3. With an empty array: updateUser short-circuits to `false`
 *      without building SQL.
 *
 * If the production code is ever refactored to silently coerce or
 * normalize unknown keys, the rejection assertions must remain in place
 * or be replaced with an equivalent proof that SQL identifiers are trusted.
 *
 * @group smoke
 */
class ModelMapperSmokeTest extends TestCase
{
    private PDO $db;
    private ModelMapper $mapper;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec(
            'CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255),
                display_name VARCHAR(255)
            )'
        );
        $this->db->exec(
            "INSERT INTO users (id, email) VALUES (1, 'smoke@example.com')"
        );
        $this->db->exec(
            'CREATE TABLE applications (
                id VARCHAR(100) PRIMARY KEY,
                company VARCHAR(255),
                position VARCHAR(255),
                last_update DATETIME
            )'
        );
        $this->db->exec(
            "INSERT INTO applications (id, company, position) VALUES ('app-1', 'Acme', 'Engineer')"
        );
        $this->db->exec(
            'CREATE TABLE timeline_events (
                id VARCHAR(100) PRIMARY KEY,
                type VARCHAR(100),
                notes TEXT
            )'
        );
        $this->db->exec(
            "INSERT INTO timeline_events (id, type, notes) VALUES ('event-1', 'screening', 'Initial')"
        );
        $this->db->exec(
            'CREATE TABLE opportunities (
                id VARCHAR(100) PRIMARY KEY,
                company VARCHAR(255),
                position VARCHAR(255),
                updated_at DATETIME
            )'
        );
        $this->db->exec(
            "INSERT INTO opportunities (id, company, position) VALUES ('opp-1', 'Acme', 'Engineer')"
        );
        $this->mapper = new ModelMapper($this->db);
    }

    public function testUpdateUserWithStringKeysSucceeds(): void
    {
        $this->assertTrue(
            $this->mapper->updateUser(
                1,
                ['email' => 'new@example.com', 'display_name' => 'Smoke'],
            ),
        );

        $row = $this->fetchUser(1);
        $this->assertNotNull($row);
        $this->assertSame('new@example.com', $row['email']);
        $this->assertSame('Smoke', $row['display_name']);
    }

    public function testUpdateUserWithIntegerKeysIsRejectedBeforeSqlExecution(): void
    {
        // Simulates a JSON-array request body e.g. `json_decode('["x"]', true)`
        // which produces an integer-keyed array: `[0 => 'x']`. Unknown
        // identifiers are rejected before PDO prepares any SQL.
        $this->assertFalse($this->mapper->updateUser(1, ['x']));
    }

    public function testUpdateUserWithEmptyArrayReturnsFalse(): void
    {
        // Edge case: empty data short-circuits before any SQL is built.
        $this->assertFalse($this->mapper->updateUser(1, []));
    }

    public function testUpdateMethodsRejectUntrustedColumnNames(): void
    {
        $injectionKey = "company = 'pwned', email = 'attacker@example.com' --";

        $this->assertFalse($this->mapper->updateUser(1, [$injectionKey => 'ignored']));
        $this->assertFalse($this->mapper->updateApplication('app-1', [$injectionKey => 'ignored']));
        $this->assertFalse($this->mapper->updateTimelineEvent('event-1', [$injectionKey => 'ignored']));
        $this->assertFalse($this->mapper->updateOpportunity('opp-1', [$injectionKey => 'ignored']));

        $user = $this->fetchUser(1);
        $this->assertNotNull($user);
        $this->assertSame('smoke@example.com', $user['email']);
        $this->assertSame('Acme', $this->fetchValue('applications', 'company', 'app-1'));
        $this->assertSame('Initial', $this->fetchValue('timeline_events', 'notes', 'event-1'));
        $this->assertSame('Acme', $this->fetchValue('opportunities', 'company', 'opp-1'));
    }

    private function fetchValue(string $table, string $column, string $id): mixed
    {
        $stmt = $this->db->prepare("SELECT {$column} FROM {$table} WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetchColumn();
    }

    private function fetchUser(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
