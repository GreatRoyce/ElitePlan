# Professional profile verification — stage 8

Admins use **Profile verification** at `/admin/verification`. Choose vendors or
planners, filter by verification status, search by name/email, and open a profile
to review business details, named contact, location, submitted certifications,
and existing media/links. Account details also link to verification review.

The queue includes profiles whose current owner has the matching professional
role and is not archived. Staff-owned, client-owned, deleted-owner, and archived
profiles are excluded. Restricted professional accounts can be reviewed, but
approval requires active account access. Moderator accounts cannot use these
endpoints, regardless of their other grants or token role claims.

## Decisions

| Current status | Available decisions |
| --- | --- |
| Unverified | Approve a complete, active profile, or reject. |
| Verified | Revoke verification. |
| Rejected or revoked | Approve after reviewing corrected details. |

Approval requires meaningful business/company and contact names, email, phone,
state, country, and vendor category or planner specialization. Auto-created
`N/A` placeholders cannot be approved. These completeness checks do not establish
identity. Admins must independently check business identity and contact details;
the form prompts them to confirm that review before approving.

Every decision requires a trimmed 1–1000 character reason, which the owner can
see in their profile editor. The UI reviews the action and reason before saving.
Approval sets the existing `verified` flag used by lounge badges, stores the admin
and approval date, and updates the vendor's legacy `approvedBy`/`dateApproved`.
Rejection or revocation clears the badge and current approval metadata. Account
access, listing activity, and profile contents are separate from verification.

This is manual admin review using existing profile information. No identity
provider or private verification-document upload is introduced. Submitted
certifications remain owner-supplied statements. Older verified flags are
preserved and may predate recorded review history; they are not automatically
re-certified or bulk-reset by deployment.

## Owner edits and public data

Member update APIs accept only editable profile fields. Ownership, verification,
reviewer/history/version fields, ratings, reviews, listing controls, and vendor
featured/job metrics cannot be supplied through those edits. Full profile objects
from existing editors remain accepted: non-editable metadata is ignored. Bodies
containing top-level Mongo operators or dotted keys are rejected.

These changes clear a verified/rejected/revoked decision to **unverified** and
record a `profile_updated` entry for another review:

- Vendors: business/contact name, email, primary phone, address/city/state/country,
  category, or website.
- Planners: full/company name, email, primary phone, state/country, or certifications.

Unchanged values preserve verification. Other edits, including gallery/avatar
uploads and tagline changes, preserve the badge while incrementing the review
version so an older admin snapshot cannot be approved over new content. All
updates are scoped to the authenticated profile owner. A concurrent owner save
returns 409 instead of overwriting an admin decision.

The mounted vendor editor unwraps the API profile response, maps business/phone
fields to their existing controls, and uses the schema's category choices. Its
business contact fields can now be completed for verification review.

Owners see only their current status, reason, and decision time. Verification
history, reviewer IDs, and internal versions are excluded from owner responses.
Public vendor/planner list/detail/filter APIs retain the trusted `verified` flag
and omit decision reasons, status details, reviewer IDs, history, and versions.
Default schema projections also hide review internals from other profile queries.

## API and consistency

All endpoints require the current database role `admin` and return
`Cache-Control: no-store`:

| Endpoint under `/api/v1/admin` | Purpose |
| --- | --- |
| `GET /verification` | Queue with `type`, `status`, `search`, `sort`, `page`, `pageSize`. |
| `GET /verification/:type/:profileId` | Safe profile/owner details, approval readiness, version, and admin history. |
| `POST /verification/:type/:profileId` | `{ action: "approve" | "reject" | "revoke", reason, expectedVersion }`. |

Type is `vendor` or `planner`, default vendor. Status is `unverified`, `verified`,
`rejected`, `revoked`, or `all`, default unverified. Sort uses profile edit time,
`oldest` (default) or `newest`, with stable ID ordering. Search is literal and
limited to 100 characters. Page size defaults to 20 and is bounded to 100.
The queue uses a database join to current owners before count/pagination.

Each profile has its own `verificationVersion`, independent of account moderation
and staff permission versions. One atomic decision update repeats profile ID,
ownership, badge state, and expected version, then changes verification metadata,
increments the version, and appends history. Every mounted owner profile/content
upload update increments the same version. Missing legacy versions are treated
as zero without a migration. Conflicting decisions/edits return 409 and require
reviewing refreshed details. Role/archive checks occur before the profile write;
requests already authorized before an account change may finish under that state.

History retains the latest 100 approve/reject/revoke/profile-change entries with
actor, time, reason, and resulting status. It lives on the profile and follows
existing profile deletion behavior. Durable cross-feature audit retention remains
stage 13. The dashboard's existing unverified totals cover all stored professional
profiles without a badge, including retained records and rejected/revoked entries;
the queue shows the selected status for current professional owners.

## Validation

Run `npm test` in Backend; focused ESLint, `npm run build`, and
`node scripts/check-verification-ui.mjs` in frontend. HTTP tests exercise the
actual mounted routers, including allow/deny paths, scope, legacy data, readiness,
decisions, owner write protection, public response privacy, and version conflicts.
Upload-controller tests supply synthetic file metadata without writing real files.
Database methods and aggregation execution are stubbed; real Mongoose model
validation is checked, but live MongoDB joins/writes and browser interactions
remain separate verification. No live profiles are approved or modified by tests.
