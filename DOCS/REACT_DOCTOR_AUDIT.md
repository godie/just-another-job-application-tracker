# React-Doctor Audit & Suppression Policy

**Scope:** Project-local suppressions and refactor policy for
[react-doctor](https://github.com/) on the React frontend in `src/`.

## Why this companion document exists

`HABIT_HOOKS_AUDIT.md` documents the **structural / size** lint
policy. This file documents the **React-correctness** lint policy
managed by `react-doctor` (via `oxlint-plugin-react-doctor`), so
contributors evaluating a `react-doctor-disable-next-line`
suppression can do so against an explicit rule catalogue and
justification framework.

The two policies must stay aligned: a suppression in one is not a
free pass in the other, and refactor candidates flagged by either
must be cross-checked.

## What react-doctor actually checks

`react-doctor` v0.5.8 wraps `oxlint-plugin-react-doctor` and
exposes a family of rules organised by category. Categories found in
the bundled source:

| Category prefix | Sample rule ids | Concern |
|-----------------|-----------------|---------|
| `no-access-key` / `no-aria-hidden-on-focusable` / `no-autofocus` | strict a11y | |
| `no-adjust-state-on-prop-change` / `no-derived-state` / `no-direct-mutation-state` / `no-chain-state-updates` | React state hygiene | |
| `no-array-index-as-key` / `no-array-index-key` | list rendering | |
| `no-bare-fetch` / `no-is-mounted` / `no-find-dom-node` | anti-patterns | |
| `no-new-function-as-prop` | re-render perf | |
| `js-set-map-lookups` / `async-await-in-loop` / `prefer-dynamic-import` | micro-perf / style | |

`npx react-doctor --verbose` will print every active finding with
the exact rule id; for the full rule catalogue, see
`node_modules/oxlint-plugin-react-doctor/`.

`react-doctor` also exposes a `DiagnosticSurface` filter — rules can
be reported on `cli`, `prComment`, `score`, or `ciFailure`. This
project uses the default (CLI surface only).

## Live suppression inventory (`npx react-doctor` baseline)

> **Anchored at commit `cdafe81`** (post-`8450a94` override-prompt
> commit — the audit-anchor baseline). Line numbers drift if upstream
> files are edited; if you find a `path:line` here that no longer
> matches `git show cdafe81:<path>` at that line, the contributor
> who edits or merges the upstream file change should refresh the
> inventory and re-anchor at the new commit.

At commit `cdafe81`, `npx react-doctor` reports **0 issues / 100/100
score** and **all 7 in-source suppressions are intentional**:

| File | Line | Rule(s) | Literal `-- <WHY>` rationale (extracted from the directive line) |
|------|-----:|---------|---------|
| `src/utils/matching.ts`           |  76 | `js-set-map-lookups` | `String.prototype.includes; SENIORITY_KEYWORDS is a plain object literal (Record), not an array/Set.` |
| `src/utils/matching.ts`           |  96 | `js-set-map-lookups` | `String.prototype.includes on normalized titles.` |
| `src/utils/matching.ts`           | 221 | `js-set-map-lookups` | `String.prototype.includes on lowercased locations.` |
| `src/utils/matching.ts`           | 223 | `js-set-map-lookups` | `String.prototype.includes on lowercased locations.` |
| `src/utils/geminiJobScoring.ts`   | 207 | `async-await-in-loop` | `concurrentMap already caps parallelism to limit; this worker loop is intentionally sequential within a single worker.` |
| `src/components/BarChartWidget.tsx` | 2 | `prefer-dynamic-import` | `recharts is code-split by parent InsightsPage via React.lazy()` |
| `src/components/FiltersBar.tsx`   |  51 | `no-derived-state`, `no-chain-state-updates` | No inline `-- <WHY>` tail on the directive. **The rationale is intentionally the extracted helper name** `syncSearchTermToCanonicalProp` (introduced in commit `bd534ec`), not an inline comment. Reviewers cross-reference that function for justification; the rationale-by-name is deliberate, not a missed review step. |

All seven are documented in their immediate code comment (the
trailing `-- <WHY>` rationale). The habit-hooks audit
(`habit-hooks-prompts/non-essential-comment.md`) prevents an agent
from stripping the WHY tail when reacting to a future
`non-essential-comment` finding.

## Policy: when to add a `react-doctor-disable` directive

Add a `react-doctor-disable-next-line <rule>` directive **only** when
ALL three criteria hold:

1. The rule flagged in your code is **verifiably intentional**, not
   avoidable via a small refactor you haven't tried.
2. A trailing `-- <WHY>` rationale is set on the same line so future
   reviewers can audit the suppression instantly.
3. The same fix has been considered in a sibling file and rejected
   there as well — a single-file suppression that doesn't generalise
   is usually a sign the underlying code is the problem.

If only one criterion holds (e.g. intentional but no WHY yet), ADD
the WHY comment first; only escalate to the directive if the rule
will not bend.

The instruction is reactive, not preemptive: do not blanket
suppress. A rule suppressed before it's ever fired may quietly drift
out of relevance as the rule changes upstream.

## Projected next refactor candidates

For the two files currently nearest to any react-doctor or
habit-hooks threshold, here are the **forward** refactor paths so
contributors don't have to re-derive them:

### `src/pages/SettingsPage.tsx` — 578 LOC

Currently passes both linters. If it grows to **> ~700 LOC** OR
react-doctor starts flagging `no-giant-component` again, candidate
splits (in order of **yield vs. blast-radius**):

1. **Co-locate each section's rendered JSX into its own file** under
   `src/components/settings/Sections/<section>/` (matching the
   pattern used by `MatchScoreBadge`). **This is the higher-yield
   first move** because it shrinks `SettingsPageContent`'s body by
   ~50 LOC AND reduces per-section focus scatter across 10 imported
   child components. The orchestrator can still inline the
   `{activeSection === 'X' && <XSettings />}` short-circuits.
   Trade-off: it touches every existing `<XSettings/>` import path
   and its test fixtures (higher blast-radius).
2. **Extract `useSettingsMatching()` sub-hook** from
   `useSettingsManager`. The matching-store binding
   (`matchingProfile`, `matchingPreferences`, `profileStatus`,
   `lastProfileCompute`, `isComputingScores`, `updateMatchingPreferences`,
   `buildProfile`, `computeScores`, `clearAllMatchingData`,
   `loadMatchingState`) is one distinct responsibility. Moving it
   to `useSettingsMatching()` collapses the orchestrator's
   `manager.profile.*` lookup surface and shrinks `useSettingsManager`
   by ~50 lines — but **does not shrink the orchestrator file**,
   so it is a lower-yield second move once the per-section move is
   out of the way.

**Followup tracking:** the candidate splits above are tracked in
full detail (mechanics + non-goals + acceptance criteria) at
[`DOCS/FOLLOWUP_SETTINGS_PAGE_REFACTOR.md`](../DOCS/FOLLOWUP_SETTINGS_PAGE_REFACTOR.md).
Pick up the task from that doc when the trigger condition fires;
don't re-derive the plan here.

### `src/components/FiltersBar.tsx` — 224 LOC at audit anchor

**Correction (commit `aec2bfb`, caught during cross-doc sanity-check while fixing matching.ts):** The audit memo header previously stated **207 LOC**, but `git show cdafe81:src/components/FiltersBar.tsx | wc -l` returns **224 LOC** — the same value as the working tree today. The 207 figure was a minor stale measurement (~8% off) at the time the memo was authored; the actual anchor value is **224 LOC**. The 1-suppression inventory entry (`no-derived-state`, `no-chain-state-updates` at line 51) is unchanged and stable.

Already passed once (commit `af0b04f` normalised a habit-hooks
finding on its `// ---` banner and the disable-directive WHY kept
its rationale). Current state is clean. If it crosses 300 LOC:
extract `useFiltersState()` (searchTerm, lastSearchRef, sync helper)
into `src/hooks/useFiltersState.ts`. The pattern in
`useFilteredApplications.ts` is the model.

**Followup tracking:** the candidate split above is tracked in
full detail (mechanics + non-goals + acceptance criteria +
rationale-by-name preservation for `syncSearchTermToCanonicalProp`)
at [`DOCS/FOLLOWUP_FILTERSBAR_REFACTOR.md`](../DOCS/FOLLOWUP_FILTERSBAR_REFACTOR.md).
Pick up the task from that doc when the trigger condition fires;
don't re-derive the plan here.

### `src/utils/matching.ts` — 446 LOC at audit anchor (NOT 141)

**Correction (commit `aec2bfb`):** The audit memo header previously stated **141 LOC**, but `git show cdafe81:src/utils/matching.ts | wc -l` returns **446 LOC** — the same value as the working tree today. The 141 figure was a measurement error (~3× stale) at the time the memo was authored; the actual anchor value is **446 LOC**. The 4-suppression inventory entries (lines 76, 96, 221, 223) are unchanged and stable across `cdafe81` → HEAD. **Before any future contributor builds a refactor strategy off a memo LOC figure, verify it with `git show <anchor>:<file> | wc -l`** — this correction is the second finding in a row showing the memo's stated LOC anchors have been stale on author submission.

Four `js-set-map-lookups` suppressions are concentrated here. If a
fifth is added under future refactor, **stop and consider**: the
real fix is probably to **stop building these arrays ad-hoc and
lift them to module-scope constants when an array exceeds
~50 entries or lives in a hot path (per-row, per-render loop)**.
`String.prototype.includes` on `T[]` is *faster* than
`new Set(arr) + .has()` for small arrays in V8 — converting too
early is a real perf pitfall, so don't pre-optimise. The right
trigger is size or hotness, not suppression count alone. With
**4 suppressions concentrated here**, however, one of those
arrays is very likely large or hot — read the call sites before
adding a fifth.

**Followup tracking:** the candidate splits above are tracked in
full detail (profile-first + scoring sub-module +
suppression-preservation disambiguation + empirically-measured
working-tree drift distribution from audit-anchor **446 LOC at
`cdafe81`** — same as today; zero growth in `cdafe81..4f11fd3` per
`git log`) at
[`DOCS/FOLLOWUP_MATCHING_REFACTOR.md`](../DOCS/FOLLOWUP_MATCHING_REFACTOR.md).
Pick up the task from that doc when the trigger condition (LOC
> ~700 OR a 5th `js-set-map-lookups` suppression) fires; don't
re-derive the plan here.

## Verification snapshot

At commit `cdafe81`:

```
react-doctor              ✅ 0 issues (100/100)
tsc --noEmit              ✅ clean
eslint                    ✅ 0 errors, 0 warnings
habit-hooks               ✅ 0 violations
vitest                    ✅ 815/815
```

## Related commits

- **`9bdc2ac`** — LandingPage refactor that revealed `// ---`
  banner patterns needing protection.
- **`bd534ec`** / **`05e3a34`** / **`997c7a0`** — Page-level refactors
  that produced the suppressions now documented here.
- **`cdafe81`** — `HABIT_HOOKS_AUDIT.md` (companion document).

## Cross-policy mandate (recommended practice)

When adding or removing a `react-doctor-disable-next-line`,
**recommended**: also amend the inventory table in this file so
the two audits stay the ground truth simultaneously. The existing
`habit-hooks-prompts/non-essential-comment.md` already protects
the trailing `-- <WHY>` rationale of any directive from being
silently stripped by a downstream comment-cleanup pass; this doc's
inventory table is not similarly guarded.

**Inverse link:** see `DOCS/HABIT_HOOKS_AUDIT.md` § "Companion
document" — both should update together.

**Enforcement note:** there is no automated gate enforcing the
cross-update today. Skipping it simply means future contributors
will re-derive the WHY from the file comment instead of
inheriting it. Adding a small companion habit-hooks override
prompt (e.g. `habit-hooks-prompts/react-doctor-suppression-sync.md`)
is a future option, but it would only fire when a
`react-doctor` rule actually triggers — which is the realistic
case for any brand-new suppression.

**Anchor-figure verification (commit 466936d, expanded):**
the following LOC figures in this audit memo AND in the companion
`DOCS/HABIT_HOOKS_AUDIT.md` were empirically cross-checked against
`git show <commit>:<path> | wc -l` (SettingsPage.tsx) and
a `const SettingsPageContent`-bounded measurement
(`useSettingsManager` arrow block, lines 88-389):

| File / claim                                            | Stated value       | Verified against                                | Status                                       |
|---------------------------------------------------------|-------------------:|-------------------------------------------------|----------------------------------------------|
| `src/utils/matching.ts`                                 | 446 LOC            | `cdafe81` + HEAD                                | **Verified (was 141 in prior memos — now 446)** |
| `src/components/FiltersBar.tsx`                         | 224 LOC            | `cdafe81` + HEAD                                | **Verified (was 207 in prior memos — now 224)** |
| `src/pages/SettingsPage.tsx`                            | 578 LOC            | `cdafe81` + `23ff536` + `997c7a0` + HEAD        | **Verified (was already 578, all anchors agree)** |
| `useSettingsManager()` hook (HABIT_HOOKS_AUDIT § oversized-*) | 302 LOC      | `cdafe81` + `23ff536` + `997c7a0` + HEAD        | **Verified (was 302 at all anchors — 578 LOC file, 391-2-88+1 = 302-line hook block)** |

**Other LOC-style claims in this memo, in `DOCS/HABIT_HOOKS_AUDIT.md`, and in the FOLLOWUP_*.md trackers are forward-looking projections (`X LOC after refactor`) or trigger thresholds (`X LOC file-size cut-off`).** These are NOT anchor claims and are NOT subject to empirical `git show` re-anchoring; they describe what would happen IF a refactor landed or IF the file grew past the threshold. Examples:
- `~700 LOC` triggers in `REACT_DOCTOR_AUDIT.md` and `FOLLOWUP_SETTINGS_PAGE_REFACTOR.md` — forward threshold, NOT an anchor.
- `FiltersBar.tsx LOC ≤ 180 (estimated after the extraction)` — post-refactor projection, NOT an anchor.
- `~50 LOC` orchestrator-shrinkage estimates in the SettingsPage candidates — post-refactor projection, NOT an anchor.

Future contributors should re-verify any SPECIFIC HISTORICAL LOC CLAIM (i.e., a numeric value tied to a commit-hash anchor) with `git show <commit>:<path> | wc -l` before quoting it; the non-goal in `DOCS/FOLLOWUP_MATCHING_REFACTOR.md § Non-goals` captures this discipline. **No new stale-anchor findings surfaced in this verification expansion** — the audit-memo pair's stated empirical claims (4 LOC figures across 3 files) are all consistent with `git show` measurements.
