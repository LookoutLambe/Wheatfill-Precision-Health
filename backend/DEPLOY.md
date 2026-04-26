## Deploying the API (to enable Inbox / Orders / Payments)

The marketing site (`https://wheatfillprecisionhealth.com`) is static. Provider **Inbox**, **Orders**, and **Payments**
need the backend API running publicly over HTTPS. Staff sign-in uses `POST /auth/login`.

### What “API session” means

- The provider login page calls `POST /auth/login` on the API.
- On success the API sets an **httpOnly** cookie (`wph_jwt`, `Secure` + `SameSite=None` in production) scoped to the API host. The SPA does **not** store the JWT in `localStorage` (legacy `wph_token_v1` is cleared on sign-in).
- Authenticated fetches use `credentials: 'include'` and send header **`X-WPH-Client: 1`** on `POST`/`PATCH`/`DELETE`/`PUT` so simple cross-site form posts cannot drive credentialed mutations.
- `GET /v1/auth/session` returns `{ authenticated, role? }` without exposing the JWT (used by the static site to detect an existing cookie session).
- `POST /auth/logout` clears the session cookie.

### Minimal production requirements

- **HTTPS** endpoint (recommended hostname: `https://api.wheatfillprecisionhealth.com`)
- **Database**: PostgreSQL (e.g. Supabase). `DATABASE_URL` and `DIRECT_URL` in production (use the pooler URL per Supabase for IPv4 hosts; see `.env.example`).
- **CORS**: `FRONTEND_ORIGIN` must be set in **production** (comma-separated list) and include:
  - `https://wheatfillprecisionhealth.com`
  - `https://www.wheatfillprecisionhealth.com` (if you use it)
- **JWT secret**: set `JWT_SECRET` (do not use the dev default)
- **Sessions (team stays signed in)**: default `JWT_EXPIRES_IN` is **30d** (httpOnly cookie max-age matches the JWT). Set `JWT_EXPIRES_IN=90d` if you want longer; shorter for stricter security.
- **Reverse proxy**: when the API sits behind Render, Fly, or nginx, **trust proxy** is turned on automatically in production when `RENDER=true` or `FLY_APP_NAME` is set, so **client IP** (rate limits, audit logs) is correct. Set `TRUST_PROXY=0` to disable, or `TRUST_PROXY=1` to force on. Other hosts: set `TRUST_PROXY=1`.
- **HSTS**: enabled on the API in production via Helmet (browsers remember HTTPS for the API host).
- **Legacy `/v1/team/inbox`**: accepts either `Bearer <TEAM_INBOX_KEY>` or a normal staff **JWT** (provider/admin). Prefer `/v1/provider/team-inbox` with cookie session for the web app.

### Environment variables

Start from `backend/.env.example`. Key values:

- `DATABASE_URL` and `DIRECT_URL` — set from Supabase in production (see `backend/.env.example`)
- `JWT_SECRET=<random>`
- `FRONTEND_ORIGIN=https://wheatfillprecisionhealth.com,https://www.wheatfillprecisionhealth.com`
- Optional team passwords:
  - `TEAM_BRETT_PASSWORD=...`
  - `TEAM_BRIDGETTE_PASSWORD=...`
  - `TEAM_ADMIN_PASSWORD=...`

### Docker

This repo includes `backend/Dockerfile` which builds and runs the API:

- listens on `PORT` (default 8080)
- exposes `GET /health` and `GET /v1/health`

### DNS

Once you deploy the API, point the domain:

- `api.wheatfillprecisionhealth.com` → your hosting provider (A/AAAA or CNAME, depending on provider)

### Connect the marketing site to the API

In GitHub repo settings:

- Add Actions secret `VITE_API_URL` = `https://api.wheatfillprecisionhealth.com`
- GitHub Pages will rebuild and the provider login will request the token from that API.

### Database schema (Render / production)

`npm start` runs `scripts/start-prod.mjs`, which (1) **best-effort** runs `prisma migrate resolve --rolled-back 20260425_postgres_init` to clear a stuck **P3009** state, (2) runs **`prisma db push`**, (3) starts the server. It does **not** run `prisma migrate deploy`.

#### If you still see `Error: P3009`

**Read the log line: is the error in *Build* or in *Start*?**

- **Build** (while “Building…” or `npm run build` / `prisma generate`): the failure is **before** the container runs our `start` script. Almost always the **Build Command in the Render dashboard** still includes `npx prisma migrate deploy` or `prisma migrate deploy`. **Delete that** from the build. Use only: `npm ci && npm run build` (with **Root Directory** = `backend`, or `cd backend && …` if you run from the repo root).
- **Start** (container already built, process starting): the updated `scripts/start-prod.mjs` runs a small SQL script to clear a stuck row in `_prisma_migrations`, then `prisma db push`, then the API. If P3009 still shows here, paste that log; also confirm **`DIRECT_URL`** (or a non-pooled direct Postgres URL) is set so Prisma can run DDL when needed.

P3009 is always from Prisma’s **Migrate** path (`prisma migrate deploy` / `migrate dev`), not from normal queries. The **Type** / **URI** dropdown in Neon’s UI only changes how the string is copied, not the error.

- **Correct build** (from repo root, or set Render **Root Directory** to `backend`): `npm ci && npm run build` only.
- **Correct start**: `npm start` (or `node scripts/start-prod.mjs`).
- You can use the example **`render.yaml`** in the repo root as a template; it does not run migrate in the build.
- For Docker, the `Dockerfile` `CMD` runs `node scripts/start-prod.mjs` (so the same logic runs in the container).
- **Skip all Prisma at boot** (emergency): set `WPH_SKIP_PRISMA=1` and use the same `npm start` entry, or use `npm run start:server` (no schema sync).
- **Local** development still uses `npx prisma migrate dev` to evolve `prisma/migrations/`; production uses the **schema** via `db push` after the optional resolve step.

