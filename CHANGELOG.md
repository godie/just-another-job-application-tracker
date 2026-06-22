# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- CVE Lite GitHub Actions workflow — scans for vulnerable dependencies on every PR and push to `main` (`--fail-on critical`)
- React Doctor GitHub Actions workflow — automated code health checks (security, performance, accessibility, bundle-size, architecture)
- `engines` field to `package.json` — declares Node.js 22.x and npm 10.9.2 runtime requirements
- `packageManager` field to `package.json` — pins npm@10.9.2

### Changed
- **Accessibility & HTML compliance**
  - Converted modal wrappers from generic `<div>` to semantic `<dialog>` elements across all modals (`AddJobForm`, `GeminiKeyModal`, `MatchBreakdownModal`, `OnboardingWizard`, `ProfileSetupModal`)
  - Added `type="button"` to ~30+ buttons that were previously defaulting to `type="submit"`, preventing accidental form submissions
  - Added `aria-label` attributes to inputs, buttons, and settings controls throughout the app
  - Converted `KanbanView` cards from interactive `<div role="button">` to real `<button>` elements
- **Pagination** — `ApplicationTable` and `TimelineView` now derive `effectivePage` via `useMemo` instead of resetting via `useEffect`, eliminating a render-cycle desync
- **Auth modal** — migrated from 6× `useState` hooks to `useReducer` for cleaner state transitions
- **Import hygiene** — replaced barrel imports (`./ui`) with direct imports (`./ui/Button`, `./ui/Card`, etc.) across 30+ components for better tree-shaking
- **Footer** — moved `currentYear` to module-level constant, eliminating unnecessary state
- **AddJobForm** — default date set in `useState` initializer instead of a mount `useEffect`, removing a flicker frame
- **FiltersBar** — search term initialization refactored to avoid derived-state diagnostic
- **Dependencies**
  - `vitest` 3.2.4 → 4.1.0
  - `vite` 7.3.2 → 7.3.5
  - `dompurify` 3.4.2 → 3.4.11
  - `@vitest/coverage-v8` 3.2.4 → 4.1.0
  - `@vitejs/plugin-react` lockfile refreshed

### Fixed
- **Keyboard handlers** — restored 3 keyboard shortcuts accidentally dropped during the modal refactor:
  - `MatchBreakdownModal`: Escape key dismissal via `useKeyboardEscape` hook
  - `GeminiKeyModal`: Enter-to-submit
  - `ProfileSetupModal`: Ctrl/Cmd+Enter submit
- **Pagination UI desync** — pagination buttons now use `effectivePage` instead of `currentPage` for highlight and disabled state, preventing stale page indicators when data shrinks below `currentPage`
- **`useGoogleToken`** — added `useRef` guard to ensure token check executes only once per hook instance
- **Vitest worker crash** — added `pool: 'forks'` to vitest config to prevent "Worker exited unexpectedly" errors in vitest 4.x

### Removed
- Dead code flagged by knip:
  - `src/hooks/useApplicationFiltersState.ts`
  - `src/hooks/useJobForm.ts`
  - `src/seo/index.ts`

### Security
- Fixes critical CVE-2026-47429 in vitest (arbitrary file read via Vitest UI server)
- Fixes high CVE-2026-53571 and CVE-2026-53632 in vite (`server.fs.deny` bypass, NTLMv2 hash disclosure)
- Fixes medium CVE-2026-49458, CVE-2026-49459, and CVE-2026-49978 in dompurify (XSS bypasses via IN_PLACE mode and shadow DOM)
- Fixes low CVE-2026-49356 in `@babel/core` (arbitrary file read via sourceMappingURL)
