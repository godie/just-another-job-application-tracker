# Job Application Tracker
# Project Overview
This is a modern Job Application Tracker built using React, TypeScript, and Tailwind CSS. The project follows Test-Driven Development (TDD) principles, utilizing Vitest and React Testing Library for comprehensive unit and component testing.The application manages job applications locally, with an architecture designed for seamless integration with external services like Google Sheets.

# Project Status
**Completion: 95%**

This project is feature-complete for its core functionality. Based on the project [recommendations](./RECOMMENDATIONS.md), 41 out of 41 planned features have been implemented and are fully tested. Recent additions include state management with Zustand, full internationalization, and a community support system.

## Recent Updates
- **Zustand State Management**: Migrated from prop-drilling to a robust state management system using Zustand stores for applications, opportunities, preferences, and authentication.
- **Full Internationalization (i18n)**: Implementation of `i18next` providing a completely bilingual experience (English/Spanish) across the entire application, including dynamic translations for statuses and field types.
- **Support & Suggestions System**: Added a new Support page featuring a community suggestion form backed by a lightweight PHP + SQLite backend with numeric CAPTCHA protection.
- **Direct ATS Search**: New feature on the Opportunities page that generates targeted Google search queries for major Applicant Tracking Systems (Ashby, Greenhouse, Lever, Workable, Workday, etc.).
- **Insights Page Improvements**: Fixed interview event detection logic and added new "Interviews by Type" chart
  - Correctly identifies all interview event types (screener_call, technical_interview, hiring_manager, etc.)
  - Added comprehensive interview type breakdown visualization
- **Mobile-First Responsive Design**: Complete mobile optimization with card-based views, compact metrics, and responsive header
  - Header adapts by screen size: logo icon (< 768px), "JAJAT" text (768-1023px), full title (≥ 1024px)
  - Login button shows Google "G" icon on mobile for space efficiency
  - Metrics summary displays 3 cards in a single row on mobile with compact styling
  - Application table switches to card view on mobile (< 768px) and table view on desktop
- **Test Infrastructure**: Achieved 100% test pass rate (366 tests passing) with migration to `happy-dom`.

## Next Steps
- AI-Assisted job matching and resume optimization
- Browser notifications for interviews and follow-ups
- Export to PDF/CSV and enhanced data import

For a detailed feature breakdown, please see the [recommendations document](./RECOMMENDATIONS.md).

# Technology Stack
The project is built on the following modern technologies:

| Category | Technology | Purpose |
|----------|-----------|----------|
| Frontend | React 19 (Hooks & Functional Components) | User Interface |
| State Management | Zustand | Lightweight and Scalable State Management |
| Internationalization | i18next & react-i18next | Full Multi-language Support (EN/ES) |
| Language | TypeScript 5.9+ | Strong Typing and Scalability |
| Styling | Tailwind CSS 4 | Modern Utility-First CSS Framework |
| Tooling | Vite 7 | High-performance Frontend Build Tool |
| Testing | Vitest & React Testing Library | Test Runner and Component Testing (TDD) |
| Authentication | @react-oauth/google | Google OAuth Integration |

# Getting Started: Local Setup
Follow these instructions to get a copy of the project up and running on your local machine.
## Prerequisites
- Node.js (v22 recommended) and npm (Node Package Manager)
- PHP 7.4+ (for backend cookie handling)
## Installation
1. Clone the repository:
```shell
git clone https://github.com/godie/JAJAT.git job-application-tracker
```
2. Enter folder
```shell
cd job-application-tracker
```

3. Install project dependencies:
```shell 
npm install
```

4. Setup Git pre-commit hook (optional but recommended):
```shell
./setup-hook.sh
```
This will install a pre-commit hook that runs ESLint before each commit to ensure code quality and prevent build errors.

5. Configure Environment Variables:
Create a file named `.env.local` in the project root and add your Google OAuth Client ID. This is required for the login functionality.

### .env.local
```bash
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"

# API Base URL (optional - defaults to /api)
# For production, set this to your full API URL
VITE_API_BASE_URL="/api"
```

> **Note:** The `.env.local` file is gitignored and will not be committed to version control.
# Available Scripts
In the project directory, you can run:
- `npm run dev`
    - Runs the app in development mode using Vite. Open http://localhost:5173 to view it in the browser. The page will reload upon edits.
- `npm test`
    - Runs all unit and component tests via Vitest in one pass.
- `npm run test:watch`
    - Starts the Vitest test runner in watch mode (recommended for TDD).
- `npm run build`
    - Builds the application for production to the dist folder.
- `npm run build:extension`
    - Builds the Chrome extension to the chrome-extension/dist folder.

# Key Features

## Development & Architecture

- Test-Driven Development (TDD): Comprehensive testing with 190+ tests covering all core components, views, and functionality
- Clean Architecture: Utilizes the Adapter pattern to prepare for pluggable external data sources (e.g., Google Sheets, Airtable)
- Modular Component Design: Reusable, tested components with clear separation of concerns
- Modular Code Organization: Separated concerns with dedicated modules for types (`src/types/`), storage logic (`src/storage/`), and utilities, ensuring maintainability and scalability
- Type Safety: Full TypeScript implementation with strict type checking
- Vite Environment Variables: Secure management of the Google Client ID using VITE_ prefixed environment variables

## Data Management & Persistence
- Local Storage Persistence: All job application data is persisted locally in the browser's localStorage for simple, quick data retention.
- Full CRUD Functionality: Supports:
  - Create (Add New Entry)
  - Read (Display in the table)
  - Update (Edit entry via table row click)
  - Soft Delete (Mark as deleted with confirmation dialog)
- Advanced Data Model: Hybrid approach supporting:
  - **Timeline-based tracking**: Full interview process with multiple stages (Screener, Technical, System Design, Hiring Manager, etc.)
  - **Legacy compatibility**: Automatic migration from simple status fields
  - **Custom fields**: User-defined fields for flexible data tracking
  - **Event status**: Complete interview tracking with scheduled, completed, cancelled, and pending states

## User Interface & Interactivity
- **Multiple View Modes**: Switch between different visualizations:
  - **Table View**: Enhanced table with all job application data
  - **Timeline View**: Chronological visualization of interview process with status indicators
  - **Kanban View**: Board-style organization grouped by status with quick summaries
  - **Calendar View**: Monthly calendar highlighting upcoming interview events
- **Smart Filters & Search**: Persisted search, status (with advanced inclusion/exclusion), platform, and date filters with real-time results
- **Custom Alert System**: Beautiful, accessible alerts with auto-dismiss (success, error, warning, info) replacing browser alerts
- **Timeline Editor**: Full-featured editor for managing interview events with stages, statuses, and notes
- **Soft Delete with Confirmation**: Applications are marked as "Deleted" instead of being removed, with a custom confirmation dialog to prevent accidental deletions
- **Kanban Sub-Status Grouping**: Applications in "Interviewing" status are automatically grouped by their current timeline stage (e.g., "Interviewing - First Contact", "Interviewing - Code Challenge")
- **Calendar Enhancements**: Today's date is highlighted, and events show relative time indicators ("Today", "in 2 days", "3 days ago")
- **Responsive Design**: Styled entirely with Tailwind CSS utility classes for an optimized, mobile-first experience:
  - Adaptive header with logo/icon for mobile, compact text for tablets, full title for desktop
  - Compact metrics cards (3 per row) on mobile with smaller text
  - Card-based application view on mobile, full table view on desktop
  - Mobile-optimized login button with Google icon
  - Improved touch targets and spacing for mobile devices
- Google OAuth Authentication: Implements secure Google authentication using `@react-oauth/google` library with backend cookie support for token storage
- **Google Sheets Integration**: One-way sync to Google Sheets with automatic spreadsheet creation, sync status tracking, and error handling
- **Chrome Extension**: Capture job opportunities from LinkedIn, Greenhouse, and AshbyHQ with automatic data extraction and sync with the web app
- **Opportunities Page**: Separate view for managing captured job opportunities before converting them to applications.
- **Direct ATS Search**: Integrated tool to search for job openings directly on major ATS platforms (Ashby, Greenhouse, Lever, etc.) using optimized Google queries.
- **Manual Opportunity Creation**: Add opportunities directly from the web app with a full-featured form.
- **Bidirectional Extension Sync**: Real-time synchronization between Chrome extension and web app.
- **Configurable Settings Page**: Comprehensive settings with multiple sections:
  - **Table Fields Configuration**: Show/hide and reorder columns in the applications table
  - **Default View Selection**: Choose your preferred view (Table, Timeline, Kanban, Calendar) when opening the app
  - **Date Format Preferences**: Select date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD) for consistent display
  - **Custom Fields Management**: Create, edit, and delete custom fields with support for multiple field types (text, date, number, select, checkbox, URL)
- Keyboard Accessibility: Implements a custom hook (useKeyboardEscape) to allow users to close the modal form by pressing the Escape key
- Footer: Displays version information, attribution, and links to Terms of Service and Privacy Policy
- **Legal Pages**: Bilingual Terms of Service and Privacy Policy pages with language switcher (English/Spanish, default: English)
- **Minimalist UI with Sidebar**: A clean, minimalist UI with a sidebar for easy navigation between pages (Applications, Opportunities, Settings, Insights)
- **Internationalization (i18n)**: Fully bilingual interface (English/Spanish) with automatic language detection and manual override.
- **Support & Suggestions**: Dedicated support page for community feedback and donations (Buy Me a Coffee).
- **Dark Theme Support**: Full dark mode implementation with persistent theme preference stored in localStorage. Theme toggle switch with sun/moon icons available in the sidebar. All components support dark mode styling.
- **Insights Page**: Analytics dashboard with comprehensive statistics and visualizations:
  - Total applications, interviews, rejections, and rejection percentage metrics
  - Application status distribution chart
  - Interview events by application status breakdown
  - Interview events by type breakdown (screener calls, technical interviews, etc.)
  - Proper interview event detection for all interview stage types

## Interview Timeline System

The application features a sophisticated timeline system for tracking the complete interview lifecycle:

- **14 Interview Stage Types**: From initial application to final offer/rejection
- **Event Management**: Add, edit, and delete timeline events with dates, status, notes, and interviewer names
- **Auto-Generation**: Timeline automatically created from application and interview dates
- **Visual Indicators**: Color-coded status badges (completed, scheduled, cancelled, pending)
- **Chronological Sorting**: Events automatically sorted by date
- **Next Event Highlighting**: Quick view of upcoming interviews
- **Timeline View**: Beautiful vertical timeline visualization with visual connections
- **Interviewer Tracking**: Optional interviewer name field for each event

Supported interview stages include: Application Submitted, Screener Call, First Contact, Technical Interview, Code Challenge, Live Coding, Hiring Manager, System Design, Cultural Fit, Final Round, Offer, Rejected, Withdrawn, and Custom.

## Security & Authentication
- Secure Cookie Storage: Google OAuth tokens are stored in secure, HTTP-only cookies managed by PHP backend.
- OAuth 2.0 Flow: Full OAuth 2.0 implementation with access token management.
- **Backend Integration**: PHP endpoints for secure cookie handling and community suggestions.
- Google Sheets API Scope: OAuth includes Google Sheets API scope for spreadsheet synchronization.
- **Legal Compliance**: Complete Terms of Service and Privacy Policy pages required for Google OAuth verification and production deployment.

For more details on the security measures implemented in this project, please see the [SECURITY.md](./SECURITY.md) file.

## Legal & Compliance

The application includes comprehensive legal documentation required for Google OAuth verification and production deployment:

- **Terms of Service** (`/terms.html`): Complete terms of service in English and Spanish with interactive language switcher
- **Privacy Policy** (`/privacy.html`): Detailed privacy policy in English and Spanish with interactive language switcher
- **Bilingual Support**: Both legal pages support English (default) and Spanish with persistent language preference stored in localStorage
- **Language Switcher**: Tab-based interface to switch between languages seamlessly
- **Google OAuth Compliance**: Required for Google OAuth verification and moving out of testing mode
- **Footer Integration**: Links to both legal pages accessible from the application footer

These pages are accessible from the footer and are required for Google Cloud Console OAuth consent screen verification. The bilingual support ensures compliance with international users and Google's requirements.

## Chrome Extension - Multi-Platform Job Capture

The project includes a Chrome extension for capturing job opportunities from multiple job boards. Currently supports LinkedIn, Greenhouse, AshbyHQ, Workable, and Lever.co, with more platforms coming soon.

### Supported Job Boards
- **LinkedIn**: Full support for LinkedIn job postings
- **Greenhouse**: Complete extraction from Greenhouse job boards
- **AshbyHQ**: Full support for AshbyHQ job postings
- **Workable**: Full support for Workable job postings
- **Lever.co**: Full support for Lever.co job postings

### Features
- **One-click capture**: Automatically extracts job details from supported job boards
- **Smart extraction**: Uses multiple data sources (embedded JSON, JSON-LD, HTML, meta tags) for reliable data extraction
- **Editable form**: Review and edit captured data before saving
- **Sync with web app**: Automatically syncs with the web application when open
- **Offline storage**: Uses Chrome's storage API for reliable data persistence
- **Manual creation**: Add opportunities directly from the web app without the extension
- **Bidirectional sync**: Real-time synchronization between extension and web app
- **Memory efficient**: Proper cleanup prevents memory leaks in single-page applications
- **Advanced filtering**: Filter opportunities by status with inclusion/exclusion options

### Quick Start
1. Build the extension: `npm run build:extension`
2. Load it in Chrome: Go to `chrome://extensions/`, enable Developer mode, and load the `chrome-extension/dist` folder
3. Visit a job posting on LinkedIn, Greenhouse, AshbyHQ, Workable, or Lever.co and click the extension icon to capture it
4. Or add opportunities manually from the Opportunities page in the web app

### Supported URLs
- LinkedIn: `https://www.linkedin.com/jobs/view/*`
- Greenhouse: `https://boards.greenhouse.io/*`, `https://job-boards.greenhouse.io/*`
- AshbyHQ: `https://jobs.ashbyhq.com/*`, `https://*.ashbyhq.com/*`
- Workable: `https://apply.workable.com/*`, `https://workable.com/j/*`
- Lever.co: `https://jobs.lever.co/*`, `https://*.lever.co/*`, `https://lever.co/*`

### Manual Opportunity Creation
You don't need the extension to add opportunities! Simply:
1. Navigate to the Opportunities page in the web app
2. Click "+ Add Opportunity"
3. Fill in the job details
4. Save - it will sync with the extension if installed

For detailed installation and usage instructions, see [CHROME_EXTENSION.md](./CHROME_EXTENSION.md).

## Google Sheets Integration

The application includes full Google Sheets integration for syncing job application data:

### Features
- **One-Way Sync**: Sync all job applications from the app to Google Sheets
- **Automatic Spreadsheet Creation**: Create a new Google Sheet with predefined structure
- **Sync Status Tracking**: Real-time sync status with last sync time and error handling
- **Secure API Proxy**: PHP backend proxy ensures secure API calls using HTTP-only cookies
- **Timeline Events Export**: Complete interview timeline events are formatted and exported to Sheets

### How to Use
1. **Login with Google**: Ensure you're logged in with Google (includes Sheets API scope)
2. **Create Spreadsheet**: Click "Create Sheet" to create a new Google Sheet
3. **Sync Data**: Click "Sync Now" to sync all your job applications to the spreadsheet
4. **Open Spreadsheet**: Click "Open Spreadsheet →" to view your data in Google Sheets

### Spreadsheet Structure
The created spreadsheet includes the following columns:
- ID, Position, Company, Salary, Status
- Application Date, Interview Date, Platform
- Contact Name, Follow-up Date, Link, Notes
- Timeline Events (formatted with all interview stages, dates, statuses, and notes)

# Backend API Endpoints
The project includes PHP endpoints for secure cookie management. These endpoints must be deployed to a PHP server with HTTPS enabled.

## Authentication Endpoints

### Set Auth Cookie
- **Endpoint:** `POST /api/set-auth-cookie.php`
- **Purpose:** Store Google OAuth access token in a secure, HTTP-only cookie
- **Request Body:** JSON with `access_token` field
- **Response:** JSON with success status
- **Security:** Cookie is set with `HttpOnly`, `Secure`, and `SameSite=Strict` flags

### Get Auth Cookie
- **Endpoint:** `GET /api/get-auth-cookie.php`
- **Purpose:** Retrieve the stored OAuth access token from the secure cookie
- **Response:** JSON with `access_token` field or error message
- **Security:** Only accessible server-side; JavaScript cannot read HTTP-only cookies

### Clear Auth Cookie (Logout)
- **Endpoint:** `POST /api/clear-auth-cookie.php`
- **Purpose:** Remove the authentication cookie when user logs out
- **Response:** JSON with success status
- **Security:** Cookie is deleted by setting expiry to past time

## Google Sheets Endpoints

### Create Spreadsheet
- **Endpoint:** `POST /api/google-sheets.php`
- **Action:** `create_sheet`
- **Purpose:** Create a new Google Sheet with predefined structure for job applications
- **Request Body:** JSON with `action: "create_sheet"` and optional `title` field
- **Response:** JSON with `spreadsheetId`, `spreadsheetUrl`, and success status
- **Security:** Uses OAuth token from secure HTTP-only cookie

### Sync Data to Spreadsheet
- **Endpoint:** `POST /api/google-sheets.php`
- **Action:** `sync_data`
- **Purpose:** Sync job applications data to an existing Google Sheet
- **Request Body:** JSON with `action: "sync_data"`, `spreadsheetId`, and `applications` array
- **Response:** JSON with `rowsSynced` count and success status
- **Security:** Uses OAuth token from secure HTTP-only cookie

### Get Spreadsheet Info
- **Endpoint:** `POST /api/google-sheets.php`
- **Action:** `get_sheet_info`
- **Purpose:** Retrieve information about a Google Sheet
- **Request Body:** JSON with `action: "get_sheet_info"` and `spreadsheetId`
- **Response:** JSON with spreadsheet metadata
- **Security:** Uses OAuth token from secure HTTP-only cookie

> **Note:** Due to browser security restrictions, JavaScript cannot read HTTP-only cookies. The backend PHP endpoints handle all cookie operations securely and act as a proxy for Google Sheets API calls.

# File Structure
The project maintains a clean, scalable folder structure based on functional concerns:

```
job-application-tracker/
├── src/
│   ├── components/
│   │   ├── Header.tsx           // Application header, login button, and OAuth logic.
│   │   ├── Sidebar.tsx          // Sidebar navigation with theme toggle and opportunities badge.
│   │   ├── ApplicationTable.tsx // Table displaying job entries and handling edit/delete UI.
│   │   ├── AddJobComponent.tsx  // Modal form for creating and editing job entries.
│   │   ├── TimelineView.tsx     // Timeline visualization of interview process.
│   │   ├── TimelineEditor.tsx   // Editor for managing interview timeline events.
│   │   ├── KanbanView.tsx       // Kanban board grouping applications by status.
│   │   ├── CalendarView.tsx     // Monthly calendar visualization of interview timeline events.
│   │   ├── FiltersBar.tsx       // Search and filter controls with persisted state.
│   │   ├── ViewSwitcher.tsx     // Component for switching between view modes.
│   │   ├── Alert.tsx            // Beautiful alert notification component.
│   │   ├── AlertProvider.tsx    // Context provider for alert management.
│   │   ├── ConfirmDialog.tsx   // Confirmation modal for delete actions.
│   │   ├── GoogleSheetsSync.tsx // Google Sheets sync component with UI controls.
│   │   └── Footer.tsx          // Application footer with version info.
│   ├── pages/
│   │   ├── HomePage.tsx         // Main container; manages global state and view switching.
│   │   ├── OpportunitiesPage.tsx // Page for managing captured job opportunities.
│   │   ├── SettingsPage.tsx     // Settings page for configuring fields, views, and preferences.
│   │   └── InsightsPage.tsx     // Page for displaying insights and analytics.
│   ├── layouts/
│   │   └── MainLayout.tsx       // Main layout with sidebar navigation and header, supports dark mode.
│   ├── stores/                  // Zustand state management stores
│   │   ├── applicationsStore.ts // Global applications state and actions
│   │   ├── opportunitiesStore.ts// Global opportunities state and actions
│   │   ├── preferencesStore.ts  // User preferences and settings state
│   │   ├── authStore.ts         // Authentication state management
│   │   └── index.ts             // Store exports
│   ├── types/                   // TypeScript type definitions organized by domain
│   │   ├── applications.ts      // Job application and interview event types
│   │   ├── opportunities.ts     // Job opportunity types
│   │   ├── preferences.ts       // User preferences and field types
│   │   └── index.ts             // Barrel file for type exports
│   ├── storage/                 // Data persistence and localStorage operations
│   │   ├── applications.ts      // Job application CRUD and migration logic
│   │   ├── opportunities.ts     // Opportunity management operations
│   │   ├── preferences.ts       // User preferences storage
│   │   ├── auth.ts              // Authentication state management
│   │   └── index.ts             // Barrel file for storage exports
│   ├── utils/
│   │   ├── localStorage.ts      // Legacy barrel file for backward compatibility
│   │   ├── id.ts                // ID generation utilities
│   │   ├── date.ts              // Date formatting utilities
│   │   ├── constants.ts         // Application constants and defaults
│   │   ├── api.ts               // API utilities for PHP backend communication
│   │   └── googleSheets.ts      // Google Sheets integration utilities and sync functions
│   ├── hooks/
│   │   ├── useKeyboardKey.ts    // Generic hook for listening to any key press.
│   │   └── useKeyboardEscape.ts // Semantic wrapper for closing modals on 'Escape' key.
│   ├── adapters/
│   │   ├── IAdapter.ts          // Target interface for external data services (Adapter Pattern).
│   │   └── GoogleSheetAdapter.ts// [Future] Adapter implementation for Google Sheets API.
│   ├── tests/
│   │   ├── Header.test.tsx         // Tests for login/logout, OAuth, and button states.
│   │   ├── HomePage.test.tsx       // Tests for CRUD, persistence, views, and filters.
│   │   ├── Alert.test.tsx          // Tests for alert component rendering and behavior.
│   │   ├── AlertProvider.test.tsx  // Tests for alert context and management.
│   │   ├── TimelineEditor.test.tsx // Tests for timeline event editing.
│   │   ├── KanbanView.test.tsx     // Tests for Kanban board grouping and actions.
│   │   ├── CalendarView.test.tsx   // Tests for calendar event rendering and callbacks.
│   │   ├── FiltersBar.test.tsx     // Tests for filter control interactions.
│   │   ├── GoogleSheetsSync.test.tsx // Tests for Google Sheets sync component.
│   │   ├── OpportunitiesPage.test.tsx // Tests for opportunities page functionality.
│   │   ├── OpportunityForm.test.tsx // Tests for opportunity form component.
│   │   ├── SettingsPage.test.tsx    // Tests for settings page configuration.
│   │   ├── ConfirmDialog.test.tsx   // Tests for confirmation dialog component.
│   │   ├── ApplicationTable.test.tsx // Tests for application table rendering.
│   │   ├── localStorage.test.ts     // Tests for localStorage utilities.
│   │   ├── googleSheets.test.ts     // Tests for Google Sheets utility functions.
│   │   ├── Theme.test.tsx           // Tests for theme persistence and localStorage functionality.
│   │   └── DarkModeIntegration.test.tsx // Integration tests for dark mode functionality.
│   ├── App.tsx                  // Main app component with GoogleOAuthProvider wrapper.
│   └── main.tsx
├── api/                         // PHP backend endpoints
│   ├── set-auth-cookie.php      // Secure cookie setting for OAuth tokens
│   ├── get-auth-cookie.php      // Secure cookie retrieval for OAuth tokens
│   ├── clear-auth-cookie.php    // Secure cookie deletion for logout
│   └── google-sheets.php        // Google Sheets API proxy for secure operations
├── chrome-extension/            // Chrome extension for multi-platform job capture
│   ├── manifest.json            // Extension manifest
│   ├── popup.html               // Popup HTML container
│   ├── popup.tsx                // React popup component
│   ├── content.ts               // Content script for job board pages
│   ├── webapp-content.ts       // Content script for web app sync
│   ├── background.ts            // Background service worker
│   ├── job-extractors/          // Job extraction system
│   │   ├── JobExtractor.ts      // Extractor interface
│   │   ├── LinkedInJobExtractor.ts  // LinkedIn extractor
│   │   ├── GreenhouseJobExtractor.ts // Greenhouse extractor
│   │   ├── AshbyhqJobExtractor.ts   // AshbyHQ extractor
│   │   ├── WorkableJobExtractor.ts  // Workable extractor
│   │   ├── LeverJobExtractor.ts     // Lever.co extractor
│   │   └── index.ts             // Extractor registry
│   └── dist/                    // Built extension files (generated)
├── .env.local                   // Stores VITE_GOOGLE_CLIENT_ID (Ignored by Git).
├── .nvmrc                       // Node version specification (v22)
├── CHROME_EXTENSION.md          // Chrome extension documentation
└── tailwind.config.js
```

## Deployment & Backend Setup

### GitHub Actions CI/CD Configuration

This project uses GitHub Actions for automated deployment. To configure the workflow:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following **Repository Secrets**:

#### Required Secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID for production | `YOUR_CLIENT_ID.apps.googleusercontent.com` |
| `VITE_API_BASE_URL` | API base URL for production | `/api` or `https://yourdomain.com/api` |
| `SSH_PRIVATE_KEY` | Private SSH key for deployment | Your SSH private key content |
| `REMOTE_USER` | SSH username for deployment | `username` |
| `REMOTE_HOST` | Server hostname/IP | `example.com` or `192.168.1.100` |
| `REMOTE_PORT` | SSH port | `22` or `2022` |
| `REMOTE_TARGET` | Deployment path on server | `/var/www/html` or `/home/user/public_html` |

> **Security Note:** Never commit these secrets to version control. They are only stored in GitHub Secrets.

### PHP Backend Configuration

1. Deploy PHP files to your web server:
   - Ensure the `/api` directory is accessible via HTTPS
   - PHP version 7.4+ required
   - PHP must have cookie and JSON support enabled

2. Configure CORS (if needed):
   - Update `Access-Control-Allow-Origin` headers in PHP files if frontend and backend are on different domains
   - Adjust CORS settings in the PHP files as needed for your deployment

3. Test the endpoints:
   ```bash
   # Test set cookie
   curl -X POST https://jajat.godieboy.com/api/set-auth-cookie.php \
     -H "Content-Type: application/json" \
     -d '{"access_token": "test_token"}'
   
   # Test get cookie
   curl -X GET https://jajat.godieboy.com/api/get-auth-cookie.php \
     --cookie "google_auth_token=test_token"
   ```

### Frontend Integration

The React app automatically calls these endpoints when:
- User logs in: Token is stored in secure cookie via `setAuthCookie()`
- User logs out: Cookie is cleared via `clearAuthCookie()`
- App needs token: Backend can retrieve it using `getAuthCookie()`

> **Important:** The cookie is HTTP-only and secure, so JavaScript cannot read it directly. This protects against XSS attacks.

## Testing

The project includes comprehensive test coverage:

```
Test Files: 34 passed (34)
Tests: 366 passed (366)
```

### Test Coverage Includes:
- Component rendering and interactions
- User interface functionality
- Data persistence and CRUD operations
- Google OAuth authentication flow
- Google Sheets integration (create, sync, error handling)
- Timeline event management
- View switching (Table, Timeline, Kanban, Calendar)
- Filter and search functionality (including advanced status filtering)
- Alert system and notifications
- Chrome Extension components (content script, background, popup, webapp-content)
- Job extractors (LinkedIn, Greenhouse, AshbyHQ, Workable, Lever.co) with comprehensive unit tests
- Opportunity management (creation, deletion, conversion)
- Manual opportunity form validation and submission
- **Dark mode functionality** (theme toggle, persistence, class application)
- **Sidebar navigation** and theme switching
- **Theme integration tests** for localStorage and document class management

### Testing Infrastructure:
- **Test Runner**: Vitest with happy-dom environment (optimized for React component testing)
- **Component Testing**: React Testing Library for user-centric tests
- **Mocking**: Comprehensive mocks for localStorage, Google OAuth, and API endpoints
- All tests can be run with `npm test` or `npm run test:watch` for TDD workflow

## AI Agent Integration

This project is optimized for collaboration with AI agents. We include an [AGENTS.md](./AGENTS.md) file that provides specific context, coding standards, and architectural guidelines to help AI assistants contribute effectively to the codebase while maintaining consistency and quality.

## Git Pre-Commit Hook

This project includes a pre-commit hook that automatically runs ESLint before each commit. This ensures:
- Code quality is maintained
- Build errors are caught early
- Consistent code style across the project

### Installation

Run the setup script:
```bash
./setup-hook.sh
```

### How It Works

When you attempt to commit code:
1. The hook automatically runs `npm run lint`
2. If linting passes: commit proceeds normally
3. If linting fails: commit is blocked with error details

### Bypassing the Hook (Not Recommended)

If you need to bypass the hook for a specific commit (e.g., WIP commits):
```bash
git commit --no-verify -m "your message"
```

**Warning:** Only bypass the hook when absolutely necessary. The hook prevents build failures in production.

### Manual Linting

You can manually run linting at any time:
```bash
npm run lint          # Check for errors
npm run lint:fix      # Automatically fix fixable issues
```

## Contributing

This project follows Test-Driven Development (TDD) principles. All new features should include comprehensive tests.

### Before Committing

1. Run tests: `npm test`
2. Run linter: `npm run lint` (or let the pre-commit hook do it)
3. Ensure build passes: `npm run build`

## License 

[MIT LICENSE](LICENSE)
