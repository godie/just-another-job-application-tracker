<?php

declare(strict_types=1);

namespace OverPHP\Libs\Drivers;

final class SqliteDriver extends AbstractDriver
{
    public function getName(): string
    {
        return 'sqlite';
    }

    /**
     * @param array $driverConfig  Keys: path, options.
     *                             path can be a file path or ':memory:'.
     */
    public function connect(array $driverConfig): \PDO
    {
        $path = trim((string) ($driverConfig['path'] ?? ''));

        if ($path === '') {
            throw new \RuntimeException('SQLite database path is missing from configuration.');
        }

        // For file-based databases, verify the directory exists
        if ($path !== ':memory:') {
            $dir = dirname($path);
            if (!is_dir($dir)) {
                throw new \RuntimeException(sprintf("SQLite directory '%s' does not exist.", $dir));
            }
        }

        $dsn     = sprintf('sqlite:%s', $path);
        $options = $this->mergeOptions((array) ($driverConfig['options'] ?? []));
        $pdo     = new \PDO($dsn, null, null, $options);

        // Enable WAL mode for better concurrent read performance (file-based only)
        if ($path !== ':memory:') {
            $pdo->exec('PRAGMA journal_mode=WAL;');
        }

        // Enable foreign key enforcement (off by default in SQLite)
        $pdo->exec('PRAGMA foreign_keys=ON;');

        return $pdo;
    }
}
