-- Business Plan v2, step 3 (batch 15b): the Jammu Parts Exchange (ADR 0005).
-- Verified partner shops list tested parts they harvest. The part comes to the
-- hub on the route; staff tag, test, wipe where needed and approve it; it shows
-- as "Listed by <shop>, tested by ReLoop". The buyer pays ReLoop. ReLoop is the
-- seller of record, records a 12% commission when it sells, handles the 7-day
-- return and pays the shop its share after day 7.

-- ---------------------------------------------------------------------------
-- 1. Items listed by a partner
-- ---------------------------------------------------------------------------
alter table public.items
  add column if not exists listed_by_partner_id uuid references public.partners (id) on delete set null,
  add column if not exists commission_pct numeric(4, 1) check (commission_pct between 0 and 30),
  add column if not exists partner_reminded_at timestamptz;

alter table public.items drop constraint if exists partner_listing_shape;
alter table public.items add constraint partner_listing_shape check (
  source_type::text <> 'partner_listing'
  or (category = 'part' and buy_paise = 0 and listed_by_partner_id is not null and commission_pct is not null)
);

-- ---------------------------------------------------------------------------
-- 2. The shop's listing request
-- ---------------------------------------------------------------------------
create table if not exists public.part_listings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete restrict,
  shop_owner_id uuid not null references public.shop_owners (id) on delete cascade,
  part_type public.part_type not null,
  brand text not null default '' check (char_length(brand) <= 40),
  model text not null default '' check (char_length(model) <= 80),
  description text not null default '' check (char_length(description) <= 500),
  asking_paise bigint not null check (asking_paise between 1000 and 100000000),
  -- The shop agrees to be named on the listing ("Listed by <shop>, <market>").
  agree_named boolean not null check (agree_named),
  -- Private bucket paths (part-listing-photos/<owner id>/...).
  photos text[] not null default '{}' check (cardinality(photos) <= 3),
  status text not null default 'submitted'
    check (status in ('submitted', 'at_hub', 'approved', 'rejected', 'withdrawn')),
  reject_reason text not null default '' check (char_length(reject_reason) <= 300),
  item_id text unique references public.items (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists part_listings_owner_idx on public.part_listings (shop_owner_id, created_at desc);
create index if not exists part_listings_status_idx on public.part_listings (status, created_at);

alter table public.part_listings enable row level security;
revoke all on public.part_listings from anon, authenticated;
grant select on public.part_listings to authenticated;
drop policy if exists "Owners and staff read part listings" on public.part_listings;
create policy "Owners and staff read part listings" on public.part_listings for select to authenticated
  using (shop_owner_id = (select auth.uid()) or (select public.is_staff()));

-- Whether the caller is a verified shop owner linked to an active partner.
create or replace function public.can_list_parts()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.shop_owners o
      join public.partners p on p.shop_owner_id = o.id
     where o.id = auth.uid() and o.verification_status = 'verified' and p.status::text = 'active');
$$;
revoke execute on function public.can_list_parts() from public, anon;
grant execute on function public.can_list_parts() to authenticated;

-- Private bucket for the shop's photos: 5 MB, JPEG, PNG or WebP, never public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('part-listing-photos', 'part-listing-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Partners upload their part photos" on storage.objects;
create policy "Partners upload their part photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'part-listing-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select public.can_list_parts()));
drop policy if exists "Owners and staff read part photos" on storage.objects;
create policy "Owners and staff read part photos" on storage.objects for select to authenticated
  using (bucket_id = 'part-listing-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));
drop policy if exists "Owners and staff delete part photos" on storage.objects;
create policy "Owners and staff delete part photos" on storage.objects for delete to authenticated
  using (bucket_id = 'part-listing-photos'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));

-- The shop submits a listing.
create or replace function public.submit_part_listing(
  p_part_type public.part_type,
  p_brand text,
  p_model text,
  p_description text,
  p_asking_paise bigint,
  p_agree_named boolean,
  p_photos text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner uuid;
  v_id uuid;
begin
  if not public.can_list_parts() then
    raise exception 'Only verified partner shops can list parts';
  end if;
  if p_part_type::text not in ('screen', 'board', 'camera', 'charging_port', 'battery', 'ram', 'storage') then
    raise exception 'The Parts Exchange takes boards, screens, cameras, charging ports, batteries, RAM and SSDs';
  end if;
  if not coalesce(p_agree_named, false) then
    raise exception 'Agree to be named on the listing to list a part';
  end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) ph where ph not like auth.uid()::text || '/%') then
    raise exception 'Photos must be your own uploads';
  end if;
  select id into v_partner from public.partners where shop_owner_id = auth.uid() and status::text = 'active';
  insert into public.part_listings (partner_id, shop_owner_id, part_type, brand, model, description, asking_paise,
                                    agree_named, photos)
  values (v_partner, auth.uid(), p_part_type, left(trim(coalesce(p_brand, '')), 40),
          left(trim(coalesce(p_model, '')), 80), left(trim(coalesce(p_description, '')), 500), p_asking_paise,
          true, coalesce(p_photos, '{}'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_part_listing(public.part_type, text, text, text, bigint, boolean, text[])
  from public, anon;
grant execute on function public.submit_part_listing(public.part_type, text, text, text, bigint, boolean, text[])
  to authenticated;

-- The shop withdraws a listing that is not yet approved.
create or replace function public.withdraw_part_listing(p_listing uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.part_listings set status = 'withdrawn', reviewed_at = now()
   where id = p_listing and shop_owner_id = auth.uid() and status in ('submitted', 'at_hub');
  if not found then
    raise exception 'This listing can no longer be withdrawn';
  end if;
end;
$$;
revoke execute on function public.withdraw_part_listing(uuid) from public, anon;
grant execute on function public.withdraw_part_listing(uuid) to authenticated;

-- Staff: the part arrived at the hub. It gets its tag (source "partner listing",
-- no buy price, the commission rate stored on the row) and is tested like any part.
create or replace function public.receive_part_listing(p_listing uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
  v_pct numeric;
  v_name text;
  v_tag text;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can receive listings';
  end if;
  select * into l from public.part_listings where id = p_listing for update;
  if not found or l.status <> 'submitted' then
    raise exception 'Only a submitted listing can be received';
  end if;
  select coalesce((value #>> '{}')::numeric, 12) into v_pct from public.app_settings
   where key = 'rate_card.commission_pct' and jsonb_typeof(value) = 'number';
  select name into v_name from public.partners where id = l.partner_id;
  insert into public.items (source_type, category, part_type, brand, model, description, buy_mode, buy_paise,
                            listed_by_partner_id, commission_pct, source_name, ownership_confirmed_at)
  values ('partner_listing', 'part', l.part_type, l.brand, l.model, l.description, 'free', 0,
          l.partner_id, coalesce(v_pct, 12), coalesce(v_name, ''), now())
  returning id into v_tag;
  update public.part_listings set status = 'at_hub', item_id = v_tag where id = p_listing;
  perform public.notify(l.shop_owner_id, 'part_received', 'ReLoop received your part ' || v_tag,
    'We will test it and tell you when it is listed.', '/account');
  return v_tag;
end;
$$;
revoke execute on function public.receive_part_listing(uuid) from public, anon;
grant execute on function public.receive_part_listing(uuid) to authenticated;

-- Staff approve: the part is tested (inspected) and wiped where needed, and goes on
-- sale at the shop's asking price. Nothing is listed without both.
create or replace function public.approve_part_listing(p_listing uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
  i record;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can approve listings';
  end if;
  select * into l from public.part_listings where id = p_listing for update;
  if not found or l.status <> 'at_hub' or l.item_id is null then
    raise exception 'Receive the part at the hub first';
  end if;
  select * into i from public.items where id = l.item_id;
  if i.inspected_at is null then
    raise exception 'Test and inspect the part before approving it';
  end if;
  if i.wipe_required and i.wiped_at is null then
    raise exception 'Wipe the part (reset and overwrite) before approving it';
  end if;
  update public.items
     set grade = coalesce(grade, 'C'), list_paise = l.asking_paise, current_paise = l.asking_paise,
         status = 'listed', listed_at = coalesce(listed_at, now())
   where id = l.item_id;
  update public.part_listings set status = 'approved', reviewed_at = now() where id = p_listing;
  perform public.notify(l.shop_owner_id, 'part_listed', 'Your part ' || l.item_id || ' is listed',
    'It is now on the Jammu Parts Exchange.', '/account');
end;
$$;
revoke execute on function public.approve_part_listing(uuid) from public, anon;
grant execute on function public.approve_part_listing(uuid) to authenticated;

create or replace function public.reject_part_listing(p_listing uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can reject listings';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Tell the shop why (at least 5 characters)';
  end if;
  select * into l from public.part_listings where id = p_listing for update;
  if not found or l.status not in ('submitted', 'at_hub') then
    raise exception 'This listing can no longer be rejected';
  end if;
  update public.part_listings
     set status = 'rejected', reject_reason = left(trim(p_reason), 300), reviewed_at = now()
   where id = p_listing;
  if l.item_id is not null then
    update public.items set hidden = true, status = 'in_scrap_cage', grade = 'D' where id = l.item_id and status::text in ('received', 'graded');
  end if;
  perform public.notify(l.shop_owner_id, 'part_rejected', 'Your part listing was not approved',
    left(trim(p_reason), 300), '/account');
end;
$$;
revoke execute on function public.reject_part_listing(uuid, text) from public, anon;
grant execute on function public.reject_part_listing(uuid, text) to authenticated;

-- The shop's own listings and what each earned (its share is its own money).
create or replace function public.my_part_listings()
returns table (id uuid, part_type text, brand text, model text, asking_paise bigint, status text, reject_reason text,
               item_id text, item_status text, sold_paise bigint, shop_share_paise bigint, payout_due_on date,
               created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select l.id, l.part_type::text, l.brand, l.model, l.asking_paise, l.status, l.reject_reason, l.item_id,
         i.status::text, s.sold_paise, s.shop_share_paise, s.payout_due_on, l.created_at
    from public.part_listings l
    left join public.items i on i.id = l.item_id
    left join public.exchange_sales s on s.item_id = l.item_id
   where auth.uid() is not null and l.shop_owner_id = auth.uid()
   order by l.created_at desc;
end;
$$;
revoke execute on function public.my_part_listings() from public, anon;
grant execute on function public.my_part_listings() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Sales: commission recorded, the shop paid after the 7-day return window
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_sales (
  id uuid primary key default gen_random_uuid(),
  item_id text not null unique references public.items (id) on delete restrict,
  partner_id uuid references public.partners (id) on delete set null,
  sold_paise bigint not null check (sold_paise >= 0),
  commission_pct numeric(4, 1) not null,
  -- ReLoop's income on the sale (the buyer never sees it).
  commission_paise bigint not null check (commission_paise >= 0),
  shop_share_paise bigint not null check (shop_share_paise >= 0),
  sold_at timestamptz not null default now(),
  -- The shop is paid after the 7-day return window, if the part was not refunded.
  payout_due_on date not null,
  status text not null default 'sold' check (status in ('sold', 'refunded', 'paid'))
);
alter table public.exchange_sales enable row level security;
revoke all on public.exchange_sales from anon, authenticated;
grant select on public.exchange_sales to authenticated;
drop policy if exists "Staff read exchange sales" on public.exchange_sales;
create policy "Staff read exchange sales" on public.exchange_sales for select to authenticated
  using ((select public.is_staff()));

alter table public.payouts drop constraint if exists payouts_exchange_sale_fk;
alter table public.payouts add constraint payouts_exchange_sale_fk
  foreign key (exchange_sale_id) references public.exchange_sales (id) on delete restrict;

create or replace function public.record_exchange_sale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sold bigint := coalesce(new.sold_paise, new.current_paise, 0);
  v_comm bigint;
begin
  if new.listed_by_partner_id is not null and new.status::text = 'sold' and old.status::text <> 'sold' then
    v_comm := round(v_sold * coalesce(new.commission_pct, 12) / 100.0);
    insert into public.exchange_sales (item_id, partner_id, sold_paise, commission_pct, commission_paise,
                                       shop_share_paise, sold_at, payout_due_on)
    values (new.id, new.listed_by_partner_id, v_sold, coalesce(new.commission_pct, 12), v_comm, v_sold - v_comm,
            coalesce(new.sold_at, now()), ((coalesce(new.sold_at, now())) at time zone 'Asia/Kolkata')::date + 7)
    on conflict (item_id) do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function public.record_exchange_sale() from public, anon, authenticated;
drop trigger if exists items_exchange_sale on public.items;
create trigger items_exchange_sale after update of status on public.items
  for each row execute function public.record_exchange_sale();

-- Pays the shop its share once the return window has passed and no return is open.
create or replace function public.pay_part_sale(p_sale uuid, p_method text default 'upi')
returns table (receipt_no text, amount_paise bigint, receipt_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_owner uuid;
  v_receipt text;
  v_token text;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can pay shops';
  end if;
  select * into s from public.exchange_sales where id = p_sale for update;
  if not found then
    raise exception 'Sale not found';
  end if;
  if s.status <> 'sold' then
    raise exception 'This sale is %', s.status;
  end if;
  if (now() at time zone 'Asia/Kolkata')::date < s.payout_due_on then
    raise exception 'The shop is paid after the 7-day return window (from %)', s.payout_due_on;
  end if;
  if exists (select 1 from public.warranty_claims c where c.item_id = s.item_id and c.closed_at is null) then
    raise exception 'A return on this part is still open';
  end if;
  if coalesce(p_method, 'upi') not in ('upi', 'cash') then
    raise exception 'Payouts are UPI or cash';
  end if;
  select shop_owner_id into v_owner from public.partners where id = s.partner_id;
  v_receipt := 'RL-PAY-' || extract(year from now() at time zone 'Asia/Kolkata')::integer || '-'
    || lpad(public.next_payout_number(extract(year from now() at time zone 'Asia/Kolkata')::integer)::text, 4, '0');
  insert into public.payouts (receipt_no, exchange_sale_id, shop_owner_id, partner_id, amount_paise, method, paid_at,
                              line, created_by)
  values (v_receipt, p_sale, v_owner, s.partner_id, s.shop_share_paise, coalesce(p_method, 'upi'),
          (now() at time zone 'Asia/Kolkata')::date, 'part_sale', auth.uid())
  returning payouts.receipt_token into v_token;
  update public.exchange_sales set status = 'paid' where id = p_sale;
  perform public.notify(v_owner, 'payout_made', 'ReLoop paid you ₹' || to_char(s.shop_share_paise / 100.0, 'FM9999999990.00'),
    'Your part ' || s.item_id || ' sold. Receipt ' || v_receipt || '.', '/account');
  return query select v_receipt, s.shop_share_paise, v_token;
end;
$$;
revoke execute on function public.pay_part_sale(uuid, text) from public, anon;
grant execute on function public.pay_part_sale(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. What visitors see: parts, separately from devices, with the shop's name
--    only where it agreed. No commission, no buy price, no source column.
-- ---------------------------------------------------------------------------
create or replace view public.parts_exchange_listings as
select i.id as item_id, i.part_type::text as part_type, i.brand, i.model, i.description,
       i.current_paise, i.price_cut_at, i.listed_at, i.status::text as status,
       case when pl.agree_named then p.name end as listed_by_name,
       case when pl.agree_named then nullif(p.market, '') end as listed_by_market
  from public.items i
  left join public.part_listings pl on pl.item_id = i.id
  left join public.partners p on p.id = i.listed_by_partner_id
 where i.category = 'part' and i.status::text in ('listed', 'reserved') and not i.hidden;
revoke all on public.parts_exchange_listings from anon, authenticated;
grant select on public.parts_exchange_listings to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Returns: 7 days for parts (a fault, doesn't work when fitted, doesn't fit
--    the stated model, undamaged); 30 days for grade A and B devices.
-- ---------------------------------------------------------------------------
alter table public.warranty_claims
  add column if not exists kind text not null default 'warranty' check (kind in ('warranty', 'part_return'));

create or replace function public.under_warranty(p_item text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.items i
     where i.id = p_item and i.status::text = 'sold' and i.sold_at is not null
       and ((i.grade in ('A', 'B') and i.category <> 'part' and i.sold_at >= now() - interval '30 days')
         or (i.category = 'part' and i.sold_at >= now() - interval '7 days'))
  );
$$;
revoke execute on function public.under_warranty(text) from public, anon, authenticated;

create or replace function public.my_warranty_items()
returns table (item_id text, title text, grade text, sold_at timestamptz, days_left integer, claim_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (i.id) i.id, nullif(trim(concat_ws(' ', i.brand, i.model)), ''), i.grade::text, i.sold_at,
         case when i.sold_at is null then 0
              when i.category = 'part' then greatest(0, 7 - floor(extract(epoch from now() - i.sold_at) / 86400)::integer)
              when i.grade in ('A', 'B') then greatest(0, 30 - floor(extract(epoch from now() - i.sold_at) / 86400)::integer)
              else 0 end,
         (select c.status from public.warranty_claims c where c.item_id = i.id and c.buyer_id = auth.uid()
           order by c.created_at desc limit 1)
    from public.submissions s
    join public.items i on i.id = s.item_id
   where auth.uid() is not null and s.buyer_id = auth.uid() and s.kind = 'reservation'
     and s.status::text = 'sold' and i.status::text = 'sold'
   order by i.id, i.sold_at desc;
$$;
revoke execute on function public.my_warranty_items() from public, anon;
grant execute on function public.my_warranty_items() to authenticated;

create or replace function public.open_warranty_claim(p_item text, p_fault text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault text := nullif(trim(coalesce(p_fault, '')), '');
  v_id uuid;
  v_kind text;
begin
  if auth.uid() is null then
    raise exception 'Log in first';
  end if;
  if not exists (select 1 from public.submissions s
                  where s.buyer_id = auth.uid() and s.item_id = p_item and s.kind = 'reservation'
                    and s.status::text = 'sold') then
    raise exception 'This item wasn''t bought through your account. Message ReLoop with its ID instead.';
  end if;
  if not public.under_warranty(p_item) then
    raise exception 'This item is no longer covered (grade A and B devices, 30 days; parts, 7 days from the sale)';
  end if;
  if v_fault is null or char_length(v_fault) not between 5 and 1000 then
    raise exception 'Describe what went wrong (5 to 1000 characters)';
  end if;
  if exists (select 1 from public.warranty_claims c
              where c.item_id = p_item and c.status in ('open', 'approved', 'repairing')) then
    raise exception 'There is already an open claim for this item';
  end if;
  select case when category = 'part' then 'part_return' else 'warranty' end into v_kind
    from public.items where id = p_item;
  insert into public.warranty_claims (item_id, buyer_id, opened_by, fault, kind)
  values (p_item, auth.uid(), 'buyer', v_fault, v_kind)
  returning id into v_id;
  insert into public.item_events (item_id, type, note)
  values (p_item, case v_kind when 'part_return' then 'part_return' else 'warranty_claim' end, 'Opened by the buyer');
  return v_id;
end;
$$;
revoke execute on function public.open_warranty_claim(text, text) from public, anon;
grant execute on function public.open_warranty_claim(text, text) to authenticated;

create or replace function public.log_warranty_claim(p_item text, p_name text, p_phone text, p_fault text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault text := nullif(trim(coalesce(p_fault, '')), '');
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_phone text := left(trim(coalesce(p_phone, '')), 20);
  v_id uuid;
  v_kind text;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can log claims';
  end if;
  if not public.under_warranty(p_item) then
    raise exception 'This item is not covered (sold grade A or B devices, 30 days; parts, 7 days from the sale)';
  end if;
  if v_fault is null or char_length(v_fault) not between 5 and 1000 then
    raise exception 'Describe what went wrong (5 to 1000 characters)';
  end if;
  if v_name = '' or char_length(regexp_replace(v_phone, '\D', '', 'g')) < 10 then
    raise exception 'Add the buyer''s name and a phone number with at least 10 digits';
  end if;
  if exists (select 1 from public.warranty_claims c
              where c.item_id = p_item and c.status in ('open', 'approved', 'repairing')) then
    raise exception 'There is already an open claim for this item';
  end if;
  select case when category = 'part' then 'part_return' else 'warranty' end into v_kind
    from public.items where id = p_item;
  insert into public.warranty_claims (item_id, opened_by, contact_name, contact_phone, fault, kind)
  values (p_item, 'staff', v_name, v_phone, v_fault, v_kind)
  returning id into v_id;
  insert into public.item_events (item_id, type, note)
  values (p_item, case v_kind when 'part_return' then 'part_return' else 'warranty_claim' end, 'Logged by staff');
  return v_id;
end;
$$;
revoke execute on function public.log_warranty_claim(text, text, text, text) from public, anon;
grant execute on function public.log_warranty_claim(text, text, text, text) to authenticated;

-- A refunded part return cancels the shop's share of that sale.
create or replace function public.refund_cancels_exchange_payout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'refunded' and old.status is distinct from 'refunded' and new.kind = 'part_return' then
    update public.exchange_sales set status = 'refunded' where item_id = new.item_id and status = 'sold';
  end if;
  return null;
end;
$$;
revoke execute on function public.refund_cancels_exchange_payout() from public, anon, authenticated;
drop trigger if exists claims_refund_cancels_payout on public.warranty_claims;
create trigger claims_refund_cancels_payout after update of status on public.warranty_claims
  for each row execute function public.refund_cancels_exchange_payout();
