-- Removes everything supabase-fixes/demo-stock.sql added, with the requests
-- made about those items (their history, photos and saved-item rows go with
-- them), and resets the tag counter so the first real item takes the next tag
-- after the five samples. One single statement: run it in the production
-- project's SQL editor before launch.

with demo as (
  select id from public.items where source_name = 'DEMO STOCK (delete before launch)'
),
requests as (
  delete from public.submissions where item_id in (select id from demo) returning 1
),
claims as (
  delete from public.warranty_claims where item_id in (select id from demo) returning 1
),
removed as (
  delete from public.items where id in (select id from demo) returning id
)
update public.item_counters
   set last_number = greatest(
         5,
         coalesce((select max(substring(i.id from 8)::integer) from public.items i
                    where i.source_name is distinct from 'DEMO STOCK (delete before launch)'), 0))
 where hub_code = 'JMU'
returning (select count(*) from removed) as demo_items_removed,
          (select count(*) from requests) as requests_removed,
          last_number as tags_continue_after;
