import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsonc from 'eslint-plugin-jsonc'
import { defineConfig, globalIgnores } from 'eslint/config'

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
