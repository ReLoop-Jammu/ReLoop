-- Batch 25: the live count on the data-wipe standard page.
-- Counts only: how many items were wiped, by method, and how many boards.
create or replace view public.public_wipe_stats as
select count(*) filter (where i.wiped_at is not null)::bigint as wiped_total,
       count(*) filter (where i.wiped_at is not null and i.wipe_method::text = 'reset_overwrite')::bigint as reset_overwrite,
       count(*) filter (where i.wiped_at is not null and i.wipe_method::text = 'drive_wipe')::bigint as drive_wipe,
       count(*) filter (where i.wiped_at is not null and i.wipe_method::text = 'drilled')::bigint as storage_destroyed,
       count(*) filter (where i.wiped_at is not null and i.category::text = 'part' and i.part_type::text = 'board')::bigint
         as boards_wiped,
       (max(i.wiped_at) at time zone 'Asia/Kolkata')::date as last_wiped_on
  from public.items i;
revoke all on public.public_wipe_stats from anon, authenticated;
grant select on public.public_wipe_stats to anon, authenticated;
