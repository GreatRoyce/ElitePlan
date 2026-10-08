# Platform health and settings — stage 14

Admins use `/admin/platform`. Moderators and members cannot read health details
or administer settings; the API checks the current database role and session.

## Health snapshot

`GET /api/v1/admin/platform/health` reports this server's uptime, Node version,
process/heap memory, database ping, upload directory access, settings availability,
Socket.IO connections and staff audit entries pending longer than five minutes.
Each read-only service probe has a two-second response deadline. Individual
failures are shown as unavailable and the overall snapshot needs attention.

Database ping checks connectivity, not every collection or data consistency.
Upload storage checks directory existence and read/write access permissions; it
does not write a file, measure free space or test an uploaded image download.
Socket counts belong to one server process, include separate tabs and are not
unique online-user totals. Audit counts include only entries still marked pending;
use the audit queue to review failed and unconfirmed actions too. Configuration
checks expose booleans for DBSTRING, JWT_SECRET and the analytics secret (which
falls back to JWT_SECRET). They never return values, paths or raw probe errors.
Presence alone does not verify credentials. Startup no longer prints a Mongo URI.

Refresh health requests a fresh snapshot. A failed refresh labels the previous
snapshot as stale. This page is an on-demand check, not background monitoring,
alerting, incident history, a backup manager or a third-party uptime service.

`GET /api/v1/platform/ready` is a minimal public database readiness probe: 200
`{"status":"ready"}` after a successful bounded ping, or 503
`{"status":"unavailable"}`. It checks the database only. The existing API root
indicates a running HTTP process. Admin authentication itself requires MongoDB,
so the public readiness endpoint remains useful when admin sign-in cannot work.

## Availability settings

- Enable or pause new client, vendor and planner registrations independently.
- Enable or pause new consultation requests.

`GET /api/v1/admin/platform/settings` returns the current revision and the most
recent 100 changes. `PATCH` requires all four boolean switches, `expectedVersion`
and a private `note` of 1–1000 characters. Unknown fields, non-boolean switches,
no-op changes and invalid revisions are rejected. A singleton document uses a
fixed MongoDB `_id`; first-write races and outdated revisions return 409. Review
and reload settings before retrying. A failed/ambiguous write requires refreshing
the settings and audit log; the UI disables another save until settings reload.

Missing settings preserve existing behavior: all switches are enabled, revision
zero, without creating a record on reads. Settings reads have a two-second
response deadline and fail closed for new signup/consultation submissions when
unavailable. Every submission checks persisted settings before business writes;
the client cannot override a pause. Already admitted submissions can complete if
a pause is saved while they are in progress. Pauses do not cancel existing work.
Existing login, consultations, messaging, events, reports and support remain on
their existing access rules. This is not a site-wide maintenance mode.

Admin writes reserve a central staff audit entry before changes. That log records
the verified actor, reason, revision, request outcome and before/after switches.
Successful snapshots remain there beyond the recent 100 settings changes. If
audit reservation fails, the settings change is not started. If completion fails,
the saved result stays applied and the response warns that its audit completion
is unconfirmed. Review the record before repeating the action. See
[STAFF_AUDIT.md](STAFF_AUDIT.md) for audit retention and operational limits.

`GET /api/v1/platform/availability` is public and returns only the four switches.
It omits staff identifiers, private notes, revision/history and environment data.
Public platform routes share a per-process limit of 120 requests per IP per minute.
All platform responses use `Cache-Control: no-store`.

The shared signup page/modal and consultation form check this public endpoint at
mount, window focus and every minute while visible. They disable submissions
until availability is known, show pauses/read failures, and provide Check again.
The public HTTP client is separate from authenticated requests and cannot log a
member out because an availability check failed. The backend remains authoritative
if the page's snapshot becomes stale.

## Deployment and validation

Deploy backend and frontend together and retain the existing first-admin setup.
No database migration or default-record seeding is required. Settings are shared
across server instances through MongoDB; memory, Socket.IO counts, rate limits
and upload access describe the instance serving the request. Deployments with
multiple instances must provide appropriate shared upload storage separately.

Run `npm test` in Backend, focused frontend ESLint, `npm run build`, and
`node scripts/check-platform-ui.mjs` in frontend. HTTP tests stub database queries,
storage and realtime dependencies; server renders check accessible states,
private text escaping, sidebar/route access and disabled submission states.
These checks do not verify a live MongoDB write, production upload filesystem,
deployed health checks or real browser interaction.

Stage 14 local validation passed: 232 backend tests, 22 platform UI server
renders, focused frontend ESLint and the production build. The build retains
the existing warning about a JavaScript chunk larger than 500 kB. The in-app
browser was unavailable, so real browser interaction remains unverified.
