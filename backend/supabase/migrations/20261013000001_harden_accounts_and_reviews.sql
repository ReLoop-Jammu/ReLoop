-- Hardening for accounts, shop review and public endpoints.
--  1. Signup can no longer fail because of odd names, phones or GSTINs.
--  2. A GSTIN is unique only once verified (nobody can squat another shop's).
--  3. Staff can read and review shops and submissions; owners cannot self-verify.
--  4. Allowed values for shop submissions (matching the form).
--  5. A durable rate limiter used by the API routes (service role only).

-- 1. Lenient, sanitising signup trigger ---------------------------------------
create or replace function public.handle_new_reloop_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  raw_role text;
  chosen_role public.account_role;
  supplied_name text;
  supplied_phone text;
  supplied_gstin text;
  supplied_shop text;
  supplied_address text;
begin
  raw_role := coalesce(meta ->> 'account_type', 'buyer');
  if raw_role not in ('buyer', 'shop_owner') then
    raw_role := 'buyer';
  end if;
  chosen_role := raw_role::public.account_role;

  supplied_name := left(coalesce(nullif(trim(meta ->> 'full_name'), ''), 'ReLoop user'), 100);
  if char_length(supplied_name) < 2 then
    supplied_name := 'ReLoop user';
  end if;

  supplied_phone := regexp_replace(coalesce(meta ->> 'phone', ''), '[^0-9+]', '', 'g');
  if char_length(supplied_phone) < 6 or char_length(supplied_phone) > 20 then
    supplied_phone := 'not-provided';
  end if;

  insert into public.profiles (user_id, full_name, phone, role)
  values (new.id, supplied_name, supplied_phone, chosen_role);

  if chosen_role = 'shop_owner' then
    supplied_gstin := nullif(upper(trim(meta ->> 'gstin')), '');
    if supplied_gstin is not null and supplied_gstin !~ '^[0-9A-Z]{15}$' then
      supplied_gstin := null;
    end if;
    supplied_shop := left(coalesce(nullif(trim(meta ->> 'shop_name'), ''), 'Pending shop details'), 120);
    supplied_address := left(coalesce(nullif(trim(meta ->> 'business_address'), ''), 'Pending address'), 300);

    insert into public.shop_owners (
      id, shop_name, owner_name, email, phone, address, city,
      is_active, gstin, verification_status, business_address
    )
    values (
      new.id, supplied_shop, supplied_name, new.email, supplied_phone, supplied_address,
      left(coalesce(nullif(trim(meta ->> 'city'), ''), 'Jammu'), 100),
      true, supplied_gstin, 'pending', supplied_address
    );
  end if;

  return new;
end;
$$;

-- 2. GSTIN is unique among verified shops only --------------------------------
drop index if exists public.shop_owners_gstin_unique_idx;
create unique index if not exists shop_owners_gstin_verified_idx
  on public.shop_owners (gstin)
  where gstin is not null and verification_status = 'verified';

-- 3. Staff access and the review function -------------------------------------
drop policy if exists "Staff read shop owners" on public.shop_owners;
create policy "Staff read shop owners" on public.shop_owners for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "Staff read shop submissions" on public.shop_submissions;
create policy "Staff read shop submissions" on public.shop_submissions for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "Staff update shop submissions" on public.shop_submissions;
create policy "Staff update shop submissions" on public.shop_submissions for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "Staff read institution submissions" on public.institution_submissions;
create policy "Staff read institution submissions" on public.institution_submissions
  for select to authenticated using ((select public.is_staff()));

drop policy if exists "Staff update institution submissions" on public.institution_submissions;
create policy "Staff update institution submissions" on public.institution_submissions
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
grant select, update on public.institution_submissions to authenticated;

-- Owners may only read their own rows; nobody but staff changes verification.
revoke insert, update, delete on public.shop_owners from anon, authenticated;
revoke insert, update, delete on public.shop_submissions from anon, authenticated;
grant update (status) on public.shop_submissions to authenticated;

create or replace function public.review_shop_owner(
  p_shop_owner_id uuid,
  p_status text,
  p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can review shops' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Unknown verification status: %', p_status using errcode = '22023';
  end if;

  begin
    update public.shop_owners
       set verification_status = p_status,
           verified_at = case when p_status = 'verified' then now() else null end,
           reviewed_by = auth.uid(),
           review_notes = coalesce(p_notes, '')
     where id = p_shop_owner_id;
    get diagnostics affected = row_count;
  exception when unique_violation then
    raise exception 'Another verified shop already uses this GSTIN' using errcode = '23505';
  end;

  if affected is null or affected = 0 then
    raise exception 'Shop owner not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.review_shop_owner(uuid, text, text) from public, anon;
grant execute on function public.review_shop_owner(uuid, text, text) to authenticated;

-- 4. Allowed values for shop submissions --------------------------------------
-- Includes the older labels so rows from the earlier deployment stay valid.
alter table public.shop_submissions drop constraint if exists shop_submissions_condition_check;
alter table public.shop_submissions add constraint shop_submissions_condition_check
  check (condition in (
    'Working', 'Partially working', 'Broken', 'Dead / scrap', 'Untested',
    'Excellent', 'Good', 'Fair', 'Poor'
  ));

alter table public.shop_submissions drop constraint if exists shop_submissions_status_check;
alter table public.shop_submissions add constraint shop_submissions_status_check
  check (status in ('Pending', 'Reviewing', 'Accepted', 'Rejected'));

alter table public.institution_submissions drop constraint if exists institution_submissions_status_check;
alter table public.institution_submissions add constraint institution_submissions_status_check
  check (status in ('Pending', 'Contacted', 'Scheduled', 'Closed'));

-- 5. Durable rate limiter -----------------------------------------------------
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts a hit and says whether the caller is still within its limit.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.rate_limits as t (key, window_start, hits)
  values (left(p_key, 200), now(), 1)
  on conflict (key) do update
    set hits = case
          when t.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else t.hits + 1
        end,
        window_start = case
          when t.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else t.window_start
        end
  returning t.hits into n;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_limit;
end;
$$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
