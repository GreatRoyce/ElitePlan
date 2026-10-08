# Staff audit history (stage 13)

Admins use `/admin/audit` to review staff requests by area, action, outcome,
staff account ID, target type/ID and inclusive Lagos date range. Results are
paginated, with links to individual entries and related records. Staff names
and roles are snapshots from the time of the request. Role changes, account
renames, or removed target records do not rewrite those snapshots.

The API exposes admin-only `GET /api/v1/admin/audit` and
`GET /api/v1/admin/audit/:auditId`, both with `Cache-Control: no-store`.
Moderators and members cannot read the central log. There are no HTTP create,
edit or delete endpoints for audit entries.

## Coverage

All administrative HTTP mutations in the admin router reserve an audit entry:

- Account warnings, suspension, bans and restoration.
- User archiving and restoration from the archive.
- Moderator appointment, permission changes and revocation.
- Report review, assignments, priorities and resolutions.
- Professional verification and listing moderation.
- Consultation, standalone event and planner board event oversight.
- Support and appeal review actions.
- Announcement creation, edits, publication, withdrawal and archiving.
- Platform availability settings, including before/after switches and revisions.
- Advert drafts, edits, publication, withdrawal and archiving.

Entries use the current authenticated database account, never role claims,
actor IDs, or timestamps supplied in a request body. Reservation occurs after
staff authentication and before route-specific permissions/input validation,
so denied actions by authenticated staff are included. Unknown actions/target
types are normalized; invalid IDs are not treated as valid targets.

The central log starts when this feature is enabled. Older actions remain in
their existing record histories; no actor-role snapshots or outcomes are
invented through automatic backfilling. GET requests, normal member actions,
login attempts, unauthenticated/non-staff requests, CLI bootstrap operations,
and direct database changes are outside this log. Future staff mutation routes
must mount the audit middleware before their permission checks.

## Outcomes and failure behavior

Before the controller starts, a separate `StaffAudit` entry is persisted with
`outcome: pending`. If reservation fails, the request returns 503 and the staff
action is not started. The normal JSON response waits for a conditional terminal
audit write before it is sent. Outcomes are:

- `succeeded`: a successful HTTP response with no explicit failure payload.
- `denied`: a 4xx response, including validation, permission and revision conflicts.
- `failed`: a server error/failure response.
- `unconfirmed`: the connection ended before a normal response was observed.
- `pending`: completion has not been recorded; after five minutes the interface
  also flags the outcome as unconfirmed.

These describe the request outcome, not a transactional proof of the business
write. A controller may persist a change and later fail while preparing its
response. Check the related record before repeating failed/unconfirmed actions.
Audit reservation, business mutation and completion are separate writes. If
completion fails after the business action, the original response is preserved,
with a visible warning and `X-Staff-Audit-Status: pending`; the audit entry remains
available for investigation. A process crash can similarly leave a pending entry.
Non-JSON response/connection completion is recorded through response events.

Entries retain request references, the route template, actor, action, target,
private review note, requested revision, and safe result metadata (revision,
state, moderator role/grants, reviewer, priority and settings changes when available). They never
copy full request/response bodies, tokens, passwords, email/phone details,
reported evidence, support conversations or announcement message contents.
Review notes are intentionally private and visible only to admins in this view.

## Retention and deployment

The central collection has no 100-entry cap or automatic TTL deletion. It remains
available when per-record histories trim older entries. Ensure its unique request
reference index and date/actor/category/target/outcome indexes are created before
enabling staff mutations in deployments with automatic indexes disabled.

Actor/action/time fields are immutable in the application model, and completion
writes only match pending entries. This is an append-only HTTP surface, not a
cryptographically tamper-proof log: database administrators can alter data outside
the app. Manage database permissions, backups and retention at deployment level.
No production histories, accounts or audit records were changed during this work.

## Validation

Run `npm test` from `Backend`, focused ESLint and `npm run build` from `frontend`,
and `node scripts/check-audit-ui.mjs` from `frontend`. Audit tests use actual HTTP
routes with stubbed database operations and schema validation. They cover every
staff mutation route, authenticated denials, reserve/completion failures, identity
and payload isolation, disconnects, bounded filtering, and retention beyond 100
per-record changes. Existing suites also stub the new audit database dependency.
Server renders verify filters, escaping, outcome warnings and read-only access.
Live MongoDB failure recovery/indexes and browser interactions remain unverified.
