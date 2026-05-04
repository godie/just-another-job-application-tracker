# Multitenancy Auth Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining auth tasks from MULTITENANCY_AND_AUTH_PLAN.md: session regeneration, Google identity linking, auth middleware for sync, and frontend integration.

**Architecture:** Enhance the existing PHP API with session security, auto-user creation on Google login, and auth-gated sync routes. Frontend React app connects to auth/me endpoint.

**Tech Stack:** PHP 8.1+, React 19, TypeScript, session-based auth

---

## Task 1: Session Regeneration on Login

Prevents session fixation attacks. Must regenerate session ID after successful login.

**Files:**
- Modify: `api/src/Controllers/AppAuthController.php:151` (login method)
- Test: `api/tests/Controllers/AppAuthControllerTest.php`

- [ ] **Step 1: Write failing test for session regeneration**

```php
// api/tests/Controllers/AppAuthControllerTest.php
public function testLoginRegeneratesSessionId(): void
{
    $controller = new AppAuthController($this->mockDb);
    $user = $this->createTestUser(email: 'session-test@example.com', password: 'oldpassword123');

    // Simulate old session
    session_id('old-session-id');

    $result = $controller->login();

    $this->assertTrue($result['success']);
    $this->assertNotEquals('old-session-id', session_id());
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && ./vendor/bin/phpunit --filter testLoginRegeneratesSessionId`
Expected: FAIL - session IDs match

- [ ] **Step 3: Add session regeneration to login method**

In `api/src/Controllers/AppAuthController.php`, add after line 148 (`appAuth\app_session_start();`):

```php
use OverPHP\Core\Security;

public function login(): array
{
    // ... existing validation ...

    $this->userRepo->updateLastLogin($user->id);

    Security::regenerateSessionId(); // Add this line
    appAuth\app_session_start();
    appAuth\app_session_set_user($user->id, $user->organizationId, $user->role);

    return [
        'success' => true,
        'user' => $user->toArray(),
        'message' => 'Login successful',
    ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && ./vendor/bin/phpunit --filter testLoginRegeneratesSessionId`
Expected: PASS

- [ ] **Step 5: Also add regeneration to Google login**

In `google()` method, add `Security::regenerateSessionId();` before `app_auth_session_start()` (around line 208)

- [ ] **Step 6: Also add regeneration to LinkedIn login**

In `linkedin()` method, add `Security::regenerateSessionId();` before `app_auth_session_start()` (around line 279)

- [ ] **Step 7: Commit**

```bash
git add api/src/Controllers/AppAuthController.php api/tests/Controllers/AppAuthControllerTest.php
git commit -m "feat(auth): regenerate session ID on login to prevent session fixation"
```

---

## Task 2: Link Google Identity to App User (Auto-Create)

When user logs in with Google, if email doesn't exist, create account automatically.

**Files:**
- Modify: `api/src/Controllers/AppAuthController.php:167-217` (google method)
- Modify: `api/src/Repositories/UserRepository.php` (add findByEmail method)

- [ ] **Step 1: Verify findByEmail exists in UserRepository**

Run: `grep -n "findByEmail" api/src/Repositories/UserRepository.php`
Expected: Line with `public function findByEmail`

- [ ] **Step 2: Review current Google login flow**

Look at `api/src/Controllers/AppAuthController.php` lines 167-217

Current behavior:
1. Verify Google token
2. Find user by `google_id`
3. If not found, find by email
4. If email found, use that user
5. If neither found, create new user

**The current flow already supports auto-creation by email!** The issue is it only searches by `google_id` first.

- [ ] **Step 3: Verify the flow works for new Google users**

Current code already does:
```php
$user = $this->userRepo->findByGoogleId($googleUser['sub']);
if ($user === null) {
    $userByEmail = $this->userRepo->findByEmail($googleUser['email']);
    if ($userByEmail !== null) {
        $user = $userByEmail;
    } else {
        $user = User::fromGoogle($googleUser);
        // creates new user
    }
}
```

This is correct - it first checks `google_id`, then falls back to email.

- [ ] **Step 4: Commit (no changes needed)**

If already working correctly, commit a verification note:

```bash
git commit -m "docs(auth): verify Google auto-create user by email flow is correct" --allow-empty
```

---

## Task 3: Auth Middleware for Sync Routes

Sync routes should require app auth, not just any session. Create middleware to verify authenticated app user.

**Files:**
- Create: `api/src/Middleware/RequireAuth.php`
- Modify: `api/src/Core/Router.php`
- Modify: `api/index.php`
- Test: `api/tests/Middleware/RequireAuthTest.php`

- [x] **Step 1: Create RequireAuth middleware**

Create `api/src/Middleware/RequireAuth.php`:

```php
<?php

declare(strict_types=1);

namespace OverPHP\Middleware;

use OverPHP\Helpers\appAuth;

class RequireAuth
{
    public static function handle(): ?array
    {
        appAuth\app_session_start();
        $userId = appAuth\app_session_get_user_id();

        if ($userId === null) {
            http_response_code(401);
            return [
                'success' => false,
                'error' => 'Authentication required',
            ];
        }

        return null;
    }
}
```

- [x] **Step 2: Write failing test for middleware**

Create `api/tests/Middleware/RequireAuthTest.php`:

```php
<?php

namespace OverPHP\Tests\Middleware;

use PHPUnit\Framework\TestCase;
use OverPHP\Middleware\RequireAuth;

class RequireAuthTest extends TestCase
{
    public function testReturnsErrorWhenNoSession(): void
    {
        // Clear any existing session
        $_SESSION = [];

        $result = RequireAuth::handle();

        $this->assertNotNull($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('Authentication required', $result['error']);
    }

    public function testReturnsNullWhenValidSession(): void
    {
        $_SESSION['user_id'] = 123;
        $_SESSION['organization_id'] = 1;
        $_SESSION['role'] = 'member';

        $result = RequireAuth::handle();

        $this->assertNull($result);
    }
}
```

- [x] **Step 3: Run test to verify it fails**

Run: `cd api && ./vendor/bin/phpunit --filter testReturnsErrorWhenNoSession`
Expected: FAIL - function returns array instead of null

- [x] **Step 4: Implement middleware correctly**

The middleware handles its own response via `http_response_code()` and returns the error array. This is the expected behavior - the router should check if result is not null.

- [x] **Step 5: Wire middleware to sync routes**

In `api/index.php`, modify sync routes to pass middleware:

```php
// Current (line 112-115):
$router->add('GET', '/sync/applications', 'SyncController@getApplications');
$router->add('POST', '/sync/applications', 'SyncController@saveApplications');

// New with middleware:
$router->add('GET', '/sync/applications', function() {
    $result = RequireAuth::handle();
    if ($result !== null) {
        echo json_encode($result);
        return;
    }
    return (new SyncController())->getApplications();
});
```

- [x] **Step 6: Run tests**

Run: `cd api && ./vendor/bin/phpunit`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add api/src/Middleware/RequireAuth.php api/tests/Middleware/ api/index.php
git commit -m "feat(auth): add RequireAuth middleware for sync routes"
```

---

## Task 4: Frontend Auth Store Integration

Connect frontend React auth store to `/api/auth/me` endpoint.

**Files:**
- Modify: `src/stores/authStore.ts` or similar auth context/hook
- Create: `src/hooks/useAuth.ts`
- Test: `src/tests/hooks/useAuth.test.ts`

- [ ] **Step 1: Find existing auth store**

Run: `find src -name "*auth*" -type f | grep -E "\.(ts|tsx)$"`

- [ ] **Step 2: Review current auth state management**

Read the auth store file to understand current implementation

- [ ] **Step 3: Write test for useAuth hook**

Create `src/tests/hooks/useAuth.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';

describe('useAuth', () => {
    it('returns user as null when not authenticated', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true, user: null }),
        });

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.user).toBeNull();
        });
    });

    it('returns user data when authenticated', async () => {
        const mockUser = { id: 1, email: 'test@example.com', displayName: 'Test' };
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true, user: mockUser }),
        });

        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
        });
    });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- --filter useAuth`
Expected: FAIL - useAuth hook doesn't exist

- [ ] **Step 5: Create useAuth hook**

Create `src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect } from 'react';

interface User {
    id: number;
    email: string;
    displayName: string | null;
    organizationId: number | null;
    role: string;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export function useAuth(): AuthState {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    useEffect(() => {
        async function checkAuth() {
            try {
                const response = await fetch('/api/auth/me', {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    setState({
                        user: data.user ?? null,
                        isLoading: false,
                        isAuthenticated: data.user !== null,
                    });
                } else {
                    setState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                    });
                }
            } catch {
                setState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                });
            }
        }

        checkAuth();
    }, []);

    return state;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --filter useAuth`
Expected: PASS

- [ ] **Step 7: Integrate with existing auth store if needed**

Update existing auth store to use `useAuth` hook for server state

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAuth.ts src/tests/hooks/useAuth.test.ts
git commit -m "feat(frontend): add useAuth hook connected to /api/auth/me"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Session regenerates on login (check browser DevTools)
- [ ] Google login creates user by email if not exists
- [ ] Sync routes return 401 when not authenticated
- [ ] Frontend auth store correctly reflects `/api/auth/me` state
- [ ] All tests pass: `npm test && cd api && ./vendor/bin/phpunit`
- [ ] Lint passes: `npm run lint`

---

**Plan complete.**