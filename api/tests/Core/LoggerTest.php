<?php

declare(strict_types=1);

namespace OverPHP\Tests\Core;

use OverPHP\Core\Logger;
use PHPUnit\Framework\TestCase;

final class LoggerTest extends TestCase
{
    private string $logFile = '';
    private string $previousErrorLog = '';

    protected function setUp(): void
    {
        // Reset the static $enabled flag (PHP static class properties persist
        // across tests within a single phpunit run).
        $reflection = new \ReflectionClass(Logger::class);
        $property = $reflection->getProperty('enabled');
        $property->setAccessible(true);
        $property->setValue(null, false);

        // Capture error_log output to a tempfile via ini override. The
        // previous setting is restored in tearDown so other tests + the
        // phpunit runtime are not affected.
        $this->previousErrorLog = (string) ini_get('error_log');
        $this->logFile = tempnam(sys_get_temp_dir(), 'overphp_logger_test_');
        ini_set('error_log', $this->logFile);
    }

    protected function tearDown(): void
    {
        ini_set('error_log', $this->previousErrorLog);
        if (is_file($this->logFile)) {
            unlink($this->logFile);
        }
    }

    public function testInfoWritesLineWhenEnabled(): void
    {
        Logger::init(['enabled' => true]);
        Logger::info('request.received', ['method' => 'POST', 'uri' => '/api/auth/login']);

        $output = $this->readLog();
        $this->assertCount(1, $output, 'expected exactly one log line');
        $this->assertStringContainsString('[INFO]', $output[0]);
        $this->assertStringContainsString('request.received', $output[0]);
        $this->assertStringContainsString('method=POST', $output[0]);
        $this->assertStringContainsString('uri=/api/auth/login', $output[0]);
    }

    public function testWarningEmitsWarningLevel(): void
    {
        Logger::init(['enabled' => true]);
        Logger::warning('router.csrf_failed', ['method' => 'POST']);

        $output = $this->readLog();
        $this->assertCount(1, $output);
        $this->assertStringContainsString('[WARNING]', $output[0]);
        $this->assertStringContainsString('router.csrf_failed', $output[0]);
    }

    public function testErrorEmitsErrorLevelAndIncludesExceptionContext(): void
    {
        Logger::init(['enabled' => true]);
        $exception = new \RuntimeException('something broke', 42);
        Logger::error('router.exception', [
            'class' => $exception::class,
            'message' => $exception->getMessage(),
            'code' => $exception->getCode(),
        ]);

        $output = $this->readLog();
        $this->assertCount(1, $output);
        $this->assertStringContainsString('[ERROR]', $output[0]);
        $this->assertStringContainsString('class="RuntimeException"', $output[0]);
        $this->assertStringContainsString('message="something broke"', $output[0]);
        $this->assertStringContainsString('code=42', $output[0]);
    }

    public function testNoOutputWhenDisabled(): void
    {
        Logger::init(['enabled' => false]);
        Logger::info('request.received', ['method' => 'POST']);
        Logger::error('router.exception', ['class' => 'RuntimeException']);

        $this->assertSame('', $this->readRaw(), 'disabled logger should produce zero output');
    }

    public function testIsEnabledReflectsInit(): void
    {
        Logger::init(['enabled' => true]);
        $this->assertTrue(Logger::isEnabled());

        Logger::init(['enabled' => false]);
        $this->assertFalse(Logger::isEnabled());
    }

    public function testMissingEnabledKeyDefaultsToDisabled(): void
    {
        Logger::init([]);
        $this->assertFalse(Logger::isEnabled());

        Logger::info('request.received');
        $this->assertSame('', $this->readRaw());
    }

    public function testContextValueQuoting(): void
    {
        Logger::init(['enabled' => true]);
        // String with spaces + an embedded quote must be double-quoted with
        // backslash-escaped inner quotes (the format is grep-friendly, not
        // a full RFC 822 parser).
        Logger::info('test.format', ['name' => 'hello world "x"']);

        $output = $this->readLog();
        $this->assertCount(1, $output);
        $this->assertStringContainsString('name="hello world \\"x\\""', $output[0]);
    }

    public function testContextBooleanAndNullFormatting(): void
    {
        Logger::init(['enabled' => true]);
        Logger::info('test.format', ['flag_true' => true, 'flag_false' => false, 'nothing' => null]);

        $output = $this->readLog();
        $this->assertCount(1, $output);
        $this->assertStringContainsString('flag_true=true', $output[0]);
        $this->assertStringContainsString('flag_false=false', $output[0]);
        $this->assertStringContainsString('nothing=null', $output[0]);
    }

    public function testContextArrayValueIsJsonEncoded(): void
    {
        Logger::init(['enabled' => true]);
        Logger::info('test.format', ['params' => ['a' => 1, 'b' => 2]]);

        $output = $this->readLog();
        $this->assertCount(1, $output);
        $this->assertStringContainsString('params={"a":1,"b":2}', $output[0]);
    }

    public function testTimestampIsUtcIso8601(): void
    {
        Logger::init(['enabled' => true]);
        Logger::info('test.ts');

        $output = $this->readLog();
        $this->assertCount(1, $output);
        // Format: [2026-07-07T12:34:56.789012Z]
        $this->assertMatchesRegularExpression(
            '/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z\] \[INFO\] test\.ts$/',
            $output[0],
            'timestamp should be ISO 8601 with microseconds in UTC'
        );
    }

    /**
     * @return string[] one element per line, trailing newline stripped
     */
    private function readLog(): array
    {
        $raw = $this->readRaw();
        if ($raw === '') {
            return [];
        }
        return array_values(array_filter(explode("\n", $raw), static fn(string $l): bool => $l !== ''));
    }

    private function readRaw(): string
    {
        $contents = file_get_contents($this->logFile);
        return $contents === false ? '' : rtrim($contents, "\n");
    }
}
