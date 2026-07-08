<?php

declare(strict_types=1);

namespace OverPHP\Repositories;

use OverPHP\Models\User;
use PDO;

class UserRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findByEmail(string $email): ?User
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? User::fromDatabase($row) : null;
    }

    public function findById(int $id): ?User
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? User::fromDatabase($row) : null;
    }

    public function findByGoogleId(string $googleId): ?User
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE google_id = :google_id LIMIT 1');
        $stmt->execute(['google_id' => $googleId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? User::fromDatabase($row) : null;
    }

    public function findByLinkedInId(string $linkedinId): ?User
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE linkedin_id = :linkedin_id LIMIT 1');
        $stmt->execute(['linkedin_id' => $linkedinId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? User::fromDatabase($row) : null;
    }

    public function create(User $user): int
    {
        $data = $user->toDatabase();
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_map(fn(int|string $k): string => ":$k", array_keys($data)));

        $sql = "INSERT INTO users ($columns) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function updateLastLogin(int $userId): void
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $now = $driver === 'sqlite'
            ? "datetime('now')"
            : 'NOW()';
        $stmt = $this->db->prepare("UPDATE users SET last_login_at = $now WHERE id = :id");
        $stmt->execute(['id' => $userId]);
    }

    public function createDefaultPreferences(int $userId): void
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $stmt = $this->db->prepare(
                'INSERT OR IGNORE INTO user_preferences (user_id) VALUES (:user_id)'
            );
        } else {
            $stmt = $this->db->prepare(
                'INSERT IGNORE INTO user_preferences (user_id) VALUES (:user_id)'
            );
        }
        $stmt->execute(['user_id' => $userId]);
    }

    public function findByResetToken(string $token): ?User
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $stmt = $this->db->prepare(
                "SELECT * FROM users WHERE reset_token = :token AND reset_token_expires_at > datetime('now') LIMIT 1"
            );
        } else {
            $stmt = $this->db->prepare(
                'SELECT * FROM users WHERE reset_token = :token AND reset_token_expires_at > NOW() LIMIT 1'
            );
        }
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? User::fromDatabase($row) : null;
    }

    public function saveResetToken(int $userId, string $token, string $expiresAt): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users SET reset_token = :token, reset_token_expires_at = :expires WHERE id = :id'
        );
        $stmt->execute(['token' => $token, 'expires' => $expiresAt, 'id' => $userId]);
    }

    public function clearResetToken(int $userId): void
    {
        $stmt = $this->db->prepare(
            'UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = :id'
        );
        $stmt->execute(['id' => $userId]);
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $now = $driver === 'sqlite'
            ? "datetime('now')"
            : 'NOW()';
        $stmt = $this->db->prepare(
            "UPDATE users SET password_hash = :hash, updated_at = $now WHERE id = :id"
        );
        $stmt->execute(['hash' => $passwordHash, 'id' => $userId]);
    }

    public function updateGoogleId(int $userId, string $googleId): void
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $now = $driver === 'sqlite'
            ? "datetime('now')"
            : 'NOW()';
        $stmt = $this->db->prepare(
            "UPDATE users SET google_id = :google_id, updated_at = $now WHERE id = :id"
        );
        $stmt->execute(['google_id' => $googleId, 'id' => $userId]);

        if ($stmt->rowCount() === 0) {
            throw new \RuntimeException("Failed to update Google ID for user ID: $userId");
        }
    }

    public function updateLinkedInId(int $userId, string $linkedinId): void
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $now = $driver === 'sqlite'
            ? "datetime('now')"
            : 'NOW()';
        $stmt = $this->db->prepare(
            "UPDATE users SET linkedin_id = :linkedin_id, updated_at = $now WHERE id = :id"
        );
        $stmt->execute(['linkedin_id' => $linkedinId, 'id' => $userId]);

        if ($stmt->rowCount() === 0) {
            throw new \RuntimeException("Failed to update LinkedIn ID for user ID: $userId");
        }
    }
}