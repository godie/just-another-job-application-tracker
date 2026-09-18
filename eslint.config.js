import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsonc from 'eslint-plugin-jsonc'
import regexp from 'eslint-plugin-regexp'
import security from 'eslint-plugin-security'
import sonarjs from 'eslint-plugin-sonarjs'
import { defineConfig, globalIgnores } from 'eslint/config'

// `--max-warnings 0` turns every finding into a failure, and ESLint's bulk
// suppressions only cover error-severity rules — so the local-audit plugin
// rules below run at error level regardless of what their preset ships.
const asErrors = (rules) =>
  Object.fromEntries(Object.keys(rules ?? {}).map((id) => [id, 'error']))

export default defineConfig([
  // Non-code file types that ESLint can't lint — without these,
  // each non-{ts,tsx} file in the tree triggers a "File ignored
  // because no matching configuration was supplied" warning, and
  // `--max-warnings 0` (enforced in package.json) then fails the
  // lint with exit 1 even though there's nothing wrong.
  //
  // JSON files in the root (package.json, tsconfig.json, etc.) are
  // ignored explicitly rather than via `**/*.json` so the
  // `src/locales/*.json` block below can lint the translation
  // files — `globalIgnores` takes precedence over later `files`
  // blocks in flat config.
  globalIgnores([
    'dist',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'components.json',
    'audit/**',
    'api/composer.json',
    'api/vendor/**',
    '.jscpd.json',
    'DOCS/perf/lighthouse-baseline-*.json',
    'cve-lite-scan-*.json',
    '.vscode/**',
    '**/*.md',
    '**/*.html',
    '**/*.css',
    '**/*.yml',
    '**/*.yaml',
    '**/*.cjs',
    '**/*.mjs',
    '**/*.sh',
    '**/*.php',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Local-audit rules for the Aikido rule set (see DOCS/LOCAL_AUDIT.md).
  // Each plugin was measured before wiring: the counts in the comments are
  // the findings it produced on the clean tree, all baselined in
  // `eslint-suppressions.json`. Do not raise that baseline.
  //
  // `eslint-plugin-unicorn` is deliberately absent: its recommended set
  // produced 1808 findings, and three of its top rules (filename-case 281,
  // prevent-abbreviations 504, no-null 436) contradict this repository's
  // conventions (PascalCase components, `null` as a real state).
  {
    files: ['**/*.{ts,tsx}'],
    ...regexp.configs['flat/recommended'],
    rules: {
      ...asErrors(regexp.configs['flat/recommended'].rules),
      // Style, not correctness: the regexes here are deliberately explicit.
      'regexp/prefer-w': 'off',
      'regexp/use-ignore-case': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ...security.configs.recommended,
    rules: {
      ...asErrors(security.configs.recommended.rules),
      // Every dynamic `obj[key]` trips it (116 hits, all on purpose here);
      // ReDoS is covered with fewer false positives by eslint-plugin-regexp.
      'security/detect-object-injection': 'off',
      'security/detect-unsafe-regex': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { sonarjs },
    rules: {
      // Curated from sonarjs's recommended set: duplication, complexity and
      // the insecure-API rules. Its regex rules and its assertion-style rules
      // are left out (eslint-plugin-regexp covers the first; the second is
      // test style, not a defect).
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/no-nested-conditional': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-dead-store': 'error',
      'sonarjs/no-redundant-assignments': 'error',
      'sonarjs/todo-tag': 'error',
      'sonarjs/no-clear-text-protocols': 'error',
      'sonarjs/pseudo-random': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-nested-functions': 'error',
    },
  },
  // Translation files: strict JSON (no comments, no trailing
  // commas, no duplicate keys). The `flat/recommended-with-json`
  // config applies to all JSON files not in `globalIgnores` —
  // which is only the locale files in this project.
  //
  // Note: this catches JSON syntax bugs, but does NOT catch the
  // i18n regression that broke the Footer (a key renamed in the
  // JSON without updating the component's `t('key')` call). For
  // that class of bug, the right tool is TypeScript type
  // definitions for `react-i18next` — see followup.
  ...jsonc.configs['flat/recommended-with-json'],
])
