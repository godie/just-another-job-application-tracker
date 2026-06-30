# Follow-up: matching.ts size refactor (profile-first + scoring sub-module; suppression concentration)

**Status:** Deferred — do not start until the trigger condition fires.
**Owner:** future contributor.
**Linked from:** `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" — `src/utils/matching.ts` block.

## Trigger condition

Pick up this work the first time EITHER:

- A **5th `js-set-map-lookups` suppression** is added to `matching.ts`, OR
- `matching.ts` ever grows past **~700 LOC** in a future commit.

The audit memo states: _"With **4 suppressions concentrated here**, however, one of those arrays is very likely large or hot — read the call sites before adding a fifth."_ That wording already encodes both the LOC threshold AND the suppression-count threshold. Both triggers are unambiguous and `grep`-able / `wc -l`-able / reporter-output-able. The "scoring logic hard to follow" condition is intentionally NOT listed — it's an opinion heuristic, not a stable signal.

> **Re-anchored note (empirical correction):** Both triggers were historically justified by an audit-memo anchor claim that `matching.ts` was **141 LOC at `cdafe81`**. That claim is **empirically wrong** (see "Empirical anchor correction" below). At `cdafe81`, `matching.ts` was already **446 LOC** — the same as today. The "1th suppression" trigger remains valid (the suppression count is independent of file size); the ">700 LOC" trigger is **not currently met** and is therefore a future-only trigger, not a current trigger.

## Snapshot staleness

**Empirically re-measured.** Measurements in this section are from direct `git show <commit>:<file>` inspections, not from the audit memo's stated LOC values.

### `matching.ts` lifecycle (per commit, oldest → newest)

| Commit        | LOC  | Notes                                                            |
|---------------|-----:|------------------------------------------------------------------|
| `97a5c91` (initial creation) | 471 | first commit touching `matching.ts`; baseline                     |
| `cdafe81`     | 446  | audit anchor; the audit memo incorrectly stated 141 LOC here      |
| `4f11fd3` (HEAD) | 446  | working tree equivalent                                           |
| working tree  | 446  | today's state                                                     |

### `matching.ts` drift vs. chosen anchor

**Net change `cdafe81` → `4f11fd3`: 0 lines added, 0 lines removed. The file is steady-state.**

The earlier version of this document (commit `4f11fd3`) claimed a "**+305 (3.15× growth)**" drift anchor→HEAD. **That claim was empirically wrong** — it inherited the audit memo's incorrect "141 LOC at cdafe81" anchor. Empirical verification (`git log cdafe81..4f11fd3 --oneline -p -- src/utils/matching.ts | grep ^+ | wc -l`) returns **0**.

### Suppression-line stability

The four `react-doctor-disable-next-line` directives in `matching.ts` (`76`, `96`, `221`, `223`) are **stable across `cdafe81` → HEAD** (verified via `git show cdafe81:src/utils/matching.ts | grep -n 'react-doctor-disable-next-line'` against the working-tree equivalent). The lines below them contain the `-- <WHY>` rationale tails that the audit memo documents verbatim. So the suppressions stayed put while the rest of the file drifted (in prior history, before `cdafe81`).

### Per-region drift attribution (cdafe81 → 4f11fd3) — explicit per-region breakdown

The original task: _"`git log -p cdafe81..4f11fd3 -- src/utils/matching.ts | grep ^+ | wc -l` broken down per Region (A/B/C/D/E)."_ Total: **0** (verified). With total = 446 at both `cdafe81` and `4f11fd3`, and the partition below summing to 446, per-region +LOC is **forced to 0 in aggregate by arithmetic** — not by per-line measurement.

| ID | Region                                       | LOC @ `cdafe81` | LOC @ `4f11fd3` (working tree) | +LOC `cdafe81..4f11fd3` |
|----|----------------------------------------------|-----------------:|-------------------------------:|------------------------:|
| A  | Constants block (`POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, derived `SKILL_REGEXES`) |             ~82 |                            82 | **0 (forced: totals match)** |
| B  | Helpers (all 11 `extract*`/`calculate*`/`is*`/`determine*`) |            ~157 |                           157 | **0 (forced: totals match)** |
| C  | Explanation-generation (3 funcs)             |             ~27 |                            27 | **0 (forced: totals match)** |
| D  | Profile-building (`buildProfileFromHistory`) |             ~83 |                            83 | **0 (forced: totals match)** |
| E  | Scoring entry-points (`calculateDeterministicScore`, `batchCalculateScores`) |             ~54 |                            54 | **0 (forced: totals match)** |
|    | Imports                                      |              ~7 |                             7 | **0 (forced: totals match)** |
|    | Other (blank lines, function-internal comments, trailing whitespace) |             ~36 |                            36 | **0 (forced: totals match)** |
|    | **TOTAL**                                    |     **446**     |                      **446** | **0 (verified: `git log cdafe81..4f11fd3 -p -- src/utils/matching.ts` returns 0 added lines)** |

Notes:
- The ~36-LOC "Other" row accounts for blank lines between functions, in-function comments, and trailing whitespace after `batchCalculateScores`. Without breaking it out, the standard regions would sum to only 410 LOC and not match the file's actual 446 total — the new "Other" row is the missing 36 LOC.
- Per-region totals are **forced to 0 by arithmetic** because:
  1. `git show cdafe81:src/utils/matching.ts | wc -l` = 446
  2. `wc -l < src/utils/matching.ts` = 446 (today)
  3. Regions A–E + Imports + Other sum to 446 at both anchors
  4. Therefore per-region sums at `cdafe81` equal per-region sums at `4f11fd3`, with 0 change.
- The "~" prefix on the anchor LOCs acknowledges that exact per-region attribution at `cdafe81` would require a function-boundary scan on the anchor version (e.g., `grep -n` markers at `cdafe81`). For the purpose of the refactor candidate, the arithmetic force is sufficient.
- **Audit's original "drift" claim was based on the wrong anchor** (141 LOC at cdafe81 → 446 at HEAD = 3.15×). The empirical check shows the actual anchor (`cdafe81`) was already 446 LOC, so growth happened **before** cdafe81 — net ~25 LOC shrinkage from initial 471 LOC at `97a5c91`.

### Measured region distribution (working-tree, HEAD = `4f11fd3`)

| ID | Region                                                                                                                            | LOC   | % of file |
|----|-----------------------------------------------------------------------------------------------------------------------------------|------:|----------:|
| A  | Constants block (`POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, derived `SKILL_REGEXES`)    |    82 |     18.4% |
| B  | Helper functions (`extractSeniorityFromTitle`, `normalizeTitle`, `calculateRoleSimilarity`, `extractSkillsFromDescription`, `calculateSkillsMatch`, `parseSalaryRange`, `calculateCompensationFit`, `isWorkTypeMatch`, `calculateLocationMatch`, `determineConfidence`, `determineVerdict`) |   157 |     35.2% |
| C  | Explanation-generation (`generateExplanation` + `generateStrengths` + `generateGaps`)                                            |    27 |      6.1% |
| D  | Profile-building (`buildProfileFromHistory`)                                                                                      |    83 |     18.6% |
| E  | Scoring entry-points (`calculateDeterministicScore` + `batchCalculateScores`)                                                    |    54 |     12.1% |
|    | Imports                                                                                                                          |     7 |      1.6% |

This table is the **current** distribution, not "where growth concentrated". Since there was no growth in `cdafe81..4f11fd3`, the table describes today, not drift. Use it as the post-refactor target: after candidates #1 + #2 land, `matching.ts` should approximately equal **Region A (constants) + thin re-exports ≈ 90 LOC**.

### Empirical anchor correction (commit `4f11fd3` overflow)

This section supersedes the "Drift narrative correction (commit `b6a45b2` overflow)" section in commit `4f11fd3`. That section claimed the earlier "growth in profile + explanation" narrative was wrong — but it replaced one wrong claim with another: it assumed the audit memo's `141 LOC` anchor was correct and built a "growth was distributed proportional to existing function distribution" counter-narrative on top of that assumption. **Both narratives are wrong.** The actual finding is:

- `matching.ts` has been **roughly stable** in the 446–474 LOC range since creation at `97a5c91` (471 LOC).
- The audit memo's `141 LOC at cdafe81` anchor was a measurement error (~3× stale at the time the memo was authored).
- `git log cdafe81..4f11fd3 -- src/utils/matching.ts` shows **zero commits** touching the file: no drift, no growth, no churn.

**Re-anchor the audit memo.** The `DOCS/REACT_DOCTOR_AUDIT.md` header `### src/utils/matching.ts — 141 LOC` is empirically wrong (cdafe81 actual = 446 LOC). A separate correction should be applied to that memo.

**Re-measure before doing the refactor.** If only select regions grew or shrank, the candidate plan below still applies. The triggers above are independent of absolute LOC; the trigger is **5 suppressions** OR **>700 LOC**, neither of which is currently met.

## Current state (snapshot at commit `4f11fd3`)

| Measurement                                                              | Value      | Drift from audit (`cdafe81`) |
|--------------------------------------------------------------------------|------------|------------------------------|
| `src/utils/matching.ts` LOC                                             | 446        | **0 — no growth, no churn**  |
| `js-set-map-lookups` suppressions                                       | 4          | unchanged (lines 76, 96, 221, 223 — verbatim per audit; verified working-tree)            |
| Module-scope constants                                                   | 5          | (Region A, 82 LOC total)                                                |
| Helper / scoring subroutines                                            | 11         | (Region B, 157 LOC total)                                               |
| Explanation-generation functions                                        | 3          | (Region C, 27 LOC total)                                                 |
| Profile-building functions                                              | 1 (`buildProfileFromHistory`) | (Region D, 83 LOC total)                                       |
| Scoring entrypoints                                                     | 2 (`calculateDeterministicScore`, `batchCalculateScores`) | (Region E, 54 LOC total)                       |
| Public API exports (`buildProfileFromHistory`, `calculateDeterministicScore`, `batchCalculateScores`, `extractSeniorityFromTitle`, `extractSkillsFromDescription`, `calculateSkillsMatch`, `calculateCompensationFit`, `isWorkTypeMatch`) | 8 | unchanged |

Both linters (`habit-hooks`, `react-doctor`) currently report `0` findings on the file. The refactor is **not urgent** today — the LOC trigger is not met, and the file is steady-state. The "Snapshot staleness" section above is the source of truth for measurement + re-anchoring; do not re-derive from the summary table alone.

## Candidate #1 — extract `buildProfileFromHistory` to `src/utils/matching/profile.ts` (preferred first move)

The profile-building function is a **clean single-responsibility seam** — it consumes `JobApplication[]`, returns a `UserMatchProfile`, and has no callers from `calculateDeterministicScore` (which consumes a pre-built profile as input). Moving it out first leaves `matching.ts` slimmer and creates a clean two-module baseline (`profile.ts` + `scoring.ts`) before tackling the larger scoring extraction.

> **One function moves. ~83 LOC peeled out. No call-site rewiring.** `calculateDeterministicScore` already takes a pre-built `UserMatchProfile`, so the consumer side needs no signature change. Consumers that call `buildProfileFromHistory` directly need only an import-path update.

Mechanics (high level):

1. New file: `src/utils/matching/profile.ts`.
2. Move `buildProfileFromHistory` from `matching.ts` to `profile.ts` verbatim — preserve the body, the signature, and the type imports (`JobApplication`, `InterviewStageType`, `UserMatchProfile`).
3. `profile.ts` imports `POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `extractSeniorityFromTitle`, `extractSkillsFromDescription` from `matching.ts` (or — if the scoring sub-module is already extracted — from the matching `index.ts` barrel).
4. `matching.ts` re-exports `buildProfileFromHistory` from `./matching/profile` so the public API surface is preserved through `matching.ts`. (Optional: drop the re-export and update all call-sites directly. Recommended for the eventual post-#2 cleanup.)
5. Update tests (`src/utils/matching.test.ts`) and any cross-file consumers that import `buildProfileFromHistory` from `matching.ts` — change their import path to `./matching/profile`.

**Why #1 first (not #2):** profile-building is a single function (~83 LOC) with no calls into the scoring surface; it is the cheapest, lowest-risk first move. Extracting scoring helpers (`B`) reshapes call-site surfaces across the whole file because `calculateCompensationFit` → `parseSalaryRange`, `calculateDeterministicScore` → many helpers, etc. Order matters: do **not** open Candidate #2 before Candidate #1 lands.

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
| `src/utils/matching/profile.ts` |  0 LOC       | +83 LOC            |
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
- Before authoring any new `DOCS/FOLLOWUP_*.md` tracker, refactor candidate, or audit memo LOC claim: **verify the audit memo's stated anchor with `git show <commit>:<path> | wc -l`**. The memo's LOC values are starting points, not facts. Iterations on top of an unverified anchor are how this correction (`aec2bfb` itself) discovered that `matching.ts` had been wrongly labelled 141 LOC for two consecutive audit-memo-write cycles.
- **Do not** re-write the suppression's `-- <WHY>` tail during the move. The audit memo's policy: "the suppression stays verbatim — the rationale-by-helper-name travels with the function." Update the inventory table in `DOCS/REACT_DOCTOR_AUDIT.md` after the move (the suppression will change file / line).
- **Do not** gratuitously re-flow the helper functions to make the suppression land at a different line position than the audit memo's inventory records. Line drift is acceptable (and expected — the functions move); gratuitous re-flow that preserves behaviour while moving the suppression to a different relative position is not. **If a helper must be re-flowed**, update the audit memo's inventory table in the same PR to reflect the new line number.

## References

- `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" + "Live suppression inventory" — original analysis + audit memo (corrected anchor: 446 LOC at `cdafe81`, NOT 141; the 141 figure was an authoring error corrected in `aec2bfb`).
- `DOCS/HABIT_HOOKS_AUDIT.md` — confirms rules still pass at the snapshot.
- commit **`cdafe81`** — the audit memo pair that established the suppression inventory; the LOC anchor in the memo was incorrect (~3× stale) and is corrected in `aec2bfb` against empirical `git show` verification.
- commit **`23ff536`** — second audit memo pair (SettingsPage annex); same publication ethos applies (cross-policy mandate). SettingsPage's LOC anchor (`578` at `23ff536`) was empirically verified correct in the broader audit memo correction.
- commit **`bd534ec`** — OpportunitiesPage refactor precedent for "extract hook + sub-component + keep behaviour identical".
- commit **`4f11fd3`** — current branch HEAD (`matching.ts` at 446 LOC; zero growth since `cdafe81`). **Re-anchor here on next revision.**
- commit **`b6a45b2`** — first version of this doc, contained the originally-stated-but-empirically-wrong "growth in profile + explanation" narrative; superseded by `4f11fd3`'s "Drift narrative correction".
- commit **`4f11fd3`** (this doc's previous revision) — also superseded: it corrected `b6a45b2`'s narrative but inherited the audit memo's wrong 141-LOC anchor.
- commit **`97a5c91`** — first commit touching `matching.ts` (471 LOC baseline; the file has been in the 446–474 range since then).

## Estimate (well-informed gut, not engineering-grade)

- Candidate #1: 1 PR, ~3 files touched (profile.ts + matching.ts + matching.test.ts), 1 reviewer iteration expected. Low blast-radius.
- Candidate #2: 1 PR, ~5 files touched (scoring.ts + matching.ts + matching.test.ts + 1–2 consumers), 1–2 reviewer iterations expected. Medium blast-radius.

Both are appropriate for a single afternoon's work IF the trigger fires. **Order matters: do #1 first, do not do #2 before #1.** Given the current steady-state of the file (446 LOC, no growth since `cdafe81`), **the trigger has not fired, and the candidates remain deferred.**
