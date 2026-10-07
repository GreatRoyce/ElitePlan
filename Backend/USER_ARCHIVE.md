# Removed-user archive

Stage 5 adds the admin-only **Removed users** folder at `/admin/archive`.
From a member's detail page, enter a removal reason, review it, and confirm
removal. Open a saved account from the folder to inspect its removal date,
admin ID, reason, profile summary, activity totals, and recent action history.
Restoration also requires a reason and confirmation.

## Saved records

The folder is a MongoDB-backed archive, not a directory on the server's disk.
Archiving is reversible: it sets `archivedAt`, `archivedBy`, and `archiveReason`
on the original user. The account, password hash, email, role, profile references,
messages, bookings, consultations, events, and uploaded files remain in their
existing collections/storage. No account or related record is deleted or copied
into an unsecured export. The existing unique email constraint still reserves
the removed account's email. Admin responses never expose passwords.

The regular user list excludes archived accounts; the removed-user folder only
includes archived accounts. Both support literal name/email/phone search, role,
pagination, and name sorting. The folder's newest/oldest sorting uses removal
time. Its retained access-status filter refers to the underlying ban/suspension,
while saved accounts themselves display **Archived**.

Overview registration totals remain lifetime counts including retained accounts.
Historical messages, event records, and consultation records remain available to
their existing participants. Public vendor/planner directories, direct profile
URLs, category/specialization results, and bookmark listings hide archived owners.
Existing bookmarks are retained and become visible after restoration. New message,
consultation, and bookmark requests reject archived recipients. Client profile
edits/deletes require ownership, protecting another client's retained profile.
Uploaded file URLs and existing historical records are not erased by archiving.

## Access and restoration

Archived users cannot sign in or use authenticated HTTP routes or Socket.IO.
Archiving revokes their tokens and disconnects all connected tabs through the
existing user room. Live database checks also enforce the archive at socket
handshake, connection recheck, and incoming packets. Broadcast failure cannot
restore HTTP access. As with moderation, immediate disconnect across multiple
server processes requires a shared Socket.IO adapter.

Restoration clears current archive metadata, preserves the same account/profile
IDs, retains warning state, and leaves any previous ban or suspension intact.
Suspensions continue to expire on their original schedule while archived. A
restored user must sign in again; pre-removal tokens never become valid again.
An admin can change a retained ban/suspension after restoring from the archive.

## API and concurrency

- `GET /api/v1/admin/archive`: admin-only archive listing, with the same query
  fields as `/admin/users`; unknown query fields are rejected.
- `GET /api/v1/admin/users/:userId`: retained details including sanitized archive
  metadata, moderation state, and activity summaries.
- `POST /api/v1/admin/users/:userId/archive`: `{ action: "archive" | "unarchive",
  reason: "1–1000 characters", expectedVersion: <current moderation version> }`.

The write validates a 24-character ObjectId and strict input fields, forbids
self/staff targets, and commits state, session revocation, version increment, and
action history in a single atomic user update. The update repeats the member-role,
archive-state, and version conditions; concurrent changes or staff promotions
produce `409` without overwriting another decision. Archiving and moderation share
the same version. Moderation actions cannot change an archived account.

Archive/restoration actions join the latest 100 moderation history entries. A
complete durable staff audit remains stage 13. No permanent-delete endpoint is
provided. Legacy accounts without archive fields remain usable and visible.

## Validation

Run `npm test` in `Backend`, focused ESLint for changed frontend files, and
`npm run build` in `frontend`. HTTP tests cover archive/restoration, authorization,
strict input, concurrency, retained data, email reuse, filtering, and profile/target
visibility. Socket.IO tests use a real local server and clients to test tab
disconnect and rejected reconnection. Database methods are stubbed: the tests do
not connect to a deployed database or remove real users. Browser interaction and
production database verification must be performed separately.
