-- Warranty claims (v1.0.0 batch 10). Grade A and B devices bought from
-- ReLoop have a 30-day warranty from the sale (business-rules.ts). A buyer
-- opens a claim from their account for an item sold to them (a reservation
-- they sent while logged in, marked sold); staff log claims for walk-in
-- sales. Staff decide: approve, repair, replace, refund or reject, with a
-- resolution the buyer sees. Closed claims are deleted 12 months after
-- closing (purge_expired_personal_data).

create table if not exists public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items (id) on delete restrict,
  buyer_id uuid references auth.users (id) on delete set null,
  opened_by text not null check (opened_by in ('buyer', 'staff')),
  -- A walk-in buyer's name and phone, entered by staff (empty for account claims).
  contact_name text not null default '' check (char_length(contact_name) <= 80),
  contact_phone text not null default '' check (char_length(contact_phone) <= 20),
  fault text not null check (char_length(fault) between 5 and 1000),
  status text not null default 'open'
    check (status in ('open', 'approved', 'repairing', 'replaced', 'refunded', 'rejected', 'closed')),
  -- What the buyer is told; staff_note never leaves the hub.
  resolution text not null default '' check (char_length(resolution) <= 500),
  staff_note text not null default '' check (char_length(staff_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists warranty_claims_item_idx on public.warranty_claims (item_id);
create index if not exists warranty_claims_buyer_idx on public.warranty_claims (buyer_id) where buyer_id is not null;
create unique index if not exists warranty_claims_one_open on public.warranty_claims (item_id)
  where status in ('open', 'approved', 'repairing');

alter table public.warranty_claims enable row level security;
revoke all on public.warranty_claims from anon, authenticated;
grant select on public.warranty_claims to authenticated;
drop policy if exists "Staff read warranty claims" on public.warranty_claims;
create policy "Staff read warranty claims" on public.warranty_claims for select to authenticated
  using ((select public.is_staff()));

-- Whether an item is still under warranty: sold, grade A or B, within 30 days of the sale.
create or replace function public.under_warranty(p_item text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.items i
     where i.id = p_item and i.status::text = 'sold' and i.grade in ('A', 'B') and i.category <> 'part'
       and i.sold_at is not null and i.sold_at >= now() - interval '30 days'
  );
$$;
revoke execute on function public.under_warranty(text) from public, anon, authenticated;

-- Items the signed-in buyer bought through their account, with the days of
-- warranty left (0 when it has run out) and any claim.
create or replace function public.my_warranty_items()
returns table (item_id text, title text, grade text, sold_at timestamptz, days_left integer, claim_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (i.id) i.id, nullif(trim(concat_ws(' ', i.brand, i.model)), ''), i.grade::text, i.sold_at,
         case when i.grade in ('A', 'B') and i.category <> 'part' and i.sold_at is not null
              then greatest(0, 30 - floor(extract(epoch from now() - i.sold_at) / 86400)::integer)
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

-- The buyer opens a claim for an item sold to them, within the warranty.
create or replace function public.open_warranty_claim(p_item text, p_fault text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault text := nullif(trim(coalesce(p_fault, '')), '');
  v_id uuid;
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
    raise exception 'This item is no longer under warranty (grade A and B devices, 30 days from the sale)';
  end if;
  if v_fault is null or char_length(v_fault) not between 5 and 1000 then
    raise exception 'Describe what went wrong (5 to 1000 characters)';
  end if;
  if exists (select 1 from public.warranty_claims c
              where c.item_id = p_item and c.status in ('open', 'approved', 'repairing')) then
    raise exception 'There is already an open claim for this item';
  end if;
  insert into public.warranty_claims (item_id, buyer_id, opened_by, fault)
  values (p_item, auth.uid(), 'buyer', v_fault)
  returning id into v_id;
  insert into public.item_events (item_id, type, note) values (p_item, 'warranty_claim', 'Opened by the buyer');
  return v_id;
end;
$$;
revoke execute on function public.open_warranty_claim(text, text) from public, anon;
grant execute on function public.open_warranty_claim(text, text) to authenticated;

-- Staff log a claim for a walk-in sale (or any sold item), within the warranty.
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
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can log claims';
  end if;
  if not public.under_warranty(p_item) then
    raise exception 'This item is not under warranty (sold grade A or B devices, 30 days from the sale)';
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
  insert into public.warranty_claims (item_id, opened_by, contact_name, contact_phone, fault)
  values (p_item, 'staff', v_name, v_phone, v_fault)
  returning id into v_id;
  insert into public.item_events (item_id, type, note) values (p_item, 'warranty_claim', 'Logged by staff');
  return v_id;
end;
$$;
revoke execute on function public.log_warranty_claim(text, text, text, text) from public, anon;
grant execute on function public.log_warranty_claim(text, text, text, text) to authenticated;

-- Staff move a claim on. Repaired, replaced, refunded and rejected claims
-- close it; a rejection says why. The buyer is notified at each step.
create or replace function public.decide_warranty_claim(
  p_id uuid,
  p_status text,
  p_resolution text,
  p_staff_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_resolution text := left(trim(coalesce(p_resolution, '')), 500);
  v_title text;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can decide claims';
  end if;
  if p_status not in ('approved', 'repairing', 'replaced', 'refunded', 'rejected', 'closed') then
    raise exception 'Unknown claim step %', p_status;
  end if;
  select * into c from public.warranty_claims where id = p_id for update;
  if not found then
    raise exception 'Claim not found';
  end if;
  if c.closed_at is not null then
    raise exception 'This claim is already closed';
  end if;
  if p_status in ('rejected', 'replaced', 'refunded') and char_length(v_resolution) < 5 then
    raise exception 'Tell the buyer what was decided (at least 5 characters)';
  end if;
  update public.warranty_claims
     set status = p_status,
         resolution = case when v_resolution <> '' then v_resolution else resolution end,
         staff_note = left(trim(coalesce(nullif(p_staff_note, ''), staff_note)), 500),
         updated_at = now(),
         closed_at = case when p_status in ('replaced', 'refunded', 'rejected', 'closed') then now() end
   where id = p_id;
  insert into public.item_events (item_id, type, note)
  values (c.item_id, 'warranty_' || p_status, left(v_resolution, 500));
  v_title := case p_status
    when 'approved' then 'Your warranty claim for ' || c.item_id || ' is accepted'
    when 'repairing' then 'We''re repairing ' || c.item_id
    when 'replaced' then 'Your ' || c.item_id || ' is being replaced'
    when 'refunded' then 'Your refund for ' || c.item_id || ' is on its way'
    when 'rejected' then 'Your warranty claim for ' || c.item_id || ' wasn''t accepted'
    else 'Your warranty claim for ' || c.item_id || ' is closed' end;
  perform public.notify(c.buyer_id, 'warranty_' || p_status, v_title, v_resolution, '/account/warranty');
end;
$$;
revoke execute on function public.decide_warranty_claim(uuid, text, text, text) from public, anon;
grant execute on function public.decide_warranty_claim(uuid, text, text, text) to authenticated;

-- A buyer's own claims: what they reported and what ReLoop decided (never staff notes).
create or replace function public.my_warranty_claims()
returns table (id uuid, item_id text, title text, fault text, status text, resolution text,
               created_at timestamptz, closed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.item_id, nullif(trim(concat_ws(' ', i.brand, i.model)), ''), c.fault, c.status, c.resolution,
         c.created_at, c.closed_at
    from public.warranty_claims c
    join public.items i on i.id = c.item_id
   where auth.uid() is not null and c.buyer_id = auth.uid()
   order by c.created_at desc;
$$;
revoke execute on function public.my_warranty_claims() from public, anon;
grant execute on function public.my_warranty_claims() to authenticated;

-- Retention: closed claims go 12 months after closing, with the rest.
create or replace function public.purge_expired_personal_data(now_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requests integer;
  notes integer;
  deletions integer;
  claims integer;
begin
  requests := public.purge_closed_requests(now_at);
  delete from public.notifications where created_at < now_at - interval '90 days';
  get diagnostics notes = row_count;
  delete from public.deletion_requests
   where status <> 'open' and handled_at < now_at - interval '12 months';
  get diagnostics deletions = row_count;
  delete from public.warranty_claims where closed_at < now_at - interval '12 months';
  get diagnostics claims = row_count;
  return jsonb_build_object('requests', requests, 'notifications', notes, 'deletion_requests', deletions,
                            'warranty_claims', claims);
end;
$$;
revoke execute on function public.purge_expired_personal_data(timestamptz) from public, anon, authenticated;

-- Deleting an account: a claim keeps its item and outcome, without the person.
-- (buyer_id is set null by the foreign key; staff-entered contact details go too.)
create or replace function public.forget_claim_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.buyer_id is not null and new.buyer_id is null then
    new.contact_name := '';
    new.contact_phone := '';
  end if;
  return new;
end;
$$;
revoke execute on function public.forget_claim_contact() from public, anon, authenticated;
drop trigger if exists warranty_claims_forget on public.warranty_claims;
create trigger warranty_claims_forget before update of buyer_id on public.warranty_claims
  for each row execute function public.forget_claim_contact();

-- The hub's counts gain open warranty claims.
create or replace function public.hub_badges()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the hub queues';
  end if;
  return jsonb_build_object(
    'new_requests', (select count(*) from public.submissions s where s.status = 'new'),
    'new_reservations', (select count(*) from public.submissions s
                          where s.status = 'new' and s.kind = 'reservation'),
    'new_institution_pickups', (select count(*) from public.submissions s
                                 where s.status = 'new' and s.kind = 'institution_pickup'),
    'new_questions', (select count(*) from public.submissions s
                       where s.status = 'new' and s.kind = 'enquiry'),
    'new_submissions', (select count(*) from public.shop_submissions x
                         where x.status in ('Pending', 'Under Review')),
    'offers_waiting', (select count(*) from public.shop_submissions x where x.status in ('Offered', 'Contacted')),
    'offers_accepted', (select count(*) from public.shop_submissions x where x.status = 'Accepted'),
    'payouts_due', (select count(*) from public.shop_submissions x
                     where x.status in ('Purchased', 'Processing', 'Completed') and x.purchase_price > 0
                       and not exists (select 1 from public.payouts p where p.shop_submission_id = x.id)),
    -- Shop lots on the next route day (booked institution pickups are counted
    -- with the requests).
    'pickups_next', (select count(*) from public.pickups p
                      where p.status = 'scheduled' and p.source = 'shop'
                        and p.route_date <= public.next_route_day((now() at time zone 'Asia/Kolkata')::date - 1)),
    'open_claims', (select count(*) from public.warranty_claims c where c.closed_at is null),
    'pending_shops', case when admin then
                       (select count(*) from public.shop_owners o where o.verification_status = 'pending')
                     end,
    'deletion_requests', case when admin then
                           (select count(*) from public.deletion_requests d where d.status = 'open')
                         end
  );
end;
$$;
revoke execute on function public.hub_badges() from public, anon;
grant execute on function public.hub_badges() to authenticated;
