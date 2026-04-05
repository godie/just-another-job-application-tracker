<?php

declare(strict_types=1);

namespace OverPHP\Core;

final class Benchmark
{
    private static float $startTime = 0.0;
    private static int $startMemory = 0;
    private static bool $enabled = false;

    public static function start(bool $enabled = false): void
    {
        self::$enabled = $enabled;
        if (!self::$enabled) {
            return;
        }

        self::$startTime = microtime(true);
        self::$startMemory = memory_get_usage();
    }

    /** @return array{time:string,memory:string,peak:string}|null */
    public static function stats(): ?array
    {
        if (!self::$enabled) {
            return null;
        }

        return [
            'time' => round((microtime(true) - self::$startTime) * 1000, 3) . 'ms',
            'memory' => round((memory_get_usage() - self::$startMemory) / 1024, 2) . 'KB',
            'peak' => round(memory_get_peak_usage() / 1024 / 1024, 2) . 'MB',
        ];
    }
}
