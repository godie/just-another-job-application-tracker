# Job Application Tracker

# Project Overview

This is a modern Job Application Tracker built using React, TypeScript, and Tailwind CSS. The project follows Test-Driven Development (TDD) principles, utilizing Vitest and React Testing Library for comprehensive unit and component testing.The application manages job applications locally, with an architecture designed for seamless integration with external services like Google Sheets.

# Project Status

**Completion: 95%**

This project is feature-complete for its core functionality. Based on the project [recommendations](./RECOMMENDATIONS.md), 41 out of 41 planned features have been implemented and are fully tested. The test suite has 400+ tests (39 test files) with Vitest and React Testing Library.

## Recent Updates

- **Backend API as Mini-Framework**: The PHP API (`/api`) is now a small framework with a single entry point (`index.php`), router, controllers, and helpers. All endpoints are under `/api/*` (auth, captcha, suggestions, google-sheets). See [api/README.md](./api/README.md) for routes and structure.
- **OAuth Authorization Code + Token Refresh**: Login uses the authorization-code flow; the backend exchanges the code for access and refresh tokens and stores them in HTTP-only cookies. When the access token expires, the backend refreshes it automatically (Sheets proxy and GET `/api/auth/cookie` use a valid token). Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the server.
- **Application Fields: Location, Work Type, Hybrid Days**: `JobApplication` now includes optional `location`, `workType` (remote / on-site / hybrid), and when hybrid, `hybridDaysInOffice` (1–5 days per week). Form, table, and opportunity-to-application conversion support these fields.
- **Email Scan (Gmail)**: In Settings, scan Gmail for application-related emails; preview proposed additions and updates, then apply selected items to the tracker. Handles rate limits with a clear message and chunked fetching.
- **PWA**: The app is installable as a Progressive Web App (manifest, service worker). Install from the browser on desktop and mobile when served over HTTPS.
- **i18n Test Mock**: Test setup loads the English translation JSON and flattens it for the `react-i18next` mock, avoiding duplicated translation strings in tests.
- **Zustand State Management**: Global state with Zustand stores for applications, opportunities, preferences, and authentication.
- **Full Internationalization (i18n)**: Bilingual experience (English/Spanish) with `i18next` across the app.
- **Support & Suggestions System**: Support page with suggestion form, PHP + SQLite backend, and numeric CAPTCHA.
- **Direct ATS Search**: Opportunities page generates targeted Google search queries for major ATS (Ashby, Greenhouse, Lever, Workable, Workday, etc.).
- **Mobile-First Responsive Design**: Card-based table on mobile, compact metrics, adaptive header and login button.
- **Test Infrastructure**: 400+ tests passing with Vitest and happy-dom.

## Next Steps

- AI-Assisted job matching and resume optimization
- Browser notifications for interviews and follow-ups
- Export to PDF/CSV and enhanced data import
- Account-backed sync and multitenancy roadmap documented in [DOCS/MULTITENANCY_AND_AUTH_PLAN.md](./DOCS/MULTITENANCY_AND_AUTH_PLAN.md)

For a detailed feature breakdown, please see the [recommendations document](./RECOMMENDATIONS.md).

# Technology Stack

The project is built on the following modern technologies:


| Category             | Technology                               | Purpose                                   |
| -------------------- | ---------------------------------------- | ----------------------------------------- |
| Frontend             | React 19 (Hooks & Functional Components) | User Interface                            |
| State Management     | Zustand                                  | Lightweight and Scalable State Management |
| Internationalization | i18next & react-i18next                  | Full Multi-language Support (EN/ES)       |
| Language             | TypeScript 5.9+                          | Strong Typing and Scalability             |
| Styling              | Tailwind CSS 4                           | Modern Utility-First CSS Framework        |
| Tooling              | Vite 7                                   | High-performance Frontend Build Tool      |
| Testing              | Vitest & React Testing Library           | Test Runner and Component Testing (TDD)   |
| Authentication       | @react-oauth/google                      | Google OAuth Integration                  |


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

1. Enter folder

```shell
cd job-application-tracker
```

1. Install project dependencies:

```shell
npm install
```

1. Setup Git pre-commit hook (optional but recommended):

```shell
./setup-hook.sh
```

This will install a pre-commit hook that runs ESLint before each commit to ensure code quality and prevent build errors.

1. Configure Environment Variables:

Create a file named `.env` or `.env.local` in the project root (see `.env.example`). Required for the frontend:

### Frontend (.env / .env.local)

```bash
# Google OAuth – same Client ID as in Google Cloud Console (Web application)
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"

# API base path (defaults to /api if omitted)
VITE_API_BASE_URL=/api
```

For **token refresh** and Gmail/Sheets to work without re-login, the **backend** must use the authorization-code flow. Set these in the **server environment** (or in a `.env` loaded by PHP), not in the frontend:

```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

Add your frontend origin (e.g. `http://localhost:5173`, `https://yourdomain.com`) to **Authorized redirect URIs** in the Google Cloud Console for that OAuth client.

> **Note:** `.env` and `.env.local` are gitignored. Never commit `GOOGLE_CLIENT_SECRET`.

## Run Locally

Run the frontend and PHP API in separate terminals.

1. Start the frontend from the project root:

```bash
npm install
npm run dev
```

This starts Vite at `http://localhost:5173`.

1. Start the API from [api/](/api):

```bash
cd api
php -S 127.0.0.1:8080 index.php
```

1. Point the frontend to the local API in [`.env.local`](.env.local):

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080/api
```

Restart `npm run dev` after changing `.env.local`.

### Optional local backend variables

If you want to test Google login, token refresh, Sheets sync, or MySQL-backed sync routes locally, export the backend variables before starting PHP:

```bash
export GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your_client_secret"
export DB_ENABLED=true
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_NAME=jajat
export DB_USER=root
export DB_PASSWORD="your_password"
php -S 127.0.0.1:8080 index.php
```

If you only want to test basic API routes like `/api/hello` or `/api/captcha`, you can leave the DB and Google variables unset.

### Quick API checks

With the local API running:

```bash
curl http://127.0.0.1:8080/api/hello
curl http://127.0.0.1:8080/api/captcha
```

# Available Scripts

In the project directory, you can run:

- `npm run dev`
  - Runs the app in development mode using Vite. Open [http://localhost:5173](http://localhost:5173) to view it in the browser. The page will reload upon edits.
- `npm test`
  - Runs all unit and component tests via Vitest in one pass.
- `npm run test:watch`
  - Starts the Vitest test runner in watch mode (recommended for TDD).
- `npm run build`
  - Builds the application for production to the dist folder.

## Install as PWA (Progressive Web App)

The app is installable as a PWA. After deploying the production build (`npm run build`) over **HTTPS**:

- **Chrome / Edge (desktop)**: Use the install icon in the address bar or menu → "Install JAJAT…".
- **Android (Chrome)**: Menu → "Add to Home screen" or the install banner when supported.
- **iOS (Safari)**: Share → "Add to Home Screen".

Requirements: the site must be served over HTTPS (or `localhost` for testing). The build generates a web app manifest and a service worker for offline caching and installability. Icon and theme use `public/jajat-logo.png`; for best results on all devices you can add dedicated `pwa-192x192.png` and `pwa-512x512.png` to `public/` and reference them in `vite.config.ts` (VitePWA `manifest.icons`).

# Key Features

## Development & Architecture

- Test-Driven Development (TDD): Comprehensive testing with 190+ tests covering all core components, views, and functionality
- Clean Architecture: Utilizes the Adapter pattern to prepare for pluggable external data sources (e.g., Google Sheets, Airtable)
- Modular Component Design: Reusable, tested components with clear separation of concerns
- Modular Code Organization: Separated concerns with dedicated modules for types (`src/types/`), storage logic (`src/storage/`), and utilities, ensuring maintainability and scalability
- Type Safety: Full TypeScript implementation with strict type checking
- Vite Environment Variables: Secure management of the Google Client ID using VITE_ prefixed environment variables
- Product/auth and multitenancy migration plan: [DOCS/MULTITENANCY_AND_AUTH_PLAN.md](./DOCS/MULTITENANCY_AND_AUTH_PLAN.md)

## Data Management & Persistence

- Local Storage Persistence: All job application data is persisted locally in the browser's localStorage for simple, quick data retention.
- Full CRUD Functionality: Supports:
  - Create (Add New Entry)
  - Read (Display in the table)
  - Update (Edit entry via table row click)
  - Soft Delete (Mark as deleted with confirmation dialog)
- Advanced Data Model: Hybrid approach supporting:
  - **Timeline-based tracking**: Full interview process with multiple stages (Screener, Technical, System Design, Hiring Manager, etc.)
  - **Location & work type**: Optional `location`, `workType` (remote / on-site / hybrid), and when hybrid, `hybridDaysInOffice` (days per week in office)
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
  - **Table Fields Configuration**: Show/hide and reorder columns (including Location, Work Type) in the applications table
  - **Default View Selection**: Choose your preferred view (Table, Timeline, Kanban, Calendar) when opening the app
  - **Date Format Preferences**: Select date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD) for consistent display
  - **Custom Fields Management**: Create, edit, and delete custom fields with support for multiple field types (text, date, number, select, checkbox, URL)
  - **Email Scan (Gmail)**: Scan Gmail for application-related emails; preview proposed additions/updates and apply selected items to the tracker (requires login with Gmail scope; rate-limit handling included)
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

- **Secure Cookie Storage**: Google OAuth access and refresh tokens are stored in HTTP-only, Secure, SameSite cookies managed by the PHP backend.
- **OAuth 2.0 Authorization Code Flow**: Frontend uses `@react-oauth/google` with `flow: 'auth-code'`; backend exchanges the code for access and refresh tokens. This allows the backend to refresh the access token when it expires so users stay logged in for Sheets and Gmail without re-authenticating.
- **Backend API**: PHP mini-framework (`api/`) handles auth cookies, captcha, suggestions, and Google Sheets proxy; see [api/README.md](./api/README.md).
- **Scopes**: OAuth includes Google Sheets and Gmail read scope for sync and email scan.
- **Legal Compliance**: Terms of Service and Privacy Policy (bilingual) for Google OAuth verification and production deployment.

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

## Chrome Extension

The Chrome extension is now an independent project located at:

- `../job-application-tracker-extension`
- `https://github.com/godie/job-application-tracker-extension`

Build/test/install instructions live in that folder's own documentation and `package.json`.

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

- ID, Position, Company, Location, Work Type, Salary, Status
- Application Date, Interview Date, Platform
- Contact Name, Follow-up Date, Link, Notes
- Timeline Events (formatted with all interview stages, dates, statuses, and notes)

# Backend API (PHP Mini-Framework)

The `/api` directory is a small PHP API with a single entry point, router, and controllers. All requests go through `index.php`; the frontend uses the base URL from `VITE_API_BASE_URL` (e.g. `/api`).

## Overview

- **Entry point:** `api/index.php` — CORS, session, and routing.
- **Router:** `api/Router.php` — matches method and path to controller actions.
- **Controllers:** `api/controllers/` — AuthController, CaptchaController, SuggestionsController, GoogleSheetsController, etc.
- **Helpers:** `api/helpers/cors.php`, `api/helpers/auth.php` — CORS headers and OAuth token resolution (including refresh).
- **Config:** `api/config.php` — allowed origins, cookie names, OAuth client id/secret (from env), paths.

## Main Routes

| Method   | Path           | Purpose |
|----------|----------------|---------|
| GET      | /api/auth/cookie    | Return current access token (refreshes from refresh_token if expired). |
| POST     | /api/auth/cookie    | Store token: body `{ "access_token" }` (legacy) or `{ "code", "redirect_uri" }` (auth-code flow). |
| DELETE   | /api/auth/cookie    | Clear auth cookies (logout). |
| GET      | /api/captcha        | Generate numeric CAPTCHA challenge (session). |
| POST     | /api/suggestions    | Submit suggestion (validates CAPTCHA, stores in SQLite). |
| POST     | /api/google-sheets  | Proxy: `create_sheet`, `sync_data`, `get_sheet_info` (uses resolved token from cookies). |

The backend resolves a valid Google access token (refreshing when needed) for Sheets and for GET `/api/auth/cookie`, so the frontend and Sheets sync keep working after the access token expires.

For full route list, controller responsibilities, and server env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), see **[api/README.md](./api/README.md)**.

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
│   ├── mails/                   // Gmail scan: types, adapter, scan service, useEmailScan hook, providers
│   ├── client/                  // Gmail API client used by mails
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
├── api/                         // PHP backend (mini-framework; see api/README.md)
│   ├── index.php                // Single entry: CORS, session, router
│   ├── Router.php               // Method + path → controller action
│   ├── config.php               // CORS origins, cookie names, OAuth env
│   ├── controllers/             // AuthController, CaptchaController, SuggestionsController, GoogleSheetsController
│   ├── helpers/                 // cors.php, auth.php (token resolve + refresh)
│   └── ...                      // Legacy .php scripts can be removed once new routes are confirmed
└── ../job-application-tracker-extension/ // Independent Chrome extension project (separate package.json)
├── .env.local                   // Stores VITE_GOOGLE_CLIENT_ID (Ignored by Git).
├── .nvmrc                       // Node version specification (v22)
├── CHROME_EXTENSION.md          // Pointer doc to external extension project
└── tailwind.config.js
```

## Deployment & Backend Setup

### GitHub Actions CI/CD Configuration

This project uses GitHub Actions for automated deployment. To configure the workflow:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following **Repository Secrets**:

#### Required Secrets:


| Secret Name             | Description                           | Example                                     |
| ----------------------- | ------------------------------------- | ------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID for production | `YOUR_CLIENT_ID.apps.googleusercontent.com` |
| `VITE_API_BASE_URL`     | API base URL for production           | `/api` or `https://yourdomain.com/api`      |
| `SSH_PRIVATE_KEY`       | Private SSH key for deployment        | Your SSH private key content                |
| `REMOTE_USER`           | SSH username for deployment           | `username`                                  |
| `REMOTE_HOST`           | Server hostname/IP                    | `example.com` or `192.168.1.100`            |
| `REMOTE_PORT`           | SSH port                              | `22` or `2022`                              |
| `REMOTE_TARGET`         | Deployment path on server             | `/var/www/html` or `/home/user/public_html` |


> **Security Note:** Never commit these secrets to version control. They are only stored in GitHub Secrets.

### PHP Backend Configuration

1. Deploy the `api/` directory to your web server so that all requests to `/api/*` are handled by `api/index.php` (e.g. via Apache `RewriteRule` or nginx `try_files`). The repo includes `api/.htaccess` for Apache.
2. **PHP**: 7.4+ with cookie and JSON support.
3. **Environment (server-side)** for auth-code flow and token refresh:
   - `GOOGLE_CLIENT_ID` — same as the frontend OAuth client (Web application type).
   - `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (never expose in frontend).
4. **CORS**: Allowed origins are in `api/config.php`; add your frontend origin (e.g. production URL).
5. Test the API (replace host with your own):
   ```bash
   # Health / demo
   curl https://your-domain.com/api/hello

   # Auth: set cookie (legacy with access_token)
   curl -X POST https://your-domain.com/api/auth/cookie \
     -H "Content-Type: application/json" \
     -d '{"access_token": "test_token"}'

   # Auth: get cookie (returns token; backend refreshes if expired when refresh_token is stored)
   curl -X GET https://your-domain.com/api/auth/cookie --cookie "google_auth_token=..."
   ```

### Frontend Integration

- **Login:** Frontend uses OAuth authorization-code flow and sends `code` + `redirect_uri` to `POST /api/auth/cookie`. Backend exchanges the code for access and refresh tokens and sets HTTP-only cookies.
- **Logout:** `DELETE /api/auth/cookie` clears auth cookies.
- **Token usage:** Gmail scan and Sheets use the token from cookies; the backend resolves a valid token (refreshing when needed) so the app keeps working after the access token expires.

> **Important:** Cookies are HTTP-only and secure. JavaScript cannot read them; the backend handles token storage and refresh.

## Testing

The project includes comprehensive test coverage:

```
Test Files: 39 passed (39)
Tests: 401 passed (401)
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
