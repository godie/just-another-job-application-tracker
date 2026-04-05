<?php

declare(strict_types=1);

namespace OverPHP\Libs\Drivers;

/**
 * Base class with shared logic for database drivers.
 *
 * Extend this instead of implementing DriverInterface directly
 * to get sensible PDO defaults for free.
 */
abstract class AbstractDriver implements DriverInterface
{
    /**
     * Merge user-provided PDO options with framework defaults.
     *
     * @param array $overrides  User-provided PDO attribute overrides.
     * @return array
     */
    protected function mergeOptions(array $overrides): array
    {
        $defaults = [
            \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        return $overrides + $defaults;
    }
}
