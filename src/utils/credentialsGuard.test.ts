import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/**
 * CI guard for HIGH-4 regressions on the client side.
 *
 * Every same-origin /api/ fetch must carry `credentials: 'include'` so the
 * session cookie is both SENT outbound (so the server can identify the user)
 * and ACCEPTED on Set-Cookie responses (otherwise login/register look like
 * successes while silently leaving the user logged-out).
 *
 * Covered (in precedence order):
 *   1. Inline `credentials: 'include'` in the options literal.
 *   2. A spread `...X` in the same file where `const X = { ... credentials:
 *      'include' ... }` is declared in that same file.
 *   3. A spread `...Y` where Y is a local name imported via named import
 *      `import { sourceName [as Y] } from './path'` — IF the source file
 *      exports `sourceName` as an object-literal carrier whose body contains
 *      `credentials: 'include'`. (Cross-file resolution.)
 *
 * Exempt (treated as external):
 *   - First-arg URL literal containing a known external host fragment, OR
 *   - First-arg identifier declared in the same file as a URL literal whose
 *     host matches an external fragment (covers `const url =
 *     \`https://...?key=${apiKey}\``).
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

const FETCH_START = /^\s*(?:(?:const|let|var)\s+\w+\s*=\s*)?(?:await\s*)?fetch\s*\(/;

const URL_FIRST_ARG =
  /fetch\s*\(\s*(?:(['"`])([^'"`]*?)\1|(\w+))/;

const STRING_LIT_RE =
  /(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+?)?\s*=\s*(['"`])((?:(?!\2).)*)\2/g;

const CREDENTIALS_INCLUDE_RE = /credentials\s*:\s*['"]include['"]/;
const SPREAD_RE = /\.\.\.(\w+)/g;

// Match either `const X = {...}` or `export const X = {...}`. The body
// check downstream verifies the right credential pattern; the leading
// `export` is captured separately to populate `exportedCarriers`.
const OBJ_START_RE =
  /(?:export\s+)?(?:const|let|var)\s+(\w+)(?:\s*:\s*[^=]+?)?\s*=\s*\{/g;

// FUTURE: OBJ_START_RE captures only inline `export const X = {...}` and
// `const X = {...}` declarations. Two related forms are NOT covered:
//   1. Separate re-export statements — `const X = {credentials: 'include', ...};
//      export { X };` — X lands in `credentialsCarriers` (the const decl matches)
//      but NOT in `exportedCarriers` (no leading `export` in the matched slice).
//      A file using that style over the inline form silently loses cross-file
//      coverage. Fix: scan for `export { X[, Y, ...] };` statements and add
//      the listed names to `exportedCarriers` if they appear as credential
//      carriers in the same file.
//   2. Default object-literal exports — `export default { credentials: 'include',
//      ... }` — anonymous, so no identifier to put in either set. Default
//      imports (`import opts from './optsMod'`) cannot resolve as cross-file
//      carriers either. Fix: match `export default {` separately and track
//      by some sentinel key (e.g. `'__default__'`); resolve `import X from
//      './path'` against the source file's default-carrier sentinel.
//
// Cross-file resolution is also single-hop. A file that imports an identifier
// from a module which itself imports-and-spreads a carrier would NOT chain
// transparently — we only verify one level of `sourceFile.exportedCarriers`.
// Not a present-day concern; the codebase has one-hop patterns only.

// Match `import { ... } from 'spec'` named imports (multi-line tolerant).
const NAMED_IMPORT_RE =
  /import\s+\{([\s\S]+?)\}\s+from\s+['"]([^'"]+)['"]/g;

// Per specifier inside the braces: `Name` or `Name as LocalName`.
const IMPORT_SPECIFIER_RE = /^(\w+)(?:\s+as\s+(\w+))?\s*$/;

// FUTURE: CREDENTIALS_INCLUDE_RE is not anchored to the options-object
// top level — a fetch written as `{ headers: { credentials: 'include' } }`
// would be marked covered even though `credentials` inside `headers` is a
// no-op for `RequestInit`. The exotic pattern isn't present today. A
// stricter match (require a sibling-key context via brace accounting) could
// be added if the false-negative class ever becomes real.
//
// FUTURE: same-file shadowing is not modelled. If a block-scoped local
// `defaultFetchOptions = {}` shadows an imported carrier of the same name,
// the static analysis would still mark spreads of it as covered. Pathological
// case, not present today.

const WINDOW_LINES = 60;
const MIN_FETCH_CALLS = 10;

interface ImportedName {
  /** Absolute path of the file we import from (resolved against disk). */
  sourceFileAbs: string;
  /** Original name being imported from sourceFileAbs. */
  exportedName: string;
}

interface FileAnalysis {
  /** Same-file carriers: object literals declared in this file with
   *  credentials: 'include'. Includes both private and exported decls. */
  credentialsCarriers: Set<string>;
  /** Names EXPORTED by this file as credential carriers. Used by importers
   *  to verify cross-file transitive coverage. */
  exportedCarriers: Set<string>;
  /** Local name (as appears in this file) → origin. Built by scanning
   *  `import { X [as Y] } from '.'` statements. */
  imports: Map<string, ImportedName>;
  /** `const x = "https://..."` URL identifiers in this file. */
  urlIds: Map<string, string>;
}

interface FetchSite {
  absFile: string;
  file: string;
  line: number;
  window: string;
  urlText: string;
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

function resolveImportPath(
  importPath: string,
  importingFileAbs: string,
): string | null {
  let targetBase: string;
  if (importPath.startsWith('@/')) {
    // tsconfig paths "@/*": ["./src/*"]
    targetBase = path.join(SRC, importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    targetBase = path.join(path.dirname(importingFileAbs), importPath);
  } else {
    return null; // node_modules or other bare specifier — out of scope
  }
  for (const suffix of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = targetBase + suffix;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function analyzeFile(text: string, absFile: string): FileAnalysis {
  // 1) Object-literal declarations (private OR exported) whose body
  //    contains `credentials: 'include'`.
  const credentialsCarriers = new Set<string>();
  const exportedCarriers = new Set<string>();
  for (const m of text.matchAll(OBJ_START_RE)) {
    const name = m[1];
    if (!name) continue;
    const isExported = /^\s*export\s+/.test(m[0]);
    const openIdx = m.index! + m[0].length - 1; // position of opening `{`
    let depth = 1;
    let i = openIdx + 1;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const body = text.slice(openIdx + 1, i - 1);
    if (CREDENTIALS_INCLUDE_RE.test(body)) {
      credentialsCarriers.add(name);
      if (isExported) exportedCarriers.add(name);
    }
  }

  // 2) Named imports — record local-name → resolved-target mapping so
  //    cross-file spreads can be verified against the source file's
  //    exported carriers.
  const imports = new Map<string, ImportedName>();
  for (const m of text.matchAll(NAMED_IMPORT_RE)) {
    const spec = m[1];
    const importPath = m[2];
    if (!spec || !importPath) continue;
    const sourceFileAbs = resolveImportPath(importPath, absFile);
    if (!sourceFileAbs) continue;
    for (const part of spec.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const specMatch = IMPORT_SPECIFIER_RE.exec(trimmed);
      if (!specMatch) continue;
      const exportedName = specMatch[1];
      const localName = specMatch[2] || exportedName;
      imports.set(localName, { sourceFileAbs, exportedName });
    }
  }

  // 3) URL identifiers — `const x = "https://..."` style.
  const urlIds = new Map<string, string>();
  for (const m of text.matchAll(STRING_LIT_RE)) {
    if (/^https?:\/\//.test(m[3])) urlIds.set(m[1], m[3]);
  }

  return { credentialsCarriers, exportedCarriers, imports, urlIds };
}

function findFetches(analyses: Map<string, FileAnalysis>): FetchSite[] {
  const sites: FetchSite[] = [];
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, 'utf-8');
    const lines = text.split('\n');
    const analysis = analyses.get(file);
    for (let i = 0; i < lines.length; i++) {
      if (!FETCH_START.test(lines[i])) continue;
      const window = lines
        .slice(i, Math.min(i + WINDOW_LINES, lines.length))
        .join('\n');
      let urlText = '';
      const urlMatch = window.match(URL_FIRST_ARG);
      if (urlMatch) {
        if (urlMatch[2] !== undefined) {
          urlText = urlMatch[2];
        } else if (urlMatch[3] && analysis) {
          const resolved = analysis.urlIds.get(urlMatch[3]);
          if (resolved !== undefined) urlText = resolved;
        }
      }
      sites.push({
        absFile: file,
        file: path.relative(SRC, file),
        line: i + 1,
        window,
        urlText,
      });
    }
  }
  return sites;
}

function isExternalUrl(urlText: string): boolean {
  if (!/^https?:\/\//.test(urlText)) return false;
  return EXTERNAL_HOST_FRAGMENTS.some((h) => urlText.includes(h));
}

function isCovered(
  site: FetchSite,
  fileAnalysis: FileAnalysis,
  allAnalyses: Map<string, FileAnalysis>,
): boolean {
  if (CREDENTIALS_INCLUDE_RE.test(site.window)) return true;
  for (const m of site.window.matchAll(SPREAD_RE)) {
    const localName = m[1];
    // (a) Same-file carrier.
    if (fileAnalysis.credentialsCarriers.has(localName)) return true;
    // (b) Cross-file carrier through a named import.
    const imported = fileAnalysis.imports.get(localName);
    if (imported) {
      const sourceAnalysis = allAnalyses.get(imported.sourceFileAbs);
      if (sourceAnalysis?.exportedCarriers.has(imported.exportedName)) {
        return true;
      }
    }
  }
  return false;
}

function violates(
  site: FetchSite,
  fileAnalysis: FileAnalysis,
  allAnalyses: Map<string, FileAnalysis>,
): string | null {
  if (isExternalUrl(site.urlText)) return null;
  if (isCovered(site, fileAnalysis, allAnalyses)) return null;
  return (
    `${site.file}:${site.line} — same-origin fetch without credentials: 'include':\n` +
    site.window.split('\n').map((l) => '  ' + l).join('\n')
  );
}

describe('credentials guard — HIGH-4 regression sweep', () => {
  it('every same-origin fetch call includes credentials: "include"', () => {
    // Phase 1: pre-scan every non-test src file for credential carriers
    // (same-file), exported carriers (cross-file), URL identifiers, and
    // named imports that bring those exported carriers into scope.
    const analyses = new Map<string, FileAnalysis>();
    for (const file of walk(SRC)) {
      analyses.set(
        file,
        analyzeFile(fs.readFileSync(file, 'utf-8'), file),
      );
    }

    // Phase 2: map each fetch() call site with its analysis context.
    const sites = findFetches(analyses);

    // Loud sanity floor — a regex regression that finds 0 sites would
    // otherwise silently pass.
    expect(sites.length).toBeGreaterThanOrEqual(MIN_FETCH_CALLS);

    const failures = sites
      .map((s) => violates(s, analyses.get(s.absFile)!, analyses))
      .filter((m): m is string => m !== null);

    if (failures.length > 0) {
      throw new Error(
        'Same-origin fetch() calls must carry credentials: "include". Offenders:\n\n' +
          failures.join('\n\n'),
      );
    }
    expect(failures).toEqual([]);
  });
});
