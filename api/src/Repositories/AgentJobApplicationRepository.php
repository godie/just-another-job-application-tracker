<?php

declare(strict_types=1);

namespace OverPHP\Repositories;

use OverPHP\Models\AgentJobApplication;
use PDO;

class AgentJobApplicationRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Find an application by its primary key, scoped to a single user.
     */
    public function findById(int $id, int $userId): ?AgentJobApplication
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM agent_job_applications WHERE id = :id AND user_id = :user_id LIMIT 1',
        );
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? AgentJobApplication::fromDatabase($row) : null;
    }

    /**
     * Find an application by its idempotency hash, scoped to a single user.
     */
    public function findByHash(string $hash, int $userId): ?AgentJobApplication
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM agent_job_applications WHERE idempotency_hash = :hash AND user_id = :user_id LIMIT 1',
        );
        $stmt->execute(['hash' => $hash, 'user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? AgentJobApplication::fromDatabase($row) : null;
    }

    public function create(AgentJobApplication $application): int
    {
        $data = $application->toDatabase();
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_map(fn ($k) => ":$k", array_keys($data)));

        $sql = "INSERT INTO agent_job_applications ($columns) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        return (int) $this->db->lastInsertId();
    }

    /**
     * List applications with optional filters. user_id is required and
     * added to the WHERE clause automatically — never trust an HTTP param
     * for ownership filtering.
     *
     * @param array<string,mixed> $filters
     * @return array{items: AgentJobApplication[], total: int}
     */
    public function list(array $filters = []): array
    {
        $where = [];
        $params = [];

        // user_id is mandatory for tenant isolation — refuse to query
        // without it so a programming bug surfaces immediately instead
        // of silently returning an empty list to the wrong caller.
        if (empty($filters['user_id'])) {
            throw new \InvalidArgumentException(
                'AgentJobApplicationRepository::list() requires user_id in $filters.'
            );
        }
        $where[] = 'user_id = :user_id';
        $params['user_id'] = (int) $filters['user_id'];

        if (!empty($filters['status'])) {
            $where[] = 'application_status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['company'])) {
            $where[] = 'company_name LIKE :company';
            $params['company'] = '%' . $filters['company'] . '%';
        }

        if (!empty($filters['work_mode'])) {
            $where[] = 'work_mode = :work_mode';
            $params['work_mode'] = $filters['work_mode'];
        }

        if (!empty($filters['province'])) {
            $where[] = 'province = :province';
            $params['province'] = $filters['province'];
        }

        if (!empty($filters['country'])) {
            $where[] = 'country = :country';
            $params['country'] = $filters['country'];
        }

        if (!empty($filters['agent_name'])) {
            $where[] = 'agent_name = :agent_name';
            $params['agent_name'] = $filters['agent_name'];
        }

        $whereSql = $where !== [] ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countSql = "SELECT COUNT(*) FROM agent_job_applications {$whereSql}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Fetch items
        $limit = max(1, min(100, (int) ($filters['limit'] ?? 50)));
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        $allowedSortColumns = ['applied_at', 'created_at', 'company_name', 'job_title'];
        $sortColumn = in_array($filters['sort_by'] ?? '', $allowedSortColumns, true)
            ? $filters['sort_by']
            : 'created_at';
        $sortOrder = strtoupper($filters['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $sql = "SELECT * FROM agent_job_applications {$whereSql} ORDER BY {$sortColumn} {$sortOrder} LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue(":{$key}", $value, $type);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $items = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $items[] = AgentJobApplication::fromDatabase($row);
        }

        return ['items' => $items, 'total' => $total];
    }
}
