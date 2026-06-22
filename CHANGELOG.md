# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.3.1] - 2026-06-22 (later)

Hotfix patch released the same day as v2.3.0. Both fixes are producer-side-only (no API surface, no migration changes, no end-user configuration semantics), so a SemVer patch bump.

### Fixed
- **`api/composer.json` autoload `files`** still listed `src/Helpers/agentAuth.php` after the shared-key → session auth refactor on `feat/agent-api-session-auth`. `composer install` / `composer dump-autoload` failed on v2.3.0 with `Failed opening required '.../src/Helpers/agentAuth.php'`, blocking fresh installs of the release. The dangling line is dropped; the three remaining helpers (`cors.php`, `database.php`, `appAuth.php`) are intact. `composer.lock` unchanged.
- **PHPUnit warning under PHP 8.2** on `AppAuthControllerTest::testExchangeGoogleCodeRejectsRedirectUriNotInAllowedOrigins` (dynamic property `$this->config` on the test class, deprecated since PHP 8.2). Replaced with a reflection-based read of the parent's declared `private array $config`. Three assertions preserved; behavioral coverage unchanged. Suite now reports **0 warnings** under PHP 8.2 (was 1 phpunit warning on v2.3.0).

## [2.3.0] - 2026-06-22

### Added
- **Agent job applications API** (`POST /api/agent/applications`, `GET /api/agent/applications`, `GET /api/agent/applications/{id}`) — session-authenticated endpoint for automated agents (Codex, custom scripts) to record job applications on behalf of the logged-in user. Every record is scoped to `$_SESSION['user_id']`.
  - `api/src/Controllers/AgentJobApplicationController.php`
  - `api/src/Repositories/AgentJobApplicationRepository.php`
  - `api/src/Models/AgentJobApplication.php`
- **Agent routing in `api/index.php`** — three new routes added alongside the existing public API surface.
- **Idempotency hash scheme** — `(user_id, normalized job_url)` keyed; the same agent retrying the same job on the same user is a no-op rather than a duplicate row.
- **`agent_name` column on `agent_job_applications`** — informational label identifying which agent submitted the record (forensic / audit value).
- **User lifecycle contract** documented in `api/docs/AGENT_API.md` (deactivation pattern + GDPR escape hatch).
- **Phinx migration `db/migrations/20260622200000_EnforceUserDeactivationLifecycleContract.php`** — idempotent assertion migration that codifies the contract on both fresh and upgrade installs. Adds `users.is_active` + `idx_user_active` if missing; verifies `agent_job_applications.user_id` FK is `ON DELETE RESTRICT` against `information_schema` and aborts loudly otherwise (so silent FK drift can't erode the audit trail). Phinx-portable across MySQL and Postgres.

### Changed
- **API authentication** — agent endpoint switched from a shared `AGENT_API_KEY` header check to user-session authentication. Removes one global-write credential. Multi-user isolation enforced by the auth layer.
- **FK `agent_job_applications.user_id`** — `ON DELETE RESTRICT` (was `CASCADE`). Audit trail preserved when a user is deactivated. Shipped with the `ModelMapper::deleteUser` soft-delete migration so the only known caller keeps working; any future code path that hard-deletes a user owning agent rows must either pre-delete or soft-delete the agents first.
- **User lifecycle** — `ModelMapper::deleteUser()` performs a *soft* delete (`UPDATE users SET is_active = 0` driver-aware for SQLite vs MySQL/Postgres) instead of a hard `DELETE`. A user that owns agent rows can no longer be hard-deleted via this helper; the audit trail is preserved by design.

### Removed
- `api/src/Middleware/agentAuth.php` and the `AGENT_API_KEY` config entry — superseded by session auth.
- Speculative `ModelMapper::reactivateUser()` — no callers, removed.

### Security
- Closing the `AGENT_API_KEY` path removes a shared secret that could otherwise record agent jobs as any user.

## [2.2.0] - 2026-06-22

### Added
- CVE Lite GitHub Actions workflow — scans for vulnerable dependencies on every PR and push to `main` (`--fail-on critical`)
- React Doctor GitHub Actions workflow — automated code health checks (security, performance, accessibility, bundle-size, architecture)
- `engines` field to `package.json` — declares Node.js 22.x and npm 10.9.2 runtime requirements
- `packageManager` field to `package.json` — pins npm@10.9.2

### Changed
- **Accessibility & HTML compliance**
  - Converted modal wrappers from generic `<div>` to semantic `<dialog>` elements across all modals (`AddJobForm`, `GeminiKeyModal`, `MatchBreakdownModal`, `OnboardingWizard`, `ProfileSetupModal`)
  - Added `type="button"` to ~30+ buttons that were previously defaulting to `type="submit"`, preventing accidental form submissions
  - Added `aria-label` attributes to inputs, buttons, and settings controls throughout the app
  - Converted `KanbanView` cards from interactive `<div role="button">` to real `<button>` elements
- **Pagination** — `ApplicationTable` and `TimelineView` now derive `effectivePage` via `useMemo` instead of resetting via `useEffect`, eliminating a render-cycle desync
- **Auth modal** — migrated from 6× `useState` hooks to `useReducer` for cleaner state transitions
- **Import hygiene** — replaced barrel imports (`./ui`) with direct imports (`./ui/Button`, `./ui/Card`, etc.) across 30+ components for better tree-shaking
- **Footer** — moved `currentYear` to module-level constant, eliminating unnecessary state
- **AddJobForm** — default date set in `useState` initializer instead of a mount `useEffect`, removing a flicker frame
- **FiltersBar** — search term initialization refactored to avoid derived-state diagnostic
- **Dependencies**
  - `vitest` 3.2.4 → 4.1.0
  - `vite` 7.3.2 → 7.3.5
  - `dompurify` 3.4.2 → 3.4.11
  - `@vitest/coverage-v8` 3.2.4 → 4.1.0
  - `@vitejs/plugin-react` lockfile refreshed

### Fixed
- **Keyboard handlers** — restored 3 keyboard shortcuts accidentally dropped during the modal refactor:
  - `MatchBreakdownModal`: Escape key dismissal via `useKeyboardEscape` hook
  - `GeminiKeyModal`: Enter-to-submit
  - `ProfileSetupModal`: Ctrl/Cmd+Enter submit
- **Pagination UI desync** — pagination buttons now use `effectivePage` instead of `currentPage` for highlight and disabled state, preventing stale page indicators when data shrinks below `currentPage`
- **`useGoogleToken`** — added `useRef` guard to ensure token check executes only once per hook instance
- **Vitest worker crash** — added `pool: 'forks'` to vitest config to prevent "Worker exited unexpectedly" errors in vitest 4.x

### Removed
- Dead code flagged by knip:
  - `src/hooks/useApplicationFiltersState.ts`
  - `src/hooks/useJobForm.ts`
  - `src/seo/index.ts`

### Security
- Fixes critical CVE-2026-47429 in vitest (arbitrary file read via Vitest UI server)
- Fixes high CVE-2026-53571 and CVE-2026-53632 in vite (`server.fs.deny` bypass, NTLMv2 hash disclosure)
- Fixes medium CVE-2026-49458, CVE-2026-49459, and CVE-2026-49978 in dompurify (XSS bypasses via IN_PLACE mode and shadow DOM)
- Fixes low CVE-2026-49356 in `@babel/core` (arbitrary file read via sourceMappingURL)


