<?php

declare(strict_types=1);

namespace OverPHP\Core;

/**
 * Minimal static logger that writes to PHP's error_log destination when
 * enabled via the `logging.enabled` config flag. Output is one log line per
 * call in the format:
 *
 *   [2026-07-07T12:34:56.789012Z] [INFO] request.received method=POST uri=/api/auth/login
 *
 * Channel/message are arbitrary strings (use a dot-separated path for
 * greppability, e.g. `request.received`, `router.route_not_found`,
 * `db.connection_failed`). Context values are emitted as `key=value` pairs;
 * strings with whitespace or special chars are double-quoted with backslash
 * escaping. Non-scalar context values are JSON-encoded.
 *
 * Disabled by default in `config.example.php` (the production template is
 * OFF). Enable in dev via `LOGGING_ENABLED=true` in `.env`. The flag is
 * deliberately opt-in for production so a noisy log cannot surface sensitive
 * data on a misconfigured deploy.
 *
 * Usage:
 *
 *   Logger::init($config['logging'] ?? []);
 *   Logger::info('request.received', ['method' => $method, 'uri' => $uri]);
 *   Logger::error('db.connection_failed', ['driver' => 'mysql', 'error' => $e->getMessage()]);
 */
final class Logger
{
    private static bool $enabled = false;

    /**
     * Initialize from the `logging` config block.
     *
     * @param array{enabled?:bool} $config
     */
    public static function init(array $config): void
    {
        self::$enabled = (bool) ($config['enabled'] ?? false);
    }

    public static function isEnabled(): bool
    {
        return self::$enabled;
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::write('WARNING', $message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    private static function write(string $level, string $message, array $context): void
    {
        if (!self::$enabled) {
            return;
        }

        $timestamp = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))
            ->format('Y-m-d\TH:i:s.u\Z');

        $line = sprintf('[%s] [%s] %s', $timestamp, $level, $message);

        foreach ($context as $key => $value) {
            $line .= ' ' . $key . '=' . self::formatValue($value);
        }

        error_log($line);
    }

    private static function formatValue(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_string($value)) {
            if (preg_match('/[\s"\'=]/', $value)) {
                return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $value) . '"';
            }
            return $value;
        }
        if (is_scalar($value)) {
            return (string) $value;
        }
        return (string) json_encode($value);
    }
}
