<?php

declare(strict_types=1);

namespace OverPHP\Tests;

use PHPUnit\Framework\TestCase;

final class EntryPointBootstrapTest extends TestCase
{
    public function testEntryPointLoadsDependenciesBeforeHandlingRequest(): void
    {
        $apiDir = dirname(__DIR__);
        $code = <<<'PHP'
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/hello';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
require 'index.php';
PHP;

        $command = escapeshellarg(PHP_BINARY) . ' -d display_errors=1 -r ' . escapeshellarg($code);
        $descriptorSpec = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptorSpec, $pipes, $apiDir);
        $this->assertIsResource($process);

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        $this->assertSame(0, $exitCode, $stderr);
        $this->assertJson($stdout);

        $payload = json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Hello from OverPHP!', $payload['message'] ?? null);
    }
}
