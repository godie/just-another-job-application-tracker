<?php
declare(strict_types=1);

namespace OverPHP\Models;

use PDO;

/**
 * ModelMapper - Centralized data mapping between MySQL and TypeScript/JSON
 *
 * This class provides a unified interface for mapping between database rows
 * and model objects, as well as converting models to API responses.
 *
 * Designed for performance: minimal overhead, optimized for shared hosting.
 *
 * Usage:
 *   $mapper = new ModelMapper($pdo);
 *
 *   // Get applications for a user
 *   $applications = $mapper->getApplicationsByUserId(1);
 *
 *   // Create new application
 *   $mapper->createApplication($applicationData, $userId);
 *
 *   // Update application
 *   $mapper->updateApplication($id, $updateData);
 */
class ModelMapper
{
    public function __construct(private readonly PDO $pdo) {}

    // ============================================================
    // USER METHODS
    // ============================================================

    /**
     * Get user by ID
     */
    public function getUserById(int $id): ?User
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM users WHERE id = :id LIMIT 1",
        );
        $stmt->execute(["id" => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? User::fromDatabase($row) : null;
    }

    /**
     * Get user by email
     */
    public function getUserByEmail(string $email): ?User
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM users WHERE email = :email LIMIT 1",
        );
        $stmt->execute(["email" => $email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? User::fromDatabase($row) : null;
    }

    /**
     * Get user by Google ID
     */
    public function getUserByGoogleId(string $googleId): ?User
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM users WHERE google_id = :google_id LIMIT 1",
        );
        $stmt->execute(["google_id" => $googleId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? User::fromDatabase($row) : null;
    }

    /**
     * Create new user
     */
    public function createUser(User $user): int
    {
        $data = $user->toDatabase();
        $columns = implode(", ", array_keys($data));
        $placeholders = implode(
            ", ",
            array_map(fn($k) => ":$k", array_keys($data)),
        );

        $stmt = $this->pdo->prepare(
            "INSERT INTO users ($columns) VALUES ($placeholders)",
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Update user
     */
    public function updateUser(int $id, array $data): bool
    {
        if (empty($data)) {
            return false;
        }

        $sets = implode(
            ", ",
            array_map(fn($k) => "$k = :$k", array_keys($data)),
        );

        $stmt = $this->pdo->prepare("UPDATE users SET $sets WHERE id = :id");
        $data["id"] = $id;

        return $stmt->execute($data);
    }

    /**
     * Delete user (cascade will handle related data)
     */
    public function deleteUser(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = :id");
        return $stmt->execute(["id" => $id]);
    }

    // ============================================================
    // APPLICATION METHODS
    // ============================================================

    /**
     * Get all applications for a user
     */
    public function getApplicationsByUserId(
        int $userId,
        ?int $organizationId = null,
    ): array {
        $sql =
            "SELECT * FROM applications WHERE user_id = :user_id AND is_deleted = 0";
        $params = ["user_id" => $userId];

        if ($organizationId !== null) {
            $sql .=
                " AND (organization_id = :org_id OR organization_id IS NULL)";
            $params["org_id"] = $organizationId;
        }

        $sql .= " ORDER BY application_date DESC, created_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $applications = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $application = Application::fromDatabase($row);
            // Load timeline events
            $application->timeline = $this->getTimelineEventsByApplicationId(
                $row["id"],
            );
            $applications[] = $application;
        }

        return $applications;
    }

    /**
     * Get application by ID
     */
    public function getApplicationById(string $id): ?Application
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM applications WHERE id = :id AND is_deleted = 0 LIMIT 1",
        );
        $stmt->execute(["id" => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $application = Application::fromDatabase($row);
        $application->timeline = $this->getTimelineEventsByApplicationId($id);

        return $application;
    }

    /**
     * Create new application
     */
    public function createApplication(
        array $data,
        int $userId,
        ?int $organizationId = null,
    ): string {
        $application = Application::fromTypeScript(
            $data,
            $userId,
            $organizationId,
        );

        // Generate ID if not provided
        if (empty($application->id)) {
            $application = new Application(
                id: $this->generateId("app"),
                userId: $application->userId,
                organizationId: $application->organizationId,
                company: $application->company,
                position: $application->position,
                status: $application->status,
                platform: $application->platform,
                location: $application->location,
                workType: $application->workType,
                hybridDays: $application->hybridDays,
                salary: $application->salary,
                link: $application->link,
                notes: $application->notes,
                applicationDate: $application->applicationDate,
                interviewDate: $application->interviewDate,
                followUpDate: $application->followUpDate,
                contactName: $application->contactName,
                customFields: $application->customFields,
                lastUpdate: date("Y-m-d H:i:s"),
                createdAt: date("Y-m-d H:i:s"),
                isDeleted: false,
            );
        }

        $data = $application->toDatabase();
        $columns = implode(", ", array_keys($data));
        $placeholders = implode(
            ", ",
            array_map(fn($k) => ":$k", array_keys($data)),
        );

        $stmt = $this->pdo->prepare(
            "INSERT INTO applications ($columns) VALUES ($placeholders)",
        );
        $stmt->execute($data);

        return $application->id;
    }

    /**
     * Update application
     */
    public function updateApplication(string $id, array $data): bool
    {
        // Convert camelCase keys to snake_case
        $mappedData = $this->mapTypeScriptToDatabase($data);
        $mappedData["last_update"] = date("Y-m-d H:i:s");

        $sets = implode(
            ", ",
            array_map(fn($k) => "$k = :$k", array_keys($mappedData)),
        );

        $stmt = $this->pdo->prepare(
            "UPDATE applications SET $sets WHERE id = :id",
        );
        $mappedData["id"] = $id;

        return $stmt->execute($mappedData);
    }

    /**
     * Delete application (soft delete)
     */
    public function deleteApplication(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE applications SET is_deleted = 1, last_update = :now WHERE id = :id",
        );

        return $stmt->execute(["id" => $id, "now" => date("Y-m-d H:i:s")]);
    }

    /**
     * Get applications by status
     */
    public function getApplicationsByStatus(int $userId, string $status): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM applications
             WHERE user_id = :user_id AND status = :status AND is_deleted = 0
             ORDER BY application_date DESC",
        );
        $stmt->execute(["user_id" => $userId, "status" => $status]);

        $applications = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $applications[] = Application::fromDatabase($row);
        }

        return $applications;
    }

    // ============================================================
    // TIMELINE EVENTS METHODS
    // ============================================================

    /**
     * Get timeline events for an application
     */
    public function getTimelineEventsByApplicationId(
        string $applicationId,
    ): array {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM timeline_events
             WHERE application_id = :app_id
             ORDER BY date ASC",
        );
        $stmt->execute(["app_id" => $applicationId]);

        $events = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $events[] = InterviewEvent::fromDatabase($row);
        }

        return $events;
    }

    /**
     * Create timeline event
     */
    public function createTimelineEvent(
        array $data,
        string $applicationId,
        ?int $userId = null,
    ): string {
        $event = InterviewEvent::fromTypeScript($data, $applicationId, $userId);

        if (empty($event->id)) {
            $event = new InterviewEvent(
                id: $this->generateId("evt"),
                applicationId: $applicationId,
                userId: $userId,
                type: $event->type,
                customTypeName: $event->customTypeName,
                date: $event->date,
                status: $event->status,
                notes: $event->notes,
                interviewerName: $event->interviewerName,
                createdAt: date("Y-m-d H:i:s"),
            );
        }

        $data = $event->toDatabase();
        $columns = implode(", ", array_keys($data));
        $placeholders = implode(
            ", ",
            array_map(fn($k) => ":$k", array_keys($data)),
        );

        $stmt = $this->pdo->prepare(
            "INSERT INTO timeline_events ($columns) VALUES ($placeholders)",
        );
        $stmt->execute($data);

        return $event->id;
    }

    /**
     * Update timeline event
     */
    public function updateTimelineEvent(string $id, array $data): bool
    {
        $mappedData = $this->mapTypeScriptToDatabase($data);

        $sets = implode(
            ", ",
            array_map(fn($k) => "$k = :$k", array_keys($mappedData)),
        );

        $stmt = $this->pdo->prepare(
            "UPDATE timeline_events SET $sets WHERE id = :id",
        );
        $mappedData["id"] = $id;

        return $stmt->execute($mappedData);
    }

    /**
     * Delete timeline event
     */
    public function deleteTimelineEvent(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            "DELETE FROM timeline_events WHERE id = :id",
        );
        return $stmt->execute(["id" => $id]);
    }

    // ============================================================
    // OPPORTUNITY METHODS
    // ============================================================

    /**
     * Get all opportunities for a user
     */
    public function getOpportunitiesByUserId(
        int $userId,
        ?int $organizationId = null,
    ): array {
        $sql =
            "SELECT * FROM opportunities WHERE user_id = :user_id AND is_deleted = 0";
        $params = ["user_id" => $userId];

        if ($organizationId !== null) {
            $sql .=
                " AND (organization_id = :org_id OR organization_id IS NULL)";
            $params["org_id"] = $organizationId;
        }

        $sql .= " ORDER BY captured_date DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $opportunities = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $opportunities[] = Opportunity::fromRow($row);
        }

        return $opportunities;
    }

    /**
     * Get opportunity by ID
     */
    public function getOpportunityById(string $id): ?Opportunity
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM opportunities WHERE id = :id AND is_deleted = 0 LIMIT 1",
        );
        $stmt->execute(["id" => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Opportunity::fromRow($row) : null;
    }

    /**
     * Create new opportunity
     */
    public function createOpportunity(
        array $data,
        int $userId,
        ?int $organizationId = null,
    ): string {
        $opportunity = Opportunity::fromTypeScript(
            $data,
            $userId,
            $organizationId,
        );

        if (empty($opportunity->id)) {
            $opportunity = new Opportunity(
                id: $this->generateId("opp"),
                userId: $userId,
                organizationId: $organizationId,
                company: $opportunity->company,
                position: $opportunity->position,
                link: $opportunity->link,
                description: $opportunity->description,
                salary: $opportunity->salary,
                location: $opportunity->location,
                workType: $opportunity->workType,
                platform: $opportunity->platform,
                postedDate: $opportunity->postedDate,
                notes: $opportunity->notes,
                status: "interested",
                capturedDate: date("Y-m-d H:i:s"),
                updatedAt: date("Y-m-d H:i:s"),
                isDeleted: false,
            );
        }

        $data = $opportunity->toArray();
        $columns = implode(", ", array_keys($data));
        $placeholders = implode(
            ", ",
            array_map(fn($k) => ":$k", array_keys($data)),
        );

        $stmt = $this->pdo->prepare(
            "INSERT INTO opportunities ($columns) VALUES ($placeholders)",
        );
        $stmt->execute($data);

        return $opportunity->id;
    }

    /**
     * Update opportunity
     */
    public function updateOpportunity(string $id, array $data): bool
    {
        $mappedData = $this->mapTypeScriptToDatabase($data);
        $mappedData["updated_at"] = date("Y-m-d H:i:s");

        $sets = implode(
            ", ",
            array_map(fn($k) => "$k = :$k", array_keys($mappedData)),
        );

        $stmt = $this->pdo->prepare(
            "UPDATE opportunities SET $sets WHERE id = :id",
        );
        $mappedData["id"] = $id;

        return $stmt->execute($mappedData);
    }

    /**
     * Delete opportunity (soft delete)
     */
    public function deleteOpportunity(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE opportunities SET is_deleted = 1, updated_at = :now WHERE id = :id",
        );

        return $stmt->execute(["id" => $id, "now" => date("Y-m-d H:i:s")]);
    }

    // ============================================================
    // USER PREFERENCES METHODS
    // ============================================================

    /**
     * Get user preferences
     */
    public function getUserPreferences(int $userId): UserPreferences
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM user_preferences WHERE user_id = :user_id LIMIT 1",
        );
        $stmt->execute(["user_id" => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            return UserPreferences::fromRow($row);
        }

        // Return defaults if not found
        return UserPreferences::createDefault($userId);
    }

    /**
     * Save user preferences
     */
    public function saveUserPreferences(int $userId, array $data): bool
    {
        // Map camelCase to snake_case
        $mapped = [];

        $map = [
            "theme" => "theme",
            "language" => "language",
            "defaultView" => "preferred_view",
            "pageSize" => "page_size",
            "dateFormat" => "date_format",
            "enabledFields" => "enabled_fields",
            "columnOrder" => "column_order",
            "customFields" => "custom_fields",
            "customInterviewEvents" => "custom_interview_events",
            "atsSearch" => "ats_search",
            "emailScanMonths" => "email_scan_months",
            "enabledChatbots" => "enabled_chatbots",
        ];

        foreach ($map as $tsKey => $dbKey) {
            if (isset($data[$tsKey])) {
                $value = $data[$tsKey];

                // Encode arrays to JSON
                if (is_array($value)) {
                    $mapped[$dbKey] = json_encode($value);
                } else {
                    $mapped[$dbKey] = $value;
                }
            }
        }

        // Check if preferences exist
        $stmt = $this->pdo->prepare(
            "SELECT user_id FROM user_preferences WHERE user_id = :user_id",
        );
        $stmt->execute(["user_id" => $userId]);

        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            // Update
            $sets = implode(
                ", ",
                array_map(fn($k) => "$k = :$k", array_keys($mapped)),
            );
            $mapped["user_id"] = $userId;

            $stmt = $this->pdo->prepare(
                "UPDATE user_preferences SET $sets WHERE user_id = :user_id",
            );
        } else {
            // Insert
            $mapped["user_id"] = $userId;
            $mapped["created_at"] = date("Y-m-d H:i:s");

            $columns = implode(", ", array_keys($mapped));
            $placeholders = implode(
                ", ",
                array_map(fn($k) => ":$k", array_keys($mapped)),
            );

            $stmt = $this->pdo->prepare(
                "INSERT INTO user_preferences ($columns) VALUES ($placeholders)",
            );
        }

        return $stmt->execute($mapped);
    }

    // ============================================================
    // ORGANIZATION METHODS
    // ============================================================

    /**
     * Get organization by ID
     */
    public function getOrganizationById(int $id): ?Organization
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM organizations WHERE id = :id AND is_active = 1 LIMIT 1",
        );
        $stmt->execute(["id" => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Organization::fromDatabase($row) : null;
    }

    /**
     * Get organization by slug
     */
    public function getOrganizationBySlug(string $slug): ?Organization
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM organizations WHERE slug = :slug AND is_active = 1 LIMIT 1",
        );
        $stmt->execute(["slug" => $slug]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? Organization::fromDatabase($row) : null;
    }

    /**
     * Create organization
     */
    public function createOrganization(Organization $organization): int
    {
        $data = $organization->toDatabase();
        $columns = implode(", ", array_keys($data));
        $placeholders = implode(
            ", ",
            array_map(fn($k) => ":$k", array_keys($data)),
        );

        $stmt = $this->pdo->prepare(
            "INSERT INTO organizations ($columns) VALUES ($placeholders)",
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Generate unique ID
     */
    private function generateId(string $prefix): string
    {
        return $prefix . "_" . bin2hex(random_bytes(8));
    }

    /**
     * Map TypeScript camelCase keys to MySQL snake_case
     */
    private function mapTypeScriptToDatabase(array $data): array
    {
        $map = [
            "applicationDate" => "application_date",
            "interviewDate" => "interview_date",
            "followUpDate" => "follow_up_date",
            "contactName" => "contact_name",
            "customFields" => "custom_fields",
            "workType" => "work_type",
            "hybridDaysInOffice" => "hybrid_days",
            "lastUpdate" => "last_update",
            "createdAt" => "created_at",
            "postedDate" => "posted_date",
            "capturedDate" => "captured_date",
            "interviewerName" => "interviewer_name",
            "customTypeName" => "custom_type_name",
            "isDeleted" => "is_deleted",
            "isActive" => "is_active",
            "isPublic" => "is_public",
            "displayName" => "display_name",
            "avatarUrl" => "avatar_url",
            "googleId" => "google_id",
            "passwordHash" => "password_hash",
            "organizationId" => "organization_id",
            "userId" => "user_id",
            "applicationId" => "application_id",
        ];

        $mapped = [];
        foreach ($data as $key => $value) {
            $dbKey = $map[$key] ?? $this->camelToSnake($key);

            // Encode arrays to JSON
            if (is_array($value)) {
                $mapped[$dbKey] = json_encode($value);
            } else {
                $mapped[$dbKey] = $value;
            }
        }

        return $mapped;
    }

    /**
     * Convert camelCase to snake_case
     */
    private function camelToSnake(string $input): string
    {
        return strtolower(preg_replace("/(?<!^)[A-Z]/", '_$0', $input));
    }

    /**
     * Begin transaction
     */
    public function beginTransaction(): void
    {
        $this->pdo->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit(): void
    {
        $this->pdo->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback(): void
    {
        $this->pdo->rollBack();
    }

    /**
     * Get PDO instance (for advanced queries)
     */
    public function getPdo(): PDO
    {
        return $this->pdo;
    }
}
