# Consultation and event oversight — stage 10

Admins use `/admin/operations`. All list, detail and action endpoints under
`/api/v1/admin/operations` require the current database admin role. Moderators
cannot use these cross-account operational tools, even with user, report or
content grants. Existing member workflows remain participant-scoped.

## Records and review

Choose consultation requests, standalone events (`Event` collection), or planner
board events (embedded in `PlannerDashboard`). They are separate existing stores;
the queue labels each source and edits its actual record. No migration, copying,
deduplication or automatic synchronization between event stores is performed.
Status, follow-up flag, literal title/type search, scheduled date range and
bounded pagination are supported. Date ranges include complete Lagos days.
Rows mark pending requests older than seven days and active events with past
scheduled dates for attention. These indicators do not automatically change
status or prove that an event failed to happen.

Detail pages resolve consultation User IDs and event profile IDs to participant
accounts. Missing profiles/accounts and archived participants remain identifiable
for historical review. They expose scheduling, requested services/guest counts,
status and participant account state, without private message contents,
consultation notes/contact preferences, account secrets, or payment details.

Admins can add private notes, set/clear follow-up flags and perform these recorded
interventions, with a required reason and current revision:

| Source/state | Available status intervention |
| --- | --- |
| Pending consultation | Decline |
| Approved consultation | Complete |
| Declined consultation | Reopen to pending |
| Upcoming event | Start or cancel |
| Ongoing event | Complete or cancel |
| Cancelled event | Reopen to upcoming |
| Completed record | Private notes and flags only |

Administrative reopening starts a fresh pending/upcoming state; it does not
restore a previous approval or ongoing state. Admins cannot approve professional
requests or change the status of records they participate in. They can still
leave internal notes/flags. Notes and flags remain admin-only. Status changes
persist a participant-facing reason in `oversightNotice` and create an in-app
notification for each known participant. Existing conversations, relationships
and payments are preserved. Notification failures do not undo a successful
status write; the response explicitly reports delivery failure. There is no
background notification retry/outbox in this stage.

## Enforcement and concurrency

Each record gets a private `oversightVersion`, private follow-up flag and the
latest 100 review/history entries. Legacy missing versions match revision zero.
Status, notes and flags use atomic revision/status checks; conflicting edits
return 409. Embedded updates also match the parent planner and the particular
event with `$elemMatch`, change only that event and increment the dashboard's
`__v`. Planner dashboards enable optimistic concurrency so previously fetched
payment/recruitment saves cannot overwrite a concurrent intervention.

The member consultation decision endpoint now allows only the receiving
professional to approve/decline a pending request. Repeat/conflicting decisions
return 409, without another approval message. The requester may delete only an
unreviewed pending request; reviewed/decided records are retained. Pending lists
are professional-scoped. Creation allowlists member fields and rejects staff
metadata by omission. Member responses redact private oversight fields.

The standalone event list now requires member authentication and filters actual
planner/client/vendor profile ownership. Guest and unrelated access is denied
or empty; populated participant fields are restricted. Event creation remains
planner-only, binds the authenticated planner's profile and validates supplied
client/vendor profiles. A client event-intake form is a separate unfinished
workflow and is not enabled by this stage. Vendor dashboards now use `userId`,
the real `vendors` reference array and capitalized standalone event statuses.
Planner board status updates validate transitions and share the event revision;
members cannot restart a cancelled event without admin reopening.

Embedded event metrics are recalculated when the planner reads the board or
updates its status. Existing payment/vendor assignment saves also recompute
them. Admin intervention does not independently rewrite stored metrics. All
operations, consultation and standalone event metadata routes use `no-store`.
Already loaded screens need refreshing to show a changed status.

## Deployment and validation

Restart Backend after deployment. New schema fields work with existing records
without a migration. Bounded histories are operational history, not a permanent
audit archive. Notifications and record changes are separate writes; participant
account/profile changes can race reference resolution. No live MongoDB
transaction or storage migration is introduced.

Run `npm test` in Backend for mounted admin/member HTTP routes with stubbed DB
operations: authorization, both event sources, revisions, date boundaries,
private notes, status transitions, ownership, notification failures and
member-route protections. From frontend run focused ESLint, `npm run build` and
`node scripts/check-operations-ui.mjs` for server renders and role/data checks.
These checks do not verify deployed MongoDB persistence or browser interactions.
