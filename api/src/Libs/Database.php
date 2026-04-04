<?php

declare(strict_types=1);

namespace OverPHP\Libs;

use OverPHP\Libs\Drivers\DriverInterface;
use OverPHP\Libs\Drivers\MysqlDriver;
use OverPHP\Libs\Drivers\SqliteDriver;

final class Database
{
    /** @var array<string, DriverInterface> */
    private array $drivers = [];

    /** @var array<string, class-string<DriverInterface>> */
    private array $driverMap = [
        'mysql'  => MysqlDriver::class,
        'sqlite' => SqliteDriver::class,
    ];

    private ?\PDO $connection = null;
    private ?string $lastError = null;

    public function __construct(
        private readonly array $config = []
    ) {}

    // ── Driver registry ──────────────────────────────────────────

    /**
     * Register a custom driver (or override a built-in one).
     */
    public function registerDriver(DriverInterface $driver): void
    {
        $this->drivers[strtolower($driver->getName())] = $driver;
    }

    /**
     * Return the names of all registered drivers.
     *
     * @return string[]
     */
    public function availableDrivers(): array
    {
        return array_values(array_unique(array_merge(
            array_keys($this->driverMap),
            array_keys($this->drivers)
        )));
    }

    // ── Connection ───────────────────────────────────────────────

    public function isEnabled(): bool
    {
        $dbConfig = $this->config['database'] ?? [];
        return !empty($dbConfig['enabled']);
    }

    public function getConnection(): ?\PDO
    {
        if ($this->connection !== null) {
            return $this->connection;
        }

        if (!$this->isEnabled()) {
            $this->lastError = 'Database layer is disabled in the configuration.';
            return null;
        }

        $dbConfig = $this->config['database'] ?? [];
        $driverName = strtolower((string) ($dbConfig['driver'] ?? 'mysql'));

        $driver = $this->resolveDriver($driverName);

        if ($driver === null) {
            $this->lastError = sprintf(
                "Driver '%s' is not registered. Available: %s.",
                $driverName,
                implode(', ', $this->availableDrivers())
            );
            return null;
        }

        $driverConfig = $dbConfig[$driverName] ?? [];

        try {
            $this->connection = $driver->connect($driverConfig);
            $this->lastError = null;
            return $this->connection;
        } catch (\PDOException $e) {
            $this->lastError = 'Database connection failed. Please check your configuration and logs.';
            error_log('Database Connection Error: ' . $e->getMessage());
            $this->connection = null;
            return null;
        } catch (\Throwable $e) {
            $this->lastError = 'An unexpected error occurred in the database layer.';
            error_log('Unexpected Database Error: ' . $e->getMessage());
            $this->connection = null;
            return null;
        }
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    // ── Internal ─────────────────────────────────────────────────

    /**
     * Resolve a driver by name, instantiating it if necessary.
     */
    private function resolveDriver(string $name): ?DriverInterface
    {
        if (isset($this->drivers[$name])) {
            return $this->drivers[$name];
        }

        if (isset($this->driverMap[$name])) {
            $class = $this->driverMap[$name];
            $this->drivers[$name] = new $class();
            return $this->drivers[$name];
        }

        return null;
    }
}
