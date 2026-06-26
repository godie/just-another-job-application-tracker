# Follow-up: matching.ts size refactor (constants/scoring sub-modules; suppression concentration)

**Status:** Deferred — do not start until the trigger condition fires.
**Owner:** future contributor.
**Linked from:** `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" — `src/utils/matching.ts` block.

## Trigger condition

Pick up this work the first time EITHER:

- `src/utils/matching.ts` grows past **~700 LOC**, OR
- A **5th `js-set-map-lookups` suppression** is added to `matching.ts`.

The audit memo states: _"With **4 suppressions concentrated here**, however, one of those arrays is very likely large or hot — read the call sites before adding a fifth."_ That wording already encodes both the LOC threshold AND the suppression-count threshold. Both triggers are unambiguous and `wc -l`-able / grep-able. The "scoring logic hard to follow" condition is intentionally NOT listed — it's an opinion heuristic, not a stable signal.

## Snapshot staleness

The audit memo anchors the matching.ts size at `cdafe81` = **141 LOC**. Working tree at current HEAD (`5310761`) is **446 LOC** — a **3.15× drift**, the largest among the projected refactor candidates. The 4 `react-doctor-disable-next-line` directives themselves are still at the same line numbers per the audit (76, 96, 221, 223), so the file grew in **profile-building + explanation-generation + scoring subroutines**, NOT in the lint-significant regions.

**Re-measure before doing the refactor.** If only the profile/explanation blocks grew, the candidates below still apply unchanged. If the scoring region grew proportionally, tighten the threshold to **~600 LOC**. **Re-anchor at the new commit hash** so this doc stays accurate.

## Current state (snapshot at commit `5310761`)

| Measurement                                             | Value      | Drift from audit (`cdafe81`) |
|--------------------------------------------------------|------------|------------------------------|
| `src/utils/matching.ts` LOC                            | 446        | **+305 (3.15× growth)**      |
| `js-set-map-lookups` suppressions                      | 4          | unchanged (lines 76, 96, 221, 223 — verbatim per audit) |
| Module-scope constants in `matching.ts`                 | 5 (`POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, `SKILL_REGEXES`) | already at module scope |
| Sub-routine families                                    | 5 (seniority / role-similarity / skills / compensation / location+work-type) | mostly unchanged but the **profile-building** function and **explanation-generation** have grown |
| Public API exports (`buildProfileFromHistory`, `calculateDeterministicScore`, `batchCalculateScores`, `extractSeniorityFromTitle`, `extractSkillsFromDescription`, `calculateSkillsMatch`, `calculateCompensationFit`, `isWorkTypeMatch`) | 8 | unchanged |

Both linters (`habit-hooks`, `react-doctor`) currently report `0` findings on the file. The refactor is **not urgent** today, but the drift does change "what a 5th suppression would mean" — re-read the audit memo's warning before adding any. The "Snapshot staleness" section above is the source of truth for measurement + re-anchoring; do not re-derive from this snapshot table alone.

## Candidate #1 — extract module-scope constants (preferred first move)

Move the constants block (`POSITIVE_SIGNALS`, `NEGATIVE_SIGNALS`, `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, plus the `SKILL_REGEXES` array derived from `COMMON_TECH_SKILLS`) into a **NEW** sub-module `src/utils/matching/constants.ts`. Co-locate any re-exports of these constants back to public consumers.

> **IMPORTANT — pure data extraction, NOT a suppression removal.** No behaviour change. No new exports at the runtime API. The five constants are ALREADY at module scope — this only gives them their own file so `matching.ts` shrinks.
>
> **Do NOT convert `SENIORITY_KEYWORDS` / `COMMON_TECH_SKILLS` / preferredLocations to `Map` / `Set`** "to optimise". The audit memo explicitly warns: _"`String.prototype.includes` on `T[]` is faster than `new Set(arr) + .has()` for small arrays in V8 — converting too early is a real perf pitfall, so don't pre-optimise. The right trigger is size or hotness, not suppression count alone."_ The 4 existing suppressions stay verbatim — they were never the optimisation lever.

Mechanics (high level):

1. New file: `src/utils/matching/constants.ts` — pure data + the `SKILL_REGEXES` derivation done once at module-load.
2. `matching.ts` imports the five constants from `./matching/constants` and re-exports them as before (preserves any public-API consumer; check `src/utils/matching/*` consumers + `src/utils/matching.test.ts` imports first).
3. Update tests (`src/utils/matching.test.ts`) and any cross-file consumers (e.g. `src/utils/manualScan.ts`, `src/utils/applications.ts`) to import from the new path if their tests assert on constants directly. **Do not rename the constant identifiers.**

**Why #1 first (not #2):** pure data extraction does NOT change the scoring algorithm — minimum risk, removes the constants block (~120 LOC) and the regex-generation loop from the top of `matching.ts`, and concentrates the data definitions where they're easier to audit. The scoring sub-module move (Candidate #2) reshapes call-site surfaces and is higher blast-radius.

## Candidate #2 — extract scoring sub-module (after #1)

Once #1 is done and the constants block is gone, extract the scoring surface into `src/utils/matching/scoring.ts`:

- `calculateRoleSimilarity`, `calculateSkillsMatch`, `calculateLocationMatch`, `calculateCompensationFit`, `isWorkTypeMatch`, `calculateDeterministicScore` (orchestration entry), `batchCalculateScores`.
- Helpers only used by scoring: `normalizeTitle`, `parseSalaryRange`, `determineConfidence`, `determineVerdict`, `generateExplanation`, `generateStrengths`, `generateGaps`.
- Type imports shared with `src/types/matching.ts` (verbatim re-exports are fine if consumers rely on them).

Mechanics: peel ~250 LOC out of `matching.ts`. Touch points: `calculateDeterministicScore` is the public API; `batchCalculateScores` calls it 1-to-N. Tests in `src/utils/matching.test.ts` import these as the public surface — re-anchor imports to `./matching/scoring`.

This move shrinks `matching.ts` to roughly `buildProfileFromHistory` + re-exports (~120 LOC). Beyond that, further split is not advised (see Non-goals).

## Acceptance criteria

- `npx tsc --noEmit` clean.
- `npm run lint` clean (0 errors, 0 warnings).
- `npx habit-hooks` reports `automated checks passed` (0).
- `npx react-doctor` reports 0 issues (or strictly fewer than before).
- `npm test` continues to pass **815/815** — including all `src/utils/matching.test.ts` assertions (verify each test re-imports from the new module paths).
- `matching.ts` LOC ≤ 250 (after candidates #1 + #2).
- `matching.ts` ends as a thin orchestration layer: imports constants from `./matching/constants`, imports scoring from `./matching/scoring`, exports only the public-API functions (`buildProfileFromHistory`, `calculateDeterministicScore`, `batchCalculateScores`, …).
- Constant-extraction re-exports preserve the existing public API — search consumers (`src/utils/matching.test.ts`, any `src/utils/<X>.ts` that pulls from `matching.ts`) before the move.
- No `Map` / `Set` introduced for `SENIORITY_KEYWORDS`, `COMMON_TECH_SKILLS`, `preferredWorkTypes`, `preferredLocations` — preserve `String.prototype.includes` per audit advice.
- The 4 existing suppressions stay verbatim (line numbers + `-- <WHY>` tails) — they are the audit memo's documented INTENDED behaviour, not lint debt.

## Non-goals

- **Do not** convert `SENIORITY_KEYWORDS` / `COMMON_TECH_SKILLS` / `preferredLocations` to `Map` or `Set` "to optimise". The audit memo explicitly warns this is a perf pitfall at small sizes; converting is premature optim, would weaken the audit's stated rationale.
- **Do not** change the signatures of `calculateDeterministicScore`, `calculateRoleSimilarity`, `extractSeniorityFromTitle`, etc. — `src/components/RecommendationPanel.tsx`, `src/components/MatchScoreBadge.tsx`, `src/types/matching.ts`, and the matching store consume the existing return shapes.
- **Do not** extract `buildProfileFromHistory` into its own file in the same PR. It is the LAST `matching.ts`-resident concern after Candidates #1 + #2 strip constants + scoring out. Splitting it further would orphan the build-profile path with no clear sibling.
- **Do not** introduce a `calculateDeterministicScoreV2` shadow API; the audit memos consistently favour retain-and-extract over redesign.

## References

- `DOCS/REACT_DOCTOR_AUDIT.md` § "Projected next refactor candidates" + "Live suppression inventory" — original analysis + audit memo (the 141 LOC anchor + the "5th suppression" trigger).
- `DOCS/HABIT_HOOKS_AUDIT.md` — confirms rules still pass at the snapshot.
- commit **`cdafe81`** — the audit memo pair that established the projected threshold + 141 LOC anchor for `matching.ts`.
- commit **`23ff536`** — second audit memo pair (SettingsPage annex); same publication ethos applies (cross-policy mandate).
- commit **`bd534ec`** — OpportunitiesPage refactor precedent for "extract hook + sub-component + keep behaviour identical".
- commit **`5310761`** — current branch HEAD (`matching.ts` at 446 LOC — drift noted above). **Re-anchor here on next revision.**

## Estimate (well-informed gut, not engineering-grade)

- Candidate #1: 1 PR, ~3 files touched (constants.ts + matching.ts + matching.test.ts), 1 reviewer iteration expected. Low blast-radius.
- Candidate #2: 1 PR, ~5 files touched (scoring.ts + matching.ts + matching.test.ts + 1-2 consumers), 1-2 reviewer iterations expected. Medium blast-radius.

Both are appropriate for a single afternoon's work IF the trigger fires. **Order matters: do #1 first, do not do #2 before #1.**
