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
    // CI gate enforcement: without these levels the dry-run is green-by-default
    // ("[WARNING] Register rules or sets in your 'rector.php' config" +
    // zero files scanned). Level values mirror what the branch's 3 prior
    // Rector passes (bf2052e -- DEAD_CODE + EARLY_RETURN on src/, 7eed223 --
    // TYPE_DECLARATION on src/, 923cbfe -- DEAD_CODE + EARLY_RETURN on tests/)
    // already auto-applied; level 20 is a conservative starting point.
    ->withDeadCodeLevel(20)
    ->withCodeQualityLevel(20)
    // uncomment to reach your current PHP version
    // ->withPhpSets()
;
