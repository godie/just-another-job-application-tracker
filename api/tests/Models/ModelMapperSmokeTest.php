<?php

declare(strict_types=1);

namespace OverPHP\Tests\Models;

use OverPHP\Models\ModelMapper;
use PDO;
use PDOException;
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
 *   2. With integer keys (e.g. a JSON-array payload mistakenly
 *      passed as the request body): PDO raises PDOException
 *      (`fail loud`, not `silently write wrong data`).
 *   3. With an empty array: updateUser short-circuits to `false`
 *      without building SQL.
 *
 * If the production code is ever refactored to (a) silently coerce
 * integer keys to strings, or (b) detect integer keys and throw a
 * clearer domain exception, the third assertion may need adjustment.
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

    public function testUpdateUserWithIntegerKeysThrowsPDOException(): void
    {
        // Simulates a JSON-array request body e.g. `json_decode('["x"]', true)`
        // which produces an integer-keyed array: `[0 => 'x']`. The
        // SQL builder will emit `UPDATE users SET 0 = :0 ...` which is
        // invalid SQL on every supported driver.
        $this->expectException(PDOException::class);
        $this->mapper->updateUser(1, ['x']);
    }

    public function testUpdateUserWithEmptyArrayReturnsFalse(): void
    {
        // Edge case: empty data short-circuits before any SQL is built.
        $this->assertFalse($this->mapper->updateUser(1, []));
    }

    private function fetchUser(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
