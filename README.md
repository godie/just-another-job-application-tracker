# Job Application Tracker

# Project Overview

This is a modern Job Application Tracker built using React, TypeScript, and Tailwind CSS. The project follows Test-Driven Development (TDD) principles, utilizing Vitest and React Testing Library for comprehensive unit and component testing.The application manages job applications locally, with an architecture designed for seamless integration with external services like Google Sheets.

## Runtime Requirements

- Node.js 22.x
- npm 10.9.2

# Project Status

**Completion: 98%**

This project is feature-complete for its core functionality. Based on the project [recommendations](./DOCS/RECOMMENDATIONS.md), 48 out of 48 planned features have been implemented and are fully tested. The test suite has 1,036+ tests (101 test files) with Vitest and React Testing Library.

## Recent Updates

- **AI Judgments (TypeSafe)**: Email event classification, email-to-application matching, opportunity match scoring and CSV/Sheets header mapping run through TypeSafe's typed primitives (`choice` / `score` / `noul`) behind `POST /api/ai/judgments`. The API key stays server-side (`TYPESAFE_API_KEY`), every answer carries a calibrated confidence used to gate behaviour, and every path keeps its previous deterministic result whenever the service is unavailable or the answer is not confident enough. See [AI judgments](#ai-judgments-typesafe) below and [DOCS/TYPESAFE_OPPORTUNITIES.md](./DOCS/TYPESAFE_OPPORTUNITIES.md).
- **Backend API as Mini-Framework**: The PHP API (`/api`) is now a small framework with a single entry point (`index.php`), router, controllers, and helpers. All endpoints are under `/api/*` (auth, captcha, suggestions, google-sheets, ai). See [DOCS/API.md](./DOCS/API.md) for routes and structure.
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
- **Test Infrastructure**: 1,036+ tests passing with Vitest and happy-dom.

## AI judgments (TypeSafe)

Four features ask [TypeSafe](https://docs.typesafe.ai) for typed judgments instead of parsing generated text. The workflow and side effects stay in code; the model only answers narrow, structured questions.

| Feature | Judgment | Fallback when unavailable or unsure |
| --- | --- | --- |
| Email scan — classification | One `choice` per email (`application_submitted` / `next_steps` / `rejected` / `offer` / `other`), batched into one request per scan | The keyword cascade in `EmailAdapter.classify` |
| Email scan — matching | One `choice` over code-built application candidates, so "ACME, Inc." still matches "Acme" | Exact company match (previous behaviour) |
| Opportunity matching — scoring | Six `score` questions in one request, composed in code with the app's weights; Gemini is consulted only below the confidence gate and only with a BYOK key | Deterministic scoring engine |
| CSV / Sheets import | One `choice` per column, mapping foreign headers ("Job Title", "Empresa", "Estado") onto app fields | Canonical header names only |

Confidence gates: `≥ 0.7` applies the answer, `0.5–0.7` applies it and flags the proposal for review, below that the deterministic path stays in charge. Import columns below the gate are reported in the UI instead of being dropped silently.

**Endpoint**: `POST /api/ai/judgments` (`api/src/Controllers/AiJudgmentController.php`) forwards `{ state, questions }` to `api.typesafe.ai/v1/systemone`. It requires an authenticated session, bounds the payload (25 questions, 100 KB state) and keeps the API key server-side.

**Setup**:

- Local: set `TYPESAFE_API_KEY` in `api/.env` (see `api/.env.example`). `TYPESAFE_MODEL` is optional and defaults to `jev-latest`.
- Deploy: add the `TYPESAFE_API_KEY` GitHub secret; the workflow injects it into `dist/api/config.php`.
- Without a key the endpoint answers `503` and every caller falls back to its deterministic behaviour — nothing breaks.

See [DOCS/TYPESAFE_OPPORTUNITIES.md](./DOCS/TYPESAFE_OPPORTUNITIES.md) for the design review, the measured results and the opportunities still open.

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
