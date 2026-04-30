-- Lock down PostgREST-facing privileges (Supabase)
-- -----------------------------------------------
-- Supabase exposes the Postgres `public` schema via PostgREST using the `anon` and
-- `authenticated` roles. Default grants can accidentally allow browser-held JWTs (or the
-- publishable anon key) to SELECT/WRITE sensitive Prisma tables.
--
-- This project’s API talks to Postgres via Prisma (`DATABASE_URL`) and uses the Supabase
-- service role for Supabase Auth/admin SDK calls — it does not rely on direct table access
-- from the frontend through PostgREST.
--
-- Apply in Supabase SQL editor (or migrate) after schema changes if you need to re-run.

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke all privileges on table public.%I from anon, authenticated;',
      r.tablename
    );
  end loop;
end $$;

-- Optional hardening: remove execute grants on SECURITY DEFINER helpers if present.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_catalog.pg_function_is_visible(p.oid)
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end $$;
