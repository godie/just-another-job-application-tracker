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
     * Validate a DSN component to prevent injection of additional PDO parameters.
     * Only alphanumeric, underscores, hyphens, and dots are allowed.
     *
     * @todo Support IPv6 host addresses (e.g. ::1, fe80::1%eth0) with separate
     *       validation path. Current regex rejects colons and percent signs.
     *
     * @param string $value  The value to validate.
     * @param string $label  Human-readable label for error messages.
     * @return string  The validated value.
     * @throws \InvalidArgumentException if the value contains disallowed characters.
     */
    protected function validateDsnComponent(string $value, string $label): string
    {
        if ($value !== '' && !preg_match('/^[a-zA-Z0-9_.-]+$/', $value)) {
            throw new \InvalidArgumentException(
                sprintf('%s contains invalid characters. Only alphanumeric, underscores, hyphens, and dots are allowed.', $label)
            );
        }
        return $value;
    }

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
