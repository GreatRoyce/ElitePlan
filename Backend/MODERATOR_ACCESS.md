# Moderator appointments and permissions

Stage 6 adds **Moderators** at `/admin/moderators`. To appoint someone, open an
active member account from `/admin/users`, choose permissions in **Moderator
access**, provide a reason, review, and confirm. Use a dedicated staff account
where possible. Existing moderators' detail pages support permission changes
and revocation. Public registration cannot create moderators or assign grants.

Moderators sign in through `/login` and are directed to `/moderator`. Their
workspace shows member accounts and only the actions an admin assigned to them.
Site analytics is available at `/moderator/analytics` when granted. Staff
browsing remains excluded from visitor analytics.

## Permissions

| Permission | Access |
| --- | --- |
| `users.read` | Search current members and review account/profile summaries, activity totals, and recent moderation history. Required for every appointment. |
| `users.warn` | Issue member warnings. |
| `users.suspend` | Suspend member accounts for up to 90 days. |
| `users.ban` | Ban member accounts. |
| `users.restore` | Lift member bans or suspensions. |
| `analytics.read` | Read site visit reports. |
| `reports.read` | Review member reports and complaints, excluding cases involving staff. |
| `reports.manage` | Claim, prioritize, review, and resolve cases. Requires `reports.read`. |
| `content.read` | Review vendor and planner listing content and visibility decisions. |
| `content.manage` | Hide and restore professional listings. Requires `content.read`. |

The appointment form defaults to Review users and Issue warnings. Other grants
require selection. Permission keys and descriptions come from the backend
catalogue on admin account details. Unknown grants and duplicates are rejected.
Moderators without grants have no staff access. Member roles cannot use grants
in their records or forged JWT claims to gain access.

The report queue is available at `/moderator/reports` when granted; see [REPORTS.md](REPORTS.md).
The content queue is available at `/moderator/content` when granted; see [CONTENT_MODERATION.md](CONTENT_MODERATION.md).

## Boundaries

The shared staff API authenticates `admin` and `moderator` roles against the
current database record on every request. Every endpoint has a permission or
admin-only gate; frontend hiding is only a convenience. Moderation checks the
permission for the requested action, plus Review users, before loading a target.
Existing duration/state/version checks still apply.

Moderators can only read and moderate current client/vendor/planner accounts.
They cannot inspect staff accounts or archived details, manage staff, remove or
restore archived users, access the admin overview, change their own access, or
moderate other staff. Admins retain all existing controls. No endpoint promotes
another admin; first-admin provisioning remains a trusted CLI operation.

## Preserved records and sessions

Appointment stores the original member role in `staffMemberRole`, changes `role`
to `moderator`, and saves allowlisted `moderatorPermissions`. Profile IDs,
messages, consultations, events, password hashes, and account IDs remain intact.
Admin details can inspect the saved member profile. Public profile directories,
direct profile URLs, and bookmark listings hide staff-owned member profiles;
new consultation/bookmark requests to those profiles are rejected. Historical
records and uploaded file URLs remain in their existing storage.

Revocation restores the original member role and clears grants; preserved
profiles and bookmarks become visible again according to their existing state.
Restricted/archived members cannot be appointed. A malformed legacy moderator
without an original member role must have its record repaired before the staff
change can proceed; no arbitrary fallback role is assigned.

Appointment, updates, and revocation each increment `authVersion`, notify all
connected account tabs, and disconnect them. Previously issued tokens stay
invalid, including after demotion. The user must sign in again. HTTP checks,
Socket.IO handshake/rechecks/packet guards remain authoritative when broadcast
delivery fails. A multi-server deployment needs a shared Socket.IO adapter for
immediate disconnection across processes. Requests already authorized before a
permission change may finish; subsequent requests check current access.

## API and consistency

- `GET /api/v1/admin/users?role=moderator`: admin-only view of moderators.
- `GET /api/v1/admin/users/:userId`: admins receive sanitized current staff
  grants, original member role, backend permission options, and recent staff
  changes. Moderators receive permitted member details without staff metadata.
- `POST /api/v1/admin/users/:userId/staff`: admin-only JSON body
  `{ action: "appoint" | "update" | "revoke", reason, expectedVersion, permissions }`.
  Omit `permissions` for revocation. Appointment/update require an array including
  `users.read`; reasons are trimmed and limited to 1–1000 characters.
- Login and `/auth/me` return sanitized current `permissions`; JWT permissions
  are never used for authorization.

Staff changes share `moderationVersion` with moderation/archiving. One atomic
update repeats account role, restriction/archive state, saved original role
where relevant, and version conditions, then commits the role/grants, token
revocation, version increment, and history together. Conflicting edits return
409 without overwriting another decision. Staff/self targets are protected.

`staffHistory` keeps the latest 100 appointment/update/revocation entries with
actor, time, reason, permissions, and original member role. Full durable staff
audit logging remains stage 13.

## Validation

Run `npm test` in `Backend`, focused ESLint for changed frontend files, and
`npm run build` in `frontend`. HTTP tests cover appointment, revocation,
permissions, forged claims, staff/archive boundaries, legacy records, retained
profile visibility, strict input, conflicting updates, and session revocation.
Real local Socket.IO server/client tests cover tab disconnection and reconnect
denial. Database methods are stubbed; no deployed accounts are promoted or
modified. Browser interaction and live MongoDB verification require separate
checks.
