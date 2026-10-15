-- Batch 21: capacity, the battery ledger and the institution handover record.

-- ---------------------------------------------------------------------------
-- 1. Battery ledger: the 15b scrap ledger gains count, condition and a reused flag
-- ---------------------------------------------------------------------------
alter table public.scrap_ledger
  add column if not exists battery_count integer check (battery_count > 0),
  add column if not exists battery_condition text check (battery_condition in ('good', 'used', 'swollen', 'damaged')),
  add column if not exists reused boolean not null default false;
alter table public.scrap_ledger drop constraint if exists scrap_ledger_battery_fields;
alter table public.scrap_ledger add constraint scrap_ledger_battery_fields
  check (bin = 'batteries' or (battery_count is null and battery_condition is null and not reused));
-- Batteries taken out of a device at the hub are logged with their own source.
alter table public.scrap_ledger drop constraint if exists scrap_ledger_source_check;
alter table public.scrap_ledger add constraint scrap_ledger_source_check
  check (source in ('weighin', 'reweigh', 'device_d', 'part_fail', 'adjustment', 'battery_removed'));

-- Logs batteries into the cabinet (for example taken out of a stripped device).
create or replace function public.log_battery(p_kg numeric, p_count integer, p_condition text, p_note text default '')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can log batteries';
  end if;
  if p_kg is null or p_kg <= 0 then
    raise exception 'Enter the weight in kg';
  end if;
  if p_count is null or p_count <= 0 then
    raise exception 'Enter how many batteries';
  end if;
  if p_condition not in ('good', 'used', 'swollen', 'damaged') then
    raise exception 'Condition is good, used, swollen or damaged';
  end if;
  insert into public.scrap_ledger (bin, kg, source, battery_count, battery_condition, note)
  values ('batteries', p_kg, 'battery_removed', p_count, p_condition, left(coalesce(p_note, ''), 300))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.log_battery(numeric, integer, text, text) from public, anon;
grant execute on function public.log_battery(numeric, integer, text, text) to authenticated;

-- A tested-good battery that is reused leaves the cabinet. The ledger stays
-- honest: the original line is flagged and an offsetting line is added.
create or replace function public.mark_battery_reused(p_ledger bigint, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can reuse batteries';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Say where it was reused (a tag or a short note)';
  end if;
  select * into l from public.scrap_ledger where id = p_ledger for update;
  if not found or l.bin <> 'batteries' or l.kg <= 0 then
    raise exception 'That is not a battery line';
  end if;
  if l.handover_id is not null then
    raise exception 'That battery has already been handed over';
  end if;
  if l.reused then
    raise exception 'That battery is already marked reused';
  end if;
  update public.scrap_ledger set reused = true where id = p_ledger;
  insert into public.scrap_ledger (bin, kg, source, battery_count, battery_condition, reused, note)
  values ('batteries', -l.kg, 'adjustment', null, null, true, 'Reused: ' || left(trim(p_note), 250));
end;
$$;
revoke execute on function public.mark_battery_reused(bigint, text) from public, anon;
grant execute on function public.mark_battery_reused(bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. capacity_status(): bins, battery cabinet, device racks, parts shelf and ages
-- ---------------------------------------------------------------------------
-- Rack slots come from the staff setting capacity.device_rack_slots. While it is
-- unset there is no percentage and no alert. The parts shelf is a count only.
-- Age runs from the listing date (the date the stock rules use), or the
-- received date for stock not yet listed. Devices: 0-30, 31-45, 46+ days;
-- parts: 0-30, 31+ days.
create or replace function public.capacity_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slots integer;
  v_used integer;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_bat_kg numeric;
  v_bat_count bigint;
  v_bat_oldest date;
  v_bat_last date;
  v_bins jsonb;
  v_dev jsonb;
  v_parts jsonb;
  v_shelf integer;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see capacity';
  end if;
  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into v_bins from public.bin_status() b;

  select (value #>> '{}')::integer into v_slots from public.app_settings
   where key = 'capacity.device_rack_slots' and jsonb_typeof(value) = 'number';
  select count(*)::integer into v_used from public.items i
   where i.category::text <> 'part'
     and i.status::text in ('received', 'graded', 'listed', 'reserved', 'stripping');

  select coalesce(sum(kg), 0), coalesce(sum(battery_count), 0),
         min((at at time zone 'Asia/Kolkata')::date)
    into v_bat_kg, v_bat_count, v_bat_oldest
    from public.scrap_ledger where bin = 'batteries' and handover_id is null;
  select max(h.date) into v_bat_last from public.handovers h where h.battery_kg > 0 and h.kind = 'hub';

  select count(*)::integer into v_shelf from public.items i
   where i.category::text = 'part' and i.status::text in ('graded', 'listed', 'reserved');

  select jsonb_build_object(
           'd0_30', count(*) filter (where age <= 30),
           'd31_45', count(*) filter (where age between 31 and 45),
           'd46_plus', count(*) filter (where age > 45))
    into v_dev
    from (select v_today - (coalesce(i.listed_at, i.received_at) at time zone 'Asia/Kolkata')::date as age
            from public.items i
           where i.category::text <> 'part'
             and i.status::text in ('received', 'graded', 'listed', 'reserved', 'stripping')) a;
  select jsonb_build_object(
           'd0_30', count(*) filter (where age <= 30),
           'd31_plus', count(*) filter (where age > 30))
    into v_parts
    from (select v_today - (coalesce(i.listed_at, i.received_at) at time zone 'Asia/Kolkata')::date as age
            from public.items i
           where i.category::text = 'part' and i.status::text in ('graded', 'listed', 'reserved')) a;

  return jsonb_build_object(
    'bins', v_bins,
    'battery', jsonb_build_object(
      'kg', v_bat_kg,
      'count', v_bat_count,
      'oldest', v_bat_oldest,
      'last_handover', v_bat_last,
      -- Weekly: whenever the cabinet holds any weight and a week has passed
      -- since the last battery handover (or since the oldest entry).
      'reminder', v_bat_kg > 0 and coalesce(v_bat_last, v_bat_oldest) <= v_today - 7),
    'device_rack', jsonb_build_object(
      'slots', v_slots,
      'used', v_used,
      'pct', case when coalesce(v_slots, 0) > 0 then round(v_used * 100.0 / v_slots) end,
      'alert', case when coalesce(v_slots, 0) > 0 then v_used >= v_slots * 0.8 end),
    'parts_shelf', jsonb_build_object('count', v_shelf),
    'ages', jsonb_build_object('devices', v_dev, 'parts', v_parts));
end;
$$;
revoke execute on function public.capacity_status() from public, anon;
grant execute on function public.capacity_status() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. handover_record(): what an institution's lot contained and where its dead
--    e-waste went (a record, not a certificate)
-- ---------------------------------------------------------------------------
-- What ReLoop bought, by tag (no prices: equipment is paid on its own receipt),
-- and the kg by category the dismantling partner weighed, with their receipt
-- number in the institution's name. Staff only; the PDF is made from this.
create or replace function public.handover_record(p_lot uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l record;
  v_items jsonb;
  v_has boolean := false;
  v_receipt text;
  v_hdate date;
  v_kg jsonb := '{}'::jsonb;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can produce a handover record';
  end if;
  select il.*, i.name as institution_name into l
    from public.institution_lots il join public.institutions i on i.id = il.institution_id
   where il.id = p_lot;
  if not found then
    raise exception 'Lot not found';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'tag', t.id, 'category', t.category, 'brand', t.brand, 'model', t.model, 'grade', t.grade)
           order by t.id), '[]'::jsonb)
    into v_items
    from public.items t where t.institution_lot_id = p_lot;
  if l.handover_id is not null then
    select h.receipt_no, h.date, h.kg_by_category into v_receipt, v_hdate, v_kg
      from public.handovers h where h.id = l.handover_id;
    v_has := found;
  end if;
  return jsonb_build_object(
    'institution', l.institution_name,
    'lot_date', l.lot_date,
    'bought_items', v_items,
    'dismantler', case when v_has then 'VRRG Group' end,
    'dismantler_receipt_no', v_receipt,
    'dismantler_date', v_hdate,
    'kg_by_category', coalesce(v_kg, '{}'::jsonb));
end;
$$;
revoke execute on function public.handover_record(uuid) from public, anon;
grant execute on function public.handover_record(uuid) to authenticated;
