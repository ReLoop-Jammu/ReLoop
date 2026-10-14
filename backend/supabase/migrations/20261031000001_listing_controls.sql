-- Listing controls (v1.0.0 batch 09):
--   1. items.hidden: a hidden item drops out of every public view (and its
--      photos with it), whatever its status;
--   2. status "returned": a sold item comes back (from there staff put it
--      back on sale or send it to the scrap cage);
--   3. staff edit brand, model and description after intake, with a reason
--      that goes into the item's history;
--   4. the history also records data wipes and hiding, which the database
--      didn't log before (so nothing staff do is lost from the timeline).
--
-- The new enum value is only used inside function bodies or as text here:
-- Postgres can't use a value added in the same transaction.

alter type public.item_status add value if not exists 'returned';

alter table public.items
  add column if not exists hidden boolean not null default false,
  add column if not exists returned_at timestamptz;

-- 1. Visitors see stock on sale that isn't hidden, and only its photos.
drop policy if exists "Anyone reads stock on sale" on public.items;
create policy "Anyone reads stock on sale" on public.items for select to anon
  using (status in ('listed', 'reserved') and not hidden);
drop policy if exists "Anyone sees photos of stock on sale" on public.item_photos;
-- The items policy above already limits visitors to stock on sale that isn't
-- hidden, and it applies inside this check too (so visitors don't need to
-- read the hidden column, which stays out of their column grant).
create policy "Anyone sees photos of stock on sale" on public.item_photos for select to anon
  using (exists (select 1 from public.items i where i.id = item_id));

-- 2 and 4. The history: grade, status, price, data wipe, hiding and returns.
create or replace function public.log_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.item_events (item_id, type, note)
    values (new.id, 'received', 'From ' || replace(new.source_type::text, '_', ' '));
    return null;
  end if;
  if new.grade is distinct from old.grade then
    insert into public.item_events (item_id, type, note) values (new.id, 'graded', 'Grade ' || new.grade);
  end if;
  if new.status is distinct from old.status then
    insert into public.item_events (item_id, type) values (new.id, 'status:' || new.status);
  end if;
  if new.current_paise is distinct from old.current_paise and old.current_paise is not null then
    insert into public.item_events (item_id, type, note)
    values (new.id, 'price_changed', (old.current_paise / 100)::text || ' → ' || (new.current_paise / 100)::text);
  end if;
  if new.wiped_at is distinct from old.wiped_at and new.wiped_at is not null then
    insert into public.item_events (item_id, type, note)
    values (new.id, 'data_wiped', coalesce(replace(new.wipe_method::text, '_', ' + '), ''));
  end if;
  if new.hidden is distinct from old.hidden then
    insert into public.item_events (item_id, type)
    values (new.id, case when new.hidden then 'hidden' else 'unhidden' end);
  end if;
  return null;
end;
$$;

-- A sold item that comes back: kept with its sale, marked returned, with the reason.
create or replace function public.mark_item_returned(p_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  i record;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record a return';
  end if;
  if v_reason is null or char_length(v_reason) not between 3 and 300 then
    raise exception 'Give the reason for the return (3 to 300 characters)';
  end if;
  select * into i from public.items where id = p_id for update;
  if not found then
    raise exception 'Item % not found', p_id;
  end if;
  if i.status::text <> 'sold' then
    raise exception 'Only a sold item can come back (this one is %)', i.status;
  end if;
  -- The sale is reversed: its date, price and fulfilment leave the item (so it
  -- no longer counts as a sale, and a later sale records its own), and stay in
  -- the history with the reason.
  update public.items
     set status = 'returned', returned_at = now(), sold_at = null, sold_paise = null, fulfilment = null
   where id = p_id;
  insert into public.item_events (item_id, type, note)
  values (p_id, 'returned', left(v_reason || coalesce(' (sold ' || to_char(i.sold_at at time zone 'Asia/Kolkata', 'FMDD Mon YYYY')
                                   || coalesce(' for ₹' || (i.sold_paise / 100)::text, '') || ')', ''), 500));
end;
$$;
revoke execute on function public.mark_item_returned(text, text) from public, anon;
grant execute on function public.mark_item_returned(text, text) to authenticated;

-- 3. Staff correct an item's brand, model and description, saying why. The
--    history records which fields changed and the reason (not the old text).
create or replace function public.edit_item_details(
  p_id text,
  p_brand text,
  p_model text,
  p_description text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_brand text := left(trim(coalesce(p_brand, '')), 40);
  v_model text := left(trim(coalesce(p_model, '')), 80);
  v_description text := left(trim(coalesce(p_description, '')), 2000);
  i record;
  changed text[] := '{}';
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can edit items';
  end if;
  if v_reason is null or char_length(v_reason) not between 3 and 300 then
    raise exception 'Say why you are changing it (3 to 300 characters)';
  end if;
  select * into i from public.items where id = p_id for update;
  if not found then
    raise exception 'Item % not found', p_id;
  end if;
  if v_brand is distinct from i.brand then changed := changed || 'brand'::text; end if;
  if v_model is distinct from i.model then changed := changed || 'model'::text; end if;
  if v_description is distinct from i.description then changed := changed || 'description'::text; end if;
  if cardinality(changed) = 0 then
    raise exception 'Nothing changed';
  end if;
  update public.items set brand = v_brand, model = v_model, description = v_description where id = p_id;
  insert into public.item_events (item_id, type, note)
  values (p_id, 'edited', left(array_to_string(changed, ', ') || ': ' || v_reason, 500));
end;
$$;
revoke execute on function public.edit_item_details(text, text, text, text, text) from public, anon;
grant execute on function public.edit_item_details(text, text, text, text, text) to authenticated;

-- Brand, model and description change only through edit_item_details(), so
-- every correction carries its reason. Staff keep updating everything else.
revoke update on public.items from authenticated;
grant update (received_at, source_type, partner_id, institution_id, source_name, source_contact_name,
              source_phone, category, part_type, has_battery, weight_kg, grade, graded_at, checklist, faults,
              wipe_required, wipe_method, wiped_at, rack, buy_mode, buy_paise, purchase_payment_method,
              purchase_reference, purchase_paid_at, expected_resale_paise, list_paise, current_paise,
              price_cut_at, status, listed_at, sold_at, sold_paise, fulfilment, parent_id, handover_id, hidden)
  on public.items to authenticated;

-- Photo files: visitors can list only the photos of stock on sale that isn't
-- hidden (the items policy decides, as for item_photos); staff list them all.
-- The shop shows photos through the bucket's public addresses, which this
-- doesn't change; their file names can't be guessed.
drop policy if exists "Item photos are publicly readable" on storage.objects;
create policy "Item photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'item-photos'
    and ((select public.is_staff())
         or exists (select 1 from public.items i where i.id = split_part(name, '/', 1)))
  );
