# AGENTS.md - Job Application Tracker Frontend

This document provides comprehensive guidelines for agentic coding assistants working on the Job Application Tracker frontend application and Chrome extension. Follow these instructions carefully to maintain code quality, consistency, and user experience.

## Versioning

**Every PR MUST bump `package.json` version exactly once, at PR-open time. Follow-up commits within the same branch MUST NOT re-bump** — they ship under the same version as the PR-opening bump. One branch, one version.

Use SemVer to pick the bump size for the whole branch:

- **PATCH** (`x.y.Z` → `x.y.Z+1`): bug fixes, internal refactors, docs, dependency churn with no API change. Pick PATCH if the branch's headline change is described as a "fix" in the request.
- **MINOR** (`x.Y.z` → `x.Y+1.z`): new features, new components or API surface, user-visible UX additions. Pick MINOR if the branch introduces something a user can see or do that they could not before.
- **MAJOR** (`X.y.z` → `X+1.y.z`): breaking changes to public API, removed features, schema migrations.

The single bump **lives at the tip of the branch and is set when the branch is cut or the first commit lands.** Add the matching entry to `CHANGELOG.md` in that same first commit. This repo's convention is to use a dated `## [<version>]` heading directly (e.g. `## [2.6.0] - 2026-07-03`); `## [Unreleased]` is also acceptable per Keep-a-Changelog, but the existing entries in this file all use the dated form so prefer that for consistency. Subsequent commits in the branch amend the same version's bullet list (added files, follow-up fixes, new tests) but never the version number — at release time the version heading is already the date stamp, no further promotion is needed.

If you're unsure between PATCH and MINOR, ask the user. A feature with no breaking surface is MINOR unless explicitly described as a "fix" in the request.

### Why per-PR, not per-commit

Avoids the 2.6.0 → 2.6.1 micro-bumps that fire on every follow-up fix in the same branch. One logical unit of work = one version. Without this rule, follow-up fixes in the same branch (rubber-duck tests, refactors, post-review cleanups) fire 2.6.0 → 2.6.1 → 2.6.2 micro-bumps that the orphan-sweep workflow has to flag every time. The micro-bumps are not a correctness problem but they erode the signal in `CHANGELOG.md` and break the per-PR audit invariant the workflow is designed to enforce.

### Allow-listed files (legitimate non-current version references)

The per-PR bump rule applies prospectively to **first-party sources**. The following files may legitimately reference a non-current version and are excluded from any orphan sweep:

- **`CHANGELOG.md`** — historical release headings (`## [2.4.2] - 2026-06-24`, etc.) are the immutable record of what actually shipped at that version. The current work-in-progress lives at `## [Unreleased]` and gets promoted to a dated heading at release time. **Do not retroactively edit past entries.**
- **`package-lock.json` and `api/composer.lock`** — third-party packages whose own versions happen to coincide numerically with our project version (e.g. `ramsey/uuid` upstream at `"4.2.0"` is unrelated to our `2.5.x`). These are dependency versions, **not** project version references. Match literal `2.4.2` in a lockfile is expected and should not trigger a sweep failure.
- **`api/vendor/**`** — generated composer vendor tree. Mirrors `composer.lock`; never hand-edit. Excluded for the same reason as lockfiles.

When adding a new allow-list entry, document the rationale inline so future maintainers don't second-guess the sweep result. Anything outside this list that contains an outdated version literal is a real orphan and should be synced to the current `package.json` version.

### GitHub Actions pin renewal

GitHub Actions references (e.g. `actions/checkout@v4`, `shivammathur/setup-php@2.37.2`) MUST be pinned to a specific tag, never to a floating major. Pin renewal is automated by Dependabot — see `.github/dependabot.yml` for the schedule, grouping, and merge policy. Do not duplicate that schedule in prose here; that file is the single source of truth and this subsection is the entry point for a future maintainer who needs to know *why* the pins are pinned and *where* the renewal lives.

#### Use `tag_name` from `/releases/latest` exactly as-is

A `tag_name` from the GitHub Releases API (`/repos/<owner>/<repo>/releases/latest`) may or may not include a leading `v`. Some upstreams (e.g. `actions/checkout`) use the `v` prefix (`v4`); others (e.g. `shivammathur/setup-php`) do not (`2.37.2`). Prepending a `v` to a tag that does not have one is the most common pin-typo and produces the cryptic `##[error]Unable to resolve action <owner>/<repo>@v<X.Y.Z>, unable to find version v<X.Y.Z>` in CI.

Before pinning, verify the tag actually exists on the upstream — the API can return tags that have been re-pointed or retracted, and a successful `/releases/latest` response does not guarantee the tag ref still exists:

```bash
git ls-remote --tags https://github.com/<owner>/<repo>.git | rg -F '<exact-tag>'
```

Use the tag returned by the API character-for-character. Do not normalize, prefix, or "modernize" it. If a Dependabot PR proposes a different format, fix the upstream first, not the pin. This is a real production-discoverable bug — the v2.6.0 release cycle's `shivammathur/setup-php@v2.37.2` typo broke the Deploy workflow until the `v` was dropped to `2.37.2`.

### CHANGELOG heading format

Every release heading is `## [<version>] - YYYY-MM-DD` (e.g. `## [2.6.0] - 2026-07-03`). The four-digit year, two-digit month, two-digit day, and the literal ` - ` (space-dash-space) separator are non-negotiable. Future maintainers must not drift to `## [2.6.0] (July 3, 2026)`, `## [2.6.0] / 2026-07-03`, or any other date separator. An optional trailing annotation in parentheses is allowed for context (e.g. `## [2.3.1] - 2026-06-22 (later)` documents that the patch shipped the same day as 2.3.0, after the minor); the canonical example still has no annotation, so prefer that.

Empirical baseline (post 2.6.0 sweep): `rg '2\.6\.0'` against the repo excluding `node_modules`, `api/vendor`, lockfiles, `audit/`, `package.json`, `.git`, and `## [2.6.0]` in `CHANGELOG.md` returns zero matches — so the rule has zero orphans as of this writing. Prefer the live `scripts/check-orphans.sh` (it has the full allow-list and rc-aware error handling) over hand-rolled `rg`; this baseline is just for documentation.

### Lessons learned from the 2.6.0 release cycle

The per-PR rule was first exercised end-to-end on the orphan-sweep release (v2.6.0, 2026-07-03). That PR cut seven follow-up commits in a row to repair the workflow and land the release cleanly (rg install, `GITHUB_OUTPUT` heredoc-format migration, `ORPHAN_COUNT` newline strip, `orphan-sweep` label provisioning, `VERSION` trailing-newline strip, temp-trigger removal, leftover-probe cleanup) — and all seven stayed at 2.6.0. The `release.published` event then fired the orphan-sweep workflow for the first time on a real release, and the sweep came back clean (`✅ Orphan sweep clean for v2.6.0.`). The rule is now self-validating: any new PR that introduces a per-commit micro-bump within a branch will be flagged by the workflow the next time it runs, because the workflow is the very mechanism that enforces the rule.

If you find yourself about to bump 2.6.0 → 2.6.1 inside a follow-up commit, **stop**. Either the change belongs in a new PR with a deliberate version (PATCH for docs/fixes/refactors, MINOR for user-visible features), or it does not warrant a version bump at all and should ship under 2.6.0 — the orphan-sweep workflow will not flag it, and `CHANGELOG.md` should still record the commit under the 2.6.0 heading. The same rule applies to 2.7.x, 2.8.x, etc.: one branch, one version, enforced by the sweep.

## Contribution Workflow

**All changes land via a pull request. Direct pushes to `main` are forbidden.** This applies to human contributors and to coding agents (Codebuff, GitHub Copilot, etc.) operating in this repo.

### Rule

- **On a feature branch**: push the branch, open a PR against `main`, wait for CI + review, then merge.
- **On `main` directly**: cut a descriptive branch first (`git checkout -b <type>/<descriptive-name>`, e.g. `fix/typo-in-readme`, `docs/agent-contribution-workflow-rule`, `chore/bump-deps`), commit your work, push the branch, and open a PR. **Never `git push origin main` from a local `main` checkout.**

This rule is self-applying: the change that introduced it (v2.6.1) was made on a feature branch and opened as a PR. Future contributors — including AI agents — should follow the same path.

### Why

- PRs give CI a chance to run lint, build, test, and `knip` **before** the change lands. Failures surface as PR comments, not as a broken `main`.
- PRs leave an audit trail (review comments, CI logs) tied to a specific change set, which is critical when a regression needs to be bisected weeks later.
- Direct pushes to `main` bypass branch protection, required reviewers, and the per-PR version rule (see `## Versioning` above). They also break the "one branch, one version" invariant the orphan-sweep workflow is designed to enforce.
- A clean `main` is a precondition for the `release.published` trigger firing the orphan-sweep workflow reliably.

### Edge cases (legitimate non-contributor pushers)

A small number of automation tools and GitHub-native features act on `main` outside the PR flow. These are not covered by the rule above and are not the responsibility of contributors to police:

- **Dependabot** opens its own PRs (does not push to `main`).
- **The orphan-sweep workflow** runs on `release.published` and `schedule` triggers; it does not push — it only reads files, runs `scripts/check-orphans.sh`, and creates or updates a tracking issue via `gh issue`.
- **Release tooling** (when it exists) that pushes a tag to `main` is acting as the release manager, not as a contributor. Tag pushes are not branch pushes and are explicitly out of scope for this rule.
- **Pre-authorized GitHub Actions tokens** (e.g. dependabot's auto-merge bot) operate under the repo admin's explicit grant. These are pre-audited and not human-driven.

If you are a human or an AI agent making a code or docs change, the rule above applies to you. If you are unsure whether your action counts as a "direct push to main", it probably does — open a PR.

## Specialized Agents

### 🕵️ Colector (Collector)
**Role**: Specialist in Job Data Extraction.
**Responsibilities**:
- Implement and refine `JobExtractor` modules for various job boards.
- Ensure high accuracy in capturing position, company, location, salary, and description.
- Maintain multi-language support, specifically ensuring English and Spanish keywords are correctly handled.
- Regularly update CSS selectors to adapt to job board changes.
- Validate extraction logic against real-world HTML samples.

## Project Overview

**Framework**: React 19 with TypeScript 5.9+
**Build Tool**: Vite 7
**Styling**: Tailwind CSS 4 (utility-first)
**Testing**: Vitest with React Testing Library (TDD approach)
**Test Environment**: happy-dom
**Code Quality**: ESLint with TypeScript ESLint
**Architecture**: Single Page Application (SPA) with Chrome Extension support
**State Management**: Zustand with localStorage persistence

## Build, Lint, and Test Commands

### Primary Commands (run from project root)

```bash
# Run development server
npm run dev

# Run all tests
npm test

# Run tests in watch mode (recommended for TDD)
npm run test:watch

# Run tests with coverage
npm run test:cov

# Build for production
npm run build

# Chrome extension is now an independent project in ../job-application-tracker-extension

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Preview production build
npm run preview
```

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests in watch mode (in separate terminal)
npm run test:watch

# Build before committing
npm run build
npm run lint
npm test
```

## Code Style Guidelines

### TypeScript/React Standards

1. **Functional Components**: Always use functional components with hooks (no class components)
2. **Type Safety**: Always use TypeScript types and interfaces - avoid `any` type
3. **File Organization**: One component per file, named exports preferred
4. **Imports**: Group imports by type (external libraries, internal modules, types, styles) with blank lines between groups

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertType } from '../components/Alert';
import { saveApplication } from '../storage/applications';

import type { JobApplication } from '../types/applications';
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ApplicationTable`, `TimelineView`)
- **Functions/Variables**: camelCase (e.g., `extractJobData`, `userPreferences`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`, `DEFAULT_PREFERENCES`)
- **Types/Interfaces**: PascalCase (e.g., `JobApplication`, `UserPreferences`)
- **Files**: Match component/export name (e.g., `ApplicationTable.tsx`, `applications.ts`)

### Component Patterns

1. **Component Structure**: Functional component with TypeScript interface for props
2. **Hooks Usage**: Use hooks at the top level, not inside conditionals or loops
3. **State Management**: Prefer `useState` for local state, context for shared state
4. **Effects**: Always include dependencies in `useEffect` dependency arrays
5. **Cleanup**: Clean up subscriptions, timers, and event listeners in `useEffect` cleanup functions

```typescript
import React, { useState, useEffect } from 'react';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onAction }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCount(c => c + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

### Styling with Tailwind CSS

1. **Utility-First**: Use Tailwind utility classes directly in JSX
2. **Responsive Design**: Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
3. **Dark Mode**: Use `dark:` prefix for dark mode
4. **Consistency**: Follow existing patterns for spacing, colors, and typography
5. **Avoid Inline Styles**: Prefer Tailwind classes over inline styles (except for dynamic values)

```typescript
<div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-gray-800">
  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
    Click me
  </button>
</div>
```

### Type Definitions

1. **Type Files**: Keep types in `src/types/` directory organized by domain
2. **Barrel Exports**: Use `index.ts` files for clean imports
3. **Interface vs Type**: Prefer `interface` for object shapes, `type` for unions and intersections
4. **Optional Properties**: Use `?` for optional properties
5. **Readonly**: Use `readonly` for immutable properties when appropriate

```typescript
// src/types/applications.ts
export interface JobApplication {
  id: string;
  position: string;
  company: string;
  status: ApplicationStatus;
  applicationDate?: string;
  timeline?: TimelineEvent[];
}

export type ApplicationStatus = 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn';
```

### Storage Patterns

1. **Storage Modules**: Keep storage logic in `src/storage/` directory
2. **Error Handling**: Always handle localStorage errors (quota exceeded, etc.)
3. **Migration**: Support data migration for schema changes
4. **Type Safety**: Use TypeScript types for storage operations
5. **Default Values**: Provide sensible defaults when reading from storage

```typescript
// src/storage/applications.ts
import type { JobApplication } from '../types/applications';
import { STORAGE_KEY } from '../utils/constants';

export function getApplications(): JobApplication[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading applications from storage:', error);
    return [];
  }
}

export function saveApplication(application: JobApplication): void {
  try {
    const applications = getApplications();
    applications.push(application);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch (error) {
    console.error('Error saving application to storage:', error);
    throw error;
  }
}
```

### Testing Standards

1. **Test-Driven Development (TDD)**: Write tests before or alongside implementation
2. **Test Structure**: Use `describe` blocks for grouping, `it` or `test` for individual tests
3. **Naming**: Use descriptive test names that explain what is being tested
4. **Assertions**: Use React Testing Library queries (`getByRole`, `getByText`, etc.) for user-centric testing
5. **Mocks**: Mock external dependencies (localStorage, Chrome APIs, Google OAuth)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('renders the title correctly', () => {
    render(<Component title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', () => {
    const handleAction = vi.fn();
    render(<Component title="Test" onAction={handleAction} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
```

### Chrome Extension Patterns

1. **Content Scripts**: Use content scripts for DOM manipulation on job board pages
2. **Background Scripts**: Use service workers for background tasks and message routing
3. **Popup Components**: Build popup UI with React components
4. **Storage API**: Use `chrome.storage.local` for extension data persistence
5. **Message Passing**: Use `chrome.runtime.sendMessage` for communication between scripts

```typescript
// job-application-tracker-extension/content.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobData') {
    const jobData = extractJobData();
    sendResponse({ data: jobData });
  }
  return true; // Keep message channel open for async response
});
```

### Job Extractor Patterns

1. **Interface Implementation**: All extractors must implement the `JobExtractor` interface
2. **Multiple Selectors**: Use multiple CSS selectors as fallbacks (job boards change HTML frequently)
3. **Error Handling**: Wrap extraction logic in try-catch blocks
4. **Text Truncation**: Limit description to 1000 characters
5. **Date Parsing**: Handle various date formats (English, Spanish, ISO, etc.)

```typescript
// job-application-tracker-extension/job-extractors/WorkableJobExtractor.ts
export class WorkableJobExtractor implements JobExtractor {
  readonly name = 'Workable';

  canHandle(url: string): boolean {
    return url.includes('apply.workable.com');
  }

  extractJobTitle(): string {
    const titleSelectors = [
      'h1[class*="title"]',
      'meta[property="og:title"]',
      'h1',
    ];
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return '';
  }

  extract(): JobData {
    const data: JobData = {};
    try {
      data.position = this.extractJobTitle();
      // ... more extraction
    } catch (error) {
      console.error('Error extracting job data:', error);
    }
    return data;
  }
}
```

## File Structure Expectations

```
job-application-tracker/
├── src/
│   ├── components/          # React components (one per file)
│   ├── pages/              # Page-level components
│   ├── layouts/            # Layout components (MainLayout, etc.)
│   ├── types/              # TypeScript type definitions
│   ├── storage/            # localStorage operations
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── services/           # External service integrations
│   ├── tests/              # Test files
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Application entry point
├── api/                    # PHP backend endpoints (OverPHP framework)
├── public/                 # Static assets
├── .env.local              # Environment variables (gitignored)
└── package.json

# Chrome extension is now an independent project:
# ../job-application-tracker-extension/
```

## Common Patterns

### Alert System

Use the AlertProvider context for user notifications:

```typescript
import { useAlert } from '../components/AlertProvider';

const { showAlert } = useAlert();
showAlert('success', 'Application saved successfully!');
```

### Form Handling

Handle form submissions with validation:

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.position || !formData.company) {
    showAlert('error', 'Please fill in required fields');
    return;
  }
  // Process form data
};
```

### Date Formatting

Use the date utility for consistent date formatting:

```typescript
import { formatDate } from '../utils/date';

const formattedDate = formatDate(dateString, userPreferences.dateFormat);
```

### Dark Mode

Access theme state and toggle:

```typescript
import { useTheme } from '../hooks/useTheme'; // If using custom hook
// Or access via document.documentElement.classList.contains('dark')
```

## Security Best Practices

1. **Environment Variables**: Use `VITE_` prefix for environment variables (exposed to client)
2. **XSS Protection**: Sanitize user input, especially when rendering HTML
3. **Token Storage**: Never store OAuth tokens in localStorage - use HTTP-only cookies via backend
4. **Content Security Policy**: Be aware of CSP restrictions in Chrome extensions
5. **Input Validation**: Validate all user input before processing

## Performance Considerations

1. **Lazy Loading**: Use React.lazy() for code splitting when appropriate
2. **Memoization**: Use `useMemo` and `useCallback` for expensive computations
3. **Debouncing**: Debounce search and filter inputs to reduce re-renders
4. **List Rendering**: Use keys properly in lists, consider virtualization for large lists
5. **Image Optimization**: Optimize images, use appropriate formats

## Quality Assurance Checklist

Before committing code:

- ✅ Run tests: `npm test` (all 868 tests should pass)
- ✅ Run linter: `npm run lint` (no errors, pre-commit hook will check)
- ✅ Build succeeds: `npm run build` (no TypeScript or build errors)
- ✅ Type safety: No `any` types, all functions typed
- ✅ Component props: All props have TypeScript interfaces
- ✅ Error handling: Try-catch blocks for async operations and storage
- ✅ Accessibility: Use semantic HTML, ARIA labels when needed
- ✅ Responsive design: Test on mobile and desktop viewports
- ✅ Dark mode: Verify components work in both light and dark themes
- ✅ Chrome extension: Test extension build if modifying extension code

## Testing Infrastructure

- **Test Runner**: Vitest with happy-dom environment
- **Test Library**: React Testing Library for component testing
- **Mocking**: Comprehensive mocks for localStorage, Chrome APIs, Google OAuth
- **Coverage**: Aim for high test coverage, especially for core functionality
- **TDD**: Write tests before or alongside implementation

## Chrome Extension Specific Guidelines

1. **Manifest Updates**: Update `manifest.json` when adding new content scripts or permissions
2. **Build Command**: Run extension build commands from `../job-application-tracker-extension`
3. **Content Script Isolation**: Remember content scripts run in isolated context
4. **Message Passing**: Use proper message passing patterns for script communication
5. **Storage Sync**: Use `chrome.storage.local` for extension data
6. **Job Extractors**: Register new extractors in `job-extractors/index.ts`

## Git Pre-Commit Hook

The project includes a pre-commit hook that runs ESLint automatically:

- Hook runs `npm run lint` before each commit
- Commits are blocked if linting fails
- Can be bypassed with `--no-verify` (not recommended)
- Manual linting: `npm run lint` or `npm run lint:fix`

## Common Pitfalls to Avoid

1. **Memory Leaks**: Always cleanup timers, subscriptions, and event listeners
2. **State Updates**: Don't mutate state directly, use setState/useState setters
3. **Effect Dependencies**: Include all dependencies in useEffect dependency arrays
4. **Async Errors**: Always handle promise rejections and async errors
5. **Type Safety**: Avoid `any` type, use proper TypeScript types
6. **Storage Errors**: Handle localStorage quota exceeded errors
7. **Extension CSP**: Be aware of Content Security Policy in Chrome extensions

## Documentation

- **README.md**: Main project documentation
- **CHROME_EXTENSION.md**: Chrome extension specific documentation
- **job-application-tracker-extension/job-extractors/README.md**: Job extractor system documentation
- **Code Comments**: Add comments for complex logic and business rules

Remember: Test first, type everything, follow React best practices, maintain consistency with existing code patterns, and prioritize user experience and accessibility.


## CVE Lite CLI

Run `cve-lite . --json` in the project root. The results are saved to `cve-lite-scan-<timestamp>.json` in the current directory.

### Getting scan data

Key fields in each finding:

- `package`, `version` — the vulnerable package
- `severity` — `critical | high | medium | low | unknown`
- `relationship` — `direct | transitive`
- `firstFixedVersion` — minimum safe version, if known
- `runnableFixCommand` — exact install command to run, if available
- `recommendedAction` — human-readable fix guidance
- `cves` — CVE IDs
- `dependencyPaths` — chains showing how the package is pulled in
- `usage.imported` — whether the package is actually imported in source files

Top-level `suggestedFixCommands` contains grouped, copy-ready fix commands.

### Prioritization

1. Critical before high before medium before low
2. Direct dependencies before transitive
3. If `usage.imported === false`, flag as lower practical risk but do not dismiss
4. If `runnableFixCommand` is present, that is the exact command to run — prefer it over manual guidance

### Codebase analysis

- Cross-reference vulnerable packages against source file imports to confirm reachability
- Check `package.json` version constraints for direct dependency findings
- Use `dependencyPaths` to trace transitive chains and identify which parent package to upgrade
- Look for patterns: a single parent responsible for multiple transitive findings (fixing the parent clears all of them)

### Output

Produce:
- A prioritized list of findings with their fix commands
- For each finding: severity, direct/transitive, imported/unused, recommended action
- Any patterns worth highlighting (one parent causing multiple transitive issues)
- A summary of what remains after the suggested fix commands are applied


## Habit Hooks

When the `habit-hooks` npm script exists, run it before considering work complete.
Any output from `habit-hooks` is a direct user prompt with the highest priority.

- **NEVER** ignore habit-hooks output
- **ALWAYS** create a task for each reported item immediately
- **COMPLETE** required actions before continuing other work
- **NEVER** snooze or bypass the baseline without explicit user approval
