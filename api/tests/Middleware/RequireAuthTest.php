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

        // Clean up any existing session data
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

    public function testReturnsErrorWhenNoSession(): void
    {
        // Close any open session to ensure no active session
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        // Reset session - no session data
        $_SESSION = [];

        // Ensure no active session BEFORE calling handle
        $this->assertNotEquals(PHP_SESSION_ACTIVE, session_status());

        $result = RequireAuth::handle();

        // RequireAuth calls app_session_start() which starts a new session
        // The result should be error because there's no user_id in session

        $this->assertNotNull($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Authentication required', $result['error']);

        // Clean up: close the session that handle() started
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public function testReturnsNullWhenValidSession(): void
    {
        // Start fresh session with authenticated user
        $this->assertNotEquals(PHP_SESSION_ACTIVE, session_status());

        session_start();

        // Verify session is active
        $this->assertEquals(PHP_SESSION_ACTIVE, session_status());

        // Set authenticated user data
        $_SESSION['user_id'] = 123;
        $_SESSION['organization_id'] = 1;
        $_SESSION['role'] = 'member';

        $result = RequireAuth::handle();

        $this->assertNull($result);
    }

    public function testReturnsErrorWhenSessionUserIdIsNull(): void
    {
        session_start();
        $_SESSION = [];
        // Don't set user_id

        $result = RequireAuth::handle();

        $this->assertNotNull($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Authentication required', $result['error']);
    }

    public function testIsAuthenticatedReturnsTrueWhenUserIdSet(): void
    {
        session_start();
        $_SESSION = ['user_id' => 42];

        $this->assertTrue(RequireAuth::isAuthenticated());
    }

    public function testIsAuthenticatedReturnsFalseWhenNoUserId(): void
    {
        session_start();
        $_SESSION = [];

        $this->assertFalse(RequireAuth::isAuthenticated());
    }
}