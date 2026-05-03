<?php

declare(strict_types=1);

namespace OverPHP\Tests\Middleware;

use PHPUnit\Framework\TestCase;
use OverPHP\Middleware\RequireAuth;

class RequireAuthTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Close any active session before each test
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        // Clean up any existing session files
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        // Clean up after each test
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        parent::tearDown();
    }

    private function startCleanSession(): void
    {
        // Start a fresh session with unique ID
        $sessionId = 'test_' . bin2hex(random_bytes(8));
        session_id($sessionId);
        session_start();
    }

    public function testReturnsErrorWhenNoSession(): void
    {
        // No session started - app_session_start will start one but with no user_id
        // This simulates a fresh session with no authentication

        $result = RequireAuth::handle();

        $this->assertNotNull($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Authentication required', $result['error']);
    }

    public function testReturnsNullWhenValidSession(): void
    {
        // Start a session with user_id set
        $this->startCleanSession();
        $_SESSION['user_id'] = 123;
        $_SESSION['organization_id'] = 1;
        $_SESSION['role'] = 'member';

        $result = RequireAuth::handle();

        $this->assertNull($result);
    }

    public function testReturnsErrorWhenSessionUserIdIsNull(): void
    {
        // Start session but don't set user_id
        $this->startCleanSession();
        $_SESSION['organization_id'] = 1;
        $_SESSION['role'] = 'member';

        $result = RequireAuth::handle();

        $this->assertNotNull($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Authentication required', $result['error']);
    }

    public function testIsAuthenticatedReturnsTrueWhenUserIdSet(): void
    {
        $this->startCleanSession();
        $_SESSION['user_id'] = 42;

        $this->assertTrue(RequireAuth::isAuthenticated());
    }

    public function testIsAuthenticatedReturnsFalseWhenNoUserId(): void
    {
        // No session started
        $this->startCleanSession();
        $_SESSION = [];

        $this->assertFalse(RequireAuth::isAuthenticated());
    }
}