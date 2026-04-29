<?php

declare(strict_types=1);

namespace OverPHP\Libs\Drivers;

final class PostgresDriver extends AbstractDriver
{
    public function getName(): string
    {
        return 'postgres';
    }

    /**
     * @param array $driverConfig  Keys: host, port, database, username, password, charset, options.
     */
    public function connect(array $driverConfig): \PDO
    {
        $host     = $this->validateDsnComponent(trim((string) ($driverConfig['host'] ?? '127.0.0.1')), 'PostgreSQL host');
        $port     = (int) ($driverConfig['port'] ?? 5432);
        $database = $this->validateDsnComponent(trim((string) ($driverConfig['database'] ?? '')), 'PostgreSQL database name');
        $username = (string) ($driverConfig['username'] ?? '');
        $password = (string) ($driverConfig['password'] ?? '');
        $charset  = $this->validateDsnComponent((string) ($driverConfig['charset'] ?? 'utf8'), 'PostgreSQL charset');

        if ($database === '') {
            throw new \RuntimeException('PostgreSQL database name is missing from configuration.');
        }

        // %3D encodes '=' to avoid DSN parser treating it as key-value separator
        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;options=--client_encoding%%3D%s',
            $host,
            $port,
            $database,
            $charset
        );

        $options = $this->mergeOptions((array) ($driverConfig['options'] ?? []));

        return new \PDO($dsn, $username, $password, $options);
    }
}
