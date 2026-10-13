-- The home page's impact counter: three totals, nothing else. The view runs as
-- its owner, so visitors read the totals without any access to items,
-- handovers or partners themselves. Sample listings live in public.listings,
-- not in items, so they can never be counted.
create or replace view public.impact_totals as
select
  -- Items graded A, B or C, i.e. resold, repaired or reused as parts. Parts
  -- stripped from a C item aren't counted again (same rule as the dashboard).
  (select count(*) from public.items i
    where i.grade in ('A', 'B', 'C') and i.source_type <> 'stripped')::bigint as items_reused,
  -- Kilograms handed to the authorised recycler: every category plus batteries.
  (select coalesce(sum(h.battery_kg), 0)
          + coalesce(sum((select coalesce(sum(v.value::numeric), 0)
                            from jsonb_each_text(h.kg_by_category) v)), 0)
     from public.handovers h)::numeric(10, 1) as kg_recycled,
  -- Partner shops the hub marks active.
  (select count(*) from public.partners p where p.status = 'active')::bigint as active_partner_shops;

revoke all on public.impact_totals from anon, authenticated;
grant select on public.impact_totals to anon, authenticated;
