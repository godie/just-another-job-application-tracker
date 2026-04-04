<?php

declare(strict_types=1);

namespace OverPHP\Controllers;

use OverPHP\Libs\Database;
use OverPHP\Core\Response;

final class HelloController
{
    private ?Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db;
    }

    public function index(): array
    {
        return [
            'message' => 'Hello from OverPHP!',
            'db_enabled' => $this->db ? $this->db->isEnabled() : false,
        ];
    }

    public function show(string $name): array
    {
        return [
            'message' => "Hello, $name!",
        ];
    }

    public function raw(): Response
    {
        return Response::raw('{"raw": "json"}', 200, ['Content-Type' => 'application/json']);
    }
}
