<?php

declare(strict_types=1);

namespace OverPHP\Helpers;

use OverPHP\Core\Container;
use OverPHP\Libs\Database;

function databaseInstance(): Database
{
    return Container::getInstance()->make(Database::class);
}

function databaseIsEnabled(): bool
{
    return databaseInstance()->isEnabled();
}

function databaseConnection(): ?\PDO
{
    return databaseInstance()->getConnection();
}

function databaseLastError(): ?string
{
    return databaseInstance()->getLastError();
}
