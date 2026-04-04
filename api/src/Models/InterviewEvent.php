<?php
declare(strict_types=1);

namespace OverPHP\Models;

/**
 * Interview Event Model - Timeline events for job applications
 *
 * @property string|null $id
 * @property string|null $applicationId
 * @property int|null $userId
 * @property int|null $organizationId
 * @property string $type
 * @property string|null $customTypeName
 * @property string $date
 * @property string $status
 * @property string|null $notes
 * @property string|null $interviewerName
 * @property string|null $createdAt
 */
class InterviewEvent
{
    public function __construct(
        public readonly ?string $id = null,
        public readonly ?string $applicationId = null,
        public readonly ?int $userId = null,
        public readonly ?int $organizationId = null,
        public readonly string $type = "application_submitted",
        public readonly ?string $customTypeName = null,
        public readonly string $date = "",
        public readonly string $status = "pending",
        public readonly ?string $notes = null,
        public readonly ?string $interviewerName = null,
        public readonly ?string $createdAt = null,
    ) {}

    /**
     * Create from database row
     */
    public static function fromDatabase(array $row): self
    {
        return new self(
            id: $row["id"] ?? null,
            applicationId: $row["application_id"] ?? null,
            userId: isset($row["user_id"]) ? (int) $row["user_id"] : null,
            organizationId: isset($row["organization_id"]) &&
            $row["organization_id"] !== ""
                ? (int) $row["organization_id"]
                : null,
            type: $row["type"] ?? "application_submitted",
            customTypeName: $row["custom_type_name"] ?? null,
            date: $row["date"] ?? "",
            status: $row["status"] ?? "pending",
            notes: $row["notes"] ?? null,
            interviewerName: $row["interviewer_name"] ?? null,
            createdAt: $row["created_at"] ?? null,
        );
    }

    /**
     * Convert to array for database insertion
     */
    public function toDatabase(): array
    {
        $data = [
            "application_id" => $this->applicationId,
            "user_id" => $this->userId,
            "organization_id" => $this->organizationId,
            "type" => $this->type,
            "custom_type_name" => $this->customTypeName,
            "date" => $this->date,
            "status" => $this->status,
            "notes" => $this->notes,
            "interviewer_name" => $this->interviewerName,
        ];

        return array_filter($data, fn($value) => $value !== null);
    }

    /**
     * Convert to array for API response (matches TypeScript InterviewEvent)
     */
    public function toArray(): array
    {
        return [
            "id" => $this->id,
            "type" => $this->type,
            "date" => $this->date,
            "notes" => $this->notes,
            "status" => $this->status,
            "customTypeName" => $this->customTypeName,
            "interviewerName" => $this->interviewerName,
        ];
    }

    /**
     * Create from TypeScript InterviewEvent format
     */
    public static function fromTypeScript(
        array $data,
        string $applicationId,
        ?int $userId = null,
    ): self {
        return new self(
            id: $data["id"] ?? null,
            applicationId: $applicationId,
            userId: $userId,
            organizationId: null,
            type: $data["type"] ?? "application_submitted",
            customTypeName: $data["customTypeName"] ?? null,
            date: $data["date"] ?? date("Y-m-d H:i:s"),
            status: $data["status"] ?? "pending",
            notes: $data["notes"] ?? null,
            interviewerName: $data["interviewerName"] ?? null,
            createdAt: null,
        );
    }

    /**
     * Check if event is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === "completed";
    }

    /**
     * Check if event is scheduled (future)
     */
    public function isScheduled(): bool
    {
        return $this->status === "scheduled";
    }

    /**
     * Check if event is pending
     */
    public function isPending(): bool
    {
        return $this->status === "pending";
    }

    /**
     * Check if event is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === "cancelled";
    }

    /**
     * Get status display name
     */
    public function getStatusDisplay(): string
    {
        return match ($this->status) {
            "completed" => "Completed",
            "scheduled" => "Scheduled",
            "cancelled" => "Cancelled",
            "pending" => "Pending",
            default => ucfirst($this->status),
        };
    }

    /**
     * Get event type display name
     */
    public function getTypeDisplay(): string
    {
        $typeNames = [
            "application_submitted" => "Application Submitted",
            "screener_call" => "Screener Call",
            "first_contact" => "First Contact",
            "technical_interview" => "Technical Interview",
            "code_challenge" => "Code Challenge",
            "live_coding" => "Live Coding",
            "hiring_manager" => "Hiring Manager",
            "system_design" => "System Design",
            "cultural_fit" => "Cultural Fit",
            "final_round" => "Final Round",
            "offer" => "Offer Received",
            "rejected" => "Rejected",
            "withdrawn" => "Withdrawn",
            "custom" => "Custom",
        ];

        if ($this->type === "custom" && $this->customTypeName) {
            return $this->customTypeName;
        }

        return $typeNames[$this->type] ??
            ucfirst(str_replace("_", " ", $this->type));
    }
}
