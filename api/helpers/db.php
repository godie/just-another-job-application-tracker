<?php
/**
 * DB Helper for MySQL connections using PDO.
 */
class DB {
    private static ?DB $instance = null;
    private \PDO $connection;

    private function __construct(array $config) {
        $mysqlConfig = $config['database']['mysql'] ?? [];

        $host = $mysqlConfig['host'] ?? '127.0.0.1';
        $db   = $mysqlConfig['database'] ?? 'jajat';
        $user = $mysqlConfig['username'] ?? 'root';
        $pass = $mysqlConfig['password'] ?? '';
        $port = (string) ($mysqlConfig['port'] ?? '3306');
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset;port=$port";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->connection = new PDO($dsn, $user, $pass, $options);
        } catch (\PDOException $e) {
            throw new \PDOException($e->getMessage(), (int)$e->getCode());
        }
    }

    public static function getInstance(array $config): DB {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public function getConnection(): \PDO {
        return $this->connection;
    }
}
