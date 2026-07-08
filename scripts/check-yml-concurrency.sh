#!/bin/bash
# scripts/check-yml-concurrency.sh
#
# Pre-merge CI gate that asserts every `.github/workflows/*.yml` has BOTH
#   1. a top-level `concurrency:` block, AND
#   2. `concurrency.cancel-in-progress: true`, AND
#   3. a `timeout-minutes:` cap on every job
#
# This gate exists as the v2.6.34 followup to v2.6.29 (which added the
# timeout-only check via `scripts/check-yml-timeouts.sh`) and v2.6.33
# (which extended `concurrency.cancel-in-progress: true` to 4 more
# workflows after the v2.6.29 fix landed only on `pull-request.yml` and
# `orphan-sweep.yml`). Together the three layers form the CI Race Playbook:
#
#   v2.6.29  scripts/check-yml-timeouts.sh  — only checks `timeout-minutes:`
#   v2.6.33  4 inline `concurrency:` additions — extended the pattern
#   v2.6.34  scripts/check-yml-concurrency.sh (this file) — promotes the
#            v2.6.33 inline check into a permanent CI guard so future drift
#            in EITHER concurrency config OR timeout config is caught
#            pre-merge. Closes the loop on the post-2.6.20 cycle of 7
#            `--admin` bypasses (PRs #226, #227, #228, #229, #230, #231,
#            #232) that the v2.6.29 fix was designed to prevent.
#
# This script is a SUPERSET of `scripts/check-yml-timeouts.sh`: it checks
# BOTH the workflow-level concurrency config AND the job-level timeout
# config. Both checks are kept self-contained in this file (no
# inter-script dependency) for clarity. The 3 CI gates that previously
# called `check-yml-timeouts.sh --ci` now call BOTH:
#
#   - `check-yml-timeouts.sh --ci`        (focused timeout check, kept
#                                          for backwards compat + defense-
#                                          in-depth if this file's parser
#                                          has a regression)
#   - `check-yml-concurrency.sh --ci`     (concurrency + timeout superset,
#                                          the canonical check)
#
# The "report all errors then exit 1" failure mode mirrors
# `check-yml-timeouts.sh` and `check-workflow-shape.sh` so a single CI
# run reports the full picture and a follow-up PR can address all
# offenders in one sweep instead of n.
#
# Usage:
#   scripts/check-yml-concurrency.sh            # local mode; non-zero exit on any failure
#   scripts/check-yml-concurrency.sh --ci       # CI mode; emits `::error file=` annotations
#
# Style mirrors `scripts/check-yml-timeouts.sh` (bash, --ci mode flag,
# ::error file= annotations, set -euo pipefail, python3 heredoc for YAML
# parsing — regex-based, since PyYAML is not guaranteed on the runner).

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

echo "Checking workflow concurrency + job timeout-minutes (mode: $MODE)"

# Delegate the YAML parsing to Python. The parser tracks three concurrent
# state machines:
#
#   1. Top-level `concurrency:` block detection (column-0 line, then
#      2-space-indented body, then non-indented line ends the block).
#   2. `cancel-in-progress:` value within the `concurrency:` body (must
#      be exactly `true` / `True` / `TRUE` — anything else, including
#      `false` or a missing key, is a failure).
#   3. Job-level `timeout-minutes:` under each `jobs:` block (same logic
#      as `check-yml-timeouts.sh`).
#
# Why Python here and not pure-bash/grep:
#   - The concurrency + cancel-in-progress check needs to track a
#     nested block (concurrency body under top-level), which is fragile
#     to do in pure bash without stateful line iteration.
#   - The job-level timeout check is a near-clone of
#     `check-yml-timeouts.sh`'s parser — kept here verbatim for
#     self-containment, not sourced from the other script, so this file
#     has zero inter-script dependencies.
#   - YAML parsing in bash is fragile; Python is universally available on
#     `ubuntu-latest` runners and keeps the parser self-contained.
python3 - "$WORKFLOW_DIR" "$MODE" <<'PYEOF'
import re
import sys
import os
import glob

workflow_dir = sys.argv[1]
mode = sys.argv[2]

# --- Concurrency block parsing (workflow-level) -------------------------

# `concurrency:` lives at column 0 (no indent). Matches the key with an
# optional trailing comment; the next non-indented line ends the block.
CONCURRENCY_BLOCK_RE = re.compile(r'^concurrency:\s*(#.*)?$')
# `cancel-in-progress:` lives at 2-space indent under `concurrency:`.
# Value must be exactly `true` / `True` / `TRUE` (case-insensitive on
# `true`, but we accept only those three spellings to match YAML 1.2
# boolean truthy literals; `yes` / `on` are intentionally NOT accepted
# because GitHub Actions docs only document `true` for this key).
CANCEL_RE = re.compile(r'^  cancel-in-progress:\s*(true|True|TRUE)\s*(#.*)?$')
# Catch any other value for `cancel-in-progress:` (e.g. `false`, `yes`,
# missing value) so we can report a precise error.
CANCEL_ANY_RE = re.compile(r'^  cancel-in-progress:\s*([^#]*?)(?:\s*#.*)?$')

# --- Job + timeout parsing (job-level, mirrors check-yml-timeouts.sh) ---

# Job names live at 2-space indent under `jobs:`, and look like
# `  jobname:` (no inline value, no inline comment after the colon). The
# `(?:  |\t)` non-capturing group allows either 2-space or single-tab
# indent — both are legal YAML at the same logical level. All current
# workflow files in this repo use 2-space indent, but the parser is
# defensive against accidental tab-indented YAML (which would otherwise
# silently miss jobs).
JOB_NAME_RE = re.compile(r'^(?:  |\t)([a-zA-Z0-9_-]+):\s*(#.*)?$')
# `timeout-minutes:` lives at 4-space indent under a job (or 2 tabs),
# with a positive integer value. The trailing `\s*$` (with optional
# trailing `#` comment) keeps `    timeout-minutes: 5  # why 15? we
# don't` from being misread.
TIMEOUT_RE = re.compile(r'^(?:    |\t\t)timeout-minutes:\s*([0-9]+)\s*(#.*)?$')

missing_concurrency = []  # workflows missing the `concurrency:` block
missing_cancel = []       # workflows with `concurrency:` but no `cancel-in-progress: true`
wrong_cancel = []         # workflows with `cancel-in-progress:` set to something other than true
missing_timeout = []      # list of (file, jobname) pairs
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

    # --- Pass 1: workflow-level concurrency block -----------------------
    in_concurrency = False
    has_concurrency = False
    has_cancel_true = False
    cancel_value = None
    for line in lines:
        stripped = line.rstrip('\n')

        if CONCURRENCY_BLOCK_RE.match(stripped):
            has_concurrency = True
            in_concurrency = True
            has_cancel_true = False
            cancel_value = None
            continue

        if in_concurrency:
            # Concurrency body lines are 2-space-indented (or 1-tab). A
            # non-indented line means we've left the block.
            if line.startswith(' ') or line.startswith('\t'):
                m_cancel = CANCEL_ANY_RE.match(line)
                if m_cancel:
                    cancel_value = m_cancel.group(1).strip()
                    if CANCEL_RE.match(line):
                        has_cancel_true = True
            else:
                in_concurrency = False

    if not has_concurrency:
        missing_concurrency.append(path)
    elif not has_cancel_true:
        if cancel_value is not None:
            wrong_cancel.append((path, cancel_value))
        else:
            missing_cancel.append(path)

    # --- Pass 2: job-level timeout-minutes (mirrors check-yml-timeouts.sh) ---
    in_jobs = False
    current_job = None
    has_timeout = False
    is_caller_job = False
    USES_RE = re.compile(r'^(?:    |\t\t)uses:\s*(.+?)\s*(#.*)?$')

    for line in lines:
        stripped = line.rstrip('\n')

        # Detect top-level `jobs:` block start.
        if stripped == 'jobs:':
            in_jobs = True
            current_job = None
            has_timeout = False
            continue

        # If we hit a non-indented, non-empty, non-comment line while
        # inside a `jobs:` block, we've left the block. Finalize the last
        # job.
        if (
            in_jobs
            and stripped
            and not line.startswith(' ')
            and not line.startswith('\t')
            and not line.startswith('#')
        ):
            if current_job and not has_timeout and not is_caller_job:
                missing_timeout.append((path, current_job))
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
                missing_timeout.append((path, current_job))
            current_job = m.group(1)
            has_timeout = False
            is_caller_job = False
            continue

        # Detect `uses:` under the current job (4-space indent) — marks
        # this job as a reusable-workflow caller, exempt from the timeout
        # check (GHA strictly forbids `timeout-minutes:` on caller jobs).
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
        missing_timeout.append((path, current_job))

# --- Report ------------------------------------------------------------

fail_count = (
    len(missing_concurrency) + len(missing_cancel) + len(wrong_cancel) + len(missing_timeout)
)
if fail_count > 0:
    print(
        f"FAIL: {fail_count} configuration issue(s) across {checked} "
        f"workflow file(s).",
        file=sys.stderr,
    )
    for path in missing_concurrency:
        msg = (
            f"workflow is missing the top-level `concurrency:` block "
            f"(see AGENTS.md 'CI Race Playbook')"
        )
        if mode == 'ci':
            print(f"::error file={path}::{msg}", file=sys.stderr)
        else:
            print(f"  FAIL: {path}: {msg}", file=sys.stderr)
    for path in missing_cancel:
        msg = (
            f"workflow has `concurrency:` but no `cancel-in-progress: true` "
            f"(see AGENTS.md 'CI Race Playbook')"
        )
        if mode == 'ci':
            print(f"::error file={path}::{msg}", file=sys.stderr)
        else:
            print(f"  FAIL: {path}: {msg}", file=sys.stderr)
    for path, value in wrong_cancel:
        msg = (
            f"workflow has `concurrency.cancel-in-progress: {value}` but it "
            f"must be exactly `true` (see AGENTS.md 'CI Race Playbook')"
        )
        if mode == 'ci':
            print(f"::error file={path}::{msg}", file=sys.stderr)
        else:
            print(f"  FAIL: {path}: {msg}", file=sys.stderr)
    for path, job in missing_timeout:
        msg = (
            f"job '{job}' is missing a `timeout-minutes:` cap "
            f"(see AGENTS.md 'CI Race Playbook')"
        )
        if mode == 'ci':
            print(f"::error file={path}::{msg}", file=sys.stderr)
        else:
            print(f"  FAIL: {path}: {msg}", file=sys.stderr)
    sys.exit(1)

print(
    f"PASS: all {checked} workflow file(s) have "
    f"`concurrency.cancel-in-progress: true` AND all jobs have a "
    f"`timeout-minutes:` cap."
)
PYEOF
