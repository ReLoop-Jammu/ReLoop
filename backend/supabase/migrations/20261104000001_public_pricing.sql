-- Public pricing (v1.0.0 batch 13). Staff record reference prices (the used
-- market price of a working unit, low / typical / high, with the source and
-- the date checked) and, per item, the price new. Visitors see:
--   * the fair-price band for a listed item, only while its reference is
--     fresh (pricing.reference_fresh_days, default 180): grade A uses the
--     band, grade B the band times pricing.grade_b_factor (default 0.75),
--     parts use part references, grade D has none;
--   * "about ₹X less than new" when a fresh new price is recorded;
--   * the item's own price history since it was listed.
-- Never buy prices, costs, margins or suppliers.

create table if not exists public.reference_prices (
  id uuid primary key default gen_random_uuid(),
  category public.item_category not null,
  part_type public.part_type,
  -- Empty brand and model: the reference for the whole category (or part type).
  brand text not null default '' check (char_length(brand) <= 40),
  model text not null default '' check (char_length(model) <= 80),
  low_paise bigint not null check (low_paise > 0),
  typical_paise bigint not null,
  high_paise bigint not null,
  source text not null check (char_length(source) between 3 and 200),
  checked_on date not null,
  note text not null default '' check (char_length(note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint reference_prices_order check (low_paise <= typical_paise and typical_paise <= high_paise),
  constraint reference_prices_part check ((category = 'part') = (part_type is not null))
);
create unique index if not exists reference_prices_one_per_model
  on public.reference_prices (category, part_type, lower(brand), lower(model)) nulls not distinct;

alter table public.reference_prices enable row level security;
revoke all on public.reference_prices from anon, authenticated;
grant select, insert, update, delete on public.reference_prices to authenticated;
drop policy if exists "Staff manage reference prices" on public.reference_prices;
create policy "Staff manage reference prices" on public.reference_prices for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- The price of the item new, where staff found one.
alter table public.items
  add column if not exists new_price_paise bigint check (new_price_paise > 0),
  add column if not exists new_price_source text not null default '' check (char_length(new_price_source) <= 200),
  add column if not exists new_price_checked_on date;
grant update (new_price_paise, new_price_source, new_price_checked_on) on public.items to authenticated;

-- What visitors see about each listed item's price. The band comes from the
-- most specific fresh reference: the item's own brand and model, else its
-- category (or part type).
create or replace view public.public_price_bands as
-- The two public settings, read here (not through a function, which visitors
-- would need the right to call), with their defaults.
with settings as (
  select coalesce((select (v.value #>> '{}')::integer from public.app_settings v
                    where v.key = 'pricing.reference_fresh_days' and jsonb_typeof(v.value) = 'number'), 180)
           as fresh_days,
         coalesce((select (v.value #>> '{}')::numeric from public.app_settings v
                    where v.key = 'pricing.grade_b_factor' and jsonb_typeof(v.value) = 'number'), 0.75)
           as b_factor
),
on_sale as (
  select i.id, i.category, i.part_type, i.brand, i.model, i.grade, i.current_paise,
         i.new_price_paise, i.new_price_source, i.new_price_checked_on
    from public.items i
   where i.status::text in ('listed', 'reserved') and not i.hidden
),
ref as (
  select distinct on (o.id) o.id as item_id, r.low_paise, r.typical_paise, r.high_paise, r.source, r.checked_on,
         case when r.brand = '' and r.model = '' then 'category' else 'model' end as scope
    from on_sale o
    join public.reference_prices r
      on r.category = o.category
     and r.part_type is not distinct from o.part_type
     and (r.brand = '' or lower(r.brand) = lower(o.brand))
     and (r.model = '' or lower(r.model) = lower(o.model))
    cross join settings s
   where r.checked_on >= current_date - s.fresh_days
   order by o.id, (r.model <> '') desc, (r.brand <> '') desc, r.checked_on desc
)
select o.id as item_id,
       case when o.grade = 'A' or (o.grade = 'C' and o.category = 'part') then ref.low_paise
            when o.grade = 'B' then round(ref.low_paise * s.b_factor)::bigint end as band_low_paise,
       case when o.grade = 'A' or (o.grade = 'C' and o.category = 'part') then ref.high_paise
            when o.grade = 'B' then round(ref.high_paise * s.b_factor)::bigint end as band_high_paise,
       case when ref.item_id is not null and o.grade in ('A', 'B', 'C') then ref.source end as band_source,
       case when ref.item_id is not null and o.grade in ('A', 'B', 'C') then ref.checked_on end as band_checked_on,
       case when ref.item_id is not null and o.grade in ('A', 'B', 'C') then ref.scope end as band_scope,
       case when o.new_price_checked_on >= current_date - s.fresh_days then o.new_price_paise end as new_price_paise,
       case when o.new_price_checked_on >= current_date - s.fresh_days then nullif(o.new_price_source, '') end
         as new_price_source,
       case when o.new_price_checked_on >= current_date - s.fresh_days then o.new_price_checked_on end
         as new_price_checked_on
  from on_sale o
  cross join settings s
  left join ref on ref.item_id = o.id;

revoke all on public.public_price_bands from anon, authenticated;
grant select on public.public_price_bands to anon, authenticated;

-- A listed item's prices since it was last listed: the listing price, then
-- each change (the history records them as "old → new" in rupees).
create or replace view public.public_price_history as
select i.id as item_id, i.listed_at as at, i.list_paise as price_paise
  from public.items i
 where i.status::text in ('listed', 'reserved') and not i.hidden and i.listed_at is not null
   and i.list_paise is not null
union all
select i.id, e.at, (split_part(e.note, ' → ', 2)::numeric * 100)::bigint
  from public.items i
  join public.item_events e on e.item_id = i.id and e.type = 'price_changed'
 where i.status::text in ('listed', 'reserved') and not i.hidden and i.listed_at is not null
   and e.at >= i.listed_at
   and e.note ~ '^[0-9]+ → [0-9]+$';

revoke all on public.public_price_history from anon, authenticated;
grant select on public.public_price_history to anon, authenticated;
