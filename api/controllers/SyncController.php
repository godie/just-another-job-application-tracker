<?php
/**
 * SyncController handles synchronization of applications and opportunities.
 */
class SyncController {
    private array $config;

    public function __construct() {
        $this->config = require __DIR__ . '/../config.php';
        require_once __DIR__ . '/../helpers/db.php';
    }

    private function checkAuth() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Not authenticated']);
            exit;
        }
        return $_SESSION['user_id'];
    }

    public function getApplications() {
        $userId = $this->checkAuth();
        try {
            $db = DB::getInstance($this->config)->getConnection();

            // Get applications
            $stmt = $db->prepare("SELECT * FROM applications WHERE user_id = ? AND is_deleted = 0");
            $stmt->execute([$userId]);
            $apps = $stmt->fetchAll();

            // Get timeline events for each application
            foreach ($apps as &$app) {
                $stmtEv = $db->prepare("SELECT id, type, custom_type_name as customTypeName, date, status, notes, interviewer_name as interviewerName FROM timeline_events WHERE application_id = ?");
                $stmtEv->execute([$app['id']]);
                $app['timeline'] = $stmtEv->fetchAll();

                // Map DB names back to frontend camelCase names
                $app['applicationDate'] = $app['application_date'];
                $app['interviewDate'] = $app['interview_date'];
                $app['contactName'] = $app['contact_name'];
                $app['workType'] = $app['work_type'];
                $app['hybridDaysInOffice'] = (int)$app['hybrid_days'];

                if ($app['custom_fields']) {
                    $app['customFields'] = json_decode($app['custom_fields'], true);
                }
            }

            return ['success' => true, 'applications' => $apps];
        } catch (\PDOException $e) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error during fetch: ' . $e->getMessage()];
        }
    }

    public function saveApplications() {
        $userId = $this->checkAuth();
        $json = file_get_contents('php://input') ?: '[]';
        $apps = json_decode($json, true);

        if (!is_array($apps)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid data format'];
        }

        try {
            $db = DB::getInstance($this->config)->getConnection();
            $db->beginTransaction();

            // Simple "overwrite" strategy for MVP
            // Delete existing
            $stmtDelEv = $db->prepare("DELETE FROM timeline_events WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)");
            $stmtDelEv->execute([$userId]);
            $stmtDelApp = $db->prepare("DELETE FROM applications WHERE user_id = ?");
            $stmtDelApp->execute([$userId]);

            // Insert new
            $stmtInsApp = $db->prepare("INSERT INTO applications (id, user_id, position, company, location, work_type, hybrid_days, salary, status, application_date, interview_date, platform, contact_name, link, notes, custom_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmtInsEv = $db->prepare("INSERT INTO timeline_events (id, application_id, type, custom_type_name, date, status, notes, interviewer_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($apps as $app) {
                $stmtInsApp->execute([
                    $app['id'],
                    $userId,
                    $app['position'] ?? '',
                    $app['company'] ?? '',
                    $app['location'] ?? null,
                    $app['workType'] ?? null,
                    $app['hybridDaysInOffice'] ?? null,
                    $app['salary'] ?? '',
                    $app['status'] ?? 'Applied',
                    $app['applicationDate'] ?? null,
                    $app['interviewDate'] ?? null,
                    $app['platform'] ?? '',
                    $app['contactName'] ?? '',
                    $app['link'] ?? '',
                    $app['notes'] ?? '',
                    isset($app['customFields']) ? json_encode($app['customFields']) : null
                ]);

                if (isset($app['timeline']) && is_array($app['timeline'])) {
                    foreach ($app['timeline'] as $ev) {
                        $stmtInsEv->execute([
                            $ev['id'] ?? uniqid('ev_', true),
                            $app['id'],
                            $ev['type'],
                            $ev['customTypeName'] ?? null,
                            $ev['date'],
                            $ev['status'],
                            $ev['notes'] ?? null,
                            $ev['interviewerName'] ?? null
                        ]);
                    }
                }
            }

            $db->commit();
            return ['success' => true, 'message' => 'Applications synced successfully'];
        } catch (\PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error during sync: ' . $e->getMessage()];
        }
    }

    public function getOpportunities() {
        $userId = $this->checkAuth();
        try {
            $db = DB::getInstance($this->config)->getConnection();
            $stmt = $db->prepare("SELECT * FROM opportunities WHERE user_id = ?");
            $stmt->execute([$userId]);
            $opps = $stmt->fetchAll();

            foreach ($opps as &$opp) {
                $opp['workType'] = $opp['work_type'];
            }

            return ['success' => true, 'opportunities' => $opps];
        } catch (\PDOException $e) {
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error during fetch opportunities: ' . $e->getMessage()];
        }
    }

    public function saveOpportunities() {
        $userId = $this->checkAuth();
        $json = file_get_contents('php://input') ?: '[]';
        $opps = json_decode($json, true);

        if (!is_array($opps)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Invalid data format'];
        }

        try {
            $db = DB::getInstance($this->config)->getConnection();
            $db->beginTransaction();

            $stmtDel = $db->prepare("DELETE FROM opportunities WHERE user_id = ?");
            $stmtDel->execute([$userId]);

            $stmtIns = $db->prepare("INSERT INTO opportunities (id, user_id, position, company, location, work_type, salary, platform, link, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($opps as $opp) {
                $stmtIns->execute([
                    $opp['id'],
                    $userId,
                    $opp['position'] ?? '',
                    $opp['company'] ?? '',
                    $opp['location'] ?? null,
                    $opp['workType'] ?? null,
                    $opp['salary'] ?? '',
                    $opp['platform'] ?? '',
                    $opp['link'] ?? '',
                    $opp['notes'] ?? '',
                    $opp['status'] ?? 'interested'
                ]);
            }

            $db->commit();
            return ['success' => true, 'message' => 'Opportunities synced successfully'];
        } catch (\PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            http_response_code(500);
            return ['success' => false, 'error' => 'Database error during sync opportunities: ' . $e->getMessage()];
        }
    }
}
