<?php
declare(strict_types=1);
namespace OverPHP\Models;

/**
 * User Preferences Model
 *
 * Stores user-specific settings and preferences
 * Maps to user_preferences table
 *
 * @property int $userId
 * @property string $theme ('system', 'light', 'dark')
 * @property string $language ('en', 'es', etc.)
 * @property string $preferredView ('table', 'timeline', 'kanban', 'calendar')
 * @property int $pageSize
 * @property string $dateFormat
 * @property array|null $enabledFields
 * @property array|null $columnOrder
 * @property array|null $customFields
 * @property array|null $customInterviewEvents
 * @property array|null $atsSearch
 * @property int $emailScanMonths
 * @property array|null $enabledChatbots
 * @property string|null $createdAt
 * @property string|null $updatedAt
 */
class UserPreferences
{
    public function __construct(
        public readonly int $userId = 0,
        public readonly string $theme = "system",
        public readonly string $language = "en",
        public readonly string $preferredView = "table",
        public readonly int $pageSize = 10,
        public readonly string $dateFormat = "DD/MM/YYYY",
        public readonly ?array $enabledFields = null,
        public readonly ?array $columnOrder = null,
        public readonly ?array $customFields = null,
        public readonly ?array $customInterviewEvents = null,
        public readonly ?array $atsSearch = null,
        public readonly int $emailScanMonths = 3,
        public readonly ?array $enabledChatbots = null,
        public readonly ?string $createdAt = null,
        public readonly ?string $updatedAt = null,
    ) {}

    /**
     * Create from database row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            userId: (int) ($row["user_id"] ?? 0),
            theme: $row["theme"] ?? "system",
            language: $row["language"] ?? "en",
            preferredView: $row["preferred_view"] ?? "table",
            pageSize: (int) ($row["page_size"] ?? 10),
            dateFormat: $row["date_format"] ?? "DD/MM/YYYY",
            enabledFields: isset($row["enabled_fields"])
                ? json_decode($row["enabled_fields"], true)
                : null,
            columnOrder: isset($row["column_order"])
                ? json_decode($row["column_order"], true)
                : null,
            customFields: isset($row["custom_fields"])
                ? json_decode($row["custom_fields"], true)
                : null,
            customInterviewEvents: isset($row["custom_interview_events"])
                ? json_decode($row["custom_interview_events"], true)
                : null,
            atsSearch: isset($row["ats_search"])
                ? json_decode($row["ats_search"], true)
                : null,
            emailScanMonths: (int) ($row["email_scan_months"] ?? 3),
            enabledChatbots: isset($row["enabled_chatbots"])
                ? json_decode($row["enabled_chatbots"], true)
                : null,
            createdAt: $row["created_at"] ?? null,
            updatedAt: $row["updated_at"] ?? null,
        );
    }

    /**
     * Create default preferences for a new user
     */
    public static function createDefault(int $userId): self
    {
        return new self(
            userId: $userId,
            theme: "system",
            language: "en",
            preferredView: "table",
            pageSize: 10,
            dateFormat: "DD/MM/YYYY",
            enabledFields: self::getDefaultEnabledFields(),
            columnOrder: self::getDefaultColumnOrder(),
            customFields: [],
            customInterviewEvents: [],
            atsSearch: ["roles" => "", "keywords" => "", "location" => ""],
            emailScanMonths: 3,
            enabledChatbots: [],
            createdAt: date("Y-m-d H:i:s"),
            updatedAt: date("Y-m-d H:i:s"),
        );
    }

    /**
     * Convert to array for database insertion
     */
    public function toArray(): array
    {
        return [
            "user_id" => $this->userId,
            "theme" => $this->theme,
            "language" => $this->language,
            "preferred_view" => $this->preferredView,
            "page_size" => $this->pageSize,
            "date_format" => $this->dateFormat,
            "enabled_fields" => $this->enabledFields
                ? json_encode($this->enabledFields)
                : null,
            "column_order" => $this->columnOrder
                ? json_encode($this->columnOrder)
                : null,
            "custom_fields" => $this->customFields
                ? json_encode($this->customFields)
                : null,
            "custom_interview_events" => $this->customInterviewEvents
                ? json_encode($this->customInterviewEvents)
                : null,
            "ats_search" => $this->atsSearch
                ? json_encode($this->atsSearch)
                : null,
            "email_scan_months" => $this->emailScanMonths,
            "enabled_chatbots" => $this->enabledChatbots
                ? json_encode($this->enabledChatbots)
                : null,
        ];
    }

    /**
     * Convert to array for API response
     */
    public function toResponse(): array
    {
        return [
            "theme" => $this->theme,
            "language" => $this->language,
            "defaultView" => $this->preferredView,
            "pageSize" => $this->pageSize,
            "dateFormat" => $this->dateFormat,
            "enabledFields" => $this->enabledFields,
            "columnOrder" => $this->columnOrder,
            "customFields" => $this->customFields,
            "customInterviewEvents" => $this->customInterviewEvents,
            "atsSearch" => $this->atsSearch,
            "emailScanMonths" => $this->emailScanMonths,
            "enabledChatbots" => $this->enabledChatbots,
        ];
    }

    /**
     * Get default enabled fields for new users
     *
     * @return string[]
     */
    private static function getDefaultEnabledFields(): array
    {
        return [
            "position",
            "company",
            "status",
            "applicationDate",
            "location",
            "workType",
            "salary",
            "platform",
        ];
    }

    /**
     * Get default column order for new users
     *
     * @return string[]
     */
    private static function getDefaultColumnOrder(): array
    {
        return [
            "position",
            "company",
            "status",
            "applicationDate",
            "location",
            "workType",
            "salary",
            "platform",
            "link",
            "notes",
        ];
    }

    /**
     * Check if dark mode is enabled
     */
    public function isDarkMode(): bool
    {
        return $this->theme === "dark";
    }

    /**
     * Check if system theme preference is used
     */
    public function isSystemTheme(): bool
    {
        return $this->theme === "system";
    }

    /**
     * Get effective theme (resolves 'system' to actual theme)
     */
    public function getEffectiveTheme(bool $systemIsDark = false): string
    {
        if ($this->theme === "system") {
            return $systemIsDark ? "dark" : "light";
        }
        return $this->theme;
    }

    /**
     * Check if a field is enabled
     */
    public function isFieldEnabled(string $fieldId): bool
    {
        if ($this->enabledFields === null) {
            return true; // All fields enabled by default
        }
        return in_array($fieldId, $this->enabledFields, true);
    }

    /**
     * Update a single preference
     */
    public function with(string $key, mixed $value): self
    {
        return match ($key) {
            "userId" => new self(
                userId: (int) $value,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "theme" => new self(
                userId: $this->userId,
                theme: (string) $value,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "language" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: (string) $value,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "preferredView" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: (string) $value,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "pageSize" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: (int) $value,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "dateFormat" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: (string) $value,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "enabledFields" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: is_array($value) ? $value : null,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "columnOrder" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: is_array($value) ? $value : null,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "customFields" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: is_array($value) ? $value : null,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "customInterviewEvents" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: is_array($value) ? $value : null,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "atsSearch" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: is_array($value) ? $value : null,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "emailScanMonths" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: (int) $value,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "enabledChatbots" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: is_array($value) ? $value : null,
                createdAt: $this->createdAt,
                updatedAt: $this->updatedAt,
            ),
            "createdAt" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $value !== null ? (string) $value : null,
                updatedAt: $this->updatedAt,
            ),
            "updatedAt" => new self(
                userId: $this->userId,
                theme: $this->theme,
                language: $this->language,
                preferredView: $this->preferredView,
                pageSize: $this->pageSize,
                dateFormat: $this->dateFormat,
                enabledFields: $this->enabledFields,
                columnOrder: $this->columnOrder,
                customFields: $this->customFields,
                customInterviewEvents: $this->customInterviewEvents,
                atsSearch: $this->atsSearch,
                emailScanMonths: $this->emailScanMonths,
                enabledChatbots: $this->enabledChatbots,
                createdAt: $this->createdAt,
                updatedAt: $value !== null ? (string) $value : null,
            ),
            default => throw new \InvalidArgumentException("Unknown preference key: {$key}"),
        };
    }
}
