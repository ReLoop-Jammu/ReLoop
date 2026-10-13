-- Admin password reset (no email sending): an admin sets a temporary password
-- through a server route; the user must choose a new one before doing
-- anything else. Every reset is logged, never with the password.

-- 1. The flag. Users can read their own profile (20261011) but update only
--    full_name and phone, so they can't clear it themselves; only the server
--    route that sets their new password does.
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- 2. Who did what to whom, and when. No passwords, ever.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('password_reset', 'role_change')),
  detail text not null default '' check (char_length(detail) <= 200),
  at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
drop policy if exists "Admins read the audit log" on public.admin_audit_log;
create policy "Admins read the audit log" on public.admin_audit_log for select to authenticated
  using ((select public.is_admin()));

-- 3. A temporary password opens nothing: while the flag is set, the caller is
--    neither admin nor staff, so the hub, admin pages and their data stay shut.
create or replace function public.password_change_pending()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.must_change_password from public.profiles p where p.user_id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.password_change_pending() and (
    exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active)
    or exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.password_change_pending() and (
    exists (select 1 from public.staff s where s.user_id = auth.uid()) or public.is_admin()
  );
$$;
