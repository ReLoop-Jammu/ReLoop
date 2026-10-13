-- The staff hub moves to Supabase: who counts as staff, tag numbering, what
-- visitors may read, and the business plan's unsold-stock rules.

-- 1. Admins count as hub staff, so the shared admin account can use the hub.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid()) or public.is_admin();
$$;

-- 2. Hub tags continue after the sample listings (shown as RL-JMU-0001..0005),
--    so a hub item never shares a tag with a listing.
update public.item_counters
   set last_number = greatest(last_number, coalesce((select max(id) from public.listings), 0)::integer)
 where hub_code = 'JMU';

-- 3. Visitors (anon) read only the shop-facing columns of items on sale, and
--    nothing from the back-office tables. Buy price, supplier name and contact,
--    payment method, faults, rack, expected resale, who created it, handover and
--    sale details stay staff-only. Signed-in users who aren't staff see no
--    items at all (every items policy for them requires is_staff()).
revoke all on public.items from anon;
grant select (id, category, part_type, grade, brand, model, description, checklist, wipe_required, wiped_at,
              list_paise, current_paise, price_cut_at, status, listed_at)
  on public.items to anon;
revoke all on public.item_photos from anon;
grant select (item_id, position, storage_path) on public.item_photos to anon;
revoke all on public.item_events, public.repair_jobs, public.handovers, public.partners, public.institutions,
              public.staff, public.consignments, public.item_counters
  from anon;

-- 4. Unsold-stock rules (business plan): at day 45 the price is cut by 20%,
--    once; at day 75 an unsold device is downgraded to C for stripping, once.
--    Running it again, daily or from the dashboard, never compounds: the cut
--    needs price_cut_at to be empty, and the downgrade moves the item off sale.
--    A cut price never drops below Rs 10, so one cheap item can't make the
--    whole run fail on the price check.
create or replace function public.apply_stock_rules(now_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  downgraded integer;
  cut integer;
begin
  update public.items
     set grade = 'C', status = 'stripping'
   where status = 'listed' and category <> 'part' and grade <> 'C'
     and listed_at <= now_at - interval '75 days';
  get diagnostics downgraded = row_count;

  update public.items
     set current_paise = greatest(round(current_paise * 0.80 / 1000) * 1000, 1000), price_cut_at = now_at
   where status = 'listed' and price_cut_at is null and current_paise is not null
     and listed_at <= now_at - interval '45 days';
  get diagnostics cut = row_count;

  return downgraded + cut;
end;
$$;
revoke execute on function public.apply_stock_rules(timestamptz) from public, anon, authenticated;

-- 5. Hub staff can run the rules from the dashboard (the daily job runs them too).
create or replace function public.run_stock_rules()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can run the stock rules';
  end if;
  return public.apply_stock_rules(now());
end;
$$;
revoke execute on function public.run_stock_rules() from public, anon;
grant execute on function public.run_stock_rules() to authenticated;

-- 6. Staff can add a note to an item's history (for example "Sent to Sharma
--    Mobiles for a screen"). Grade, status and price changes are still logged
--    by the database itself.
drop policy if exists "Staff add item notes" on public.item_events;
create policy "Staff add item notes" on public.item_events for insert to authenticated
  with check ((select public.is_staff()));
grant insert (item_id, type, note) on public.item_events to authenticated;
