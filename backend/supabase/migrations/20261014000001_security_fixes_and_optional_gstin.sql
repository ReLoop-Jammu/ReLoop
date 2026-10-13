-- Security fixes from the 2026-10-14 security report, and GSTIN made optional.
-- The same blocks are in supabase-fixes/2026-10-14.sql for the live database.
-- Safe to run more than once.

-- Listings: visitors and signed-in users see only the public columns, never
-- purchase cost, processing cost or internal notes. The Supabase dashboard is
-- unaffected; an admin screen reading costs through the API would need the
-- service-role key.
revoke select on public.listings from anon, authenticated;
grant select (id, title, description, category_id, brand, model, condition, price, stock, image_url,
              status, featured, grade, created_at, updated_at)
  on public.listings to anon, authenticated;

-- Shop submissions: only the server route (service-role key, which checks the
-- shop is verified) may insert. Owners still read their own rows, but not
-- ReLoop's internal notes.
drop policy if exists "Shop owners can submit items" on public.shop_submissions;
revoke insert on public.shop_submissions from anon, authenticated;
revoke select on public.shop_submissions from anon, authenticated;
grant select (id, shop_owner_id, item_name, category_id, brand, model, description, quantity, condition,
              asking_price, image_url, status, purchase_price, rejection_reason, purchased_at, created_at,
              updated_at)
  on public.shop_submissions to authenticated;

-- Orders and enquiries: the site doesn't use them, and anyone could insert rows
-- with any status, amount or contact details. Closed until a feature needs them.
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "Anyone can create enquiries" on public.enquiries;
revoke insert on public.orders, public.enquiries from anon, authenticated;

-- Visitors have no business with accounts or back-office tables at all, and no
-- API role needs TRUNCATE, TRIGGER or REFERENCES (TRUNCATE ignores RLS).
revoke all on public.admin_users, public.processing_records, public.institution_submissions,
              public.shop_owners, public.profiles
  from anon;
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- One admin check for the whole database: an active admin_users row (the
-- marketplace's admins) or a hub staff member with the admin role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active)
      or exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin');
$$;

-- Shop verification can only be changed by an admin or from the dashboard,
-- even if a future policy lets owners edit their own row. Runs as the caller
-- (not SECURITY DEFINER) so current_user is the API role making the change.
create or replace function public.protect_shop_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() and (
       new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.review_notes is distinct from old.review_notes
  ) then
    raise exception 'Only ReLoop can change shop verification';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'shop_owners_protect_verification' and tgrelid = 'public.shop_owners'::regclass
  ) then
    create trigger shop_owners_protect_verification before update on public.shop_owners
      for each row execute function public.protect_shop_verification();
  end if;
end $$;

-- Sign-up: GSTIN is optional. A shop that isn't GST-registered leaves it
-- empty; a GSTIN that is given must be 15 letters or numbers.
create or replace function public.handle_new_reloop_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_role text;
  chosen_role public.account_role;
  supplied_name text;
  supplied_phone text;
  supplied_shop_name text;
  supplied_address text;
  supplied_gstin text;
begin
  raw_role := coalesce(new.raw_user_meta_data ->> 'account_type', 'buyer');
  if raw_role not in ('buyer', 'shop_owner') then
    raw_role := 'buyer';
  end if;
  chosen_role := raw_role::public.account_role;

  supplied_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  supplied_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  if supplied_name is null or char_length(supplied_name) not between 2 and 100 then
    raise exception 'Full name must contain 2 to 100 characters';
  end if;
  if supplied_phone is null or char_length(supplied_phone) not between 6 and 20 then
    raise exception 'Phone number must contain 6 to 20 characters (received %)',
      coalesce(char_length(supplied_phone), 0);
  end if;

  insert into public.profiles (user_id, full_name, phone, role)
  values (new.id, supplied_name, supplied_phone, chosen_role);

  if chosen_role = 'shop_owner' then
    supplied_shop_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'shop_name', '')), '');
    supplied_address := nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_address', '')), '');
    supplied_gstin := nullif(upper(regexp_replace(coalesce(new.raw_user_meta_data ->> 'gstin', ''), '\s', '', 'g')), '');

    if supplied_shop_name is null then
      raise exception 'Shop name is required';
    end if;
    if supplied_address is null then
      raise exception 'Business address is required';
    end if;
    if supplied_gstin is not null and supplied_gstin !~ '^[0-9A-Z]{15}$' then
      raise exception 'GSTIN must contain exactly 15 letters/numbers';
    end if;

    insert into public.shop_owners (
      id, shop_name, owner_name, email, phone, address, city,
      is_active, gstin, verification_status, business_address
    )
    values (
      new.id, supplied_shop_name, supplied_name, new.email,
      supplied_phone, supplied_address, 'Jammu', true,
      supplied_gstin, 'pending', supplied_address
    );
  end if;

  return new;
end;
$$;

-- Trigger functions can't be called through the API, but nobody needs to.
revoke execute on function public.handle_new_reloop_user() from public, anon, authenticated;
revoke execute on function public.protect_shop_verification() from public, anon, authenticated;

-- The public Images bucket (listing photos): keep it public, but cap uploads
-- at 5 MB and to common image types. No-op where the bucket doesn't exist.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'Images';
