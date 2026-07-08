#!/bin/bash
#
# Setup script for Git pre-push hook
# This script installs the pre-push hook that runs drift detection +
# silent-apply defense (php -l on staged .php files) before each push.
#
# Mirrors the pre-commit hook installer (setup-hook.sh) but for the
# pre-push event. The pre-push hook is local + advisory, not blocking.
# It does NOT replace any CI gate; CI is the authoritative layer.
#
# See dev-loop.md for the full dev-loop workflow and the relationship
# between the pre-push hook, the pre-commit hook, and the CI quality-gate.
# See DOCS/PHASE_8_FOLLOWUPS.md for the silent-apply defense rationale
# (defends against the b4e3ef0 missing-`;` incident class).
#
SECONDS=0
set -e

echo "🔧 Setting up Git pre-push hook..."

# Get the directory where this script is located, then resolve the
# project root (one level up from scripts/).
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
HOOK_DIR="$PROJECT_DIR/.git/hooks"
HOOK_FILE="$HOOK_DIR/pre-push"

# Check if .git directory exists
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "❌ Error: .git directory not found at $PROJECT_DIR. Are you in a Git repository?"
  exit 1
fi

# Create hooks directory if it doesn't exist
if [ ! -d "$HOOK_DIR" ]; then
  echo "📁 Creating .git/hooks directory..."
  mkdir -p "$HOOK_DIR"
fi

# Create the pre-push hook.
#
# Layer 1 — working-tree drift detector (warn-only): catches the
# AgentJobApplicationRepository.php post-3eb2f90 typed-closure drift
# pattern (silent drift that lands on remote via a future correction
# commit, caught only after the push).
#
# Layer 2 — silent-apply defense (php -l on staged .php files):
# catches the b4e3ef0 incident class (a str_replace edit silently
# dropped the trailing ';' from api/rector.php's return statement;
# the missing ';' was caught only after PHPStan re-ran the next day).
cat > "$HOOK_FILE" << 'HOOK_EOF'
#!/usr/bin/env bash
#
# .git/hooks/pre-push — defensive working-tree drift detector +
# silent-apply defense (PHP syntax check on staged .php files).
#
# Mirrors the fail-fast philosophy of the CI race playbook gates
# (scripts/check-yml-timeouts.sh --ci, scripts/check-yml-concurrency.sh --ci,
# scripts/check-workflow-shape.sh --ci) but is LOCAL + ADVISORY rather than
# CI-blocking.
#
# Layer 1 — working-tree drift detection:
#   Warns (does NOT block) when working-tree files show as ' M '
#   before `git push`, encouraging the user to either commit or revert
#   intentionally rather than have silent drift land on remote via a
#   future correction commit (the exact pattern that produced the
#   AgentJobApplicationRepository.php post-3eb2f90 typed-closure drift
#   caught only after the push).
#
# Layer 2 — silent-apply defense (php -l on staged .php files):
#   Warns (does NOT block) when staged .php files fail PHP's syntax
#   check. This is the direct defense for the b4e3ef0 incident class:
#   a str_replace edit silently dropped the trailing ';' from
#   api/rector.php's `return RectorConfig::configure()...;` statement.
#   PHPStan re-ran the next day and reported the syntax error. The
#   `php -l` check would have caught it at pre-push time.
#
# Behavior:
#   - Drains git's pre-push stdin ("<remote> <url>" lines).
#   - Detects working-tree modifications via `git diff --name-only HEAD`,
#     which catches both staged-and-not-yet-committed (index vs HEAD) and
#     dirty working-tree (worktree vs index) deltas.
#   - Detects staged .php files via
#     `git diff --cached --name-only --diff-filter=ACM`.
#   - Runs `php -l` on each staged .php file.
#   - If any modified paths exist OR any staged .php file fails syntax
#     check, prints a warning to stderr. Push proceeds normally — git
#     sends only committed revisions regardless, so this is a soft
#     signal about pinned-vs-resolved state, not a real blocker.
#   - Exit 0 always. Use `git push --no-verify` to bypass (escape hatch).
#
# Recovery from drift / silent-apply:
#   - 'git add <files> && git commit' to land them deliberately
#   - 'git checkout HEAD -- <files>' to revert and ignore
#   - 'php -l <file>' to inspect a specific .php file
#   - 'git push --no-verify' to skip the advisory
#

set -euo pipefail

# Drain git's pre-push stdin ("<remote> <url>" lines, one per ref). Tolerate
# empty stdin if the hook is invoked directly from a non-git context (e.g.
# for `bash .git/hooks/pre-push </dev/null` smoke tests).
if [ ! -t 0 ] && [ -r /dev/stdin ]; then
  while read -r _remote _url; do : ; done
fi

# Initial repo (no HEAD yet) has nothing to drift from. Skip the check.
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  exit 0
fi

# Layer 1 — working-tree drift detection.
# `git diff --name-only HEAD` covers BOTH:
#   - M in column 2 (worktree vs index) — uncommitted local edits
#   - M in column 1 (index vs HEAD)   — staged but not committed
# which is exactly the "should be on remote but isn't yet" surface area
# the user wants to be reminded about.
modified=$(git diff --name-only HEAD 2>/dev/null || true)

if [ -n "$modified" ]; then
  cat >&2 <<WARN1
[pre-push] ⚠️ Working-tree drift detected (working-tree vs HEAD):

$modified

These files are NOT in any future push — git push only sends committed
revisions. Either commit them deliberately, revert with 'git checkout HEAD
-- <files>', or skip this advisory with 'git push --no-verify'.
WARN1
fi

# Layer 2 — silent-apply defense (php -l on staged .php files).
# `git diff --cached --name-only --diff-filter=ACM` returns the set of
# files that are added (A), copied (C), or modified (M) in the index
# relative to HEAD. The `--diff-filter=ACM` excludes deleted files (D)
# which have nothing to lint. The fallback `|| true` ensures the hook
# exits cleanly on empty diffs.
staged_php=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep '\.php$' || true)

if [ -n "$staged_php" ]; then
  # `command -v php` precheck: warn and skip the check if PHP isn't on
  # PATH. Avoids the cryptic "php: command not found" failure mode for
  # contributors who don't have a local PHP install (e.g. frontend-only
  # contributors). The CI quality-gate workflow is the authoritative
  # layer; the pre-push hook is the local advisory.
  if ! command -v php >/dev/null 2>&1; then
    cat >&2 <<WARN_PHP_MISSING
[pre-push] ⚠️ Silent-apply defense: 'php' not found on PATH; skipping the
syntax check. Install PHP 8.4+ (per the api/composer.json 'php: ^8.4.1'
constraint) to enable the local advisory. The CI quality-gate workflow
is the authoritative layer.
WARN_PHP_MISSING
  else
    php_lint_errors=0
    php_lint_files=""
    for f in $staged_php; do
      # Skip files that don't exist in the working tree (e.g. deleted
      # via a later amend — caught by `git diff --cached` semantics but
      # the file itself is gone). `test -f` filters them out.
      if [ ! -f "$f" ]; then
        continue
      fi
      # `php -l` exits 0 on parse-clean files, non-zero on syntax
      # errors. We only need the exit code; the lint output goes to
      # stderr (preserved for the user below) and stdout is suppressed.
      if ! php -l "$f" >/dev/null 2>&1; then
        php_lint_errors=$((php_lint_errors + 1))
        php_lint_files="$php_lint_files $f"
      fi
    done

    if [ $php_lint_errors -gt 0 ]; then
      cat >&2 <<WARN2
[pre-push] ⚠️ Silent-apply defense: $php_lint_errors staged .php file(s) have syntax errors:
$php_lint_files

The b4e3ef0 commit dropped a trailing ';' from api/rector.php's
'return RectorConfig::configure()...;' statement — a str_replace
silently dropped the terminator, and PHPStan caught the syntax error
the next day. The 'php -l' check would have caught it at pre-push time.

Run 'php -l <file>' to inspect each file. Fix the syntax errors,
amend the commit (or commit a follow-up), and re-run the pre-push hook.
WARN2
    fi
  fi
fi

# Warn-only. Exit 0 lets the push proceed.
exit 0
HOOK_EOF

# Make the hook executable
chmod +x "$HOOK_FILE"

echo "✅ Pre-push hook installed successfully!"
echo ""
echo "📝 The hook will now run the following before each push:"
echo "   1. Working-tree drift detection (warns on uncommitted drift)"
echo "   2. Silent-apply defense (php -l on staged .php files)"
echo ""
echo "💡 To bypass the hook (not recommended), use: git push --no-verify"
echo ""
echo "📖 See dev-loop.md for the full dev-loop workflow + how the hook"
echo "   fits into the local-dev → CI-quality-gate pipeline."
echo ""

seconds=$SECONDS
ELAPSED="Elapsed: $(($seconds / 3600))hrs $((($seconds / 60) % 60))min $(($seconds % 60))sec"

echo "✅ Hook setup completed in $ELAPSED!"
echo "🚀 Pre-push hook enabled (advisory only -- the CI quality-gate remains authoritative)."
