-- Provider access control (Supabase)
-- ---------------------------------
-- Goal: allow anyone to create an auth account, but require manual approval
-- (by brett/bridgette/admin) before they can access /provider/* in the site.
--
-- This table is read by the backend during /auth/login:
-- - Map username -> email
-- - Check approved == true
-- - Issue the site httpOnly JWT cookie with role provider/admin

create table if not exists public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  -- NOTE: do NOT add a foreign key to auth.users.
  -- Supabase keeps auth tables in the `auth` schema and Prisma will crash with P4002
  -- when it detects cross-schema FK references during `prisma db push`.
  auth_user_id uuid unique,
  username text unique not null,
  email text unique not null,
  display_name text not null,
  role text not null default 'provider' check (role in ('provider','admin')),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  -- Prisma staff ids are cuids, not UUIDs — use text.
  approved_by text
);

create index if not exists provider_profiles_username_idx on public.provider_profiles (username);
create index if not exists provider_profiles_approved_idx on public.provider_profiles (approved);

-- Minimal RLS: backend uses service role; UI should not read this directly.
alter table public.provider_profiles enable row level security;

-- Allow users to insert their own pending profile row if it matches their auth.user email.
-- This is optional if registration is only done via backend with service role.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='provider_profiles' and policyname='provider_profiles_insert_own'
  ) then
    create policy provider_profiles_insert_own
      on public.provider_profiles
      for insert
      with check (auth.uid() = auth_user_id);
  end if;
end $$;

-- No select/update/delete policies by default.

