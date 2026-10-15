-- Business Plan v2, step 4 (batch 15b): stock rules, hub alerts and pilot KPIs.
--   * A part unsold for 30 days gets a 25% price cut, once. A device (A or B)
--     unsold for 45 days becomes C and is stripped for parts. Both count from
--     listed_at and the daily job stays idempotent.
--   * Shop-listed parts get a day-30 reminder to the shop instead of a cut.
--   * Public counts and kg only; money KPIs are staff-only.

insert into public.app_settings (key, value, is_public) values
  -- Items already past a threshold when the new rules start get a grace period:
  -- nothing runs before this date (empty = no grace). A local session sets it.
  ('stock.grace_until', 'null', false)
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
    when 'stock.grace_until' then 'string'
  end;
$$;
revoke execute on function public.setting_type(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. The daily rules
-- ---------------------------------------------------------------------------
create or replace function public.apply_stock_rules(now_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grace date := public.cutoff_date('stock.grace_until');
  stripped integer;
  cut integer;
  reminded integer := 0;
  r record;
begin
  if v_grace is not null and (now_at at time zone 'Asia/Kolkata')::date < v_grace then
    return 0;
  end if;

  -- Day 45: an unsold A or B device becomes C and is stripped for parts. A
  -- reserved device is skipped. There is no automatic price cut for devices.
  update public.items
     set grade = 'C', status = 'stripping'
   where status = 'listed' and category <> 'part' and grade in ('A', 'B') and not hidden
     and listed_at <= now_at - interval '45 days';
  get diagnostics stripped = row_count;

  -- Day 30: ReLoop's own parts get one 25% cut (rounded to Rs 10, never below
  -- Rs 10). An earlier cut counts as the "once"; a manual change does not set it.
  update public.items
     set current_paise = greatest(round(current_paise * 0.75 / 1000) * 1000, 1000), price_cut_at = now_at
   where status = 'listed' and category = 'part' and source_type::text <> 'partner_listing'
     and price_cut_at is null and current_paise is not null and not hidden
     and listed_at <= now_at - interval '30 days';
  get diagnostics cut = row_count;

  -- Day 30: a shop-listed part is not cut; the shop gets a reminder to decide.
  for r in
    select i.id, o.id as owner_id
      from public.items i
      join public.partners p on p.id = i.listed_by_partner_id
      join public.shop_owners o on o.id = p.shop_owner_id
     where i.status = 'listed' and i.category = 'part' and i.source_type::text = 'partner_listing'
       and i.partner_reminded_at is null and not i.hidden
       and i.listed_at <= now_at - interval '30 days'
  loop
    update public.items set partner_reminded_at = now_at where id = r.id;
    perform public.notify(r.owner_id, 'part_unsold_days',
      'Your part ' || r.id || ' has not sold in 30 days',
      'You can lower the price or take it back at the next pickup. Tell us on WhatsApp.', '/account');
    reminded := reminded + 1;
  end loop;

  return stripped + cut + reminded;
end;
$$;
revoke execute on function public.apply_stock_rules(timestamptz) from public, anon, authenticated;

-- Savers are told when an item they watch leaves the shop without selling.
create or replace function public.notify_saved_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  title text := coalesce(nullif(trim(concat_ws(' ', new.brand, new.model)), ''), new.id);
  v_was text := case when old.hidden then null else old.status::text end;
  v_now text := new.status::text;
  s record;
begin
  if new.hidden then
    return null;
  end if;
  for s in select user_id from public.saved_items where item_id = new.id loop
    if v_now = 'listed' and v_was = 'listed' and new.current_paise < old.current_paise then
      perform public.notify(s.user_id, 'saved_price_drop', 'Price dropped: ' || title,
        '₹' || to_char(round(old.current_paise / 100.0), 'FM99,99,99,999') || ' → ₹'
          || to_char(round(new.current_paise / 100.0), 'FM99,99,99,999'),
        '/shop/' || new.id);
    elsif v_now = 'listed' and v_was is distinct from 'listed' then
      perform public.notify(s.user_id, 'saved_back_on_sale', 'Back on sale: ' || title,
        'It is in the shop again.', '/shop/' || new.id);
    elsif v_now = 'reserved' and v_was is distinct from 'reserved'
          and not public.reserved_by(new.id, s.user_id) then
      perform public.notify(s.user_id, 'saved_reserved', 'Reserved by someone: ' || title,
        'It may come back on sale if the reservation falls through.', '/account/saved');
    elsif v_now = 'sold' and v_was is distinct from 'sold'
          and not public.reserved_by(new.id, s.user_id) then
      perform public.notify(s.user_id, 'saved_sold', 'Sold: ' || title,
        'It found a new owner. Similar items are in the shop.', '/shop?category=' || new.category::text);
    elsif v_was = 'listed' and v_now in ('stripping', 'graded', 'out_for_repair', 'in_scrap_cage') then
      perform public.notify(s.user_id, 'saved_unavailable', 'No longer for sale: ' || title,
        'It has left the shop. Similar items are in the shop.', '/shop?category=' || new.category::text);
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function public.notify_saved_item() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Hub alerts and the weekly price-cut list
-- ---------------------------------------------------------------------------
create or replace function public.stock_alerts(p_now timestamptz default now())
returns table (kind text, item_id text, days integer, detail text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the stock alerts';
  end if;
  return query
  -- Tested within 24 hours of arrival.
  select 'test_overdue', i.id, floor(extract(epoch from p_now - i.received_at) / 86400)::integer, 'Not tested yet'
    from public.items i
   where i.status::text = 'received' and not i.hidden and i.received_at <= p_now - interval '24 hours'
  union all
  -- Parts and A/B devices are listed within 48 hours.
  select 'list_overdue', i.id, floor(extract(epoch from p_now - i.graded_at) / 86400)::integer, 'Tested, not yet listed'
    from public.items i
   where i.status::text = 'graded' and not i.hidden and i.graded_at <= p_now - interval '48 hours'
     and (i.category = 'part' or i.grade in ('A', 'B'))
  union all
  -- Devices about to be stripped (day 40 to 44).
  select 'strip_soon', i.id, floor(extract(epoch from p_now - i.listed_at) / 86400)::integer,
         'Moves to C and is stripped at day 45'
    from public.items i
   where i.status::text = 'listed' and i.category <> 'part' and i.grade in ('A', 'B') and not i.hidden
     and i.listed_at <= p_now - interval '40 days' and i.listed_at > p_now - interval '45 days'
  union all
  -- Parts unsold for 60 days: consider scrap.
  select 'consider_scrap', i.id, floor(extract(epoch from p_now - i.listed_at) / 86400)::integer,
         'Unsold for 60 days: consider scrap'
    from public.items i
   where i.status::text = 'listed' and i.category = 'part' and not i.hidden and i.listed_at <= p_now - interval '60 days'
  order by 1, 3 desc;
end;
$$;
revoke execute on function public.stock_alerts(timestamptz) from public, anon;
grant execute on function public.stock_alerts(timestamptz) to authenticated;

-- Parts whose price was cut in the last 7 days: the weekly list staff share on WhatsApp.
create or replace function public.weekly_price_cuts(p_now timestamptz default now())
returns table (item_id text, title text, current_paise bigint, price_cut_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the price-cut list';
  end if;
  return query
  select i.id, coalesce(nullif(trim(concat_ws(' ', i.brand, i.model)), ''), i.id), i.current_paise, i.price_cut_at
    from public.items i
   where i.category = 'part' and i.status::text = 'listed' and not i.hidden
     and i.price_cut_at is not null and i.price_cut_at >= p_now - interval '7 days'
   order by i.price_cut_at desc;
end;
$$;
revoke execute on function public.weekly_price_cuts(timestamptz) from public, anon;
grant execute on function public.weekly_price_cuts(timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Pilot KPIs
-- ---------------------------------------------------------------------------
-- A monthly self-report from a partner shop: kg it sent to outside dealers
-- instead of ReLoop. Staff-only; the target is zero.
create table if not exists public.dealer_reports (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  kg_to_other_dealers numeric(8, 2) not null check (kg_to_other_dealers >= 0),
  noted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (partner_id, month)
);
alter table public.dealer_reports enable row level security;
revoke all on public.dealer_reports from anon, authenticated;
grant select, insert, update, delete on public.dealer_reports to authenticated;
drop policy if exists "Staff manage dealer reports" on public.dealer_reports;
create policy "Staff manage dealer reports" on public.dealer_reports for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- The public numbers: counts and kg only, from weighed records. Tagged devices
-- with no measured weight are counted separately as estimated kg.
create or replace view public.public_kpis as
select
  (select count(*) from public.partners p
    where p.status::text = 'active' and p.route_day <> '' and p.type::text = 'repair_shop')::bigint as partner_repair_shops,
  (select count(*) from public.partners p
    where p.status::text = 'active' and p.route_day <> '' and p.type::text = 'retailer')::bigint as partner_retailers,
  (select coalesce(sum(w.screens_kg + w.boards_kg + w.batteries_kg + w.other_kg), 0)
     + coalesce((select sum(i.weight_kg) from public.items i
                  where i.weight_kg is not null and i.source_type::text not in ('stripped', 'partner_listing')), 0)
     from public.scrap_weighins w)::numeric(10, 1) as kg_through_hub,
  (select coalesce(sum(h.battery_kg), 0)
          + coalesce(sum((select coalesce(sum(v.value::numeric), 0) from jsonb_each_text(h.kg_by_category) v)), 0)
     from public.handovers h where h.kind = 'hub')::numeric(10, 1) as kg_to_vrrg,
  (select coalesce(sum((select coalesce(sum(v.value::numeric), 0) from jsonb_each_text(h.kg_by_category) v)), 0)
     from public.handovers h where h.kind = 'institution_lot')::numeric(10, 1) as kg_to_vrrg_institution_lots,
  (select coalesce(sum(l.kg), 0) from public.scrap_ledger l where l.handover_id is null)::numeric(10, 1)
    as kg_awaiting_handover,
  (select count(*) from public.items i
    where i.status::text = 'sold' and i.category <> 'part' and i.grade in ('A', 'B'))::bigint as devices_resold,
  (select count(*) from public.items i where i.status::text = 'sold' and i.category = 'part')::bigint as parts_sold;
revoke all on public.public_kpis from anon, authenticated;
grant select on public.public_kpis to anon, authenticated;

-- Staff-only KPIs for a month: the money target, the stage gates, the dealer
-- self-report, reuse share and days in stock (measured, no target).
create or replace function public.pilot_kpis(p_month date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Kolkata')::date))::date;
  v_next date := (date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Kolkata')::date)) + interval '1 month')::date;
  v_kg numeric;
  v_missed integer;
  v_parts_paise bigint;
  v_target bigint;
  v_reused integer;
  v_devices integer;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the KPIs';
  end if;
  select coalesce(sum(screens_kg + boards_kg + batteries_kg + other_kg), 0) into v_kg
    from public.scrap_weighins
   where (weighed_at at time zone 'Asia/Kolkata')::date >= v_month and (weighed_at at time zone 'Asia/Kolkata')::date < v_next;
  select coalesce(sum(times_missed), 0) into v_missed from public.pickups
   where route_date >= v_month and route_date < v_next;
  select coalesce(sum(sold_paise), 0) into v_parts_paise from public.items
   where category = 'part' and status::text = 'sold'
     and (sold_at at time zone 'Asia/Kolkata')::date >= v_month and (sold_at at time zone 'Asia/Kolkata')::date < v_next;
  select (value #>> '{}')::bigint into v_target from public.app_settings
   where key = 'finance.parts_target_monthly_paise' and jsonb_typeof(value) = 'number';
  -- Reuse: A/B devices, and C devices once one of their parts is listed or sold.
  select count(*) filter (where i.grade in ('A', 'B')
                           or (i.grade = 'C' and exists (select 1 from public.items c
                                                          where c.parent_id = i.id and c.status::text in ('listed', 'reserved', 'sold')))),
         count(*)
    into v_reused, v_devices
    from public.items i
   where i.category <> 'part' and i.source_type::text not in ('stripped', 'partner_listing') and i.grade is not null;
  return jsonb_build_object(
    'month', v_month,
    'kg_weighed', v_kg,
    'missed_pickups', v_missed,
    'parts_sold_paise', v_parts_paise,
    'parts_target_paise', v_target,
    'gate_one_met', v_kg >= 200 and v_missed <= 4,
    'unregistered_dealer_kg', (select coalesce(sum(kg_to_other_dealers), 0) from public.dealer_reports where month = v_month),
    'dealer_reports', (select count(*) from public.dealer_reports where month = v_month),
    'reuse_share', case when v_devices > 0 then round(v_reused::numeric / v_devices, 3) end,
    'avg_days_in_stock', (select round(avg(extract(epoch from sold_at - listed_at) / 86400)::numeric, 1)
                            from public.items where status::text = 'sold' and listed_at is not null and sold_at is not null)
  );
end;
$$;
revoke execute on function public.pilot_kpis(date) from public, anon;
grant execute on function public.pilot_kpis(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. The hub's counts, with the v2 queues
-- ---------------------------------------------------------------------------
create or replace function public.hub_badges()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the hub queues';
  end if;
  return jsonb_build_object(
    'new_requests', (select count(*) from public.submissions s where s.status = 'new'),
    'new_reservations', (select count(*) from public.submissions s
                          where s.status = 'new' and s.kind = 'reservation'),
    'new_institution_pickups', (select count(*) from public.submissions s
                                 where s.status = 'new' and s.kind = 'institution_pickup'),
    'new_questions', (select count(*) from public.submissions s
                       where s.status = 'new' and s.kind = 'enquiry'),
    'new_submissions', (select count(*) from public.shop_submissions x
                         where x.status in ('Pending', 'Under Review')),
    'offers_waiting', (select count(*) from public.shop_submissions x where x.status in ('Offered', 'Contacted')),
    'offers_accepted', (select count(*) from public.shop_submissions x where x.status = 'Accepted'),
    'payouts_due', (select count(*) from public.shop_submissions x
                     where x.status in ('Purchased', 'Processing', 'Completed') and x.purchase_price > 0
                       and not exists (select 1 from public.payouts p where p.shop_submission_id = x.id)),
    'pickups_next', (select count(*) from public.pickups p
                      where p.status = 'scheduled' and p.source = 'shop'
                        and p.route_date <= public.next_route_day((now() at time zone 'Asia/Kolkata')::date - 1)),
    'pickups_unconfirmed', (select count(*) from public.pickups p where p.status = 'scheduled' and p.route_date is null),
    'part_listings_waiting', (select count(*) from public.part_listings l where l.status in ('submitted', 'at_hub')),
    'part_sales_to_pay', (select count(*) from public.exchange_sales e
                           where e.status = 'sold' and e.payout_due_on <= (now() at time zone 'Asia/Kolkata')::date),
    'open_claims', (select count(*) from public.warranty_claims c where c.closed_at is null),
    'bins_due', (select count(*) from public.bin_status() b where b.due),
    'pending_shops', case when admin then
                       (select count(*) from public.shop_owners o where o.verification_status = 'pending')
                     end,
    'deletion_requests', case when admin then
                           (select count(*) from public.deletion_requests d where d.status = 'open')
                         end
  );
end;
$$;
revoke execute on function public.hub_badges() from public, anon;
grant execute on function public.hub_badges() to authenticated;
