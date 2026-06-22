<?php

declare(strict_types=1);

namespace OverPHP\Models;

/**
 * Agent Job Application Model
 *
 * Represents a job application submitted by an automated agent on behalf
 * of a specific user (identified by the session). The user_id is part of
 * the idempotency hash so different users posting the same job do not
 * collide, and so a user can re-run their automation idempotently.
 *
 * @property int|null $id
 * @property int $userId
 * @property string $idempotencyHash
 * @property string $jobTitle
 * @property string $companyName
 * @property string|null $salaryText
 * @property string[] $technologies
 * @property string $appliedAt
 * @property string $sourceUrl
 * @property string|null $locationText
 * @property string|null $province
 * @property string|null $country
 * @property string $workMode
 * @property string $applicationStatus
 * @property string|null $notes
 * @property string|null $externalJobId
 * @property array|null $rawPayload
 * @property string|null $agentName
 * @property string|null $createdAt
 * @property string|null $updatedAt
 */
class AgentJobApplication
{
    public readonly ?int $id;
    public readonly int $userId;
    public readonly string $idempotencyHash;
    public readonly string $jobTitle;
    public readonly string $companyName;
    public readonly ?string $salaryText;
    public readonly array $technologies;
    public readonly string $appliedAt;
    public readonly string $sourceUrl;
    public readonly ?string $locationText;
    public readonly ?string $province;
    public readonly ?string $country;
    public readonly string $workMode;
    public readonly string $applicationStatus;
    public readonly ?string $notes;
    public readonly ?string $externalJobId;
    public readonly ?array $rawPayload;
    public readonly ?string $agentName;
    public readonly ?string $createdAt;
    public readonly ?string $updatedAt;

    public function __construct(
        ?int $id,
        int $userId,
        string $idempotencyHash,
        string $jobTitle,
        string $companyName,
        ?string $salaryText = null,
        array $technologies = [],
        string $appliedAt = '',
        string $sourceUrl = '',
        ?string $locationText = null,
        ?string $province = null,
        ?string $country = null,
        string $workMode = 'unknown',
        string $applicationStatus = 'submitted',
        ?string $notes = null,
        ?string $externalJobId = null,
        ?array $rawPayload = null,
        ?string $agentName = null,
        ?string $createdAt = null,
        ?string $updatedAt = null,
    ) {
        $this->id = $id;
        $this->userId = $userId;
        $this->idempotencyHash = $idempotencyHash;
        $this->jobTitle = $jobTitle;
        $this->companyName = $companyName;
        $this->salaryText = $salaryText;
        $this->technologies = $technologies;
        $this->appliedAt = $appliedAt;
        $this->sourceUrl = $sourceUrl;
        $this->locationText = $locationText;
        $this->province = $province;
        $this->country = $country;
        $this->workMode = $workMode;
        $this->applicationStatus = $applicationStatus;
        $this->notes = $notes;
        $this->externalJobId = $externalJobId;
        $this->rawPayload = $rawPayload;
        $this->agentName = $agentName;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    /**
     * Create from database row
     */
    public static function fromDatabase(array $row): self
    {
        $technologies = [];
        if (!empty($row['technologies'])) {
            $decoded = json_decode($row['technologies'], true);
            if (is_array($decoded)) {
                $technologies = $decoded;
            }
        }

        $rawPayload = null;
        if (!empty($row['raw_payload'])) {
            $decoded = json_decode($row['raw_payload'], true);
            if (is_array($decoded)) {
                $rawPayload = $decoded;
            }
        }

        return new self(
            id: isset($row['id']) && $row['id'] !== '' ? (int) $row['id'] : null,
            userId: isset($row['user_id']) && $row['user_id'] !== '' ? (int) $row['user_id'] : 0,
            idempotencyHash: $row['idempotency_hash'] ?? '',
            jobTitle: $row['job_title'] ?? '',
            companyName: $row['company_name'] ?? '',
            salaryText: $row['salary_text'] ?? null,
            technologies: $technologies,
            appliedAt: $row['applied_at'] ?? '',
            sourceUrl: $row['source_url'] ?? '',
            locationText: $row['location_text'] ?? null,
            province: $row['province'] ?? null,
            country: $row['country'] ?? null,
            workMode: $row['work_mode'] ?? 'unknown',
            applicationStatus: $row['application_status'] ?? 'submitted',
            notes: $row['notes'] ?? null,
            externalJobId: $row['external_job_id'] ?? null,
            rawPayload: $rawPayload,
            agentName: $row['agent_name'] ?? null,
            createdAt: $row['created_at'] ?? null,
            updatedAt: $row['updated_at'] ?? null,
        );
    }

    /**
     * Create new instance from agent payload.
     *
     * The $userId argument is required; the caller must obtain it from
     * the authenticated session, not from the payload.
     */
    public static function fromPayload(array $payload, int $userId): self
    {
        $company = self::normalizeString($payload['company_name'] ?? '');
        $title = self::normalizeString($payload['job_title'] ?? '');
        $sourceUrl = self::normalizeString($payload['source_url'] ?? '');
        $appliedAt = self::normalizeString($payload['applied_at'] ?? '');

        // user_id is part of the dedup key so different users posting the
        // same job don't collide; re-running the same automation by the
        // same user is idempotent.
        $idempotencyHash = hash('sha256', implode('|', [
            $userId,
            $company,
            $title,
            $sourceUrl,
            $appliedAt,
        ]));

        $technologies = self::normalizeTechnologies($payload['technologies'] ?? []);
        $workMode = self::normalizeWorkMode($payload['work_mode'] ?? 'unknown');
        $applicationStatus = self::normalizeApplicationStatus($payload['application_status'] ?? 'submitted');

        return new self(
            id: null,
            userId: $userId,
            idempotencyHash: $idempotencyHash,
            jobTitle: $title,
            companyName: $company,
            salaryText: self::nullableString($payload['salary_text'] ?? null),
            technologies: $technologies,
            appliedAt: $appliedAt,
            sourceUrl: $sourceUrl,
            locationText: self::nullableString($payload['location_text'] ?? null),
            province: self::nullableString($payload['province'] ?? null),
            country: self::nullableString($payload['country'] ?? null),
            workMode: $workMode,
            applicationStatus: $applicationStatus,
            notes: self::nullableString($payload['notes'] ?? null),
            externalJobId: self::nullableString($payload['external_job_id'] ?? null),
            rawPayload: $payload['raw_payload'] ?? null,
            agentName: self::nullableString($payload['agent_name'] ?? null),
        );
    }

    /**
     * Convert to array for API response
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->userId,
            'idempotencyHash' => $this->idempotencyHash,
            'jobTitle' => $this->jobTitle,
            'companyName' => $this->companyName,
            'salaryText' => $this->salaryText,
            'technologies' => $this->technologies,
            'appliedAt' => $this->appliedAt,
            'sourceUrl' => $this->sourceUrl,
            'locationText' => $this->locationText,
            'province' => $this->province,
            'country' => $this->country,
            'workMode' => $this->workMode,
            'applicationStatus' => $this->applicationStatus,
            'notes' => $this->notes,
            'externalJobId' => $this->externalJobId,
            'rawPayload' => $this->rawPayload,
            'agentName' => $this->agentName,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }

    /**
     * Convert to array for database insertion
     */
    public function toDatabase(): array
    {
        return [
            'user_id' => $this->userId,
            'idempotency_hash' => $this->idempotencyHash,
            'job_title' => $this->jobTitle,
            'company_name' => $this->companyName,
            'salary_text' => $this->salaryText,
            'technologies' => json_encode($this->technologies, JSON_UNESCAPED_UNICODE),
            'applied_at' => $this->appliedAt,
            'source_url' => $this->sourceUrl,
            'location_text' => $this->locationText,
            'province' => $this->province,
            'country' => $this->country,
            'work_mode' => $this->workMode,
            'application_status' => $this->applicationStatus,
            'notes' => $this->notes,
            'external_job_id' => $this->externalJobId,
            'raw_payload' => $this->rawPayload !== null ? json_encode($this->rawPayload, JSON_UNESCAPED_UNICODE) : null,
            'agent_name' => $this->agentName,
        ];
    }

    /**
     * Normalize technologies array: lowercase, trim, deduplicate
     *
     * @param mixed $technologies
     * @return string[]
     */
    private static function normalizeTechnologies(mixed $technologies): array
    {
        if (!is_array($technologies)) {
            return [];
        }

        $normalized = [];
        foreach ($technologies as $tech) {
            if (!is_string($tech)) {
                continue;
            }
            $clean = strtolower(trim($tech));
            if ($clean !== '' && !in_array($clean, $normalized, true)) {
                $normalized[] = $clean;
            }
        }

        return $normalized;
    }

    /**
     * Normalize work_mode to allowed values
     */
    private static function normalizeWorkMode(string $mode): string
    {
        $allowed = ['remote', 'hybrid', 'onsite', 'unknown'];
        $clean = strtolower(trim($mode));
        return in_array($clean, $allowed, true) ? $clean : 'unknown';
    }

    /**
     * Normalize application_status to allowed values
     */
    private static function normalizeApplicationStatus(string $status): string
    {
        $allowed = ['submitted', 'skipped', 'failed'];
        $clean = strtolower(trim($status));
        return in_array($clean, $allowed, true) ? $clean : 'submitted';
    }

    /**
     * Normalize string: trim whitespace
     */
    private static function normalizeString(string $value): string
    {
        return trim($value);
    }

    /**
     * Return null for empty strings, otherwise the trimmed string
     */
    private static function nullableString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim($value);
        return $trimmed !== '' ? $trimmed : null;
    }
}
