import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Non-code file types that ESLint can't lint — without these,
  // each non-{ts,tsx} file in the tree triggers a "File ignored
  // because no matching configuration was supplied" warning, and
  // `--max-warnings 0` (enforced in package.json) then fails the
  // lint with exit 1 even though there's nothing wrong.
  globalIgnores([
    'dist',
    '**/*.json',
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
])
