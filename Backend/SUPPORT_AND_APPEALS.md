# Support and appeals (stage 11)

Members use `/support` to submit requests, appeal current account restrictions,
hidden professional listings, or rejected/revoked verification decisions, and
follow the conversation. Links appear on sign-in, member sidebars, restriction
notices, and affected profile notices. Reports about other users remain in
the existing reports workflow.

Admins use `/admin/support` to filter by status, request type, priority and
reviewer, claim/release cases, reply, request clarification, add private notes,
resolve or reject requests, and reopen closed cases. Moderators have no access
to this queue. The member sees their own initial request, original restriction
snapshot, replies, status, and final explanation. Assignments, priorities,
original decision actors and review history are private to admins.

## Restricted account access

`POST /api/v1/support/session` verifies the existing member email and password,
including suspended, banned, and soft-archived members. It issues a 30-minute
JWT with `purpose: support` and the current `authVersion`. Every support request
checks current membership and the session version in the database. Normal
sessions work for active members. Restricted normal sessions must use support
sign-in. Admin and moderator accounts cannot sign in as members here.

Support tokens fail ordinary HTTP and Socket.IO authorization, including when
the account is otherwise active. The frontend uses a separate Axios client and
tab-scoped session storage (with an in-memory fallback), never the dashboard
token slot. Support errors do not invoke normal dashboard logout. Account
restoration and other changes to `authVersion` also end support sessions; the
member can sign in again. Expired sign-in requires credentials again; unsent
form drafts are not persisted across sign-out or page reload.

## Appeals and review

The server resolves appeal targets from the member's current account and owned
professional profile. Members cannot supply another account/profile ID, a
decision actor, status, or staff metadata. Each appeal captures the decision's
status, reason, version and original actor at submission. Warnings and profiles
awaiting verification are handled as general support requests.

An admin cannot review their own case or an appeal of their original decision.
A different admin must claim it. Legacy restrictions without a recorded actor
cannot enforce that actor comparison; review their existing histories manually.

To accept an appeal, apply the remedy using its linked account, content, or
verification controls, return, refresh, and submit a member-visible explanation.
The API verifies the current target is remedied and its observed version matches
the submitted target version. Unarchiving an account with an existing ban does
not suffice: the account must be active. Missing, transferred, or mismatched
professional profiles cannot be accepted. Rejection leaves existing restrictions
in place and requires a member-visible explanation.

Restoration and appeal closure are separate writes. Acceptance records the
observed restored state; a later or concurrent restriction is a new decision.
They are not a cross-collection transaction. Private review actions use the
ticket's expected version, status, and reviewer in a conditional write to prevent
two reviewers from overwriting one another. All mutations require a private note.

## Storage and operational limits

`SupportTicket` is a separate collection. Create its unique `(owner, requestId)`
index before enabling writes in deployments that disable Mongoose automatic
index creation. UUID submissions and member replies support safe identical
retries; reusing an ID with changed text fails. Threads allow 100 messages without
discarding earlier messages or their retry identifiers; start a follow-up request
at the limit. The most recent 100 private actions are retained per ticket.

Support sign-in permits 20 attempts per IP per 15 minutes. Ticket submissions
permit 10 attempts per member per hour; replies permit 30. Failed requests and
retries count toward these limits. Rate limiter state is per process; multiple
server replicas need a shared store and a correctly configured trusted proxy.
Replies are read in the support portal; no email, payment processing, file
attachments, or realtime support alerts are added in this stage.

## Validation

Run `npm test` from `Backend`, focused ESLint and `npm run build` from `frontend`,
and `node scripts/check-support-ui.mjs` from `frontend`. Support tests mount the
actual HTTP routes and test Socket.IO rejection, with stubbed database queries
and schema validation. Server renders check route components, actions, escaping,
and restriction links. These do not validate live MongoDB indexes/transactions,
deployment proxy configuration, or browser clicks and visual layouts.
