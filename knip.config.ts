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
    '@playwright/test',
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
    'src/components/AuthModals.tsx': ['exports'],
    'src/components/GDPRCookieBanner.tsx': ['exports'],
    'src/components/OnboardingWizard.tsx': ['exports'],
    'src/storage/auth.ts': ['exports'],
    // Matching feature — named + default exports used in different places
    'src/components/MatchBreakdownModal.tsx': ['exports'],
    'src/components/MatchScoreBadge.tsx': ['exports'],
    'src/components/ProfileSetupModal.tsx': ['exports'],
    'src/components/RecommendationPanel.tsx': ['exports'],
    'src/components/settings/MatchingSettings.tsx': ['exports'],
    // Matching utils/storage — exported for future integration (T12, T14)
    'src/storage/matching.ts': ['exports'],
    'src/utils/geminiJobScoring.ts': ['exports'],
    'src/utils/geminiProfile.ts': ['exports'],
    // SEO module — barrel re-exports
    'src/seo/index.ts': ['exports', 'types'],
    // ATS_PLATFORMS is used in SettingsPage.tsx via ATSSearchSettings (knip doesn't track dynamic references)
    'src/utils/constants.ts': ['exports'],
  },

  // Project patterns
  project: ['src/**/*.{ts,tsx}'],

  // Entry points
  entry: ['index.html'],
};

export default config;
