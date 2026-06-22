<?php

declare(strict_types=1);

namespace OverPHP\Tests\Controllers;

use OverPHP\Controllers\AgentJobApplicationController;
use OverPHP\Libs\Database;
use OverPHP\Repositories\AgentJobApplicationRepository;
use PHPUnit\Framework\TestCase;

/**
 * Testable subclass that allows injecting a mock database/config.
 */
class TestableAgentJobApplicationController extends AgentJobApplicationController
{
    public mixed $mockInput = [];
    public bool $simulateInvalidJson = false;
    public ?AgentJobApplicationRepository $mockRepo = null;

    protected function getInputJson(): mixed
    {
        if ($this->simulateInvalidJson) {
            return null;
        }
        return is_array($this->mockInput) ? $this->mockInput : [];
    }
}

class AgentJobApplicationControllerTest extends TestCase
{
    private ?\PDO $db = null;
    private TestableAgentJobApplicationController $controller;
    private string $apiKey = 'test-agent-api-key-12345';

    protected function setUp(): void
    {
        $this->db = new \PDO('sqlite::memory:');
        $this->db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA foreign_keys=ON;');

        $this->createSchema();

        $config = [
            'database' => [
                'enabled' => true,
                'driver' => 'sqlite',
                'sqlite' => [
                    'path' => ':memory:',
                    'options' => [],
                ],
            ],
            'agent_api_key' => $this->apiKey,
        ];

        $database = new Database($config);
        // Inject our in-memory PDO connection
        $reflection = new \ReflectionClass($database);
        $connectionProp = $reflection->getProperty('connection');
        $connectionProp->setAccessible(true);
        $connectionProp->setValue($database, $this->db);

        $this->controller = new TestableAgentJobApplicationController($database, $config);
        http_response_code(200);
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $this->apiKey;
    }

    protected function tearDown(): void
    {
        unset($_SERVER['HTTP_AUTHORIZATION']);
        $this->db = null;
    }

    private function createSchema(): void
    {
        $this->db->exec('
            CREATE TABLE IF NOT EXISTS agent_job_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idempotency_hash VARCHAR(64) UNIQUE NOT NULL,
                job_title VARCHAR(255) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                salary_text VARCHAR(255),
                technologies TEXT,
                applied_at DATETIME NOT NULL,
                source_url TEXT NOT NULL,
                location_text VARCHAR(255),
                province VARCHAR(100),
                country VARCHAR(100),
                work_mode VARCHAR(20) DEFAULT \'unknown\',
                application_status VARCHAR(20) DEFAULT \'submitted\',
                notes TEXT,
                external_job_id VARCHAR(255),
                raw_payload TEXT,
                agent_name VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ');
    }

    // ── Authentication Tests ─────────────────────────────────────────

    public function testStoreReturns401WithoutApiKey(): void
    {
        unset($_SERVER['HTTP_AUTHORIZATION']);

        $this->controller->mockInput = $this->validPayload();
        $response = $this->controller->store();

        $this->assertEquals(401, $response->getStatusCode());
        $content = json_decode($this->captureResponse($response), true);
        $this->assertFalse($content['success']);
        $this->assertEquals('Authorization header missing', $content['error']);
    }

    public function testStoreReturns401WithInvalidApiKey(): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer invalid-key';

        $this->controller->mockInput = $this->validPayload();
        $response = $this->controller->store();

        $this->assertEquals(401, $response->getStatusCode());
        $content = json_decode($this->captureResponse($response), true);
        $this->assertFalse($content['success']);
        $this->assertEquals('Invalid API key', $content['error']);
    }

    public function testIndexReturns401WithoutApiKey(): void
    {
        unset($_SERVER['HTTP_AUTHORIZATION']);

        $response = $this->controller->index();

        $this->assertEquals(401, $response->getStatusCode());
        $content = json_decode($this->captureResponse($response), true);
        $this->assertFalse($content['success']);
    }

    // ── Validation Tests ─────────────────────────────────────────────

    public function testStoreReturns400ForMissingJobTitle(): void
    {
        $payload = $this->validPayload();
        unset($payload['job_title']);
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($content['success']);
        $this->assertStringContainsString("job_title", $content['error']);
    }

    public function testStoreReturns400ForEmptyCompanyName(): void
    {
        $payload = $this->validPayload();
        $payload['company_name'] = '   ';
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($content['success']);
        $this->assertStringContainsString("company_name", $content['error']);
    }

    public function testStoreReturns400ForInvalidUrl(): void
    {
        $payload = $this->validPayload();
        $payload['source_url'] = 'not-a-url';
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($content['success']);
        $this->assertStringContainsString("source_url", $content['error']);
    }

    public function testStoreReturns400ForInvalidAppliedAt(): void
    {
        $payload = $this->validPayload();
        $payload['applied_at'] = 'yesterday';
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($content['success']);
        $this->assertStringContainsString("applied_at", $content['error']);
    }

    public function testStoreReturns400ForInvalidJsonBody(): void
    {
        $this->controller->simulateInvalidJson = true;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($content['success']);
        $this->assertEquals('Invalid JSON body', $content['error']);
    }

    // ── Successful Creation Tests ────────────────────────────────────

    public function testStoreCreatesApplicationSuccessfully(): void
    {
        $payload = $this->validPayload();
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(201, $response->getStatusCode());
        $this->assertTrue($content['success']);
        $this->assertFalse($content['isDuplicate']);
        $this->assertEquals($payload['job_title'], $content['data']['jobTitle']);
        $this->assertEquals($payload['company_name'], $content['data']['companyName']);
        $this->assertEquals($payload['source_url'], $content['data']['sourceUrl']);
        $this->assertNotNull($content['data']['id']);
    }

    public function testStoreNormalizesTechnologies(): void
    {
        $payload = $this->validPayload();
        $payload['technologies'] = ['  PHP  ', 'php', 'JavaScript', ' NODE.JS ', 'JavaScript'];
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(201, $response->getStatusCode());
        $this->assertEquals(['php', 'javascript', 'node.js'], $content['data']['technologies']);
    }

    public function testStoreNormalizesWorkMode(): void
    {
        $payload = $this->validPayload();
        $payload['work_mode'] = 'REMOTE';
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals('remote', $content['data']['workMode']);
    }

    public function testStoreNormalizesApplicationStatus(): void
    {
        $payload = $this->validPayload();
        $payload['application_status'] = 'FAILED';
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals('failed', $content['data']['applicationStatus']);
    }

    public function testStoreConvertsAppliedAtToUtc(): void
    {
        $payload = $this->validPayload();
        $payload['applied_at'] = '2026-01-15T10:30:00-05:00';
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        // Should be converted to UTC: 15:30:00Z
        $this->assertStringContainsString('15:30:00', $content['data']['appliedAt']);
        $this->assertStringContainsString('+00:00', $content['data']['appliedAt']);
    }

    public function testStoreAcceptsMinimalPayload(): void
    {
        $payload = [
            'job_title' => 'Backend Engineer',
            'company_name' => 'Acme Corp',
            'source_url' => 'https://example.com/jobs/123',
            'applied_at' => '2026-01-15T10:30:00Z',
        ];
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(201, $response->getStatusCode());
        $this->assertTrue($content['success']);
        $this->assertEquals('unknown', $content['data']['workMode']);
        $this->assertEquals('submitted', $content['data']['applicationStatus']);
        $this->assertEmpty($content['data']['technologies']);
    }

    // ── Idempotency Tests ────────────────────────────────────────────

    public function testStoreDetectsDuplicateAndReturnsExisting(): void
    {
        $payload = $this->validPayload();
        $this->controller->mockInput = $payload;

        // First request
        $response1 = $this->controller->store();
        $content1 = json_decode($this->captureResponse($response1), true);
        $this->assertEquals(201, $response1->getStatusCode());
        $firstId = $content1['data']['id'];

        // Second identical request
        $this->controller->mockInput = $payload;
        $response2 = $this->controller->store();
        $content2 = json_decode($this->captureResponse($response2), true);

        $this->assertEquals(200, $response2->getStatusCode());
        $this->assertTrue($content2['success']);
        $this->assertTrue($content2['isDuplicate']);
        $this->assertEquals($firstId, $content2['data']['id']);
        $this->assertEquals('Application already exists (duplicate detected)', $content2['message']);
    }

    public function testStoreAllowsDifferentApplications(): void
    {
        $payload1 = $this->validPayload();
        $this->controller->mockInput = $payload1;
        $response1 = $this->controller->store();
        $content1 = json_decode($this->captureResponse($response1), true);

        $payload2 = $this->validPayload();
        $payload2['job_title'] = 'Different Role';
        $this->controller->mockInput = $payload2;
        $response2 = $this->controller->store();
        $content2 = json_decode($this->captureResponse($response2), true);

        $this->assertNotEquals($content1['data']['id'], $content2['data']['id']);
    }

    // ── Listing Tests ────────────────────────────────────────────────

    public function testIndexReturnsEmptyListInitially(): void
    {
        $response = $this->controller->index();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($content['success']);
        $this->assertEmpty($content['data']);
        $this->assertEquals(0, $content['meta']['total']);
    }

    public function testIndexReturnsCreatedApplications(): void
    {
        $payload1 = $this->validPayload();
        $this->controller->mockInput = $payload1;
        $this->controller->store();

        $payload2 = $this->validPayload();
        $payload2['job_title'] = 'DevOps Engineer';
        $payload2['company_name'] = 'Other Corp';
        $payload2['source_url'] = 'https://example.com/jobs/456';
        $payload2['applied_at'] = '2026-01-16T10:30:00Z';
        $this->controller->mockInput = $payload2;
        $this->controller->store();

        $response = $this->controller->index();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($content['success']);
        $this->assertCount(2, $content['data']);
        $this->assertEquals(2, $content['meta']['total']);
    }

    public function testIndexFiltersByStatus(): void
    {
        $payload1 = $this->validPayload();
        $payload1['application_status'] = 'submitted';
        $this->controller->mockInput = $payload1;
        $this->controller->store();

        $payload2 = $this->validPayload();
        $payload2['job_title'] = 'DevOps';
        $payload2['company_name'] = 'Other';
        $payload2['source_url'] = 'https://example.com/jobs/456';
        $payload2['applied_at'] = '2026-01-16T10:30:00Z';
        $payload2['application_status'] = 'failed';
        $this->controller->mockInput = $payload2;
        $this->controller->store();

        $_GET['status'] = 'failed';
        $response = $this->controller->index();
        $content = json_decode($this->captureResponse($response), true);
        unset($_GET['status']);

        $this->assertCount(1, $content['data']);
        $this->assertEquals('failed', $content['data'][0]['applicationStatus']);
    }

    public function testIndexFiltersByCompany(): void
    {
        $payload1 = $this->validPayload();
        $this->controller->mockInput = $payload1;
        $this->controller->store();

        $payload2 = $this->validPayload();
        $payload2['company_name'] = 'Different Corp';
        $payload2['source_url'] = 'https://example.com/jobs/456';
        $payload2['applied_at'] = '2026-01-16T10:30:00Z';
        $this->controller->mockInput = $payload2;
        $this->controller->store();

        $_GET['company'] = 'Acme';
        $response = $this->controller->index();
        $content = json_decode($this->captureResponse($response), true);
        unset($_GET['company']);

        $this->assertCount(1, $content['data']);
        $this->assertEquals('Acme Corp', $content['data'][0]['companyName']);
    }

    public function testIndexRespectsLimitAndOffset(): void
    {
        // Create 3 applications
        for ($i = 1; $i <= 3; $i++) {
            $payload = $this->validPayload();
            $payload['job_title'] = "Role {$i}";
            $payload['source_url'] = "https://example.com/jobs/{$i}";
            $day = $i + 14;
            $payload['applied_at'] = "2026-01-{$day}T10:30:00Z";
            $this->controller->mockInput = $payload;
            $this->controller->store();
        }

        $_GET['limit'] = '2';
        $_GET['offset'] = '1';
        $response = $this->controller->index();
        $content = json_decode($this->captureResponse($response), true);
        unset($_GET['limit'], $_GET['offset']);

        $this->assertCount(2, $content['data']);
        $this->assertEquals(3, $content['meta']['total']);
        $this->assertEquals(2, $content['meta']['limit']);
        $this->assertEquals(1, $content['meta']['offset']);
    }

    // ── Raw Payload Tests ────────────────────────────────────────────

    public function testStorePreservesRawPayload(): void
    {
        $payload = $this->validPayload();
        $payload['raw_payload'] = [
            'scraped_at' => '2026-01-15T08:00:00Z',
            'html_snippet' => '<div>Job description...</div>',
            'board_name' => 'LinkedIn',
        ];
        $this->controller->mockInput = $payload;

        $response = $this->controller->store();
        $content = json_decode($this->captureResponse($response), true);

        $this->assertEquals(201, $response->getStatusCode());
        $this->assertEquals($payload['raw_payload'], $content['data']['rawPayload']);
    }

    // ── Helper Methods ───────────────────────────────────────────────

    private function validPayload(): array
    {
        return [
            'job_title' => 'Software Engineer',
            'company_name' => 'Acme Corp',
            'salary_text' => '$120k - $150k CAD',
            'technologies' => ['PHP', 'React', 'MySQL'],
            'applied_at' => '2026-01-15T10:30:00Z',
            'source_url' => 'https://example.com/jobs/123',
            'location_text' => 'Toronto, ON',
            'province' => 'Ontario',
            'country' => 'Canada',
            'work_mode' => 'remote',
            'application_status' => 'submitted',
            'notes' => 'Applied via company portal',
            'external_job_id' => 'acme-12345',
            'agent_name' => 'codex-automation',
        ];
    }

    private function captureResponse(\OverPHP\Core\Response $response): string
    {
        ob_start();
        $response->send();
        return ob_get_clean() ?: '';
    }
}
