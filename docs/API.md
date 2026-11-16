# EdSync API Reference

Complete request/response reference for the EdSync backend, intended as the contract a frontend
(or any other client) integrates against. For a high-level feature tour, environment setup, and
architecture notes, see the root [README](../README.md).

## Conventions

**Base URL**: all routes are prefixed with `/api/v1`. There is no separate versioned host — the
prefix is the version.

**Multi-tenancy**: every organization ("institute") is a tenant. Every resource below a User
carries an `organizationId`, and every query is scoped to `req.user.organizationId` — the acting
user's own tenant, taken from their JWT, never from the request body or query string. Two
organizations' data never intersect, and a client can't override its own scope by passing a
different `organizationId` in a payload (extra fields are ignored).

**Auth**: stateless JWT, delivered in an `httpOnly` cookie named `jwt` (set by every endpoint that
logs a user in — register, login). A `Bearer <token>` header also works, for non-browser clients.
The same token is also returned in the JSON body as `token` on register/login, for clients that
can't rely on cookies (e.g. a mobile app). The cookie is `secure` + `sameSite=none` in production,
`sameSite=lax` in development.

The JWT payload is `{ id, organizationId, role }` and expires after 7 days. There is no refresh
token — a user simply logs in again after expiry.

**Roles**: `InstituteAdmin`, `Instructor`, `Student`. Assigned once at invite time and fixed for
the life of the account (see [Invitations](#invitations)). Endpoints marked "Auth: required" only
need a valid session; endpoints listing specific roles require one of those roles via
`restrictTo(...)`.

**Response envelope**: every success response is JSON shaped as

```json
{ "status": "success", "data": { "...": "..." } }
```

List endpoints add a `results` count alongside `data`:

```json
{ "status": "success", "results": 3, "data": { "cohorts": ["..."] } }
```

Some action endpoints (delete, revoke, logout) return `message` instead of `data`.

**Error envelope**:

```json
{ "status": "fail", "message": "Cohort not found." }
```

(`status` is `"fail"` for 4xx, `"error"` for 5xx.) In development, an additional `stack` field is
included. There is one error shape for the entire API — validation errors, authorization
failures, and not-found all return this same envelope, distinguished by `message` and the HTTP
status code.

**Authorization pattern — 404 over 403**: for anything scoped under a Cohort (modules, lectures,
assignments, submissions, questions, chat), a user who _exists_ but lacks access (a non-owning
Instructor, an unenrolled Student) gets a **404**, not a 403. This is deliberate: it means a
Cohort's existence and a user's lack of access to it are indistinguishable from the outside, so
enumerating other tenants' or other instructors' cohort IDs reveals nothing.

**Common status codes**:

| Code | Meaning here                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 400  | Validation failure (bad shape, bad enum value, business-rule violation like grading over `totalMarks`)   |
| 401  | Missing/invalid/expired credentials or token                                                             |
| 403  | Authenticated, but role-forbidden (e.g. a Student hitting an admin-only route)                           |
| 404  | Resource not found, not in this tenant, or access-hidden (see above)                                     |
| 409  | Conflict — duplicate submission, already-used invite, deleting a cohort that still has enrollments, etc. |
| 429  | Rate limited (see [Rate limits](#rate-limits))                                                           |

**Rate limits**: a general limiter applies to all of `/api/*`. Auth routes (`/auth/*`,
`/organizations` register) carry a stricter `authLimiter`; `/auth/login` specifically uses a
`loginLimiter` that only counts _failed_ attempts, so a burst of correct logins is never
throttled. All limiters are disabled under `NODE_ENV=test`.

---

## Table of contents

- [Organizations](#organizations)
- [Auth](#auth)
- [Invitations](#invitations)
- [User management](#user-management)
- [Cohorts](#cohorts)
- [Modules](#modules)
- [Lectures](#lectures)
- [Enrollments](#enrollments)
- [Assignments](#assignments)
- [Submissions](#submissions)
- [Questions (Q&A board)](#questions-qa-board)
- [Real-time chat (Socket.io)](#real-time-chat-socketio)
- [Background jobs](#background-jobs)
- [Environment variables](#environment-variables)

---

## Organizations

An Organization is the tenant. It's created once, at institute signup, and its branding can be
managed afterward by its InstituteAdmin.

### `POST /organizations`

Bootstrap a new institute and its first `InstituteAdmin`. Public — no auth.

Rate limit: `authLimiter`.

**Body**

```json
{
  "orgName": "Springfield Institute",
  "adminName": "Ada Admin",
  "email": "ada@example.com",
  "password": "at-least-8-chars"
}
```

**201**

```json
{
  "status": "success",
  "message": "Institute created. Verification code sent to the admin email. Please verify before logging in.",
  "data": {
    "organization": {
      "id": "...",
      "name": "Springfield Institute",
      "slug": "springfield-institute"
    }
  }
}
```

The admin account is created with `isEmailVerified: false`; a 6-digit code is emailed (queued,
see [Background jobs](#background-jobs)) and must be confirmed via
`POST /auth/verify-email` before the admin can log in.

### `GET /organizations/lookup`

Public — no auth. Resolves a human-typeable `slug` (e.g. `springfield-institute`) to the
organization ID every other auth endpoint requires. Exists because login/verify/reset all take a
raw `organizationId`, which no user could ever know or type on their own; this is the one public,
low-sensitivity way to get from "the name of my institute" to that ID. Rate limit: `authLimiter`.

**Query**: `?slug=springfield-institute`

**200** `{ status, data: { organization: { id, name, logoUrl } } }` — no other organization fields
are exposed. **404** if no organization has that slug. **400** if `slug` is missing.

### `GET /organizations/me`

Branding for the caller's own organization. Auth: any authenticated role — students and
instructors need this to render the institute's logo/theme too, not just admins.

**200**

```json
{
  "status": "success",
  "data": {
    "organization": {
      "id": "...",
      "name": "Springfield Institute",
      "slug": "springfield-institute",
      "logoUrl": "",
      "themeColor": "#000000",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

### `PATCH /organizations/me`

Update branding. Auth: `InstituteAdmin`. All fields optional — send only what changes.

**Body**

```json
{
  "name": "New Name",
  "logoUrl": "https://cdn.example.com/logo.png",
  "themeColor": "#1A2B3C"
}
```

`logoUrl` must be a valid URL if present (no server-side upload handling — host the image
elsewhere and pass its URL, same convention as lecture resources and submission files).
`themeColor` must be a 3- or 6-digit hex color.

**200** — same shape as `GET /organizations/me`, with `message: "Organization updated."`.

### `GET /organizations/me/dashboard`

Aggregate counts for the admin's landing page. Auth: `InstituteAdmin`.

**200**

```json
{
  "status": "success",
  "data": {
    "dashboard": {
      "cohorts": { "total": 4, "active": 2 },
      "enrolledStudents": 37,
      "pendingInvites": 3
    }
  }
}
```

`enrolledStudents` is a distinct count of students with an `Active` enrollment (a student in two
cohorts counts once). `pendingInvites` counts `Invitation` documents with `status: 'Pending'`.

---

## Auth

All under `/auth`. None of these take `organizationId` from a token — login/register/verify are
how a token is first obtained, so the caller supplies `organizationId` explicitly (a user picks
their institute, e.g. from a subdomain or a login-page dropdown).

### `POST /auth/register`

Accept an invite and create the account. Public, but requires a valid, unexpired, unused invite
token (see [Invitations](#invitations)).

**Body**

```json
{
  "name": "Ivy Instructor",
  "email": "ivy@example.com",
  "password": "at-least-8-chars",
  "inviteToken": "..."
}
```

**201** — same shape as login (below): sets the `jwt` cookie, returns `token` and the raw user
document (password stripped) as `data.user._id` (not the shaped `id` other endpoints use — this
is the one place a raw Mongoose document reaches the client).

Errors: 400 invalid/expired/wrong-email invite, 409 invite already used or account already exists.

Concurrency note: registering the same invite twice at once is handled with a MongoDB transaction
(re-checking the invite's `Pending` status inside the transaction), not just a unique index — only
one of two simultaneous accepts of the same invite can succeed, and if marking the invite Accepted
fails after the user is created, the whole transaction (including the user) rolls back.

### `POST /auth/verify-email`

Confirm the 6-digit code emailed at registration/org-creation.

**Body**: `{ "email", "organizationId", "code" }` — **200** `{ status, message }`.

### `POST /auth/resend-verification-code`

**Body**: `{ "email", "organizationId" }` — **200**, generic message regardless of whether the
account exists (no account enumeration).

### `POST /auth/login`

**Body**: `{ "email", "password", "organizationId" }`. Rate limit: `loginLimiter` (only failed
attempts count).

**200**

```json
{
  "status": "success",
  "token": "eyJ...",
  "data": {
    "user": {
      "_id": "...",
      "name": "...",
      "email": "...",
      "role": "Student",
      "organizationId": "...",
      "isActive": true,
      "isEmailVerified": true
    }
  }
}
```

Sets the `jwt` cookie. 401 for wrong credentials, 403 for an unverified or suspended account.

### `POST /auth/forgot-password` / `POST /auth/resend-password-reset-code`

**Body**: `{ "email", "organizationId" }` — **200**, generic message either way (no account
enumeration). A real account gets a 6-digit reset code emailed, valid 10 minutes.

### `POST /auth/reset-password`

**Body**: `{ "email", "organizationId", "code", "newPassword" }` — **200** on success. 400 expired
code, 401 wrong code, 404 no such account.

### `POST /auth/change-password`

Auth: required. **Body**: `{ "currentPassword", "newPassword" }` — **200**. 401 if
`currentPassword` doesn't match.

### `GET /auth/me`

Auth: required. The one endpoint built specifically for a client to rehydrate session state after
a page load — the `jwt` cookie is `httpOnly`, so client-side JS can't otherwise tell who (or
whether) a user is logged in.

**200** `{ status, data: { user: { id, name, email, role, isActive, isEmailVerified, organizationId, createdAt } } }`
(same shape as the user-management endpoints — not the raw document login/register return). 401
if there's no valid session.

### `POST /auth/logout`

No auth required (it's idempotent). Overwrites the `jwt` cookie with a short-lived dummy value.
**200** `{ "status": "success" }`.

---

## Invitations

`/invitations`, all routes `InstituteAdmin`-only.

### `POST /invitations`

Invite a user by email + role. Superseds any existing pending invite for that email (the old one
is marked `Revoked`, not deleted).

**Body**: `{ "email", "role": "InstituteAdmin" | "Instructor" | "Student" }`

**201**

```json
{
  "status": "success",
  "message": "Invitation sent.",
  "data": {
    "invitation": {
      "id": "...",
      "email": "...",
      "role": "Instructor",
      "status": "Pending",
      "expiresAt": "..."
    }
  }
}
```

An email is queued containing a link to `${CLIENT_URL}/accept-invite?token=...` (the raw token;
only its hash is stored server-side). The invite expires after 7 days.

### `GET /invitations`

**200** `{ status, data: { invitations: [ ... ] } }` — full documents (not shaped), newest first.

### `DELETE /invitations/:id`

Revoke a pending invite. 400 if it's not currently `Pending` (already accepted/revoked).

**200** `{ "status": "success", "message": "Invitation revoked." }`

---

## User management

`/users`, scoped to the acting user's own organization.

### `GET /users`

Auth: `InstituteAdmin` or `Instructor` — an Instructor needs this to find students to enroll in
their own cohorts (see [Enrollments](#enrollments)); it's read-only, so this doesn't extend to
suspend/reactivate.

Query params: `role` (`InstituteAdmin`|`Instructor`|`Student`), `status` (`active`|`suspended`),
both optional.

**200** `{ status, results, data: { users: [{ id, name, email, role, isActive, isEmailVerified, organizationId, createdAt }] } }`

### `PATCH /users/:id/suspend` / `PATCH /users/:id/reactivate`

Auth: `InstituteAdmin` only.

Flips `isActive`. A suspended user's _existing_ session stops working on their very next request —
`requireAuth` checks `isActive` every time, so there's no token blacklist to maintain. An admin
cannot suspend their own account (400, checked before the org-scoped lookup so it never leaks
whether an ID belongs to this org).

**200** `{ status, message, data: { user: { ...same shape as list... } } }`. 404 if the target
isn't in the admin's org.

---

## Cohorts

`/cohorts`. A Cohort is the tenancy root for the curriculum tree — Module, Lecture, Enrollment,
Assignment, Submission, Question, and chat rooms all resolve their authorization back to "can this
user manage/view this Cohort."

| Rule                                   |                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Create                                 | `InstituteAdmin` only, must assign a real `instructorId` (an Instructor in this org) |
| Manage (update/delete/create children) | `InstituteAdmin`, or the assigned Instructor                                         |
| View                                   | the above, plus any Student enrolled in it                                           |

### `POST /cohorts`

Auth: `InstituteAdmin`. **Body**: `{ "title", "description"?, "instructorId", "startDate" (ISO 8601), "endDate"? }`

**201** `{ status, data: { cohort: { id, organizationId, instructorId, title, description, status: "Upcoming", startDate, endDate, createdAt } } }`

400 if `instructorId` doesn't reference a real Instructor in this org.

### `GET /cohorts`

Auth: required. Returns cohorts visible to the caller: all of them for `InstituteAdmin`, only
owned ones for an `Instructor`, only enrolled ones for a `Student`.

**200** `{ status, results, data: { cohorts: [ ... ] } }`

### `GET /cohorts/:id`

**200** — single cohort, same shape. 404 per the [404-over-403 rule](#conventions) if not visible.

### `PATCH /cohorts/:id`

Auth: `InstituteAdmin` or owning `Instructor`. **Body**: any of `title`, `description`,
`status` (`Upcoming`|`Active`|`Completed`), `startDate`, `endDate`.

**200** — updated cohort.

### `DELETE /cohorts/:id`

409 if it still has enrollments or modules — remove those first rather than cascading.

**200** `{ "status": "success", "message": "Cohort deleted." }`

### `GET /cohorts/:cohortId/modules` / `POST /cohorts/:cohortId/modules`

See [Modules](#modules) — nested here rather than under their own top-level path.

### `GET /cohorts/:cohortId/enrollments` / `POST /cohorts/:cohortId/enrollments`

See [Enrollments](#enrollments).

### `GET /cohorts/:cohortId/questions` / `POST /cohorts/:cohortId/questions`

See [Questions](#questions-qa-board).

---

## Modules

Nested under Cohorts for listing/creation; standalone by ID for read/update/delete.

### `GET /cohorts/:cohortId/modules`

Auth: anyone who can view the cohort. **200** `{ status, results, data: { modules: [{ id, organizationId, cohortId, title, orderIndex, createdAt }] } }`, sorted by `orderIndex`.

### `POST /cohorts/:cohortId/modules`

Auth: `InstituteAdmin` or owning `Instructor`. **Body**: `{ "title", "orderIndex" (int ≥ 0) }`

**201** — created module.

### `GET /modules/:id`

**200** — single module (view-access check, same as cohort).

### `PATCH /modules/:id`

Auth: manage-access. **Body**: `title?`, `orderIndex?`. **200** — updated module.

### `DELETE /modules/:id`

409 if it still has lectures.

### `GET /modules/:moduleId/lectures` / `POST /modules/:moduleId/lectures`

See [Lectures](#lectures).

---

## Lectures

Nested under Modules for listing/creation; standalone by ID otherwise. A Lecture denormalizes
both `cohortId` and `organizationId` from its Module so authorization never has to walk the parent
chain.

### `GET /modules/:moduleId/lectures`

**200** `{ status, results, data: { lectures: [{ id, organizationId, cohortId, moduleId, title, orderIndex, type, videoUrl, resourceUrl, durationInMinutes, createdAt }] } }`, sorted by `orderIndex`.

### `POST /modules/:moduleId/lectures`

Auth: manage-access on the parent cohort. **Body**:

```json
{ "title", "orderIndex": 0, "type": "Live" | "Recorded", "videoUrl"?, "resourceUrl"?, "durationInMinutes"? }
```

`videoUrl`/`resourceUrl` are plain URL fields (e.g. a Cloudinary or GitHub link) — no server-side
upload handling.

**201** — created lecture.

### `GET /lectures/:id` / `PATCH /lectures/:id` / `DELETE /lectures/:id`

Same view/manage rules as above. `PATCH` accepts any of the create fields.

### `GET /lectures/:lectureId/assignments` / `POST /lectures/:lectureId/assignments`

See [Assignments](#assignments).

---

## Enrollments

Roster-based: staff bulk-enrolls a list of students. There is no student self-enroll endpoint.

### `POST /cohorts/:cohortId/enrollments`

Auth: `InstituteAdmin` or owning `Instructor`. **Body**: `{ "studentIds": ["...", "..."] }`
(non-empty array of valid Mongo IDs).

Validates every ID resolves to an actual `Student` in this org (400 listing the bad ones if not).
Silently skips IDs already enrolled in this cohort rather than erroring.

**201**

```json
{
  "status": "success",
  "message": "Enrolled 2 student(s); 1 were already enrolled.",
  "data": { "enrollments": [{ "id", "organizationId", "cohortId", "studentId", "status": "Active", "progressPercentage": 0, "createdAt" }] }
}
```

### `GET /cohorts/:cohortId/enrollments`

Auth: `InstituteAdmin` or owning `Instructor` (a Student cannot list a cohort's roster).

**200** `{ status, results, data: { enrollments: [{ id, organizationId, cohortId, status, progressPercentage, createdAt, student: { id, name, email } }] } }`

### `DELETE /enrollments/:id`

Auth: `InstituteAdmin` or owning `Instructor`. Unenrolls a student.

**200** `{ "status": "success", "message": "Student unenrolled." }`

---

## Assignments

Nested under Lectures for listing/creation; standalone by ID otherwise.

### `GET /lectures/:lectureId/assignments`

Auth: view-access on the parent cohort. **200** `{ status, results, data: { assignments: [{ id, organizationId, cohortId, lectureId, title, description, attachmentUrl, deadline, totalMarks, createdAt }] } }`, sorted by `deadline`.

### `POST /lectures/:lectureId/assignments`

Auth: `InstituteAdmin` or owning `Instructor`. **Body**:

```json
{ "title", "description"?, "attachmentUrl"?, "deadline" (ISO 8601), "totalMarks"? }
```

`totalMarks` defaults to 100.

**201** — created assignment.

### `GET /assignments/:id` / `PATCH /assignments/:id` / `DELETE /assignments/:id`

Same view/manage rules. `DELETE` returns 409 if any submissions already exist.

### `GET /assignments/:assignmentId/submissions` / `POST /assignments/:assignmentId/submissions`

See [Submissions](#submissions).

---

## Submissions

### `POST /assignments/:assignmentId/submissions`

Auth: `Student` only (route-level `restrictTo`), and must be enrolled in the assignment's cohort
(404 otherwise). **Body**: `{ "fileUrl" }` (a GitHub repo link, Cloudinary link, etc. — no
server-side upload).

409 if this student already submitted this assignment (also enforced by a unique
`{assignmentId, studentId}` index at the schema level, so a race can't create two).
`status` is computed at submission time: `"Late"` if past `assignment.deadline`, else
`"Submitted"`.

**201** `{ status, data: { submission: { id, organizationId, assignmentId, studentId, fileUrl, obtainedMarks: null, feedback: "", status, createdAt } } }`

### `GET /assignments/:assignmentId/submissions`

One endpoint, two audiences:

- **Student**: sees only their own submission (an array of 0 or 1).
- **InstituteAdmin / owning Instructor**: sees every submission, each populated with
  `student: { id, name, email }` instead of a bare `studentId`.

**200** `{ status, results, data: { submissions: [ ... ] } }`

### `GET /submissions/:id`

Auth: the submitting Student, or staff with manage-access on the cohort. 404 if a different
Student requests it (not 403 — doesn't confirm the submission exists).

### `PATCH /submissions/:id/grade`

Auth: `InstituteAdmin` or owning `Instructor`. **Body**: `{ "obtainedMarks", "feedback"? }`.

400 if `obtainedMarks` exceeds the assignment's `totalMarks`. Sets `status: "Graded"`.

**200** — updated submission.

---

## Questions (Q&A board)

A conventional REST doubt-board per cohort — separate from the live chat below because posting
and resolving a question isn't a live-typing concern. Replies are embedded as a subdocument array
on the Question itself, not a separate collection.

### `GET /cohorts/:cohortId/questions` / `POST /cohorts/:cohortId/questions`

Auth: anyone who can view the cohort (any enrolled Student, the owning Instructor, or any admin).

**POST body**: `{ "title", "body" }` — **201** with `status: "Open"`, `replies: []`.

**GET 200** `{ status, results, data: { questions: [{ id, organizationId, cohortId, authorId, title, body, status, replies: [{ id, authorId, body, createdAt }], createdAt }] } }`, newest first.

### `GET /questions/:id`

Same view-access rule as the cohort it belongs to.

### `POST /questions/:id/replies`

Auth: anyone who can view the parent cohort. **Body**: `{ "body" }`.

**201** — the full question with the new reply appended.

### `PATCH /questions/:id/resolve`

Auth: the question's original author (any role, including the Student who asked it), **or**
`InstituteAdmin`/the owning `Instructor`. A different Student — not the author, not staff — gets 404.

**200** — question with `status: "Resolved"`.

---

## Real-time chat (Socket.io)

A cohort chat room, separate from the REST API above but sharing its auth. Connect a Socket.io
client to the same origin the HTTP API is served from; no separate port.

**Handshake auth**: the same `jwt` httpOnly cookie used for HTTP requests. There's no separate
socket token — connecting without that cookie (or with an invalid one) rejects the connection with
a `connect_error` event, using the exact same verification logic (`resolveUserFromToken`) as
`requireAuth`.

```js
import { io } from "socket.io-client";
const socket = io("https://your-api-host", { withCredentials: true });
```

### `join-cohort` (emit, with ack)

**Payload**: `cohortId` (string).

Authorization mirrors the REST API's view-access rule for a cohort (enrolled Student, owning
Instructor, or any admin); anyone else gets an error ack, not a socket disconnect.

**Ack**: `{ status: "ok", history: [{ id, cohortId, senderId, senderName, content, createdAt }] }`
— the last 50 messages in the room, oldest first — or `{ status: "error", message }`.

### `send-message` (emit, with ack)

**Payload**: `{ cohortId, content }`. Requires having already joined that room (an error ack
otherwise — re-checking full cohort authorization on every message is deliberately skipped in
favor of trusting room membership; a mid-session suspension takes effect on the socket's next
reconnect, not mid-room).

**Ack**: `{ status: "ok", message: { id, cohortId, senderId, senderName, content, createdAt } }` on
success. The same payload is also broadcast to everyone in the room as a `new-message` event
(including the sender).

### `new-message` (listen)

Broadcast to a joined room whenever anyone in it sends a message. Payload: same shape as the ack
above.

---

## Background jobs

Verification, invitation, and password-reset emails are sent through a BullMQ/Redis queue rather
than inline in the request — see the [README](../README.md#background-jobs) for the producer/worker
split and how to run the worker (`npm run worker`). None of the endpoints above behave differently
because of this; it only affects how quickly the email itself arrives, and a Redis outage degrades
to a logged failure rather than a failed request.

---

## Environment variables

| Variable                        | Required                             | Purpose                                                                                                                         |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                          | no (default 5000)                    | HTTP port                                                                                                                       |
| `NODE_ENV`                      | no                                   | `development` \| `production` \| `test` — affects error verbosity, cookie flags, and disables rate limiters/queues under `test` |
| `MONGO_URI`                     | yes                                  | MongoDB connection string                                                                                                       |
| `JWT_SECRET`                    | yes                                  | Signs/verifies auth tokens                                                                                                      |
| `EMAIL_USER` / `EMAIL_APP_PASS` | yes                                  | Gmail sender for verification/invite/reset emails                                                                               |
| `CLIENT_URL`                    | no (default `http://localhost:3000`) | CORS origin, and the base URL invite links point to                                                                             |
| `REDIS_URL`                     | yes                                  | BullMQ connection for the background email queue                                                                                |

`validateEnv()` fails fast at startup if any required variable is missing — see
`apps/server/config/validateEnv.js`.
