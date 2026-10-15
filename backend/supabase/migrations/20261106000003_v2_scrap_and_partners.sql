-- Business Plan v2, step 2 (batch 15b): scrap by weight, bins, partners, receipts,
-- institution lots, ownership and wipe-before-strip. Money here is only the
-- public rate card (settings rate_card.*) and what was actually paid.
--
--   * scrap_weighins: what a shop handed over at a pickup, by rate-card category,
--     with a snapshot of the rates used. Paid by UPI with a receipt.
--   * scrap_ledger: running kg per bin (screens, boards, other, D devices,
--     batteries), emptied by handovers to the dismantling partner.
--   * payouts have exactly one source (lot, weigh-in, exchange sale, institution lot).
--   * institution_lots: Rs 3,000-a-lot pickups; dead e-waste is recorded as a
--     handover on the institution's behalf and never enters the bins.

-- ---------------------------------------------------------------------------
-- 1. Partners are linked to shop accounts
-- ---------------------------------------------------------------------------
alter table public.partners
  add column if not exists shop_owner_id uuid unique references public.shop_owners (id) on delete set null,
  add column if not exists label text not null default '' check (char_length(label) <= 40);

-- ---------------------------------------------------------------------------
-- 2. Receipt numbers for the new documents
-- ---------------------------------------------------------------------------
create table if not exists public.receipt_counters (
  prefix text not null check (prefix ~ '^[A-Z]{3}$'),
  year integer not null,
  last_number integer not null default 0,
  primary key (prefix, year)
);
alter table public.receipt_counters enable row level security;
revoke all on public.receipt_counters from anon, authenticated;

create or replace function public.next_receipt_no(p_prefix text, p_year integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into public.receipt_counters (prefix, year, last_number) values (p_prefix, p_year, 1)
  on conflict (prefix, year) do update set last_number = public.receipt_counters.last_number + 1
  returning last_number into v_n;
  return 'RL-' || p_prefix || '-' || p_year || '-' || lpad(v_n::text, 4, '0');
end;
$$;
revoke execute on function public.next_receipt_no(text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ownership declarations and the cutoff settings
-- ---------------------------------------------------------------------------
-- Two staff-readable switches, null until launch: from this date a device must
-- come with the seller's ownership tick, and a device must be wiped before it
-- is stripped. A local session sets them (scripts/finish-v1-local.md).
insert into public.app_settings (key, value, is_public) values
  ('ownership.required_from', 'null', false),
  ('wipe.strip_required_from', 'null', false)
on conflict (key) do nothing;

create or replace function public.setting_type(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'contact.whatsapp' then 'string'
    when 'contact.phone' then 'string'
    when 'contact.email' then 'string'
    when 'contact.hours' then 'string'
    when 'hub.address' then 'string'
    when 'hub.opens' then 'string'
    when 'categories.info' then 'object'
    when 'categories.weight_kg' then 'object'
    when 'accept.take' then 'array'
    when 'accept.dont' then 'array'
    when 'pricing.grade_b_factor' then 'number'
    when 'pricing.reference_fresh_days' then 'number'
    when 'pricing.handling_paise' then 'object'
    when 'route.markets' then 'object'
    when 'rate_card.screens_paise' then 'number'
    when 'rate_card.batteries_paise' then 'number'
    when 'rate_card.boards_paise' then 'number'
    when 'rate_card.other_paise' then 'number'
    when 'rate_card.as_of' then 'string'
    when 'rate_card.commission_pct' then 'number'
    when 'institution.lot_fee_paise' then 'number'
    when 'capacity.device_rack_slots' then 'number'
    when 'vrg.rates_paise' then 'object'
    when 'finance.scrap_spread_paise_per_kg' then 'number'
    when 'finance.device_unit_paise' then 'number'
    when 'finance.parts_target_monthly_paise' then 'number'
    when 'finance.fixed_costs_monthly_paise' then 'number'
    when 'finance.setup_costs_paise' then 'number'
    when 'ownership.required_from' then 'string'
    when 'wipe.strip_required_from' then 'string'
  end;
$$;
revoke execute on function public.setting_type(text) from public, anon, authenticated;

-- The institution lot fee (a published term, shown on /sell/institutions).
insert into public.app_settings (key, value, is_public) values ('institution.lot_fee_paise', '300000', true)
on conflict (key) do nothing;

-- A date setting is either empty or a valid ISO date.
create or replace function public.cutoff_date(p_key text)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case when jsonb_typeof(value) = 'string' and (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$'
              then (value #>> '{}')::date end
    from public.app_settings where key = p_key;
$$;
revoke execute on function public.cutoff_date(text) from public, anon, authenticated;

create table if not exists public.ownership_declarations (
  id uuid primary key default gen_random_uuid(),
  confirmed_at timestamptz not null default now(),
  -- The wording the seller agreed to, by version (the text lives in the app).
  declaration_version text not null default 'v1' check (char_length(declaration_version) between 1 and 20),
  -- Seller: the shop or institution name as written on the receipt. No details
  -- of any original owner are kept.
  seller_label text not null check (char_length(seller_label) between 2 and 120),
  partner_id uuid references public.partners (id) on delete set null,
  tags text[] not null default '{}',
  -- The staff member who was present.
  staff_id uuid references auth.users (id) on delete set null default auth.uid(),
  shop_submission_id bigint references public.shop_submissions (id) on delete set null,
  note text not null default '' check (char_length(note) <= 300)
);
alter table public.ownership_declarations enable row level security;
revoke all on public.ownership_declarations from anon, authenticated;
grant select on public.ownership_declarations to authenticated;
drop policy if exists "Staff read ownership declarations" on public.ownership_declarations;
create policy "Staff read ownership declarations" on public.ownership_declarations for select to authenticated
  using ((select public.is_staff()));

alter table public.items
  add column if not exists ownership_confirmed_at timestamptz,
  add column if not exists ownership_confirmed_by uuid references auth.users (id) on delete set null,
  add column if not exists locked_device boolean not null default false,
  add column if not exists weighin_id uuid;
-- A locked device is stripped or scrapped, never resold whole.
alter table public.items drop constraint if exists locked_never_resold_whole;
alter table public.items add constraint locked_never_resold_whole
  check (not locked_device or grade is null or grade in ('C', 'D'));
grant update (locked_device) on public.items to authenticated;

create or replace function public.guard_ownership_and_wipe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from date := public.cutoff_date('ownership.required_from');
  v_wipe date := public.cutoff_date('wipe.strip_required_from');
  v_parent record;
begin
  if tg_op = 'INSERT' then
    if new.ownership_confirmed_at is not null then
      new.ownership_confirmed_by := coalesce(new.ownership_confirmed_by, auth.uid());
    end if;
    if v_from is not null and (now() at time zone 'Asia/Kolkata')::date >= v_from
       and new.source_type::text <> 'stripped' and new.ownership_confirmed_at is null then
      raise exception 'The seller must confirm they own the device (or have it signed over) before it is bought';
    end if;
    -- A part is stripped from a device that was wiped first.
    if new.parent_id is not null and v_wipe is not null and (now() at time zone 'Asia/Kolkata')::date >= v_wipe then
      select wipe_required, wiped_at, received_at into v_parent from public.items where id = new.parent_id;
      if found and v_parent.wipe_required and v_parent.wiped_at is null and v_parent.received_at::date >= v_wipe then
        raise exception 'Wipe the device (or destroy its storage) before stripping parts from it';
      end if;
    end if;
  elsif new.status::text = 'stripping' and old.status::text <> 'stripping'
        and v_wipe is not null and new.wipe_required and new.wiped_at is null
        and new.received_at::date >= v_wipe then
    raise exception 'Wipe the device (or destroy its storage) before it is stripped';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_ownership_and_wipe() from public, anon, authenticated;
drop trigger if exists items_guard_ownership_wipe on public.items;
create trigger items_guard_ownership_wipe before insert or update on public.items
  for each row execute function public.guard_ownership_and_wipe();

-- A board or storage chip that was destroyed is never listed.
alter table public.items drop constraint if exists destroyed_storage_not_listed;
alter table public.items add constraint destroyed_storage_not_listed
  check (status::text not in ('listed', 'reserved') or wipe_method is distinct from 'drilled') not valid;

-- Data wipe now also covers boards from phones, laptops and desktops (a board
-- from a monitor holds no personal data); older rows are not changed.
create or replace function public.assign_item_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  v_parent_cat text;
begin
  if new.id is null or new.id = '' then
    update public.item_counters set last_number = last_number + 1 where hub_code = 'JMU'
      returning last_number into n;
    new.id := 'RL-JMU-' || lpad(n::text, 4, '0');
  end if;
  if new.parent_id is not null then
    select category::text into v_parent_cat from public.items where id = new.parent_id;
  end if;
  new.wipe_required := coalesce(new.wipe_required, false)
    or new.category in ('phone', 'laptop', 'desktop')
    or (new.category = 'part' and new.part_type is not distinct from 'storage')
    or (new.category = 'part' and new.part_type is not distinct from 'board'
        and coalesce(v_parent_cat, '') <> 'monitor');
  if new.grade is not null then
    new.graded_at := coalesce(new.graded_at, now());
    if new.status = 'received' then
      new.status := 'graded';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Weigh-ins
-- ---------------------------------------------------------------------------
create table if not exists public.scrap_weighins (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  pickup_id uuid references public.pickups (id) on delete set null,
  weighed_at timestamptz not null default now(),
  screens_kg numeric(8, 2) not null default 0 check (screens_kg >= 0),
  boards_kg numeric(8, 2) not null default 0 check (boards_kg >= 0),
  batteries_kg numeric(8, 2) not null default 0 check (batteries_kg >= 0),
  other_kg numeric(8, 2) not null default 0 check (other_kg >= 0),
  -- The rates used (paise per kg), copied from the rate card at weighing time.
  rates_paise jsonb not null,
  amount_paise bigint not null check (amount_paise >= 0),
  -- Likely-working parts and whole devices left in the "to test" bag: no money yet.
  to_test_count integer not null default 0 check (to_test_count >= 0),
  to_test_note text not null default '' check (char_length(to_test_note) <= 300),
  -- Lot-level declarations the seller ticked.
  ownership_declaration_id uuid references public.ownership_declarations (id) on delete set null,
  swap_declaration boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  constraint weighin_has_something check (screens_kg + boards_kg + batteries_kg + other_kg > 0 or to_test_count > 0),
  constraint weighin_bag_needs_declaration check (to_test_count = 0 or swap_declaration)
);
create index if not exists scrap_weighins_partner_idx on public.scrap_weighins (partner_id, weighed_at desc);
alter table public.items drop constraint if exists items_weighin_fk;
alter table public.items add constraint items_weighin_fk
  foreign key (weighin_id) references public.scrap_weighins (id) on delete set null;

alter table public.scrap_weighins enable row level security;
revoke all on public.scrap_weighins from anon, authenticated;
grant select on public.scrap_weighins to authenticated;
drop policy if exists "Staff read weigh-ins" on public.scrap_weighins;
create policy "Staff read weigh-ins" on public.scrap_weighins for select to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- 5. The kg ledger: running weight per bin
-- ---------------------------------------------------------------------------
create table if not exists public.scrap_ledger (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  bin text not null check (bin in ('screens', 'boards', 'other', 'd_devices', 'batteries')),
  kg numeric(9, 2) not null check (kg <> 0),
  -- weighin: counter weight (the paid weight). reweigh: hub re-weigh difference,
  -- logged and never charged back. device_d: a tagged D device. part_fail: a
  -- tested part that failed. adjustment: staff correction with a note.
  source text not null check (source in ('weighin', 'reweigh', 'device_d', 'part_fail', 'adjustment')),
  weighin_id uuid references public.scrap_weighins (id) on delete set null,
  item_id text references public.items (id) on delete set null,
  -- True when the weight is a labelled estimate for a tagged device with no measured weight.
  estimated boolean not null default false,
  note text not null default '' check (char_length(note) <= 300),
  handover_id uuid references public.handovers (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  constraint ledger_note_for_corrections check (source not in ('reweigh', 'adjustment') or note <> '')
);
create index if not exists scrap_ledger_open_idx on public.scrap_ledger (bin, at) where handover_id is null;
create unique index if not exists scrap_ledger_one_per_device on public.scrap_ledger (item_id)
  where source = 'device_d';

alter table public.scrap_ledger enable row level security;
revoke all on public.scrap_ledger from anon, authenticated;
grant select on public.scrap_ledger to authenticated;
drop policy if exists "Staff read the ledger" on public.scrap_ledger;
create policy "Staff read the ledger" on public.scrap_ledger for select to authenticated
  using ((select public.is_staff()));

-- A tagged device moving to the D devices bin writes its weight to the ledger;
-- leaving the bin before a handover removes the line.
create or replace function public.ledger_for_d_devices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kg numeric;
  v_est boolean := false;
begin
  if new.status::text = 'in_scrap_cage' and (tg_op = 'INSERT' or old.status::text <> 'in_scrap_cage') then
    v_kg := new.weight_kg;
    if v_kg is null or v_kg = 0 then
      select (value ->> new.category::text)::numeric into v_kg
        from public.app_settings where key = 'categories.weight_kg';
      v_kg := coalesce(v_kg, 0.3);
      v_est := true;
    end if;
    insert into public.scrap_ledger (bin, kg, source, item_id, estimated, note)
    values ('d_devices', v_kg, 'device_d', new.id, v_est, case when v_est then 'estimated weight' else '' end)
    on conflict (item_id) where source = 'device_d' do nothing;
  elsif tg_op = 'UPDATE' and old.status::text = 'in_scrap_cage' and new.status::text <> 'handed_over' then
    delete from public.scrap_ledger where item_id = new.id and source = 'device_d' and handover_id is null;
  end if;
  return null;
end;
$$;
revoke execute on function public.ledger_for_d_devices() from public, anon, authenticated;
drop trigger if exists items_ledger_d_devices on public.items;
create trigger items_ledger_d_devices after insert or update of status on public.items
  for each row execute function public.ledger_for_d_devices();

-- ---------------------------------------------------------------------------
-- 6. Handovers: per bin, with weight receipts and staff-only VRRG rates
-- ---------------------------------------------------------------------------
alter table public.handovers
  add column if not exists kind text not null default 'hub' check (kind in ('hub', 'institution_lot')),
  add column if not exists bins text[] not null default '{}',
  -- Staff-only: what the dismantling partner paid per kg, by category.
  add column if not exists rates_paise jsonb;
-- The partner is named once; the old default recycler text stays valid.
alter table public.handovers alter column recycler set default 'VRRG Group, Gangyal';

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
  update public.scrap_ledger set handover_id = new.id
   where item_id = any (new.item_ids) and handover_id is null;
  return null;
end;
$$;

-- What is in each bin now, how long the oldest line has waited and what is due.
-- Bins hand over at 100 kg or 14 days; batteries every week whatever the weight.
create or replace function public.bin_status()
returns table (bin text, kg numeric, oldest date, days_waiting integer, near_limit boolean, due boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the bins';
  end if;
  return query
  select b.bin,
         coalesce(sum(l.kg), 0)::numeric,
         min((l.at at time zone 'Asia/Kolkata')::date),
         case when min(l.at) is null then 0
              else ((now() at time zone 'Asia/Kolkata')::date - (min(l.at) at time zone 'Asia/Kolkata')::date) end,
         coalesce(sum(l.kg), 0) >= 80 and b.bin <> 'batteries',
         case when b.bin = 'batteries'
              then coalesce(sum(l.kg), 0) > 0
                   and min(l.at) <= now() - interval '7 days'
              else coalesce(sum(l.kg), 0) >= 100
                   or (coalesce(sum(l.kg), 0) > 0 and min(l.at) <= now() - interval '14 days') end
    from (values ('screens'), ('boards'), ('other'), ('d_devices'), ('batteries')) as b (bin)
    left join public.scrap_ledger l on l.bin = b.bin and l.handover_id is null
   group by b.bin
   order by array_position(array['screens', 'boards', 'other', 'd_devices', 'batteries'], b.bin);
end;
$$;
revoke execute on function public.bin_status() from public, anon;
grant execute on function public.bin_status() to authenticated;

-- Hands whole bins to the dismantling partner on a weight receipt. The kg per
-- bin come from the ledger; the receipt number is the partner's.
create or replace function public.record_bin_handover(
  p_bins text[],
  p_receipt_no text,
  p_date date default null,
  p_rates_paise jsonb default null,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_kg jsonb := '{}';
  v_battery numeric := 0;
  v_bin text;
  v_sum numeric;
  v_items text[];
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record handovers';
  end if;
  if p_bins is null or cardinality(p_bins) = 0
     or exists (select 1 from unnest(p_bins) b where b not in ('screens', 'boards', 'other', 'd_devices', 'batteries')) then
    raise exception 'Choose bins from screens, boards, other, d_devices and batteries';
  end if;
  if coalesce(trim(p_receipt_no), '') = '' then
    raise exception 'Enter the weight receipt number';
  end if;
  foreach v_bin in array p_bins loop
    select coalesce(sum(kg), 0) into v_sum from public.scrap_ledger where bin = v_bin and handover_id is null;
    if v_sum <= 0 then
      raise exception 'The % bin is empty', v_bin;
    end if;
    if v_bin = 'batteries' then
      v_battery := v_sum;
    else
      v_kg := v_kg || jsonb_build_object(v_bin, v_sum);
    end if;
  end loop;
  select coalesce(array_agg(item_id), '{}') into v_items
    from public.scrap_ledger
   where bin = 'd_devices' and 'd_devices' = any (p_bins) and handover_id is null and item_id is not null;
  insert into public.handovers (date, kg_by_category, battery_kg, item_ids, receipt_no, rates_paise, notes, kind, bins)
  values (coalesce(p_date, (now() at time zone 'Asia/Kolkata')::date), v_kg, v_battery, v_items,
          left(trim(p_receipt_no), 60), p_rates_paise, left(coalesce(p_notes, ''), 500), 'hub', p_bins)
  returning id into v_id;
  update public.scrap_ledger set handover_id = v_id
   where bin = any (p_bins) and handover_id is null;
  return v_id;
end;
$$;
revoke execute on function public.record_bin_handover(text[], text, date, jsonb, text) from public, anon;
grant execute on function public.record_bin_handover(text[], text, date, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Payouts: exactly one source, a receipt token, a partner
-- ---------------------------------------------------------------------------
alter table public.payouts alter column shop_submission_id drop not null;
alter table public.payouts
  add column if not exists weighin_id uuid references public.scrap_weighins (id) on delete restrict,
  add column if not exists exchange_sale_id uuid unique,
  add column if not exists institution_lot_id uuid,
  add column if not exists partner_id uuid references public.partners (id) on delete set null,
  add column if not exists line text not null default 'lot'
    check (line in ('lot', 'scrap', 'tested_parts', 'part_sale', 'lot_equipment')),
  add column if not exists receipt_token text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists whatsapp_sent_at timestamptz;
create unique index if not exists payouts_receipt_token_idx on public.payouts (receipt_token);
create unique index if not exists payouts_weighin_line_idx on public.payouts (weighin_id, line)
  where weighin_id is not null;
create unique index if not exists payouts_lot_idx on public.payouts (institution_lot_id)
  where institution_lot_id is not null;
alter table public.payouts drop constraint if exists payouts_one_source;
alter table public.payouts add constraint payouts_one_source
  check (num_nonnulls(shop_submission_id, weighin_id, exchange_sale_id, institution_lot_id) = 1);

-- ---------------------------------------------------------------------------
-- 8. Recording a weigh-in at the counter
-- ---------------------------------------------------------------------------
create or replace function public.rate_card_paise()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'screens', coalesce((select (value #>> '{}')::bigint from public.app_settings where key = 'rate_card.screens_paise' and jsonb_typeof(value) = 'number'), 0),
    'batteries', coalesce((select (value #>> '{}')::bigint from public.app_settings where key = 'rate_card.batteries_paise' and jsonb_typeof(value) = 'number'), 0),
    'boards', coalesce((select (value #>> '{}')::bigint from public.app_settings where key = 'rate_card.boards_paise' and jsonb_typeof(value) = 'number'), 0),
    'other', coalesce((select (value #>> '{}')::bigint from public.app_settings where key = 'rate_card.other_paise' and jsonb_typeof(value) = 'number'), 0));
$$;
revoke execute on function public.rate_card_paise() from public, anon;
grant execute on function public.rate_card_paise() to authenticated;

-- Weighs a shop's scrap: kg per rate-card category, a bag of items to test
-- (no money yet) and the shop's ticks. Pays the counter weight by the rate card
-- and writes the kg to the ledger. Returns the weigh-in and its receipt.
create or replace function public.record_weighin(
  p_partner uuid,
  p_screens_kg numeric,
  p_boards_kg numeric,
  p_batteries_kg numeric,
  p_other_kg numeric,
  p_to_test_count integer,
  p_to_test_note text,
  p_owner_confirmed boolean,
  p_swap_declaration boolean,
  p_method text default 'upi',
  p_reference text default '',
  p_pickup uuid default null
)
returns table (weighin_id uuid, receipt_no text, amount_paise bigint, receipt_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rates jsonb := public.rate_card_paise();
  v_partner record;
  v_decl uuid;
  v_w uuid;
  v_amount bigint;
  v_receipt text;
  v_token text;
  v_kg numeric[] := array[coalesce(p_screens_kg, 0), coalesce(p_boards_kg, 0), coalesce(p_batteries_kg, 0), coalesce(p_other_kg, 0)];
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record weigh-ins';
  end if;
  select * into v_partner from public.partners where id = p_partner;
  if not found then
    raise exception 'Partner not found';
  end if;
  if v_partner.status::text <> 'active' then
    raise exception 'Only active partners are paid (this one is %)', v_partner.status;
  end if;
  if exists (select 1 from unnest(v_kg) k where k < 0 or k > 5000) then
    raise exception 'Weights must be between 0 and 5000 kg';
  end if;
  if not coalesce(p_owner_confirmed, false) then
    raise exception 'The shop must confirm the scrap is theirs to sell (tick the ownership box)';
  end if;
  if coalesce(p_to_test_count, 0) > 0 and not coalesce(p_swap_declaration, false) then
    raise exception 'The shop must confirm it may sell the parts left to be tested';
  end if;
  if coalesce(p_method, 'upi') not in ('upi', 'cash') then
    raise exception 'Payouts are UPI or cash';
  end if;
  v_amount := round(v_kg[1] * (v_rates ->> 'screens')::bigint + v_kg[2] * (v_rates ->> 'boards')::bigint
                  + v_kg[3] * (v_rates ->> 'batteries')::bigint + v_kg[4] * (v_rates ->> 'other')::bigint);

  insert into public.ownership_declarations (seller_label, partner_id, staff_id, note)
  values (v_partner.name, p_partner, auth.uid(), 'Scrap weigh-in')
  returning id into v_decl;
  insert into public.scrap_weighins (partner_id, pickup_id, screens_kg, boards_kg, batteries_kg, other_kg,
                                     rates_paise, amount_paise, to_test_count, to_test_note,
                                     ownership_declaration_id, swap_declaration)
  values (p_partner, p_pickup, v_kg[1], v_kg[2], v_kg[3], v_kg[4], v_rates, v_amount,
          coalesce(p_to_test_count, 0), left(coalesce(p_to_test_note, ''), 300), v_decl,
          coalesce(p_swap_declaration, false))
  returning id into v_w;

  insert into public.scrap_ledger (bin, kg, source, weighin_id)
  select b.bin, b.kg, 'weighin', v_w
    from (values ('screens', v_kg[1]), ('boards', v_kg[2]), ('batteries', v_kg[3]), ('other', v_kg[4])) as b (bin, kg)
   where b.kg > 0;

  if p_pickup is not null then
    update public.pickups set status = 'collected', collected_at = now(), updated_at = now()
     where id = p_pickup and status = 'scheduled';
  end if;

  if v_amount > 0 then
    v_receipt := 'RL-PAY-' || extract(year from now() at time zone 'Asia/Kolkata')::integer || '-'
      || lpad((select (public.next_payout_number(extract(year from now() at time zone 'Asia/Kolkata')::integer)))::text, 4, '0');
    insert into public.payouts (receipt_no, weighin_id, shop_owner_id, partner_id, amount_paise, method, paid_at,
                                reference, line, created_by)
    values (v_receipt, v_w, v_partner.shop_owner_id, p_partner, v_amount, coalesce(p_method, 'upi'),
            (now() at time zone 'Asia/Kolkata')::date, left(trim(coalesce(p_reference, '')), 80), 'scrap', auth.uid())
    returning payouts.receipt_token into v_token;
    perform public.notify(v_partner.shop_owner_id, 'payout_made',
      'ReLoop paid you ₹' || to_char(v_amount / 100.0, 'FM9999999990.00'),
      'Scrap weighed at the counter. Receipt ' || v_receipt || '.', '/account');
  end if;
  return query select v_w, v_receipt, v_amount, v_token;
end;
$$;
revoke execute on function public.record_weighin(uuid, numeric, numeric, numeric, numeric, integer, text, boolean, boolean, text, text, uuid)
  from public, anon;
grant execute on function public.record_weighin(uuid, numeric, numeric, numeric, numeric, integer, text, boolean, boolean, text, text, uuid)
  to authenticated;

-- The next RL-PAY number for a year (shared with record_payout's counter).
create or replace function public.next_payout_number(p_year integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into public.payout_counters (year, last_number) values (p_year, 1)
  on conflict (year) do update set last_number = public.payout_counters.last_number + 1
  returning last_number into v_n;
  return v_n;
end;
$$;
revoke execute on function public.next_payout_number(integer) from public, anon, authenticated;

-- Step two of a split lot: within 24 hours each tested working part is tagged
-- (items.weighin_id) and paid at its part price on its own receipt line. Failed
-- parts go to their bin and are paid at the kg rate (staff weigh them).
create or replace function public.pay_tested_parts(p_weighin uuid, p_items text[], p_method text default 'upi')
returns table (receipt_no text, amount_paise bigint, receipt_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
  v_partner record;
  v_amount bigint;
  v_receipt text;
  v_token text;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can pay for tested parts';
  end if;
  select * into w from public.scrap_weighins where id = p_weighin for update;
  if not found then
    raise exception 'Weigh-in not found';
  end if;
  if p_items is null or cardinality(p_items) = 0 then
    raise exception 'Choose the tested parts to pay for';
  end if;
  if (select count(*) from public.items where id = any (p_items) and weighin_id = p_weighin and category = 'part')
     <> cardinality(p_items) then
    raise exception 'Every item must be a part from this weigh-in';
  end if;
  if exists (select 1 from public.items where id = any (p_items) and buy_paise <= 0) then
    raise exception 'Set the part price on every item first';
  end if;
  if exists (select 1 from public.payouts where weighin_id = p_weighin and line = 'tested_parts') then
    raise exception 'The tested parts of this weigh-in are already paid';
  end if;
  select coalesce(sum(buy_paise), 0) into v_amount from public.items where id = any (p_items);
  select * into v_partner from public.partners where id = w.partner_id;
  v_receipt := 'RL-PAY-' || extract(year from now() at time zone 'Asia/Kolkata')::integer || '-'
    || lpad(public.next_payout_number(extract(year from now() at time zone 'Asia/Kolkata')::integer)::text, 4, '0');
  insert into public.payouts (receipt_no, weighin_id, shop_owner_id, partner_id, amount_paise, method, paid_at, line, created_by)
  values (v_receipt, p_weighin, v_partner.shop_owner_id, w.partner_id, v_amount, coalesce(p_method, 'upi'),
          (now() at time zone 'Asia/Kolkata')::date, 'tested_parts', auth.uid())
  returning payouts.receipt_token into v_token;
  update public.items
     set purchase_payment_method = coalesce(p_method, 'upi'), purchase_paid_at = now(), updated_at = now()
   where id = any (p_items);
  perform public.notify(v_partner.shop_owner_id, 'payout_made',
    'ReLoop paid you ₹' || to_char(v_amount / 100.0, 'FM9999999990.00'),
    'Tested parts paid as parts. Receipt ' || v_receipt || '.', '/account');
  return query select v_receipt, v_amount, v_token;
end;
$$;
revoke execute on function public.pay_tested_parts(uuid, text[], text) from public, anon;
grant execute on function public.pay_tested_parts(uuid, text[], text) to authenticated;

-- Staff mark that they shared a receipt on WhatsApp (v1 has no WhatsApp API).
create or replace function public.mark_receipt_shared(p_receipt text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can share receipts';
  end if;
  update public.payouts set whatsapp_sent_at = now() where receipt_no = p_receipt;
end;
$$;
revoke execute on function public.mark_receipt_shared(text) from public, anon;
grant execute on function public.mark_receipt_shared(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Receipts: the shop's own list, the PDF row and the private token link
-- ---------------------------------------------------------------------------
drop function if exists public.my_payouts();
drop function if exists public.payout_receipt(text);

create function public.my_payouts()
returns table (
  receipt_no text,
  shop_submission_id bigint,
  item_name text,
  quantity integer,
  amount_paise bigint,
  method text,
  paid_at date,
  line text,
  receipt_token text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.receipt_no, p.shop_submission_id,
         coalesce(s.item_name, case p.line when 'scrap' then 'Scrap weighed at the counter'
                                           when 'tested_parts' then 'Tested working parts'
                                           else 'Payment' end),
         coalesce(s.quantity, 1), p.amount_paise, p.method, p.paid_at, p.line, p.receipt_token
    from public.payouts p
    left join public.shop_submissions s on s.id = p.shop_submission_id
   where auth.uid() is not null and p.shop_owner_id = auth.uid()
   order by p.paid_at desc, p.receipt_no desc;
$$;
revoke execute on function public.my_payouts() from public, anon;
grant execute on function public.my_payouts() to authenticated;

-- What a receipt lists: kg, rate and amount per category for a weigh-in, or the
-- tagged parts for a tested-parts payment. Never the payment reference or notes.
create or replace function public.receipt_lines(p_payout uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.line = 'scrap' then (
      select jsonb_agg(jsonb_build_object('label', l.label, 'kg', l.kg, 'rate_paise', l.rate,
                                          'amount_paise', round(l.kg * l.rate)) order by l.ord)
        from (select 1 as ord, 'Screens and displays' as label, w.screens_kg as kg, (w.rates_paise ->> 'screens')::bigint as rate
              union all select 2, 'Dead motherboards', w.boards_kg, (w.rates_paise ->> 'boards')::bigint
              union all select 3, 'Batteries', w.batteries_kg, (w.rates_paise ->> 'batteries')::bigint
              union all select 4, 'Everything else', w.other_kg, (w.rates_paise ->> 'other')::bigint) l
       where l.kg > 0)
    when p.line = 'tested_parts' then (
      select jsonb_agg(jsonb_build_object('label', i.id || ' ' || coalesce(i.part_type::text, 'part'),
                                          'amount_paise', i.buy_paise) order by i.id)
        from public.items i where i.weighin_id = p.weighin_id and i.category = 'part' and i.buy_paise > 0)
    else null end
  from public.payouts p
  left join public.scrap_weighins w on w.id = p.weighin_id
  where p.id = p_payout;
$$;
revoke execute on function public.receipt_lines(uuid) from public, anon, authenticated;

-- One receipt as data, for the PDF: the owner's own or any for staff.
create function public.payout_receipt(p_receipt text)
returns table (
  receipt_no text,
  paid_at date,
  amount_paise bigint,
  method text,
  item_name text,
  quantity integer,
  shop_name text,
  purchased_at timestamptz,
  line text,
  lines jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.receipt_no, p.paid_at, p.amount_paise, p.method,
         coalesce(s.item_name, case p.line when 'scrap' then 'Scrap weighed at the counter'
                                           when 'tested_parts' then 'Tested working parts' else 'Payment' end),
         coalesce(s.quantity, 1),
         coalesce(o.shop_name, pt.name, 'Deleted account'), s.purchased_at, p.line,
         public.receipt_lines(p.id)
    from public.payouts p
    left join public.shop_submissions s on s.id = p.shop_submission_id
    left join public.shop_owners o on o.id = p.shop_owner_id
    left join public.partners pt on pt.id = p.partner_id
   where p.receipt_no = p_receipt
     and auth.uid() is not null
     and (p.shop_owner_id = auth.uid() or public.is_staff());
$$;
revoke execute on function public.payout_receipt(text) from public, anon;
grant execute on function public.payout_receipt(text) to authenticated;

-- The private link: anyone holding the token sees the receipt, nothing else.
create function public.receipt_by_token(p_token text)
returns table (
  receipt_no text,
  paid_at date,
  amount_paise bigint,
  method text,
  shop_name text,
  line text,
  lines jsonb,
  declaration text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.receipt_no, p.paid_at, p.amount_paise, p.method,
         coalesce(o.shop_name, pt.name, 'Deleted account'), p.line, public.receipt_lines(p.id),
         case when p.line = 'scrap' then
           'The shop confirmed the scrap is theirs to sell'
           || case when w.swap_declaration then ' and that it may sell the parts left to be tested' else '' end || '.'
         end
    from public.payouts p
    left join public.shop_owners o on o.id = p.shop_owner_id
    left join public.partners pt on pt.id = p.partner_id
    left join public.scrap_weighins w on w.id = p.weighin_id
   where p_token ~ '^[0-9a-f]{32}$' and p.receipt_token = p_token;
$$;
revoke execute on function public.receipt_by_token(text) from public;
grant execute on function public.receipt_by_token(text) to anon, authenticated;

-- A partner's weigh-ins for the shop's own dashboard: kg and amounts, no staff fields.
create or replace function public.my_weighins()
returns table (id uuid, weighed_at timestamptz, screens_kg numeric, boards_kg numeric, batteries_kg numeric,
               other_kg numeric, amount_paise bigint, to_test_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.weighed_at, w.screens_kg, w.boards_kg, w.batteries_kg, w.other_kg, w.amount_paise, w.to_test_count
    from public.scrap_weighins w
    join public.partners p on p.id = w.partner_id
   where auth.uid() is not null and p.shop_owner_id = auth.uid()
   order by w.weighed_at desc;
$$;
revoke execute on function public.my_weighins() from public, anon;
grant execute on function public.my_weighins() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Institution lots (Rs 3,000 a lot; dead e-waste goes straight to VRRG)
-- ---------------------------------------------------------------------------
alter table public.institutions
  add column if not exists named_publicly boolean not null default false,
  add column if not exists named_consent_at timestamptz;

create table if not exists public.institution_lots (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete restrict,
  request_id uuid unique references public.submissions (id) on delete set null,
  lot_date date not null default current_date,
  -- The fee ReLoop charges for pickup, sorting and the handover record. Income,
  -- on its own receipt; never netted against the equipment payment.
  fee_paise bigint not null check (fee_paise >= 0),
  fee_receipt_no text unique,
  fee_received_at date,
  fee_method text check (fee_method in ('cash', 'upi')),
  ownership_declaration_id uuid references public.ownership_declarations (id) on delete set null,
  -- Dead e-waste goes straight to the dismantling partner, on their weight
  -- receipt in the institution's name; it never enters the bins.
  handover_id uuid references public.handovers (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.payouts drop constraint if exists payouts_institution_lot_fk;
alter table public.payouts add constraint payouts_institution_lot_fk
  foreign key (institution_lot_id) references public.institution_lots (id) on delete restrict;
alter table public.institution_lots enable row level security;
revoke all on public.institution_lots from anon, authenticated;
grant select on public.institution_lots to authenticated;
drop policy if exists "Staff read institution lots" on public.institution_lots;
create policy "Staff read institution lots" on public.institution_lots for select to authenticated
  using ((select public.is_staff()));

alter table public.items add column if not exists institution_lot_id uuid references public.institution_lots (id) on delete set null;

-- Opens a lot for an institution pickup; the fee defaults to the published one.
create or replace function public.open_institution_lot(p_institution uuid, p_request uuid default null,
                                                       p_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fee bigint;
  v_id uuid;
  v_inst record;
  v_decl uuid;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record institution lots';
  end if;
  select * into v_inst from public.institutions where id = p_institution;
  if not found then
    raise exception 'Institution not found';
  end if;
  select (value #>> '{}')::bigint into v_fee from public.app_settings
   where key = 'institution.lot_fee_paise' and jsonb_typeof(value) = 'number';
  insert into public.ownership_declarations (seller_label, staff_id, note)
  values (v_inst.name, auth.uid(), 'Institution lot') returning id into v_decl;
  insert into public.institution_lots (institution_id, request_id, lot_date, fee_paise, ownership_declaration_id)
  values (p_institution, p_request, coalesce(p_date, (now() at time zone 'Asia/Kolkata')::date),
          coalesce(v_fee, 300000), v_decl)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.open_institution_lot(uuid, uuid, date) from public, anon;
grant execute on function public.open_institution_lot(uuid, uuid, date) to authenticated;

-- Records the fee received, with its own receipt number.
create or replace function public.record_lot_fee(p_lot uuid, p_method text, p_received_on date default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt text;
  v_on date := coalesce(p_received_on, (now() at time zone 'Asia/Kolkata')::date);
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record fees';
  end if;
  if p_method not in ('cash', 'upi') then
    raise exception 'Fees are paid by cash or UPI';
  end if;
  if exists (select 1 from public.institution_lots where id = p_lot and fee_receipt_no is not null) then
    raise exception 'This lot''s fee is already recorded';
  end if;
  v_receipt := public.next_receipt_no('FEE', extract(year from v_on)::integer);
  update public.institution_lots
     set fee_receipt_no = v_receipt, fee_received_at = v_on, fee_method = p_method
   where id = p_lot;
  if not found then
    raise exception 'Lot not found';
  end if;
  return v_receipt;
end;
$$;
revoke execute on function public.record_lot_fee(uuid, text, date) from public, anon;
grant execute on function public.record_lot_fee(uuid, text, date) to authenticated;

-- Records the dismantling partner's weight receipt for a lot's dead e-waste. It
-- is a handover on the institution's behalf, outside the bins and the ledger.
create or replace function public.record_lot_handover(p_lot uuid, p_receipt_no text, p_kg_by_category jsonb,
                                                      p_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inst record;
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record handovers';
  end if;
  if coalesce(trim(p_receipt_no), '') = '' then
    raise exception 'Enter the weight receipt number';
  end if;
  if p_kg_by_category is null or jsonb_typeof(p_kg_by_category) <> 'object' then
    raise exception 'Enter the kg by category';
  end if;
  select i.* into v_inst from public.institution_lots l join public.institutions i on i.id = l.institution_id
   where l.id = p_lot;
  if not found then
    raise exception 'Lot not found';
  end if;
  if exists (select 1 from public.institution_lots where id = p_lot and handover_id is not null) then
    raise exception 'This lot already has a handover';
  end if;
  insert into public.handovers (date, kg_by_category, receipt_no, on_behalf_of, kind)
  values (coalesce(p_date, (now() at time zone 'Asia/Kolkata')::date), p_kg_by_category,
          left(trim(p_receipt_no), 60), v_inst.name, 'institution_lot')
  returning id into v_id;
  update public.institution_lots set handover_id = v_id where id = p_lot;
  return v_id;
end;
$$;
revoke execute on function public.record_lot_handover(uuid, text, jsonb, date) from public, anon;
grant execute on function public.record_lot_handover(uuid, text, jsonb, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Converting a shop offer needs the ownership tick (once the cutoff passes)
-- ---------------------------------------------------------------------------
drop function if exists public.convert_submission(bigint, public.item_category, public.part_type, bigint);

create function public.convert_submission(
  p_submission bigint,
  p_category public.item_category,
  p_part_type public.part_type,
  p_unit_price_paise bigint,
  p_owner_confirmed boolean default false
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  shop record;
  tags text[] := '{}';
  tag text;
  v_decl uuid;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can convert submissions';
  end if;
  if p_unit_price_paise is null or p_unit_price_paise < 0 then
    raise exception 'Enter the price paid per item';
  end if;

  select * into s from public.shop_submissions where id = p_submission for update;
  if not found then
    raise exception 'Submission % not found', p_submission;
  end if;
  if s.status not in ('Offered', 'Contacted', 'Accepted') then
    raise exception 'Only an offered or accepted submission can become hub items (this one is %)', s.status;
  end if;
  if exists (select 1 from public.items where shop_submission_id = p_submission) then
    raise exception 'Submission % already has hub items', p_submission;
  end if;
  select shop_name, owner_name, phone into shop from public.shop_owners where id = s.shop_owner_id;

  for i in 1 .. s.quantity loop
    insert into public.items (
      source_type, source_name, source_contact_name, source_phone, category, part_type, brand, model,
      description, faults, buy_mode, buy_paise, purchase_payment_method, shop_submission_id,
      ownership_confirmed_at
    ) values (
      'repair_shop', coalesce(shop.shop_name, ''), coalesce(shop.owner_name, ''), coalesce(shop.phone, ''),
      p_category, p_part_type, left(coalesce(s.brand, ''), 40), left(coalesce(s.model, s.item_name, ''), 80),
      left(concat_ws(E'\n', s.item_name, s.description), 2000),
      'Condition reported by the shop: ' || s.condition,
      'cash', p_unit_price_paise, 'not_paid', p_submission,
      case when coalesce(p_owner_confirmed, false) then now() end
    )
    returning id into tag;
    tags := tags || tag;
  end loop;

  if coalesce(p_owner_confirmed, false) then
    insert into public.ownership_declarations (seller_label, tags, staff_id, shop_submission_id, note)
    values (coalesce(shop.shop_name, 'Shop'), tags, auth.uid(), p_submission, 'Offer accepted')
    returning id into v_decl;
  end if;

  update public.shop_submissions
     set status = 'Purchased',
         purchase_price = round(p_unit_price_paise * s.quantity / 100.0, 2),
         purchased_at = now()
   where id = p_submission;
  update public.pickups set status = 'collected', collected_at = now(), updated_at = now()
   where shop_submission_id = p_submission and status = 'scheduled';

  return tags;
end;
$$;
revoke execute on function public.convert_submission(bigint, public.item_category, public.part_type, bigint, boolean)
  from public, anon;
grant execute on function public.convert_submission(bigint, public.item_category, public.part_type, bigint, boolean)
  to authenticated;
