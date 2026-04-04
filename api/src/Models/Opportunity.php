<?php

declare(strict_types=1);

namespace OverPHP\Models;

/**
 * Job Opportunity Model
 *
 * Represents interesting job openings captured from job boards
 * Maps to opportunities table
 *
 * @property string $id
 * @property int $userId
 * @property int|null $organizationId
 * @property string $company
 * @property string $position
 * @property string|null $link
 * @property string|null $description
 * @property string|null $salary
 * @property string|null $location
 * @property string|null $workType
 * @property string|null $platform
 * @property string|null $postedDate
 * @property string|null $notes
 * @property string $status ('interested', 'applied', 'rejected', 'withdrawn')
 * @property string $capturedDate
 * @property string|null $updatedAt
 * @property bool $isDeleted
 */
class Opportunity
{
    public function __construct(
        public readonly string $id = '',
        public readonly int $userId = 0,
        public readonly ?int $organizationId = null,
        public readonly string $company = '',
        public readonly string $position = '',
        public readonly ?string $link = null,
        public readonly ?string $description = null,
        public readonly ?string $salary = null,
        public readonly ?string $location = null,
        public readonly ?string $workType = null,
        public readonly ?string $platform = null,
        public readonly ?string $postedDate = null,
        public readonly ?string $notes = null,
        public readonly string $status = 'interested',
        public readonly ?string $capturedDate = null,
        public readonly ?string $updatedAt = null,
        public readonly bool $isDeleted = false,
    ) {}

    /**
     * Create from database row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            id: $row['id'] ?? '',
            userId: (int) ($row['user_id'] ?? 0),
            organizationId: isset($row['organization_id']) && $row['organization_id'] !== ''
                ? (int) $row['organization_id']
                : null,
            company: $row['company'] ?? '',
            position: $row['position'] ?? '',
            link: $row['link'] ?? null,
            description: $row['description'] ?? null,
            salary: $row['salary'] ?? null,
            location: $row['location'] ?? null,
            workType: $row['work_type'] ?? null,
            platform: $row['platform'] ?? null,
            postedDate: $row['posted_date'] ?? null,
            notes: $row['notes'] ?? null,
            status: $row['status'] ?? 'interested',
            capturedDate: $row['captured_date'] ?? $row['created_at'] ?? null,
            updatedAt: $row['updated_at'] ?? null,
            isDeleted: ($row['is_deleted'] ?? 0) === 1,
        );
    }

    /**
     * Convert to array for database insertion
     */
    public function toArray(): array
    {
        $data = [
            'id' => $this->id,
            'user_id' => $this->userId,
            'organization_id' => $this->organizationId,
            'company' => $this->company,
            'position' => $this->position,
            'link' => $this->link,
            'description' => $this->description,
            'salary' => $this->salary,
            'location' => $this->location,
            'work_type' => $this->workType,
            'platform' => $this->platform,
            'posted_date' => $this->postedDate,
            'notes' => $this->notes,
            'status' => $this->status,
            'is_deleted' => $this->isDeleted ? 1 : 0,
        ];

        return array_filter($data, fn($value) => $value !== null);
    }

    /**
     * Convert to array for API response (matches TypeScript JobOpportunity)
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'position' => $this->position,
            'company' => $this->company,
            'link' => $this->link,
            'description' => $this->description,
            'location' => $this->location,
            'jobType' => $this->workType,
            'salary' => $this->salary,
            'postedDate' => $this->postedDate,
            'capturedDate' => $this->capturedDate,
            'platform' => $this->platform,
            'notes' => $this->notes,
            'status' => $this->status,
        ];
    }

    /**
     * Convert from TypeScript JobOpportunity format
     */
    public static function fromTypeScript(array $data, int $userId, ?int $organizationId = null): self
    {
        return new self(
            id: $data['id'] ?? '',
            userId: $userId,
            organizationId: $organizationId,
            company: $data['company'] ?? '',
            position: $data['position'] ?? '',
            link: $data['link'] ?? null,
            description: $data['description'] ?? null,
            salary: $data['salary'] ?? null,
            location: $data['location'] ?? null,
            workType: $data['jobType'] ?? null,
            platform: $data['platform'] ?? null,
            postedDate: $data['postedDate'] ?? null,
            notes: $data['notes'] ?? null,
            status: $data['status'] ?? 'interested',
            capturedDate: $data['capturedDate'] ?? date('Y-m-d H:i:s'),
            updatedAt: date('Y-m-d H:i:s'),
            isDeleted: false,
        );
    }

    /**
     * Check if opportunity is active (not deleted and not applied)
     */
    public function isActive(): bool
    {
        return !$this->isDeleted && $this->status === 'interested';
    }

    /**
     * Check if opportunity has been applied to
     */
    public function isApplied(): bool
    {
        return in_array($this->status, ['applied', 'interviewing', 'offer'], true);
    }

    /**
     * Get status display name
     */
    public function getStatusDisplay(): string
    {
        return match ($this->status) {
            'interested' => 'Interested',
            'applied' => 'Applied',
            'rejected' => 'Rejected',
            'withdrawn' => 'Withdrawn',
            default => ucfirst($this->status),
        };
    }

    /**
     * Check if salary is provided
     */
    public function hasSalary(): bool
    {
        return $this->salary !== null && $this->salary !== '';
    }

    /**
     * Check if location is provided
     */
    public function hasLocation(): bool
    {
        return $this->location !== null && $this->location !== '';
    }
}
