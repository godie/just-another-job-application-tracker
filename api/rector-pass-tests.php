<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\SetList;

return RectorConfig::configure()
    ->withPaths([__DIR__ . '/tests'])
    ->withSets([
        SetList::EARLY_RETURN,
        SetList::DEAD_CODE,
    ])
    ->withImportNames(importShortClasses: false, removeUnusedImports: true)
    ->withParallel(timeoutSeconds: 120, maxNumberOfProcess: 4);
