-- Offers, pickups and payouts (v1.0.0 batch 08):
--   1. the shop owner accepts or declines ReLoop's offer in the app;
--   2. accepting books a pickup on the next route day (Tuesday or Friday),
--      and booked institution pickups join the same list of pickups;
--   3. staff record each payout with a numbered receipt (RL-PAY-2026-0001).
--      The shop sees the amount, method, date and receipt number; the payment
--      reference and the internal note stay with staff.

-- ---------------------------------------------------------------------------
-- 1. Answering an offer
-- ---------------------------------------------------------------------------
alter table public.shop_submissions drop constraint if exists shop_submissions_status_check;
alter table public.shop_submissions add constraint shop_submissions_status_check check (status in
  ('Pending', 'Under Review', 'Offered', 'Contacted', 'Accepted', 'Declined', 'Purchased', 'Rejected',
   'Processing', 'Completed'));
alter table public.shop_submissions
  add column if not exists owner_response_at timestamptz,
  add column if not exists owner_note text not null default '' check (char_length(owner_note) <= 300);
-- Owners and staff read the answer with the rest of the lot.
grant select (owner_response_at, owner_note) on public.shop_submissions to authenticated;

-- Staff can still review (and offer again), but only the owner accepts or
-- declines, and a bought lot stays as it is.
create or replace function public.guard_submission_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if old.status in ('Purchased', 'Processing', 'Completed') then
      raise exception 'A purchased submission can no longer be changed';
    end if;
    if new.status is distinct from old.status
       and new.status not in ('Pending', 'Under Review', 'Offered', 'Contacted', 'Rejected') then
      raise exception 'Shop submissions are accepted by the shop and bought only through "Create hub items"';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_submission_review() from public, anon, authenticated;

-- The next pickup route day (Tuesday or Friday) after the given day.
create or replace function public.next_route_day(p_after date)
returns date
language sql
immutable
set search_path = ''
as $$
  select d::date
    from generate_series(p_after + 1, p_after + 7, interval '1 day') as d
   where extract(isodow from d) in (2, 5)
   order by d
   limit 1;
$$;
grant execute on function public.next_route_day(date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Pickups
-- ---------------------------------------------------------------------------
create table if not exists public.pickups (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('shop', 'institution')),
  shop_submission_id bigint unique references public.shop_submissions (id) on delete cascade,
  request_id uuid unique references public.submissions (id) on delete cascade,
  shop_owner_id uuid references public.shop_owners (id) on delete set null,
  route_date date not null,
  market text not null default '' check (char_length(market) <= 80),
  status text not null default 'scheduled' check (status in ('scheduled', 'collected', 'cancelled')),
  times_missed integer not null default 0 check (times_missed >= 0),
  collected_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickups_one_source check (
    (source = 'shop' and shop_submission_id is not null and request_id is null)
    or (source = 'institution' and request_id is not null and shop_submission_id is null)
  )
);
create index if not exists pickups_route_idx on public.pickups (route_date, status);

alter table public.pickups enable row level security;
revoke all on public.pickups from anon, authenticated;
grant select on public.pickups to authenticated;
drop policy if exists "Staff read pickups" on public.pickups;
create policy "Staff read pickups" on public.pickups for select to authenticated
  using ((select public.is_staff()));

-- The owner accepts (booking the next route day) or declines, with a note.
create or replace function public.respond_to_offer(p_submission bigint, p_accept boolean, p_note text default '')
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  shop record;
  v_note text := left(trim(coalesce(p_note, '')), 300);
  v_day date;
begin
  select * into s from public.shop_submissions where id = p_submission for update;
  if not found or auth.uid() is null or s.shop_owner_id is distinct from auth.uid() then
    raise exception 'Submission not found';
  end if;
  if s.status not in ('Offered', 'Contacted') then
    raise exception 'There is no open offer on this submission';
  end if;
  if p_accept is null then
    raise exception 'Accept or decline the offer';
  end if;
  update public.shop_submissions
     set status = case when p_accept then 'Accepted' else 'Declined' end,
         owner_response_at = now(),
         owner_note = v_note
   where id = p_submission;
  if not p_accept then
    return null;
  end if;
  -- The pickup shows the shop's market (as on the map), never its street address.
  select shop_name, map_market into shop from public.shop_owners where id = s.shop_owner_id;
  v_day := public.next_route_day((now() at time zone 'Asia/Kolkata')::date);
  insert into public.pickups (source, shop_submission_id, shop_owner_id, route_date, market)
  values ('shop', p_submission, s.shop_owner_id, v_day, left(coalesce(shop.map_market, ''), 80))
  on conflict (shop_submission_id) do update
    set status = 'scheduled', route_date = excluded.route_date, updated_at = now();
  perform public.notify(s.shop_owner_id, 'pickup_booked',
    'Pickup booked for ' || to_char(v_day, 'FMDay FMDD Mon'),
    'Keep ' || left(coalesce(s.item_name, 'the items'), 60) || ' ready: ReLoop collects on the route that day.',
    '/account');
  return v_day;
end;
$$;
revoke execute on function public.respond_to_offer(bigint, boolean, text) from public, anon;
grant execute on function public.respond_to_offer(bigint, boolean, text) to authenticated;

-- Booked institution pickups join the route: scheduling a booking books (or
-- moves) its pickup; collecting, finishing or cancelling the booking follows.
create or replace function public.sync_institution_pickup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'institution_pickup' then
    return new;
  end if;
  if new.status::text = 'scheduled' and new.scheduled_for is not null then
    insert into public.pickups (source, request_id, route_date, market)
    values ('institution', new.id, new.scheduled_for, left(coalesce(new.fields ->> 'institution', ''), 80))
    on conflict (request_id) do update
      set route_date = excluded.route_date, status = 'scheduled', updated_at = now();
  elsif new.status::text in ('collected', 'done') then
    update public.pickups
       set status = 'collected', collected_at = coalesce(collected_at, now()), updated_at = now()
     where request_id = new.id and status = 'scheduled';
  elsif new.status::text = 'cancelled' then
    update public.pickups set status = 'cancelled', updated_at = now()
     where request_id = new.id and status = 'scheduled';
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_institution_pickup() from public, anon, authenticated;
drop trigger if exists submissions_sync_pickup on public.submissions;
create trigger submissions_sync_pickup after update of status, scheduled_for on public.submissions
  for each row execute function public.sync_institution_pickup();

-- Staff mark a pickup collected, or missed (it moves to the next route day
-- and the shop is told).
create or replace function public.set_pickup_status(p_id uuid, p_status text)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_day date;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can update pickups';
  end if;
  select * into p from public.pickups where id = p_id for update;
  if not found then
    raise exception 'Pickup not found';
  end if;
  if p.status <> 'scheduled' then
    raise exception 'This pickup is already %', p.status;
  end if;
  if p_status = 'collected' then
    update public.pickups set status = 'collected', collected_at = now(), updated_at = now() where id = p_id;
    if p.request_id is not null then
      update public.submissions set status = 'collected', handled_at = now()
       where id = p.request_id and status::text = 'scheduled';
    end if;
    return p.route_date;
  elsif p_status = 'missed' then
    v_day := public.next_route_day(greatest(p.route_date, (now() at time zone 'Asia/Kolkata')::date));
    update public.pickups
       set route_date = v_day, times_missed = times_missed + 1, updated_at = now()
     where id = p_id;
    if p.request_id is not null then
      update public.submissions set scheduled_for = v_day where id = p.request_id;
    end if;
    perform public.notify(p.shop_owner_id, 'pickup_moved',
      'Pickup moved to ' || to_char(v_day, 'FMDay FMDD Mon'),
      'We couldn''t collect on the planned day. Sorry for the wait.', '/account');
    return v_day;
  end if;
  raise exception 'Mark a pickup collected or missed';
end;
$$;
revoke execute on function public.set_pickup_status(uuid, text) from public, anon;
grant execute on function public.set_pickup_status(uuid, text) to authenticated;

-- An offered (shop walked in) or accepted lot becomes hub items, as before;
-- its pickup, if one was booked, is then collected.
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
  if s.status not in ('Offered', 'Contacted', 'Accepted') then
    raise exception 'Only an offered or accepted submission can become hub items (this one is %)', s.status;
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
  -- The items are at the hub now, so the lot's pickup is done.
  update public.pickups set status = 'collected', collected_at = now(), updated_at = now()
   where shop_submission_id = p_submission and status = 'scheduled';

  return tags;
end;
$$;
revoke execute on function public.convert_submission(bigint, public.item_category, public.part_type, bigint)
  from public, anon;
grant execute on function public.convert_submission(bigint, public.item_category, public.part_type, bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Payouts
-- ---------------------------------------------------------------------------
create table if not exists public.payout_counters (
  year integer primary key,
  last_number integer not null default 0
);
alter table public.payout_counters enable row level security;
revoke all on public.payout_counters from anon, authenticated;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique check (receipt_no ~ '^RL-PAY-[0-9]{4}-[0-9]{4,}$'),
  shop_submission_id bigint not null unique references public.shop_submissions (id) on delete restrict,
  shop_owner_id uuid references public.shop_owners (id) on delete set null,
  amount_paise bigint not null check (amount_paise > 0),
  method text not null check (method in ('cash', 'upi')),
  paid_at date not null,
  -- Staff only: never shown to the shop.
  reference text not null default '' check (char_length(reference) <= 80),
  internal_note text not null default '' check (char_length(internal_note) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists payouts_owner_idx on public.payouts (shop_owner_id, paid_at desc);

alter table public.payouts enable row level security;
revoke all on public.payouts from anon, authenticated;
grant select on public.payouts to authenticated;
drop policy if exists "Staff read payouts" on public.payouts;
create policy "Staff read payouts" on public.payouts for select to authenticated
  using ((select public.is_staff()));

-- Staff record that a bought lot was paid for. The amount is what the lot was
-- bought for; the lot's hub items get the same payment details.
create or replace function public.record_payout(
  p_submission bigint,
  p_method text,
  p_paid_at date,
  p_reference text default '',
  p_note text default ''
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_year integer;
  v_n integer;
  v_receipt text;
  v_amount bigint;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can record payouts';
  end if;
  if p_method not in ('cash', 'upi') then
    raise exception 'Payouts are cash or UPI';
  end if;
  if p_paid_at is null or p_paid_at > (now() at time zone 'Asia/Kolkata')::date
     or p_paid_at < (now() at time zone 'Asia/Kolkata')::date - 60 then
    raise exception 'Use the date it was paid (today or in the last 60 days)';
  end if;
  select * into s from public.shop_submissions where id = p_submission for update;
  if not found then
    raise exception 'Submission not found';
  end if;
  if s.status not in ('Purchased', 'Processing', 'Completed') or s.purchase_price is null then
    raise exception 'Only a bought lot is paid for (create its hub items first)';
  end if;
  if exists (select 1 from public.payouts where shop_submission_id = p_submission) then
    raise exception 'This lot is already paid';
  end if;
  v_amount := round(s.purchase_price * 100);
  if v_amount <= 0 then
    raise exception 'Free lots have nothing to pay';
  end if;
  v_year := extract(year from p_paid_at)::integer;
  insert into public.payout_counters (year, last_number) values (v_year, 1)
  on conflict (year) do update set last_number = public.payout_counters.last_number + 1
  returning last_number into v_n;
  v_receipt := 'RL-PAY-' || v_year || '-' || lpad(v_n::text, 4, '0');
  insert into public.payouts (receipt_no, shop_submission_id, shop_owner_id, amount_paise, method, paid_at,
                              reference, internal_note, created_by)
  values (v_receipt, p_submission, s.shop_owner_id, v_amount, p_method, p_paid_at,
          left(trim(coalesce(p_reference, '')), 80), left(trim(coalesce(p_note, '')), 300), auth.uid());
  update public.items
     set purchase_payment_method = p_method,
         purchase_paid_at = p_paid_at::timestamptz,
         purchase_reference = left(trim(coalesce(p_reference, '')), 80),
         updated_at = now()
   where shop_submission_id = p_submission;
  perform public.notify(s.shop_owner_id, 'payout_made',
    'ReLoop paid you ₹' || to_char(v_amount / 100.0, 'FM9999999990.00'),
    'By ' || case p_method when 'upi' then 'UPI' else 'cash' end || ' for ' || left(coalesce(s.item_name, 'your items'), 60)
      || '. Receipt ' || v_receipt || '.',
    '/account');
  return v_receipt;
end;
$$;
revoke execute on function public.record_payout(bigint, text, date, text, text) from public, anon;
grant execute on function public.record_payout(bigint, text, date, text, text) to authenticated;

-- A shop owner's own payouts: amount, method, date and receipt, never the
-- payment reference or the internal note.
create or replace function public.my_payouts()
returns table (
  receipt_no text,
  shop_submission_id bigint,
  item_name text,
  quantity integer,
  amount_paise bigint,
  method text,
  paid_at date
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.receipt_no, p.shop_submission_id, s.item_name, s.quantity, p.amount_paise, p.method, p.paid_at
    from public.payouts p
    join public.shop_submissions s on s.id = p.shop_submission_id
   where auth.uid() is not null and p.shop_owner_id = auth.uid()
   order by p.paid_at desc, p.receipt_no desc;
$$;
revoke execute on function public.my_payouts() from public, anon;
grant execute on function public.my_payouts() to authenticated;

-- A shop owner's own pickups (date and status only).
create or replace function public.my_pickups()
returns table (shop_submission_id bigint, item_name text, route_date date, status text, times_missed integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.shop_submission_id, s.item_name, p.route_date, p.status, p.times_missed
    from public.pickups p
    join public.shop_submissions s on s.id = p.shop_submission_id
   where auth.uid() is not null and p.shop_owner_id = auth.uid()
   order by p.route_date desc;
$$;
revoke execute on function public.my_pickups() from public, anon;
grant execute on function public.my_pickups() to authenticated;

-- One receipt, for the PDF: the owner's own, or any for staff. The name and
-- market printed on it come from the shop record. Staff fields are left out.
create or replace function public.payout_receipt(p_receipt text)
returns table (
  receipt_no text,
  paid_at date,
  amount_paise bigint,
  method text,
  item_name text,
  quantity integer,
  shop_name text,
  purchased_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.receipt_no, p.paid_at, p.amount_paise, p.method, s.item_name, s.quantity,
         coalesce(o.shop_name, 'Deleted account'), s.purchased_at
    from public.payouts p
    join public.shop_submissions s on s.id = p.shop_submission_id
    left join public.shop_owners o on o.id = p.shop_owner_id
   where p.receipt_no = p_receipt
     and auth.uid() is not null
     and (p.shop_owner_id = auth.uid() or public.is_staff());
$$;
revoke execute on function public.payout_receipt(text) from public, anon;
grant execute on function public.payout_receipt(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. The hub's counts: accepted offers waiting for a pickup or hub items, and
--    bought lots not yet paid for.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. Deleting an account also clears what pickups say about the shop.
-- ---------------------------------------------------------------------------
create or replace function public.approve_account_deletion(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  if not public.is_admin() then
    raise exception 'Only admins handle deletion requests';
  end if;
  select * into d from public.deletion_requests where id = p_request for update;
  if not found or d.status <> 'open' or d.user_id is null then
    raise exception 'This deletion request is not open';
  end if;
  if d.user_id = auth.uid() then
    raise exception 'Another admin has to delete your own account';
  end if;
  if exists (select 1 from public.staff s where s.user_id = d.user_id)
     or exists (select 1 from public.admin_users a where a.id = d.user_id) then
    raise exception 'Remove this person from the team first (Team page)';
  end if;

  -- Lock the person's lots first: a conversion running now finishes before we
  -- read its new items (or, if we're first, finds the lot gone).
  perform 1 from public.shop_owners o where o.id = d.user_id for update;
  perform 1 from public.shop_submissions x where x.shop_owner_id = d.user_id for update;

  update public.items
     set source_name = 'Deleted account', source_contact_name = '', source_phone = '', updated_at = now()
   where shop_submission_id in (select x.id from public.shop_submissions x where x.shop_owner_id = d.user_id);
  -- Pickups of bought lots stay (with the lot), without the market or notes.
  update public.pickups set market = '', notes = '', updated_at = now() where shop_owner_id = d.user_id;
  delete from public.shop_submissions
   where shop_owner_id = d.user_id and status not in ('Purchased', 'Processing', 'Completed');
  update public.submissions
     set fields = jsonb_build_object('name', 'Deleted account'), buyer_id = null
   where buyer_id = d.user_id;

  update public.deletion_requests
     set status = 'done', handled_at = now(), handled_by = auth.uid(), reason = ''
   where id = p_request;
  insert into public.admin_audit_log (admin_id, action, detail)
  values (auth.uid(), 'account_deletion', 'request ' || p_request::text);

  -- Cascades to the profile, the shop record and notifications; bought lots
  -- and this request keep their rows (their links become empty).
  delete from auth.users where id = d.user_id;
end;
$$;
revoke execute on function public.approve_account_deletion(uuid) from public, anon;
grant execute on function public.approve_account_deletion(uuid) to authenticated;
