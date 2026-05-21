# AGENTS.md - Job Application Tracker Frontend

This document provides comprehensive guidelines for agentic coding assistants working on the Job Application Tracker frontend application and Chrome extension. Follow these instructions carefully to maintain code quality, consistency, and user experience.

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
**State Management**: React Hooks with localStorage persistence

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
3. **Dark Mode**: Use `dark:` prefix for dark mode styles
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
├── job-application-tracker-extension/
│   ├── job-extractors/     # Job extraction system
│   ├── __tests__/          # Extension tests
│   ├── background.ts       # Service worker
│   ├── content.ts          # Content script
│   ├── popup.tsx           # Popup React component
│   └── manifest.json       # Extension manifest
├── api/                    # PHP backend endpoints
├── public/                 # Static assets
├── .env.local              # Environment variables (gitignored)
└── package.json
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

- ✅ Run tests: `npm test` (all 308 tests should pass)
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

