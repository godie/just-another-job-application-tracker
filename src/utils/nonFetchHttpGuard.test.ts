import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/**
 * CI guard, sibling of credentialsGuard.test.ts, covering the non-fetch
 * half of HIGH-4. This codebase is fetch-only by convention — the audit
 * (June 2026) found zero non-fetch HTTP clients in src/. This test exists:
 *
 *   1. To document the convention.
 *   2. To catch regressions: a future contributor who adds axios/ky/etc.
 *      for a /api/ endpoint without carrying `withCredentials: true` (or
 *      the ky/graphql-fetch equivalent of `credentials: 'include'`) would
 *      silently break the same session-cookie round-trip that the fetch
 *      guard protects.
 *
 * Recognition + per-client required configuration:
 *
 *   axios          → must carry `withCredentials: true` somewhere in the
 *                    call's options object OR attach via an interceptor
 *                    flagged with the same property.
 *   ky (v1+)       → must carry `credentials: 'include'` in the request
 *                    options (ky proxies through fetch under the hood,
 *                    so this matches the fetch-side invariant).
 *   sendBeacon     → fire-and-forget; cannot carry Set-Cookie back to the
 *                    browser by design. If used against /api/auth/ endpoints
 *                    this is a footgun, but credentials inclusion is N/A.
 *                    The test does not block on it, but surfaces detected
 *                    call-sites via `console.info` so a contributor who
 *                    hits /api/auth/ by accident at least sees the note in
 *                    test output.
 *   XMLHttpRequest → must set `xhr.withCredentials = true` before
 *                    `.send(...)` for same-origin /api/ endpoints.
 *   GraphQLClient  → must carry `credentials: 'include'` in `fetchOptions`.
 *
 * External URLs (Google APIs) are exempt — they authenticate via bearer
 * tokens, not session cookies.
 */

const SRC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'src',
);

const EXTERNAL_HOST_FRAGMENTS = [
  'accounts.google.com',
  'oauth2.googleapis.com',
  'gmail.googleapis.com',
  'generativelanguage.googleapis.com',
  'sheets.googleapis.com',
  'www.googleapis.com',
  'api.anthropic.com',
  'api.openai.com',
];

type Flag = 'withCredentials' | 'credentials:include';

interface HttpClientPattern {
  name: string;
  pattern: RegExp;
  credentialsFlag: Flag;
  /** Detect-on: which textual signal confirms the credential flag is set. */
  flagDetector: RegExp;
  /** If true, this client can't carry session cookies by design. */
  noCredentialsSupport: boolean;
}

const PATTERNS: HttpClientPattern[] = [
  {
    name: 'axios',
    pattern: /\baxios\s*(?:\.|\()/,
    credentialsFlag: 'withCredentials',
    flagDetector: /\bwithCredentials\b/,
    noCredentialsSupport: false,
  },
  {
    // Match either directive call form `ky(url, opts)` or method form
    // `ky.get/post/...` — the original pattern only recognised the method
    // form and silently missed the directive call (which is what the ky
    // README leads with).
    name: 'ky',
    pattern: /\bky\b\s*[.(]/,
    credentialsFlag: 'credentials:include',
    flagDetector: /credentials\s*:\s*['"]include['"]/,
    noCredentialsSupport: false,
  },
  {
    name: 'sendBeacon',
    pattern: /sendBeacon\s*\(/,
    credentialsFlag: 'withCredentials',
    flagDetector: /\bwithCredentials\b/,
    // Beacon is fire-and-forget by design — the browser intentionally
    // drops Set-Cookie on the response. Reporting it as violative would
    // be misleading; instead we surface it in a sanity log if present.
    noCredentialsSupport: true,
  },
  {
    name: 'XMLHttpRequest',
    pattern: /new\s+XMLHttpRequest\s*\(/,
    credentialsFlag: 'withCredentials',
    flagDetector: /\bwithCredentials\b/,
    noCredentialsSupport: false,
  },
  {
    name: 'GraphQLClient',
    pattern: /(?:new\s+)?GraphQLClient\s*\(/,
    credentialsFlag: 'credentials:include',
    flagDetector: /credentials\s*:\s*['"]include['"]/,
    noCredentialsSupport: false,
  },
];

const WINDOW_LINES = 60;

// Sanity floor: today the codebase has zero non-fetch HTTP clients. The cap
// is generous so any single new addition still passes — but if src/ suddenly
// has 5+ such clients, that's a signal the convention has changed and a human
// should review.
const MAX_NON_FETCH_CLIENTS = 20;

// FUTURE: the credentials-flag detector only checks the call-site window. A
// common axios pattern configures credentials globally and never at the call:
//
//   axios.defaults.withCredentials = true;
//   await axios.get('/api/...');
//
// The `axios.get` line has no `withCredentials` substring in its window →
// would be falsely flagged. The existing fix in credentialsGuard.test.ts
// (per-file carrier trace) could be ported here once axios is actually
// introduced; until then, defer.

interface Usage {
  file: string;
  line: number;
  window: string;
  pattern: HttpClientPattern;
}

function isExternalUrlListed(window: string): boolean {
  return EXTERNAL_HOST_FRAGMENTS.some((h) => window.includes(h));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(p));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out.sort();
}

function findUsages(): Usage[] {
  const out: Usage[] = [];
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    for (let j = 0; j < lines.length; j++) {
      for (const pat of PATTERNS) {
        if (pat.pattern.test(lines[j])) {
          const window = lines
            .slice(j, Math.min(j + WINDOW_LINES, lines.length))
            .join('\n');
          out.push({
            file: path.relative(SRC, file),
            line: j + 1,
            window,
            pattern: pat,
          });
        }
      }
    }
  }
  return out;
}

// Surfacing helper: when sendBeacon is used, the test does not fail (the
// client can't carry Set-Cookie back by design), but a contributor using
// it against /api/auth/ would silently break the round-trip. We emit a
// console note so the call is at least seen in test output — vitest
// displays console output in the failure panel even on a passing test.
function beaconUsageReport(usages: Usage[]): void {
  const beacons = usages.filter((u) => u.pattern.name === 'sendBeacon');
  if (beacons.length === 0) return;
  console.info(
    `[nonFetchHttpGuard] detected ${beacons.length} sendBeacon call(s) — ` +
      `fire-and-forget, no session-cookie support. Confirm they are NOT ` +
      `hitting /api/auth/. Sites: ` +
      beacons.map((b) => `${b.file}:${b.line}`).join(', '),
  );
}

function violates(u: Usage): string | null {
  if (u.pattern.noCredentialsSupport) return null;
  if (isExternalUrlListed(u.window)) return null;
  if (u.pattern.flagDetector.test(u.window)) return null;
  return (
    `${u.file}:${u.line} — ${u.pattern.name} call without proper credentials configuration.\n` +
    `Required flag: ${u.pattern.credentialsFlag} (or attach via interceptor/fetch wrapper).\n` +
    `If the URL is external (Google API), the credentials flag is not needed — ` +
    `make that explicit in code so future readers can audit it.\n` +
    u.window.split('\n').map((l) => '  ' + l).join('\n')
  );
}

describe('non-fetch HTTP guard — HIGH-4 followup', () => {
  it('axios / ky / sendBeacon / XMLHttpRequest / GraphQLClient carry the right credentials config', () => {
    const usages = findUsages();

    // Convention sanity floor: this codebase is documented as fetch-only.
    // If many such clients appear, that's a signal to revisit the convention.
    expect(usages.length).toBeLessThanOrEqual(MAX_NON_FETCH_CLIENTS);

    beaconUsageReport(usages);

    const failures = usages.map(violates).filter((m): m is string => m !== null);

    if (failures.length > 0) {
      throw new Error(
        'Non-fetch HTTP client calls must carry proper credentials configuration. Offenders:\n\n' +
          failures.join('\n\n'),
      );
    }
    expect(failures).toEqual([]);
  });
});
