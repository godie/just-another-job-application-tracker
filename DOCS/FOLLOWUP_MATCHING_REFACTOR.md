# Follow-up: matching.ts size refactor (profile-first + scoring sub-module; suppression concentration)

**Status:** Deferred — do not start until the trigger condition fires.
**Owner:** future contributor.
**Linked from:** `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" — `src/utils/matching.ts` block.

## Trigger condition

Pick up this work the first time EITHER:

- `src/utils/matching.ts` grows past **~700 LOC**, OR
- A **5th `js-set-map-lookups` suppression** is added to `matching.ts`.

The audit memo states: _"With **4 suppressions concentrated here**, however, one of those arrays is very likely large or hot — read the call sites before adding a fifth."_ That wording already encodes both the LOC threshold AND the suppression-count threshold. Both triggers are unambiguous and `wc -l`-able / grep-able. The "scoring logic hard to follow" condition is intentionally NOT listed — it's an opinion heuristic, not a stable signal.

## Snapshot staleness

The audit memo anchors the matching.ts size at `cdafe81` = **141 LOC**. Working tree at current HEAD is **446 LOC** — a **3.15× drift**, the largest among the projected refactor candidates. **The drift narrative below is empirical** (measured with `awk` against the working-tree file), not assumed.

### Measured region distribution (working-tree, HEAD = `5310761`)

| ID | Region                                                                                                                            | LOC   | % of file | Notes                                                                                                                              |
|----|-----------------------------------------------------------------------------------------------------------------------------------|------:|----------:|------------------------------------------------------------------------------------------------------------------------------------|
| A  | Constants block (`POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, derived `SKILL_REGEXES`)    |    82 |     18.4% | pure data, already module-scope                                                                                                   |
| B  | Helper functions (`extractSeniorityFromTitle`, `normalizeTitle`, `calculateRoleSimilarity`, `extractSkillsFromDescription`, `calculateSkillsMatch`, `parseSalaryRange`, `calculateCompensationFit`, `isWorkTypeMatch`, `calculateLocationMatch`, `determineConfidence`, `determineVerdict`) |   157 |     35.2% | small functions; some shared between profile + scoring (e.g. `extractSkillsFromDescription`)                                       |
| C  | Explanation-generation (`generateExplanation` + `generateStrengths` + `generateGaps`)                                            |    47 |     10.5% | tightly coupled to `JobMatchSubscores` type                                                                                        |
| D  | Profile-building (`buildProfileFromHistory`)                                                                                      |    77 |     17.3% | single function; distinct responsibility (build `UserMatchProfile`)                                                                |
| E  | Scoring entry-points (`calculateDeterministicScore` + `batchCalculateScores`)                                                    |    72 |     16.1% | public API surface for matching                                                                                                   |
|    | Imports                                                                                                                          |     7 |      1.6% | type imports                                                                                                                       |

The `react-doctor-disable-next-line` directive **line numbers** are unchanged from the audit baseline at `cdafe81` (76, 96, 221, 223) — so the file grew in the regions *around* the lint-significant lines, NOT *into* them. That confirms the suppressions are stable and the candidates below are SAFE (no new suppression concern is opened by the refactor).

### Drift narrative correction (commit `b6a45b2` overflow)

A previous version of this doc claimed growth "concentrated in profile-building + explanation-generation". That claim is **empirically false** at working-tree `5310761`:

- Profile (D) + Explanation (C) combined = **124 LOC ≈ 28% of file**, well below the threshold the previous doc treated as obvious.
- Largest region is **B (helpers)** at 35%, followed by A (constants, 18%), D (profile, 17%), E (scoring entry-points, 16%), C (explanation, 11%).
- Growth was distributed roughly proportional to existing function distribution, **not** concentrated in any single region.

The corrected refactor strategy below reflects the actual measured distribution.

**Re-measure before doing the refactor.** If only select regions grew (e.g. profile-building grew large enough to warrant its own sub-module), the candidates below still apply. If helpers/scoring grew disproportionately, tighten the threshold to **~600 LOC** before opening the PR. **Re-anchor at the new commit hash** so this doc stays accurate.

## Current state (snapshot at commit `5310761`)

| Measurement                                                              | Value      | Drift from audit (`cdafe81`) |
|--------------------------------------------------------------------------|------------|------------------------------|
| `src/utils/matching.ts` LOC                                             | 446        | **+305 (3.15× growth)**      |
| `js-set-map-lookups` suppressions                                       | 4          | unchanged (lines 76, 96, 221, 223 — verbatim per audit)            |
| Module-scope constants                                                   | 5          | (regions A, 82 LOC total)                                                |
| Helper / scoring subroutines                                            | 11         | (regions B, 157 LOC total)                                               |
| Explanation-generation functions                                        | 3          | (region C, 47 LOC total)                                                 |
| Profile-building functions                                              | 1 (`buildProfileFromHistory`) | (region D, 77 LOC total)                                       |
| Scoring entrypoints                                                     | 2 (`calculateDeterministicScore`, `batchCalculateScores`) | (region E, 72 LOC total)                       |
| Public API exports (`buildProfileFromHistory`, `calculateDeterministicScore`, `batchCalculateScores`, `extractSeniorityFromTitle`, `extractSkillsFromDescription`, `calculateSkillsMatch`, `calculateCompensationFit`, `isWorkTypeMatch`) | 8 | unchanged |

Both linters (`habit-hooks`, `react-doctor`) currently report `0` findings on the file. The refactor is **not urgent** today, but the drift does change "what a 5th suppression would mean" — re-read the audit memo's warning before adding any. The "Snapshot staleness" section above is the source of truth for measurement + re-anchoring; do not re-derive from the summary table alone.

## Candidate #1 — extract `buildProfileFromHistory` to `src/utils/matching/profile.ts` (preferred first move)

The profile-building function is a **clean single-responsibility seam** — it consumes `JobApplication[]`, returns a `UserMatchProfile`, and has no callers from `calculateDeterministicScore` (which consumes a pre-built profile as input). Moving it out first leaves `matching.ts` slimmer and creates a clean two-module baseline (`profile.ts` + `scoring.ts`) before tackling the larger scoring extraction.

> **One function moves. ~77 LOC peeled out. No call-site rewiring.** `calculateDeterministicScore` already takes a pre-built `UserMatchProfile`, so the consumer side needs no signature change. Consumers that call `buildProfileFromHistory` directly need only an import-path update.

Mechanics (high level):

1. New file: `src/utils/matching/profile.ts`.
2. Move `buildProfileFromHistory` from `matching.ts` to `profile.ts` verbatim — preserve the body, the signature, and the type imports (`JobApplication`, `InterviewStageType`, `UserMatchProfile`).
3. `profile.ts` imports `POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `extractSeniorityFromTitle`, `extractSkillsFromDescription` from `matching.ts` (or — if the scoring sub-module is already extracted — from the matching `index.ts` barrel).
4. `matching.ts` re-exports `buildProfileFromHistory` from `./matching/profile` so the public API surface is preserved through `matching.ts`. (Optional: drop the re-export and update all call-sites directly. Recommended for the eventual post-#2 cleanup.)
5. Update tests (`src/utils/matching.test.ts`) and any cross-file consumers that import `buildProfileFromHistory` from `matching.ts` — change their import path to `./matching/profile`.

**Why #1 first (not #2):** profile-building is a single function (~77 LOC) with no calls into the scoring surface; it is the cheapest, lowest-risk first move. Extracting scoring helpers (`B`) reshapes call-site surfaces across the whole file because `calculateCompensationFit` → `parseSalaryRange`, `calculateDeterministicScore` → many helpers, etc. Order matters: do **not** open Candidate #2 before Candidate #1 lands.

## Candidate #2 — extract scoring surface to `src/utils/matching/scoring.ts` (after #1)

Once #1 is done and `buildProfileFromHistory` is out of `matching.ts`, extract the scoring surface to `src/utils/matching/scoring.ts`:

- **Helpers** (Region B): `extractSeniorityFromTitle`, `normalizeTitle`, `calculateRoleSimilarity`, `extractSkillsFromDescription`, `calculateSkillsMatch`, `parseSalaryRange`, `calculateCompensationFit`, `isWorkTypeMatch`, `calculateLocationMatch`, `determineConfidence`, `determineVerdict`, plus the derived `SKILL_REGEXES` constant.
- **Explanation** (Region C): `generateExplanation`, `generateStrengths`, `generateGaps`.
- **Entrypoints** (Region E): `calculateDeterministicScore`, `batchCalculateScores`.

Total: ~280 LOC peeled out (~63% of file).

Mechanics:

1. New file: `src/utils/matching/scoring.ts` — exports the helpers (Region B), the explanation-generation trio (Region C), and the scoring entrypoints (Region E). Preserve all signatures verbatim.
2. `matching.ts` re-exports the public scoring API (`calculateDeterministicScore`, `batchCalculateScores`, plus any helpers used cross-region) for compatibility. Drop the re-exports only when all consumers are updated.
3. Cross-region imports: `extractSkillsFromDescription` is consumed by BOTH `profile.ts` (in `buildProfileFromHistory`) AND `scoring.ts` (in `calculateDeterministicScore`). Resolve by re-exporting `extractSkillsFromDescription` from `matching.ts` (or a `matching/index.ts` barrel).
   - **Review-rejectable heuristic**: if a refactor PR moves `profile.ts` to import directly from `./scoring` and bypasses the matching barrel, **reject the PR and require the barrel re-export**. Direct cross-region imports in `profile.ts` (back into `scoring.ts`) invert the dependency-order intent and create a cycle on the matching submodule graph.
4. All 4 existing `js-set-map-lookups` suppressions move WITH the helper functions they live in (or stay in their original line). In either case the rationale + `-- <WHY>` tails stay verbatim — the audit memo's policy is "the suppression travels with the function". Line numbers will change, but the suppression rule ids and rationale tails survive the move.

**After #1 + #2** (before/after projection):

| File                           | Before        | After (cumulative) |
|--------------------------------|---------------|--------------------|
| `src/utils/matching.ts`        | 446 LOC       | **~89 LOC**       |
| `src/utils/matching/profile.ts` |  0 LOC       | +77 LOC            |
| `src/utils/matching/scoring.ts` |  0 LOC       | +280 LOC           |

`matching.ts` retains only the constants block (Region A, ~82 LOC) and thin re-exports. Combined LOC across 3 files ≈ 446 (minor duplication overhead from import / type re-exports ≈ 10 LOC).

## Acceptance criteria

- `npx tsc --noEmit` clean.
- `npm run lint` clean (0 errors, 0 warnings).
- `npx habit-hooks` reports `automated checks passed` (0).
- `npx react-doctor` reports 0 issues (or strictly fewer than before).
- `npm test` continues to pass **815/815** — including all `src/utils/matching.test.ts` assertions (verify each test re-imports from `profile.ts` and/or `scoring.ts`).
- `matching.ts` LOC ≤ 200 (after candidates #1 + #2 — constants + thin re-exports).
- `profile.ts` LOC ≤ 100 (single function).
- `scoring.ts` LOC ≤ 320 (helpers + entrypoints + explanation).
- Public API re-exports from `matching.ts` ARE preserved until all consumers are updated; once the migration is verified, drop the re-exports.
- Cross-region imports (`extractSkillsFromDescription` profile ↔ scoring) resolved with a barrel re-export, NOT by re-declaring the function in either region.
- No `Map` / `Set` introduced for `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, `preferredWorkTypes`, `preferredLocations` — preserve `String.prototype.includes` per audit advice.
- The 4 existing suppressions stay verbatim (rule ids + `-- <WHY>` tails; line numbers will change as the functions move).

## Non-goals

- **Do not** convert `SENIORITY_KEYWORDS` / `COMMON_TECH_SKILLS` / `preferredLocations` to `Map` or `Set` "to optimise". The audit memo explicitly warns this is a perf pitfall at small sizes; converting is premature optim and would weaken the audit's stated rationale.
- **Do not** change the signatures of `calculateDeterministicScore`, `calculateRoleSimilarity`, `extractSeniorityFromTitle`, etc. — `src/components/RecommendationPanel.tsx`, `src/components/MatchScoreBadge.tsx`, `src/types/matching.ts`, and the matching store consume the existing return shapes.
- **Do not** extract the constants block (Region A) into a separate `constants.ts` file as part of these candidates. After #1 + #2 the constants naturally live in `matching.ts` (the orchestration / index layer); a 4th file (`constants.ts`) is overhead for 82 LOC of mostly-data. **Open a fresh follow-on tracker** if `matching.ts` exceeds 200 LOC for any reason other than the constants block.
- **Do not** introduce a `calculateDeterministicScoreV2` shadow API; the audit memos consistently favour retain-and-extract over redesign.
- **Do not** combine all 3 candidates into a single PR. The blast-radius of (profile + scoring + cross-region re-exports) in one PR is too high for review quality. One PR per candidate, in order.
- **Do not** re-write the suppression's `-- <WHY>` tail during the move. The audit memo's policy: "the suppression stays verbatim — the rationale-by-helper-name travels with the function." Update the inventory table in `DOCS/REACT_DOCTOR_AUDIT.md` after the move (the suppression will change file / line).
- **Do not** gratuitously re-flow the helper functions to make the suppression land at a different line position than the audit memo's inventory records. Line drift is acceptable (and expected — the functions move); gratuitous re-flow that preserves behaviour while moving the suppression to a different relative position is not. **If a helper must be re-flowed**, update the audit memo's inventory table in the same PR to reflect the new line number.

## References

- `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" + "Live suppression inventory" — original analysis + audit memo (the 141 LOC anchor + the "5th suppression" trigger).
- `DOCS/HABIT_HOOKS_AUDIT.md` — confirms rules still pass at the snapshot.
- commit **`cdafe81`** — the audit memo pair that established the projected threshold + 141 LOC anchor for `matching.ts`.
- commit **`23ff536`** — second audit memo pair (SettingsPage annex); same publication ethos applies (cross-policy mandate).
- commit **`bd534ec`** — OpportunitiesPage refactor precedent for "extract hook + sub-component + keep behaviour identical".
- commit **`5310761`** — current branch HEAD (`matching.ts` at 446 LOC — measured distribution in "Snapshot staleness" section above). **Re-anchor here on next revision.**
- commit **`b6a45b2`** — the predecessor of this doc that contained the unwarrantably-specific "growth in profile + explanation" narrative; superseded by this revision.

## Estimate (well-informed gut, not engineering-grade)

- Candidate #1: 1 PR, ~3 files touched (profile.ts + matching.ts + matching.test.ts), 1 reviewer iteration expected. Low blast-radius.
- Candidate #2: 1 PR, ~5 files touched (scoring.ts + matching.ts + matching.test.ts + 1–2 consumers), 1–2 reviewer iterations expected. Medium blast-radius.

Both are appropriate for a single afternoon's work IF the trigger fires. **Order matters: do #1 first, do not do #2 before #1.**
