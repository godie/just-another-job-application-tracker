# Job Application Tracker

# Project Overview

This is a modern Job Application Tracker built using React, TypeScript, and Tailwind CSS. The project follows Test-Driven Development (TDD) principles, utilizing Vitest and React Testing Library for comprehensive unit and component testing.The application manages job applications locally, with an architecture designed for seamless integration with external services like Google Sheets.

## Runtime Requirements

- Node.js 22.x
- npm 10.9.2

# Project Status

**Completion: 98%**

This project is feature-complete for its core functionality. Based on the project [recommendations](./DOCS/RECOMMENDATIONS.md), 48 out of 48 planned features have been implemented and are fully tested. The test suite has 868+ tests (79 test files) with Vitest and React Testing Library.

## Recent Updates

- **Backend API as Mini-Framework**: The PHP API (`/api`) is now a small framework with a single entry point (`index.php`), router, controllers, and helpers. All endpoints are under `/api/*` (auth, captcha, suggestions, google-sheets). See [DOCS/API.md](./DOCS/API.md) for routes and structure.
- **OAuth Authorization Code + Token Refresh**: Login uses the authorization-code flow; the backend exchanges the code for access and refresh tokens and stores them in HTTP-only cookies. When the access token expires, the backend refreshes it automatically (Sheets proxy and GET `/api/auth/cookie` use a valid token). Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the server.
- **Application Fields: Location, Work Type, Hybrid Days**: `JobApplication` now includes optional `location`, `workType` (remote / on-site / hybrid), and when hybrid, `hybridDaysInOffice` (1–5 days per week). Form, table, and opportunity-to-application conversion support these fields.
- **Email Scan (Gmail)**: In Settings, scan Gmail for application-related emails; preview proposed additions and updates, then apply selected items to the tracker. Handles rate limits with a clear message and chunked fetching.
- **AI-Powered Job Matching**: Deterministic scoring engine plus Gemini AI for profile synthesis and job scoring. MatchScoreBadge, breakdown modal, profile setup wizard, and matching settings (accessible from Settings → 🤖 Matching). Core logic, types, persistence, Zustand store, and all UI components complete. Pending: UI integration on OpportunitiesPage (T12) and HomePage (T14) — see [DOCS/MATCHING_IMPLEMENTATION_TASKS.md](./DOCS/MATCHING_IMPLEMENTATION_TASKS.md).
- **PWA**: The app is installable as a Progressive Web App (manifest, service worker). Install from the browser on desktop and mobile when served over HTTPS.
- **i18n Test Mock**: Test setup loads the English translation JSON and flattens it for the `react-i18next` mock, avoiding duplicated translation strings in tests.
- **Zustand State Management**: Global state with Zustand stores for applications, opportunities, preferences, and authentication.
- **Full Internationalization (i18n)**: Bilingual experience (English/Spanish) with `i18next` across the app.
- **Support & Suggestions System**: Support page with suggestion form, PHP + SQLite backend, and numeric CAPTCHA.
- **Direct ATS Search**: Opportunities page generates targeted Google search queries for major ATS (Ashby, Greenhouse, Lever, Workable, Workday, etc.).
- **Mobile-First Responsive Design**: Card-based table on mobile, compact metrics, adaptive header and login button.
- **Test Infrastructure**: 680+ tests passing with Vitest and happy-dom.

## Database Migrations (Phinx)

The PHP API uses [Phinx](https://phinx.org/) for lightweight MySQL schema migrations. Configuration lives in [phinx.php](./phinx.php), and migration files are stored in [`db/migrations`](./db/migrations).

### Install PHP Dependencies

```bash
cd api
composer install
```

### Check Migration Status

```bash
cd api
composer phinx -- status -e development
```

Use `-e production` on the production server.

### Baseline an Existing Production Database

If production already has a legacy database and you want Phinx to start tracking it without changing current tables or data, run only the baseline migration:

```bash
cd api
composer phinx -- migrate -e production -t 20260622090000
```

This creates the `phinxlog` table if needed and marks `20260622090000_InitialDatabaseBaseline.php` as executed. It does not alter existing application tables.

The current legacy MySQL schema already exists and is defined in [api/data/schema.sql](./api/data/schema.sql). The high-level reference notes live in [DOCS/DB_SCHEMA.md](./DOCS/DB_SCHEMA.md). That schema should be treated as already deployed in production. From now on, Phinx should manage only incremental changes after the baseline.

Current incremental migrations in this branch:

- `20260622100000_UpgradeLegacySchemaForSessionAuth`
- `20260622100100_CreateAuthTokensAndAuditLogTables`
- `20260622100200_CreateAgentJobApplicationsTable`

Reference-only logical migration breakdown for the existing schema:

- `CreateUsersTable`
- `CreateApplicationsTable`
- `CreateTimelineEventsTable`
- `CreateOpportunitiesTable`
- `CreateUserPreferencesTable`
- `CreateOrganizationsTable`
- `CreateOrganizationMembersTable`
- `CreateAuthTokensTable`
- `CreateAuditLogTable`

Do not add those legacy table-creation migrations as pending executable files in `db/migrations` for the current production environment, or Phinx may try to replay schema that already exists.

### Run Pending Migrations

```bash
cd api
composer phinx -- migrate -e development
```

For production:

```bash
cd api
composer phinx -- migrate -e production
```

For an existing production database on this branch, the safe order is:

1. `composer phinx -- migrate -e production -t 20260622090000`
2. `composer phinx -- migrate -e production`

### Create a New Migration

```bash
cd api
composer phinx -- create CreateUsersTable
```

Phinx will generate a new file in `db/migrations`. Then implement the schema change using the Phinx API, for example:

```php
$table = $this->table('logs');
$table
    ->addColumn('level', 'string', ['limit' => 50])
    ->addColumn('message', 'text')
    ->create();
```

Recommended migration naming style:

- `CreateUsersTable`
- `AddStatusToApplicationsTable`
- `CreateAuthTokensTable`

## Next Steps

- Complete matching UI integration: add MatchScoreBadge + RecommendationPanel to OpportunitiesPage and HomePage (see [DOCS/MATCHING_IMPLEMENTATION_TASKS.md](./DOCS/MATCHING_IMPLEMENTATION_TASKS.md) T12, T14)
- Browser notifications for interviews and follow-ups
- Export to PDF/CSV and enhanced data import

