-- Business Plan v2, step 1 (batch 15b): scope, places and settings.
--   * Households, TVs, small appliances, printers, UPS units, consignment and
--     shipping outside Jammu can no longer be used for new rows. No enum value
--     is dropped: old rows stay valid and keep their labels (ADR 0005).
--   * The hub is in Gandhi Nagar; pickups follow a per-market route day.
--   * The rate card per kg is a public setting; VRRG rates and every plan
--     benchmark are staff-only settings that start empty (filled locally).

-- ---------------------------------------------------------------------------
-- 1. Removed values: blocked for new use only
-- ---------------------------------------------------------------------------
create or replace function public.guard_removed_item_values()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.source_type is distinct from old.source_type then
    if new.source_type::text = 'household' then
      raise exception 'ReLoop does not buy from households';
    end if;
  end if;
  if tg_op = 'INSERT' or new.category is distinct from old.category then
    if new.category::text in ('tv', 'printer', 'ups', 'small_appliance') then
      raise exception 'ReLoop does not take TVs, printers, UPS units or small appliances';
    end if;
  end if;
  if tg_op = 'INSERT' or new.fulfilment is distinct from old.fulfilment then
    if new.fulfilment::text = 'ship_india' then
      raise exception 'Nothing is shipped outside Jammu';
    end if;
  end if;
  if tg_op = 'INSERT' or new.buy_mode is distinct from old.buy_mode then
    if new.buy_mode::text = 'consignment' then
      raise exception 'ReLoop buys outright; consignment is no longer used';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_removed_item_values() from public, anon, authenticated;
drop trigger if exists items_guard_removed_values on public.items;
create trigger items_guard_removed_values before insert or update on public.items
  for each row execute function public.guard_removed_item_values();

create or replace function public.guard_removed_request_kinds()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.kind is distinct from old.kind then
    if new.kind::text in ('household_dropoff', 'consignment') then
      raise exception 'ReLoop no longer collects from households or takes items on consignment';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_removed_request_kinds() from public, anon, authenticated;
drop trigger if exists submissions_guard_removed_kinds on public.submissions;
create trigger submissions_guard_removed_kinds before insert or update on public.submissions
  for each row execute function public.guard_removed_request_kinds();

create or replace function public.guard_removed_reference_categories()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.category is distinct from old.category)
     and new.category::text in ('tv', 'printer', 'ups', 'small_appliance') then
    raise exception 'ReLoop does not take TVs, printers, UPS units or small appliances';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_removed_reference_categories() from public, anon, authenticated;
drop trigger if exists reference_prices_guard_categories on public.reference_prices;
create trigger reference_prices_guard_categories before insert or update on public.reference_prices
  for each row execute function public.guard_removed_reference_categories();

-- The consignments table stays for history; no new rows.
create or replace function public.block_new_consignments()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ReLoop buys outright; consignment is no longer used';
end;
$$;
revoke execute on function public.block_new_consignments() from public, anon, authenticated;
drop trigger if exists consignments_no_new on public.consignments;
create trigger consignments_no_new before insert on public.consignments
  for each row execute function public.block_new_consignments();
comment on table public.consignments is 'Unused since Business Plan v2 (ADR 0005): history only, new rows are blocked.';

-- ---------------------------------------------------------------------------
-- 2. Settings: new keys, retired keys, and a rule that plan figures stay private
-- ---------------------------------------------------------------------------
delete from public.app_settings
 where key in ('dropoff.shops', 'pricing.target_margin_pct', 'capacity.racks');

-- Staff-only money settings live under finance.* and vrg.*; they can never be public.
alter table public.app_settings drop constraint if exists app_settings_private_keys;
alter table public.app_settings add constraint app_settings_private_keys
  check (key !~ '^(finance|vrg)\.' or not is_public);

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
    when 'capacity.device_rack_slots' then 'number'
    when 'vrg.rates_paise' then 'object'
    when 'finance.scrap_spread_paise_per_kg' then 'number'
    when 'finance.device_unit_paise' then 'number'
    when 'finance.parts_target_monthly_paise' then 'number'
    when 'finance.fixed_costs_monthly_paise' then 'number'
    when 'finance.setup_costs_paise' then 'number'
  end;
$$;
revoke execute on function public.setting_type(text) from public, anon, authenticated;

-- Staff-only numbers can be cleared back to "not set" (JSON null).
create or replace function public.set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := public.setting_type(p_key);
  v jsonb := coalesce(p_value, 'null'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Only admins can change settings';
  end if;
  if wanted is null then
    raise exception 'Unknown setting %', p_key;
  end if;
  if jsonb_typeof(v) <> wanted
     and not (jsonb_typeof(v) = 'null' and (wanted = 'string' or p_key ~ '^(finance|capacity)\.')) then
    raise exception 'Setting % must be a JSON %', p_key, wanted;
  end if;
  if p_key ~ '^rate_card\.' and p_key <> 'rate_card.as_of' and jsonb_typeof(v) = 'number'
     and (v::text)::numeric < 0 then
    raise exception 'Setting % cannot be negative', p_key;
  end if;
  if pg_column_size(v) > 20000 then
    raise exception 'Setting % is too large', p_key;
  end if;
  update public.app_settings
     set value = v, updated_at = now(), updated_by = auth.uid()
   where key = p_key;
  if not found then
    raise exception 'Unknown setting %', p_key;
  end if;
  insert into public.admin_audit_log (admin_id, action, detail)
  values (auth.uid(), 'setting_change', p_key);
end;
$$;
revoke execute on function public.set_setting(text, jsonb) from public, anon;
grant execute on function public.set_setting(text, jsonb) to authenticated;

-- The hub address: replaced only where it still holds the old seeded text.
update public.app_settings
   set value = to_jsonb('Gandhi Nagar, between Bahu Plaza and Gole Market. Exact address when we open.'::text)
 where key = 'hub.address'
   and value = to_jsonb('Old-city market belt, between Raghunath Bazaar and Residency Road. Exact address when we open in November 2026.'::text);

-- Handling defaults to Rs 0 (editable) where it still holds the old seeded amounts.
update public.app_settings
   set value = '{"A": 0, "B": 0, "C": 0, "D": 0}'
 where key = 'pricing.handling_paise'
   and value = '{"A": 10000, "B": 10000, "C": 6000, "D": 0}';

-- Category weights lose the excluded categories' estimates (old rows keep theirs).
update public.app_settings
   set value = value - 'tv' - 'printer' - 'ups' - 'small_appliance'
 where key = 'categories.weight_kg';

-- What we don't take: rewritten for v2 (only where it still holds the old default).
update public.app_settings
   set value = '["TVs, printers, UPS units and small appliances.", "Large appliances: fridges, washing machines and air conditioners.", "Anything from homes: we buy from shops, retailers and institutions only.", "Lead-acid batteries, and any leaking battery.", "Anything that isn''t electrical or electronic."]'::jsonb
 where key = 'accept.dont'
   and value = '["Large appliances: fridges, washing machines and air conditioners.", "Anything that isn''t electrical or electronic.", "Leaking or swollen batteries, except handed over at the hub, where they go straight into the battery cabinet for the recycler."]'::jsonb;

-- Route days per market. Unknown or not-yet-started markets have no date
-- ("next route day to be confirmed"). Edited in the hub settings.
insert into public.app_settings (key, value, is_public) values
  ('route.markets', '{
     "Bahu Plaza":        {"day": "tue", "starts_on": "2026-11-03"},
     "Gole Market":       {"day": "tue", "starts_on": "2026-11-03"},
     "Raghunath Bazaar":  {"day": "fri", "starts_on": "2027-01-08"},
     "Residency Road":    {"day": "fri", "starts_on": "2027-01-08"}
   }', true),
  -- The public rate card (published terms). Everything here is public by design.
  ('rate_card.screens_paise', '17000', true),
  ('rate_card.batteries_paise', '80000', true),
  ('rate_card.boards_paise', '13000', true),
  ('rate_card.other_paise', '500', true),
  ('rate_card.as_of', '"2026-10-15"', true),
  ('rate_card.commission_pct', '12', true),
  -- Staff-only. Plan benchmarks and VRRG rates are NOT in this repo: they start
  -- empty and a local session fills them in (scripts/finish-v1-local.md).
  ('capacity.device_rack_slots', 'null', false),
  ('vrg.rates_paise', '{}', false),
  ('finance.scrap_spread_paise_per_kg', 'null', false),
  ('finance.device_unit_paise', 'null', false),
  ('finance.parts_target_monthly_paise', 'null', false),
  ('finance.fixed_costs_monthly_paise', 'null', false),
  ('finance.setup_costs_paise', 'null', false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Route days follow the shop's market
-- ---------------------------------------------------------------------------
drop function if exists public.next_route_day(date);

-- Without a market: the next Tuesday or Friday. With a market: that market's
-- weekday, not before its start date; null when the market isn't on the route
-- yet (shown as "to be confirmed").
create or replace function public.next_route_day(p_after date, p_market text default null)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_markets jsonb;
  v_entry jsonb;
  v_dow integer;
  v_start date;
begin
  if p_market is null or trim(p_market) = '' then
    return (select d::date
              from generate_series(p_after + 1, p_after + 7, interval '1 day') as d
             where extract(isodow from d) in (2, 5)
             order by d
             limit 1);
  end if;
  select value into v_markets from public.app_settings where key = 'route.markets';
  if v_markets is null or jsonb_typeof(v_markets) <> 'object' then
    return null;
  end if;
  select v_markets -> k into v_entry
    from jsonb_object_keys(v_markets) k
   where lower(k) = lower(trim(p_market))
   limit 1;
  if v_entry is null then
    return null;
  end if;
  v_dow := case v_entry ->> 'day' when 'tue' then 2 when 'fri' then 5 end;
  if v_dow is null then
    return null;
  end if;
  v_start := greatest(p_after + 1, coalesce(nullif(v_entry ->> 'starts_on', '')::date, p_after + 1));
  return v_start + ((v_dow - extract(isodow from v_start)::integer + 7) % 7);
end;
$$;
revoke execute on function public.next_route_day(date, text) from public;
grant execute on function public.next_route_day(date, text) to anon, authenticated;

-- A pickup may wait for a route day to be confirmed.
alter table public.pickups alter column route_date drop not null;

create or replace function public.respond_to_offer(p_submission bigint, p_accept boolean, p_note text default '')
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  shop record;
  v_note text := left(trim(coalesce(p_note, '')), 300);
  v_day date;
begin
  select * into s from public.shop_submissions where id = p_submission for update;
  if not found or auth.uid() is null or s.shop_owner_id is distinct from auth.uid() then
    raise exception 'Submission not found';
  end if;
  if s.status not in ('Offered', 'Contacted') then
    raise exception 'There is no open offer on this submission';
  end if;
  if p_accept is null then
    raise exception 'Accept or decline the offer';
  end if;
  update public.shop_submissions
     set status = case when p_accept then 'Accepted' else 'Declined' end,
         owner_response_at = now(),
         owner_note = v_note
   where id = p_submission;
  if not p_accept then
    return null;
  end if;
  select shop_name, map_market into shop from public.shop_owners where id = s.shop_owner_id;
  v_day := public.next_route_day((now() at time zone 'Asia/Kolkata')::date, nullif(trim(coalesce(shop.map_market, '')), ''));
  insert into public.pickups (source, shop_submission_id, shop_owner_id, route_date, market)
  values ('shop', p_submission, s.shop_owner_id, v_day, left(coalesce(shop.map_market, ''), 80))
  on conflict (shop_submission_id) do update
    set status = 'scheduled', route_date = excluded.route_date, updated_at = now();
  perform public.notify(s.shop_owner_id, 'pickup_booked',
    case when v_day is null then 'Pickup booked: day to be confirmed'
         else 'Pickup booked for ' || to_char(v_day, 'FMDay FMDD Mon') end,
    case when v_day is null
         then 'Your market is not on the weekly route yet. We will confirm the next route day with you.'
         else 'Keep ' || left(coalesce(s.item_name, 'the items'), 60) || ' ready: ReLoop collects on the route that day.' end,
    '/account');
  return v_day;
end;
$$;
revoke execute on function public.respond_to_offer(bigint, boolean, text) from public, anon;
grant execute on function public.respond_to_offer(bigint, boolean, text) to authenticated;

create or replace function public.set_pickup_status(p_id uuid, p_status text)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_day date;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can update pickups';
  end if;
  select * into p from public.pickups where id = p_id for update;
  if not found then
    raise exception 'Pickup not found';
  end if;
  if p.status <> 'scheduled' then
    raise exception 'This pickup is already %', p.status;
  end if;
  if p_status = 'collected' then
    update public.pickups set status = 'collected', collected_at = now(), updated_at = now() where id = p_id;
    if p.request_id is not null then
      update public.submissions set status = 'collected', handled_at = now()
       where id = p.request_id and status::text = 'scheduled';
    end if;
    return p.route_date;
  elsif p_status = 'missed' then
    -- A missed stop rolls to the next route day for the shop's own market;
    -- institution lots use the next day of either route.
    v_day := public.next_route_day(
      greatest(coalesce(p.route_date, (now() at time zone 'Asia/Kolkata')::date), (now() at time zone 'Asia/Kolkata')::date),
      case when p.source = 'shop' then nullif(trim(p.market), '') end);
    update public.pickups
       set route_date = v_day, times_missed = times_missed + 1, updated_at = now()
     where id = p_id;
    if p.request_id is not null and v_day is not null then
      update public.submissions set scheduled_for = v_day where id = p.request_id;
    end if;
    perform public.notify(p.shop_owner_id, 'pickup_moved',
      case when v_day is null then 'Pickup day to be confirmed'
           else 'Pickup moved to ' || to_char(v_day, 'FMDay FMDD Mon') end,
      'We couldn''t collect on the planned day. Sorry for the wait.', '/account');
    return v_day;
  end if;
  raise exception 'Mark a pickup collected or missed';
end;
$$;
revoke execute on function public.set_pickup_status(uuid, text) from public, anon;
grant execute on function public.set_pickup_status(uuid, text) to authenticated;
