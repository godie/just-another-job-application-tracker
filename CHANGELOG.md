# Changelog

All notable changes to this project will be documented in this file.

Each release is a dated `## [<version>] - YYYY-MM-DD` heading followed by `### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Security` subsections (Keep a Changelog's structure, without the `[Unreleased]` block this repo does not use).

## [2.6.9] - 2026-07-06

### Added
- **`scripts/check-workflow-shape.sh`** — pre-merge CI gate that fails fast when any `.github/workflows/*.yml` file is missing the required top-level wrapper keys (`name:`, `on:`, `jobs:`). Mirrors the styles of the existing `scripts/check-orphans.sh` (rg-based, subcommand-dispatched) and `scripts/scan-secrets.sh` (concise header, `set -euo pipefail`, `--ci` mode flag). Wired into two places: (a) `.github/workflows/pull-request.yml`'s `secrets` job as a new step that emits `::error file=` annotations under `--ci` mode; (b) `.github/workflows/orphan-sweep.yml`'s `sweep` job as the very first step so a wrapper drift on `main` surfaces as an `orphan-sweep` tracking issue instead of an un-flagged deploy failure. Self-tested locally with both valid and broken fixture files: returns exit 0 on a clean tree, exit 1 on a file with only indented job bodies (the regression class), and prints all offenders before exiting.

### Notes
- **Regression origin & merge-order dependency**: this gate exists because of the regression observed in the PR #206 squash (commit `4d5748a`). Hotfix PR #208 separately restores the wrapper on `deploy.yml`. This PR's `pull-request.yml` gate fails fast on this PR's own CI run because `deploy.yml` on `main` (the base branch) is still missing the wrapper until #208 merges. The PR body documents the resolution: merge #208 first, then rebase this branch onto post-#208 main and re-push. No re-bump (per AGENTS.md "follow-up commits in same branch MUST NOT re-bump" rule); if #208 lands before this PR, version stays at `2.6.9` and the gate's first CI run will go green.
- **Why only three keys, not four**: this gate enforces `name:`, `on:`, `jobs:`. `env:` is deliberately NOT enforced because `composer-validate.yml` (the `workflow_call` reusable workflow) omits file-scope env and declares per-job setup instead — enforcing `env:` here would false-positive the existing tree. A future tightening could either (a) add `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` to `composer-validate.yml` and enable the gate to require it, or (b) make the required-key set configurable via a sentinel. Both deferred to a separate PR to keep this one strictly scoped.
- **Version slot choice**: PATCH `2.6.7 -> 2.6.9` (skipping the `2.6.8` slot that PR #208 already claims) per the repo's pattern of documenting skipped-version slots in the entry's `### Notes`. Same merge-order choreography as the prior `2.6.4 -> 2.6.5 -> 2.6.6 -> 2.6.7` chain.

## [2.6.6] - 2026-07-04

### Added
- **`AGENTS.md` Cross-PR Version Race Playbook** section (#200) — codified diagnostic for the version-slot race this PR itself resolves. Future contributors (human or AI) encountering two PRs claiming the same PATCH slot now have a single canonical playbook to follow rather than re-deriving the recovery each time.
- **`.github/workflows/composer-validate.yml`** (#203, NEW, 78 lines) — reusable `workflow_call` (`shivammathur/setup-php@2.37.2` pinned per AGENTS.md GitHub Actions pin rule, `permissions: contents: read`, `timeout-minutes: 10`). Two-step validation: `composer validate --strict --no-check-publish` followed by `composer install --dry-run --no-dev --no-interaction --no-progress`. Recovers the gate that was force-pushed off main by PR #199 — the workflow lives on the branch *and* on main after this integration.
- **`.github/workflows/version-sequence-check.yml`** (#204, NEW, 127 lines) — daily + per-release + dispatch trigger matrix mirroring `orphan-sweep.yml`. Emits a sticky `version-sequence-check` tracking issue (idempotent upsert; closes-with-comment on clean) when the CHANGELOG PATCH sequence is non-contiguous within a `(major, minor)` group.
- **`scripts/check-orphans.sh` `sequence` subcommand** (#204) — refactors the script into a subcommand-dispatched shell (`literal <version>` | `sequence` | `--help`). The new `sequence` mode walks `CHANGELOG.md` headings with numeric sort + dedup and emits a 5-column `| Missing | Between | Between date | And | And date |` Markdown table. Skip: `[Unreleased]`, major/minor transitions. Backward compat preserved: bare semver arg falls through to `literal`.

### Changed
- **`api/composer.json`** (#202) — pins `symfony/http-client` to `^7.0` (with companion `api/composer.lock` regeneration) so CI stays resolvable on PHP 8.2. Resolves the lockfile failure surface that made the v2.6.2 partial fix (#197 + #198) insufficient.
- **`.github/workflows/pull-request.yml`** (#203) — appends a `composer-validate:` job wired to `./.github/workflows/composer-validate.yml`. Hard gate on every PR.
- **`.github/workflows/deploy.yml`** (#203) — adds `needs: composer-validate` on the existing `build:` job + a matching `composer-validate:` job. The lockfile is verified before any deploy artifact is produced.

### Fixed
- **`api/src/Telemetry/LogfireTelemetry.php`** (#200) — `+2/-2` refines the v2.5.1 OTel graceful-degradation fix to cover the wider OTel SDK upgrade surface area. The `Attributes::class` gate stays correct when the SDK is missing.

### Notes
- **Consolidation rationale**: This PR unifies four open PRs (`#200`, `#202`, `#203`, `#204`) that all branched off `main` HEAD `7ccc553` (v2.6.2). Each claimed a distinct PATCH slot (`2.6.4`, `2.6.4`, `2.6.5`, `2.6.6`). Per AGENTS.md's per-PR-version rule (one PR = one version), the consolidated PR claims **2.6.6** (the topmost mental claim from `#204`); the four per-PR slots are absorbed and no longer separately claimable. The 2.6.3 documented-loss slot (per the prior `2.6.5` entry's force-push forensic) stays preserved.
- **PR `#205` (`chore/add-headroom-ai-devdep`, `2.6.7`) is *not* part of this consolidation**; it merges independently when ready.
- **`scripts/check-orphans.sh` post-merge**: the `sequence` subcommand is on-disk; the operational hook is `.github/workflows/version-sequence-check.yml` (above). Both audits fire daily at 06:00 UTC + on `release.published`.
- **Branch lifecycle** (destructive ops applied after this PR opens): PRs `#200`, `#202`, `#203`, `#204` are closed with `superseded by #<this>` comments; their source branches are deleted from origin. Their commits remain reachable through this PR's git history.

## [2.6.7] - 2026-07-04

### Added
- **`headroom-ai` devDep** — `npm install --save-dev --save-exact headroom-ai@0.22.4` adds the LLM-token-compression SDK to `devDependencies` for toolchain authors to import. The project itself ships with no LLM context compression running (no code change); this PR is dependency-churn-only with no API surface change, so it is a PATCH per AGENTS.md. The package is Apache-2.0 with **zero runtime dependencies**; declared peerDependencies (`@ai-sdk/provider`, `@anthropic-ai/sdk`, `ai`, `openai`) are all marked `optional` per the manifest.

### Notes
- **Version slot rationale**: 2.6.3 is documented as intentionally unfilled per the `2.6.5` entry's forensic on PR #199's force-push race; 2.6.4 and 2.6.5 were claimed by aborted PRs (`#202`, `#203`) that never landed; 2.6.6 is claimed by PR #204's open `ci/check-version-sequence-gaps` audit-enhancement. This PR skips to 2.6.7 to (a) preserve the loss-slot narrative integrity and (b) avoid colliding with the open 2.6.6 claim. Whichever of #204 or this PR merges first establishes the new floor; the other rebases onto it.
- **knip watch**: once merged, `npx knip` (the `lint` workflow's neighbour) will treat `headroom-ai` as `unused-devDependencies` until something imports it. Mitigation **applied in this same PR**: `knip.config.ts` -> `ignoreDependencies: ["headroom-ai"]` so the lint CI stays green. The orphan-sweep (`scripts/check-orphans.sh` literal subcommand) will *not* flag `"0.22.4"` as an orphan because `package.json` / `package-lock.json` are excluded by the AGENTS.md Versioning allow-list.
- **Node engine warning**: `ini@7.0.0` (transitive of `headroom-ai`) declares `engines.node ^22.22.2 || ^24.15.0 || >=26.0.0`; the project's `.nvmrc` pins `22.16.0`. `npm install` emits a non-fatal `EBADENGINE` warn. Bump Node or pin to an older `ini` if a CI strictness flag is added later.

## [2.6.2] - 2026-07-03 (later)

### Fixed

- `composer install` was failing with `Your lock file does not contain a compatible set of packages` because `symfony/options-resolver v8.1.0` (locked transitively via `php-http/curl-client 2.4.0`) requires PHP >= 8.4.1 but the deploy workflow runs PHP 8.2.31. Added a `conflict` block in `api/composer.json` refusing `symfony/options-resolver >=8.1`; `composer update` resolved to `8.0.8` (PHP 8.2 compatible). `composer install` now exits 0 (verified in both default and `--no-dev` modes). Version bump skipped from 2.6.0 to 2.6.2 because PR #197 (docs: Contribution Workflow rule) already claims 2.6.1 — the two PATCH bumps can merge in any order without a rebase conflict.

  **Forward-looking**: if/when the project migrates the deploy workflow + production server to PHP 8.4, remove the `conflict` block from `api/composer.json`, bump the `php` constraint in `require` from `^8.1` to `^8.4`, and run `composer update symfony/options-resolver` to pick the latest 8.x (8.1+). The existing `^8.1` constraint already covers both 8.2 and 8.4 (it means `>=8.1.0 <9.0.0`), so no constraint widening is needed during the transition — the bump is the strict 8.4+ minimum. The `conflict` block is intentional, not stale — it is the mechanism that keeps the lock resolvable on PHP 8.2.

## [2.6.1] - 2026-07-03 (later)

### Added

- New `## Contribution Workflow` section in `AGENTS.md` codifying the "never push to main, always create a PR" rule. The rule is self-applying (this change was made on a feature branch and opened as a PR). Includes rationale (CI gate, audit trail, branch protection) and explicit edge cases (Dependabot, orphan-sweep workflow, tag pushes, pre-authorized Actions tokens) so future contributors — including AI agents — have a clear, mechanical path. The `(later)` annotation on the heading follows the CHANGELOG convention: this patch shipped the same day as 2.6.0, after the minor.

## [2.6.0] - 2026-07-03
 (fix(composer): refuse symfony/options-resolver >=8.1 to keep PHP 8.2 compat (2.6.2))

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

