import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.tsx', 'vite.config.ts'],
  project: ['src/**/*.{js,ts,jsx,tsx}'],
  ignore: [
    'src/vite-env.d.ts',
    'src/pwa.d.ts',
    'src/i18n.ts',
    'src/setupTests.ts',
    'src/locales/**/*',
  ],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    '@googleapis/sheets',
    '@types/dompurify',
    '@types/recharts',
    '@axe-core/playwright',
    '@vitest/coverage-v8',
    '@testing-library/jest-dom',
    'autoprefixer',
    'axe-playwright',
    'baseline-browser-mapping',
    'postcss',
  ],
  ignoreBinaries: ['eslint', 'knip'],
};

export default config;
