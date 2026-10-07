# Content moderation — stage 9

Admins use `/admin/content`; authorized moderators use `/moderator/content`.
The queue covers the application's published vendor and planner listings: profile
text, business details, links, image/gallery/portfolio references and submitted
planner reviews. There is no published post/comment system in this application.
Private conversations remain outside this queue; reported messages are handled
through the existing reports workflow.

Staff can filter by professional type and published/hidden visibility, search
literal business/company/owner names and page through bounded results. A detail
view shows the current content and the most recent 100 visibility decisions.
Records belonging to archived, staff, mismatched-role or missing owners are
excluded. Admins have both grants; moderators need `content.read` for review and
both `content.read` and `content.manage` for hide/restore. Existing moderators
receive neither new grant automatically. Appointment validation enforces this
dependency. Every route checks the current database role and permissions.

## Visibility and owner workflow

Hide/restore requires a reason of 1–1000 characters and the current profile
revision. Hiding sets the existing `active` field to false and preserves all
profile content, verification status, account access and existing relationships.
Public directory, category/specialization, direct profile and bookmark reads
exclude hidden listings. New bookmarks and consultation requests reject hidden
targets. Saved bookmark records remain and reappear after restoration. New
consultations validate the current owner role and actual profile type and use
the professional profile ID for the recipient notification.

Owners see a hidden-listing notice and the latest reason in their existing
profile editor. They can correct text or upload replacement media; editing does
not unhide the listing. Owners cannot write visibility, decision history or
reasons. Deletion of a hidden listing is blocked to prevent delete/recreate from
bypassing moderation. Deletion of a published listing also checks its current
revision and visibility atomically.

Visibility decisions, owner saves, mounted photo/gallery writes and verification
decisions share the existing `verificationVersion` revision. Stale reviews and
conflicting writes return 409. Legacy profiles with missing revision/visibility
fields are supported. Profile metadata and bookmark responses use `no-store`.
Decision reason/history and reviewer identifiers are excluded from public
profile DTOs; owners get only a server-generated current decision summary.

## Scope and deployment

This stage hides complete listings, including their media references. It does
not delete or quarantine physical files: `/uploads` still serves previously
shared upload URLs, and external media remains on its external host. The review
screen states this limit. Individual media takedown requires a separate storage
quarantine workflow. Reviews are inspected as part of a listing; there are no
individual review-edit/removal controls in this stage. Hidden accounts still
retain existing conversations and consultations. Account warnings/restrictions
and complaints use their separate admin tools.

Restart the backend after deployment. No migration is required for existing
profiles; schema defaults and missing-field filters support legacy records.
Histories are bounded and embedded in the retained profile, not an immutable
audit store. Cross-collection owner-role changes during a write are not protected
by a MongoDB transaction; subsequent public reads still enforce current owner
visibility. Previously loaded pages must refresh to reflect visibility changes.

## Validation

`npm test` in Backend covers mounted staff/public/owner routes with stubbed
MongoDB operations: grants, hiding/restoring, history, privacy, legacy records,
stale/racing revisions, owner edits/uploads, delete bypass, saved listing
visibility and consultation target/notification behavior. No deployed database
is modified. `node scripts/check-content-ui.mjs` in frontend checks server
renders, role gates, escaped submitted content, safe clickable links, action
availability and owner notices. Run focused ESLint and `npm run build` as well.
Server renders do not test browser interactions or persistence in live MongoDB.
