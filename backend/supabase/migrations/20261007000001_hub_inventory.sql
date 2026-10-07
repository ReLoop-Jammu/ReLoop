-- ReLoop hub inventory, following the Business Plan (ADR 0004):
-- ReLoop buys items, tags each one (RL-JMU-0001), grades it A–D at one hub,
-- then resells, repairs, strips for parts or hands it to an authorised
-- recycler. Staff do all writes; the public reads only stock on sale.
-- Money is integer paise. Every table has Row Level Security on.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.grade as enum ('A', 'B', 'C', 'D');
create type public.item_category as enum
  ('phone', 'laptop', 'desktop', 'monitor', 'tv', 'printer', 'ups', 'small_appliance', 'accessory', 'part');
create type public.part_type as enum ('screen', 'board', 'ram', 'storage', 'battery', 'charger', 'motor', 'other');
create type public.source_type as enum ('repair_shop', 'retailer', 'institution', 'household', 'stripped');
create type public.item_status as enum
  ('received', 'graded', 'out_for_repair', 'stripping', 'listed', 'reserved', 'sold', 'in_scrap_cage', 'handed_over', 'stripped');
create type public.buy_mode as enum ('cash', 'consignment', 'free');
create type public.fulfilment as enum ('pickup', 'delivery_jammu', 'ship_india');
create type public.wipe_method as enum ('reset_overwrite', 'drive_wipe', 'drilled');
create type public.partner_type as enum ('repair_shop', 'retailer');
create type public.partner_status as enum ('lead', 'active', 'paused');
create type public.institution_type as enum ('college', 'school', 'bank', 'office', 'other');
create type public.submission_kind as enum
  ('shop_partner', 'institution_pickup', 'household_dropoff', 'consignment', 'reservation');
create type public.submission_status as enum ('new', 'contacted', 'done');
create type public.consignment_status as enum ('active', 'sold', 'payout_due', 'paid', 'returned');

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies can call these without tripping staff's own RLS.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Who we collect from
-- ---------------------------------------------------------------------------
create table public.partners (
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

create table public.institutions (
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
create table public.item_counters (
  hub_code text primary key check (hub_code ~ '^[A-Z]{3}$'),
  last_number integer not null default 0
);
insert into public.item_counters (hub_code) values ('JMU');

create table public.items (
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
create index items_status_idx on public.items (status);
create index items_listed_idx on public.items (listed_at desc) where status = 'listed';
create index items_partner_idx on public.items (partner_id);
create index items_institution_idx on public.items (institution_id);

create table public.item_events (
  id bigint generated always as identity primary key,
  item_id text not null references public.items (id) on delete cascade,
  at timestamptz not null default now(),
  type text not null,
  note text not null default '',
  actor uuid default auth.uid()
);
create index item_events_item_idx on public.item_events (item_id, at);

create table public.item_photos (
  item_id text not null references public.items (id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  storage_path text not null unique,
  primary key (item_id, position)
);

create table public.repair_jobs (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items (id) on delete cascade,
  partner_id uuid not null references public.partners (id),
  fault text not null default '',
  fee_paise bigint not null default 0 check (fee_paise >= 0),
  sent_at timestamptz not null default now(),
  returned_at timestamptz,
  outcome text check (outcome in ('fixed', 'not_fixable'))
);
create index repair_jobs_item_idx on public.repair_jobs (item_id);

create table public.consignments (
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
create index consignments_item_idx on public.consignments (item_id);

create table public.handovers (
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
alter table public.items
  add constraint items_handover_fk foreign key (handover_id) references public.handovers (id) on delete set null;

-- Public "Sell to us" and reservation requests.
create table public.submissions (
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
create function public.assign_item_id()
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

create trigger items_assign_id before insert on public.items
  for each row execute function public.assign_item_id();

create function public.touch_item()
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

create trigger items_touch before update on public.items
  for each row execute function public.touch_item();

-- Every grade, status and price change is logged against the tag.
create function public.log_item_change()
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

create trigger items_log after insert or update on public.items
  for each row execute function public.log_item_change();

-- Recording a handover marks the included scrap-cage items as handed over.
create function public.apply_handover()
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

create trigger handovers_apply after insert on public.handovers
  for each row execute function public.apply_handover();

-- Requests from the public always start as new.
create function public.protect_submission()
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

create trigger submissions_protect before insert on public.submissions
  for each row execute function public.protect_submission();

-- ---------------------------------------------------------------------------
-- The plan's unsold-stock rules, counted from the listing date.
-- Schedule daily with pg_cron (Supabase → Integrations → Cron):
--   select cron.schedule('reloop-stock-rules', '0 1 * * *', 'select public.apply_stock_rules()');
-- ---------------------------------------------------------------------------
create function public.apply_stock_rules(now_at timestamptz default now())
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

create policy "Staff read staff" on public.staff for select to authenticated
  using ((select public.is_staff()));
create policy "Admins manage staff" on public.staff for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Staff manage partners" on public.partners for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff manage institutions" on public.institutions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff manage items" on public.items for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff read item history" on public.item_events for select to authenticated
  using ((select public.is_staff()));
create policy "Staff manage repairs" on public.repair_jobs for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff manage consignments" on public.consignments for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff manage handovers" on public.handovers for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "Staff manage photos" on public.item_photos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- The public sees stock on sale only.
create policy "Anyone reads stock on sale" on public.items for select to anon
  using (status in ('listed', 'reserved'));
create policy "Anyone sees photos of stock on sale" on public.item_photos for select to anon
  using (exists (select 1 from public.items i where i.id = item_id and i.status in ('listed', 'reserved')));

-- ...and only its public columns: never buy prices, sources or notes.
revoke all on public.items from anon;
grant select (id, category, part_type, grade, brand, model, description, checklist, wipe_required, wiped_at,
              list_paise, current_paise, price_cut_at, status, listed_at)
  on public.items to anon;

-- Anyone can send a request; only staff can read or change them.
create policy "Anyone sends a request" on public.submissions for insert to anon, authenticated
  with check (true);
create policy "Staff manage requests" on public.submissions for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
revoke all on public.submissions from anon;
grant insert on public.submissions to anon;

-- Counters are only touched by the SECURITY DEFINER ID trigger.
revoke all on public.item_counters from anon, authenticated;
