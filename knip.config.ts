import type { KnipConfig } from 'knip';

const config: KnipConfig = {
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
    'habit-hooks',
    'tailwindcss',
    // Used via Tailwind v4 @plugin directive in src/index.css; knip cannot trace CSS @plugin imports.
    'tailwindcss-animate',
  ],

  ignoreFiles: [
    'src/pwa.d.ts',
    'src/components/ui/index.ts',
  ],

  ignoreIssues: {
    'src/components/ui/Badge.tsx': ['exports'],
    'src/components/ui/Button.tsx': ['exports', 'types'],
    'src/components/ui/Dialog.tsx': ['exports'],
    'src/components/ui/DropdownMenu.tsx': ['exports'],
    'src/components/AuthModals.tsx': ['exports'],
    'src/storage/matching.ts': ['exports'],
    'src/components/ui/Input.tsx': ['types'],
    'src/components/ui/Separator.tsx': ['types'],
    'src/components/profileSetupReducer.ts': ['types'],
    'src/components/emailScanReducer.ts': ['types'],
    'src/components/ui/Textarea.tsx': ['types'],
    'src/components/ui/index.ts': ['exports'],
    'src/components/BasicDetailsFields.tsx': ['exports'],
    'src/components/GeminiKeyFormFields.tsx': ['exports'],
    'src/components/ManualInputTab.tsx': ['exports'],
    'src/components/ScanAuthGate.tsx': ['exports'],
    'src/components/ScanResults.tsx': ['exports'],
    'src/components/ManualProcessingPanel.tsx': ['exports'],
    'src/components/settings/CloudAccountSection.tsx': ['exports'],
    'src/components/settings/SettingsSectionHeader.tsx': ['exports'],
    'src/components/settings/SettingsSidebar.tsx': ['exports'],
    'src/components/SheetsAuthGate.tsx': ['exports'],
    'src/components/SheetSelectInput.tsx': ['exports'],
    'src/components/SourceFields.tsx': ['exports'],
    'src/components/TrackingFields.tsx': ['exports'],
  },

  project: ['src/**/*.{ts,tsx}'],

  entry: ['index.html'],
};

export default config;
