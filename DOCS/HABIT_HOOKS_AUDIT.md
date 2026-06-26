# Habit-Hooks Audit & Override Policy

**Scope:** Project-local overrides for [habit-hooks](https://github.com/
habit-hooks) on the React/TypeScript frontend in `src/`.

## Why this document exists

This project hit non-deterministic behaviour in one habit-hooks rule
on 2026 when refactoring `LandingPage.tsx` (commit `9bdc2ac`): the
`non-essential-comment` rule flagged a `// --- Sub-components ---`
section banner in `LandingPage.tsx` but did **not** flag the identical
banners in `JobPreviewPanel.tsx` and `EmailScanReview.tsx`. We had to
normalise all three proactively (commit `536385f`). That single
incident drove the policy documented below.

## What habit-hooks actually checks in this project

Habit-hooks `v0.2.0` ships with **11** rule slugs. After auditing the
config (`habit-hooks.config.mjs`) and the bundled prompt folder
(`node_modules/habit-hooks/src/prompts/`), the rule set that can
fire on `src/` is:

| Slug                       | Affection                          |
|----------------------------|------------------------------------|
| `deep-nesting`             | Nesting depth > threshold          |
| `duplicated-code`          | jscpd copy-paste detection         |
| `high-complexity`          | Cyclomatic complexity              |
| `needs-extraction`         | Duplication inside large files     |
| `non-essential-comment`    | Decorative / paraphrasing comments |
| `non-null-assertion`       | `!` non-null TS operators          |
| `oversized-file`           | File length > threshold            |
| `oversized-function`       | Function length > threshold        |
| `parse-error`              | Syntax errors                      |
| `too-many-parameters`      | Function arity > threshold         |
| `uncoached`                | Catch-all (no override prompt)     |

## Risk classes in `src/` — categorised by IN/OUT of habit-hooks scope

The grep audit covered every "lint smell" we had in code. Most are
out of habit-hooks's scope, so they can never trigger an override:

| Pattern                            | Count | In habit-hooks scope? |
|------------------------------------|-------|-----------------------|
| `eslint-disable` directives        |     4 | No (eslint rule)      |
| `react-doctor-disable-next-line`   |     7 | No (separate linter)  |
| `console.*` calls                  |    48 | No (separate linter)  |
| `any` type usages                  |     1 | No (TS rule, ESLint)  |
| `@ts-ignore` / `@ts-nocheck`       |     0 | No                    |
| TODO / FIXME / HACK in source      |     0 | No (1 in translation JSON only) |
| Total comments                     |   152 | (`non-essential-comment` only) |

The existing config (`habit-hooks.config.mjs`'s `smells[...].exclude`
list) already exempts **7** legitimate-comment files
(BarChartWidget, InterviewBarChart, StatusBarChart, geminiJobScoring,
matching, scanService, habit-hooks.config.*) from
`non-essential-comment`.

## Existing override prompt

- **`habit-hooks-prompts/non-essential-comment.md`** (commit `8450a94`)
  — directs the agent to (1) delete every `// --- ... ---` banner in
  one commit when triggered on a single instance, and (2) preserve
  `-- <WHY>` rationale trailing any `eslint-disable` /
  `react-doctor-disable` / `ts-ignore` directive.

Wired in via `prompts: './habit-hooks-prompts'` at the top of
`habit-hooks.config.mjs`.

## Decision rationale for oversized-*

A reviewer might reasonably ask: "SettingsPage.tsx is 578 LOC and
`useSettingsManager()` is 302 lines — should we add an `oversized-file`
or `oversized-function` override?" We checked, and the answer is
**no**, for the following reasons:

1. **`npx habit-hooks` reports 0 violations** at the latest commit.
   Neither `oversized-file` nor `oversized-function` fires on either
   target. The rule thresholds are sized such that we'd have to grow
   SettingsPage further before it triggered.
2. **The bundled prompts already encode the right philosophy.** Both
   `oversized-file.md` and `oversized-function.md` (read directly from
   `node_modules/habit-hooks/src/prompts/`) explicitly prefer
   **semantic seams over mechanical line-count splits**, and warn
   against arbitrary 200-line / 12-line thresholds. Our prior
   refactor series (commits `9bdc2ac`, `bd534ec`, `05e3a34`,
   `997c7a0`) extracted along semantic boundaries — hook owns state
   + ops, orchestrator owns rendering — never at line thresholds.
3. **The habit-hooks-prompting skill is REACTIVE, not preemptive.**
   Skill rule: *add a prompt the moment you catch the default
   behaviour being wrong, not pre-emptively for every rule.* The
   bundled defaults are not wrong here. Writing overrides would be
   noise the linter never picks up.

## When to add a new override prompt

Add a new `<slugified-rule-id>.md` under `habit-hooks-prompts/`
**only** when you observe one of:

1. The rule fires and its bundled prompt suggests a fix that is
   shallow, mechanical, or goes against the spirit of the rule for
   this codebase.
2. The rule fires inconsistently (i.e. heuristic shift) and you want
   the agent to apply the fix class-wide in a single commit.
3. The bundled prompt is silent on a project-specific WHY that the
   agent should preserve (e.g. the disable-directive rationale
   pattern).

For each case, the prompt must follow the **ROSE** format
(Risk → Solution → Expected outcome; the linter supplies
Observation) and stay **≤ ~7 lines** (KISS). See the existing
`non-essential-comment.md` for the canonical example.

## Verification snapshot

At commit `997c7a0`:

```
tsc --noEmit      ✅ clean
eslint            ✅ 0 errors, 0 warnings
habit-hooks       ✅ 0 violations (override prompt loaded)
react-doctor      ✅ 0 issues (100/100)
vitest            ✅ 815/815 tests
```

## Related commits

- **`9bdc2ac`** — LandingPage refactor tripped the heuristic; banner
  deleted as part of the commit.
- **`536385f`** — proactive normalisation of the identical banners in
  JobPreviewPanel and EmailScanReview.
- **`8450a94`** — project-local override prompt introduced.
- **`997c7a0`** — OpportunitiesPage `recentCount` duplicate-state
  cleanup (orthogonal; included here because it tightened the
  manager hook, keeping it well under the `oversized-function`
  threshold for the foreseeable future).
