<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

$config = require __DIR__ . '/config.php';

echo "=== Database Config Debug ===\n\n";

echo "DB Enabled (from config): " . ($config['database']['enabled'] ?? 'NOT SET') . "\n";
echo "DB Driver: " . ($config['database']['driver'] ?? 'NOT SET') . "\n";
echo "DB Host: " . ($config['database']['mysql']['host'] ?? 'NOT SET') . "\n";
echo "DB Port: " . ($config['database']['mysql']['port'] ?? 'NOT SET') . "\n";
echo "DB Name: " . ($config['database']['mysql']['database'] ?? 'NOT SET') . "\n";
echo "DB User: " . ($config['database']['mysql']['username'] ?? 'NOT SET') . "\n";

echo "\n=== Environment Variables ===\n";
echo "DB_ENABLED: " . (getenv('DB_ENABLED') ?: 'EMPTY/FALSE') . "\n";
echo "DB_DRIVER: " . (getenv('DB_DRIVER') ?: 'NOT SET') . "\n";
echo "DB_HOST: " . (getenv('DB_HOST') ?: 'NOT SET') . "\n";
echo "DB_NAME: " . (getenv('DB_NAME') ?: 'NOT SET') . "\n";

echo "\n=== Connection Test ===\n";
$db = new OverPHP\Libs\Database($config);
$conn = $db->getConnection();
echo $conn ? "SUCCESS - PDO connection established" : "FAILED - " . ($db->getLastError() ?? 'Unknown error');

if ($conn) {
    echo "\n\n=== User Table Test ===\n";
    try {
        $stmt = $conn->query("SELECT COUNT(*) as count FROM users");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Users count: " . $result['count'] . "\n";
    } catch (PDOException $e) {
        echo "Users table error: " . $e->getMessage() . "\n";
    }
}

echo "\n";
