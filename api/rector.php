<?php

declare(strict_types=1);

// tests/ in paths: dead-code + early-return rules also reach PHPUnit test classes (Controllers/Core/Middleware/Models).
// withImportNames(importShortClasses: false, removeUnusedImports: true): leave already-short class refs in source alone, strip dead `use` lines; withParallel(120s/4 procs): balanced for a ~50-file scan.

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\SetList;

return RectorConfig::configure()
    ->withPaths([
        __DIR__ . '/src',
        __DIR__ . '/tests',
    ])
    ->withSets([
        SetList::TYPE_DECLARATION,
        SetList::EARLY_RETURN,
        SetList::DEAD_CODE,
    ])
    ->withImportNames(importShortClasses: false, removeUnusedImports: true)
    ->withParallel(timeoutSeconds: 120, maxNumberOfProcess: 4);
