-- ReLoop live database fixes, 2026-10-14. NOT YET RUN. Review before applying.
--
-- How to apply: follow docs/runbooks/apply-fix-2026-10-14.md. In short: back up
-- with scripts/backup-live-data.sh, then Supabase dashboard -> SQL Editor ->
-- paste this whole file -> Run.
--
-- It is one transaction: if any statement fails, or any check in block 5 is
-- false, nothing is changed. It is also safe to run twice. It changes
-- permissions, policies and functions and adds tables. Of the existing data it
-- only edits the storage bucket settings (block 4i); it deletes nothing.
--
-- Made from the repo migrations 20261007000001, 20261007000002, 20261012000001
-- and 20261014000001, so the live database ends up matching the repo. Not
-- covered by SQL: email confirmation is off; switch it on under Authentication
-- -> Sign In / Providers -> Email -> "Confirm email".

begin;

-- ===========================================================================
-- Block 1. The hub tables (items, item_events, item_photos, item_counters,
-- staff, partners, institutions, repair_jobs, consignments, handovers,
-- submissions), with their types, triggers and Row Level Security.
--
-- What it does: creates the staff hub's tables, which exist in the repo but not
-- live. Each table has RLS on: only hub staff can read or change them, and
-- visitors see only items on sale, without buy prices or sources. Nothing that
-- exists is changed; the live is_admin() is replaced in block 4.
-- What could break: nothing that runs today. The hub still stores data in each
-- browser until it is switched to Supabase.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regtype('public.grade') is null then
    create type public.grade as enum ('A', 'B', 'C', 'D');
  end if;
end $$;
do $$ begin
  if to_regtype('public.item_category') is null then
    create type public.item_category as enum ('phone', 'laptop', 'desktop', 'monitor', 'tv', 'printer', 'ups', 'small_appliance', 'accessory', 'part');
  end if;
end $$;
do $$ begin
  if to_regtype('public.part_type') is null then
    create type public.part_type as enum ('screen', 'board', 'ram', 'storage', 'battery', 'charger', 'motor', 'other');
  end if;
end $$;
do $$ begin
  if to_regtype('public.source_type') is null then
    create type public.source_type as enum ('repair_shop', 'retailer', 'institution', 'household', 'stripped');
  end if;
end $$;
do $$ begin
  if to_regtype('public.item_status') is null then
    create type public.item_status as enum ('received', 'graded', 'out_for_repair', 'stripping', 'listed', 'reserved', 'sold', 'in_scrap_cage', 'handed_over', 'stripped');
  end if;
end $$;
do $$ begin
  if to_regtype('public.buy_mode') is null then
    create type public.buy_mode as enum ('cash', 'consignment', 'free');
  end if;
end $$;
do $$ begin
  if to_regtype('public.fulfilment') is null then
    create type public.fulfilment as enum ('pickup', 'delivery_jammu', 'ship_india');
  end if;
end $$;
do $$ begin
  if to_regtype('public.wipe_method') is null then
    create type public.wipe_method as enum ('reset_overwrite', 'drive_wipe', 'drilled');
  end if;
end $$;
do $$ begin
  if to_regtype('public.partner_type') is null then
    create type public.partner_type as enum ('repair_shop', 'retailer');
  end if;
end $$;
do $$ begin
  if to_regtype('public.partner_status') is null then
    create type public.partner_status as enum ('lead', 'active', 'paused');
  end if;
end $$;
do $$ begin
  if to_regtype('public.institution_type') is null then
    create type public.institution_type as enum ('college', 'school', 'bank', 'office', 'other');
  end if;
end $$;
do $$ begin
  if to_regtype('public.submission_kind') is null then
    create type public.submission_kind as enum ('shop_partner', 'institution_pickup', 'household_dropoff', 'consignment', 'reservation');
  end if;
end $$;
do $$ begin
  if to_regtype('public.submission_status') is null then
    create type public.submission_status as enum ('new', 'contacted', 'done');
  end if;
end $$;
do $$ begin
  if to_regtype('public.consignment_status') is null then
    create type public.consignment_status as enum ('active', 'sold', 'payout_due', 'paid', 'returned');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies can call these without tripping staff's own RLS.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Who we collect from
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  type public.partner_type not null,
  name text not null check (char_length(name) between 2 and 80),
  owner text not null default '',
  phone text not null check (char_length(phone) between 6 and 20),
  market text not null default '',
  route_day text not null default '' check (route_day in ('', 'tue', 'fri')),
  is_repair_partner boolean not null default false,
  status public.partner_status not null default 'lead',
  joined_at timestamptz not null default now(),
  notes text not null default ''
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type public.institution_type not null,
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  is_anchor boolean not null default false,
  notes text not null default ''
);

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------
-- One counter per hub, so tags stay unique even with several staff devices.
create table if not exists public.item_counters (
  hub_code text primary key check (hub_code ~ '^[A-Z]{3}$'),
  last_number integer not null default 0
);
insert into public.item_counters (hub_code) values ('JMU') on conflict do nothing;

create table if not exists public.items (
  id text primary key check (id ~ '^RL-[A-Z]{3}-[0-9]{4,}$'),
  received_at timestamptz not null default now(),
  source_type public.source_type not null,
  partner_id uuid references public.partners (id) on delete set null,
  institution_id uuid references public.institutions (id) on delete set null,
  source_name text not null default '',
  category public.item_category not null,
  part_type public.part_type,
  brand text not null default '' check (char_length(brand) <= 40),
  model text not null default '' check (char_length(model) <= 80),
  description text not null default '' check (char_length(description) <= 2000),
  has_battery boolean not null default false,
  weight_kg numeric(7, 2) check (weight_kg >= 0),
  grade public.grade,
  graded_at timestamptz,
  checklist jsonb not null default '{}',
  faults text not null default '',
  wipe_required boolean not null default false,
  wipe_method public.wipe_method,
  wiped_at timestamptz,
  rack text not null default '',
  buy_mode public.buy_mode not null,
  buy_paise bigint not null default 0 check (buy_paise >= 0),
  expected_resale_paise bigint check (expected_resale_paise >= 0),
  list_paise bigint check (list_paise > 0),
  current_paise bigint check (current_paise > 0),
  price_cut_at timestamptz,
  status public.item_status not null default 'received',
  listed_at timestamptz,
  sold_at timestamptz,
  sold_paise bigint check (sold_paise >= 0),
  fulfilment public.fulfilment,
  parent_id text references public.items (id) on delete set null,
  handover_id uuid,
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),

  constraint part_needs_type check ((category = 'part') = (part_type is not null)),
  -- Anything on sale has a sellable grade, a price and a listing date.
  constraint listed_items_are_sellable check (
    status not in ('listed', 'reserved')
    or (grade in ('A', 'B', 'C') and current_paise is not null and listed_at is not null)
  ),
  -- Grade C is sold as parts only; whole C devices are stripped instead.
  constraint grade_c_sold_as_parts check (status not in ('listed', 'reserved') or grade <> 'C' or category = 'part'),
  -- Phones, laptops, desktops and drives are wiped before they are sold.
  constraint wiped_before_listing check (
    status not in ('listed', 'reserved', 'sold') or not wipe_required or wiped_at is not null
  ),
  constraint graded_after_intake check (status = 'received' or grade is not null)
);
create index if not exists items_status_idx on public.items (status);
create index if not exists items_listed_idx on public.items (listed_at desc) where status = 'listed';
create index if not exists items_partner_idx on public.items (partner_id);
create index if not exists items_institution_idx on public.items (institution_id);

create table if not exists public.item_events (
  id bigint generated always as identity primary key,
  item_id text not null references public.items (id) on delete cascade,
  at timestamptz not null default now(),
  type text not null,
  note text not null default '',
  actor uuid default auth.uid()
);
create index if not exists item_events_item_idx on public.item_events (item_id, at);

create table if not exists public.item_photos (
  item_id text not null references public.items (id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  storage_path text not null unique,
  primary key (item_id, position)
);

create table if not exists public.repair_jobs (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  fault text not null default '',
  fee_paise bigint not null default 0 check (fee_paise >= 0),
  sent_at timestamptz not null default now(),
  returned_at timestamptz,
  outcome text check (outcome in ('fixed', 'not_fixable'))
);
create index if not exists repair_jobs_item_idx on public.repair_jobs (item_id);

create table if not exists public.consignments (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items (id) on delete cascade,
  consignor_name text not null,
  phone text not null,
  -- Consignment is offered only for items worth more than ₹10,000.
  agreed_paise bigint not null check (agreed_paise > 1000000),
  seller_share numeric(3, 2) not null default 0.70 check (seller_share > 0 and seller_share < 1),
  started_at timestamptz not null default now(),
  status public.consignment_status not null default 'active',
  payout_paise bigint check (payout_paise >= 0)
);
create index if not exists consignments_item_idx on public.consignments (item_id);

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  recycler text not null check (char_length(recycler) between 2 and 120),
  on_behalf_of text,
  kg_by_category jsonb not null default '{}',
  battery_kg numeric(7, 2) not null default 0 check (battery_kg >= 0),
  item_ids text[] not null default '{}',
  receipt_no text not null check (char_length(receipt_no) between 1 and 60),
  rate_per_kg_paise bigint check (rate_per_kg_paise >= 0),
  amount_paise bigint check (amount_paise >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_handover_fk') then
    alter table public.items
      add constraint items_handover_fk foreign key (handover_id) references public.handovers (id) on delete set null;
  end if;
end $$;

-- Public "Sell to us" and reservation requests.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind public.submission_kind not null,
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and pg_column_size(fields) < 8000),
  status public.submission_status not null default 'new',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Assigns the next RL-JMU-0001 tag atomically and flags items needing a data wipe.
create or replace function public.assign_item_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.id is null or new.id = '' then
    update public.item_counters set last_number = last_number + 1 where hub_code = 'JMU'
      returning last_number into n;
    new.id := 'RL-JMU-' || lpad(n::text, 4, '0');
  end if;
  new.wipe_required := coalesce(new.wipe_required, false)
    or new.category in ('phone', 'laptop', 'desktop')
    or (new.category = 'part' and new.part_type is not distinct from 'storage');
  if new.grade is not null then
    new.graded_at := coalesce(new.graded_at, now());
    if new.status = 'received' then
      new.status := 'graded';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger items_assign_id before insert on public.items
  for each row execute function public.assign_item_id();

create or replace function public.touch_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.grade is not null and old.grade is null then
    new.graded_at := coalesce(new.graded_at, now());
  end if;
  -- The listing date is kept when an item is re-listed, so the 45/75-day
  -- clock is not reset by taking it off sale and back.
  if new.status = 'listed' and new.listed_at is null then
    new.listed_at := now();
  end if;
  if new.status = 'sold' and old.status <> 'sold' then
    new.sold_at := coalesce(new.sold_at, now());
    new.sold_paise := coalesce(new.sold_paise, new.current_paise);
  end if;
  return new;
end;
$$;

create or replace trigger items_touch before update on public.items
  for each row execute function public.touch_item();

-- Every grade, status and price change is logged against the tag.
create or replace function public.log_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.item_events (item_id, type, note)
    values (new.id, 'received', 'From ' || replace(new.source_type::text, '_', ' '));
    return null;
  end if;
  if new.grade is distinct from old.grade then
    insert into public.item_events (item_id, type, note) values (new.id, 'graded', 'Grade ' || new.grade);
  end if;
  if new.status is distinct from old.status then
    insert into public.item_events (item_id, type) values (new.id, 'status:' || new.status);
  end if;
  if new.current_paise is distinct from old.current_paise and old.current_paise is not null then
    insert into public.item_events (item_id, type, note)
    values (new.id, 'price_changed', (old.current_paise / 100)::text || ' → ' || (new.current_paise / 100)::text);
  end if;
  return null;
end;
$$;

create or replace trigger items_log after insert or update on public.items
  for each row execute function public.log_item_change();

-- Recording a handover marks the included scrap-cage items as handed over.
create or replace function public.apply_handover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.items
     set status = 'handed_over', handover_id = new.id
   where id = any (new.item_ids) and status = 'in_scrap_cage';
  return null;
end;
$$;

create or replace trigger handovers_apply after insert on public.handovers
  for each row execute function public.apply_handover();

-- Requests from the public always start as new.
create or replace function public.protect_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_staff() then
    new.status := 'new';
    new.created_at := now();
  end if;
  return new;
end;
$$;

create or replace trigger submissions_protect before insert on public.submissions
  for each row execute function public.protect_submission();

-- ---------------------------------------------------------------------------
-- The plan's unsold-stock rules, counted from the listing date.
-- Schedule daily with pg_cron (Supabase → Integrations → Cron):
--   select cron.schedule('reloop-stock-rules', '0 1 * * *', 'select public.apply_stock_rules()');
-- ---------------------------------------------------------------------------
create or replace function public.apply_stock_rules(now_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  downgraded integer;
  cut integer;
begin
  -- Day 75: whole devices are downgraded to C and stripped for parts.
  update public.items
     set grade = 'C', status = 'stripping'
   where status = 'listed' and category <> 'part' and grade <> 'C'
     and listed_at <= now_at - interval '75 days';
  get diagnostics downgraded = row_count;

  -- Day 45: price cut by 20%, once, rounded to the nearest ₹10.
  update public.items
     set current_paise = round(current_paise * 0.80 / 1000) * 1000, price_cut_at = now_at
   where status = 'listed' and price_cut_at is null
     and listed_at <= now_at - interval '45 days';
  get diagnostics cut = row_count;

  return downgraded + cut;
end;
$$;
revoke execute on function public.apply_stock_rules(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security and grants
-- ---------------------------------------------------------------------------
alter table public.staff enable row level security;
alter table public.partners enable row level security;
alter table public.institutions enable row level security;
alter table public.item_counters enable row level security;
alter table public.items enable row level security;
alter table public.item_events enable row level security;
alter table public.item_photos enable row level security;
alter table public.repair_jobs enable row level security;
alter table public.consignments enable row level security;
alter table public.handovers enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "Staff read staff" on public.staff;
create policy "Staff read staff" on public.staff for select to authenticated
  using ((select public.is_staff()));
drop policy if exists "Admins manage staff" on public.staff;
create policy "Admins manage staff" on public.staff for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Staff manage partners" on public.partners;
create policy "Staff manage partners" on public.partners for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff manage institutions" on public.institutions;
create policy "Staff manage institutions" on public.institutions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff manage items" on public.items;
create policy "Staff manage items" on public.items for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff read item history" on public.item_events;
create policy "Staff read item history" on public.item_events for select to authenticated
  using ((select public.is_staff()));
drop policy if exists "Staff manage repairs" on public.repair_jobs;
create policy "Staff manage repairs" on public.repair_jobs for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff manage consignments" on public.consignments;
create policy "Staff manage consignments" on public.consignments for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff manage handovers" on public.handovers;
create policy "Staff manage handovers" on public.handovers for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "Staff manage photos" on public.item_photos;
create policy "Staff manage photos" on public.item_photos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- The public sees stock on sale only.
drop policy if exists "Anyone reads stock on sale" on public.items;
create policy "Anyone reads stock on sale" on public.items for select to anon
  using (status in ('listed', 'reserved'));
drop policy if exists "Anyone sees photos of stock on sale" on public.item_photos;
create policy "Anyone sees photos of stock on sale" on public.item_photos for select to anon
  using (exists (select 1 from public.items i where i.id = item_id and i.status in ('listed', 'reserved')));

-- ...and only its public columns: never buy prices, sources or notes.
revoke all on public.items from anon;
grant select (id, category, part_type, grade, brand, model, description, checklist, wipe_required, wiped_at,
              list_paise, current_paise, price_cut_at, status, listed_at)
  on public.items to anon;

-- Anyone can send a request; only staff can read or change them.
drop policy if exists "Anyone sends a request" on public.submissions;
create policy "Anyone sends a request" on public.submissions for insert to anon, authenticated
  with check (true);
drop policy if exists "Staff manage requests" on public.submissions;
create policy "Staff manage requests" on public.submissions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
revoke all on public.submissions from anon;
grant insert on public.submissions to anon;

-- Counters are only touched by the SECURITY DEFINER ID trigger.
revoke all on public.item_counters from anon, authenticated;

-- ===========================================================================
-- Block 2. The item-photos storage bucket.
--
-- What it does: adds a public bucket for hub item photos (2 MB, JPEG/PNG/WebP).
-- Anyone can view them; only hub staff can upload or delete.
-- What could break: nothing; the existing Images bucket is not touched here.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Item photos are publicly readable" on storage.objects;
create policy "Item photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-photos');

drop policy if exists "Staff upload item photos" on storage.objects;
create policy "Staff upload item photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (select public.is_staff()));

drop policy if exists "Staff delete item photos" on storage.objects;
create policy "Staff delete item photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (select public.is_staff()));

-- ===========================================================================
-- Block 3. Supplier and payment details on hub items.
--
-- What it does: adds who sold each item to ReLoop and how they were paid.
-- What could break: nothing; the columns are new and have defaults.
-- ===========================================================================

alter table public.items
  add column if not exists source_contact_name text not null default '',
  add column if not exists source_phone text not null default '',
  add column if not exists purchase_payment_method text not null default 'not_paid',
  add column if not exists purchase_reference text not null default '',
  add column if not exists purchase_paid_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_purchase_payment_method_check'
  ) then
    alter table public.items
      add constraint items_purchase_payment_method_check
      check (purchase_payment_method in ('cash', 'upi', 'bank_transfer', 'other', 'not_paid'));
  end if;
end $$;

-- ===========================================================================
-- Block 4. Security fixes and optional GSTIN (repo migration 20261014000001).
--
-- What it does, step by step (each step has its own comment below):
--   a. Listings: hides purchase_cost, processing_cost and internal_notes from
--      visitors and signed-in users. Could break: any API screen that reads
--      those costs with the public key (none exists; the dashboard is fine).
--   b. Shop submissions: removes the policy that let any signed-in shop owner,
--      including unverified ones, insert rows directly with any status or
--      price, and hides internal notes from owners. Could break: nothing; the
--      site submits through its server route, which uses the service-role key.
--   c. Orders and enquiries: stops anonymous inserts. Could break: nothing on
--      the current site; a future checkout or enquiry form needs a new policy.
--   d. Grants: removes visitor access to account and back-office tables, and
--      TRUNCATE/TRIGGER/REFERENCES from the API roles. Could break: nothing.
--   e. is_admin(): one check for admin_users and hub admins. Could break: any
--      hub staff member with the admin role also becomes a marketplace admin.
--   f. Shop verification guard: only an admin or the dashboard can change
--      verification_status, verified_at, reviewed_by or review_notes.
--      Could break: nothing; owners can't update their row today anyway.
--   g. Sign-up: GSTIN becomes optional, checked only when given. Could break:
--      nothing for existing accounts; new shop owners may now have no GSTIN.
--   h. Trigger functions can no longer be called through the API.
--   i. Storage buckets: stay public, limited to 5 MB JPEG/PNG/WebP (smaller
--      limits are kept). Could break: uploading a larger photo, or another
--      format, such as a PDF or HEIC photo straight from an iPhone.
-- ===========================================================================

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

-- Storage buckets (the public Images bucket for listing photos, and
-- item-photos): stay public, but every upload is at most 5 MB and a JPEG, PNG
-- or WebP image. A bucket that already has a smaller limit keeps it.
update storage.buckets
   set file_size_limit = least(coalesce(file_size_limit, 5242880), 5242880),
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where file_size_limit is null
    or file_size_limit > 5242880
    or allowed_mime_types is null
    or not (allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']);

-- ===========================================================================
-- Block 5. Checks (read-only).
--
-- What it does: one SELECT that lists every hole from the security report with
-- ok = true once it is closed. The SQL Editor shows this table. Then a guard
-- cancels the whole script (nothing is changed) if any check is false, with
-- the failed checks in the error message. The same SELECT is in
-- supabase-fixes/2026-10-14-checks.sql to re-run at any time.
-- What could break: nothing; it only reads.
-- ===========================================================================

select check_name, ok
  from (values
    (1,  'Visitors can still read listing titles and prices (the shop works)',
         has_column_privilege('anon', 'public.listings', 'title', 'SELECT')
         and has_column_privilege('anon', 'public.listings', 'price', 'SELECT')),
    (2,  'Visitors cannot read listing purchase_cost, processing_cost or internal_notes',
         not has_column_privilege('anon', 'public.listings', 'purchase_cost', 'SELECT')
         and not has_column_privilege('anon', 'public.listings', 'processing_cost', 'SELECT')
         and not has_column_privilege('anon', 'public.listings', 'internal_notes', 'SELECT')),
    (3,  'Signed-in users cannot read listing purchase_cost, processing_cost or internal_notes',
         not has_column_privilege('authenticated', 'public.listings', 'purchase_cost', 'SELECT')
         and not has_column_privilege('authenticated', 'public.listings', 'processing_cost', 'SELECT')
         and not has_column_privilege('authenticated', 'public.listings', 'internal_notes', 'SELECT')),
    (4,  'Shop owners (verified or not) cannot insert submissions directly',
         not has_table_privilege('authenticated', 'public.shop_submissions', 'INSERT')
         and not has_table_privilege('anon', 'public.shop_submissions', 'INSERT')
         and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_submissions'
                           and cmd in ('INSERT', 'ALL') and roles && array['anon', 'authenticated']::name[])),
    (5,  'Shop owners cannot read internal notes on their submissions',
         not has_column_privilege('authenticated', 'public.shop_submissions', 'internal_notes', 'SELECT')),
    (6,  'Visitors cannot create orders or enquiries',
         not has_table_privilege('anon', 'public.orders', 'INSERT')
         and not has_table_privilege('anon', 'public.enquiries', 'INSERT')
         and not exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('orders', 'enquiries')
                           and cmd in ('INSERT', 'ALL') and roles && array['anon']::name[])),
    (7,  'Visitors cannot change or delete orders or enquiries',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('orders', 'enquiries')
                       and cmd in ('UPDATE', 'DELETE', 'ALL') and roles && array['anon']::name[])),
    (8,  'Shop verification is guarded by a trigger',
         exists (select 1 from pg_trigger where tgname = 'shop_owners_protect_verification'
                   and tgrelid = 'public.shop_owners'::regclass)),
    (9,  'Sign-up accepts shop owners without a GSTIN',
         exists (select 1 from pg_proc where proname = 'handle_new_reloop_user'
                   and prosrc like '%supplied_gstin is not null and%')),
    (10, 'Trigger functions cannot be called through the API',
         not has_function_privilege('anon', 'public.handle_new_reloop_user()', 'EXECUTE')
         and not has_function_privilege('authenticated', 'public.handle_new_reloop_user()', 'EXECUTE')),
    (11, 'No API role has TRUNCATE on any public table',
         not exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
                       and (has_table_privilege('anon', oid, 'TRUNCATE')
                            or has_table_privilege('authenticated', oid, 'TRUNCATE')))),
    (12, 'Every storage bucket allows at most 5 MB of JPEG, PNG or WebP',
         not exists (select 1 from storage.buckets
                      where file_size_limit is null or file_size_limit > 5242880 or allowed_mime_types is null
                         or not (allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']))),
    (13, 'The 11 hub tables exist, each with Row Level Security on',
         (select count(*) from pg_class
           where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity
             and relname in ('items', 'item_events', 'item_photos', 'item_counters', 'staff', 'partners',
                             'institutions', 'repair_jobs', 'consignments', 'handovers', 'submissions')) = 11)
  ) as c(n, check_name, ok)
 order by n;

do $$
declare
  failed text;
begin
  select string_agg(check_name, '; ') into failed
    from (select check_name, ok
  from (values
    (1,  'Visitors can still read listing titles and prices (the shop works)',
         has_column_privilege('anon', 'public.listings', 'title', 'SELECT')
         and has_column_privilege('anon', 'public.listings', 'price', 'SELECT')),
    (2,  'Visitors cannot read listing purchase_cost, processing_cost or internal_notes',
         not has_column_privilege('anon', 'public.listings', 'purchase_cost', 'SELECT')
         and not has_column_privilege('anon', 'public.listings', 'processing_cost', 'SELECT')
         and not has_column_privilege('anon', 'public.listings', 'internal_notes', 'SELECT')),
    (3,  'Signed-in users cannot read listing purchase_cost, processing_cost or internal_notes',
         not has_column_privilege('authenticated', 'public.listings', 'purchase_cost', 'SELECT')
         and not has_column_privilege('authenticated', 'public.listings', 'processing_cost', 'SELECT')
         and not has_column_privilege('authenticated', 'public.listings', 'internal_notes', 'SELECT')),
    (4,  'Shop owners (verified or not) cannot insert submissions directly',
         not has_table_privilege('authenticated', 'public.shop_submissions', 'INSERT')
         and not has_table_privilege('anon', 'public.shop_submissions', 'INSERT')
         and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_submissions'
                           and cmd in ('INSERT', 'ALL') and roles && array['anon', 'authenticated']::name[])),
    (5,  'Shop owners cannot read internal notes on their submissions',
         not has_column_privilege('authenticated', 'public.shop_submissions', 'internal_notes', 'SELECT')),
    (6,  'Visitors cannot create orders or enquiries',
         not has_table_privilege('anon', 'public.orders', 'INSERT')
         and not has_table_privilege('anon', 'public.enquiries', 'INSERT')
         and not exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('orders', 'enquiries')
                           and cmd in ('INSERT', 'ALL') and roles && array['anon']::name[])),
    (7,  'Visitors cannot change or delete orders or enquiries',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('orders', 'enquiries')
                       and cmd in ('UPDATE', 'DELETE', 'ALL') and roles && array['anon']::name[])),
    (8,  'Shop verification is guarded by a trigger',
         exists (select 1 from pg_trigger where tgname = 'shop_owners_protect_verification'
                   and tgrelid = 'public.shop_owners'::regclass)),
    (9,  'Sign-up accepts shop owners without a GSTIN',
         exists (select 1 from pg_proc where proname = 'handle_new_reloop_user'
                   and prosrc like '%supplied_gstin is not null and%')),
    (10, 'Trigger functions cannot be called through the API',
         not has_function_privilege('anon', 'public.handle_new_reloop_user()', 'EXECUTE')
         and not has_function_privilege('authenticated', 'public.handle_new_reloop_user()', 'EXECUTE')),
    (11, 'No API role has TRUNCATE on any public table',
         not exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
                       and (has_table_privilege('anon', oid, 'TRUNCATE')
                            or has_table_privilege('authenticated', oid, 'TRUNCATE')))),
    (12, 'Every storage bucket allows at most 5 MB of JPEG, PNG or WebP',
         not exists (select 1 from storage.buckets
                      where file_size_limit is null or file_size_limit > 5242880 or allowed_mime_types is null
                         or not (allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']))),
    (13, 'The 11 hub tables exist, each with Row Level Security on',
         (select count(*) from pg_class
           where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity
             and relname in ('items', 'item_events', 'item_photos', 'item_counters', 'staff', 'partners',
                             'institutions', 'repair_jobs', 'consignments', 'handovers', 'submissions')) = 11)
  ) as c(n, check_name, ok)
 order by n) as checks
   where not ok;
  if failed is not null then
    raise exception 'ReLoop fix checks failed, so nothing was changed: %', failed;
  end if;
end $$;

commit;
