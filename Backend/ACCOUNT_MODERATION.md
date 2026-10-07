# Account moderation — stage 4

Open a member from `/admin/users`, choose an action in **Account moderation**,
provide a reason, review the decision, and confirm it. Warning and restriction
reasons are visible to the affected user. The list can filter effective account
status; expired suspensions appear as active without a background job.

## Actions

- **Warn:** keeps access available and saves a warning for the user. It appears
  immediately over Socket.IO when connected and on `/auth/me` or the next login.
  The user can acknowledge it. The latest warning is shown; previous warnings
  remain in the recent moderation history.
- **Suspend:** blocks account access for 1–2160 hours (up to 90 days). The expiry
  is calculated on the server. Access becomes available at expiry, but the user
  must sign in again.
- **Ban:** blocks account access until explicitly restored.
- **Restore:** lifts a current suspension or ban. Requires a reason and a fresh
  user login. It does not restore expired tokens or deleted accounts.

Warnings can be issued only to active accounts. A banned account must be
restored before suspension or another warning. An existing suspension can be
replaced with a new duration and reason. Staff accounts and self-moderation are
protected; these controls are for clients, vendors, and planners.
Archived accounts must first be restored from the removed-user folder; moderation
cannot bypass removal. See [USER_ARCHIVE.md](USER_ARCHIVE.md). Archive changes share
the moderation version and action history; existing restrictions survive removal.

## Consistency and history

The account stores `accountStatus`, `suspendedUntil`, reason/actor/time,
`moderationVersion`, `authVersion`, the latest warning and acknowledgement,
and up to 100 recent moderation actions. Each action records its reason,
actor, timestamp, and suspension expiry when applicable.

State, recent history, and version changes are committed together in one atomic
MongoDB update. The client must submit the current moderation version. Stale
versions, concurrent updates, or a target's promotion to staff return 409 or
403 and require refreshing; they do not overwrite the later decision.

Recent history is intentionally capped at 100 entries per account to bound
document size. This is not the future full staff audit log; stage 13 should add
durable platform-wide audit records and longer-term retention as needed.

## Enforcement

Login checks restrictions after validating the password. Shared authenticated
HTTP middleware checks current database state on every request. Suspending,
banning, or restoring an account increments its session version. Previously
issued JWTs remain invalid even after a suspension expires or a ban is lifted.
Legacy accounts and tokens without a version behave as version 0 until revoked.
Public registration cannot set moderation or session fields.

Socket.IO validates the same state/version at handshake, rechecks after joining
the account room to cover handshake races, and guards incoming packets. Admin
restriction actions notify and disconnect all sockets in the user's room;
warnings notify them without disconnecting. Realtime delivery happens after
the database update; HTTP and reconnect checks still enforce restrictions if
delivery fails. This server uses a single-process Socket.IO adapter. A multi-node
deployment needs a shared adapter for immediate disconnection across servers.

The frontend clears its auth session for explicit restriction/revocation errors
and displays the reason. Ordinary permission errors do not log users out.
Warning acknowledgement only affects the authenticated user's current warning.

The previously unauthenticated standalone event-creation route now requires
an authenticated planner, closing a write path around account restrictions.
Public browsing, public profile listings, and static uploads remain public;
these restrictions govern account access. Listing verification/hiding and event
ownership/workflow reconciliation remain in their respective planned stages.

## API

- `POST /api/v1/admin/users/:userId/moderation`: current admin or moderator with
  `users.read` and the requested action permission required;
  see [MODERATOR_ACCESS.md](MODERATOR_ACCESS.md). JSON body
  `{ action, reason, expectedVersion }`, with `durationHours` only for `suspend`.
  Returns the current moderation summary and recent history. Invalid input is
  400; protected targets/access are 403; missing users 404; conflicts 409; and
  database failures 500.
- `POST /api/v1/auth/warnings/:warningId/acknowledge`: authenticated owner only;
  204 on acknowledgement (including repeated acknowledgement of the current
  warning), 400 for malformed IDs, or 404 for an outdated/unowned warning.
- Restriction failures use `ACCOUNT_SUSPENDED` or `ACCOUNT_BANNED` with 403.
  Revoked sessions use `SESSION_REVOKED` with 401.
  Removed accounts use `ACCOUNT_ARCHIVED` with 403.

## Validation

`npm test` from `Backend` exercises HTTP and real Socket.IO server/client behavior
using local ephemeral ports with stubbed database operations. Tests cover
warnings/acknowledgement, login, authenticated requests, expiry, session
revocation, access/target protections, input validation, concurrency conflicts,
history retention, status filters, multi-tab disconnection, handshake races,
reconnect denial, socket packet enforcement, registration field injection,
the protected event route, and failures. Socket tests use the installed frontend
`socket.io-client` dependency, so install dependencies for both project folders.
Tests do not moderate deployed accounts or prove live MongoDB write behavior.

Run focused frontend ESLint and the production build. Browser layout and
interaction verification requires a connected browser.
