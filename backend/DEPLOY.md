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

The default **`npm start`** in this backend runs **`prisma db push`** and then starts the server. The schema in `prisma/schema.prisma` is applied directly to the database, so deploys do **not** depend on a clean `_prisma_migrations` table. That avoids **P3009** / stuck failed migration records from blocking your service when a past `prisma migrate deploy` half-failed.

- **Render (Docker or native)**: set **Build** to compile only (e.g. `npm install` + `npm run build`), **not** `prisma migrate deploy`. The container applies the schema at boot via `prisma db push` from `package.json` `start`.
- **If you add `prisma migrate deploy` to a CI/build step** yourself, you are opting into the migration table; then you can still see **P3009** and must [resolve failed migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing#failed-migration) manually, or stop running `migrate deploy` in the build and rely on `npm start` only.
- **Local** development still uses `npx prisma migrate dev` to evolve versioned history under `prisma/migrations/`; production sync uses the schema file.
- **Skip the push (escape hatch)**: if you need to start the process without running `db push`, use `npm run start:server` (assumes the DB is already in sync).

