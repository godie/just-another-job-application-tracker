#!/bin/bash
#
# Smoke test for LogfireTelemetry no-op fallback and graceful OTLP failure.
#
# Exercises the api/src/Telemetry/LogfireTelemetry.php bootstrap directly:
#
# Test 1 (empty LOGFIRE_TOKEN): the class short-circuits at init. The
# tracerProvider stays null, tracer() returns an in-memory noop tracer,
# spans are created and ended without errors, and shutdown() exits
# cleanly with no stderr noise.
#
# Test 2 (fake LOGFIRE_TOKEN + unreachable base URL): the class wires
# the OTLP HTTP exporter with bearer auth. A span is created and
# ended (queued into the BatchSpanProcessor). Shutdown flushes the
# queue → the OTLP transport attempts to ship → the transport fails
# with connection-refused (since 127.0.0.1:1 is unbound). The OTel
# SDK and our LogfireTelemetry::shutdown() try/catch swallow the
# failure: stderr will contain error_log noise, but PHP exits 0.
#
# Exit code 0 ⇒ both checks passed. Exit code 1 ⇒ at least one failed.
#
# Usage:
#   bash scripts/check-env.sh                  # run both checks
#   bash scripts/check-env.sh --no-empty       # skip empty-token test
#   bash scripts/check-env.sh --no-fake        # skip fake-token test

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Ensure composer vendor dir is present so the OpenTelemetry SDK loads.
if [ ! -d "api/vendor" ]; then
  echo "❌ api/vendor not found. Run 'cd api && composer install' first." >&2
  exit 1
fi

SKIP_EMPTY=0
SKIP_FAKE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-empty) SKIP_EMPTY=1 ;;
    --no-fake)  SKIP_FAKE=1 ;;
    -h|--help)
      cat <<'USAGE'
Smoke test for LogfireTelemetry no-op fallback and graceful OTLP failure.

Usage:
  bash scripts/check-env.sh                  # run both checks
  bash scripts/check-env.sh --no-empty       # skip empty-token test
  bash scripts/check-env.sh --no-fake        # skip fake-token test
USAGE
      exit 0
      ;;
  esac
  shift
done

# Write each PHP test body to a real on-disk file via quoted heredoc, then
# invoke `php <file>`. This avoids any bash single-quote/heredoc/$() quoting
# pitfalls — earlier attempts stuffed PHP bodies into bash strings and tripped
# over an unbalanced-quote error during `bash -n`. Temp files are tidied on
# trap EXIT so failed runs don't leak /tmp garbage.

OVERALL=0
TMPDIR_SMOKE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SMOKE"' EXIT

cat >"$TMPDIR_SMOKE/empty_token.php" <<'PHPBODY'
<?php
require "api/vendor/autoload.php";
use OverPHP\Telemetry\LogfireTelemetry;

// ── Test 1: empty LOGFIRE_TOKEN falls back to a no-op ──

LogfireTelemetry::init(["logfire_token" => ""]);

$tp = LogfireTelemetry::tracerProvider();
if ($tp !== null) {
    fwrite(STDERR, "FAIL: tracerProvider should be null when token is empty\n");
    exit(1);
}
echo "PASS: empty token keeps tracerProvider null\n";

$tracer = LogfireTelemetry::tracer();
$span = $tracer->spanBuilder("noop-test-span")->startSpan();
$span->end();
echo "PASS: noop tracer accepted and ended a span\n";

LogfireTelemetry::shutdown();
echo "PASS: shutdown completed on empty-token path\n";
PHPBODY

cat >"$TMPDIR_SMOKE/fake_token.php" <<'PHPBODY'
<?php
require "api/vendor/autoload.php";
use OverPHP\Telemetry\LogfireTelemetry;

// ── Test 2: fake LOGFIRE_TOKEN wires exporter, network fails gracefully ──
// We point the OTLP endpoint at 127.0.0.1:1, an unbound local port. The
// connection refused fires fast so the test does not hang on a developer's
// machine with no internet: shutdown flushes BatchSpanProcessor → OTLP HTTP
// transport attempt → ECONNREFUSED → SDK + our shutdown try/catch swallow
// the failure → PHP exits 0.

LogfireTelemetry::init([
    "logfire_token" => "fake-test-token-not-real-1234567890abcdef",
    "base_url"      => "http://127.0.0.1:1",
]);

$tp = LogfireTelemetry::tracerProvider();
if ($tp === null) {
    fwrite(STDERR, "FAIL: tracerProvider should be set when token is non-empty\n");
    exit(1);
}
echo "PASS: non-empty token wires a real tracerProvider\n";

$tracer = LogfireTelemetry::tracer();
$span = $tracer->spanBuilder("smoke-test-span")->startSpan();
$span->end();
echo "PASS: span created and ended (queued for OTLP export)\n";

LogfireTelemetry::shutdown();
echo "PASS: shutdown flushed+swallowed network failure without PHP exit\n";
PHPBODY

run_check() {
  local label="$1"
  local script_path="$2"
  echo ""
  echo "=== $label ==="

  if php -d "error_reporting=E_ALL" -d "display_errors=stderr" "$script_path" \
        2>/tmp/check-env.stderr; then
    local stderr_lines
    stderr_lines=$(wc -l </tmp/check-env.stderr | tr -d " ")
    echo "(stderr captured: $stderr_lines line(s))"
  else
    echo "--- stderr ---"
    cat /tmp/check-env.stderr
    echo "--- end stderr ---"
    OVERALL=1
  fi
}

if [ "$SKIP_EMPTY" -eq 0 ]; then
  run_check "Test 1: empty LOGFIRE_TOKEN (no-op fallback)" \
            "$TMPDIR_SMOKE/empty_token.php" || OVERALL=1
fi

if [ "$SKIP_FAKE" -eq 0 ]; then
  run_check "Test 2: fake LOGFIRE_TOKEN (graceful network failure)" \
            "$TMPDIR_SMOKE/fake_token.php" || OVERALL=1
fi

echo ""
if [ "$OVERALL" -eq 0 ]; then
  echo "✅ LogfireTelemetry smoke checks passed."
else
  echo "❌ One or more smoke checks failed."
fi
exit "$OVERALL"
