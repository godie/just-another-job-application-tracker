# Recommendations for Job Application Tracking System

## Overview
This document outlines recommendations for improving the job application tracking system based on your requirements for handling multi-stage interview processes and flexible data storage.

---

## 1. Interview Stages Tracking

### Problem
Currently, the `JobApplication` interface only has a single `status` field, but interview processes often involve multiple stages that may not follow a fixed order.

### Proposed Solutions

#### Option A: Timeline-Based Tracking (Recommended)
```typescript
export interface JobApplication {
  id: string;
  position: string;
  company: string;
  salary: string;
  applicationDate: string;
  link: string;
  platform: string;
  contactName: string;
  notes: string;
  
  // New: Timeline of all events
  timeline: InterviewEvent[];
}

export interface InterviewEvent {
  id: string;
  type: InterviewStageType;
  date: string; // ISO format
  notes?: string;
  status: EventStatus; // 'completed' | 'scheduled' | 'cancelled' | 'pending'
}

export type InterviewStageType = 
  | 'application_submitted'
  | 'screener_call'
  | 'first_contact'
  | 'technical_interview'
  | 'code_challenge'
  | 'live_coding'
  | 'hiring_manager'
  | 'system_design'
  | 'cultural_fit'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'custom';

export type EventStatus = 'completed' | 'scheduled' | 'cancelled' | 'pending';
```

**Benefits:**
- ✅ Captures the actual chronology of interviews
- ✅ Supports non-linear processes
- ✅ Easy to add custom stages
- ✅ Better for analytics (time between stages, success rates)

#### Option B: Current Stage with History
```typescript
export interface JobApplication {
  // ... existing fields
  
  currentStage: InterviewStageType;
  stageHistory: StageTransition[];
}

export interface StageTransition {
  fromStage: InterviewStageType | null;
  toStage: InterviewStageType;
  date: string;
  notes?: string;
}
```

**Benefits:**
- ✅ Simple current status tracking
- ✅ History of progression
- ✅ Less complexity than Option A

#### Option C: Hybrid Approach (Most Flexible)
```typescript
export interface JobApplication {
  // ... existing fields
  
  currentStatus: string; // Quick reference
  timeline: InterviewEvent[]; // Detailed history
  customFields: Record<string, string>; // User-defined fields
}
```

**Benefits:**
- ✅ Best of both worlds
- ✅ Backward compatible
- ✅ Maximum flexibility

---

## 2. Configurable Data Fields

### Problem
Not all users want to track the same information. Some might not care about salary, others might want to track multiple contacts.

### Proposed Solution

#### Dynamic Field Configuration
```typescript
export interface FieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'checkbox' | 'url';
  required: boolean;
  options?: string[]; // For select types
}

export interface UserPreferences {
  enabledFields: string[]; // IDs of fields to show
  customFields: FieldDefinition[]; // User-defined fields
  columnOrder: string[]; // Custom column arrangement
}

// Store preferences in localStorage or user profile
export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'position', label: 'Position', type: 'text', required: true },
  { id: 'company', label: 'Company', type: 'text', required: true },
  { id: 'salary', label: 'Salary', type: 'text', required: false },
  { id: 'applicationDate', label: 'Application Date', type: 'date', required: false },
  // ... etc
];

export const SUGGESTED_CUSTOM_FIELDS: FieldDefinition[] = [
  { id: 'recruiter-phone', label: 'Recruiter Phone', type: 'text', required: false },
  { id: 'company-size', label: 'Company Size', type: 'select', required: false, options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
  { id: 'remote-hybrid', label: 'Remote/Hybrid', type: 'select', required: false, options: ['Remote', 'Hybrid', 'On-site'] },
];
```

**Implementation Steps:**
1. Create a Settings/Preferences page
2. Allow users to toggle fields on/off
3. Dynamically render table columns based on preferences
4. Support adding custom fields
5. Store preferences in localStorage (or sync with backend when available)

---

## 3. Alternative View Modes

### Problem
The current table view is good for some use cases, but different users prefer different visualizations.

### Proposed Views

#### View 1: Enhanced Timeline View (New)
```
┌─────────────────────────────────────────────────────┐
│  Software Engineer at Google                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ ○ Applied          [Jan 15]                   │  │
│  │ ○ Screener         [Jan 20] ✅                │  │
│  │ ● Technical        [Jan 25] 📅 Scheduled      │  │
│  │ ○ System Design    [Pending]                  │  │
│  │ ○ Final Round      [Pending]                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- Shows interview progress visually
- Great for seeing what's next
- Timeline-based navigation

#### View 2: Kanban Board (New)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Applied    │  Interview   │   Pending    │    Offer     │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Google SWE   │ Amazon SDE   │ Meta SWE     │  Stripe SE   │
│ Microsoft    │              │              │              │
│              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Benefits:**
- Quick status overview
- Drag-and-drop reordering
- Visual workflow

#### View 3: Calendar View (New)
```
        January 2025
  Mon  Tue  Wed  Thu  Fri
                 1    2
  6    7    8    9    10
  13   14   15 [16]   17   ← Technical Interview
  20   21   22   23    24
```

**Benefits:**
- See what's coming up
- Plan ahead
- Never miss an interview

#### View 4: Enhanced Table View (Improved)
- Add filtering by stage, date, company
- Add sorting by multiple columns
- Add quick actions (reschedule, cancel, mark complete)
- Add visual indicators for status (color coding, icons)

---

## 4. Integration with Google Sheets

### Architecture Considerations

#### Option A: Read-Only Sync (Easy)
```typescript
// Backend service to sync from Google Sheets
export const syncFromGoogleSheets = async (accessToken: string) => {
  const sheets = google.sheets({ version: 'v4', auth: accessToken });
  // Read data from sheet
  // Convert to JobApplication format
  // Save to localStorage
};
```

#### Option B: Two-Way Sync (Medium)
- Requires conflict resolution strategy
- Handle concurrent edits
- Version tracking

#### Option C: Google Sheets as Primary Storage (Advanced)
- Store all data in Sheets
- Use Sheets API for all operations
- Requires proper authentication setup

### Implementation Plan
1. **Phase 1**: User connects Google account → Store credentials securely
2. **Phase 2**: Create/use existing Google Sheet with predefined structure
3. **Phase 3**: Implement one-way sync (App → Sheets or Sheets → App)
4. **Phase 4**: Add two-way sync with conflict resolution
5. **Phase 5**: Add real-time updates using Google Sheets API webhooks

---

## 5. Data Migration Strategy

### Backward Compatibility
```typescript
// Migration function to update existing data
export const migrateApplicationData = (oldApp: any): JobApplication => {
  return {
    ...oldApp,
    timeline: [
      {
        id: generateId(),
        type: 'application_submitted',
        date: oldApp.applicationDate,
        status: 'completed'
      }
    ],
    currentStatus: oldApp.status || 'application_submitted'
  };
};
```

### Gradual Rollout
1. Support both old and new formats during transition
2. Auto-migrate when user edits applications
3. Provide migration tool in settings
4. Keep backup of old data

---

## 6. Recommended Implementation Order

### Phase 1 (Current): Google Auth ✅
- [x] Implement Google OAuth with @react-oauth/google
- [x] Store authentication state
- [x] Update UI to reflect login status

### Phase 2 (Completed): Enhanced Data Model ✅
- [x] Create new `InterviewEvent` interface
- [x] Add `timeline` array to `JobApplication`
- [x] Create migration utility for existing data
- [x] Update `localStorage` utilities
- [x] Support custom interview stage types
- [x] Add interviewer name tracking

### Phase 3 (Completed): Timeline View ✅
- [x] Create new Timeline component
- [x] Add view switcher (Table/Timeline/Kanban/Calendar)
- [x] Implement event creation/editing
- [x] Add event status indicators
- [x] Timeline editor with full CRUD operations
- [x] Visual timeline with status badges

### Phase 4 (Completed): Configurable Fields ✅
- [x] Create Settings page with section navigation
- [x] Implement field configuration UI (show/hide, reorder columns)
- [x] Update table to use dynamic columns based on preferences
- [x] Support custom fields with full CRUD operations
- [x] Add default view selection (Table/Timeline/Kanban/Calendar)
- [x] Add date format preferences (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- [x] Create comprehensive unit tests for Settings page
- [x] Implement preferences persistence in localStorage

### Phase 5 (Completed): Google Sheets Integration ✅
- [x] Implement OAuth with Google Sheets scope
- [x] Create sheet template with predefined structure
- [x] Implement one-way sync (App → Sheets)
- [x] Add sync status indicator and error handling
- [x] Create PHP backend proxy for secure API calls
- [x] Google Sheets sync component with UI controls

### Phase 6 (Completed): Advanced Views ✅
- [x] Kanban board implementation with sub-status grouping
- [x] Calendar view implementation with relative time indicators
- [x] Enhanced table view with filters and search
- [x] View persistence in localStorage
- [x] Responsive design improvements
- [ ] Analytics dashboard (Future)
- [ ] Export functionality (Future)

### Phase 7 (Completed): Soft Delete & Confirmation ✅
- [x] Implement soft delete (mark as "Deleted" instead of removing)
- [x] Create ConfirmDialog component with warning style
- [x] Replace browser confirm() with custom confirmation modal
- [x] Auto-filter deleted applications from all views
- [x] Success notifications on delete actions

### Phase 8 (Completed): Chrome Extension - LinkedIn Job Capture ✅
- [x] Create Chrome extension manifest (Manifest V3)
- [x] Implement content script for LinkedIn job data extraction
- [x] Build React popup component for reviewing/editing captured data
- [x] Create background service worker for cross-tab communication
- [x] Implement chrome.storage.local for data persistence
- [x] Add sync functionality with web application
- [x] Create Opportunities page in web app
- [x] Implement conversion from opportunity to application
- [x] Add navigation between Applications and Opportunities views
- [x] Create comprehensive unit tests for extension components
- [x] Document extension architecture and usage

### Phase 9 (Completed): Legal Compliance & Bug Fixes ✅
- [x] Create Terms of Service page (`/terms.html`) with bilingual support (English/Spanish)
- [x] Update Privacy Policy page (`/privacy.html`) with bilingual support (English/Spanish)
- [x] Implement interactive language switcher with tab-based UI
- [x] Add persistent language preference storage (localStorage)
- [x] Set English as default language for legal pages
- [x] Add legal page links to footer (Terms of Service and Privacy Policy)
- [x] Fix default status issue in AddJobComponent (now defaults to "Applied" instead of "unknown")
- [x] Fix TimelineEditor test mocks to include getPreferences function
- [x] Ensure all legal pages are ready for Google OAuth verification
- [x] Update footer text to English for consistency

### Phase 10 (Completed): Dark Mode & UI Improvements ✅
- [x] Implement full dark mode support with theme toggle in sidebar
- [x] Add theme persistence in localStorage with automatic initialization
- [x] Apply dark mode styles to all components (Header, Sidebar, Tables, Forms, Modals, etc.)
- [x] Configure Tailwind CSS v4 dark mode with `@custom-variant dark`
- [x] Add inline script in index.html to prevent flash of unstyled content (FOUC)
- [x] Implement theme toggle switch with sun/moon icons
- [x] Update all page components with dark mode styling
- [x] Add comprehensive tests for dark mode functionality (Theme.test.tsx, DarkModeIntegration.test.tsx)
- [x] Fix all broken tests (47 failed → 0 failed) by switching from jsdom to happy-dom
- [x] Add AlertProvider wrappers to all test files that need it
- [x] Update test suite coverage (251 tests passing, 34 skipped)

### Phase 11 (Completed): Mobile-First Responsive Design & Insights ✅
- [x] Implement responsive header with adaptive title (logo/icon, JAJAT, full title)
- [x] Add mobile-optimized login button with Google "G" icon
- [x] Create compact metrics summary (3 cards per row on mobile)
- [x] Implement mobile card view for application table
- [x] Maintain desktop table view for larger screens
- [x] Fix Insights page interview event detection logic
- [x] Add "Interviews by Type" chart to Insights page
- [x] Improve responsive breakpoints and touch targets
- [x] Optimize spacing and typography for mobile devices

### Phase 12 (Completed): Internationalization & Localization ✅
- [x] Implement `i18next` and `react-i18next` for framework-level i18n
- [x] Create bilingual translation files (English/Spanish)
- [x] Implement automatic language detection (browser/localStorage)
- [x] Add dynamic translation for statuses, interview stages, and field types
- [x] Update all UI components to use translation hooks
- [x] Comprehensive test coverage for bilingual legal pages

### Phase 13 (Completed): Community Support & Suggestions ✅
- [x] Create a dedicated Support page with donation links
- [x] Implement a suggestions form for community feedback
- [x] Build a lightweight PHP backend for suggestion storage (SQLite)
- [x] Implement a numeric CAPTCHA system to prevent automated spam
- [x] Add bilingual support for the suggestion system

### Phase 14 (Completed): Direct ATS Search ✅
- [x] Implement Direct ATS Search component on Opportunities page
- [x] Support major platforms: Ashby, Greenhouse, Lever, Workable, Workday, Teamtailor, iCIMS
- [x] Add configurable search filters (roles, keywords, location)
- [x] Persistence of search filters in user preferences
- [x] "Search All" functionality with delayed tab opening

### Phase 15 (Completed): State Management Migration ✅
- [x] Implement Zustand for global state management
- [x] Create dedicated stores: `applicationsStore`, `opportunitiesStore`, `preferencesStore`, `authStore`
- [x] Migrate all core components from prop-drilling to store-based access
- [x] Implement middleware for local storage persistence within stores
- [x] Centralize data migration and sanitization logic in the store layer

**Future Enhancements for Chrome Extension:**
- [x] Support for additional job boards:
  - [x] Greenhouse (greenhouse.io) ✅
  - [x] AshbyHQ (ashbyhq.com) ✅
  - [x] Workable (workable.com) ✅
  - [x] Lever (lever.co) ✅
  - [ ] Workday (workday.com)
  - [ ] Indeed
  - [ ] Glassdoor
  - [ ] Other ATS/HR systems
- [ ] Batch capture (save multiple jobs at once)
- [ ] Direct application from extension
- [ ] Custom field mapping per site
- [ ] Notification when new opportunities are captured
- [ ] Export/import opportunities
- [ ] Extension detection and installation prompt:
  - [ ] Detect when Chrome extension is not installed
  - [ ] Show banner/notification in web app suggesting installation
  - [ ] Provide direct link to Chrome Web Store (when published)
  - [ ] Show installation instructions for development/testing
  - [ ] Display helpful message explaining benefits of the extension
- [ ] Video mini-tutorial:
  - [ ] Create short video tutorial (2-3 minutes) demonstrating:
    - How to install the extension
    - How to capture a job from LinkedIn
    - How to review/edit captured data in popup
    - How to sync with web application
    - How to convert opportunity to application
  - [ ] Embed video in Opportunities page or dedicated help section
  - [ ] Add video link to extension popup for first-time users
  - [ ] Include step-by-step screenshots as alternative to video

---

## 7. Technical Considerations

### State Management
**Status: ⚠️ Needed for Future Scaling**

The application currently uses React hooks (useState, useEffect) and localStorage for state management. As the app grows and becomes more complex, consider implementing a state management solution:

**Recommended Approaches:**

#### Option A: Context API (Lightweight)
Good for medium-sized apps with shared state across components:
```typescript
// Context for preferences
export const PreferencesContext = createContext<{
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}>();

// Context for applications
export const ApplicationsContext = createContext<{
  applications: JobApplication[];
  setApplications: (apps: JobApplication[]) => void;
  refreshApplications: () => void;
}>();
```

#### Option B: Zustand (Recommended)
Lightweight, simple state management library perfect for React:
```typescript
import { create } from 'zustand';

interface AppState {
  applications: JobApplication[];
  preferences: UserPreferences;
  setApplications: (apps: JobApplication[]) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  applications: [],
  preferences: DEFAULT_PREFERENCES,
  setApplications: (apps) => set({ applications: apps }),
  updatePreferences: (prefs) => set((state) => ({
    preferences: { ...state.preferences, ...prefs }
  })),
}));
```

**Benefits of State Management:**
- ✅ Centralized state reduces prop drilling
- ✅ Easier to sync state across components
- ✅ Better performance with selective re-renders
- ✅ Easier to implement real-time updates
- ✅ Simplifies testing and debugging
- ✅ Better support for optimistic updates

**When to Implement:**
- When prop drilling becomes excessive (> 3 levels)
- When state synchronization becomes complex
- When adding real-time features (websockets, polling)
- When implementing undo/redo functionality
- When building collaborative features

### Performance
- ✅ Component memoization with React.memo for presentational components
  - ApplicationTable, KanbanView, TimelineView, CalendarView
  - StatCard, ViewSwitcher, BottomNav, Footer
  - StatusBarChart, InterviewBarChart
- Virtualize long lists (react-window or react-virtualized)
- Debounce search/filter inputs ✅
- Lazy load views
- IndexedDB for large datasets

### Testing
- ✅ Add tests for migration utilities
- ✅ Test with various interview stage combinations
- ✅ Test custom field rendering
- ✅ Integration tests for Google Sheets sync
- ✅ Dark mode functionality tests (Theme.test.tsx, DarkModeIntegration.test.tsx)
- ✅ Sidebar navigation and theme toggle tests
- ✅ Test infrastructure improvements (jsdom → happy-dom for better compatibility)
- ✅ All tests passing (348 tests)

### Security
- Never store OAuth tokens in localStorage (use secure storage)
- Validate all user inputs
- Sanitize data before saving
- Implement rate limiting for API calls

---

## Summary

**Completed Features:**
1. ✅ Google Auth with secure cookie storage
2. ✅ Timeline-based tracking (Option C: Hybrid Approach)
3. ✅ Timeline data model with migration utility
4. ✅ Multiple view modes (Table, Timeline, Kanban, Calendar)
5. ✅ Smart filters and search with persistence
6. ✅ Soft delete with confirmation dialogs
7. ✅ Custom alert system
8. ✅ Responsive design improvements
9. ✅ Kanban sub-status grouping for Interviewing stage
10. ✅ Calendar with today highlighting and relative time indicators
11. ✅ Google Sheets integration with one-way sync
12. ✅ Secure PHP proxy for Google Sheets API
13. ✅ Sync status tracking and error handling
14. ✅ Chrome Extension for LinkedIn job capture
15. ✅ Opportunities page for managing captured jobs
16. ✅ Unit tests for Chrome extension components
17. ✅ Configurable Settings page with section navigation
18. ✅ Table fields configuration (show/hide, reorder)
19. ✅ Default view selection preference
20. ✅ Date format preferences
21. ✅ Custom fields management (create, edit, delete)
22. ✅ Comprehensive unit tests for Settings page
23. ✅ Terms of Service page (bilingual: English/Spanish with interactive switcher)
24. ✅ Privacy Policy page (bilingual: English/Spanish with interactive switcher)
25. ✅ Language switcher with persistent preference (localStorage)
26. ✅ Legal compliance for Google OAuth verification
27. ✅ Bug fix: Default status now correctly set to "Applied" in new entries
28. ✅ Test fix: TimelineEditor tests now properly mock getPreferences function
29. ✅ **Dark mode implementation** with theme toggle in sidebar
30. ✅ **Theme persistence** in localStorage with automatic initialization
31. ✅ **Full dark mode styling** across all components and pages
32. ✅ **Tailwind CSS v4 dark mode** configuration with custom variant
33. ✅ **Comprehensive dark mode tests** (Theme.test.tsx, DarkModeIntegration.test.tsx)
34. ✅ **Test infrastructure improvements** (jsdom → happy-dom, all tests passing)
35. ✅ **Sidebar navigation** with theme toggle and opportunities badge
36. ✅ **MainLayout restructure** with sidebar and header separation
37. ✅ **Mobile-first responsive design** with adaptive header, compact metrics, and card-based table view
38. ✅ **Insights page improvements** with fixed interview detection and new visualizations
39. ✅ **Chrome Extension - Workable support** with comprehensive extractor implementation
40. ✅ **Chrome Extension - Lever.co support** with comprehensive extractor implementation and tests
41. ✅ **Performance optimizations** with React.memo for presentational components (StatCard, ViewSwitcher, BottomNav, Footer, StatusBarChart, InterviewBarChart)
42. ✅ **Backend API as mini-framework** (Router, controllers, helpers; single entry point `api/index.php`)
43. ✅ **OAuth authorization-code flow + token refresh** (backend stores refresh token, auto-refreshes access for Sheets/Gmail)
44. ✅ **JobApplication location, workType, hybridDaysInOffice** (form, table, opportunity conversion)
45. ✅ **Email Scan (Gmail)** in Settings: preview and apply selected additions/updates; rate-limit handling
46. ✅ **PWA** (installable app; manifest and service worker)
47. ✅ **i18n test mock** loads English translation JSON in setupTests (no duplication)

**Polish & maintenance (optional):**
- [ ] **Remove legacy PHP scripts** in `api/` once all traffic uses the new routes: `captcha.php`, `set-auth-cookie.php`, `get-auth-cookie.php`, `clear-auth-cookie.php`, `suggestions.php`, `google-sheets.php`. Keep only `index.php`, `Router.php`, `config.php`, `controllers/`, `helpers/`.
- [ ] **CI/CD**: Ensure deployment or GitHub Actions set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for the API environment (server-side) when using auth-code flow.
- [ ] **API README**: Add a short “Deployment” subsection (env vars, rewrite rules) if deploying the API standalone.
- [ ] **Google Sheets export**: If the sheet template is updated to include Location / Work Type / Hybrid days columns, document the new structure in README and keep sync payload in sync.
- [ ] **E2E tests**: Consider adding a small E2E suite (e.g. Playwright) for critical flows (login, add application, sync Sheets) to catch regressions.

**Immediate Next Steps:**
1. **Export/Import Functionality**: Support for exporting data to CSV/JSON and importing from other trackers.
2. **AI-Assisted Features**: Integration with LLMs for resume matching, cover letter suggestions, and interview preparation.
3. **Enhanced Security**: Optional encryption for data stored in localStorage and sensitive field masking.
4. **Chrome Extension enhancements**:
   - Extension detection and installation prompt
   - Video mini-tutorial for extension usage

**Future Enhancements:**
- **Push Notifications**: Browser-based alerts for upcoming interviews or follow-up tasks.
- **Document Management**: Ability to upload and link specific resume versions or cover letters to each application (stored as Blobs or via external storage).
- **Advanced Analytics**: More detailed funnel analysis and time-to-hire metrics.
- **Mobile app version**: Progressive Web App (PWA) support or native mobile application.
- **Real-time collaboration**: Shared boards for teams or referral tracking.
- **Email notifications**: Periodic summaries and reminders for upcoming events.
- **Additional Extractors**: Support for Indeed, Glassdoor, and specialized tech job boards.
- **Web Accessibility (WCAG 2.1 compliance)** - See section below for detailed status and recommendations
- **User Profile Page** - Profile management page with basic user information:
  - User name and email
  - Current position or positions/job titles user is seeking
  - Profile customization options
- **Job Search Page** - Integrated job search functionality:
  - Search vacancies across different company platforms and job boards
  - Integration with multiple job search APIs (LinkedIn, Indeed, Glassdoor, etc.)
  - Recommendation to install Chrome extension for easier job capture
  - Direct conversion from search results to Opportunities or Applications
  - One-click job application tracking from search results

Your application is well-structured for these enhancements. The modular design makes it easy to add these features incrementally.

---

## 12. Web Accessibility (WCAG 2.1)

### Current Status

#### ✅ Implemented Features

1. **ARIA Labels and Roles:**
   - ✅ `aria-label` attributes on interactive buttons (delete buttons, pagination controls, accordion toggles)
   - ✅ `aria-expanded` on accordion components (Timeline view)
   - ✅ `aria-current="page"` on pagination active page indicators
   - ✅ `aria-hidden="true"` on decorative SVG icons
   - ✅ `role="switch"` on theme toggle button
   - ✅ `aria-checked` on theme toggle switch
   - ✅ `sr-only` class for screen reader only content (Actions column header)

2. **Keyboard Navigation:**
   - ✅ `useKeyboardEscape` hook for closing modals with Escape key
   - ✅ Focus management on interactive elements
   - ✅ Keyboard accessible buttons and links
   - ✅ Disabled state styling for keyboard navigation (pagination buttons)

3. **Semantic HTML:**
   - ✅ Proper use of semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<button>`, `<table>`, `<th>`, `<td>`)
   - ✅ Proper heading hierarchy (h1, h2, h3)
   - ✅ Form labels and input associations
   - ✅ Table headers with `scope` attributes

4. **Visual Accessibility:**
   - ✅ Dark mode support for users sensitive to bright screens
   - ✅ High contrast color schemes (indigo, green, red, yellow)
   - ✅ Visual indicators for interactive states (hover, focus, disabled)
   - ✅ Status indicators with both color and icons
   - ✅ Responsive design for various screen sizes

5. **Meta Information:**
   - ✅ Meta description for SEO and screen reader context
   - ✅ Language attribute on HTML element (`lang="en"`)

#### ⚠️ Partially Implemented / Needs Improvement

1. **Focus Management:**
   - ⚠️ Modal focus trapping - modals may allow focus to escape
   - ⚠️ Focus return after closing modals - focus may not return to trigger element
   - ⚠️ Skip navigation link missing - no "skip to main content" link for keyboard users

2. **Form Accessibility:**
   - ⚠️ Error messages association - form errors may not be properly associated with inputs via `aria-describedby`
   - ⚠️ Required field indicators - visual indicators exist but may need `aria-required` attributes
   - ⚠️ Form validation announcements - screen readers may not announce validation errors immediately

3. **Dynamic Content:**
   - ⚠️ Live regions for updates - no `aria-live` regions for dynamic content updates (alerts, filter results)
   - ⚠️ Loading states - loading indicators may not be announced to screen readers

4. **Table Accessibility:**
   - ⚠️ Sortable columns - if columns become sortable, need `aria-sort` attributes
   - ⚠️ Complex tables - timeline/kanban views may need additional ARIA roles

5. **Keyboard Shortcuts:**
   - ⚠️ Limited keyboard shortcuts - only Escape key implemented
   - ⚠️ No keyboard shortcut documentation or help menu

#### ❌ Missing Features / Recommendations

1. **WCAG 2.1 Level AA Compliance Gaps:**

   **Perceivable:**
   - ❌ **Alternative text for images** - Logo images need descriptive alt text (currently only has "JAJAT")
   - ❌ **Color contrast ratio** - Some text may not meet 4.5:1 contrast ratio (needs audit)
   - ❌ **Text resize** - No explicit text resize controls (relies on browser zoom)
   - ❌ **Audio/video captions** - N/A for current features, but needed for future video tutorials

   **Operable:**
   - ❌ **Keyboard accessibility** - All functionality should be keyboard accessible
     - Drag-and-drop in Kanban view may not be keyboard accessible
     - Some complex interactions may require mouse
   - ❌ **No keyboard traps** - Ensure users can navigate away from all components
   - ❌ **Timing adjustable** - Auto-dismiss alerts have fixed timing (could be configurable)
   - ❌ **Navigation** - Skip links missing for main content areas
   - ❌ **Multiple ways to find content** - Currently only search/filter, could add tags/categories

   **Understandable:**
   - ❌ **Language identification** - Some content may not specify language (especially user-entered content)
   - ❌ **Error identification** - Form errors need better labeling and association
   - ❌ **Labels and instructions** - Some form fields may need more descriptive labels
   - ❌ **Consistent navigation** - Navigation is mostly consistent, but could be improved

   **Robust:**
   - ❌ **Parsing** - HTML should validate (needs verification)
   - ❌ **Name, role, value** - All UI components need proper ARIA attributes

2. **Screen Reader Optimization:**
   - ❌ **Landmark regions** - Missing `role="main"`, `role="complementary"`, `role="navigation"`
   - ❌ **Live regions** - Need `aria-live="polite"` for non-critical updates and `aria-live="assertive"` for errors
   - ❌ **State announcements** - Complex state changes (filters, sorting) need announcements
   - ❌ **Descriptive link text** - Some links may have non-descriptive text (e.g., "click here")

3. **Keyboard Navigation Improvements:**
   - ❌ **Focus indicators** - Ensure all interactive elements have visible focus indicators
   - ❌ **Tab order** - Verify logical tab order throughout application
   - ❌ **Keyboard shortcuts** - Add common shortcuts (e.g., `/` for search, `n` for new entry, `?` for help)
   - ❌ **Shortcut documentation** - Help menu or keyboard shortcuts overlay

4. **Testing Recommendations:**
   - ❌ **Automated testing** - Integrate accessibility testing tools (axe-core, Lighthouse CI)
   - ❌ **Screen reader testing** - Test with NVDA, JAWS, VoiceOver
   - ❌ **Keyboard-only testing** - Manual testing with keyboard only (no mouse)
   - ❌ **Color contrast audit** - Use tools like WebAIM Contrast Checker

### Recommended Implementation Plan

#### Phase 1: Quick Wins (High Impact, Low Effort)
1. Add skip navigation link
2. Improve image alt text descriptions
3. Add `aria-live` regions for alerts and dynamic updates
4. Add landmark roles (`role="main"`, `role="navigation"`)
5. Ensure all interactive elements have focus indicators

#### Phase 2: Form Improvements
1. Add `aria-describedby` to associate error messages with inputs
2. Add `aria-required` to required fields
3. Improve form validation announcements
4. Add `aria-invalid` to inputs with errors

#### Phase 3: Advanced Features
1. Implement keyboard shortcuts with help menu
2. Add focus trapping to modals
3. Implement keyboard navigation for Kanban drag-and-drop
4. Add ARIA roles for complex components (timeline, kanban)
5. Color contrast audit and fixes

#### Phase 4: Testing & Validation
1. Set up automated accessibility testing (axe-core, Lighthouse)
2. Conduct screen reader testing sessions
3. Keyboard-only navigation testing
4. WCAG 2.1 Level AA compliance audit
5. Create accessibility documentation

### Tools & Resources

**Testing Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/accessibility/) - Built into Chrome DevTools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) - Color contrast verification

**Screen Readers:**
- [NVDA](https://www.nvaccess.org/) - Free Windows screen reader
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) - Windows screen reader (commercial)
- [VoiceOver](https://www.apple.com/accessibility/vision/) - Built into macOS/iOS

**Documentation:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM Resources](https://webaim.org/resources/)

### Success Metrics

- **WCAG 2.1 Level AA Compliance**: Target 95%+ compliance score
- **Lighthouse Accessibility Score**: Target 95+ out of 100
- **axe-core Violations**: Zero critical/high severity violations
- **Keyboard Navigation**: 100% of functionality accessible via keyboard
- **Screen Reader Compatibility**: Tested and working with major screen readers (NVDA, JAWS, VoiceOver)
