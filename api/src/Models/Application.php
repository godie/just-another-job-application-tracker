<?php

declare(strict_types=1);

namespace OverPHP\Models;

/**
 * Application Model - Job Application with timeline support
 */
class Application
{
    /** @var InterviewEvent[] */
    public array $timeline = [];

    public function __construct(
        public readonly ?string $id = null,
        public readonly ?int $userId = null,
        public readonly ?int $organizationId = null,
        public readonly string $company = "",
        public readonly string $position = "",
        public readonly string $status = "applied",
        public readonly ?string $platform = null,
        public readonly ?string $location = null,
        public readonly ?string $workType = null,
        public readonly ?int $hybridDays = null,
        public readonly ?string $salary = null,
        public readonly ?string $link = null,
        public readonly ?string $notes = null,
        public readonly ?string $applicationDate = null,
        public readonly ?string $interviewDate = null,
        public readonly ?string $contactName = null,
        public readonly ?string $followUpDate = null,
        public readonly ?array $customFields = null,
        public readonly bool $isDeleted = false,
        public readonly ?string $lastUpdate = null,
        public readonly ?string $createdAt = null,
    ) {}

    public static function fromDatabase(array $row): self
    {
        return new self(
            id: $row["id"] ?? null,
            userId: isset($row["user_id"]) ? (int) $row["user_id"] : null,
            organizationId: isset($row["organization_id"]) &&
            $row["organization_id"] !== ""
                ? (int) $row["organization_id"]
                : null,
            company: $row["company"] ?? "",
            position: $row["position"] ?? "",
            status: $row["status"] ?? "applied",
            platform: $row["platform"] ?? null,
            location: $row["location"] ?? null,
            workType: $row["work_type"] ?? null,
            hybridDays: isset($row["hybrid_days"])
                ? (int) $row["hybrid_days"]
                : null,
            salary: $row["salary"] ?? null,
            link: $row["link"] ?? null,
            notes: $row["notes"] ?? null,
            applicationDate: $row["application_date"] ?? null,
            interviewDate: $row["interview_date"] ?? null,
            contactName: $row["contact_name"] ?? null,
            followUpDate: $row["follow_up_date"] ?? null,
            customFields: isset($row["custom_fields"])
                ? json_decode($row["custom_fields"], true)
                : null,
            isDeleted: ($row["is_deleted"] ?? 0) === 1,
            lastUpdate: $row["last_update"] ?? ($row["updated_at"] ?? null),
            createdAt: $row["created_at"] ?? null,
        );
    }

    public static function fromTypeScript(
        array $data,
        int $userId,
        ?int $organizationId = null,
    ): self {
        return new self(
            id: $data["id"] ?? null,
            userId: $userId,
            organizationId: $organizationId,
            company: $data["company"] ?? "",
            position: $data["position"] ?? "",
            status: $data["status"] ?? "applied",
            platform: $data["platform"] ?? null,
            location: $data["location"] ?? null,
            workType: $data["workType"] ?? null,
            hybridDays: $data["hybridDaysInOffice"] ?? null,
            salary: $data["salary"] ?? null,
            link: $data["link"] ?? null,
            notes: $data["notes"] ?? null,
            applicationDate: $data["applicationDate"] ?? null,
            interviewDate: $data["interviewDate"] ?? null,
            contactName: $data["contactName"] ?? null,
            followUpDate: $data["followUpDate"] ?? null,
            customFields: $data["customFields"] ?? null,
            lastUpdate: date("Y-m-d H:i:s"),
            createdAt: date("Y-m-d H:i:s"),
            isDeleted: false,
        );
    }

    public function toDatabase(): array
    {
        $data = [
            "id" => $this->id,
            "user_id" => $this->userId,
            "organization_id" => $this->organizationId,
            "company" => $this->company,
            "position" => $this->position,
            "status" => $this->status,
            "platform" => $this->platform,
            "location" => $this->location,
            "work_type" => $this->workType,
            "hybrid_days" => $this->hybridDays,
            "salary" => $this->salary,
            "link" => $this->link,
            "notes" => $this->notes,
            "application_date" => $this->applicationDate,
            "interview_date" => $this->interviewDate,
            "contact_name" => $this->contactName,
            "follow_up_date" => $this->followUpDate,
            "custom_fields" => $this->customFields
                ? json_encode($this->customFields)
                : null,
            "is_deleted" => $this->isDeleted ? 1 : 0,
        ];

        return array_filter($data, fn($value) => $value !== null);
    }

    public function toArray(): array
    {
        return [
            "id" => $this->id,
            "position" => $this->position,
            "company" => $this->company,
            "status" => $this->status,
            "applicationDate" => $this->applicationDate,
            "interviewDate" => $this->interviewDate,
            "location" => $this->location,
            "workType" => $this->workType,
            "hybridDaysInOffice" => $this->hybridDays,
            "salary" => $this->salary,
            "platform" => $this->platform,
            "link" => $this->link,
            "notes" => $this->notes,
            "contactName" => $this->contactName,
            "followUpDate" => $this->followUpDate,
            "customFields" => $this->customFields,
            "timeline" => array_map(
                fn(InterviewEvent $event) => $event->toArray(),
                $this->timeline,
            ),
            "lastUpdate" => $this->lastUpdate,
            "createdAt" => $this->createdAt,
        ];
    }

    public function isActive(): bool
    {
        return !$this->isDeleted;
    }

    public function needsFollowUp(): bool
    {
        if ($this->followUpDate === null) {
            return false;
        }
        return strtotime($this->followUpDate) <= time();
    }

    public function getStatusDisplay(): string
    {
        return match ($this->status) {
            "applied" => "Applied",
            "interviewing" => "Interviewing",
            "offer" => "Offer Received",
            "rejected" => "Rejected",
            "withdrawn" => "Withdrawn",
            default => ucfirst($this->status),
        };
    }
}
