# Site visit analytics — stage 2

Admins can open `/admin/analytics` or choose **Site analytics** in the admin navigation.
Moderators with `analytics.read` can use `/moderator/analytics`; see
[MODERATOR_ACCESS.md](MODERATOR_ACCESS.md).
The report supports 7, 30, and 90-day presets and custom dates within the last 90
calendar days. Dates use `Africa/Lagos`, and selected start/end days are inclusive.
The daily chart switches between metrics and has an expandable table of exact figures.

## Tracking and definitions

The React app sends `POST /api/v1/analytics/visits` for supported page loads and
pathname changes. Unknown pages, logout, admin/moderator browsing, auth redirect
destinations, and query/hash-only changes are excluded. React StrictMode does not
create extra views. Reloads count as new page views.

- **Page views:** accepted page-load/navigation events.
- **Unique browsers:** distinct anonymous browser identifiers seen during the range.
  These are estimates of browsers, not people or registered accounts.
- **Visits:** distinct sessions with recorded activity during the range. A session
  expires after 30 minutes without a recorded page view. A visit spanning several
  days can appear on each day's chart but counts once in the whole-period total.
- **Traffic sources:** the session's initial external referrer domain. Internal,
  missing, or stripped referrers appear as `Direct / unknown`. Sources are ranked
  by visits; popular pages are ranked by page views.

An idle session that restarts through navigation in the same document has no new
external referrer. Reloads preserve an unexpired session. Clearing storage or
using a different browser can change the unique-browser estimate. With blocked
storage, identifiers last only for the current page lifetime.

Tracking honors Do Not Track (`1`) and Global Privacy Control (`true`). Collection
is best-effort: blocked requests, network failures, privacy settings, and common
bot filtering can reduce counts. Failures never trigger the site's auth logout
handler or block navigation. No historical visits are backfilled or fabricated.

## Storage and configuration

Records are stored in MongoDB's `sitevisits` collection, with a unique event ID
index for duplicate submissions and a `createdAt` TTL index for 90-day retention.
MongoDB expiry runs asynchronously. Reports filter dates independently of expiry.

The browser keeps a random UUID visitor ID and session state in localStorage.
The API stores HMAC keys derived from those IDs, a supported pathname, a referrer
domain, an event UUID, and a server timestamp. It does not store account IDs,
emails, raw visitor/session UUIDs, IP addresses, user agents, or query strings.

Set a stable `ANALYTICS_SECRET` on the backend if you want a dedicated hash key;
otherwise the existing `JWT_SECRET` is used. Rotating that key changes browser
and visit identity within historical reports. Existing `VITE_API_URL` must point
to the backend `/api/v1` base, as for the rest of the application.

The public collector accepts small JSON bodies (2 KB), validates fields, ignores
common bot user agents, and limits requests to 240/minute per Express client IP.
This is an estimate of browser traffic, not an abuse-proof measurement system.
On a reverse-proxy deployment, configure Express's `trust proxy` for the actual
trusted proxy topology; no proxy trust is assumed automatically. The limiter uses
an in-process store, so limits are per server process.

## Endpoints

- `POST /api/v1/analytics/visits`: public; validated UUIDs, supported path, optional
  domain-only referrer. Returns 204 for stored/duplicate events and ignored bots;
  400 for invalid fields, 413 for oversized JSON, 429 for rate limits, or 503 when
  storage/configuration is unavailable.
- `GET /api/v1/admin/analytics?days=7`: current database admin role or moderator
  with `analytics.read` required.
  Alternatively supply `start=YYYY-MM-DD&end=YYYY-MM-DD`. Do not combine both
  date styles. Invalid ranges return 400; database failures return 500. The
  response contains totals, zero-filled daily figures, top pages, and top sources.

## Validation

Run `npm test` from `Backend`. Tests cover HTTP collection and access control,
deduplication, hashing, malformed input, bot filtering, request/rate limits,
failure handling, date boundaries, expiry indexes, and the browser tracker logic.
Database queries are stubbed; these tests do not insert deployment data or execute
MongoDB aggregation against a live database. Browser tracker tests exercise its
state and sending behavior without a browser.

Run the frontend build and focused ESLint for the changed frontend files.
