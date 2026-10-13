-- Makes one existing ReLoop account an admin. An admin can verify shops and
-- manage listings, categories, orders and submissions.
--
-- 1. The person registers at /register and logs in once.
-- 2. Put their email on the line marked CHANGE THIS below, keeping the quotes.
-- 3. Supabase SQL Editor -> paste this whole file -> Run.
--
-- It stops with a clear error, changing nothing, if the email is still the
-- placeholder or no account uses it. Safe to run twice.

begin;

create temp table make_admin_input on commit drop as
  select 'PUT-THE-ADMIN-EMAIL-HERE'::text as email; -- <<< CHANGE THIS (keep the quotes)

do $$
declare
  wanted text := (select lower(trim(email)) from make_admin_input);
  account record;
begin
  if wanted = lower('PUT-THE-ADMIN-EMAIL-HERE') or wanted !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'make-admin: put the admin''s email on the line marked CHANGE THIS first.';
  end if;

  select u.id, u.email, coalesce(nullif(trim(p.full_name), ''), u.email) as name
    into account
    from auth.users u
    left join public.profiles p on p.user_id = u.id
   where lower(u.email) = wanted;

  if account.id is null then
    raise exception 'make-admin: no ReLoop account uses the email %. Ask them to register at /register first, then run this again.', wanted;
  end if;

  insert into public.admin_users (id, name, email, is_active)
  values (account.id, account.name, lower(account.email), true)
  on conflict (id) do update set is_active = true, email = excluded.email;
end $$;

-- Check this is the right person: the account should be theirs, created when
-- they registered, and signed in recently.
select a.name, a.email, a.is_active, u.created_at as account_created, u.last_sign_in_at
  from public.admin_users a
  join auth.users u on u.id = a.id
 where lower(a.email) = (select lower(trim(email)) from make_admin_input);

commit;
