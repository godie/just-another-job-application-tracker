<?php

declare(strict_types=1);

namespace OverPHP\Tests\Core;

use OverPHP\Core\Security;
use PHPUnit\Framework\TestCase;

final class SecurityTest extends TestCase
{
    public function testAllowedOriginMustMatchExactly(): void
    {
        $allowed = ['https://jajat.godieboy.com'];

        $this->assertTrue(Security::isAllowedOrigin('https://jajat.godieboy.com', $allowed));
        $this->assertFalse(Security::isAllowedOrigin('https://evil.example', $allowed));
        $this->assertFalse(Security::isAllowedOrigin('https://jajat.godieboy.com.evil.example', $allowed));
        $this->assertFalse(Security::isAllowedOrigin(null, $allowed));
    }
}
