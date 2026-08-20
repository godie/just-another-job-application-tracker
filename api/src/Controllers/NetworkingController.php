<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use OverPHP\Core\Response;
use OverPHP\Libs\Database;
use OverPHP\Repositories\NetworkingRepository;

use function OverPHP\Helpers\app_session_get_user_id;
use function OverPHP\Helpers\app_session_start;

/**
 * Authenticated Networking CRM endpoints.
 *
 * Auth model: every record is scoped to the user_id stored in the session.
 * The body is trusted for shape, but the controller re-validates every
 * enum and ISO date before allowing the repository to run the transaction.
 * Foreign-key and owner-scope enforcement are the repository's job.
 */
class NetworkingController
{
    private NetworkingRepository $repo;

    public function __construct(?Database $db = null)
    {
        $config = require __DIR__ . '/../../config.php';
        $database = $db ?? new Database($config);
        $this->repo = new NetworkingRepository($database->getConnection());
    }

    /**
     * GET /sync/networking
     *
     * Returns the caller's full workspace. 401 without session, 200 with the
     * Task 1-shape array (or empty collections if the caller has never
     * pushed).
     */
    public function get(): Response
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return Response::json([
                'success' => false,
                'error' => 'Authentication required',
                'message' => 'Please log in to access this resource',
            ], 401);
        }

        $workspace = $this->repo->getWorkspace($userId);

        return Response::json([
            'success' => true,
            'schemaVersion' => $workspace['schemaVersion'],
            'contacts' => $workspace['contacts'],
            'interactions' => $workspace['interactions'],
            'followUpTasks' => $workspace['followUpTasks'],
            'contactLinks' => $workspace['contactLinks'],
            'referrals' => $workspace['referrals'],
        ]);
    }

    /**
     * POST /sync/networking
     *
     * Replaces the caller's full workspace. 401 without session. 400 for
     * body/JSON problems, 422 for schema/enum/date violations.
     */
    public function save(): Response
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return Response::json([
                'success' => false,
                'error' => 'Authentication required',
                'message' => 'Please log in to access this resource',
            ], 401);
        }

        $body = $this->getInputJson();
        if (!is_array($body)) {
            return Response::json([
                'success' => false,
                'error' => 'Invalid JSON body',
            ], 400);
        }

        $violation = $this->validateWorkspace($body);
        if ($violation !== null) {
            return Response::json([
                'success' => false,
                'error' => $violation,
            ], 422);
        }

        $this->repo->replaceWorkspace($userId, $body);

        return Response::json([
            'success' => true,
        ]);
    }

    /**
     * @return string|null Returns null on valid input, the first violation
     *                     message otherwise.
     */
    private function validateWorkspace(array $body): ?string
    {
        foreach (['contacts', 'interactions', 'followUpTasks', 'contactLinks', 'referrals'] as $key) {
            if (!array_key_exists($key, $body) || !is_array($body[$key])) {
                return "Field '{$key}' is required and must be an array";
            }
        }

        foreach ($body['contacts'] as $index => $row) {
            $violation = $this->validateContact($row);
            if ($violation !== null) {
                return "contacts[{$index}]: {$violation}";
            }
        }
        foreach ($body['interactions'] as $index => $row) {
            $violation = $this->validateInteraction($row);
            if ($violation !== null) {
                return "interactions[{$index}]: {$violation}";
            }
        }
        foreach ($body['followUpTasks'] as $index => $row) {
            $violation = $this->validateFollowUpTask($row);
            if ($violation !== null) {
                return "followUpTasks[{$index}]: {$violation}";
            }
        }
        foreach ($body['contactLinks'] as $index => $row) {
            $violation = $this->validateContactLink($row);
            if ($violation !== null) {
                return "contactLinks[{$index}]: {$violation}";
            }
        }
        foreach ($body['referrals'] as $index => $row) {
            $violation = $this->validateReferral($row);
            if ($violation !== null) {
                return "referrals[{$index}]: {$violation}";
            }
        }

        return null;
    }

    private function validateContact(mixed $row): ?string
    {
        if (!is_array($row)) {
            return 'must be an object';
        }
        $relationshipTypes = [
            'recruiter', 'hiring_manager', 'referrer', 'former_colleague',
            'mentor', 'peer', 'other',
        ];
        if (!in_array((string) ($row['relationship_type'] ?? ''), $relationshipTypes, true)) {
            return 'relationship_type must be one of: ' . implode(', ', $relationshipTypes);
        }
        if (!$this->isIsoDate($row['created_at'] ?? null)) {
            return 'created_at must be ISO-8601';
        }
        if (!$this->isIsoDate($row['updated_at'] ?? null)) {
            return 'updated_at must be ISO-8601';
        }
        return null;
    }

    private function validateInteraction(mixed $row): ?string
    {
        if (!is_array($row)) {
            return 'must be an object';
        }
        $channels = ['email', 'linkedin', 'phone', 'video', 'in_person', 'event', 'other'];
        if (!in_array((string) ($row['channel'] ?? ''), $channels, true)) {
            return 'channel must be one of: ' . implode(', ', $channels);
        }
        if (!in_array((string) ($row['status'] ?? ''), ['planned', 'completed'], true)) {
            return "status must be 'planned' or 'completed'";
        }
        foreach (['occurred_at', 'created_at', 'updated_at'] as $field) {
            if (!$this->isIsoDate($row[$field] ?? null)) {
                return "{$field} must be ISO-8601";
            }
        }
        return null;
    }

    private function validateFollowUpTask(mixed $row): ?string
    {
        if (!is_array($row)) {
            return 'must be an object';
        }
        foreach (['due_at', 'created_at', 'updated_at'] as $field) {
            if (!$this->isIsoDate($row[$field] ?? null)) {
                return "{$field} must be ISO-8601";
            }
        }
        if (array_key_exists('completed_at', $row) && $row['completed_at'] !== null && !$this->isIsoDate($row['completed_at'])) {
            return 'completed_at must be ISO-8601 or null';
        }
        return null;
    }

    private function validateContactLink(mixed $row): ?string
    {
        if (!is_array($row)) {
            return 'must be an object';
        }
        $resourceTypes = ['application', 'opportunity'];
        if (!in_array((string) ($row['resource_type'] ?? ''), $resourceTypes, true)) {
            return 'resource_type must be one of: ' . implode(', ', $resourceTypes);
        }
        if (!$this->isIsoDate($row['created_at'] ?? null)) {
            return 'created_at must be ISO-8601';
        }
        return null;
    }

    private function validateReferral(mixed $row): ?string
    {
        if (!is_array($row)) {
            return 'must be an object';
        }
        $resourceTypes = ['application', 'opportunity'];
        if (!in_array((string) ($row['resource_type'] ?? ''), $resourceTypes, true)) {
            return 'resource_type must be one of: ' . implode(', ', $resourceTypes);
        }
        $statuses = ['planned', 'requested', 'introduced', 'submitted', 'declined', 'completed'];
        if (!in_array((string) ($row['status'] ?? ''), $statuses, true)) {
            return 'status must be one of: ' . implode(', ', $statuses);
        }
        foreach (['requested_at', 'created_at', 'updated_at'] as $field) {
            if (!$this->isIsoDate($row[$field] ?? null)) {
                return "{$field} must be ISO-8601";
            }
        }
        return null;
    }

    private function isIsoDate(mixed $value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }
        // Mirror the frontend's networkingSchemas ISO check: today
        // (`YYYY-MM-DD`), ATOM (`YYYY-MM-DDTHH:MM:SS±HH:MM`), and the
        // millisecond variant JS emits via `new Date().toISOString()`.
        $pattern = '/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?)?$/';
        return preg_match($pattern, $value) === 1;
    }

    private function currentUserId(): ?int
    {
        app_session_start();
        $id = app_session_get_user_id();
        return $id;
    }

    /**
     * Read and decode the request body. Returning `mixed` keeps the
     * controller resilient to malformed inputs; callers check `is_array`.
     */
    protected function getInputJson(): mixed
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        try {
            return json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }
    }
}
