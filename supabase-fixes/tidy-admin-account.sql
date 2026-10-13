-- Tidies the shared ReLoop admin account. It finds the account as the only
-- active admin in admin_users, so no email address is needed or stored.
--
-- What it does:
--   1. Adds 'admin' as an account role (as migration 20261015000001). This runs
--      in its own transaction, because Postgres can't use a new role value in
--      the transaction that adds it.
--   2. In one transaction:
--      - marks the account's email as confirmed;
--      - renames it "ReLoop Admin" (profile, admin list and sign-up details);
--      - deletes its leftover shop row and sets its role to 'admin'.
--
-- Step 2 stops, changing nothing, if there isn't exactly one active admin, or
-- if the shop row looks real: anything but pending, ever reviewed or verified,
-- or with any submission. (Step 1's new role value stays; it is harmless.)
-- Safe to run twice.
--
-- How to run: psql -v ON_ERROR_STOP=1 -f supabase-fixes/tidy-admin-account.sql,
-- or paste it into the Supabase SQL Editor.

-- Step 1, committed on its own.
begin;
alter type public.account_role add value if not exists 'admin';
commit;

-- Step 2.
begin;

do $$
declare
  admin_id uuid;
  shop record;
  submissions integer;
begin
  if (select count(*) from public.admin_users where is_active) <> 1 then
    raise exception 'tidy-admin: expected exactly one active admin, found %',
      (select count(*) from public.admin_users where is_active);
  end if;
  select id into admin_id from public.admin_users where is_active;

  select * into shop from public.shop_owners where id = admin_id;
  if found then
    select count(*) into submissions from public.shop_submissions where shop_owner_id = admin_id;
    if shop.verification_status <> 'pending' or shop.verified_at is not null
       or shop.reviewed_by is not null or submissions > 0 then
      raise exception 'tidy-admin: the admin''s shop row looks real (status %, % submissions); nothing was changed',
        shop.verification_status, submissions;
    end if;
    delete from public.shop_owners where id = admin_id;
  end if;

  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()),
         raw_user_meta_data = raw_user_meta_data
           || jsonb_build_object('full_name', 'ReLoop Admin', 'display_name', 'ReLoop Admin')
   where id = admin_id;
  update public.profiles set full_name = 'ReLoop Admin', role = 'admin' where user_id = admin_id;
  update public.admin_users set name = 'ReLoop Admin' where id = admin_id;
end $$;

-- The result: one row, the tidied admin account.
select a.name, p.role, (u.email_confirmed_at is not null) as email_confirmed,
       exists (select 1 from public.shop_owners s where s.id = a.id) as has_shop_row
  from public.admin_users a
  join auth.users u on u.id = a.id
  left join public.profiles p on p.user_id = a.id
 where a.is_active;

commit;
