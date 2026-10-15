-- Batch 20: the route run sheet and closing repair jobs.

-- ---------------------------------------------------------------------------
-- 1. route_sheet(date): who to visit on a route day
-- ---------------------------------------------------------------------------
-- Standing stops: active partner shops whose weekly route day is the date's
-- weekday and whose market has started (route.markets); retailers are monthly,
-- so they appear when they have not been weighed in for 28 days. Booked stops:
-- scheduled pickups on that date (shop lots with their item count, institution
-- bookings). Staff only: it carries phone numbers for the run sheet.
create or replace function public.route_sheet(p_date date)
returns table (
  stop_kind text,
  market text,
  name text,
  phone text,
  partner_id uuid,
  partner_type text,
  pickup_id uuid,
  pickup_source text,
  expected_items integer,
  item_label text,
  times_missed integer,
  last_weighed_at timestamptz,
  last_kg numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dow text;
  v_markets jsonb;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the route';
  end if;
  v_dow := case extract(isodow from p_date)::integer when 2 then 'tue' when 5 then 'fri' end;
  select value into v_markets from public.app_settings where key = 'route.markets';

  return query
  select 'standing'::text, p.market, p.name, p.phone, p.id, p.type::text,
         null::uuid, null::text, null::integer, null::text, 0,
         lw.weighed_at, lw.kg
    from public.partners p
    left join lateral (
      select w.weighed_at, (w.screens_kg + w.boards_kg + w.batteries_kg + w.other_kg) as kg
        from public.scrap_weighins w where w.partner_id = p.id
       order by w.weighed_at desc limit 1
    ) lw on true
   where v_dow is not null
     and p.status::text = 'active' and p.route_day = v_dow
     -- the market's start date, when the setting has one
     and coalesce(
           (select nullif(e.value ->> 'starts_on', '')::date
              from jsonb_each(case when jsonb_typeof(v_markets) = 'object' then v_markets else '{}'::jsonb end) e
             where lower(e.key) = lower(trim(p.market)) limit 1),
           p_date) <= p_date
     -- retailers are monthly
     and (p.type::text <> 'retailer' or lw.weighed_at is null or lw.weighed_at < (p_date - 28)::timestamptz)
  union all
  select 'pickup'::text,
         case when k.source = 'shop' then coalesce(nullif(trim(k.market), ''), 'Other Jammu markets') else 'Institutions' end,
         case when k.source = 'shop' then o.shop_name else k.market end,
         case when k.source = 'shop' then o.phone else null end,
         null::uuid, null::text,
         k.id, k.source,
         case when k.source = 'shop' then s.quantity else null end,
         case when k.source = 'shop' then s.item_name else null end,
         k.times_missed, null::timestamptz, null::numeric
    from public.pickups k
    left join public.shop_submissions s on s.id = k.shop_submission_id
    left join public.shop_owners o on o.id = k.shop_owner_id
   where k.status = 'scheduled' and k.route_date = p_date
   order by 2, 3;
end;
$$;
revoke execute on function public.route_sheet(date) from public, anon;
grant execute on function public.route_sheet(date) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. return_repair_job(): close a repair job and move the item on
-- ---------------------------------------------------------------------------
-- Fixed: the item goes back to "graded" to be re-tested. Not fixable: it drops
-- to grade C and is stripped for parts. The agreed fee stays on the job (staff
-- only) and is part of the item's cost.
create or replace function public.return_repair_job(p_job uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j record;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can close repair jobs';
  end if;
  if p_outcome not in ('fixed', 'not_fixable') then
    raise exception 'The outcome is fixed or not_fixable';
  end if;
  select * into j from public.repair_jobs where id = p_job for update;
  if not found then
    raise exception 'Repair job not found';
  end if;
  if j.returned_at is not null then
    raise exception 'This repair job is already closed';
  end if;
  update public.repair_jobs set returned_at = now(), outcome = p_outcome where id = p_job;
  if p_outcome = 'fixed' then
    update public.items set status = 'graded' where id = j.item_id and status::text = 'out_for_repair';
  else
    update public.items set status = 'stripping', grade = 'C' where id = j.item_id and status::text = 'out_for_repair';
  end if;
  -- The status change itself is logged by the items trigger; this adds the reason.
  insert into public.item_events (item_id, type, note)
  values (j.item_id, 'note',
          case p_outcome when 'fixed' then 'Back from repair: fixed'
                         else 'Back from repair: not fixable, downgraded to C' end);
end;
$$;
revoke execute on function public.return_repair_job(uuid, text) from public, anon;
grant execute on function public.return_repair_job(uuid, text) to authenticated;
