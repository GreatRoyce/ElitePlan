# Announcements (stage 12)

Admins use `/admin/announcements` to create and review drafts, choose audiences,
mark important notices, schedule publication, set an optional expiry, withdraw
published notices, and archive unpublished content. Every change requires a
private review note and a current version. Admins can preview plain-text content
before publication. Unsaved draft changes disable publication and archiving.
Moderators have no publishing access.

Members and visitors read current notices at `/announcements`. A shared banner
shows up to three available notices on ordinary site pages. Member dashboards
link to the full feed. Staff portals and the support portal exclude the banner.
No announcements were published to the live database during implementation.

## Audience and timing

Audiences are clients, vendors, planners, and everyone (public). Public notices
are available without authentication and appear in each member feed. Other
notices require normal current member authentication and the matching database
role. Member endpoints reject staff, banned/suspended/archived accounts, stale
sessions, and support-only tokens. Drafts and private review metadata never
appear in either reader feed. Feed parameters cannot override the audience.

Saving a draft never publishes it. Publishing without a start time sets it to
the server's current time. A future start produces a scheduled notice. Visibility
uses `startsAt <= now` and `endsAt > now`, or no expiry. Dates in the editor use
Africa/Lagos time (UTC+01:00); API dates include an explicit offset. Expired
content cannot be republished until its dates are changed.

Scheduling and expiry are enforced by database filters on each feed request;
they do not require a cron worker or fan-out to individual notification records.
Published and scheduled content must be withdrawn before editing or archiving.
Archives retain the record and cannot be republished. Create another draft when
needed. Conditional writes prevent stale edits and concurrent publishing from
overwriting each other. The latest 100 private publishing actions are retained.

## Acknowledgements and refresh

Members can acknowledge a current notice. Acknowledgements are stored separately
for the current user, announcement, and publication version. They hide the notice
from the member banner but keep it in the full feed until expiry or withdrawal.
Republishing increments the publication version and requires a fresh
acknowledgement. One member cannot acknowledge another member's notice, or a
notice outside their audience. Receipts are never exposed publicly.

Visitors can dismiss a banner for the current tab session, with an in-memory
fallback when storage is unavailable. This creates no server receipt and does
not hide the full feed. The tab retains at most 100 dismissal identifiers.

The banner checks the first 20 current notices, ordered by importance and start
time, and displays up to three that are not acknowledged/dismissed. Older notices
remain available through the paginated feed. It refreshes every 60 seconds while
visible, on route changes, and when the window/tab regains focus. An already-open
page can briefly show a notice until the next refresh after withdrawal/expiry;
the server immediately stops serving it. The full feed has manual refresh.
Banner fetch failures hide cached banners; the full feed reports failures.

## Storage and deployment

`Announcement` and `AnnouncementReceipt` are separate collections. Ensure the
unique `(createdBy, requestId)` and `(user, announcement, publicationVersion)`
indexes exist before enabling writes when Mongoose automatic indexes are
disabled. UUID draft submissions retry safely, including duplicate-key races
and identical retries after subsequent edits. Member acknowledgements use an
idempotent upsert. Publishing/withdrawal and acknowledgement are separate writes;
a concurrent withdrawal can leave a receipt for the previously available notice,
but cannot make it visible or acknowledge a subsequent publication.

Reader pages allow at most 50 notices per request. The public feed permits 120
requests per IP per minute. The limiter is per process; multiple replicas need a
shared rate-limit store and an accurately configured trusted proxy. This stage
adds site notices only: no outbound email, SMS, notification fan-out, attachment
uploads, HTML rendering, or delivery/open-rate claims.

## Validation

Run `npm test` from `Backend`; focused ESLint, `npm run build`, and
`node scripts/check-announcements-ui.mjs` from `frontend`. The HTTP tests use the
actual routers, stub database operations, and validate Mongoose writes. They cover
authorization, audience boundaries, scheduling/expiry, lifecycle conflicts,
idempotency and private acknowledgements. Server renders cover notice escaping,
publishing controls, audience choices, reader pages and Lagos time conversion.
Live MongoDB indexes and browser clicks/visual layout need deployment testing.
