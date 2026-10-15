-- Removes everything supabase-fixes/demo-stock.sql added, plus the requests,
-- saved items and history attached to those items, and resets the tag counter
-- so the first real item takes the next tag after the samples. Run in the
-- production project's SQL editor before launch.

begin;

create temporary table demo_ids on commit drop as
  select id from public.items where source_name = 'DEMO STOCK (delete before launch)';

-- Requests (reservations, questions) made about demo items.
delete from public.submissions where item_id in (select id from demo_ids);
delete from public.warranty_claims where item_id in (select id from demo_ids);
-- History, photos and saved items go with the item (on delete cascade).
delete from public.items where id in (select id from demo_ids);

-- Tags: continue after the highest real tag (5 sample tags before the demo).
update public.item_counters
   set last_number = greatest(5, coalesce((select max(substring(id from 8)::integer) from public.items), 0))
 where hub_code = 'JMU';

select (select count(*) from demo_ids) as demo_items_removed,
       (select count(*) from public.items) as items_left,
       (select last_number from public.item_counters where hub_code = 'JMU') as next_tag_after;

commit;
