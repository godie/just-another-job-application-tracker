# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.6.0] - 2026-07-03

### Added
- **`scripts/check-orphans.sh`** — reusable helper that runs `rg -F -n` for any quoted version literal in the repo, excluding the AGENTS.md Versioning allow-list (`CHANGELOG.md`, `package-lock.json`, `api/composer.lock`, `api/vendor/**`, `node_modules`, `.git`, `.jules`). Outputs a Markdown table ready for a GitHub Issue body. Hard rg errors (exit 2+) propagate so a permission-borked file fails the workflow instead of silently going green. Cron-friendly: idempotent, deterministic output, no side effects.
- **`.github/workflows/orphan-sweep.yml`** — cron-friendly audit workflow. Triggers on `release: { types: [published] }`, daily at 06:00 UTC (`schedule: '0 6 * * *'`), and `workflow_dispatch`. Reads the current `package.json` version via `jq`, hands it to the script, and idempotently upserts a single sticky tracking issue labeled `orphan-sweep` — opens on first orphan detection (or reopens an existing one), edits in place on subsequent runs, and closes-with-comment when the sweep returns clean. Permissions: `contents: read` + `issues: write`. Concurrency-cancellable so a burst of release events doesn't pile up redundant runs.

### Fixed
- **Deploy workflow Composer production install** — `deploy.yml` now provisions PHP/Composer in GitHub Actions, runs `composer install --no-dev --optimize-autoloader --prefer-dist` inside `dist/api`, and verifies `dist/api/vendor/autoload.php` before packaging and before deploy. This ensures the generated artifact always includes a production-ready `vendor/` tree instead of relying on a git-tracked `api/vendor/` directory, which is ignored in this repo.
- **`scripts/check-orphans.sh` rg `--` separator placement** — `--` previously sat BEFORE the `-g` exclude globs, so rg parsed `-g '!node_modules'` as a pair of positional path arguments. Both paths didn't exist, so rg exited with code 2 on every run, including the first cron sweep. Moved `--` to immediately before the PATTERN positional arg so the `-g` flags are correctly recognized as flags. Documented the footgun in the script's implementation note so future refactors don't reintroduce it.
- **`.github/workflows/orphan-sweep.yml` issue-body composition** — replaced `cat <<EOF ... EOF` heredoc (which inherited the YAML `run: |` block's 14-space indent and rendered in GitHub Issues with leading whitespace on every line) with a single `printf '## ...\n\n**%s** ...\n' "$VERSION" ...` so the body markdown has zero leading indent. Positional args: `VERSION`, `ORPHAN_COUNT`, `body`, `VERSION` (footer echo). No literal `%` in the body to double.

## [2.5.1] - 2026-07-03

### Fixed
- **`LogfireTelemetry` bootstrap graceful degradation** — `attributes()` step now gated by `class_exists(Attributes::class)`. If a prod deploy ships with a stale `vendor/` (composer install lagged behind the SDK bump and `OpenTelemetry\SDK\Common\Attribute\Attributes` is missing), telemetry no longer crashes with `"Class ... not found"`; it falls back to `ResourceInfoFactory::defaultResource()` alone, keeping OTel's built-in service detectors alive until the next deploy picks up the SDK package.
- **`POST /api/perf/vitals` ModSecurity 920420 rejection** — `src/lib/perf.ts` `logfireReporter` now wraps the JSON payload in a `Blob` typed `application/json` before `navigator.sendBeacon`. Browsers force `text/plain;charset=UTF-8` for `sendBeacon(url, string)`, which OWASP CRS rule `920420 (REQUEST-920-PROTOCOL-ENFORCEMENT)` was rejecting with `[msg "Request content type is not allowed by policy"]` on every vitals beacon from `jajat.godieboy.com`. `sendBeacon(url, blob)` honors the Blob MIME, so backend `PerfController::vitals()` keeps reading the same JSON it always did. Regression test pinned in `src/lib/perf.test.ts` so a future refactor cannot silently flip it back to a plain string.

## [2.5.0] - 2026-07-03

### Added
- **AGENTS.md relocated to project root** — moved `DOCS/AGENTS.md` to `./AGENTS.md` so it sits next to `README.md` and the package settings files. No content removed; one new section added.
- **Versioning rule** in `AGENTS.md` — every change MUST bump `package.json` version. SemVer PATCH/MINOR/MAJOR guidance is in the section header; the bump ships in the same commit as the change, with the matching entry under `## [Unreleased]` in this file.

## [2.4.2] - 2026-06-24

### Fixed
- **`HomePage` mount `useEffect`**: tightened the dependency array to a truly empty `[]` to prevent an infinite render loop that regressed in v2.4.1.

## [2.4.1] - 2026-06-24

### Fixed
- **npm audit / CVE-Lite vulnerabilities**: patched transitive dependency chain flagged by `cve-lite`.
- **`HomePage` `useEffect` dependencies**: removed `applications` from the dependency array to break an infinite render cycle introduced after the v2.4.0 release.

## [2.4.0] - 2026-06-23

### Added
- **Job details page** (`JobDetailsPage`) — Jira-style full-screen view for individual job applications. Renders position, company, status badge, location, work type, hybrid days, salary, platform, contact, dates (applied/interview/follow-up), job link, notes, timeline events, and custom fields. Navigated via `?page=job-details&jobId=<id>` URL params. Includes SEO meta tags, footer with app version, edit/delete actions (edit dispatches `triggerEditJob` to HomePage, delete navigates back to applications).
- **Job preview panel** (`JobPreviewPanel`) — slide-over side panel for quick job inspection from the applications list. Shows position, company, status, key info grid (location, work type, salary, platform), dates section, contact, job link, notes excerpt (truncated to 150 chars), timeline event count, and custom fields count with i18n plural support. Features keyboard accessibility (Escape to close, backdrop click, focus trap via `useFocusTrap`), slide-in animation, and a clickable job ID that navigates to the full `JobDetailsPage`.
- **Timeline display utilities** (`src/utils/timelineDisplay.ts`) — shared `formatDate`, `getStageDisplayName`, and `getEventStatusColor` helpers used by `JobDetailsPage`, `JobPreviewPanel`, `TimelineView`, and other components.
- **`onSelectJob` navigation** — all view components now accept an `onSelectJob` callback that opens the `JobPreviewPanel` when a job is clicked. Wired across `ApplicationTable`, `ApplicationCard`, `ApplicationTableRow`, `KanbanView`, `CalendarView`, `TimelineView`, `ApplicationTimelineCard`, and `CurrentViewRenderer`.
- **`job-details` route** — added to `App.tsx` page routing alongside existing routes.
- **Translation keys** — English and Spanish translations for `jobDetails` (18 keys) and `jobPreview` (20 keys, including plural `timelineEvents` and `customFieldsCount`).
- **Default SEO description** — `SEODefaults` now includes a `description` field (`"Track and manage your job applications — free, private, and open-source."`), used as fallback when pages don't provide one (no more empty meta tags).
- **SEO title tests** — added `document.title` assertions for `LandingPage`, `InsightsPage`, and `SettingsPage` verifying the `resolveSEOConfig` `" | JAJAT"` suffix.
- **App-level integration test** — renders `<App />` at `?page=job-details&jobId=app-1`, awaits lazy-loaded `JobDetailsPage`, asserts position/company/status/jobId/SEO title, and clicks "Back to Applications" to verify full navigation flow.
- **51 unit tests** across `JobDetailsPage.test.tsx` (20 tests), `JobPreviewPanel.test.tsx` (31 tests), and `timelineDisplay.test.ts` (25 tests).

### Changed
- **`onEdit` → `onSelectJob`** — card/row clicks in `ApplicationCard`, `ApplicationTableRow`, and `CalendarView` now trigger `onSelectJob` (opens preview panel) instead of `onEdit` (opens edit form). Edit is still accessible via the Edit button in both the preview panel and the full details page.
- **`SEOConfig.description`** — made optional; `resolveSEOConfig` falls back to `defaults.description` when omitted.

### Fixed
- **`setupTests.ts` t() mock** — now handles 3-argument `t(key, defaultValue, options)` calls correctly for i18n plural forms (was ignoring the `count` option).
- **`formatDate` invalid-date guard** — added `isNaN(d.getTime())` check before `toLocaleDateString()` so invalid date strings return the original input instead of `"Invalid Date"`.
- **React Doctor issues** — hoisted `DetailField` component from inside `JobDetailsPage` body to module scope (eliminates recreation on every render), replaced `[...arr].sort()` with `arr.toSorted()`, removed redundant `role="complementary"` from `<aside>` (implicit per HTML spec).
- **12 `@typescript-eslint/no-explicit-any` errors** — replaced `(state: any)` with properly typed store state in `JobPreviewPanel.test.tsx` and `JobDetailsPage.test.tsx`.
- **Inline `<style>` block** — moved `@keyframes slideInRight` from `JobPreviewPanel` inline `<style>` to `src/index.css` (CSP-safe).
- **`t as (...)` type cast** — extracted to a `const tt` helper at component top in `JobDetailsPage` to centralize the single `TFunction` narrowing point.

### Removed
- Unused `onEdit` destructuring from `ApplicationCard`, `ApplicationTableRow`, and `CalendarView` (props interface preserved, callers unaffected).

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

