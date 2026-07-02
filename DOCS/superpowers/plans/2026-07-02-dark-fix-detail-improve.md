# Dark Fix & Detail Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the in-progress work on `feature/dark-fix-detail-improve`. The diff is already in the working tree; this plan atomically commits it as 6 logical units, gates each with a fresh-implementer review, and ends with a whole-branch review.

**Architecture:** Bite-sized atomic commits rather than a single squash. Each task is independently testable (tests/lint/typecheck all green at commit time) and represents a single, reviewer-rejectable concern. TDD where new files: tests lead; for existing-diff tasks, the focus is correctness-verification rather than fresh implementation.

**Tech Stack:** React 19, Vite 7, TypeScript 5.9 (strict), Tailwind v4 (`@custom-variant dark (&:where(.dark, .dark *))`), CVA button variants, Vitest 4 + Testing Library, i18next.

## Global Constraints

- Semantic CSS tokens only — no raw `hsl(...)` outside `src/index.css`. Use `bg-card`, `text-foreground`, `bg-secondary`, `text-muted-foreground`, etc.
- WCAG AA contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for ≥18pt text. Dark-mode text/bg pairings must pass.
- i18n parity: every key added to `src/locales/en/translation.json` MUST also appear in `src/locales/es/translation.json` with a quality Spanish translation. No untranslated keys.
- No new dependencies; stay within existing tech stack.
- Conventional commit prefixes: `feat(detail)`, `feat(i18n)`, `refactor`, `fix`, `chore`. Subject ≤ 72 chars.
- Pre-commit verification: `npx vitest run <file>` (affected tests), `npx eslint --max-warnings 0 <file>`, `npx tsc -b`. All must pass before commit.
- The dark-mode contrast fix in Task 6 (LandingCTA semantic dark pairing + muted-foreground bump) was already discussed and reviewed mid-session; implementer must NOT regress that fix.

---

## Task 1: Add Jira-style Job Detail Components

**Files:**
- Create: `src/components/JobHeaderCard.tsx` — header card with title, company, status badge, edit/delete-or-cancel/save buttons (state-driven via `isEditing`); double-click handler for entering edit mode; `data-testid="details-header-card"`.
- Create: `src/components/JobEditForm.tsx` — form rendering position/company/etc., re-using `BasicDetailsFields` and `TrackingFields` plus a notes textarea wrapped inside `<label>` for native label/control association. `data-testid="details-edit-form"` + `data-testid="form-notes"`.
- Create: `src/components/JobDetailFields.tsx` — exports read-only `<DetailField>` and `<JobDetailFields>`; renders label/value grid + sage `Separator` + sanitized link.
- Create: `src/components/JobDetailFooter.tsx` — back button + state-driven Save/Cancel-or-Edit. Tests use `data-testid="details-cancel-footer"`/`details-save-footer`.

**Goal:** Establish the four cohesive UI primitives before the consuming refs land in `JobDetailsPage`.

**Steps:**
- [ ] **Step 1: Verify exports and props interfaces**

  Read each file and confirm the export name and props match this spec:
  - `JobHeaderCard({ application, isEditing, onDoubleClick?, onEdit, onDelete, onCancelEdit, onSaveEdit })`
  - `JobEditForm({ formData, onChange, onSubmit })`
  - `JobDetailFields({ application })` (+ `export const DetailField`)
  - `JobDetailFooter({ isEditing, onBack, onEdit, onCancelEdit, onSaveEdit })`
  Expected: All four exports present.

- [ ] **Step 2: Lint**

  Run: `npx eslint --max-warnings 0 src/components/JobHeaderCard.tsx src/components/JobEditForm.tsx src/components/JobDetailFields.tsx src/components/JobDetailFooter.tsx`
  Expected: Clean exit (no warnings, no errors). The repo's eslint config does not see `.css`; runtime ESLint config files use `.ts/.tsx`.

- [ ] **Step 3: Typecheck**

  Run: `npx tsc -b`
  Expected: Clean (no errors). Builds against existing `JobApplication` type from `src/types/applications.ts`.

- [ ] **Step 4: Confirm JobDetailsPage.test.tsx still references these exports**

  Run: `grep -E "JobHeaderCard|JobEditForm|JobDetailFields|JobDetailFooter" src/pages/JobDetailsPage.tsx`
  Expected: All four imported and used.

- [ ] **Step 5: Tests gated for later task**

  These new components are NOT yet imported into any test-rendered output — they're rendered through `JobDetailsPage`, which is tested in Task 2. Do NOT add new test files for these components in this task; their behavior is verified through the consumer test in Task 2. Just ensure the imports compile (Step 3).

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/JobHeaderCard.tsx src/components/JobEditForm.tsx src/components/JobDetailFields.tsx src/components/JobDetailFooter.tsx
  git commit -m "feat(detail): add Jira-style job detail components (header, edit, fields, footer)"
  ```

**Reviewer gate:** Confirm no premature imports outside the consumer page, no dead code, and that the four test-IDs line up with what `JobDetailsPage.test.tsx` expects for tasks 2 and 3.

---

## Task 2: Refactor JobDetailsPage to Inline Edit Using New Components

**Files:**
- Modify: `src/pages/JobDetailsPage.tsx` — replace inline edit logic + old inline field markup with `JobHeaderCard` + `JobDetailFields` + `JobEditForm` + `JobDetailFooter`. State `isEditing` + `editFormData` lives in this page. Save flow uses `updateApplication` from `useApplicationsStore`, with a defensive `workType`/`hybridDaysInOffice` normalization that mirrors `AddJobForm`. Show "Changes saved" alert via `useAlert`.
- Modify: `src/pages/JobDetailsPage.test.tsx` — full rewrite of edit-related tests (no more `triggerEditJob` event assertion). New assertions cover: edit enters inline mode, fields render with current values, save persists via `updateApplication`, cancel exits without persisting, double-click on header enters edit mode, Deleted status blocks edit mode.

**Goal:** Move inline editing to this page so the slide-over preview can stay read-only; replace a brittle event-bus `triggerEditJob` with a clean store + props flow.

**Interfaces:**
- Consumes: `JobHeaderCard`, `JobEditForm`, `JobDetailFields`, `JobDetailFooter` (Task 1). `useApplicationsStore.updateApplication(id, partial)` — `(state) => state.updateApplication` selector.
- Produces: import contracts `getEditOrDisabledLabel(status: ApplicationStatus)`-style and an exported `formatDate` consumer; downstream calls in `JobPreviewPanel` and `HomePage` need to be updated (Tasks 3 and 4) to drop the `triggerEditJob` event listener.

**Steps:**
- [ ] **Step 1: Run JobDetailsPage tests**

  Run: `npx vitest run src/pages/JobDetailsPage.test.tsx`
  Expected: All tests pass. There must be no references to `CustomEvent('triggerEditJob')` in the test file.

- [ ] **Step 2: Confirm `AlertProvider` is wired in test mocks**

  Verify that the test file mocks `useAlert` (showSuccess/showError/showInfo). If not, the page's reference to `useAlert` will explode at render time and tests fail.

- [ ] **Step 3: Lint**

  Run: `npx eslint --max-warnings 0 src/pages/JobDetailsPage.tsx src/pages/JobDetailsPage.test.tsx`
  Expected: Clean.

- [ ] **Step 4: Typecheck**

  Run: `npx tsc -b`
  Expected: Clean.

- [ ] **Step 5: Visual sanity (manual, no commit yet)**

  Dev server is `npm run dev`. Visit `/applications`, click an app row to open JobDetailsPage, click Edit, change the position, Save. Confirm "Changes saved" alert shows and the value persists after a page reload. Skip if dev server not available.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/JobDetailsPage.tsx src/pages/JobDetailsPage.test.tsx
  git commit -m "refactor(detail): inline edit on JobDetailsPage using new components"
  ```

**Reviewer gate:** Re-run tests. Confirm `triggerEditJob` is fully removed from BOTH the page and the test. Confirm normalization logic mirrors `AddJobForm` (workType literal, hybridDays is `number | undefined`). Confirm `getEventStatusColor` / `getStageDisplayName` are still needed imports (used by timeline rendering).

---

## Task 3: Refactor JobPreviewPanel — Title Clickable, Edit Navigates to Details

**Files:**
- Modify: `src/components/JobPreviewPanel.tsx` — drop `onEdit?: (application: JobApplication) => void` from props. Make the entire Title + Company block a single `<button>` that fires `onNavigate?.('job-details')` (and shows hover treatment via `group`). Lift the external job-posting link up next to the title, drop the redundant standalone "Job Link" section.
- Modify: `src/components/JobPreviewPanel.test.tsx` — remove `onEdit` mock + assertions. Confirm `preview-title-button` fires `onNavigate('job-details')`. Confirm clicking Edit in preview now closes the preview AND navigates to full details (this is the new behavior — does NOT call a separate `onEdit` callback). Confirm "does not throw when onDelete is undefined" test still passes.

**Goal:** The slide-over becomes a read-only preview; mutating actions move to the full-page JobDetailsPage where inline edit lives.

**Interfaces:**
- Consumes: PageType from `../App`, `JobApplication` from `../types/applications`, sanitizeUrl from `../utils/url`.
- Produces: a narrower `JobPreviewPanelProps` shape WITHOUT `onEdit`. Downstream consumer (`HomePage.tsx`) drops the `onEdit` prop it passes in (handled in Task 4).

**Steps:**
- [ ] **Step 1: Run panel tests**

  Run: `npx vitest run src/components/JobPreviewPanel.test.tsx`
  Expected: All tests pass. `preview-title-button` is the new test-id; old `preview-job-id` MUST NOT appear in production code OR tests.

- [ ] **Step 2: Lint**

  Run: `npx eslint --max-warnings 0 src/components/JobPreviewPanel.tsx src/components/JobPreviewPanel.test.tsx`
  Expected: Clean.

- [ ] **Step 3: Typecheck**

  Run: `npx tsc -b`
  Expected: Clean. `onEdit` prop must be removed from the interface.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/JobPreviewPanel.tsx src/components/JobPreviewPanel.test.tsx
  git commit -m "refactor(detail): slide-over preview becomes read-only with clickable title"
  ```

**Reviewer gate:** Verify the URL-sync effect in `App.tsx` is the SOLE mechanism that pushes `page=job-details&jobId=<id>` to history when the title is clicked (no leftover `window.history.pushState` call from the panel). Re-run dev-server visual confirm.

---

## Task 4: HomePage Cleanup — Remove Obsolete `triggerEditJob` Listener

**Files:**
- Modify: `src/pages/HomePage.tsx` — drop `onTriggerEdit` event listener and its associated `useEffectEvent` handler. Drop the `onEdit` prop passed into `<JobPreviewPanel>`. The `useEffect` that mounted the listener and the cleanup that removed it both go away.

**Goal:** Remove the dead event-bus path the previous two tasks superseded.

**Steps:**
- [ ] **Step 1: Verify no remaining references to `triggerEditJob`**

  Run: `grep -rn "triggerEditJob" src/`
  Expected: Zero matches (the listener is dead and the producer is gone — JobsDetailPage no longer dispatches it).

- [ ] **Step 2: Run HomePage-adjacent tests**

  Run: `npx vitest run src/pages/HomePage.tsx 2>&1 | tail -20` — if no HomePage test exists, run `npx vitest run src/components/ApplicationTable.store.integration.test.tsx` and `npx vitest run src/components/Sidebar.test.tsx` instead (they exercise the parent).
  Expected: All pass.

- [ ] **Step 3: Lint**

  Run: `npx eslint --max-warnings 0 src/pages/HomePage.tsx`
  Expected: Clean.

- [ ] **Step 4: Typecheck**

  Run: `npx tsc -b`
  Expected: Clean.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/HomePage.tsx
  git commit -m "refactor(detail): remove obsolete triggerEditJob event listener in HomePage"
  ```

**Reviewer gate:** Confirm the file has no dead `useEffectEvent` import without use, and that the `window.addEventListener` block for `triggerEditJob` is gone along with the matching `removeEventListener` in cleanup. Re-grep should be empty.

---

## Task 5: i18n Additions for New Strings

**Files:**
- Modify: `src/locales/en/translation.json` — add `jobDetails.editDetails` ("Edit Job Details"), `jobDetails.saved` ("Changes saved"), `jobPreview.viewPosting` ("View posting →").
- Modify: `src/locales/es/translation.json` — add the matching three keys with quality Spanish translations: `Editar detalles del empleo`, `Cambios guardados`, `Ver publicación →`.

**Goal:** Surface explicit labels for the new states so users in both English and Spanish see no English fallbacks.

**Steps:**
- [ ] **Step 1: Verify both files have the three keys**

  Run: `grep -E '"(editDetails|saved|viewPosting)"' src/locales/en/translation.json src/locales/es/translation.json`
  Expected: Both files return 3 lines for en and 3 for es.

- [ ] **Step 2: Confirm no untranslated (English in es) placeholders**

  Run: `grep -E '"(Edit Job Details|Changes saved|View posting)"' src/locales/es/translation.json`
  Expected: Zero matches — the Spanish file should NOT contain any of the English values verbatim.

- [ ] **Step 3: Verify keys referenced in code paths**

  Run:
  ```
  grep -RnE 'jobDetails\.(editDetails|saved)' src/
  grep -RnE 'jobPreview\.viewPosting' src/
  ```
  Expected: At least one match for `jobDetails.editDetails` (JobDetailsPage section header toggle) and one for `jobDetails.saved` (alert message). `jobPreview.viewPosting` is currently unused in the diff but reserved for the next preview iteration.

- [ ] **Step 4: Lint**

  Run: `npx eslint --max-warnings 0 src/locales/en/translation.json src/locales/es/translation.json 2>&1`
  Expected: ESLint doesn't lint `.json`; ignore exit code. Step 1 + Step 2 are the actual gates for translation files.

- [ ] **Step 5: JSON validity**

  Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en/translation.json','utf8')); JSON.parse(require('fs').readFileSync('src/locales/es/translation.json','utf8')); console.log('ok')"`
  Expected: `ok`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/locales/en/translation.json src/locales/es/translation.json
  git commit -m "feat(i18n): add editDetails / saved / viewPosting keys (en + es)"
  ```

**Reviewer gate:** Re-run Steps 1, 2, 5. The translator should be able to read both files and confirm parity without context.

---

## Task 6: Dark Mode Polish — Palette Refresh + LandingCTA Contrast Fix + Muted-Foreground Bump

**Files:**
- Modify: `src/index.css` — both (a) the `.dark { ... }` token refresh (surface elevation ramp through `--background`/`--card`/`--popover`/`--secondary`/`--muted`/`--accent`; borders at L=28%; foreground at L=92%; primary at 35% S, 60% L; destructive at 78% S, 46% L) and (b) the in-session bump of `--muted-foreground: 30 12% 72%` (with the care-of-origin comment explaining we restored the prior L from 65% to 72% to lift dim links/nav text). light mode tokens stay at `30 15% 10%` foreground, `30 6% 40%` muted-foreground (no change).
- Modify: `src/pages/LandingPage.tsx` — apply the contrast fix on the bottom CTA `Button` line ~470: `bg-white dark:bg-card text-foreground hover:bg-muted dark:hover:bg-secondary border-border shadow-md hover:shadow-lg`. (Light mode keeps the white card with dark text; dark mode pairs `--card` background with `--foreground` text for ≥ AA pair.)
- Modify: `src/pages/LandingPage.test.tsx` — keep the existing `.bg-white.text-foreground` query working AND assert `dark:bg-card` + `dark:hover:bg-secondary` are present so future regressions are caught.

**Goal:** Complete the dark-mode polish so the user's reported contrast complaints (sidebar inactive links, landing page button text invisible in dark mode) are resolved with semantic tokens (no raw hex/slate on UI structure). Do this in a single atomic commit because all three file changes are coherent dark-mode concerns; splitting `index.css` would require git-add-p interactivity.

**Steps:**
- [ ] **Step 1: Run LandingPage tests**

  Run: `npx vitest run src/pages/LandingPage.test.tsx`
  Expected: All 31 tests pass. The new assertion `expect(whiteButton?.className).toMatch(/\bdark:bg-card\b/)` is in the updated test.

- [ ] **Step 2: Lint changed .tsx files**

  Run: `npx eslint --max-warnings 0 src/pages/LandingPage.tsx src/pages/LandingPage.test.tsx`
  Expected: Clean. (`src/index.css` is not linted by the project's ESLint config; that's expected and not a regression.)

- [ ] **Step 3: Typecheck**

  Run: `npx tsc -b`
  Expected: Clean.

- [ ] **Step 4: Visual verify in dev server (browser)**

  If dev server is running on `:5179` or `:5173`, open it, toggle dark mode (sun/moon switch in header). Confirm:
  a) Sidebar inactive links text is legible (rgb ≈ 238, 235, 232 on dark bg, ≥ 8:1 contrast).
  b) Bottom CTA button on gradient section renders dark bg + light text in dark mode (rgb foreground ~238,235,232 on bg ~24,23,22, ≥ 13:1 contrast).
  c) Hover state on the CTA flips to slightly lighter dark card (visible feedback).
  d) No console errors tied to the styling change.
  Skip if dev server is unavailable; capture a brief summary of "visual verify skipped, code-only verified".

- [ ] **Step 5: Confirm index.css muted-foreground math**

  Run: `grep -A 1 "muted-foreground: 30 12% 72%" src/index.css`
  Expected: A comment explaining the bump reasoning is on the line(s) above; the rule itself parses correctly. Light-mode muted-foreground MUST still be `30 6% 40%` (don't accidentally apply the bump to :root).

- [ ] **Step 6: Commit**

  ```bash
  git add src/index.css src/pages/LandingPage.tsx src/pages/LandingPage.test.tsx
  git commit -m "fix(dark-mode): refresh dark palette + LandingCTA semantic dark pairing + muted-foreground bump"
  ```

**Reviewer gate:** Re-do test/lint/typecheck on the staging-area commit hash. Render the dark-mode landing page gradient CTA section and verify the contrast. Confirm no raw `bg-slate-*` / `text-slate-*` escaped onto structural UI (the only acceptable exception is hover utilities used for visual hover feedback, but the final fix uses `hover:bg-muted` not slate).

---

## Final Review (after all 6 commits)

After the last task lands, dispatch ONE final whole-branch reviewer covering `MERGE_BASE..HEAD` for:
- All 6 commit messages follow Conventional Commits format
- Each commit is independently revertable
- The two bug fixes (LandingCTA contrast, muted-foreground readability) are not regressed by either the palette refresh or any new code path
- All new tests pass + lint clean + typecheck clean across the whole project (not just per-file)
- i18n parity holds; no missing translation keys

Use `git log --oneline e7e33ee..HEAD` (where `e7e33ee` is the last `shadcn migration` commit before this branch started) to enumerate the 6 new commits for the reviewer.

After final review passes, use `superpowers:finishing-a-development-branch` to decide merge/PR/cleanup.
