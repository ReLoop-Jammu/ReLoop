-- The item passport (v1.0.0 batch 12): every hub item that isn't hidden has
-- a public page (/passport/RL-JMU-0042) with its journey: received,
-- inspected, data wiped, sent for repair, listed, price changed, reserved,
-- sold, returned, stripped for parts, to the recycler. Only the tag, the
-- category, the stage and its date: no prices, notes, sources, buyers or
-- people. The printed tag's QR code points there.

create or replace view public.item_passport as
with item as (
  select i.id, i.category::text as category, i.part_type::text as part_type, i.inspected_at, i.wiped_at
    from public.items i
   where not i.hidden
),
from_history as (
  select e.item_id,
         case
           when e.type = 'received' then 'received'
           when e.type = 'graded' then 'graded'
           when e.type in ('price_changed', 'auto_price_cut') then 'price_changed'
           when e.type = 'returned' then 'returned'
           when e.type = 'status:out_for_repair' then 'sent_for_repair'
           when e.type = 'status:listed' then 'listed'
           when e.type = 'status:reserved' then 'reserved'
           when e.type = 'status:sold' then 'sold'
           when e.type = 'status:stripping' then 'stripped_for_parts'
           when e.type = 'status:in_scrap_cage' then 'to_recycling'
           when e.type = 'status:handed_over' then 'recycled'
         end as stage,
         e.at
    from public.item_events e
)
select item.id as item_id, item.category, item.part_type, h.stage, h.at
  from item join from_history h on h.item_id = item.id
 where h.stage is not null
   -- An item with an inspection shows it as "inspected" (below) instead of "graded".
   and not (h.stage = 'graded' and item.inspected_at is not null)
union all
select id, category, part_type, 'inspected', inspected_at from item where inspected_at is not null
union all
select id, category, part_type, 'data_wiped', wiped_at from item where wiped_at is not null;

revoke all on public.item_passport from anon, authenticated;
grant select on public.item_passport to anon, authenticated;
