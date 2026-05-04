# Multitenancy Auth Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining auth tasks from MULTITENANCY_AND_AUTH_PLAN.md: session regeneration, Google identity linking, auth middleware for sync, and frontend integration.

**Architecture:** Enhance the existing PHP API with session security, auto-user creation on Google login, and auth-gated sync routes. Frontend React app connects to auth/me endpoint.

**Tech Stack:** PHP 8.1+, React 19, TypeScript, session-based auth

---

## Task 1: Session Regeneration on Login

Prevents session fixation attacks. Regenerates session ID after successful login.

**Files:**
- Modify: `api/src/Controllers/AppAuthController.php` (login, google, linkedin methods)
- Test: `api/tests/Controllers/AppAuthControllerTest.php`

- [x] **Step 1: Add session regeneration to login method**

Added `Security::regenerateSessionId()` after `updateLastLogin()` and before `app_session_start()` in `login()`. Same pattern applied to `google()` and `linkedin()` OAuth methods.

- [x] **Step 2: Run tests**

All PHP tests pass (14 tests, 51 assertions).

- [x] **Step 3: Commit**

Included in Task 2 commits.

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

Commit: `d2c8054`

---

## Task 3: Auth Middleware for Sync Routes

Sync routes require app auth. Middleware verifies authenticated app user.

**Files:**
- Create: `api/src/Middleware/RequireAuth.php`
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

- [x] **Step 5: Fix cross-test session contamination**

Replaced `session_write_close()` with `session_destroy()` in `RequireAuthTest::setUp()` to prevent session data from previous test classes (e.g. `AppAuthControllerTest`) from persisting and being reused. This fixed `testReturnsErrorWhenNoSession` which was failing because a `user_id` from a prior test leaked into the fresh session.

- [x] **Step 6: Commit**

Commits: `9560bb3` (session fix)

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

All tests pass.

- [x] **Step 6: Commit**

Included in Task 5 commits.

---

## Task 5: Frontend Auth Cleanup (GoogleSheetsSync + Legacy Removal)

Migrate remaining frontend consumers to real auth store and remove dead code.

**Files:**
- Modify: `src/components/GoogleSheetsSync.tsx`
- Modify: `src/tests/App.test.tsx`
- Modify: `src/tests/GoogleSheetsSync.test.tsx`
- Modify: `src/stores/authStore.ts`
- Modify: `src/storage/auth.ts`

- [x] **Step 1: Migrate GoogleSheetsSync to useAuthStore**

Replaced `checkLoginStatus()` from `../utils/localStorage` with `useAuthStore((state) => state.isAuthenticated)` in `GoogleSheetsSync` component for real server-connected auth state. Added `isAuthenticated` to `handleSync` useCallback dependency array for correctness.

- [x] **Step 2: Fix App.test.tsx unhandled rejections**

Mocked `useAuthStore` in `App.test.tsx` to eliminate 4 pre-existing unhandled rejections from `fetchMe` calling `setLoginStatus`.

- [x] **Step 3: Remove legacy localStorage auth helpers**

Removed `checkLoginStatus()` and `setLoginStatus()` from `src/storage/auth.ts`. Removed all `setLoginStatus()` calls from `src/stores/authStore.ts` — auth state now flows purely through the server-connected Zustand store (`fetchMe` on mount). Cleaned up dead mocks from `Header.test.tsx` and `GoogleSheetsSync.test.tsx`.

- [x] **Step 4: Run tests**

All 471 frontend tests pass. All 14 PHP tests pass.

- [x] **Step 5: Commit**

Commit: `d4d5c40`

---

## Verification Checklist

After completing all tasks, verify:

- [x] Session regenerates on login (Security::regenerateSessionId in login, google, linkedin)
- [x] Google login creates user by email if not exists, links existing user
- [x] LinkedIn login creates user by email if not exists, links existing user
- [x] Sync routes return 401 when not authenticated (RequireAuth middleware)
- [x] Frontend auth store correctly reflects `/api/auth/me` state (useAuthStore + fetchMe)
- [x] GoogleSheetsSync uses real auth state (useAuthStore, not localStorage)
- [x] Legacy localStorage auth helpers removed (checkLoginStatus, setLoginStatus)
- [x] All tests pass: `npm test && cd api && ./vendor/bin/phpunit`
- [x] Lint passes: `npm run lint`

---

## Commits

| Commit | Message |
|--------|---------|
| `d4d5c40` | chore(auth): remove legacy localStorage-based checkLoginStatus and setLoginStatus |
| `d2c8054` | refactor(auth): extract duplicated OAuth linking logic into handleOAuthLogin |
| `9560bb3` | fix(tests): destroy session in RequireAuthTest setUp to prevent cross-test contamination |
| `7206957` | feat(auth): integrate GoogleSheetsSync with real auth store |

**Plan complete.** ✅