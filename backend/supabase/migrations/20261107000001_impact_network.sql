-- Batch 16: impact and network flows (public aggregates) and the buyer's area at sale.
--
-- Public views show counts and kg only, from weighed records. They run as their
-- owner, so visitors read the aggregates without any access to items, weigh-ins,
-- handovers or partners. Nothing here names a shop, a person or an address.
-- Markets with fewer than 3 active shops merge into "Other Jammu markets"; a
-- buyer area is shown only when 3 or more items went there.

-- ---------------------------------------------------------------------------
-- 1. Buyer areas: the localities staff pick at the point of sale
-- ---------------------------------------------------------------------------
create table if not exists public.buyer_areas (
  name text primary key check (char_length(name) between 2 and 60),
  sort integer not null default 100
);
alter table public.buyer_areas enable row level security;
revoke all on public.buyer_areas from anon, authenticated;
grant select on public.buyer_areas to anon, authenticated;
grant insert, update, delete on public.buyer_areas to authenticated;
drop policy if exists "Anyone reads buyer areas" on public.buyer_areas;
create policy "Anyone reads buyer areas" on public.buyer_areas for select to anon, authenticated using (true);
drop policy if exists "Admins manage buyer areas" on public.buyer_areas;
create policy "Admins manage buyer areas" on public.buyer_areas for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- About a dozen localities in the Jammu Municipal Corporation area (the delivery
-- zone, "Jammu city"), plus collection at the hub.
-- Staff review this list before launch (it is only a starting point).
insert into public.buyer_areas (name, sort) values
  ('Collected at the hub', 0),
  ('Gandhi Nagar', 11),
  ('Trikuta Nagar', 12),
  ('Channi Himmat', 13),
  ('Talab Tillo', 14),
  ('Bakshi Nagar', 15),
  ('Rehari Colony', 16),
  ('Shastri Nagar', 17),
  ('Nanak Nagar', 18),
  ('Gangyal', 19),
  ('Sainik Colony', 20),
  ('Residency Road', 21),
  ('Old Jammu city', 22),
  ('Other Jammu city area', 99)
on conflict (name) do nothing;

alter table public.items
  add column if not exists buyer_area text references public.buyer_areas (name) on update cascade on delete set null;
-- Staff set it through set_item_buyer_area() after marking an item sold; visitors
-- never read it (no column grant to anon, and sold items are in no public policy).
create or replace function public.set_item_buyer_area(p_id text, p_area text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record the buyer area';
  end if;
  if not exists (select 1 from public.items where id = p_id and status::text = 'sold') then
    raise exception 'Only a sold item has a buyer area';
  end if;
  if p_area is not null and not exists (select 1 from public.buyer_areas where name = p_area) then
    raise exception 'Unknown buyer area';
  end if;
  update public.items set buyer_area = p_area where id = p_id;
  insert into public.item_events (item_id, type, note)
  values (p_id, 'edited', 'Buyer area: ' || coalesce(p_area, 'cleared'));
end;
$$;
revoke execute on function public.set_item_buyer_area(text, text) from public, anon;
grant execute on function public.set_item_buyer_area(text, text) to authenticated;

-- The area belongs to a sale: it is cleared when the item is no longer sold.
create or replace function public.clear_buyer_area()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.buyer_area is not null and new.status::text <> 'sold' then
    new.buyer_area := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.clear_buyer_area() from public, anon, authenticated;
drop trigger if exists items_clear_buyer_area on public.items;
create trigger items_clear_buyer_area before insert or update on public.items
  for each row execute function public.clear_buyer_area();

-- ---------------------------------------------------------------------------
-- 2. Market groups: a market with fewer than 3 active shops is merged
-- ---------------------------------------------------------------------------
create or replace view public.partner_market_groups as
select p.id as partner_id,
       case
         when nullif(trim(p.market), '') is null then 'Other Jammu markets'
         when (select count(*) from public.partners q
                where q.status::text = 'active' and lower(trim(q.market)) = lower(trim(p.market))) >= 3
           then trim(p.market)
         else 'Other Jammu markets'
       end as market,
       case p.type::text when 'repair_shop' then 'Repair shops' when 'retailer' then 'Retailers' else 'Other partners' end
         as source_group
  from public.partners p;
-- Internal: only the public views below (running as their owner) read it.
revoke all on public.partner_market_groups from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. impact_flows: source group to outcome, by month, in kg and items
-- ---------------------------------------------------------------------------
-- kind scrap: weighed scrap by category (kg from weigh-ins only; "items" counts
-- weigh-ins). kind device / part: tagged items; kg only where a weight was
-- measured (never estimated here).
create or replace view public.impact_flows as
select date_trunc('month', w.weighed_at at time zone 'Asia/Kolkata')::date as month,
       g.source_group,
       case when l.handover_id is not null then 'Handed to VRRG Group' else 'At the hub' end as outcome,
       'scrap'::text as kind,
       l.bin as category,
       count(distinct w.id)::bigint as items,
       sum(l.kg)::numeric(12, 2) as kg
  from public.scrap_ledger l
  join public.scrap_weighins w on w.id = l.weighin_id
  join public.partner_market_groups g on g.partner_id = w.partner_id
 where l.source = 'weighin'
 group by 1, 2, 3, 5
union all
select date_trunc('month', i.received_at at time zone 'Asia/Kolkata')::date,
       case i.source_type::text when 'repair_shop' then 'Repair shops' when 'retailer' then 'Retailers'
                                when 'institution' then 'Institutions' else 'Other sources' end,
       case when i.grade::text in ('A', 'B') then 'Resold as devices'
            when i.grade::text = 'C' then 'Stripped for parts'
            else 'Handed to VRRG Group' end,
       'device',
       i.category::text,
       count(*)::bigint,
       coalesce(sum(i.weight_kg), 0)::numeric(12, 2)
  from public.items i
 where i.category::text <> 'part' and i.grade is not null
   and i.source_type::text in ('repair_shop', 'retailer', 'institution')
 group by 1, 2, 3, 5
union all
select date_trunc('month', i.received_at at time zone 'Asia/Kolkata')::date,
       case i.source_type::text when 'stripped' then 'Stripped from devices'
                                when 'partner_listing' then 'Partner shops (Parts Exchange)'
                                else 'Other sources' end,
       case when i.status::text = 'sold' then 'Sold as tested parts' else 'On the shelf or on sale' end,
       'part',
       i.part_type::text,
       count(*)::bigint,
       coalesce(sum(i.weight_kg), 0)::numeric(12, 2)
  from public.items i
 where i.category::text = 'part'
 group by 1, 2, 3, 5;
revoke all on public.impact_flows from anon, authenticated;
grant select on public.impact_flows to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. network_flows: market to hub, hub to buyer area, hub to VRRG Group (all time)
-- ---------------------------------------------------------------------------
create or replace view public.network_flows as
select g.market as from_node, 'ReLoop hub'::text as to_node, 'scrap'::text as kind, l.bin as category,
       count(distinct w.id)::bigint as items, sum(l.kg)::numeric(12, 2) as kg
  from public.scrap_ledger l
  join public.scrap_weighins w on w.id = l.weighin_id
  join public.partner_market_groups g on g.partner_id = w.partner_id
 where l.source = 'weighin'
 group by 1, 4
union all
select coalesce(g.market, case when i.source_type::text = 'institution' then 'Institutions' else 'Other Jammu markets' end),
       'ReLoop hub',
       case when i.category::text = 'part' then 'part' else 'device' end,
       i.category::text,
       count(*)::bigint,
       coalesce(sum(i.weight_kg), 0)::numeric(12, 2)
  from public.items i
  left join public.partner_market_groups g on g.partner_id = i.partner_id
 where i.source_type::text in ('repair_shop', 'retailer', 'institution', 'partner_listing')
 group by 1, 3, 4
union all
-- Buyer areas: only where 3 or more items went (no individual can be picked out).
select 'ReLoop hub', i.buyer_area,
       case when i.category::text = 'part' then 'part' else 'device' end,
       i.category::text,
       count(*)::bigint,
       coalesce(sum(i.weight_kg), 0)::numeric(12, 2)
  from public.items i
 where i.status::text = 'sold' and i.buyer_area is not null
 group by i.buyer_area, 3, 4
having count(*) >= 3
union all
select case h.kind when 'institution_lot' then 'Institution lots' else 'ReLoop hub' end,
       'VRRG Group', 'handover', k.key, 0::bigint, sum(k.value::numeric)::numeric(12, 2)
  from public.handovers h, jsonb_each_text(h.kg_by_category) k
 where k.value ~ '^[0-9.]+$'
 group by 1, 4
union all
select 'ReLoop hub', 'VRRG Group', 'handover', 'batteries', 0::bigint, sum(h.battery_kg)::numeric(12, 2)
  from public.handovers h
 where h.battery_kg > 0
having sum(h.battery_kg) > 0;
revoke all on public.network_flows from anon, authenticated;
grant select on public.network_flows to anon, authenticated;
