# dev-loop.md

The dev-loop is the **local-dev → pre-push → CI-quality-gate** pipeline
that all `api/` PHP work flows through before landing on `main`. This
doc is the **entry point** for future contributors: it links to the
authoritative sources (the CI workflow, `AGENTS.md`, the habit-hooks
prompts) and documents the local-only pre-push heuristic that has no
CI counterpart.

## Why this doc exists

The CI `quality-gate.yml` workflow (`.github/workflows/quality-gate.yml`)
references "the dev-loop invocation that produced the Phase 3 baseline"
3× in its header comments, but no standalone doc captured the
dev-loop's structure. Future contributors reading the workflow comments
had no single place to look up:

- What the 4 dev-loop commands are and their CI counterparts.
- What the pre-push hook does (no CI counterpart — local + advisory only).
- What "silent-apply defense" means and which incident class it defends
  against.
- Where the Phase 8 follow-up list lives (so future Phase 8.1 work has a
  clear template).

This doc is the answer to all 4.

## The 4 dev-loop commands

Each command runs locally during development. The CI quality-gate
workflow runs the same commands on every push that touches `api/`,
so a local failure is mirrored at CI time.

| # | Local command (from `api/`) | CI counterpart | What it catches |
|---|------------------------------|----------------|-----------------|
| 1 | `vendor/bin/phpstan analyse src/ --memory-limit=512M --no-progress` | `quality-gate.yml` "Run PHPStan (level 5)" | Type errors, missing return types, dead code |
| 2 | `vendor/bin/phpunit --configuration phpunit.xml` | `quality-gate.yml` "Run PHPUnit" | Runtime behavior, factory wiring, mock drift |
| 3 | `vendor/bin/rector process --dry-run --config=rector.php --no-progress-bar --no-ansi --memory-limit=512M` | `quality-gate.yml` "Run Rector dry-run (Phase 8+)" | Typed-closure residue, dead branches, code-style drift |
| 4 | `composer run test:smoke` (the Phase 8 follow-up `test:smoke` script) | (no CI counterpart — local only) | Runtime-safety contracts (e.g. `ModelMapper::updateUser` integer-key contract) |

A push that passes all 4 locally AND the pre-push hook is expected to
pass the CI quality-gate. The CI gate is the **authoritative** check;
the dev-loop is the fast-feedback local mirror.

## The pre-push hook (local + advisory)

The pre-push hook at `.git/hooks/pre-push` is a **warn-only** drift
detector + silent-apply defense. It runs on every `git push` (unless
bypassed with `--no-verify`) and exits 0 unconditionally — it never
blocks the push.

To install: `bash scripts/install-pre-push-hook.sh`

### Layer 1 — working-tree drift detection

Warns when working-tree files differ from HEAD. The drift is
uncommitted local edits or staged-but-not-committed changes that
would not be included in the push. The user can commit, revert, or
`--no-verify` to skip the advisory.

**Failure class defended against:** the
`AgentJobApplicationRepository.php` post-`3eb2f90` typed-closure
drift that landed on remote and was caught only after the push.

### Layer 2 — silent-apply defense (`php -l` on staged .php files)

Warns when any staged `.php` file fails PHP's `php -l` syntax check.
The check is per-file, fast (~10 ms per file), and runs on every
push that has staged .php files.

**Failure class defended against:** the `b4e3ef0` missing-`;`
incident, where a `str_replace` edit silently dropped the trailing
`;` from `api/rector.php`'s `return RectorConfig::configure()...;`
statement. PHPStan re-ran the next day and reported the syntax
error. The `php -l` check would have caught it at pre-push time.

If PHP is not on `PATH` (e.g. frontend-only contributors), the hook
warns and skips the check. The CI quality-gate workflow is the
authoritative layer; the pre-push hook is the local advisory.

## Cross-references

- **`AGENTS.md`** — per-PR version rule, cross-PR version race
  playbook, CI race playbook. The dev-loop fits into the
  contribution workflow as the local pre-push step.
- **`.github/workflows/quality-gate.yml`** — the CI quality-gate
  workflow. Mirrors commands 1-3 of the dev-loop; does NOT run
  command 4 (smoke tests are local-only by design — see
  `composer run test:smoke`).
- **`scripts/install-pre-push-hook.sh`** — tracked installer for
  the pre-push hook. Re-run after cloning the repo to enable the
  local advisory.
- **`scripts/setup-hook.sh`** — pre-commit hook installer
  (existing; runs ESLint + build + tests + secret scan before
  each commit). Complements the pre-push hook: pre-commit gates
  the commit, pre-push gates the push.
- **`habit-hooks.config.mjs`** + **`habit-hooks-prompts/`** — the
  project-local habit-hooks tuning. The `non-essential-comment.md`
  + `react-doctor-suppression-sync.md` prompts follow the ROSE
  format (Risk → Solution → Expected outcome) and document
  project-specific WHY for suppression directives.
- **`DOCS/PHASE_8_FOLLOWUPS.md`** — the Phase 8 follow-up list
  (the rector gate + the 6 follow-ups + the silent-apply defense
  introduced with this PR).
