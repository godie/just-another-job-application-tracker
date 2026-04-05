/* php/job-application-tracker/api/src/Models/Organization.php */
<?php
declare(strict_types=1);

namespace OverPHP\Models;

/**
 * Organization Model - Multi-tenant support
 *
 * Represents an organization (tenant) in the system.
 * When organization_id is NULL, the system runs in standalone mode.
 */
class Organization
{
    public readonly ?int $id;
    public readonly string $name;
    public readonly ?string $slug;
    public readonly ?string $description;
    public readonly ?array $settings;
    public readonly ?string $createdAt;
    public readonly ?string $updatedAt;
    public readonly bool $isActive;

    private function __construct(
        ?int $id,
        string $name,
        ?string $slug = null,
        ?string $description = null,
        ?array $settings = null,
        ?string $createdAt = null,
        ?string $updatedAt = null,
        bool $isActive = true,
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->slug = $slug;
        $this->description = $description;
        $this->settings = $settings;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
        $this->isActive = $isActive;
    }

    /**
     * Create from database row
     */
    public static function fromDatabase(array $row): self
    {
        return new self(
            id: (int) ($row["id"] ?? 0) ?: null,
            name: $row["name"] ?? "",
            slug: $row["slug"] ?? null,
            description: $row["description"] ?? null,
            settings: isset($row["settings"])
                ? json_decode($row["settings"], true)
                : null,
            createdAt: $row["created_at"] ?? null,
            updatedAt: $row["updated_at"] ?? null,
            isActive: (bool) ($row["is_active"] ?? true),
        );
    }

    /**
     * Create new organization (for insertion)
     */
    public static function create(
        string $name,
        ?string $slug = null,
        ?string $description = null,
        ?array $settings = null,
    ): self {
        return new self(
            id: null,
            name: $name,
            slug: $slug ?? self::generateSlug($name),
            description: $description,
            settings: $settings,
            createdAt: null,
            updatedAt: null,
            isActive: true,
        );
    }

    /**
     * Convert to array for database insertion
     */
    public function toDatabase(): array
    {
        $data = [
            "name" => $this->name,
            "slug" => $this->slug,
            "description" => $this->description,
            "settings" => $this->settings ? json_encode($this->settings) : null,
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
            "name" => $this->name,
            "slug" => $this->slug,
            "description" => $this->description,
            "settings" => $this->settings,
            "createdAt" => $this->createdAt,
            "updatedAt" => $this->updatedAt,
            "isActive" => $this->isActive,
        ];
    }

    /**
     * Generate URL-safe slug from name
     */
    private static function generateSlug(string $name): string
    {
        $slug = strtolower($name);
        $slug = preg_replace("/[^a-z0-9\s-]/", "", $slug);
        $slug = preg_replace("/[\s-]+/", "-", $slug);
        return trim($slug, "-");
    }

    /**
     * Check if this is the default organization (standalone mode)
     */
    public function isDefault(): bool
    {
        return $this->id === 1;
    }

    /**
     * Get primary owner user ID (if available)
     */
    public function getOwnerId(): ?int
    {
        // This would be implemented in the repository
        return null;
    }
}

