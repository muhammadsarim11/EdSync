# EdSync

A multi-tenant B2B LMS backend. Each institute is an isolated `Organization` tenant; every
tenant-scoped query and index is keyed on `organizationId` so one institute's data is never
visible to another.

## Stack

- **Runtime:** Node.js (ESM) + Express 5
- **Database:** MongoDB via Mongoose
- **Auth:** Stateless JWT in an HTTP-only cookie, `organizationId` embedded in the token payload
- **Testing:** Vitest + Supertest, against a real MongoDB (in-memory for local dev, a service
  container in CI)

## Architecture

The server is split into the conventional layers:

- **`routes/`** wire an HTTP method + path to validation, auth, and a controller.
- **`controllers/`** are thin — they call a service and shape the HTTP response. No business logic
  lives here.
- **`services/`** hold the business logic and talk to Mongoose models directly.
- **`models/`** are the Mongoose schemas.
- **`middlewares/`** cover auth (`requireAuth`, `restrictTo`), request validation
  (`middlewares/validators/`), and cross-cutting security concerns (`security.middleware.js`).

Errors are never handled with local `try/catch` — every async handler is wrapped in
`catchAsync`, which forwards rejections to `next(err)`. A single `globalErrorHandler`
(`middlewares/error.middleware.js`) is the only place that turns an error into an HTTP response:
it translates Mongoose `CastError`/`ValidationError`/duplicate-key errors and JWT errors into the
right status code, shows full detail in development, and a generic message in production.

`app.js` builds the Express app (used directly by tests, via Supertest, without binding a port).
`index.js` is the actual process entry point: it loads env vars, validates they're present,
connects to Mongo, and starts listening.

## Getting started

```bash
docker compose up -d redis   # from the repo root
cd server
npm install
cp .env.example .env   # fill in real values
npm run dev
npm run worker              # in a second terminal - actually sends the queued emails
```

You'll need a MongoDB instance running locally (or a `MONGO_URI` pointing at one, e.g. Atlas), a
Gmail account with an [App Password](https://myaccount.google.com/apppasswords) for sending
verification/invite emails, and Redis (`docker compose up -d redis`, or point `REDIS_URL` at any
other instance).

### Environment variables

| Variable         | Required                             | Purpose                                                                   |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `PORT`           | no (default `5000`)                  | HTTP port                                                                 |
| `NODE_ENV`       | no                                   | `development` shows full error detail; anything else hides it             |
| `MONGO_URI`      | yes                                  | Mongo connection string                                                   |
| `JWT_SECRET`     | yes                                  | Signs the auth cookie's JWT                                               |
| `EMAIL_USER`     | yes                                  | Gmail address used to send verification/invite/reset emails               |
| `EMAIL_APP_PASS` | yes                                  | Gmail App Password for `EMAIL_USER`                                       |
| `CLIENT_URL`     | no (default `http://localhost:3000`) | CORS origin, and the base URL invite links point at                       |
| `REDIS_URL`      | yes                                  | Backs the BullMQ email queue (`docker compose up -d redis` for local dev) |

The server fails fast at startup (`config/validateEnv.js`) if any required variable is missing,
rather than silently falling back to a default.

## Tenancy and auth model

Sign-up is invite-only, with one bootstrap exception:

1. **`POST /api/v1/organizations`** — public. Creates a new `Organization` (tenant) and its first
   user, an `InstituteAdmin`, and emails that admin a verification code. This is the only way to
   create an organization.
2. An `InstituteAdmin` invites `Instructor`s and `Student`s via **`POST /api/v1/invitations`**,
   which emails a link containing a single-use, hashed token.
3. The invitee completes **`POST /api/v1/auth/register`** with that token. There's no
   `organizationId` field on this route — the invite token is what determines which org and role
   the new account gets, so a user can't self-enroll into an arbitrary tenant.

Every subsequent authenticated request carries a JWT (in an HTTP-only cookie) with `id`,
`organizationId`, and `role` embedded, so tenant scoping and role checks (`restrictTo`) never
need an extra database round trip.

## API reference

All routes are prefixed with `/api/v1`. Tables below are a quick index; for full request/response
bodies, error cases, and the Socket.io chat protocol, see [docs/API.md](docs/API.md).

### Organizations

| Method | Path                          | Auth           | Notes                                                                  |
| ------ | ----------------------------- | -------------- | ---------------------------------------------------------------------- |
| POST   | `/organizations`              | none           | Bootstrap a new institute + its first InstituteAdmin                   |
| GET    | `/organizations/lookup`       | none           | Resolve a `slug` to `{id, name, logoUrl}` for login/verify/reset forms |
| GET    | `/organizations/me`           | required       | Branding for the caller's own organization (name, logo, theme color)   |
| PATCH  | `/organizations/me`           | InstituteAdmin | Update name / `logoUrl` / `themeColor`                                 |
| GET    | `/organizations/me/dashboard` | InstituteAdmin | Cohort counts, enrolled student count, pending invite count            |

### Auth

| Method | Path                               | Auth         | Notes                                                                    |
| ------ | ---------------------------------- | ------------ | ------------------------------------------------------------------------ |
| POST   | `/auth/register`                   | invite token | Accept an invite and create the account                                  |
| POST   | `/auth/verify-email`               | none         | Confirm the emailed 6-digit code                                         |
| POST   | `/auth/resend-verification-code`   | none         | Generic response either way (no account enumeration)                     |
| POST   | `/auth/login`                      | none         | Sets the JWT cookie                                                      |
| POST   | `/auth/forgot-password`            | none         | Generic response either way (no account enumeration)                     |
| POST   | `/auth/reset-password`             | none         | Requires the emailed 6-digit code                                        |
| POST   | `/auth/resend-password-reset-code` | none         | Generic response either way (no account enumeration)                     |
| POST   | `/auth/change-password`            | required     | Requires the current password                                            |
| GET    | `/auth/me`                         | required     | Current session's user — used by clients to rehydrate auth state on load |
| POST   | `/auth/logout`                     | none         | Clears the JWT cookie                                                    |

### Invitations

| Method | Path               | Auth           | Notes                                                                                |
| ------ | ------------------ | -------------- | ------------------------------------------------------------------------------------ |
| POST   | `/invitations`     | InstituteAdmin | Invite a user by email + role; supersedes any existing pending invite for that email |
| GET    | `/invitations`     | InstituteAdmin | List invitations for the caller's org                                                |
| DELETE | `/invitations/:id` | InstituteAdmin | Revoke a pending invitation                                                          |

### Users

| Method | Path                    | Auth                       | Notes                                                                                                                                   |
| ------ | ----------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/users`                | InstituteAdmin, Instructor | List the caller's org, filterable by `?role=` / `?status=active\|suspended`                                                             |
| PATCH  | `/users/:id/suspend`    | InstituteAdmin             | Blocks the target's access immediately (`requireAuth` checks `isActive` on every request). Can target a peer InstituteAdmin, never self |
| PATCH  | `/users/:id/reactivate` | InstituteAdmin             | Restores access                                                                                                                         |

### Cohorts, Modules, Lectures

Cohort is the tenancy root for the curriculum tree — Module/Lecture authorization reduces to
"can this user manage/view this cohort" (`services/cohort.service.js`). A non-owning Instructor
or a Student who isn't enrolled gets 404, not 403, so these endpoints never confirm another
tenant's or instructor's data exists.

| Method           | Path                             | Auth                                                                                        | Notes                                                                                                                         |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| POST             | `/cohorts`                       | InstituteAdmin                                                                              | `instructorId` must reference an existing Instructor in the org                                                               |
| GET              | `/cohorts`                       | any role                                                                                    | Admin sees all; Instructor sees their own; Student sees only cohorts they're enrolled in                                      |
| GET/PATCH/DELETE | `/cohorts/:id`                   | InstituteAdmin or the assigned Instructor for write; view follows the same rule as the list | DELETE is blocked (409) while the cohort still has enrollments or modules                                                     |
| GET/POST         | `/cohorts/:cohortId/modules`     | view: same as cohort; create: InstituteAdmin/assigned Instructor                            |                                                                                                                               |
| GET/PATCH/DELETE | `/modules/:id`                   | same as above                                                                               | DELETE blocked (409) while it still has lectures                                                                              |
| GET/POST         | `/modules/:moduleId/lectures`    | same as above                                                                               |                                                                                                                               |
| GET/PATCH/DELETE | `/lectures/:id`                  | same as above                                                                               | `videoUrl`/`resourceUrl` are plain URL fields for now (e.g. a Cloudinary or GitHub link) — no server-side upload handling yet |
| POST             | `/cohorts/:cohortId/enrollments` | InstituteAdmin/assigned Instructor                                                          | Bulk-enrolls a roster of `studentIds`; already-enrolled ids are skipped, not errored                                          |
| GET              | `/cohorts/:cohortId/enrollments` | InstituteAdmin/assigned Instructor                                                          | Roster with student name/email populated                                                                                      |
| DELETE           | `/enrollments/:id`               | InstituteAdmin/assigned Instructor                                                          | Unenrolls one student                                                                                                         |

### Assignments, Submissions

Assignment denormalizes `organizationId`/`cohortId` from its Lecture the same way Lecture does
from Module, so grading/ownership checks stay one Cohort lookup deep. Submission status is
computed at submission time, not by a cron sweep: `Late` if `now > assignment.deadline`,
`Submitted` otherwise, `Graded` once an instructor grades it.

| Method           | Path                                     | Auth                                                                | Notes                                                                                                                                                                                   |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET/POST         | `/lectures/:lectureId/assignments`       | view: cohort visibility; create: InstituteAdmin/assigned Instructor |                                                                                                                                                                                         |
| GET/PATCH/DELETE | `/assignments/:id`                       | same as above                                                       | DELETE blocked (409) while it still has submissions                                                                                                                                     |
| POST             | `/assignments/:assignmentId/submissions` | Student only                                                        | Requires actual enrollment in the assignment's cohort (404 otherwise); one submission per student, enforced by both a friendly 409 precheck and a unique `assignmentId+studentId` index |
| GET              | `/assignments/:assignmentId/submissions` | any role                                                            | InstituteAdmin/assigned Instructor see every submission (populated with student name/email); a Student sees only their own                                                              |
| GET              | `/submissions/:id`                       | InstituteAdmin/assigned Instructor, or the submitting Student       | A different student's submission 404s                                                                                                                                                   |
| PATCH            | `/submissions/:id/grade`                 | InstituteAdmin/assigned Instructor                                  | Validates `obtainedMarks` against the assignment's `totalMarks`; sets status to `Graded`                                                                                                |

### Real-time chat and Q&A

| Method   | Path                           | Auth                                                         | Notes                                                                 |
| -------- | ------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Socket   | `join-cohort`                  | cohort visibility                                            | Joins the `cohort:<id>` room, returns the last 50 messages as history |
| Socket   | `send-message`                 | must have joined the room first                              | Persists to Mongo, broadcasts `new-message` to the room               |
| GET/POST | `/cohorts/:cohortId/questions` | any cohort member                                            | Post/list a doubt-board question                                      |
| GET      | `/questions/:id`               | any cohort member                                            |                                                                       |
| POST     | `/questions/:id/replies`       | any cohort member                                            | Any enrolled Student or the Instructor may answer                     |
| PATCH    | `/questions/:id/resolve`       | the question's author, or InstituteAdmin/assigned Instructor |                                                                       |

Chat is Socket.io, not REST, since it's a live-typing concern; Q&A is plain REST since posting
and resolving a question isn't. Both reuse the same Cohort-rooted authorization as everything
else — `services/cohort.service.js`'s `findCohortOrFail`/`assertCanViewCohort` decide who can
join a chat room or see/post in a cohort's Q&A, the same functions Module/Lecture/Assignment
already use. The socket handshake authenticates with the identical JWT-cookie check as
`requireAuth` (`resolveUserFromToken` in `middlewares/auth.middleware.js`), not a second
mechanism. A `Question` embeds its replies as a subdocument array rather than a separate
collection.

## Background jobs

Verification, invitation, and password-reset emails no longer send synchronously inline - the
API process enqueues a BullMQ job (`queues/email.queue.js`) and returns immediately; a separate
`npm run worker` process (`workers/email.worker.js`) dequeues it and calls the same
`utils/email.js` functions the request handler used to call directly, retrying on failure.

A dead Redis must never turn an already-successful database write into a 500 for the client - the
account/invite/reset-code already exists by the time the email is queued, so a queue failure is
logged and swallowed, not thrown. The producer connection also bounds every ioredis retry knob
(`config/redis.js`'s `producerConnection`) so an enqueue attempt fails within ~5s instead of
hanging the request indefinitely, which is what happens with BullMQ's default connection options
against an unreachable Redis. The Worker keeps the default unbounded-retry connection, since
retrying forever in the background is exactly what it should do.

Tests never touch Redis: under `NODE_ENV=test`, the queue functions call the mocked
`utils/email.js` functions directly instead of constructing a Queue at all (mirroring the
`skipInTests` pattern already used for rate limiters), so `tests/setup.js`'s mocks and every
assertion on them work unchanged.

## Security

- `helmet`, credentialed `cors` (origin from `CLIENT_URL`), and a 10kb JSON body cap.
- Two rate limiters (`middlewares/security.middleware.js`): a shared budget across
  register/verify/resend/forgot-password/reset-password (since a "successful" response is the
  normal outcome of both real and abusive traffic there), and a separate login limiter that
  doesn't count a user's own successful login against their attempt budget.
- Request validation (`express-validator`) on every route.
- A recursive sanitizer strips `$`/`.`-prefixed keys from `body`/`params`/`query` in place, to
  avoid NoSQL operator injection without hitting Express 5's getter-only `req.query`.
- Password reset and resend endpoints return an identical response whether or not the account
  exists.

## Testing

```bash
cd server
npm test          # single run
npm run test:watch
```

Tests run against a real MongoDB, not mocks — a single-node replica set
(`mongodb-memory-server`'s `MongoMemoryReplSet`), since invite acceptance uses a multi-document
transaction and transactions require a replica set (a plain `mongod` doesn't support them; Atlas
and any real deployment already is one). The underlying binary is a one-time ~700MB download,
cached afterward; CI caches that same directory across runs (`.github/workflows/ci.yml`) so it
isn't repeated. Set `MONGO_TEST_URI` to point the suite at an existing replica set instead of
spinning up an ephemeral one.

Outbound email (`utils/email.js`) is mocked in tests (`tests/setup.js`); no real email is ever
sent by the suite.

The chat suite (`tests/chat.test.js`) is the one exception to "tests hit `app.js` directly with
no port bound" — Supertest can't drive a Socket.io handshake, so it binds a real `http.Server` to
an ephemeral port and connects with `socket.io-client`, closing both in `afterAll`.

## Linting & formatting

```bash
npm run lint           # eslint
npm run format:check   # prettier --check
npm run format          # prettier --write
```

Both run in CI (`.github/workflows/ci.yml`) alongside the test suite, on every push and PR to
`main`.

## Branching

This repo follows GitHub Flow: `main` is always deployable, and work happens on short-lived
branches merged back via a `--no-ff` merge (e.g. `feat/...`, `fix/...`, `chore/...`).

## Roadmap

IAM (invite-only auth + admin user management), the Curriculum engine (Cohort/Module/Lecture CRUD

- roster enrollment), Assessment & Grading (Assignment/Submission CRUD + grading), Background Jobs
  (BullMQ/Redis email queue), Real-Time (Socket.io chat + Q&A), and Tenant Configuration
  (branding endpoints + an org dashboard) are all built.

True subdomain routing (e.g. `acme.edsync.com`) is Next.js middleware territory and intentionally
lives outside this backend-only repo.
