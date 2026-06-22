<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use OverPHP\Core\Response;
use OverPHP\Libs\Database;
use OverPHP\Models\AgentJobApplication;
use OverPHP\Repositories\AgentJobApplicationRepository;
use function OverPHP\Helpers\app_session_get_user_id;

/**
 * Agent Job Applications Controller
 *
 * Authenticated via the standard session (RequireAuth). All records are
 * scoped to the user_id stored in the session; users only see their own
 * applications. The `agent_name` field in the payload is a free-text label
 * for which automation posted the record (e.g. "codex-canada-search"),
 * not an auth credential.
 */
class AgentJobApplicationController
{
    private AgentJobApplicationRepository $repo;

    public function __construct(?Database $db = null)
    {
        $config = require __DIR__ . '/../../config.php';
        $database = $db ?? new Database($config);
        $this->repo = new AgentJobApplicationRepository($database->getConnection());
    }

    /**
     * POST /api/agent/job-applications
     *
     * Create a new agent job application. Idempotent by design.
     * user_id comes from the authenticated session and is bound to the row.
     */
    public function store(): Response
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return Response::json([
                'success' => false,
                'error' => 'Authentication required',
                'message' => 'Please log in to access this resource',
            ], 401);
        }

        $data = $this->getInputJson();

        if (!is_array($data)) {
            return Response::json([
                'success' => false,
                'error' => 'Invalid JSON body',
            ], 400);
        }

        // Validate required fields
        $required = ['job_title', 'company_name', 'source_url', 'applied_at'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || trim($data[$field]) === '') {
                return Response::json([
                    'success' => false,
                    'error' => "Field '{$field}' is required and must be a non-empty string",
                ], 400);
            }
        }

        // Validate applied_at is a valid ISO 8601 datetime
        $appliedAt = trim($data['applied_at']);
        $dt = \DateTime::createFromFormat(\DateTime::ATOM, $appliedAt);
        if ($dt === false) {
            // Try common ISO formats
            $formats = [\DateTime::ATOM, 'Y-m-d\TH:i:sP', 'Y-m-d\TH:i:s.uP', 'Y-m-d H:i:s', 'Y-m-d'];
            foreach ($formats as $fmt) {
                $dt = \DateTime::createFromFormat($fmt, $appliedAt);
                if ($dt !== false) {
                    break;
                }
            }
        }
        if ($dt === false) {
            return Response::json([
                'success' => false,
                'error' => "Field 'applied_at' must be a valid ISO 8601 datetime",
            ], 400);
        }

        // Normalize to UTC ISO 8601
        $dt->setTimezone(new \DateTimeZone('UTC'));
        $data['applied_at'] = $dt->format(\DateTime::ATOM);

        // Validate source_url
        $sourceUrl = trim($data['source_url']);
        if (!filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
            return Response::json([
                'success' => false,
                'error' => "Field 'source_url' must be a valid URL",
            ], 400);
        }

        // Build model from payload (userId from session, NOT from payload)
        $application = AgentJobApplication::fromPayload($data, $userId);

        // Check for duplicate via idempotency hash, scoped to current user
        $existing = $this->repo->findByHash($application->idempotencyHash, $userId);
        if ($existing !== null) {
            return Response::json([
                'success' => true,
                'data' => $existing->toArray(),
                'isDuplicate' => true,
                'message' => 'Application already exists (duplicate detected)',
            ], 200);
        }

        // Insert new record
        $id = $this->repo->create($application);
        $created = $this->repo->findById($id, $userId);

        if ($created === null) {
            return Response::json([
                'success' => false,
                'error' => 'Failed to create application',
            ], 500);
        }

        return Response::json([
            'success' => true,
            'data' => $created->toArray(),
            'isDuplicate' => false,
            'message' => 'Application recorded successfully',
        ], 201);
    }

    /**
     * GET /api/agent/job-applications
     *
     * List the authenticated user's agent job applications with optional filters.
     */
    public function index(): Response
    {
        $userId = $this->currentUserId();
        if ($userId === null) {
            return Response::json([
                'success' => false,
                'error' => 'Authentication required',
                'message' => 'Please log in to access this resource',
            ], 401);
        }

        // user_id filter is appended implicitly — never trust params from the client
        $filters = [
            'user_id' => $userId,
            'status' => $_GET['status'] ?? null,
            'company' => $_GET['company'] ?? null,
            'work_mode' => $_GET['work_mode'] ?? null,
            'province' => $_GET['province'] ?? null,
            'country' => $_GET['country'] ?? null,
            'agent_name' => $_GET['agent_name'] ?? null,
            'limit' => isset($_GET['limit']) ? (int) $_GET['limit'] : 50,
            'offset' => isset($_GET['offset']) ? (int) $_GET['offset'] : 0,
            'sort_by' => $_GET['sort_by'] ?? 'created_at',
            'sort_order' => $_GET['sort_order'] ?? 'DESC',
        ];

        $result = $this->repo->list($filters);

        return Response::json([
            'success' => true,
            'data' => array_map(fn ($item) => $item->toArray(), $result['items']),
            'meta' => [
                'total' => $result['total'],
                'limit' => (int) ($filters['limit'] ?? 50),
                'offset' => (int) ($filters['offset'] ?? 0),
            ],
        ]);
    }

    protected function getInputJson(): mixed
    {
        $json = file_get_contents('php://input') ?: '{}';
        return json_decode($json, true);
    }

    /**
     * Read user_id from the authenticated session.
     *
     * The session is already started by Security::startSecureSession() in
     * the route dispatcher (index.php) before the controller is reached,
     * and by the test fixture's loginAs(); no defensive start is needed
     * here. Reading $_SESSION after forgetting to start it would just
     * surface as a missing user_id and return 401, which is the correct
     * behavior for an unauthenticated request.
     */
    protected function currentUserId(): ?int
    {
        return app_session_get_user_id();
    }
}
