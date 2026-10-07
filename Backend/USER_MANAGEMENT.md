# User management — stage 3

Admins can open `/admin/users` or select **Users** in the admin navigation.
The page searches names, emails, and phone numbers; filters clients, vendors,
planners, admins, or moderators; sorts newest, oldest, or by name; and paginates results.
Filters are stored in the URL and preserved when opening a detail page and
returning to the list. Searching or changing filters resets the page to 1.

The detail page shows account contacts, role, joined/updated dates in Lagos time,
a profile summary, activity counts, and up to five recent consultations and
linked event records. Missing profiles are displayed without creating records.
Admin accounts have no member profile. Professional profile listing status is
separate from account suspension. Stage 4 adds account status filters and
moderation controls; see [ACCOUNT_MODERATION.md](ACCOUNT_MODERATION.md).
Stage 5 excludes archived accounts from this list and adds a removed-user folder
with restoration; see [USER_ARCHIVE.md](USER_ARCHIVE.md). Saved account details
remain available to admins.

## API

Both endpoints require current staff authentication. Admins can review all
accounts; moderators need `users.read` and can review current members only.
See [MODERATOR_ACCESS.md](MODERATOR_ACCESS.md) for appointment and permission rules.

- `GET /api/v1/admin/users`: optional `search` (literal, case-insensitive, max 100
  characters), `role` (`all`, `client`, `vendor`, `planner`, `admin`, `moderator`), `status`
  (`all`, `active`, `suspended`, `banned`), `sort`
  (`newest`, `oldest`, `name`), `page` (1–100000), and `pageSize` (1–100, default 25).
  Unknown parameters, invalid values, repeated values, and query-object injection
  are rejected with 400. Out-of-range pages clamp to the last available page;
  empty results use page 1 and totalPages 0. Sorts use `_id` as a stable tie-breaker;
  name sorting uses English collation with case-insensitive comparison.
- `GET /api/v1/admin/users/:userId`: requires a 24-character hexadecimal account
  ID. Invalid IDs return 400, missing accounts 404, and database failures 500.

Responses use `Cache-Control: no-store`. Allowlisted account and profile fields
exclude passwords, birth dates, message text, consultation notes, and arbitrary
extra model fields. Backend failures return bounded messages. The UI clears
details for missing accounts or revoked admin access and marks failed refreshes
as showing the last successful result.

## Activity scope

Clients link through `ClientProfile.user`; vendors and planners through
`VendorProfile.userId` and `PlannerProfile.userId`. The latest profile by
creation time and ID is used if duplicate profiles exist. The optional
`User.profile` pointer is not used, because current registration/profile flows
do not consistently populate it.

Consultation counts use `InitialConsultation.user` and `targetUser`, and recent
requests show sent/received direction. Message counts match both an account or
profile ID and its declared polymorphic model. No message content is queried.

Linked event counts and the recent-event list cover standalone `Event` documents
linked to the displayed profile through `client`, `planner`, or `vendors`.
Embedded events in role-specific dashboard documents are not reconciled into
these totals. The next event-oversight stage can address that separate contract.

The list and profile/activity sections read accounts. Stage 4 adds a dedicated
moderation endpoint. Stage 5 adds a dedicated archive endpoint; stage 6 adds
moderator appointments. Profile approval and full staff audit history retain
their own planned stages.

## Validation

Run `npm test` from `Backend`. The tests cover real HTTP requests to the router
with stubbed database queries: authorization, literal search, filters, stable
sorts, pagination, invalid input, safe response fields, profile relations,
polymorphic message counts, missing data, revoked access, and database failures.
No deployment database is queried or changed by these tests.

Run focused ESLint and the production build from `frontend`. Browser layout,
keyboard behavior, and live database behavior need a connected browser/database
for verification.
