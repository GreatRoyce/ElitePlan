# Admin setup — stages 1 to 14

This stage adds the `/admin` dashboard and `GET /api/v1/admin/overview`.
The API requires a valid token and an account whose current database role is `admin`.
Public signup continues to accept only `client`, `vendor`, and `planner`.

## Set up the first admin

1. Register a dedicated staff account using the existing registration page.
2. From `Backend`, run `npm run admin:bootstrap -- your-staff-email@example.com`.
   This changes that existing account's role to `admin` in the database configured
   by `DBSTRING` in `Backend/.env`. It does not change its password or delete its
   existing profile. Use a dedicated account rather than an active customer account.
   The command refuses to run if an admin already exists; run it once from a
   trusted server terminal, without concurrent bootstrap commands.
3. Restart the backend after deploying these changes. Sign out and sign in with
   the staff account using `/login`. Admin accounts are directed to `/admin`.

The bootstrap command is not an HTTP endpoint and has not been run automatically.
Normal users cannot assign themselves admin access through registration.

## Available figures

- Registered client, vendor, and planner totals, plus a separate admin count.
- New member registrations over a rolling seven-day window.
- Eight latest member registrations (name, role, and registration time only).
- Consultation totals grouped by their existing lowercase status values.
- Event totals grouped by their existing capitalized status values.
- Unverified vendor and planner profiles. These are not a verification request queue.

All figures come from MongoDB. Refresh requests a new overview; failed refreshes
keep the previous figures visibly marked as stale. Visitor activity has its own
report at `/admin/analytics`; see [ANALYTICS.md](ANALYTICS.md). No online-user,
suspension, report, or moderator figures are inferred from existing records.

User management is available at `/admin/users`; see [USER_MANAGEMENT.md](USER_MANAGEMENT.md)
for filters, account details, and the scope of activity totals.

Account warnings, suspension, bans, and restoration are now available on user
detail pages. See [ACCOUNT_MODERATION.md](ACCOUNT_MODERATION.md) for enforcement
and session behavior.

The removed-user folder is available at `/admin/archive`. Member details include
removal and restoration controls; see [USER_ARCHIVE.md](USER_ARCHIVE.md).

Moderator appointments and permissions are available in member details and
`/admin/moderators`. Moderators use `/moderator`; see
[MODERATOR_ACCESS.md](MODERATOR_ACCESS.md) for access boundaries and revocation.

Reports and complaints are available at `/admin/reports`, with an authorized
moderator queue and member submission/tracking pages. See [REPORTS.md](REPORTS.md)
for review actions, evidence boundaries, and deployment notes.

Professional profile review is available at `/admin/verification` for admins.
See [PROFILE_VERIFICATION.md](PROFILE_VERIFICATION.md) for approval, rejection,
revocation, member edit behavior, and legacy records.

Content review and reversible listing hiding/restoration are available at
`/admin/content` and, with content permissions, `/moderator/content`.
See [CONTENT_MODERATION.md](CONTENT_MODERATION.md) for visibility enforcement,
owner corrections, revision checks, and the limits of existing upload URLs.

Consultation and event oversight is available to admins at `/admin/operations`,
covering requests, standalone events and planner board events. See
[OPERATIONS_OVERSIGHT.md](OPERATIONS_OVERSIGHT.md) for review flags, status
interventions, participant notifications and member access enforcement.

Member support and appeals are available at `/support`, including support-only
sign-in for restricted accounts. Admins review cases at `/admin/support`. See
[SUPPORT_AND_APPEALS.md](SUPPORT_AND_APPEALS.md) for independent review, restoration,
conversation privacy, session isolation, and deployment limits.

Announcements are managed at `/admin/announcements` and read at `/announcements`.
See [ANNOUNCEMENTS.md](ANNOUNCEMENTS.md) for drafts, audiences, scheduling, expiry,
withdrawal, private acknowledgements, and banner refresh behavior.

Central staff audit history is available to admins at `/admin/audit`. See
[STAFF_AUDIT.md](STAFF_AUDIT.md) for actor snapshots, mutation coverage, outcomes,
failure handling, filtering and retention beyond individual record histories.

Platform health and signup/consultation availability settings are available at
`/admin/platform`. See [PLATFORM_HEALTH_AND_SETTINGS.md](PLATFORM_HEALTH_AND_SETTINGS.md)
for real health probes, pause enforcement, revisions, public readiness, audit
coverage and deployment limits.

Sponsored adverts are managed at `/admin/adverts`, with home-page and dashboard
overview spaces that rotate every 15 seconds. See [ADVERTS.md](ADVERTS.md) for
drafts, schedules, audiences, withdrawal, audit coverage and display controls.

## Validation

Run `npm test` from `Backend`. The tests exercise the admin router over HTTP with
stubbed database queries, including missing/invalid/expired tokens, member roles,
forged token roles, current-role changes, database failures, and overview data.
They do not connect to the deployed database or promote an account.

From `frontend`, run `npm run build` and focused ESLint for the changed files.

## Roadmap status

All fourteen stages in the initial admin roadmap are implemented. Deployment
and live browser/database checks remain separate from the local validation.
