import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Ignore dependencies that are installed but not directly used in src
  ignoreDependencies: [
    '@axe-core/playwright',
    '@vitest/coverage-v8',
    'autoprefixer',
    'axe-playwright',
    'baseline-browser-mapping',
    'postcss',
    '@googleapis/sheets',
    '@types/dompurify',
    '@types/recharts',
  ],

  // Ignore specific files
  ignoreFiles: [
    'src/pwa.d.ts',
  ],

  // Ignore specific issues by file patterns
  // 'exports' = unused exports, 'types' = unused exported types
  ignoreIssues: {
    'src/components/ui/Table.tsx': ['exports'],
    'src/tests/helpers/mergeDataHelpers.ts': ['exports'],
    'src/utils/applications.ts': ['exports'],
    'src/utils/csv.ts': ['exports'],
    'src/utils/googleSheets.ts': ['exports'],
    'src/utils/localStorage.ts': ['exports'],
    'src/components/Alert.tsx': ['types'],
    'src/components/ui/Input.tsx': ['types'],
    'src/components/ui/Select.tsx': ['types'],
    'src/components/ui/Separator.tsx': ['types'],
    'src/types/preferences.ts': ['types'],
  },

  // Project patterns
  project: ['src/**/*.{ts,tsx}', 'api/**/*.{ts,php}'],

  // Entry points
  entry: ['src/main.tsx', 'index.html'],
};

export default config;