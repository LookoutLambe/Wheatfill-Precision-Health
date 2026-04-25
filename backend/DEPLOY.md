## Deploying the API (to enable Inbox / Orders / Payments)

The marketing site (`https://wheatfillprecisionhealth.com`) is static. Provider **Inbox**, **Orders**, and **Payments**
need the backend API running publicly over HTTPS and returning JWT tokens from `POST /auth/login`.

### What “API token” means

- The provider login page calls `POST /auth/login` on the API.
- On success it stores the returned JWT in browser storage as `wph_token_v1`.
- Requests such as `GET /v1/provider/team-inbox` send `Authorization: Bearer <token>`.

### Minimal production requirements

- **HTTPS** endpoint (recommended hostname: `https://api.wheatfillprecisionhealth.com`)
- **Database**: PostgreSQL (e.g. Supabase). `DATABASE_URL` and `DIRECT_URL` in production (use the pooler URL per Supabase for IPv4 hosts; see `.env.example`).
- **CORS**: `FRONTEND_ORIGIN` must include:
  - `https://wheatfillprecisionhealth.com`
  - `https://www.wheatfillprecisionhealth.com` (if you use it)
- **JWT secret**: set `JWT_SECRET` (do not use the dev default)

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

That error is **only** reported by **`prisma migrate deploy`** (or `migrate dev`), not by `db push`. If it still appears, **your Render (or CI) build command is still running `npx prisma migrate deploy`**. Remove it.

- **Correct build** (from repo root, or set Render **Root Directory** to `backend`): `npm ci && npm run build` only.
- **Correct start**: `npm start` (or `node scripts/start-prod.mjs`).
- You can use the example **`render.yaml`** in the repo root as a template; it does not run migrate in the build.
- For Docker, the `Dockerfile` `CMD` runs `node scripts/start-prod.mjs` (so the same logic runs in the container).
- **Skip all Prisma at boot** (emergency): set `WPH_SKIP_PRISMA=1` and use the same `npm start` entry, or use `npm run start:server` (no schema sync).
- **Local** development still uses `npx prisma migrate dev` to evolve `prisma/migrations/`; production uses the **schema** via `db push` after the optional resolve step.

