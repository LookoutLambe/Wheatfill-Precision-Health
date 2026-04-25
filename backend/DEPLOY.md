## Deploying the API (to enable Inbox / Orders / Payments)

The marketing site (`https://wheatfillprecisionhealth.com`) is static. Provider **Inbox**, **Orders**, and **Payments**
need the backend API running publicly over HTTPS and returning JWT tokens from `POST /auth/login`.

### What “API token” means

- The provider login page calls `POST /auth/login` on the API.
- On success it stores the returned JWT in browser storage as `wph_token_v1`.
- Requests such as `GET /v1/provider/team-inbox` send `Authorization: Bearer <token>`.

### Minimal production requirements

- **HTTPS** endpoint (recommended hostname: `https://api.wheatfillprecisionhealth.com`)
- **Database** (this repo currently uses SQLite in Prisma; for production use a persistent volume/disk)
- **CORS**: `FRONTEND_ORIGIN` must include:
  - `https://wheatfillprecisionhealth.com`
  - `https://www.wheatfillprecisionhealth.com` (if you use it)
- **JWT secret**: set `JWT_SECRET` (do not use the dev default)

### Environment variables

Start from `backend/.env.example`. Key values:

- `DATABASE_URL=file:./dev.db` (use a persistent disk path in production)
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

