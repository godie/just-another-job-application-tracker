# Networking CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a local-first networking CRM with optional account sync and invitation-only, candidate-controlled coach collaboration.

**Architecture:** Reuse the existing React/Zustand/localStorage pattern for anonymous use. Add owner-scoped Phinx tables and PHP routes only for signed-in sync and collaboration. Server authorization is relationship-based: an accepted candidate-coach relationship grants read/comment/suggest access, while mutations of candidate records remain candidate-only.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, PHP 8.4, Phinx, PHPUnit, MySQL/SQLite-compatible SQL.

## Global Constraints

- Anonymous networking data stays in `localStorage`; account creation is never required to use the CRM.
- Existing application/opportunity storage and sync contracts remain backward compatible.
- Coach edits are prohibited at API and UI layers; only candidates apply suggestions.
- Every cloud query scopes by candidate owner ID and validates an active candidate-coach relationship where the actor is not the owner.
- All user-provided text is sanitized in the frontend and bound as SQL parameters in the backend.
- Add English and Spanish copy for every new visible string and preserve keyboard/screen-reader access.
- Treat the documentation-only planning branch as PATCH version `2.6.39`; each later implementation PR gets its own SemVer bump and CHANGELOG entry.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `src/types/networking.ts` | Local CRM entities and validation unions. |
| `src/storage/networking.ts` | Versioned local persistence, migration, sanitization, and same-tab events. |
| `src/stores/networkingStore.ts` | Zustand mutations and selectors for contacts, interactions, tasks, links, and referrals. |
| `src/pages/NetworkingPage.tsx` | Candidate-facing dashboard, contacts, follow-ups, and referral workflow. |
| `src/components/networking/*` | Focused forms, task list, contact detail, and relation controls. |
| `db/migrations/*CreateNetworkingCrmTables.php` | Cloud CRM schema and indexes. |
| `api/src/Controllers/NetworkingController.php` | Authenticated, owner-scoped CRM sync/read/write endpoints. |
| `api/src/Controllers/CollaborationController.php` | Invitations, comments, suggestions, and candidate resolution. |
| `api/src/Repositories/NetworkingRepository.php` | Parameterized CRM persistence and owner-scoped retrieval. |
| `api/src/Services/WorkspaceAccessService.php` | Single authorization boundary for owner/coach access. |
| `api/tests/*` | PHP authorization, controller, and migration-facing test coverage. |

## Task 1: Local CRM domain, storage, and store

**Files:**
- Create: `src/types/networking.ts`
- Create: `src/storage/networking.ts`
- Create: `src/stores/networkingStore.ts`
- Create: `src/storage/networking.test.ts`
- Create: `src/stores/networkingStore.test.ts`
- Modify: `src/utils/constants.ts`

**Interfaces:**
- Produces `NetworkContact`, `NetworkInteraction`, `FollowUpTask`, `ContactLink`, and `Referral` records, each with a string `id` and ISO timestamps.
- Produces `useNetworkingStore` with `load`, CRUD actions, `completeFollowUp`, and `getDueTasks(now)`.

- [ ] **Step 1: Write failing storage tests**

Test an absent `jobNetworking` key returns an empty, valid workspace; malformed JSON returns an empty workspace; a legacy workspace without `schemaVersion` migrates to version 1; and saving dispatches `jobNetworkingUpdated` once.

- [ ] **Step 2: Run the storage test and verify failure**

Run: `npm test -- src/storage/networking.test.ts`

Expected: FAIL because `src/storage/networking.ts` does not exist.

- [ ] **Step 3: Implement the local contract**

Define `NETWORKING_STORAGE_KEY = 'jobNetworking'`. Persist one `NetworkingWorkspace` object containing `schemaVersion: 1` and arrays for all five entities. Use `sanitizeObject`, `generateId`, ISO timestamps, and a `jobNetworkingUpdated` custom event following `src/storage/applications.ts` and `src/storage/opportunities.ts`.

- [ ] **Step 4: Add store behavior tests and implementation**

Test creating a contact writes one contact; completing a task sets `completedAt` without deleting it; and due-task selection returns incomplete tasks ordered by `dueAt`. Implement only these mutations in `useNetworkingStore`, persist after every mutation, and load from `getNetworkingWorkspace()`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/storage/networking.test.ts src/stores/networkingStore.test.ts && npm run lint`

Expected: PASS with no TypeScript or lint errors.

Commit: `feat(networking): add local CRM data model and storage`

## Task 2: Candidate networking workspace UI

**Files:**
- Create: `src/pages/NetworkingPage.tsx`
- Create: `src/components/networking/ContactForm.tsx`
- Create: `src/components/networking/ContactList.tsx`
- Create: `src/components/networking/FollowUpList.tsx`
- Create: `src/components/networking/InteractionForm.tsx`
- Create: `src/pages/NetworkingPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/locales/en/translation.json`
- Modify: `src/locales/es/translation.json`

**Interfaces:**
- Consumes `useNetworkingStore` from Task 1.
- Produces an accessible `networking` route in `PageType` and a responsive dashboard showing overdue, today, and upcoming tasks.

- [ ] **Step 1: Write failing page tests**

Cover an empty state with “Add contact”; an overdue task rendered before today/upcoming tasks; creation of a contact through labels and submit; and an interaction appearing under its selected contact. Use the i18n test setup rather than hard-coding test-only strings.

- [ ] **Step 2: Run page tests and verify failure**

Run: `npm test -- src/pages/NetworkingPage.test.tsx`

Expected: FAIL because the Networking page and route do not exist.

- [ ] **Step 3: Implement accessible candidate views**

Add `networking` to `PageType`, lazy-load `NetworkingPage`, and add the navigation entry. Build forms with labelled controls for required contact name, relationship type, interaction channel, and follow-up action/date. Use semantic lists, buttons, and headings; do not encode state exclusively by color.

- [ ] **Step 4: Add application/opportunity links and referrals**

Use existing application and opportunity stores as read-only selectors. Allow the candidate to link either record type to a contact and to create a referral status record. Reject duplicate contact/resource links in the store before persistence.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/pages/NetworkingPage.test.tsx && npm run lint && npm run build`

Expected: PASS; the guest workspace works without an authenticated user.

Commit: `feat(networking): add local contacts and follow-up workspace`

## Task 3: Cloud schema and owner-scoped CRM API

**Files:**
- Create: `db/migrations/20260729090000_CreateNetworkingCrmTables.php`
- Create: `api/src/Repositories/NetworkingRepository.php`
- Create: `api/src/Controllers/NetworkingController.php`
- Create: `api/tests/Repositories/NetworkingRepositoryTest.php`
- Create: `api/tests/Controllers/NetworkingControllerTest.php`
- Modify: `api/index.php`
- Modify: `docs/DB_SCHEMA.md`

**Interfaces:**
- `NetworkingRepository::replaceWorkspace(int $ownerUserId, array $workspace): void` only writes rows owned by that user in one transaction.
- `NetworkingRepository::getWorkspace(int $ownerUserId): array` returns the Task 1 workspace shape.
- `NetworkingController` exposes authenticated `GET` and `PUT` `/sync/networking` endpoints.

- [ ] **Step 1: Write failing repository and controller tests**

Test that `getWorkspace(10)` never returns a contact owned by user 11; replacing user 10's workspace cannot change user 11's rows; an unauthenticated request returns 401; and an invalid relationship type returns 422.

- [ ] **Step 2: Run PHP tests and verify failure**

Run: `cd api && ./vendor/bin/phpunit tests/Repositories/NetworkingRepositoryTest.php tests/Controllers/NetworkingControllerTest.php`

Expected: FAIL because the repository, controller, migration, and route do not exist.

- [ ] **Step 3: Add the migration and repository**

Create the tables defined in the design document with `owner_user_id` foreign keys to `users`, contact foreign keys where relevant, and indexes on `(owner_user_id, due_at)`, `(owner_user_id, contact_id)`, and `(owner_user_id, resource_type, resource_id)`. Use transactions for replacement and parameterized statements for every query.

- [ ] **Step 4: Add controller and routes**

Add `GET /sync/networking` and `PUT /sync/networking` closures to `api/index.php`, guarded by `RequireAuth::handle()`. Derive the owner only from the server session. Validate workspace arrays, enum values, ISO date fields, and link resource types before calling the repository.

- [ ] **Step 5: Verify and commit**

Run: `cd api && composer phinx -- migrate -e development && ./vendor/bin/phpunit tests/Repositories/NetworkingRepositoryTest.php tests/Controllers/NetworkingControllerTest.php`

Expected: migration succeeds and all owner-isolation tests pass.

Commit: `feat(networking): add authenticated CRM sync API`

## Task 4: Opt-in networking synchronization

**Files:**
- Create: `src/services/networkingSync.ts`
- Create: `src/services/networkingSync.test.ts`
- Modify: `src/hooks/useCloudSync.ts`
- Modify: `src/components/sync/MergePromptHandler.tsx`
- Modify: `src/components/sync/MergePromptModal.tsx`
- Modify: `src/pages/BackupSyncPage.tsx`

**Interfaces:**
- `fetchRemoteNetworking(): Promise<NetworkingWorkspace>` and `saveRemoteNetworking(workspace: NetworkingWorkspace): Promise<void>`.
- Extends the existing local/remote/manual merge choice to networking records keyed by `id`.

- [ ] **Step 1: Write failing sync tests**

Test no HTTP request is sent when unauthenticated; local-wins retains local CRM entities; remote-wins replaces them; and manual merge includes both non-conflicting contact IDs without duplicating them.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/services/networkingSync.test.ts`

Expected: FAIL because the networking sync service is absent.

- [ ] **Step 3: Implement sync without changing anonymous behavior**

Use the same authenticated request helper as applications/opportunities. Keep local storage as the initial render source; only fetch cloud data after a user explicitly initiates sync. Surface 401, network, and validation failures in the existing error UI without deleting local data.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/services/networkingSync.test.ts && npm run lint`

Expected: PASS; signing out leaves the local CRM intact.

Commit: `feat(networking): add opt-in CRM synchronization`

## Task 5: Invitation-only candidate–coach access

**Files:**
- Create: `db/migrations/20260729090100_CreateCollaborationAccessTables.php`
- Create: `api/src/Services/WorkspaceAccessService.php`
- Create: `api/src/Controllers/CollaborationController.php`
- Create: `api/tests/Services/WorkspaceAccessServiceTest.php`
- Create: `api/tests/Controllers/CollaborationControllerTest.php`
- Modify: `api/index.php`

**Interfaces:**
- `WorkspaceAccessService::canReadCandidate(int $actorUserId, int $candidateUserId): bool` permits the owner or active coach only.
- `WorkspaceAccessService::canManageOrganization(int $actorUserId, int $organizationId): bool` evaluates organization role only.
- Collaboration routes create, list, accept, reject, and revoke invitations/relationships.

- [ ] **Step 1: Write authorization tests first**

Cover: a pending invitation grants no read access; accepting creates one active relationship; revoking removes access; an organization admin without a relationship cannot read a candidate; and a mismatched invitee email cannot accept an invitation.

- [ ] **Step 2: Run PHP tests and verify failure**

Run: `cd api && ./vendor/bin/phpunit tests/Services/WorkspaceAccessServiceTest.php tests/Controllers/CollaborationControllerTest.php`

Expected: FAIL because collaboration services and routes do not exist.

- [ ] **Step 3: Implement invitation state transitions**

Add invitation and relationship tables with foreign keys, unique active candidate/coach pairs, expirations, and status indexes. Normalize invitee email. Do not disclose account existence during invitation creation. On acceptance, require the logged-in email to equal the invitee email and insert the active relationship transactionally.

- [ ] **Step 4: Add routes and policy enforcement**

Expose authenticated invitation endpoints. Require organization-management permission to issue organization invitations and candidate ownership to revoke their relationship. Reuse `WorkspaceAccessService` from every future read/comment/suggestion controller rather than reimplementing checks.

- [ ] **Step 5: Verify and commit**

Run: `cd api && ./vendor/bin/phpunit tests/Services/WorkspaceAccessServiceTest.php tests/Controllers/CollaborationControllerTest.php`

Expected: PASS; no pending, revoked, or admin-only relationship can read candidate data.

Commit: `feat(collaboration): add accepted coach invitations`

## Task 6: Comments and candidate-approved suggestions

**Files:**
- Create: `api/tests/Controllers/CollaborationCommentsTest.php`
- Modify: `api/src/Controllers/CollaborationController.php`
- Modify: `api/src/Services/WorkspaceAccessService.php`
- Create: `db/migrations/20260729090200_CreateCollaborationFeedbackTables.php`
- Create: `src/components/collaboration/CommentThread.tsx`
- Create: `src/components/collaboration/SuggestionInbox.tsx`
- Create: `src/components/collaboration/SuggestionInbox.test.tsx`

**Interfaces:**
- A suggestion payload is `{ resourceType, resourceId, patch }`; `patch` may include only explicit, per-resource editable fields.
- Only `candidate_user_id` may resolve a suggestion; resolution is `accepted`, `modified`, or `rejected`.

- [ ] **Step 1: Write failing security tests**

Test an authorized coach can create a comment and suggestion but receives 403 when directly updating a candidate contact; a candidate can accept a valid contact `notes` patch; a patch containing `ownerUserId` returns 422; and a revoked coach cannot read or create comments.

- [ ] **Step 2: Run tests and verify failure**

Run: `cd api && ./vendor/bin/phpunit tests/Controllers/CollaborationCommentsTest.php`

Expected: FAIL because comments, suggestions, and resolution logic do not exist.

- [ ] **Step 3: Implement append-only collaboration records**

Add `workspace_comments` and `workspace_suggestions` in `20260729090200_CreateCollaborationFeedbackTables.php`. Validate the target resource belongs to the candidate before storing either record. Store a sanitized body and a JSON patch. Never expose a write endpoint that applies a coach patch directly.

- [ ] **Step 4: Implement candidate resolution and UI**

On acceptance or modification, re-fetch the candidate-owned resource, whitelist patch fields, apply the selected patch in a transaction, and record `resolved_at` and `resolved_by_user_id`. Build the candidate inbox with Accept, Edit then accept, and Reject controls; the coach view shows status only.

- [ ] **Step 5: Verify and commit**

Run: `cd api && ./vendor/bin/phpunit tests/Controllers/CollaborationCommentsTest.php && cd .. && npm test -- src/components/collaboration/SuggestionInbox.test.tsx && npm run lint`

Expected: PASS; direct coach mutations remain impossible through both tested API and UI paths.

Commit: `feat(collaboration): add candidate-approved suggestions`

## Task 7: Organization workspace and final verification

**Files:**
- Create: `src/pages/OrganizationPage.tsx`
- Create: `src/pages/OrganizationPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/locales/en/translation.json`
- Modify: `src/locales/es/translation.json`
- Modify: `docs/DB_SCHEMA.md`
- Modify: `docs/MULTITENANCY_AND_AUTH_PLAN.md`

**Interfaces:**
- Organization admin UI manages organization members and invitations but contains no candidate-record listing unless the admin is also an accepted coach.

- [ ] **Step 1: Write failing privacy and accessibility tests**

Test an admin sees membership controls but no candidate contact/application data by default; a coach sees only accepted candidate workspaces; and all invitation, comment, and suggestion controls have accessible names.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/pages/OrganizationPage.test.tsx`

Expected: FAIL because the organization page does not exist.

- [ ] **Step 3: Implement organization controls and documentation**

Expose membership/invitation management only to authorized administrators. Separate the coach's assigned-candidate list from the administrator view. Update schema and multitenancy docs with final tables, roles, retention, revocation behavior, and self-hosting requirements.

- [ ] **Step 4: Run complete verification**

Run: `npm run lint && npm test && npm run build && cd api && composer phinx -- status -e development && ./vendor/bin/phpunit`

Expected: all frontend checks pass, migrations report applied/pending as expected, and the PHP suite passes.

- [ ] **Step 5: Commit and open a separate implementation PR**

Before opening the implementation PR, bump `package.json` exactly once using the SemVer level appropriate to the completed feature set, update `CHANGELOG.md`, run `scripts/check-orphans.sh`, and keep all follow-up commits at that same version.

Commit: `feat(organizations): add private coach workspace controls`

## Plan self-review

- Spec coverage: Tasks 1–2 deliver the anonymous CRM; Tasks 3–4 add optional sync; Task 5 enforces invitation acceptance; Task 6 implements comments and candidate-controlled suggestions; Task 7 documents and verifies private organization administration.
- No direct coach mutation route or UI action is specified.
- Every cloud access path has an owner or relationship authorization test.
- Bulk outreach, email/calendar sync, public profiles, and automatic organization-wide visibility remain deliberately excluded.
