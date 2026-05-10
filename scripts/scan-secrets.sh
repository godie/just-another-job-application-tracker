#!/bin/bash
#
# Secret scanner for pre-commit hooks and CI
# Scans staged files (pre-commit) or all tracked files (CI) for common secret patterns.
#
# Usage:
#   scripts/scan-secrets.sh          # scans staged files (pre-commit mode)
#   scripts/scan-secrets.sh --ci     # scans all tracked files (CI mode)
#

set -euo pipefail

MODE="pre-commit"
GIT_GREP_ARGS="--cached"
if [ "${1:-}" = "--ci" ]; then
  MODE="ci"
  GIT_GREP_ARGS=""
fi

# Combined regex pattern (extended regex for git grep -E)
PATTERN='sk-[a-zA-Z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]+|AKIA[0-9A-Z]{16}|Bearer[[:space:]]+[a-zA-Z0-9_-]{20,}|DEEPSEEK_API_KEY[[:space:]]*=[[:space:]]*["'\''"]*[a-zA-Z0-9_-]+|OPENROUTER_API_KEY[[:space:]]*=[[:space:]]*["'\''"]*[a-zA-Z0-9_-]+'

echo "🔍 Scanning for secrets ($MODE mode)..."

# Run git grep with combined pattern
if [ -n "$GIT_GREP_ARGS" ]; then
  RESULT=$(git grep -nIE "$PATTERN" $GIT_GREP_ARGS -- . 2>/dev/null || true)
else
  RESULT=$(git grep -nIE "$PATTERN" -- . 2>/dev/null || true)
fi

if [ -z "$RESULT" ]; then
  echo "✅ No secrets detected."
  exit 0
fi

# Filter out safe/placeholder lines
FILTERED=$(echo "$RESULT" | grep -vE 'GOOGLE_CLIENT_ID_HERE|YOUR_.*_HERE|__.*__|process\.env\.|import\.meta\.env\.|VITE_.*_HERE|placeholder|dummy|example|test|localhost|127\.0\.0\.1' || true)

# Also filter out .env.example if it only contains the placeholder (allow the tracked .env.example if it's cleaned)
# We keep this flexible — if the file still has a real key, it will show up.

if [ -z "$FILTERED" ]; then
  echo "✅ No secrets detected (only safe placeholders found)."
  exit 0
fi

echo ""
echo "❌ Secret scan found potential secret(s):"
echo "$FILTERED"
echo ""
echo "💡 If these are intentional placeholders, add them to the safe patterns in scripts/scan-secrets.sh"
echo "   or run with --no-verify to bypass (not recommended)."
exit 1
