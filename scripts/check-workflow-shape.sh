#!/bin/bash
# scripts/check-workflow-shape.sh
#
# Pre-merge CI gate that fails fast when a GitHub Actions workflow file is
# missing the required top-level wrapper keys (`name:`, `on:`, `jobs:`).
#
# This gate exists because of the regression observed in the PR #206 squash
# (commit 4d5748a, "chore(release): unify PRs 200+202+203+204 into 2.6.6"):
# `chore/release-up` cherry-picked workflow bodies into deploy.yml but the
# wrapper (`name: Deploy`, `on: push`, `env:`, `jobs:`) was stripped en route,
# and the GitHub Actions compositor rejected the file with:
#   (Line: 1, Col: 3): Required property is missing: jobs
# without anyone noticing until a downstream workflow run attempted to use it.
# This gate would have caught the regression at PR-open time.
#
# Usage:
#   scripts/check-workflow-shape.sh                # local mode; non-zero exit on any failure
#   scripts/check-workflow-shape.sh --ci          # CI mode; emits `::error file=` annotations
#
# Style mirrors `scripts/check-orphans.sh` (rg-based, subcommand-dispatched)
# and `scripts/scan-secrets.sh` (set -euo pipefail + --ci mode flag).

set -euo pipefail

MODE="local"
if [ "${1:-}" = "--ci" ]; then
  MODE="ci"
fi

WORKFLOW_DIR=".github/workflows"

echo "Checking workflow-file wrappers (mode: $MODE)"

EXIT_CODE=0
FAIL_COUNT=0
CHECKED_COUNT=0

# Required: GH Actions schema hard-requirements for every workflow file:
#   name:   - human-readable label (also surfaced in the Actions UI)
#   on:     - trigger (push, pull_request, workflow_call, schedule, ...)
#   jobs:   - the actual job graph (this is what regressed)
#
# Deliberately NOT enforced here:
#   env:        - some reusable-workflow files (composer-validate.yml) omit
#                file-scope env; per-job env is sufficient. Listed as a soft
#                consideration in scripts/check-workflow-shape.sh's CHANGELOG
#                entry but not yet a hard gate.
#   permissions: - reusable-workflow style (composer-validate.yml) declares
#                 `permissions: contents: read`; heritage files (code-audit.yml,
#                 cve-lite.yml) rely on repo defaults. Listed as a soft
#                 consideration in the CHANGELOG entry but not yet a hard gate.
REQUIRED_KEYS=("name" "on" "jobs")

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "::error file=$WORKFLOW_DIR::workflow directory not found" >&2
  exit 1
fi

for file in "$WORKFLOW_DIR"/*.yml; do
  [ -e "$file" ] || continue
  CHECKED_COUNT=$((CHECKED_COUNT + 1))

  for key in "${REQUIRED_KEYS[@]}"; do
    # Regex `^<key>:$` matches the key at column 0 (not indented under another
    # block). Files where the wrapper is missing (only indented job bodies
    # remain) will not match, which is exactly the regression we want to catch.
    if ! grep -qE "^${key}:" "$file"; then
      FAIL_COUNT=$((FAIL_COUNT + 1))
      MSG="Required top-level key missing or indented: \`${key}:\`"
      if [ "$MODE" = "ci" ]; then
        echo "::error file=${file}::${MSG}"
      fi
      echo "  FAIL: $file - $MSG" >&2
      # Continue checking other files/keys so a single run reports the full
      # picture; do NOT exit early. The CI run wants all offenders in one shot
      # so a follow-up PR can address them in a single sweep instead of n.
    fi
  done
done

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "PASS: all $CHECKED_COUNT workflow files have \`name:\`, \`on:\`, and \`jobs:\` at column 0."
  exit 0
fi

echo "FAIL: $FAIL_COUNT missing-wrapper-key instances across $CHECKED_COUNT files." >&2
exit 1
