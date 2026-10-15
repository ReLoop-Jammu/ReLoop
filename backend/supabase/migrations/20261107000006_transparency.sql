-- Batch 24: the public ledger, monthly reports and the activity feed.
-- Every view runs as its owner and shows dates, categories and kilograms only.

-- ---------------------------------------------------------------------------
-- 1. public_ledger: every handover to VRRG Group
-- ---------------------------------------------------------------------------
-- ReLoop's own handovers carry the partner's receipt number. Institution lots
-- show "Institution lot" without a name unless the institution opted in (with
-- a consent date). Rows from before the bins keep their weight as one figure.
-- No rates, amounts, notes, item tags or receipt scans.
create or replace view public.public_ledger as
select h.date,
       case when h.kind = 'institution_lot' then 'Institution lot' else 'ReLoop hub' end as source,
       case when h.kind = 'institution_lot' and i.named_publicly and i.named_consent_at is not null
            then i.name end as institution,
       coalesce((h.kg_by_category ->> 'screens')::numeric, 0)::numeric(10, 1) as screens_kg,
       coalesce((h.kg_by_category ->> 'boards')::numeric, 0)::numeric(10, 1) as boards_kg,
       coalesce((h.kg_by_category ->> 'other')::numeric, 0)::numeric(10, 1) as other_kg,
       coalesce((h.kg_by_category ->> 'd_devices')::numeric, 0)::numeric(10, 1) as d_devices_kg,
       h.battery_kg::numeric(10, 1) as batteries_kg,
       coalesce((select sum(v.value::numeric) from jsonb_each_text(h.kg_by_category) v
                  where v.key not in ('screens', 'boards', 'other', 'd_devices') and v.value ~ '^[0-9.]+$'), 0)::numeric(10, 1)
         as before_bins_kg,
       (h.battery_kg + coalesce((select sum(v.value::numeric) from jsonb_each_text(h.kg_by_category) v
                                  where v.value ~ '^[0-9.]+$'), 0))::numeric(10, 1) as total_kg,
       case when h.kind = 'hub' then h.receipt_no end as receipt_ref
  from public.handovers h
  left join public.institution_lots l on l.handover_id = h.id
  left join public.institutions i on i.id = l.institution_id;
revoke all on public.public_ledger from anon, authenticated;
grant select on public.public_ledger to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. public_monthly_reports: one row per month with activity
-- ---------------------------------------------------------------------------
create or replace view public.public_monthly_reports as
with months as (
  select date_trunc('month', w.weighed_at at time zone 'Asia/Kolkata')::date as month from public.scrap_weighins w
  union
  select date_trunc('month', i.received_at at time zone 'Asia/Kolkata')::date from public.items i
  union
  select date_trunc('month', h.date)::date from public.handovers h
)
select m.month,
       (select coalesce(sum(w.screens_kg + w.boards_kg + w.batteries_kg + w.other_kg), 0) from public.scrap_weighins w
         where date_trunc('month', w.weighed_at at time zone 'Asia/Kolkata')::date = m.month)::numeric(10, 1) as kg_weighed,
       (select count(*) from public.scrap_weighins w
         where date_trunc('month', w.weighed_at at time zone 'Asia/Kolkata')::date = m.month)::bigint as weighins,
       (select coalesce(sum(l.total_kg), 0) from public.public_ledger l
         where date_trunc('month', l.date)::date = m.month)::numeric(10, 1) as kg_to_vrrg,
       (select count(*) from public.items i
         where i.category::text <> 'part' and i.source_type::text in ('repair_shop', 'retailer', 'institution')
           and date_trunc('month', i.received_at at time zone 'Asia/Kolkata')::date = m.month)::bigint as devices_received,
       (select count(*) from public.items i
         where i.category::text <> 'part' and i.status::text = 'sold'
           and date_trunc('month', i.sold_at at time zone 'Asia/Kolkata')::date = m.month)::bigint as devices_resold,
       (select count(*) from public.items i
         where i.category::text = 'part' and i.status::text = 'sold'
           and date_trunc('month', i.sold_at at time zone 'Asia/Kolkata')::date = m.month)::bigint as parts_sold,
       (select count(*) from public.institution_lots il
         where date_trunc('month', il.lot_date)::date = m.month)::bigint as institution_lots,
       (select count(*) from public.partners p
         where p.status::text = 'active'
           and (p.joined_at at time zone 'Asia/Kolkata')::date < (m.month + interval '1 month')::date)::bigint
         as partner_shops
  from months m
 where m.month <= date_trunc('month', now() at time zone 'Asia/Kolkata')::date;
revoke all on public.public_monthly_reports from anon, authenticated;
grant select on public.public_monthly_reports to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. activity_feed: recent events, at least a day old, date only
-- ---------------------------------------------------------------------------
-- A weigh-in names its (merged) market and the kind of shop; a listing or a
-- sale names the category; an institution lot names the kind of institution.
-- Nothing names a shop, a person or a price. The feed shows nothing at all
-- until there are 5 or more such events in the last 30 days.
create or replace view public.activity_feed as
with events as (
  select (w.weighed_at at time zone 'Asia/Kolkata')::date as day, 'weighin'::text as kind,
         'scrap'::text as category, g.market as place, g.source_group as who, w.weighed_at as at
    from public.scrap_weighins w join public.partner_market_groups g on g.partner_id = w.partner_id
  union all
  select (i.listed_at at time zone 'Asia/Kolkata')::date, 'listed', i.category::text, null, null, i.listed_at
    from public.items i where i.listed_at is not null and not i.hidden
  union all
  select (i.sold_at at time zone 'Asia/Kolkata')::date, 'sold', i.category::text, null, null, i.sold_at
    from public.items i where i.sold_at is not null and i.status::text = 'sold'
  union all
  select il.lot_date, 'institution_lot', inst.type::text, null, 'Institutions', il.lot_date::timestamptz
    from public.institution_lots il join public.institutions inst on inst.id = il.institution_id
),
aged as (
  select * from events where at <= now() - interval '24 hours'
)
select a.day, a.kind, a.category, a.place, a.who
  from aged a
 where (select count(*) from aged x where x.at >= now() - interval '30 days') >= 5
 order by a.at desc
 limit 30;
revoke all on public.activity_feed from anon, authenticated;
grant select on public.activity_feed to anon, authenticated;
