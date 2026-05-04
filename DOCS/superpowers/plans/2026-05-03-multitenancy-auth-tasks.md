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

When user logs in with Google, if email doesn't exist, create account automatically. If email exists, link the Google ID to the existing account.

**Files:**
- Modify: `api/src/Controllers/AppAuthController.php` (google/linkedin methods)
- Modify: `api/src/Repositories/UserRepository.php` (add `updateGoogleId` and `updateLinkedInId` methods)
- Test: `api/tests/Controllers/AppAuthControllerTest.php`

- [x] **Step 1: Add `updateGoogleId` and `updateLinkedInId` to UserRepository**

Added methods that update the respective OAuth IDs on existing users, with multi-driver timestamp handling (SQLite/MySQL).

- [x] **Step 2: Update Google login flow to link by email**

When a user logs in with Google and the email matches an existing app user, the Google ID is now linked to that account (instead of just logging in without linking). The user is re-fetched after linking to get updated data.

- [x] **Step 3: Update LinkedIn login flow to link by email**

Same behavior as Google login - links the LinkedIn ID to an existing app user when the email matches.

- [x] **Step 4: Add session regeneration to OAuth logins**

Added `Security::regenerateSessionId()` before `app_session_start()` in both Google and LinkedIn login flows to prevent session fixation attacks.

- [x] **Step 5: Write tests for Google/LinkedIn auto-create and linking**

Created comprehensive tests in `AppAuthControllerTest.php`:
- Google login auto-creates new user
- Google login links existing user by email
- LinkedIn login auto-creates new user
- LinkedIn login links existing user by email
- Session regeneration on OAuth login

- [x] **Step 6: Run tests**

All 9 tests pass with 39 assertions.

- [x] **Step 7: Commit**

---

## Task 3: Auth Middleware for Sync Routes

Sync routes should require app auth, not just any session. Create middleware to verify authenticated app user.

**Files:**
- Create: `api/src/Middleware/RequireAuth.php`
- Modify: `api/src/Core/Router.php`
- Modify: `api/index.php`
- Test: `api/tests/Middleware/RequireAuthTest.php`

- [x] **Step 1: Create RequireAuth middleware**

Created `api/src/Middleware/RequireAuth.php` with `handle()` and `isAuthenticated()` methods. `handle()` checks for active app session user and returns a 401 error array if not authenticated, or `null` if authenticated.

- [x] **Step 2: Write tests for middleware**

Created `api/tests/Middleware/RequireAuthTest.php` with 5 tests:
- Returns error when no session
- Returns null when valid session
- Returns error when session user ID is null
- `isAuthenticated()` returns true when user ID is set
- `isAuthenticated()` returns false when no user ID

- [x] **Step 3: Wire middleware to sync routes**

All 4 sync routes in `api/index.php` (`/sync/applications` GET/POST, `/sync/opportunities` GET/POST) are wrapped with `RequireAuth::handle()` via closure handlers that return 401 if unauthenticated.

- [x] **Step 4: Run tests**

All 5 tests pass with 12 assertions.

- [x] **Step 5: Commit**

---

## Task 4: Frontend Auth Store Integration

Connect frontend React auth store to `/api/auth/me` endpoint.

**Files:**
- Create: `src/hooks/useAuth.ts`
- Modify: `src/hooks/useIsLoggedIn.ts`
- Test: `src/hooks/useAuth.test.ts`

- [x] **Step 1: Review existing auth state management**

`src/stores/authStore.ts` already exists with `fetchMe()` that calls `/api/auth/me` via `apiFetchMe()`. `App.tsx` already calls `fetchMe()` on mount. The auth store is already connected to the server endpoint.

- [x] **Step 2: Create `useAuth` convenience hook**

Created `src/hooks/useAuth.ts` — a thin selector-based wrapper around `useAuthStore` that exposes `{ user, isAuthenticated, isLoading, error }` for cleaner consumption in components.

- [x] **Step 3: Update `useIsLoggedIn` to use real auth state**

Updated `src/hooks/useIsLoggedIn.ts` to use `useAuthStore((state) => state.isAuthenticated)` instead of the legacy localStorage-based `checkLoginStatus()`. This ensures `Header`, `Sidebar`, and `BottomNav` always reflect the actual server session.

- [x] **Step 4: Write tests for `useAuth` hook**

Created `src/hooks/useAuth.test.ts` with 4 tests:
- Returns unauthenticated state when no user is logged in
- Returns authenticated state when user is logged in
- Returns loading state while auth is being checked
- Returns error state when authentication fails

- [x] **Step 5: Run tests**

All tests pass (475 tests, 4 pre-existing unhandled rejections in `App.test.tsx` unrelated to these changes).

- [x] **Step 6: Commit**

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