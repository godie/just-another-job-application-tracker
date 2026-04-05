<?php

declare(strict_types=1);

namespace OverPHP\Libs\Drivers;

/**
 * Contract that every database driver must implement.
 *
 * To create a custom driver:
 * 1. Create a class that implements this interface.
 * 2. Register it: Database::registerDriver(new MyDriver());
 */
interface DriverInterface
{
    /**
     * Unique driver name (e.g. 'mysql', 'sqlite', 'pgsql').
     */
    public function getName(): string;

    /**
     * Build a PDO connection from the driver-specific config section.
     *
     * @param array $driverConfig  The config sub-array for this driver
     *                             (e.g. $config['database']['mysql']).
     * @return \PDO
     * @throws \RuntimeException  When the connection cannot be established.
     */
    public function connect(array $driverConfig): \PDO;
}
