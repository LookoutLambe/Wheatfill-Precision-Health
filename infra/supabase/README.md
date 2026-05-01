# Supabase (staff auth + Postgres)

The web API uses **Prisma** against your Postgres `DATABASE_URL` for application data. Optional **Supabase Auth** backs provider/staff passwords; approval lives in `public.provider_profiles` (not Prisma).

### If login shows `Could not find the table 'public.provider_profiles' in the schema cache`

The table has not been created in **this** Supabase project. In the Supabase dashboard → **SQL Editor**, paste and run the full script from **`provider_profiles.sql`** in this folder (step 2 below). Reload the API login page after PostgREST picks up the schema (usually immediate).

## 1. Database URL

Point `DATABASE_URL` / `DIRECT_URL` at the same Supabase project (or any Postgres) per `backend/.env.example`.

## 2. SQL to run in Supabase (SQL editor)

Apply **in order**:

1. **`provider_profiles.sql`** — creates `public.provider_profiles` + RLS.
2. If the table already existed with `approved_by uuid`, run **`alter_provider_profiles_approved_by_text.sql`** once.
3. **`revoke_postgrest_table_grants.sql`** (recommended) — strips default PostgREST grants from `public` tables so the browser anon key cannot read/write Prisma tables. The Node API uses the **service role** and Prisma, not PostgREST.

## 3. API environment (Render / local)

Set on the **backend**:

| Variable | Purpose |
|----------|---------|
| `USE_SUPABASE_AUTH` | `1` or `true` to use Supabase for staff **who have a `provider_profiles` row**. Patients still use Prisma (`User`) passwords. |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Used for `signInWithPassword` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin SDK: profiles, approvals, seed rows |

Run Prisma migrations against the same DB (`npm run prisma:migrate` / deploy pipeline) so `User.supabaseAuthUserId` exists—staff JWTs use Prisma user ids.

## 4. Bootstrap admins

With service role configured, the API seeds default rows for `brett`, `bridgette`, and `admin` in `provider_profiles` on boot **if** they are missing (passwords are only in Supabase Auth—you must set them in the Supabase dashboard or invite flow).
