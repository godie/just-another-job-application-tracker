<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;

return RectorConfig::configure()
    ->withPaths([
        __DIR__ . '/controllers',
        __DIR__ . '/helpers',
        __DIR__ . '/src',
        __DIR__ . '/tests',
    ])
    // uncomment to reach your current PHP version
    // ->withPhpSets()
    // Note: Rector 2.x is opt-in per rule set. The withTypeCoverageLevel /
    // withDeadCodeLevel / withCodeQualityLevel methods only enable checks
    // when called with a level > 0; calling them with 0 is a no-op.
;
