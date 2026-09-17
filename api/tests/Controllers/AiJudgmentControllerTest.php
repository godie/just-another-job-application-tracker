<?php

declare(strict_types=1);

namespace OverPHP\Tests\Controllers;

use OverPHP\Controllers\AiJudgmentController;
use PHPUnit\Framework\TestCase;

/**
 * Testable subclass that stubs the TypeSafe HTTP call and the request body.
 */
class TestableAiJudgmentController extends AiJudgmentController
{
    public ?array $mockInput = null;
    public array $mockUpstream = [];
    public ?array $lastPayload = null;

    protected function readJson(): ?array
    {
        return $this->mockInput;
    }

    protected function callTypeSafe(array $payload, string $apiKey): array
    {
        $this->lastPayload = $payload;
        return $this->mockUpstream;
    }

    public function setConfigValue(string $key, mixed $value): void
    {
        $reflection = new \ReflectionClass(AiJudgmentController::class);
        $property = $reflection->getProperty('config');
        $property->setAccessible(true);
        $config = $property->getValue($this) ?? [];
        $config[$key] = $value;
        $property->setValue($this, $config);
    }
}

class AiJudgmentControllerTest extends TestCase
{
    private TestableAiJudgmentController $controller;

    protected function setUp(): void
    {
        $this->controller = new TestableAiJudgmentController();
        $this->controller->setConfigValue('typesafe_api_key', 'test-key');
        $this->controller->setConfigValue('typesafe_model', 'jev-latest');
        http_response_code(200);
    }

    protected function tearDown(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];
    }

    private function authenticate(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $_SESSION['user_id'] = 1;
        $_SESSION['role'] = 'member';
    }

    private function noulQuestion(): array
    {
        return ['is_job_email' => ['type' => 'noul', 'instructions' => 'Is this a job email?']];
    }

    public function testRequiresAnAuthenticatedSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        $_SESSION = [];
        $this->controller->mockInput = ['state' => 'x', 'questions' => $this->noulQuestion()];

        $result = $this->controller->systemOne();

        $this->assertFalse($result['success']);
        $this->assertSame(401, http_response_code());
        $this->assertNull($this->controller->lastPayload, 'upstream must not be called without a session');
    }

    public function testReturnsServiceUnavailableWhenKeyIsMissing(): void
    {
        $this->authenticate();
        $this->controller->setConfigValue('typesafe_api_key', '');
        $this->controller->mockInput = ['state' => 'x', 'questions' => $this->noulQuestion()];

        $result = $this->controller->systemOne();

        $this->assertFalse($result['success']);
        $this->assertSame(503, http_response_code());
        $this->assertNull($this->controller->lastPayload);
    }

    public function testRejectsAnEmptyQuestionMap(): void
    {
        $this->authenticate();
        $this->controller->mockInput = ['state' => 'x', 'questions' => []];

        $result = $this->controller->systemOne();

        $this->assertFalse($result['success']);
        $this->assertSame(400, http_response_code());
    }

    public function testRejectsUnsupportedQuestionTypes(): void
    {
        $this->authenticate();
        $this->controller->mockInput = [
            'state' => 'x',
            'questions' => ['q' => ['type' => 'freeform', 'instructions' => 'Write an essay']],
        ];

        $result = $this->controller->systemOne();

        $this->assertFalse($result['success']);
        $this->assertSame(400, http_response_code());
        $this->assertStringContainsString('Invalid question', (string) $result['error']);
    }

    public function testRejectsMoreQuestionsThanTheCap(): void
    {
        $this->authenticate();
        $questions = [];
        for ($i = 0; $i < 26; $i++) {
            $questions["q{$i}"] = ['type' => 'noul', 'instructions' => 'x'];
        }
        $this->controller->mockInput = ['state' => 'x', 'questions' => $questions];

        $result = $this->controller->systemOne();

        $this->assertFalse($result['success']);
        $this->assertSame(400, http_response_code());
        $this->assertSame('Too many questions', $result['error']);
    }

    public function testReturnsAnswersAndUsageOnSuccess(): void
    {
        $this->authenticate();
        $this->controller->mockInput = [
            'state' => ['email' => ['subject' => 'Interview at Acme']],
            'questions' => ['match' => ['type' => 'choice', 'instructions' => 'Which candidate?', 'criteria' => ['app-1' => null, 'none' => null]]],
        ];
        $this->controller->mockUpstream = [
            'model' => 'jev-latest',
            'answers' => ['match' => ['type' => 'choice', 'choice' => 'app-1', 'confidence' => 0.91]],
            'usage' => ['input_tokens' => 120, 'output_tokens' => 8],
        ];

        $result = $this->controller->systemOne();

        $this->assertTrue($result['success']);
        $this->assertSame(200, http_response_code());
        $this->assertSame('app-1', $result['answers']['match']['choice']);
        $this->assertSame(['input_tokens' => 120, 'output_tokens' => 8], $result['usage']);
        $this->assertSame('jev-latest', $this->controller->lastPayload['model']);
    }

    public function testSurfacesUpstreamErrorsAsBadGateway(): void
    {
        $this->authenticate();
        $this->controller->mockInput = ['state' => 'x', 'questions' => $this->noulQuestion()];
        $this->controller->mockUpstream = ['error' => 'Unauthorized'];

        $result = $this->controller->systemOne();

        $this->assertFalse($result['success']);
        $this->assertSame(502, http_response_code());
        $this->assertSame('Unauthorized', $result['error']);
    }
}
