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
        $placeholders = implode(', ', array_map(fn($k) => ":$k", array_keys($data)));

        $sql = "INSERT INTO users ($columns) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function updateLastLogin(int $userId): void
    {
        $stmt = $this->db->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $userId]);
    }

    public function createDefaultPreferences(int $userId): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO user_preferences (user_id) VALUES (:user_id)'
        );
        $stmt->execute(['user_id' => $userId]);
    }
}