# Multitenancy And Auth Plan

This document defines the intended product behavior, the target backend architecture, and the migration path needed to add accounts, sync, and multitenancy without breaking the frontend flows that already work today.

## Product Rules

- The app must remain usable without registration.
- Anonymous users can keep using the app locally with browser storage only.
- Registration/login is required only for cross-device sync and account-backed persistence.
- Google login and Google service access are not the same concern.
- Logging in with Google for app auth should create the user automatically if the email does not exist yet.
- Existing frontend behavior that already works for local usage must not regress.

## Current State

### What works today

- Frontend works in anonymous mode using local storage.
- Google OAuth cookie flow exists for Google services.
- Backend can store Google access/refresh tokens in HTTP-only cookies via `/api/auth/cookie`.
- Google service routes such as Sheets/Gmail-related flows depend on those cookies.
- Early model layer exists for `User`, `Organization`, `Application`, `Opportunity`, `InterviewEvent`, and `UserPreferences`.

### What does not exist yet as app auth

- No real app account session lifecycle.
- No `GET /api/auth/me`.
- No production-ready `POST /api/auth/login`.
- No production-ready `POST /api/auth/register`.
- No production-ready `DELETE /api/auth/logout`.
- No completed flow that links Google identity to a database-backed app user session.

## Important Separation

There are two different auth layers and they should stay separate.

### 1. Google service auth

Purpose:

- access Google Sheets
- access Gmail APIs
- manage Google access token / refresh token cookies

Current route family:

- `GET /api/auth/cookie`
- `POST /api/auth/cookie`
- `DELETE /api/auth/cookie`

This is not the same thing as an app user session.

### 2. App auth

Purpose:

- identify the current app user
- decide whether sync is allowed
- connect user data across devices
- attach data to a tenant / organization

Target route family:

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `DELETE /api/auth/logout`
- optionally `POST /api/auth/google`

## Recommended Auth Behavior

### Anonymous usage

- user opens app
- no account required
- applications/opportunities/preferences remain local-only
- no backend session required

### Email/password account

- user registers with email and password
- backend creates `users` row
- backend creates default `user_preferences`
- backend creates session and returns authenticated user

### Google account for app auth

- user signs in with Google
- backend validates Google identity
- backend searches `users.email`
- if user does not exist, create the account automatically
- backend creates session
- backend returns authenticated user

### Google services

- app may still separately store Google API cookies for Sheets/Gmail
- this can happen after app login or independently
- app user session and Google service cookies should be related, but not conflated

## What `GET /api/auth/me` Should Mean

`GET /api/auth/me` should answer one question only:

"Is there a currently authenticated app user session, and if so, who is it?"

Expected response shape:

```json
{
  "success": true,
  "user": {
    "id": 12,
    "email": "user@example.com",
    "displayName": "User Example",
    "organizationId": 3,
    "role": "owner"
  }
}
```

If no app session exists:

```json
{
  "success": false,
  "user": null
}
```

It should not return raw Google tokens.

## Multitenancy Goal

The system should support both:

- direct usage from the main hosted domain
- self-hosted installation by organizations on their own infrastructure

That implies tenant-aware storage, routing, authorization, and configuration.

## Tenant Model Recommendation

Recommended baseline:

- `organizations` table
- `users.organization_id`
- every sync-backed business record belongs to a user and optionally an organization

Suggested rules:

- standalone/personal accounts may have `organization_id = NULL` or a personal org row
- organization installs should usually operate with a non-null organization
- queries for synced data must always scope by `user_id`, and where relevant by `organization_id`

## What Still Needs To Exist For Real Multitenancy

### Data model

- final schema for `users`
- final schema for `organizations`
- final schema for `user_preferences`
- confirm whether `applications`, `opportunities`, and `timeline_events` always carry `organization_id`
- unique constraints for tenant-safe identities
- password hashing and reset strategy

### Authentication

- app session creation and destruction
- registration endpoint
- login endpoint
- `auth/me`
- Google-to-user linking flow
- session regeneration on login
- secure session cookie configuration

### Authorization

- all sync routes must verify authenticated app user
- all tenant-backed queries must scope correctly
- role rules for owner/admin/member if organizations share data
- clear policy for personal accounts vs shared organization accounts

### Sync behavior

- local-only mode must remain untouched
- sync should be opt-in
- first sync needs a merge policy
- conflict strategy must be defined:
  - local wins
  - remote wins
  - manual merge

### Backend tenancy resolution

For the hosted product:

- session decides current user
- user row decides organization

For self-hosted org installs:

- same codebase can work with one organization in one database
- or many organizations in one database

Recommended first step:

- single database, row-level tenancy by `organization_id`

Do not start with per-tenant databases unless there is a hard business reason.

### Deployment model

Need clear support for both:

1. Hosted on your domain
2. Installed on customer infrastructure

## Deployment Modes

### Mode A: Hosted SaaS on your domain

Characteristics:

- users sign up on your domain
- you host frontend and backend
- shared codebase
- row-level tenancy in one database

Best for:

- easiest product evolution
- fastest releases
- centralized support

### Mode B: Self-hosted on organization servers

Characteristics:

- organization deploys frontend/backend on its own domain
- its own database
- optional single-tenant operation

Needed for this mode:

- documented env variables
- migration scripts
- seed/bootstrap flow
- admin account bootstrap
- CORS and cookie guidance
- reverse proxy examples

## Non-Breaking Migration Strategy

The main rule is:

Do not break anonymous/local mode while adding account mode.

Recommended sequence:

1. Keep local storage as default behavior.
2. Add backend account endpoints without changing anonymous usage.
3. Add `auth/me` only for app sessions.
4. Add email/password registration and login.
5. Add logout.
6. Add Google app-login that creates user by email when missing.
7. Only then wire sync routes to require app auth.
8. Add merge/conflict UI for first sync.

## Frontend Compatibility Rules

- Existing local CRUD must keep working without backend auth.
- Existing Google cookie flow for Sheets/Gmail must keep working.
- Frontend should not assume every user is authenticated.
- Auth store should treat "not logged in" as valid normal state, not as an app error.
- Pages that require sync should prompt for account creation/login instead of blocking the whole app.

## Suggested Backend Endpoint Contract

### App auth

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `DELETE /api/auth/logout`
- `POST /api/auth/google`

### Google service auth

- `GET /api/auth/cookie`
- `POST /api/auth/cookie`
- `DELETE /api/auth/cookie`

### Sync

- `GET /api/sync/applications`
- `POST /api/sync/applications`
- `GET /api/sync/opportunities`
- `POST /api/sync/opportunities`

Sync routes should eventually require app auth, not just arbitrary session presence.

## Minimum Backend Session Payload

Recommended PHP session keys:

- `user_id`
- `organization_id`
- `role`
- optionally `auth_provider` with values like `local` or `google`

## Open Decisions

- Whether personal users get `organization_id = NULL` or a personal organization row.
- Whether organizations can have multiple users from day one or only later.
- Whether app auth and Google service auth should share one login action or remain separate.
- Whether sync is full overwrite or merge-based on first release.
- Whether self-hosted installs are officially single-tenant only at first.

## Recommended Immediate Next Steps

1. Finish and stabilize the DB schema for `users`, `organizations`, and `user_preferences`.
2. Implement app session auth endpoints: `me`, `register`, `login`, `logout`.
3. Keep `auth/cookie` exclusively for Google API access.
4. Add Google app-login that auto-creates user by email.
5. Update frontend auth store to use `auth/me` only for app auth state, while keeping anonymous mode as first-class behavior.
6. Gate sync features behind authenticated app account state, not behind general app usage.
