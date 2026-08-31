<?php

declare(strict_types=1);

namespace OverPHP\Tests\Controllers;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../controllers/SuggestionsController.php';

final class TestableSuggestionsController extends \SuggestionsController
{
    public mixed $mockInput = [];

    protected function getInputJson(): mixed
    {
        return $this->mockInput;
    }
}

final class SuggestionsControllerTest extends TestCase
{
    private string $dbPath;

    protected function setUp(): void
    {
        $this->dbPath = tempnam(sys_get_temp_dir(), 'jajat_suggestions_');
        if ($this->dbPath === false) {
            $this->fail('Unable to create temporary suggestions database path');
        }
        putenv('SUGGESTIONS_DB_PATH=' . $this->dbPath);

        require_once __DIR__ . '/../../src/Helpers/appAuth.php';
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION = [];
        http_response_code(200);
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        putenv('SUGGESTIONS_DB_PATH');
        @unlink($this->dbPath);
    }

    public function testIndexRejectsUnauthenticatedRequests(): void
    {
        $controller = new \SuggestionsController();

        $result = $controller->index();

        $this->assertFalse($result['success']);
        $this->assertSame(401, http_response_code());
    }

    public function testIndexRejectsNonAdminUsers(): void
    {
        $_SESSION['user_id'] = 10;
        $_SESSION['role'] = 'member';
        $controller = new \SuggestionsController();

        $result = $controller->index();

        $this->assertFalse($result['success']);
        $this->assertSame(403, http_response_code());
    }

    public function testStoreRejectsOversizedExplanation(): void
    {
        $_SESSION['captchas'] = [
            'captcha-1' => [
                'answer' => '123',
                'expiresAt' => time() + 300,
            ],
        ];
        $controller = new TestableSuggestionsController();
        $controller->mockInput = [
            'types' => [],
            'explanation' => str_repeat('x', 5001),
            'captchaId' => 'captcha-1',
            'captchaAnswer' => '123',
        ];

        $result = $controller->store();

        $this->assertFalse($result['success']);
        $this->assertSame(400, http_response_code());
    }

    public function testStoreLocksCaptchaAfterTooManyFailedAttempts(): void
    {
        $_SESSION['captchas'] = [
            'captcha-1' => [
                'answer' => '123',
                'expiresAt' => time() + 300,
                'attempts' => 4,
            ],
        ];
        $controller = new TestableSuggestionsController();
        $controller->mockInput = [
            'types' => [],
            'explanation' => 'A valid suggestion',
            'captchaId' => 'captcha-1',
            'captchaAnswer' => '999',
        ];

        $result = $controller->store();

        $this->assertFalse($result['success']);
        $this->assertSame(429, http_response_code());
        $this->assertArrayNotHasKey('captcha-1', $_SESSION['captchas']);
    }
}
