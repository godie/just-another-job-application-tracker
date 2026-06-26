# Follow-up: FiltersBar size refactor (extract `useFiltersState()` hook)

**Status:** Deferred — do not start until the trigger condition fires.
**Owner:** future contributor.
**Linked from:** `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" — `src/components/FiltersBar.tsx` block.

## Trigger condition

Pick up this work the first time EITHER:

- `src/components/FiltersBar.tsx` grows past **~300 LOC**, OR
- `npx habit-hooks` flags a finding on `FiltersBar.tsx` again.

The audit memo's historical note records that the file last passed at commit `af0b04f` (the `// ---` banner + disable-directive rationale normalisation). Both triggers are unambiguous and `wc -l`-able / reporter-output-able. The "Status filter `<details>` blocks feel cluttered" condition is intentionally NOT listed — opinion heuristic, not a stable signal.

## Snapshot staleness

Measurements below are **anchored at commit `cdafe81`** (the audit memo pair + the audit memo's anchor commit). Working tree grew slightly to **224 LOC** (vs audit snapshot of 207 LOC); +17 LOC, an **8% drift** since the audit. **8% drift is well within acceptable bounds — it is NOT a refactor trigger today.** The audit memo's stated 300-LOC threshold remains the right bar; this doc is not chasing a moving target, it is documenting where the next move becomes worthwhile. **Re-measure before doing the refactor**; if either value drifts significantly, **re-anchor at the new commit hash** so this doc stays accurate.

## Current state (snapshot at commit `5310761`)

| Measurement                                                              | Value      | Drift from audit (`cdafe81`) |
|--------------------------------------------------------------------------|------------|------------------------------|
| `src/components/FiltersBar.tsx` LOC                                      | 224        | +17 (8% growth)              |
| `react-doctor-disable-next-line` suppressions                            | 1          | unchanged (line 51, both `no-derived-state` + `no-chain-state-updates`) |
| `Filters` interface fields (search, status, statusInclude, statusExclude, platform, dateFrom, dateTo) | 7 | unchanged |
| Mount / prop-watch refs (initialSearchRef, filtersRef, onFiltersChangeRef, isMountedRef, lastSearchFromPropsRef) | 5 | unchanged |
| `useEffect` blocks (mount-guard, debounce-timer)                          | 2           | unchanged                    |
| `syncSearchTermToCanonicalProp(canonical: string)` helper                | 1          | unchanged (extracted at commit `bd534ec`); rationale-by-name per audit memo |
| Status-filter `<details>` blocks (Include + Exclude)                     | 2          | unchanged (most LOC-heavy block in the file) |

The one suppression has **no inline `-- <WHY>` tail** — the rationale is **intentionally the extracted helper name** `syncSearchTermToCanonicalProp` (per audit memo). Both linters currently report `0` findings. The refactor is **not urgent** today; the rationale-by-name pattern is the documented steady state. Re-measure before doing the work — see "Snapshot staleness" above.

## Candidate #1 — extract `useFiltersState()` hook (preferred first move)

Extract the filter-state machinery from `FiltersBar.tsx` into a NEW hook `src/hooks/useFiltersState.ts`. The hook owns:

- `searchTerm` local state (`useState`).
- Mount-guard `isMountedRef` + the "is first render?" early return.
- Prop-watch refs (`filtersRef`, `onFiltersChangeRef`, `lastSearchFromPropsRef`, `initialSearchRef`).
- `syncSearchTermToCanonicalProp(canonical: string)` (kept verbatim — the rationale-by-name the audit memo cites).
- The **reconciliation** `useEffect` (watches `filters.search` + `searchTerm`; calls `syncSearchTermToCanonicalProp`).
- The **debounce** `useEffect` (300 ms timer; calls `onFiltersChangeRef.current({ ...filtersRef.current, search: currentSearchTerm })`; `clearTimeout` cleanup).

Mechanics (high level):

1. New file: `src/hooks/useFiltersState.ts`.
2. Public surface: `useFiltersState({ initialSearch, filters, onFiltersChange }: { initialSearch: string; filters: Filters; onFiltersChange: (next: Filters) => void }) => { searchTerm: string; setSearchTerm: (next: string) => void }`. The `setSearchTerm` setter is what `<Input onChange>` calls in `FiltersBar.tsx`.
3. **Move `syncSearchTermToCanonicalProp` inside the hook**, NOT in `FiltersBar.tsx`. This preserves the rationale-by-name the audit memo cites.
4. **Move the `react-doctor-disable-next-line` directive with the helper** — the directive + helper should live inside the hook file so the rationale-by-helper-name stays co-located. The directive's `no-derived-state` + `no-chain-state-updates` rules remain applicable to the reconciliation effect after the move.
5. **No prop additions.** No prop renames. The hook consumes the existing `Filters` interface exactly. The `createFilterChangeHandler` dispatchers (`status`, `statusInclude` toggle, `statusExclude` toggle, `platform`, `dateFrom`, `dateTo`, `clearStatus`) stay in `FiltersBar.tsx`.
6. **No test changes** unless there's an existing `FiltersBar*.test.*` that imports state internals (verify by search). The state extraction is internal — the only public surface is the search-input binding.

**Why only Candidate #1 (no #2 in this doc):** `FiltersBar.tsx` is not yet large enough to warrant a JSX sub-component split (the audit memo itself notes "Currently passes both linters... if it crosses 300 LOC" — a single threshold, a single candidate). Both linters accept the current size; a single, clean, low-blast-radius extraction closes the deferred-work item. **If a Candidate #2 is later warranted** (>400 LOC total, OR a second suppression appears, OR a third status-filter `<details>` block is added), open a fresh follow-on tracker — do not extend this one.

## Acceptance criteria

- `npx tsc --noEmit` clean.
- `npm run lint` clean (0 errors, 0 warnings).
- `npx habit-hooks` reports `automated checks passed` (0).
- `npx react-doctor` reports 0 issues (the single suppression MOVES with `syncSearchTermToCanonicalProp` — line number will change, but the `-- <WHY>` tail / rationale-by-name convention continues to satisfy the audit memo).
- `npm test` continues to pass **815/815** — including any `FiltersBar*.test.*` (verify test fixtures re-import from the new hook path if any).
- `FiltersBar.tsx` LOC ≤ 180 (estimated after the extraction — the 4 refs + 2 `useEffect`s + 1 helper + 1 suppression-marker all move out; ~40–50 LOC drop expected).
- Hook has a single source-of-truth `Filters`-shaped contract. No new props.
- `syncSearchTermToCanonicalProp` is preserved by name (rationale-by-name cited by the audit memo).

## Non-goals

- **Do not** introduce reducers / `useFiltersStateReducer()` layers. The hook signature must mirror the `useFilteredApplications.ts` minimalism — plain `useState` + well-defined refs, no augmentation.
- **Do not** split the JSX `<details>` Include/Exclude blocks into a separate sub-component (`StatusFilterGroup<Include|Exclude>`). They are already small (`<details><summary>...</summary><div>...` map of checkboxes) and a sub-component split would inflate the prop surface without shrinking `FiltersBar.tsx` enough to justify the move.
- **Do not** convert the `Filters` interface from a plain object to a discriminated union "just in case". The current shape is consumed directly by `useFilteredApplications.ts` and by `src/pages/HomePage.tsx`'s filter pipeline; reshape only if both call sites are refactored in lock-step.
- **Do not** add an inline `// -- <WHY>` tail next to the moved disable-directive. The audit memo explicitly says the rationale-by-name (`syncSearchTermToCanonicalProp`) is deliberate, not a missed review step. Adding the inline comment would muddy that intent — the helper name IS the rationale.

## References

- `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" + "Live suppression inventory" — original analysis + audit memo (207 LOC anchor + rationale-by-name convention for the line 51 suppression).
- `DOCS/HABIT_HOOKS_AUDIT.md` — confirms rules still pass at the snapshot; cross-reference for the `// ---` banner discipline that produced the af0b04f normalisation.
- commit **`af0b04f`** — `FiltersBar.tsx` `// ---` banner normalisation + the disable-directive rationale-by-name it carries today.
- commit **`bd534ec`** — OpportunitiesPage refactor that produced `syncSearchTermToCanonicalProp` extracted from a parallel fix on OpportunitiesPage's filter plumbing; **the helper's name is the audit-cited rationale, do not rename.**
- commit **`997c7a0`** — OpportunitiesPage `recentCount` duplicate-state cleanup; included as the precedent for state-model simplification rather than hook split.
- commit **`cdafe81`** — the audit memo pair that established the projected threshold + 207 LOC anchor for `FiltersBar.tsx`.
- commit **`5310761`** — current branch HEAD (`FiltersBar.tsx` at 224 LOC — drift noted above). **Re-anchor here on next revision.**

## Estimate (well-informed gut, not engineering-grade)

- Candidate #1: 1 PR, ~3 files touched (hook + FiltersBar + maybe a small test), 1 reviewer iteration expected. Low blast-radius.

Single-pr, single-afternoon work IF the trigger fires.
