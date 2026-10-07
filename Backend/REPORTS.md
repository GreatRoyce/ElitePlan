# Reports and complaints — stage 7

Members use **My reports** from their lounge sidebar. They can submit a general
complaint, report an account from its lounge profile, report a received message
from its chat bubble, or select one of their pending consultations in the form.
The API also supports reports about approved, declined, or completed consultations
when the caller is a participant. The existing pending-consultation endpoint now
enforces participant ownership for client, vendor, and planner accounts.

The reporter sees only their own submissions, evidence captured at submission,
status, and the current public resolution. Other members, including the reported
account, cannot open the case. Case fields and private notes are excluded from
member responses. Reports are retained when an account is archived.

## Staff workflow

- Admins use `/admin/reports`; authorized moderators use `/moderator/reports`.
  Filter by status, category, type, urgency, assignment, and date/urgency order.
- Claim an unassigned case to begin review. Admins can assign or reassign active
  eligible staff. Other moderators cannot change an assigned reviewer's case.
- Add private notes, set urgency, resolve/dismiss with a reporter-visible
  resolution, release an open review, or reopen a closed case.
- Each action requires a private note and an explicit review/confirmation in
  the UI. Closing requires a separate public resolution. Reopening clears the
  current resolution while retaining the earlier decision in private history.
- Staff can open member account details for separately authorized moderation
  actions. A report never automatically changes account status.

`reports.read` enables queue/details. `reports.manage` additionally enables
review actions and requires `reports.read`. Existing moderators receive neither
grant automatically; admins can add them from Moderator access. Admins receive
both through their role. Grants are read from the current database account.

Reports targeting staff, staff-conduct complaints, and reports whose reporter or
target is currently staff are excluded from moderator queries. Current staff IDs
are checked on each request, including assignment eligibility. Moderators cannot
review their own cases; even an admin cannot act on a case involving themselves.
An independent admin is needed to handle a report involving the only admin.
Requests authorized before a role change may finish under that earlier state.

## API

Member endpoints under `/api/v1/reports` require an active member session:

| Method and path | Behavior |
| --- | --- |
| `GET /` | Own cases; `status`, `page`, `pageSize`. |
| `GET /context?type=…&targetId=…` | Validate account/message/consultation target and show limited evidence. |
| `GET /:reportId` | Own case detail and current public resolution. |
| `POST /` | `{ type, category, subject, details, requestId, targetId? }`. |

Staff endpoints under `/api/v1/admin/reports`:

| Method and path | Behavior |
| --- | --- |
| `GET /` | Scoped queue; member filters plus `category`, `type`, `priority`, `assigned`, `sort`. |
| `GET /reviewers` | Admin-only active eligible staff directory. |
| `GET /:reportId` | Scoped evidence, assignment, version, and private history. |
| `POST /:reportId/actions` | `{ action, expectedVersion, note, resolution?, assignedTo?, priority? }`. |

Types: `general`, `account`, `message`, `consultation`. Categories: `harassment`,
`spam`, `fraud`, `service`, `staff_conduct`, `other`. Statuses: `open`,
`under_review`, `resolved`, `dismissed`. Urgency: `normal` or `urgent`.
Assignment filters: `all`, `mine`, `unassigned`. Sorting: `newest`, `oldest`,
`priority`. Page size defaults to 20 and is limited to 100.

Subject is trimmed to 3–160 characters, details to 10–5000, private note to
1–1000, resolution to 1–2000. Unknown fields and malformed filters are rejected.
`targetId` is the User ID for account reports, Message ID for message reports,
and Consultation ID for consultation reports. General complaints omit it.

Message reports require actual recipient ownership, including profile-based
participants. Only the reported message is copied, bounded to 5000 characters.
Consultation snapshots include event type/date/status, excluding notes and
contact information. Uploaded evidence/attachments are not supported here.

Creation accepts a UUID v4 `requestId` scoped to the reporter, backed by a unique
compound index. Identical retries return the same case; different contents with
the same ID return 409. The form reuses an ID for unchanged retries. Submission
attempts are limited to 10 per account/hour using an in-process store; deployments
with multiple server processes need a shared limiter store. Ensure the Report
indexes exist when deploying if Mongoose automatic index creation is disabled.

One atomic update repeats case version/status/assignment and commits changes,
version increment, and history together. Stale updates return 409. Private
history keeps the most recent 100 actions, including earlier public resolutions;
full durable audit history remains stage 13. There is no report deletion API.
Responses use `Cache-Control: no-store`. Private report routes are excluded by
the current site-visit tracking allowlist. Resolution is read in My reports;
email, push notifications, and appeals remain later work.

## Validation

Run `npm test` in Backend, focused ESLint and `npm run build` in frontend, and
`node scripts/check-reports-ui.mjs` in frontend for component server renders.
HTTP tests cover ownership, staff permissions, sensitive cases, assignment,
state transitions, private DTOs, safe retry handling, rate limiting, and version
conflicts. Database methods are stubbed; model validation and indexes are checked
locally, but live MongoDB writes/indexes and browser interaction need separate
verification. No real member records are changed by these tests.
