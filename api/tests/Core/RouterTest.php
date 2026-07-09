<?php

declare(strict_types=1);

namespace OverPHP\Tests\Core;

use OverPHP\Core\Router;
use OverPHP\Telemetry\LogfireTelemetry;
use PHPUnit\Framework\TestCase;

final class RouterTest extends TestCase
{
    protected function setUp(): void
    {
        http_response_code(200);
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/api/boom';
        $_SERVER['HTTPS'] = 'off';
    }

    public function testControllerExceptionsReturnJsonServerError(): void
    {
        LogfireTelemetry::init([]);

        $router = new Router(prefix: '/api');
        $router->add('GET', '/boom', static function (): void {
            throw new \RuntimeException('database unavailable');
        });

        ob_start();
        $router->run();
        $body = ob_get_clean();

        $this->assertSame(500, http_response_code());
        $this->assertJson($body);

        $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(false, $payload['success'] ?? null);
        $this->assertSame('Internal Server Error', $payload['error'] ?? null);
    }
}
