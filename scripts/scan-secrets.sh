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

# --- High-entropy api/.env leak detection (pre-commit mode only) ---
# Fires when someone bypasses .gitignore with `git add -f api/.env` and
# stages a real write token, DB password, or other 20+ alpha-numeric string
# into the tracked repo. Skipped in --ci mode because api/.env is gitignored
# and won't be present in the repo at that point. Warning only — does not
# block the commit so legitimate placeholders don't get in the way.
# Filter `^[+][^@+]` excludes diff-headers (`+++`/`@@`) so we only look at
# actual added content lines.
if [ -n "$GIT_GREP_ARGS" ]; then
  LEAKS=$(git diff --cached api/.env 2>/dev/null | grep -E '^[+][^@+].*[A-Za-z0-9]{20,}' || true)
  if [ -n "$LEAKS" ]; then
    echo ""
    echo "⚠️  WARNING: possible secret in api/.env:"
    echo "$LEAKS"
    echo ""
    echo "  If this is intentional, run with --no-verify to bypass."
  fi
fi

# --- Frontend / Generic patterns ---
GENERIC_PATTERN='sk-[a-zA-Z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]+|AKIA[0-9A-Z]{16}|Bearer[[:space:]]+[a-zA-Z0-9_-]{20,}|DEEPSEEK_API_KEY[[:space:]]*=[[:space:]]*["'\''"]*[a-zA-Z0-9_-]+|OPENROUTER_API_KEY[[:space:]]*=[[:space:]]*["'\''"]*[a-zA-Z0-9_-]+'

# --- PHP-specific patterns ---
# Match array keys like password/api_key/client_secret mapped to literal non-empty strings
PHP_PATTERN="(?:password|secret|token|api_key|client_secret|private_key|access_token|refresh_token)[[:space:]]*=>[[:space:]]*['\"][a-zA-Z0-9_.~+/-]{8,}['\"]"

echo "🔍 Scanning for secrets ($MODE mode)..."

# --- Run generic scan ---
if [ -n "$GIT_GREP_ARGS" ]; then
  RESULT_GENERIC=$(git grep -nIE "$GENERIC_PATTERN" $GIT_GREP_ARGS -- . 2>/dev/null || true)
else
  RESULT_GENERIC=$(git grep -nIE "$GENERIC_PATTERN" -- . 2>/dev/null || true)
fi

# --- Run PHP-specific scan (only on *.php files) ---
if [ -n "$GIT_GREP_ARGS" ]; then
  RESULT_PHP=$(git grep -nIE "$PHP_PATTERN" $GIT_GREP_ARGS -- '*.php' 2>/dev/null || true)
else
  RESULT_PHP=$(git grep -nIE "$PHP_PATTERN" -- '*.php' 2>/dev/null || true)
fi

RESULT="${RESULT_GENERIC}${RESULT_PHP:+\n$RESULT_PHP}"

if [ -z "$RESULT" ]; then
  echo "✅ No secrets detected."
  exit 0
fi

# Filter out safe/placeholder lines
SAFE_PATTERNS='GOOGLE_CLIENT_ID_HERE|YOUR_.*_HERE|__.*__|process\.env\.|import\.meta\.env\.|VITE_.*_HERE|placeholder|dummy|example|localhost|127\.0\.0\.1|getenv|\$_ENV|\$_SERVER|null|password_verify|password_hash|hashPassword|verifyPassword|bin2hex|random_bytes|PDO|csrf|Test\.php|\.test\.|:tests/'
FILTERED=$(echo -e "$RESULT" | grep -vE "$SAFE_PATTERNS" || true)

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
