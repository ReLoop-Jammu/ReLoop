-- Closing the loop: staff review shop submissions with an offer, an offered
-- submission becomes hub items without re-typing, and buyer reservations,
-- enquiries and institution pickup requests are saved for staff.

-- 1. Shop submissions: an offer, who reviewed it and when.
alter table public.shop_submissions
  add column if not exists offer_price numeric(12, 2) check (offer_price >= 0),
  add column if not exists offer_note text not null default '' check (char_length(offer_note) <= 500),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

alter table public.shop_submissions drop constraint if exists shop_submissions_status_check;
alter table public.shop_submissions add constraint shop_submissions_status_check check (status in
  ('Pending', 'Under Review', 'Offered', 'Contacted', 'Purchased', 'Rejected', 'Processing', 'Completed'));

-- Hub staff (admins included) review submissions; owners keep reading only their own.
drop policy if exists "Staff read submissions" on public.shop_submissions;
create policy "Staff read submissions" on public.shop_submissions for select to authenticated
  using ((select public.is_staff()));
drop policy if exists "Staff review submissions" on public.shop_submissions;
create policy "Staff review submissions" on public.shop_submissions for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Staff reviewing a submission need the shop's name and phone.
drop policy if exists "Staff read shop owners" on public.shop_owners;
create policy "Staff read shop owners" on public.shop_owners for select to authenticated
  using ((select public.is_staff()));

-- Owners see their offer, its note, the rejection reason and status, never internal notes.
revoke select on public.shop_submissions from anon, authenticated;
grant select (id, shop_owner_id, item_name, category_id, brand, model, description, quantity, condition,
              asking_price, image_url, status, purchase_price, rejection_reason, purchased_at, created_at,
              updated_at, offer_price, offer_note, reviewed_at)
  on public.shop_submissions to authenticated;

-- 2. Hub items remember the submission they came from (staff-only; visitors'
--    column grants on items are unchanged, so they can't read it).
alter table public.items
  add column if not exists shop_submission_id bigint references public.shop_submissions (id) on delete set null;
create index if not exists items_shop_submission_idx on public.items (shop_submission_id);

-- 3. An offered submission becomes one hub item per unit, in one step.
create or replace function public.convert_submission(
  p_submission bigint,
  p_category public.item_category,
  p_part_type public.part_type,
  p_unit_price_paise bigint
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  shop record;
  tags text[] := '{}';
  tag text;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can convert submissions';
  end if;
  if p_unit_price_paise is null or p_unit_price_paise < 0 then
    raise exception 'Enter the price paid per item';
  end if;

  select * into s from public.shop_submissions where id = p_submission for update;
  if not found then
    raise exception 'Submission % not found', p_submission;
  end if;
  if s.status <> 'Offered' then
    raise exception 'Only an offered submission can become hub items (this one is %)', s.status;
  end if;
  if exists (select 1 from public.items where shop_submission_id = p_submission) then
    raise exception 'Submission % already has hub items', p_submission;
  end if;
  select shop_name, owner_name, phone into shop from public.shop_owners where id = s.shop_owner_id;

  for i in 1 .. s.quantity loop
    insert into public.items (
      source_type, source_name, source_contact_name, source_phone, category, part_type, brand, model,
      description, faults, buy_mode, buy_paise, purchase_payment_method, shop_submission_id
    ) values (
      'repair_shop', coalesce(shop.shop_name, ''), coalesce(shop.owner_name, ''), coalesce(shop.phone, ''),
      p_category, p_part_type, left(coalesce(s.brand, ''), 40), left(coalesce(s.model, s.item_name, ''), 80),
      left(concat_ws(E'\n', s.item_name, s.description), 2000),
      'Condition reported by the shop: ' || s.condition,
      'cash', p_unit_price_paise, 'not_paid', p_submission
    )
    returning id into tag;
    tags := tags || tag;
  end loop;

  update public.shop_submissions
     set status = 'Purchased',
         purchase_price = round(p_unit_price_paise * s.quantity / 100.0, 2),
         purchased_at = now()
   where id = p_submission;

  return tags;
end;
$$;
revoke execute on function public.convert_submission(bigint, public.item_category, public.part_type, bigint)
  from public, anon;
grant execute on function public.convert_submission(bigint, public.item_category, public.part_type, bigint)
  to authenticated;

-- 4. Requests from the public (the hub's submissions table): enquiries, the
--    item they're about, and the full status flow. They arrive only through
--    the site's server route, never as direct inserts from browsers.
alter type public.submission_kind add value if not exists 'enquiry';
alter type public.submission_status add value if not exists 'sold';
alter type public.submission_status add value if not exists 'cancelled';
alter table public.submissions
  add column if not exists item_id text references public.items (id) on delete set null,
  add column if not exists handled_at timestamptz;
create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

drop policy if exists "Anyone sends a request" on public.submissions;
revoke all on public.submissions from anon;
revoke insert on public.submissions from authenticated;
