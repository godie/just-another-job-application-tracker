<?php

declare(strict_types=1);

namespace OverPHP\Libs\Drivers;

final class MysqlDriver extends AbstractDriver
{
    public function getName(): string
    {
        return 'mysql';
    }

    /**
     * @param array $driverConfig  Keys: host, port, database, username, password, charset, options.
     */
    public function connect(array $driverConfig): \PDO
    {
        $host     = $this->validateDsnComponent(trim((string) ($driverConfig['host'] ?? '127.0.0.1')), 'MySQL host');
        $port     = (int) ($driverConfig['port'] ?? 3306);
        $database = $this->validateDsnComponent(trim((string) ($driverConfig['database'] ?? '')), 'MySQL database name');
        $username = (string) ($driverConfig['username'] ?? '');
        $password = (string) ($driverConfig['password'] ?? '');
        $charset  = $this->validateDsnComponent((string) ($driverConfig['charset'] ?? 'utf8mb4'), 'MySQL charset');

        if ($database === '') {
            throw new \RuntimeException('MySQL database name is missing from configuration.');
        }

        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);

        $options = $this->mergeOptions((array) ($driverConfig['options'] ?? []));

        return new \PDO($dsn, $username, $password, $options);
    }
}
