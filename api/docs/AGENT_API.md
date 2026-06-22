# Agent API — Job Application Logger

API endpoints used by automated agents (Codex, custom scripts, etc.) to
record job applications on behalf of a logged-in user on
`jajat.godieboy.com`.

> **Authentication model**: same session as the rest of the app. The user
> must be logged in (via `/api/auth/login` or the Google OAuth flow). The
> agent uses that same cookie session — there is no separate API key, no
> Bearer token. Every record is scoped to the session's `user_id`.

---

## Endpoints

### `POST /api/agent/job-applications`

Create a new job-application record. Idempotent.

#### Required fields

| Field | Type | Rule |
|:---|:---|:---|
| `job_title` | string | non-empty after trim |
| `company_name` | string | non-empty after trim |
| `source_url` | string | valid URL (`FILTER_VALIDATE_URL`) |
| `applied_at` | ISO 8601 datetime | any of: ATOM, `…P`, `…H:i:s`, `Y-m-d` — normalized to UTC |

#### Optional fields

| Field | Type | Notes |
|:---|:---|:---|
| `salary_text` | string\|null | empty string ⇔ null |
| `technologies` | string[] | normalized (lowercased, trimmed, deduped) |
| `location_text` | string\|null | |
| `province` | string\|null | e.g. "Ontario", "Quebec" |
| `country` | string\|null | e.g. "Canada" |
| `work_mode` | enum | `remote` \| `hybrid` \| `onsite` \| `unknown` (default: `unknown`) |
| `application_status` | enum | `submitted` \| `skipped` \| `failed` (default: `submitted`) |
| `notes` | string\|null | free text |
| `external_job_id` | string\|null | job id from the source board |
| `raw_payload` | object\|null | arbitrary audit blob (JSON-encoded) |
| `agent_name` | string\|null | **informational** label of which automation posted it (e.g. `"codex-canada-search"`). Not used for auth. |

`user_id` is **never** taken from the payload — always derived from the
session.

#### Response

`201 Created` — new record:
```json
{
  "success": true,
  "data": {
    "id": 42,
    "userId": 7,
    "jobTitle": "Backend Engineer",
    "companyName": "Acme Corp",
    "appliedAt": "2026-01-15T15:30:00+00:00",
    "applicationStatus": "submitted",
    "idempotencyHash": "f3a1…",
    "agentName": "codex-canada-search",
    "createdAt": "2026-01-15T15:31:02+00:00",
    "updatedAt": "2026-01-15T15:31:02+00:00"
  },
  "isDuplicate": false,
  "message": "Application recorded successfully"
}
```

`200 OK` — idempotency hit (same user, same `(company, title, source_url, applied_at)`):
```json
{
  "success": true,
  "data": { "..." },
  "isDuplicate": true,
  "message": "Application already exists (duplicate detected)"
}
```

`400` — validation error (missing/invalid required field, malformed JSON).
`401` — no active session.
`500` — unexpected insert failure.

#### Idempotency contract

- Idempotency hash = `sha256(user_id | company | title | source_url | applied_at)`.
- The hash is unique **per user**: two different users can post the same
  job and both records are kept.
- Re-running the automation for the same user returns the existing record
  with `isDuplicate: true` instead of duplicating it.

---

### `GET /api/agent/job-applications`

List the authenticated user's job applications. Other users' records are
never returned.

#### Query parameters

| Param | Type | Default |
|:---|:---|:---|
| `status` | string | — |
| `company` | string | matches `company_name LIKE %value%` |
| `work_mode` | string | — |
| `province` | string | — |
| `country` | string | — |
| `agent_name` | string | — |
| `limit` | int | 50 (capped at 100) |
| `offset` | int | 0 |
| `sort_by` | string | `created_at` (or `applied_at`, `company_name`, `job_title`) |
| `sort_order` | string | `DESC` (or `ASC`) |

#### Response

```json
{
  "success": true,
  "data": [ { "..." }, { "..." } ],
  "meta": { "total": 25, "limit": 50, "offset": 0 }
}
```

---

## User lifecycle contract

Users are never hard-deleted. Every per-user table (`applications`,
`timeline_events`, `opportunities`, `audit_log`, `agent_job_applications`)
declares `ON DELETE RESTRICT` on its `user_id` FK so a user cannot be
removed while their rows are still in the database.

To remove a user's access, **deactivate** them — `UPDATE users SET
is_active = 0 WHERE id = :id` — and the existing code paths handle it:
`AppAuthController::login()` rejects inactive users with `403 Account is
inactive`, and any future lookup that filters `WHERE is_active = 1` will
skip them. The actual code lives on `ModelMapper::deleteUser()` (soft
delete) and `ModelMapper::reactivateUser()` for symmetry.

Active audit rows are deliberately preserved across deactivation. If a
GDPR-style hard delete is ever required, the documented escape hatch is:
temporarily drop the RESTRICT FKs, delete the rows, delete the user,
re-add the FKs — an explicit, audited operation, not a one-liner.

---

## Authentication cookbook (agent side)

The agent must already be logged in. The standard flow:

```bash
# 1) Log in (cookies stored in jar.txt)
curl -s -c jar.txt -X POST https://jajat.godieboy.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"…"}'

# 2) Send the agent event
curl -s -b jar.txt -X POST https://jajat.godieboy.com/api/agent/job-applications \
  -H 'Content-Type: application/json' \
  -d '{
    "job_title": "Software Engineer",
    "company_name": "Acme Corp",
    "applied_at": "2026-01-15T10:30:00-05:00",
    "source_url": "https://jobs.example.com/123",
    "work_mode": "remote",
    "province": "Ontario",
    "country": "Canada",
    "technologies": ["PHP", "React"],
    "salary_text": "CAD 120k-150k",
    "agent_name": "codex-canada-search"
  }'

# 3) Optionally list recent applications
curl -s -b jar.txt 'https://jajat.godieboy.com/api/agent/job-applications?limit=10'
```

Or via Google OAuth: log in interactively once in a headless browser to
populate the cookie jar, then reuse it from the agent.

---

## Environment variables

The endpoint requires the standard user-session infrastructure (no extra
variables):

| Var | Purpose |
|:---|:---|
| `DB_*` | standard DB connection (MySQL or SQLite via `DB_DRIVER`) |
| `SESSION_*` | session cookie name/secure flags, as used elsewhere in the app |

Authentication secrets for the *user* (`GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, password hashing) follow the existing
configuration. The `AGENT_API_KEY` env var from the previous design has
been removed.

---

## Notes for connecting an automated agent (Codex flow)

1. **One-time bootstrap** — register or login a real user on
   `jajat.godieboy.com`. Persist the session cookie somewhere the agent
   can read.
2. **Per-application write** — after submitting an application on the
   job board, call `POST /api/agent/job-applications` with the cookie
   attached. The endpoint is idempotent, so retries are safe.
3. **Per-application skip / fail** — still POST, but with
   `application_status: "skipped"` or `"failed"` plus a `notes` string
   explaining why. This preserves the audit trail.
4. **Review** — `GET /api/agent/job-applications?status=submitted&limit=50`
   returns what was recorded, ordered by `created_at DESC`. UI screen
   can be built on top of this list.
5. **Filters that match your requirements**:
   - "Software Engineer" / "Backend Engineer": filter by
     `job_title LIKE`.
   - "Remote in provinces other than Ontario": `work_mode=remote AND
     province<>Ontario AND country=Canada`.
   - "All modes in Ontario": `country=Canada AND province=Ontario`
     (no `work_mode` filter).

---

## Operational notes

- **Migration**: re-run `data/schema.sql` to add `user_id NOT NULL` FK + indexes on the `agent_job_applications` table. Existing rows (from the previous API-key design) will need a backfill that assigns each orphan row to an "agent owner" user, or be deleted.
- **Security**:
  - Hash is `sha256` of user-scoped fields — sufficient for dedup, not cryptographic identity.
  - `user_id` filter is appended server-side from the session; the client cannot override it.
  - `FIND_IN_SET`-style inputs (`agent_name`, `status`, etc.) go through prepared statements via PDO bindings.
- **Logs / errors** — exception messages are returned as `{"success": false, "error": "…"}`. The `raw_payload` and `technologies` arrays are JSON-encoded for storage; their content is opaque to the server.
