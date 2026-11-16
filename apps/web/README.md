# EdSync Web (`apps/web`)

The frontend of [EdSync](../../README.md), talking to the API in [`apps/server`](../server).
Deployed separately from the API: this app on Vercel (root directory `apps/web`), the API on Render.

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Data fetching:** TanStack Query, over a small typed client in `src/lib/api.ts`
- **Auth:** session cookie set by the API (`httpOnly`, cross-site in production); `src/lib/auth.tsx`
  rehydrates it on load via `GET /auth/me` and exposes a `useAuth()` hook

## Getting started

```bash
npm install                         # from the repo root - installs every workspace
cd apps/web
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your running API
npm run dev
```

Requires the [EdSync API](../server) running locally (default `http://localhost:5000`); see its
README for setup. Full endpoint documentation lives in [`docs/API.md`](../../docs/API.md).

### Environment variables

| Variable              | Required | Purpose                                         |
| --------------------- | -------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | yes      | Base URL of the EdSync API, including `/api/v1` |

## Cross-domain auth note

The API's session cookie is `SameSite=None; Secure` in production, which lets it work across the
different Vercel/Render domains — but Safari and Firefox block third-party cookies like this by
default under their tracking-prevention settings, so login can silently fail for those browsers
until the frontend and API share a registrable domain (e.g. `app.example.com` +
`api.example.com`, which are same-site to the browser regardless of subdomain). Worth revisiting
once a custom domain is in place.

## Linting & formatting

```bash
npm run lint
npm run format        # prettier --write
npm run format:check  # prettier --check
```

## Roadmap

Auth pages, role dashboards, curriculum/grading UI, real-time chat (cohort chat + Q&A), and tenant
branding are all built on top of the providers, typed API client, and session handling.
