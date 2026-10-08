# Sponsored advert spaces

Admins manage campaigns at `/admin/adverts`. An advert space is installed below
the home-page hero and inside each client, vendor and planner dashboard overview.
Empty or unavailable feeds render no banner. There are no sample sponsors or
automatically published adverts; create and publish a campaign to fill a space.

## Display and rotation

Multiple eligible adverts rotate every **15 seconds**, with Previous, Next and
Pause controls. Rotation pauses during hover, keyboard focus and a hidden tab;
reduced-motion preferences disable automatic rotation. A single advert stays
visible until expiry or withdrawal. Timers/listeners are cleaned up on unmount.
Expired campaigns are removed locally even while rotation is paused. Publication
windows include the start time and exclude the expiry time. Feed refreshes occur
every minute while visible, and on focus/visibility return, so withdrawals and
newly scheduled campaigns appear on already open pages at the next refresh.

Each banner clearly says Sponsored and names the advertiser. Plain text is
escaped. Optional images have a supplied description and a text fallback if
loading fails. Internal destinations stay in the app; external HTTPS destinations
open a new tab with sponsored/noopener/noreferrer attributes. JavaScript, data,
protocol-relative, credential-bearing and insecure external URLs are rejected.
Images may use an HTTPS URL or an existing `/uploads/<image-file>` path. This
stage uses image URLs, not a new advert image upload workflow or an ad network.

## Admin workflow

1. Create a draft with advertiser, headline, text, button/destination, optional
   image, advert spaces, audience, optional start/expiry (displayed in Lagos time)
   and a private review note. Review the visible preview before publishing.
2. Publish the saved draft, or schedule it with a future start time.
3. Withdraw to stop delivery, then edit and republish to restart a campaign.
4. Archive withdrawn/draft campaigns to retain their history without delivery.

Everyone includes visitors and all member roles. Role-specific adverts are served
using the member's current database role, not a role supplied by the client.
Dashboard placements require member authentication. Adverts are not inserted
inside messages, forms, admin/moderator pages or support conversations.
Member-only campaign selection is an audience rule; image URLs are not confidential
assets. Existing upload URLs retain their existing public access behavior.

Live campaigns must be withdrawn before editing. Mutation requests include the
current revision and a private reason. Conditional writes reject stale edits and
publication conflicts with 409. Create requests use a unique actor/request UUID
and content fingerprint for idempotent retries. Archived campaigns cannot be
republished. The most recent 100 actions are retained on each campaign; the
central staff audit retains request history beyond this cap.

All admin mutations reserve an audit entry before permission/input checks.
Audit failure before mutation prevents a change; completion failure preserves the
actual result with a visible unconfirmed warning. See [STAFF_AUDIT.md](STAFF_AUDIT.md).
Only current admins can manage adverts; moderator content permissions do not
grant advertising access. No billing, click/impression counts or paid conversions
are invented or tracked by this feature.

## API and deployment

- Admin list/create: `GET/POST /api/v1/admin/adverts`.
- Admin detail/edit: `GET/PATCH /api/v1/admin/adverts/:advertId`.
- Publish/withdraw/archive: `POST /api/v1/admin/adverts/:advertId/actions`.
- Guest home feed: `GET /api/v1/adverts/public?placement=home`.
- Member feed: `GET /api/v1/adverts/mine?placement=home|dashboard`.

Public/member feeds return only visible banner content, publication identity and
schedule boundaries. They omit admin notes, actor IDs, revision, audiences and
history. Feeds include up to 50 eligible campaigns ordered by publication time;
larger live sets require withdrawing older campaigns or a future allocation
policy. Admin lists have bounded pagination and state/audience/placement filters.
All responses use no-store. Public requests are limited to 120 per IP per minute
per server process. The guest HTTP client is independent of session interceptors.

Deploy backend and frontend together. Ensure the Advert collection's unique
createdBy/requestId index and delivery index are created, especially when automatic
indexes are disabled. No data backfill, seed adverts or production changes were
performed. Database operations, image availability and local clock accuracy affect
delivery; this is an in-app rotation feature, not certified ad reporting.

## Validation

Run backend `npm test`, focused frontend ESLint, `npm run build`, and
`node scripts/check-adverts-ui.mjs` from frontend. HTTP tests stub database queries
and validate real Mongoose documents, permissions, URLs, audience/placement/date
filters, withdrawal, version checks, idempotency and audit failures. Server renders
check adverts, previews, empty states, access boundaries and controls; rotation
selection checks cover wraparound, publication identity and expiry boundaries.
Browser timers, real image loads and live MongoDB writes require live verification.

Local validation passed: 247 backend tests, 27 advert UI server renders, rotation
selection checks, focused frontend ESLint and the production build. The existing
warning about a JavaScript chunk larger than 500 kB remains. The in-app browser
was unavailable, so browser timers/interactions and live database writes were
not verified.
