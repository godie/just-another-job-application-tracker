import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.tsx', 'vite.config.ts'],
  project: ['src/**/*.{js,ts,jsx,tsx}'],
  ignore: [
    'src/vite-env.d.ts',
    'src/pwa.d.ts',
    'src/i18n.ts',  // side-effect import in main.tsx
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'src/setupTests.ts',
    'src/locales/**/*',
  ],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    // Used at runtime via barrel re-exports or dynamic imports
    '@googleapis/sheets',
    '@types/dompurify',
    '@types/recharts',
    // Dev tools used in other CI workflows or Playwright
    '@axe-core/playwright',
    '@vitest/coverage-v8',
    'autoprefixer',
    'axe-playwright',
    'baseline-browser-mapping',
    'postcss',
  ],
  ignoreBinaries: [],
};

export default config;
