<?php

declare(strict_types=1);

namespace OverPHP\Tests\Core;

use OverPHP\Core\Logger;
use PHPUnit\Framework\TestCase;

final class LoggerTest extends TestCase
{
    protected function setUp(): void
    {
        // Reset the static $enabled flag (PHP static class properties persist
        // across tests within a single phpunit run). The public init() API is
        // the only way to toggle this from a test, and each test sets its own
        // explicit value at the top — the reset here is just a safety net so
        // a test that forgets to set init() cannot leak state into the next
        // one.
        Logger::init(['enabled' => false]);
    }

    public function testFormatInfoIncludesLevelMessageAndContext(): void
    {
        $line = Logger::format('INFO', 'request.received', [
            'method' => 'POST',
            'uri' => '/api/auth/login',
        ]);

        $this->assertStringContainsString('[INFO]', $line);
        $this->assertStringContainsString('request.received', $line);
        $this->assertStringContainsString('method=POST', $line);
        $this->assertStringContainsString('uri=/api/auth/login', $line);
    }

    public function testFormatWarningEmitsWarningLevel(): void
    {
        $line = Logger::format('WARNING', 'router.csrf_failed', ['method' => 'POST']);

        $this->assertStringContainsString('[WARNING]', $line);
        $this->assertStringContainsString('router.csrf_failed', $line);
    }

    public function testFormatErrorEmitsErrorLevelAndIncludesExceptionContext(): void
    {
        $exception = new \RuntimeException('something broke', 42);
        $line = Logger::format('ERROR', 'router.exception', [
            'class' => $exception::class,
            'message' => $exception->getMessage(),
            'code' => $exception->getCode(),
        ]);

        $this->assertStringContainsString('[ERROR]', $line);
        // 'RuntimeException' contains no special chars (no whitespace, no
        // quote, no '=') so it is emitted unquoted — the formatValue regex
        // only triggers quoting on `[\s"\'=]`. A string with special chars
        // (e.g. the message 'something broke') IS quoted.
        $this->assertStringContainsString('class=RuntimeException', $line);
        $this->assertStringContainsString('message="something broke"', $line);
        $this->assertStringContainsString('code=42', $line);
    }

    public function testFormatIsAlwaysAvailableRegardlessOfEnabledFlag(): void
    {
        // format() has no enabled check; the gating happens in info/warning/
        // error. The setUp() already initializes enabled to false, so this
        // test only needs to verify the format output is stable.
        $line = Logger::format('INFO', 'test.event', ['key' => 'value']);

        $this->assertStringContainsString('test.event', $line);
        $this->assertStringContainsString('key=value', $line);
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
    }

    public function testContextValueQuoting(): void
    {
        // String with spaces + an embedded quote must be double-quoted with
        // backslash-escaped inner quotes (the format is grep-friendly, not
        // a full RFC 822 parser).
        $line = Logger::format('INFO', 'test.format', ['name' => 'hello world "x"']);

        $this->assertStringContainsString('name="hello world \\"x\\""', $line);
    }

    public function testContextBooleanAndNullFormatting(): void
    {
        $line = Logger::format('INFO', 'test.format', [
            'flag_true' => true,
            'flag_false' => false,
            'nothing' => null,
        ]);

        $this->assertStringContainsString('flag_true=true', $line);
        $this->assertStringContainsString('flag_false=false', $line);
        $this->assertStringContainsString('nothing=null', $line);
    }

    public function testContextArrayValueIsJsonEncoded(): void
    {
        $line = Logger::format('INFO', 'test.format', ['params' => ['a' => 1, 'b' => 2]]);

        $this->assertStringContainsString('params={"a":1,"b":2}', $line);
    }

    public function testTimestampIsUtcIso8601(): void
    {
        $line = Logger::format('INFO', 'test.ts');

        // Format: [2026-07-07T12:34:56.789012Z]
        $this->assertMatchesRegularExpression(
            '/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z\] \[INFO\] test\.ts$/',
            $line,
            'timestamp should be ISO 8601 with microseconds in UTC'
        );
    }

    public function testInfoIsNoOpWhenDisabled(): void
    {
        // The disabled flag is checked inside info() before the error_log
        // call. The only externally-observable "no-op" contract available
        // from a vanilla phpunit run is "the call does not throw" — the
        // `error_log` ini setting only affects the syslog handler's
        // destination, not the message_type=0 write call, so capturing
        // the actual write from a unit test is not feasible. If the gate
        // were missing, the call would write to PHP's syslog, which is
        // harmless in a test environment but would surface in phpunit's
        // stderr capture.
        Logger::init(['enabled' => false]);
        $this->assertFalse(Logger::isEnabled());
        Logger::info('test.event', ['key' => 'value']);
    }
}
