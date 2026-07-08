#!/bin/bash
# scripts/check-yml-timeouts.sh
#
# Pre-merge CI gate that fails fast when any job in any
# `.github/workflows/*.yml` is missing a `timeout-minutes:` cap.
#
# This gate exists because of the recurring "Test pending forever" CI race
# in the post-2.6.20 cycle: when a runner queue stalls, a job OOMs, or a
# process (like Vitest) hangs, the job never reports a final state. Without
# an explicit `timeout-minutes:`, it sits at `pending` up to GitHub's
# default 6-hour limit. Because checks like `Test` and `Secret Scan` are
# required, the PR gets permanently blocked. The historical response was
# `--admin --squash --delete-branch`, which is exactly what this gate is
# designed to prevent structurally — see AGENTS.md "CI Race Playbook" for
# the design rationale and the post-mortem on the 7 `--admin` bypasses in
# PRs #226, #227, #228, #229, #230, #231, #232.
#
# Usage:
#   scripts/check-yml-timeouts.sh            # local mode; non-zero exit on any failure
#   scripts/check-yml-timeouts.sh --ci       # CI mode; emits `::error file=` annotations
#
# Style mirrors `scripts/check-workflow-shape.sh` (bash, --ci mode flag,
# ::error file= annotations, set -euo pipefail) and `scripts/check-orphans.sh`
# (rg-based, subcommand-dispatched).

set -euo pipefail

MODE="local"
if [ "${1:-}" = "--ci" ]; then
  MODE="ci"
fi

WORKFLOW_DIR=".github/workflows"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "::error file=$WORKFLOW_DIR::workflow directory not found" >&2
  exit 1
fi

echo "Checking workflow job timeout-minutes (mode: $MODE)"

# Delegate the YAML parsing to Python. The parser tracks the current job
# context (under `jobs:`) and checks that each job has a `timeout-minutes:`
# key in its 4-space-indented body.
#
# Why Python here and not pure-bash/grep:
#   - We need to know which job a `timeout-minutes:` line belongs to
#     (jobs are siblings at 2-space indent, body keys at 4-space indent).
#   - We need to detect when a `jobs:` block ends (a non-indented line that
#     isn't `jobs:` itself means we've left the block — important for
#     reusable-workflow files that have BOTH a top-level `jobs:` AND
#     in-body workflow definitions).
#   - YAML parsing in bash is fragile; Python is universally available on
#     `ubuntu-latest` runners and keeps the parser self-contained.
python3 - "$WORKFLOW_DIR" "$MODE" <<'PYEOF'
import re
import sys
import os
import glob

workflow_dir = sys.argv[1]
mode = sys.argv[2]

# Job names live at 2-space indent under `jobs:`, and look like `  jobname:`
# (no inline value, no inline comment after the colon). The `(?:  |\t)`
# non-capturing group allows either 2-space or single-tab indent — both are
# legal YAML at the same logical level. All current workflow files in this
# repo use 2-space indent, but the parser is defensive against accidental
# tab-indented YAML (which would otherwise silently miss jobs).
JOB_NAME_RE = re.compile(r'^(?:  |\t)([a-zA-Z0-9_-]+):\s*(#.*)?$')
# `timeout-minutes:` lives at 4-space indent under a job (or 2 tabs), with
# a positive integer value. The trailing \s*$ (with optional trailing #
# comment) keeps `    timeout-minutes: 5  # why 15? we don't` from being
# misread.
TIMEOUT_RE = re.compile(r'^(?:    |\t\t)timeout-minutes:\s*([0-9]+)\s*(#.*)?$')

missing = []  # list of (file, jobname)
checked = 0

for path in sorted(
    glob.glob(os.path.join(workflow_dir, '*.yml'))
    + glob.glob(os.path.join(workflow_dir, '*.yaml'))
):
    if not os.path.isfile(path):
        continue
    checked += 1
    with open(path) as f:
        lines = f.readlines()

    in_jobs = False
    current_job = None
    has_timeout = False
    # GitHub Actions strictly forbids `timeout-minutes:` on jobs that
    # `uses:` a reusable workflow (GHA rejects the file with "Unexpected
    # value 'timeout-minutes'"), so those caller jobs are exempt from the
    # timeout-minutes check by design. The actual cap is enforced inside
    # the called workflow's own jobs.
    is_caller_job = False

    # `uses:` lives at 4-space indent under a job (or 2 tabs). Same indent
    # level as `timeout-minutes:`, but the value is a workflow path or a
    # reusable action — we only care whether the key is present.
    USES_RE = re.compile(r'^(?:    |\t\t)uses:\s*(.+?)\s*(#.*)?$')

    for line in lines:
        stripped = line.rstrip('\n')

        # Detect top-level `jobs:` block start.
        if stripped == 'jobs:':
            in_jobs = True
            current_job = None
            has_timeout = False
            is_caller_job = False
            continue

        # If we hit a non-indented, non-empty, non-comment line while inside
        # a `jobs:` block, we've left the block. Finalize the last job.
        if (
            in_jobs
            and stripped
            and not line.startswith(' ')
            and not line.startswith('\t')
            and not line.startswith('#')
        ):
            if current_job and not has_timeout and not is_caller_job:
                missing.append((path, current_job))
            in_jobs = False
            current_job = None
            has_timeout = False
            is_caller_job = False
            continue

        if not in_jobs:
            continue

        # Detect a new job declaration (2-space indent, ends with colon).
        m = JOB_NAME_RE.match(line)
        if m:
            # Finalize the previous job before starting a new one.
            if current_job and not has_timeout and not is_caller_job:
                missing.append((path, current_job))
            current_job = m.group(1)
            has_timeout = False
            is_caller_job = False
            continue

        # Detect `uses:` under the current job (4-space indent) — marks
        # this job as a reusable-workflow caller, exempt from the timeout
        # check.
        m = USES_RE.match(line)
        if m and current_job:
            is_caller_job = True
            continue

        # Detect `timeout-minutes:` under the current job (4-space indent).
        m = TIMEOUT_RE.match(line)
        if m and current_job:
            has_timeout = True

    # Finalize the last job in the file (the loop above only finalizes on
    # block-exit or on a new-job boundary).
    if in_jobs and current_job and not has_timeout and not is_caller_job:
        missing.append((path, current_job))

if missing:
    print(
        f"FAIL: {len(missing)} job(s) missing 'timeout-minutes:' across "
        f"{checked} workflow file(s).",
        file=sys.stderr,
    )
    for path, job in missing:
        if mode == 'ci':
            print(
                f"::error file={path}::job '{job}' is missing a "
                f"'timeout-minutes:' cap (see AGENTS.md 'CI Race Playbook')",
                file=sys.stderr,
            )
        else:
            print(
                f"  FAIL: {path}: job '{job}' missing 'timeout-minutes:'",
                file=sys.stderr,
            )
    sys.exit(1)

print(
    f"PASS: all jobs in {checked} workflow file(s) have a "
    f"'timeout-minutes:' cap."
)
PYEOF
