<?php

declare(strict_types=1);

namespace OverPHP\Models;

/**
 * User Model - Multi-tenant support
 *
 * @property int|null $id
 * @property int|null $organizationId
 * @property string $email
 * @property string|null $passwordHash
 * @property string|null $googleId
 * @property string|null $username
 * @property string|null $displayName
 * @property string|null $avatarUrl
 * @property bool $isPublic
 * @property string|null $bio
 * @property string $role
 * @property bool $isActive
 * @property string $createdAt
 * @property string $updatedAt
 * @property string|null $lastLoginAt
 */
class User
{
    public readonly ?int $id;
    public readonly ?int $organizationId;
    public readonly string $email;
    public readonly ?string $passwordHash;
    public readonly ?string $googleId;
    public readonly ?string $username;
    public readonly ?string $displayName;
    public readonly ?string $avatarUrl;
    public readonly bool $isPublic;
    public readonly ?string $bio;
    public readonly string $role;
    public readonly bool $isActive;
    public readonly ?string $createdAt;
    public readonly ?string $updatedAt;
    public readonly ?string $lastLoginAt;

    private function __construct(
        ?int $id,
        ?int $organizationId,
        string $email,
        ?string $passwordHash = null,
        ?string $googleId = null,
        ?string $username = null,
        ?string $displayName = null,
        ?string $avatarUrl = null,
        bool $isPublic = false,
        ?string $bio = null,
        string $role = "member",
        bool $isActive = true,
        ?string $createdAt = null,
        ?string $updatedAt = null,
        ?string $lastLoginAt = null,
    ) {
        $this->id = $id;
        $this->organizationId = $organizationId;
        $this->email = $email;
        $this->passwordHash = $passwordHash;
        $this->googleId = $googleId;
        $this->username = $username;
        $this->displayName = $displayName;
        $this->avatarUrl = $avatarUrl;
        $this->isPublic = $isPublic;
        $this->bio = $bio;
        $this->role = $role;
        $this->isActive = $isActive;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
        $this->lastLoginAt = $lastLoginAt;
    }

    /**
     * Create from database row
     */
    public static function fromDatabase(array $row): self
    {
        return new self(
            id: (int) ($row["id"] ?? 0) ?: null,
            organizationId: isset($row["organization_id"]) &&
            $row["organization_id"] !== ""
                ? (int) $row["organization_id"]
                : null,
            email: $row["email"] ?? "",
            passwordHash: $row["password_hash"] ?? null,
            googleId: $row["google_id"] ?? null,
            username: $row["username"] ?? null,
            displayName: $row["display_name"] ?? null,
            avatarUrl: $row["avatar_url"] ?? null,
            isPublic: ($row["is_public"] ?? 0) === 1 ||
                ($row["is_public"] ?? false) === true,
            bio: $row["bio"] ?? null,
            role: $row["role"] ?? "member",
            isActive: ($row["is_active"] ?? 1) === 1 ||
                ($row["is_active"] ?? true) === true,
            createdAt: $row["created_at"] ?? null,
            updatedAt: $row["updated_at"] ?? null,
            lastLoginAt: $row["last_login_at"] ?? null,
        );
    }

    /**
     * Create new user (for registration)
     */
    public static function create(
        string $email,
        ?int $organizationId = null,
        ?string $passwordHash = null,
        ?string $googleId = null,
        ?string $username = null,
        ?string $displayName = null,
        string $role = "member",
    ): self {
        return new self(
            id: null,
            organizationId: $organizationId,
            email: $email,
            passwordHash: $passwordHash,
            googleId: $googleId,
            username: $username,
            displayName: $displayName,
            avatarUrl: null,
            isPublic: false,
            bio: null,
            role: $role,
            isActive: true,
            createdAt: null,
            updatedAt: null,
            lastLoginAt: null,
        );
    }

    /**
     * Create from Google OAuth data
     */
    public static function fromGoogle(
        array $googleUser,
        ?int $organizationId = null,
    ): self {
        return new self(
            id: null,
            organizationId: $organizationId,
            email: $googleUser["email"] ?? "",
            passwordHash: null,
            googleId: $googleUser["google_id"] ?? ($googleUser["sub"] ?? null),
            username: $googleUser["name"] ?? null,
            displayName: $googleUser["name"] ?? null,
            avatarUrl: $googleUser["picture"] ?? null,
            isPublic: false,
            bio: $googleUser["bio"] ?? null,
            role: "member",
            isActive: true,
            createdAt: null,
            updatedAt: null,
            lastLoginAt: null,
        );
    }

    /**
     * Convert to array for database insertion
     */
    public function toDatabase(): array
    {
        $data = [
            "email" => $this->email,
            "organization_id" => $this->organizationId,
            "password_hash" => $this->passwordHash,
            "google_id" => $this->googleId,
            "username" => $this->username,
            "display_name" => $this->displayName,
            "avatar_url" => $this->avatarUrl,
            "is_public" => $this->isPublic ? 1 : 0,
            "bio" => $this->bio,
            "role" => $this->role,
            "is_active" => $this->isActive ? 1 : 0,
        ];

        return array_filter($data, fn($value) => $value !== null);
    }

    /**
     * Convert to array for API response
     */
    public function toArray(): array
    {
        return [
            "id" => $this->id,
            "organizationId" => $this->organizationId,
            "email" => $this->email,
            "username" => $this->username,
            "displayName" => $this->displayName,
            "avatarUrl" => $this->avatarUrl,
            "isPublic" => $this->isPublic,
            "bio" => $this->bio,
            "role" => $this->role,
            "createdAt" => $this->createdAt,
            "updatedAt" => $this->updatedAt,
            "lastLoginAt" => $this->lastLoginAt,
        ];
    }

    /**
     * Convert to array for public profile (limited fields)
     */
    public function toPublicArray(): array
    {
        if (!$this->isPublic) {
            return [
                "id" => $this->id,
                "displayName" => $this->displayName,
            ];
        }

        return [
            "id" => $this->id,
            "username" => $this->username,
            "displayName" => $this->displayName,
            "avatarUrl" => $this->avatarUrl,
            "bio" => $this->bio,
        ];
    }

    /**
     * Check if user is in standalone mode (no organization)
     */
    public function isStandalone(): bool
    {
        return $this->organizationId === null;
    }

    /**
     * Check if user has admin role
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, ["owner", "admin"], true);
    }

    /**
     * Check if user can manage organization settings
     */
    public function canManageOrganization(): bool
    {
        return in_array($this->role, ["owner", "admin"], true);
    }

    /**
     * Check if user can invite other users
     */
    public function canInviteUsers(): bool
    {
        return in_array($this->role, ["owner", "admin", "mentor"], true);
    }

    /**
     * Verify password
     */
    public function verifyPassword(string $password): bool
    {
        if ($this->passwordHash === null) {
            return false;
        }
        return password_verify($password, $this->passwordHash);
    }

    /**
     * Hash password for storage
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }
}
