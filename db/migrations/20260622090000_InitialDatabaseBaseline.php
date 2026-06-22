<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class InitialDatabaseBaseline extends AbstractMigration
{
    public function change(): void
    {
        // Legacy baseline: does not modify existing tables.
        // When executed, Phinx only creates/uses phinxlog and records this version.
    }
}
