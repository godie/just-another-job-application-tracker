# Follow-up: SettingsPage size refactor (co-locate section JSX + extract matching sub-hook)

**Status:** Deferred — do not start until the trigger condition fires.
**Owner:** future contributor.
**Linked from:** `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next
refactor candidates" — `src/pages/SettingsPage.tsx` block.

## Trigger condition

Pick up this work the first time EITHER:

- `src/pages/SettingsPage.tsx` grows past **~700 LOC**, OR
- `npx react-doctor` reports a `no-giant-component` finding on
  `SettingsPage`.

Both triggers are unambiguous and `wc -l`-able / reporter-output-
able. The "styling logic leaked into orchestrator" condition is
intentionally NOT listed here — it's an opinion heuristic and
hard to recognise after the fact. Stick to the two objective
triggers.

These are the conditions documented in commit `23ff536`'s
audit. Anything above is solid greenfield; the project has
explicitly chosen to defer the refactor until it earns its
blast-radius.

## Snapshot staleness

Measurements below are **anchored at commit `23ff536`**. Re-measure
before doing the refactor; if either value drifts significantly,
re-anchor at the new commit hash so this doc stays accurate.

## Current state (snapshot at commit `23ff536`)

| Measurement                          | Value     |
|-------------------------------------|-----------|
| `src/pages/SettingsPage.tsx` LOC    | 578       |
| `useSettingsManager()` hook LOC     | 302       |
| Section render branches (inline &&) | 10        |
| Imported `<XSettings/>` children    | 10        |

These are well below the threshold and both `habit-hooks` and
`react-doctor` report `0` findings on the file. The refactor is
**not urgent** today. **Re-measure before doing the work** — see
"Snapshot staleness" above.

## Candidate #1 — co-locate each section's JSX (preferred first move)

Move every imported `<XSettings/>` render branch into a co-located
file under a **NEW** subdirectory `src/components/settings/Sections/<section>/`
so the orchestrator's body shrinks by ~50 LOC and per-section
logic stops being scattered across the SettingsPage imports list.

> **IMPORTANT — these are NEW wrapper files in a NEW subdirectory.**
> The existing per-section implementations under
> `src/components/settings/` (`FieldsSettings.tsx`,
> `ViewSettings.tsx`, `DateFormatSettings.tsx`,
> `CustomFieldsSettings.tsx`, `InterviewingSettings.tsx`,
> `ATSSearchSettings.tsx`, `EmailScanSettings.tsx`,
> `ToolsSettings.tsx`, `MatchingSettings.tsx`,
> `CloudAccountSection.tsx`) stay untouched and continue to hold
> the actual logic. The new `Sections/<section>Section.tsx`
> files are thin re-exports that exist so SettingsPageContent can
> import a single `<FieldsSection/>` instead of `<FieldsSettings/>`.
> Do NOT move or overwrite the existing files.

Mechanics (high level):

1. New directory: `src/components/settings/Sections/`.
2. One new (thin) file per section, e.g.:
   - `Sections/FieldsSection.tsx`
   - `Sections/ViewSection.tsx`
   - ... (10 files total)
3. Each new section file imports the existing `<XSettings/>`
   implementation from `src/components/settings/<X>Settings.tsx` and
   re-exports a typed component that matches the existing prop
   shape verbatim. **No prop renames. No wrapper logic. No
   business changes.**
4. SettingsPageContent replaces its inline `<XSettings />` JSX
   branches: keep the existing inline `{activeSection === 'X' &&
   <XSection/>}` short-circuits and just swap the named component
   (i.e., `<FieldsSettings ... />` → `<FieldsSection ... />` with
   identical props).

**Why #1 first (not #2):** section-JSX co-location has the
higher yield-vs-blast-radius ratio — it shrinks the orchestrator
file directly (the file that currently trips `no-giant-component`),
even though it touches more import paths. The mechanical split of
the hook alone (Candidate #2) does NOT shrink the orchestrator
file, so it would leave us stuck above the threshold. **Order
matters: do not do #2 before #1.**

## Candidate #2 — extract useSettingsMatching() sub-hook (after #1)

Once #1 is done and SettingsPageContent is a thin orchestrator,
extract the matching-store binding out of `useSettingsManager`
into a dedicated `useSettingsMatching()` sub-hook. The
matching-specific surface is one distinct responsibility:

- `matchingProfile`, `matchingPreferences`, `profileStatus`,
  `lastProfileCompute`, `isComputingScores`,
  `updateMatchingPreferences`,
  `buildProfile: () => buildProfile(applications)`,
  `computeScores: () => computeScores(opportunities, applications)`,
  `clearAllMatchingData`, `loadMatchingState`.

Mechanics: peel those 10 properties + the matching-related
`useEffect` (the `computeError → showError` cascade) out of
`useSettingsManager` into `src/hooks/useSettingsMatching.ts`.
The orchestrator destructures `{ ..., profile } = useSettingsManager()`
* OR swaps to `{ ..., matching } = useSettingsMatching()`
* OR, if JSX co-location happened first, removes them from
  the hook entirely by inlining the store bind in `MatchingSection`.

This move shrinks `useSettingsManager` by ~50 LOC but **does
not shrink SettingsPageContent** — so it is the lower-yield
second move.

## Acceptance criteria

- `npx tsc --noEmit` clean.
- `npm run lint` clean (0 errors, 0 warnings).
- `npx habit-hooks` reports `automated checks passed` (0).
- `npx react-doctor` reports 0 issues (or strictly fewer giant-
  component findings than before the refactor).
- `npm test` continues to pass **815/815** — including all 4
  `SettingsPage.test.tsx` assertions (heading, sidebar text,
  switch via `Custom Fields` clicker, save flow with
  `Settings saved successfully` toast).
- SettingsPage.tsx LOC ≤ 350 (after co-location).
- `useSettingsManager()` hook LOC ≤ 250 (after sub-hook
  extraction).

## Non-goals

- Don't split `useSettingsManager` into multiple sub-hooks
  (`useSettingsPreferences`, `useSettingsMiscOps`,
  `useSettingsMatching`) all at once unless both candidate #1
  AND candidate #2 fail to drop SettingsPage below the
  threshold. The split-by-responsibility is tempting but
  indiscriminate splitting hurts more than it helps at this
  size — see commit `997c7a0`'s audit for the
  `recentCount` precedent.
- Don't move the **ProfileSetupModal** orchestration out of
  `SettingsPageContent`. The modal is still rendered from the
  page root and only the section's `onOpenProfileModal` button
  triggers it; co-locating the modal would require moving the
  matching-section state too.
- Don't rename `useSettingsManager`. The hook's name is the
  semantic seam — splitting into `useSettings(Tab|Profile|
  Matching)` would obscure, not clarify, the responsibilities.

## References

- `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor
  candidates" — original analysis that produced this plan.
- `DOCS/HABIT_HOOKS_AUDIT.md` — confirms rules still pass at
  the snapshot state.
- commit `05e3a34` — SettingsPage already extracted the
  manager hook + inlined `{activeSection === 'X' && <XSettings
  />}` short-circuits at commit time (dropped the
  `no-render-in-render` suppression in the same commit).
- commit `23ff536` — the audit memo pair
  (`DOCS/HABIT_HOOKS_AUDIT.md` + `DOCS/REACT_DOCTOR_AUDIT.md`)
  that established the projected threshold.
- commit `997c7a0` — OpportunitiesPage `recentCount`
  duplicate-state cleanup, included as a precedent for
  state-model cleanup rather than sub-hook split.

## Estimate (well-informed gut, not engineering-grade)

- Candidate #1: 1 PR, ~10 files touched, 1-3 reviewer
  iterations expected.
- Candidate #2: 1 PR, ~3 files touched, 1 reviewer iteration
  expected.

Both are appropriate for a single evening's work IF the
trigger fires.
