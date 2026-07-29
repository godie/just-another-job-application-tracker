# Networking CRM Design

## Goal

Extend JAJAT from an application tracker into a local-first networking CRM. It must help a job seeker manage professional relationships and follow-ups while preserving anonymous, private use. Signed-in users can optionally sync their data and accept coaching support; coaches can comment and propose changes but never edit a candidate's data directly.

## Product decisions

- Anonymous mode remains fully functional. Contacts, interactions, tasks, and referrals are stored only in browser storage unless the user elects to sign in and synchronize.
- A signed-in user owns every networking record they create. Organization membership does not grant automatic access to the user's applications, contacts, or notes.
- Collaboration starts only after the candidate accepts an invitation. Candidates can revoke access at any time.
- A coach can read the shared candidate workspace, create comments, and submit structured suggestions. A candidate must accept, modify, or reject every suggestion before it changes a record.
- An organization administrator manages organization membership and coach assignments. Administrator status alone does not grant candidate-workspace access.

## MVP scope

### Contacts

Each contact has a name, optional company and role, email, phone, LinkedIn URL, location, relationship type, tags, notes, and timestamps. Supported relationship types are recruiter, hiring manager, referrer, former colleague, mentor, peer, and other.

### Interactions and follow-ups

An interaction records one completed or planned exchange with a contact: date/time, channel (email, LinkedIn, phone, video, in-person, event, or other), summary, and private notes. A follow-up task stores a next action, due date, completion state, and the contact it concerns. The dashboard exposes overdue, today, and next-seven-days tasks.

### Job-search links and referrals

Contacts may be linked to existing applications and opportunities. A referral records the referring contact, linked job record, request date, current state (planned, requested, introduced, submitted, declined, or completed), and notes. No duplicate application, opportunity, or contact record is created solely to make a link.

### Collaboration

An invitation is addressed to an existing account email and has a proposed role of candidate or coach. It is pending until the recipient accepts, rejects, or it expires. A candidate accepts an invitation before a coach can access their workspace. Comments are append-only. Suggestions are target-specific, contain a JSON patch limited to allow-listed editable fields, and are immutable after submission except for their candidate-controlled resolution.

## Non-goals for this release family

- Bulk outreach campaigns, automatic email sending, email inbox synchronization, calendar synchronization, or AI-written outreach.
- Public professional profiles, social feeds, a candidate directory, or administrator access to all candidate records.
- Direct coach editing, suggestion auto-application, or background automation that creates interactions from external services.
- Replacing the existing applications and opportunities data model.

## Data model

All cloud-backed CRM tables include `owner_user_id`, timestamps, and indexes beginning with the owner ID. Organization membership is checked only when a collaboration relationship is created; record authorization remains owner-centric.

| Entity | Important fields | Ownership and links |
| --- | --- | --- |
| `network_contacts` | id, owner_user_id, name, company, role, email, phone, linkedin_url, location, relationship_type, tags_json, notes | owned by one candidate |
| `network_interactions` | id, owner_user_id, contact_id, occurred_at, channel, summary, notes, status | belongs to one contact |
| `network_follow_up_tasks` | id, owner_user_id, contact_id, title, due_at, completed_at | belongs to one contact |
| `network_contact_links` | id, owner_user_id, contact_id, resource_type, resource_id | links to an application or opportunity; unique per contact/resource pair |
| `network_referrals` | id, owner_user_id, contact_id, resource_type, resource_id, status, requested_at, notes | links a referrer to an application or opportunity |
| `collaboration_invitations` | id, organization_id, inviter_user_id, invitee_email, proposed_role, expires_at, accepted_at, rejected_at | invitation only; no workspace access before acceptance |
| `candidate_coach_relationships` | id, organization_id, candidate_user_id, coach_user_id, status, revoked_at | accepted invitation materialized as an active relationship |
| `workspace_comments` | id, candidate_user_id, author_user_id, resource_type, resource_id, body | candidate or authorized coach can read; append-only |
| `workspace_suggestions` | id, candidate_user_id, author_user_id, resource_type, resource_id, patch_json, status, resolved_at, resolved_by_user_id | only candidate resolves; accepted patches are validated then applied transactionally |

`resource_type` is explicitly restricted to `application`, `opportunity`, `contact`, `interaction`, `follow_up_task`, and `referral`; `resource_id` remains the existing string record ID where applicable. The API validates both values rather than trusting client input.

## Authorization matrix

| Action | Anonymous candidate | Signed-in candidate | Accepted coach | Organization administrator without coach relationship |
| --- | --- | --- | --- | --- |
| Create or edit own local/cloud CRM data | Yes, local only | Yes | No | No |
| Read a candidate workspace | Own browser data | Own cloud data | Yes, only assigned candidate | No |
| Add a comment | Local private note only | Yes | Yes | No |
| Submit a suggestion | No | Not needed for own data | Yes | No |
| Accept, modify, or reject suggestion | No | Yes, for own data | No | No |
| Manage organization memberships | No | If admin | No | Yes |

## UX and data flow

1. The new Networking page loads `localStorage` immediately, like Applications and Opportunities.
2. A candidate creates contacts, interaction history, follow-up tasks, referrals, and links to jobs. Every local write persists and raises a same-tab custom event.
3. If the candidate enables account sync, the existing merge UI is extended with CRM data. The selected conflict rule applies per CRM collection, never silently overwriting local records.
4. A signed-in candidate accepts a coach invitation. The server creates an active candidate-coach relationship and emits no automatic data mutation.
5. A coach opens only assigned candidate workspaces, reads records, and creates a comment or suggestion.
6. The candidate sees suggestions in their own inbox. On acceptance, the server verifies ownership, relationship status, resource type, patch fields, and record version; it applies the patch and records the resolution. On rejection, it records the decision without changing the target record.

## Error handling and privacy

- Local storage parse failures return an empty collection and log a non-sensitive error, matching existing storage modules.
- Sync and collaboration endpoints require an app session and return 401 when absent, 403 for unauthorized workspaces, 404 for inaccessible records, and 422 for invalid field values or invalid suggestion patches.
- Invitation lookup is by a normalized email address; API responses must not reveal whether an email is registered before the recipient authenticates.
- `notes`, comments, and interaction summaries are user content: sanitize at UI boundaries, parameterize every database query, and never expose them in organization-wide listings.
- Revocation immediately removes coach read/comment/suggestion access but preserves historical comments and suggestions for the candidate's audit trail.

## Delivery order

1. Local networking CRM and tests.
2. Cloud schema, sync API, and owner-scoped authorization.
3. Invitation and candidate-coach relationship flow.
4. Comments and candidate-approved suggestions.
5. Organization/admin workspace controls, accessibility review, migration documentation, and end-to-end verification.

## Success criteria

- A guest can complete contact and follow-up tracking without registering or sending data to the server.
- A signed-in candidate can synchronize CRM data across devices using an explicit merge choice.
- A coach sees nothing until an invitation is accepted and cannot directly change candidate records.
- A candidate can review and resolve every coach suggestion, with an auditable outcome.
- A self-hosted organization can configure members and coaches without weakening record-level privacy.
