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

### Migrations (Render / production)

- Run migrations against the **same** `DATABASE_URL` / `DIRECT_URL` you use in production (e.g. build or release step: `cd backend && npm ci && npx prisma migrate deploy`).
- Initial migration name in this repo: `20260425_postgres_init`.

#### Error P3009 (failed migrations in the target database)

Prisma refuses to run new migrations while a previous run is still marked as **failed** in the `_prisma_migrations` table. Fix the database state once, then deploy again.

1. From `backend/`, with production `DATABASE_URL` and `DIRECT_URL` in `.env` (or the environment), run:
   - `npx prisma migrate status`
2. Use **one** of the following, depending on what really happened to the database:

- **A — Migration never finished, schema is empty or hopelessly half-applied (typical for a new Supabase DB with no data you need)**  
  - `npx prisma migrate resolve --rolled-back 20260425_postgres_init`
  - `npx prisma migrate deploy`  
  - If deploy fails with “already exists” (partial run left objects behind) and you can **wipe** the project: use Supabase’s full database or project reset, then `npx prisma migrate deploy` again.

- **B — Migration actually completed** (all tables and enums exist; Prisma only lost track after a timeout or network blip)  
  - `npx prisma migrate resolve --applied 20260425_postgres_init`  
  - `npx prisma migrate deploy` (should report nothing to do)

- **C — You only need to clear the “failed” flag and will fix objects manually**  
  - Prefer the official commands above. Avoid hand-editing `_prisma_migrations` unless you know the exact state.

After P3009 is resolved, a normal `prisma migrate deploy` in your Render build (or your chosen release step) should proceed without that error.

