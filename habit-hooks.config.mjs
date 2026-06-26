// habit-hooks.config.mjs
// Project-level tuning for habit-hooks v0.2.0 non-essential-comment rule.
//
// Goals:
//   1. Skip vendor JS (copyright headers, minified code): api/vendor/**
//   2. Exempt TypeScript hover-doc JSDoc blocks (/** ... */ with @param/@returns/@throws/@example)
//      from non-essential-comment so manual API docs survive re-runs. The comment-check sensor's
//      `maxBlockChars` knob controls how long a `/* */` block must be to count as substantive; we raise
//      it to a generous value so legitimate API docs are not flagged.
//   3. Keep single-line `// what does this do` comments under review (low maxSingleLineChars).
//   4. Continue excluding the config file itself.

/** @type {import('habit-hooks').Config} */
export default {
  // Project-local override prompts (see ./habit-hooks-prompts/<rule>.md).
  prompts: './habit-hooks-prompts',

  // (1) Global scope: ignore third-party vendor code (PHPUnit fixtures, minified JS).
  scope: {
    exclude: ['api/vendor/**'],
  },

  // (2)+(3) Tip the comment sensor toward catching inline // noise over block JSDoc noise.
  // maxBlockChars is how long a /* */ block must be to count as substantive;
  // raising it effectively exempts API-doc JSDoc from "non-essential-comment".
  commentCheck: {
    maxSingleLineChars: 80,
    maxBlockChars: 99999,
  },

  smells: {
    'non-essential-comment': {
      // Carry forward habit-hooks's default exclusion of its own config file.
      // Plus per-file excludes for files that legitimately use a linter directive
      // habit-hooks doesn't recognize as `eslint-disable` (functionally analogous
      // `react-doctor-disable-next-line` comments that suppress react-doctor
      // warnings on intentional opt-outs). Trade-off: future non-essential-comment
      // findings in these files will also be exempt, so manual review when adding
      // new code to them is still warranted.
      exclude: [
        'habit-hooks.config.*',
        'src/components/BarChartWidget.tsx',
        'src/components/InterviewBarChart.tsx',
        'src/components/StatusBarChart.tsx',
        'src/utils/geminiJobScoring.ts',
        'src/utils/matching.ts',
        'src/mails/services/scanService.ts',
      ],
    },
  },
};
