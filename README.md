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
cd server
npm install
cp .env.example .env   # fill in real values
npm run dev
```

You'll need a MongoDB instance running locally (or a `MONGO_URI` pointing at one, e.g. Atlas) and
a Gmail account with an [App Password](https://myaccount.google.com/apppasswords) for sending
verification/invite emails.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no (default `5000`) | HTTP port |
| `NODE_ENV` | no | `development` shows full error detail; anything else hides it |
| `MONGO_URI` | yes | Mongo connection string |
| `JWT_SECRET` | yes | Signs the auth cookie's JWT |
| `EMAIL_USER` | yes | Gmail address used to send verification/invite/reset emails |
| `EMAIL_APP_PASS` | yes | Gmail App Password for `EMAIL_USER` |
| `CLIENT_URL` | no (default `http://localhost:3000`) | CORS origin, and the base URL invite links point at |

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

All routes are prefixed with `/api/v1`.

### Organizations

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/organizations` | none | Bootstrap a new institute + its first InstituteAdmin |

### Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | invite token | Accept an invite and create the account |
| POST | `/auth/verify-email` | none | Confirm the emailed 6-digit code |
| POST | `/auth/resend-verification-code` | none | Generic response either way (no account enumeration) |
| POST | `/auth/login` | none | Sets the JWT cookie |
| POST | `/auth/forgot-password` | none | Generic response either way (no account enumeration) |
| POST | `/auth/reset-password` | none | Requires the emailed 6-digit code |
| POST | `/auth/resend-password-reset-code` | none | Generic response either way (no account enumeration) |
| POST | `/auth/change-password` | required | Requires the current password |
| POST | `/auth/logout` | none | Clears the JWT cookie |

### Invitations

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/invitations` | InstituteAdmin | Invite a user by email + role; supersedes any existing pending invite for that email |
| GET | `/invitations` | InstituteAdmin | List invitations for the caller's org |
| DELETE | `/invitations/:id` | InstituteAdmin | Revoke a pending invitation |

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

Tests run against a real MongoDB, not mocks. Locally, `mongodb-memory-server` spins one up
automatically (a one-time ~700MB binary download on first run, then cached). In CI, set
`MONGO_TEST_URI` and the suite connects to that instead — the GitHub Actions workflow points it
at a `mongo:7` service container so CI never pays that download cost.

Outbound email (`utils/email.js`) is mocked in tests (`tests/setup.js`); no real email is ever
sent by the suite.

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

## Known limitations

- Invite acceptance (`services/auth/register.service.js`) creates the `User` and marks the
  `Invitation` `Accepted` as two separate writes, not a single Mongo transaction. The unique
  `email + organizationId` index prevents a duplicate account, but it isn't fully atomic.
- No LMS domain logic yet (Cohort/Module/Lecture/Assignment/Submission CRUD) beyond the Mongoose
  schemas themselves — auth and tenant/invite management is the only implemented slice.
