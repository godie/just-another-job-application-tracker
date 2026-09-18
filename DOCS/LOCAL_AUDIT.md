# Local audit

Aikido's rule list, reproduced locally with free tools. Read this before adding
a linter rule, and read the ratchet policy before touching a baseline.

## Why this exists

Aikido is a hosted scanner with a paid tier; the rules it advertises are mostly
patterns the OSS toolchain already implements. This directory documents which
rule is covered by which tool, plus the two hand-written gates that fill the
gaps. Aikido stays as a read-only cross-check, not as a gate.

## How to run it

| Command | Covers |
| --- | --- |
| `npm run lint` | ESLint (base + the audit plugins below) |
| `npm run audit:dupes` | jscpd + the duplication gate |
| `npm run knip` | dead code, unused exports and dependencies |
| `npm run doctor` | react-doctor (React correctness/complexity) |
| `npm run scan:secrets` | secrets (also TruffleHog in CI) |
| `shellcheck -S warning scripts/*.sh` | shell scripts |
| `cd api && vendor/bin/phpstan analyse src/ --memory-limit=512M --no-progress` | PHP static analysis (level 6) |

Pending (see the roadmap at the bottom): semgrep, `actionlint`, `phpcs`,
`composer audit`/`osv-scanner`, Psalm taint analysis, the repo-local scripts and
the TypeSafe advisory pass.

## Ratchet policy (the part that matters)

Every rule here started at zero-or-baselined and only ratchets **down**:

- **`eslint-suppressions.json`** — ESLint bulk suppressions. 239 findings were
  baselined when the audit plugins landed (v2.14.1); a new violation of the same
  rule in the same file is still reported, because the file stores the
  suppressed *count* per file and rule, not line ranges. Never run
  `--suppress-all` to make a PR pass; lower the count when you clean something.
- **`audit/check-dupes.cjs`** — duplication baseline (53 clones / 590 lines /
  1.53%). Lower the numbers in that file when you clean duplication. Never raise
  them.
- **`react-doctor`** and **`cve-lite`** follow the same pattern: clean baseline,
  then any regression fails.

## ESLint audit plugins

| Plugin | Rules kept | Why |
| --- | --- | --- |
| `eslint-plugin-regexp` | recommended minus `prefer-w` and `use-ignore-case` (style) | slow-regex / ReDoS, plus regex correctness. 140 findings baselined, 62 of them `no-super-linear-backtracking` on the email classifiers — worth a burn-down |
| `eslint-plugin-security` | recommended minus `detect-object-injection` and `detect-unsafe-regex` | fs/regexp/child-process injection. `detect-object-injection` fired on every `obj[key]` (116 hits, all deliberate); ReDoS is covered with fewer false positives by `eslint-plugin-regexp` |
| `eslint-plugin-sonarjs` | curated: `cognitive-complexity`, `no-nested-conditional`, `no-identical-functions`, `no-all-duplicated-branches`, `no-dead-store`, `no-redundant-assignments`, `todo-tag`, `no-clear-text-protocols`, `pseudo-random`, `no-nested-template-literals`, `no-nested-functions` | the complexity/duplication/security slice. Its regex rules duplicate `eslint-plugin-regexp`; its assertion-style rules are test style, not defects |
| ~~`eslint-plugin-unicorn`~~ | **not used** | 1808 findings, and three of its top rules contradict this repo's conventions: `filename-case` (281) wants kebab-case files while AGENTS.md mandates PascalCase components, `prevent-abbreviations` (504) and `no-null` (436) are opinions, not defects |
| `jscpd` | `.jscpd.json` (threshold 30) | obvious duplication. Docs, workflow boilerplate, PHP test fixtures and migrations are excluded: their duplication is deliberate |

## Aikido rule → coverage

**Covered today:**

| Aikido rule | Where |
| --- | --- |
| Guard against slow regular expressions | `eslint-plugin-regexp` (`no-super-linear-backtracking`) |
| Eliminate obvious within-file duplication | `jscpd` + `audit/check-dupes.cjs` |
| Remove lingering TODO/FIXME | `sonarjs/todo-tag` |
| Remove unreachable dead code | `knip`, `no-unreachable`, PHPStan, `sonarjs/no-dead-store` |
| Handle errors in catch blocks | `no-empty` (blocks with a comment are not empty) |
| Don't place assignments inside conditionals | `no-cond-assign` |
| Keep functions concise / avoid deep nesting | `sonarjs/cognitive-complexity` (the metric rules are P1 leftovers, see roadmap) |
| Avoid dynamic `debugger` / leftover debug statements | `no-debugger` (`no-console` is not enabled yet — P1 leftover) |
| Handle nullable values safely | TypeScript `strict` + PHPStan level 6 (PHPStan 8 is the PHP half) |
| Don't log sensitive data | pending (P2 semgrep) |
| Detect potentially malicious code patterns | partially: `sonarjs/no-clear-text-protocols`, `sonarjs/pseudo-random` |
| Detect potential injection vulnerabilities | partially: `security/detect-non-literal-fs-filename`, `detect-non-literal-regexp`, `detect-possible-timing-attacks` (PHP injection needs Psalm taint, P2) |

**Covered by the repo's existing gates:** secrets (TruffleHog +
`scripts/scan-secrets.sh`), dependency CVEs (cve-lite; composer pending), unused
code (`knip`), React correctness (`react-doctor`), workflow
shape/timeouts/concurrency (`scripts/check-*.sh`), version orphans
(`scripts/check-orphans.sh`).

**Genuinely not reproducible locally** (Aikido's hosted value): triage UI,
third-party rule updates, SCA reachability analysis, live secret validation,
auto-fix PRs, malicious-package intelligence, and cross-repo deduplication.
About 80% of Aikido's practical value is triage, not rules — that stays manual.

**Not applicable to this repository:** segmentation faults (no C/C++), Unity hot
paths (no C#), Java/C# locks, Python/Java thread safety, `goto`, the Haskell/perl
injection rules — the repo is TypeScript, PHP, shell, YAML and Markdown.

**Waived with evidence:** "functions without explanatory comments" conflicts with
AGENTS.md ("DO NOT ADD ANY COMMENTS unless asked").

## Roadmap

1. **P2 — semgrep**: `p/security-audit`, `p/owasp-top-ten` plus
   `audit/semgrep/*.yml` for locks without `finally`, recursion without a depth
   cap, `$$var`, `array_filter` without `array_values`, nested `break`,
   commented-out code and hashing. Plus Psalm taint analysis for PHP.
2. **P3 — repo-local scripts** (same shape as the existing `scripts/check-*.sh`):
   class-name vs filename, one class per file, redundant DB indexes in the phinx
   migrations, API contract diff against `main`, malicious `SKILL.md` scanner.
3. **P4 — TypeSafe `jev-latest` advisory** on the PR diff for the rules only a
   model can judge (contradictory logic, malicious intent, SRP,
   changes-focused, comment quality). Advisory only, never a security gate.
