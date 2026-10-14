-- Accounts and requests (v1.0.0 batch 07):
--   1. requests linked to the signed-in buyer, with a private status link,
--      cancelling (by the buyer, or by staff with a reason the buyer sees) and
--      institution booking stages;
--   2. on-site notifications;
--   3. editing your profile and shop details (a new shop name or GSTIN sends
--      the shop back for checking);
--   4. "Delete my account and data": the user asks, an admin approves, and
--      purchase records are kept with the name replaced by "Deleted account";
--   5. retention for the new personal data, and the hub's new counts.
--
-- New enum values are only used inside function bodies or as text in this
-- file: Postgres can't use a value added in the same transaction.

-- ---------------------------------------------------------------------------
-- 1. Requests
-- ---------------------------------------------------------------------------
alter type public.submission_status add value if not exists 'scheduled';
alter type public.submission_status add value if not exists 'collected';

alter table public.submissions
  add column if not exists buyer_id uuid references auth.users (id) on delete set null,
  add column if not exists status_token text
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  add column if not exists cancel_reason text,
  add column if not exists cancelled_by text,
  add column if not exists scheduled_for date;
update public.submissions
   set status_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
 where status_token is null;
alter table public.submissions alter column status_token set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'submissions_status_token_key') then
    alter table public.submissions add constraint submissions_status_token_key unique (status_token);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'submissions_status_token_check') then
    alter table public.submissions add constraint submissions_status_token_check
      check (status_token ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'submissions_cancel_check') then
    alter table public.submissions add constraint submissions_cancel_check check (
      (cancelled_by is null or cancelled_by in ('buyer', 'staff'))
      and (cancel_reason is null or char_length(cancel_reason) between 3 and 300)
    );
  end if;
end $$;
create index if not exists submissions_buyer_idx on public.submissions (buyer_id, created_at desc)
  where buyer_id is not null;

-- Staff change a request's stage and pickup date only; who sent it, what it
-- says, its link and the reason for cancelling are fixed (cancelling goes
-- through cancel_request()). The server route inserts with the service key.
revoke update, delete on public.submissions from authenticated;
grant update (status, handled_at, scheduled_for) on public.submissions to authenticated;

-- The rules for stages: booking stages are for institution pickups (with a
-- date when scheduled), a cancelled request says who cancelled it, and
-- leaving "cancelled" clears that.
create or replace function public.guard_request_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status::text in ('scheduled', 'collected') and new.kind <> 'institution_pickup' then
    raise exception 'Only institution pickups are scheduled or collected';
  end if;
  if new.status::text = 'scheduled' and new.scheduled_for is null then
    raise exception 'Choose the pickup date';
  end if;
  -- Through the API, cancelling goes through cancel_request() or
  -- cancel_my_request(), which say who cancelled (and why).
  if new.status::text = 'cancelled' and new.cancelled_by is null
     and current_user in ('anon', 'authenticated') then
    raise exception 'Cancel with a reason (cancel_request)';
  end if;
  if new.status::text <> 'cancelled' then
    new.cancelled_by := null;
    new.cancel_reason := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_request_stage() from public, anon, authenticated;
drop trigger if exists submissions_guard_stage on public.submissions;
create trigger submissions_guard_stage before insert or update on public.submissions
  for each row execute function public.guard_request_stage();

-- Anyone holding a request's private link sees its stage, never the details
-- in it (no name, phone or message). Unknown or malformed links show nothing.
create or replace function public.request_status(p_token text)
returns table (
  kind text,
  status text,
  item_id text,
  item_title text,
  created_at timestamptz,
  handled_at timestamptz,
  scheduled_for date,
  cancelled_by text,
  cancel_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.kind::text, s.status::text, s.item_id,
         nullif(trim(concat_ws(' ', i.brand, i.model)), ''),
         s.created_at, s.handled_at, s.scheduled_for, s.cancelled_by, s.cancel_reason
    from public.submissions s
    left join public.items i on i.id = s.item_id
   where p_token ~ '^[0-9a-f]{64}$' and s.status_token = p_token;
$$;
revoke execute on function public.request_status(text) from public;
grant execute on function public.request_status(text) to anon, authenticated;

-- A signed-in buyer's own requests (no other buyer's, whatever the role).
create or replace function public.my_requests()
returns table (
  id uuid,
  kind text,
  status text,
  item_id text,
  item_title text,
  created_at timestamptz,
  handled_at timestamptz,
  scheduled_for date,
  cancelled_by text,
  cancel_reason text,
  status_token text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.kind::text, s.status::text, s.item_id,
         nullif(trim(concat_ws(' ', i.brand, i.model)), ''),
         s.created_at, s.handled_at, s.scheduled_for, s.cancelled_by, s.cancel_reason, s.status_token
    from public.submissions s
    left join public.items i on i.id = s.item_id
   where auth.uid() is not null and s.buyer_id = auth.uid()
   order by s.created_at desc;
$$;
revoke execute on function public.my_requests() from public, anon;
grant execute on function public.my_requests() to authenticated;

-- The buyer cancels their own open request.
create or replace function public.cancel_my_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.submissions where id = p_id for update;
  if not found or auth.uid() is null or s.buyer_id is distinct from auth.uid() then
    raise exception 'Request not found';
  end if;
  if s.status::text not in ('new', 'contacted', 'scheduled') then
    raise exception 'This request is already closed';
  end if;
  update public.submissions
     set status = 'cancelled', cancelled_by = 'buyer', cancel_reason = null, handled_at = now()
   where id = p_id;
end;
$$;
revoke execute on function public.cancel_my_request(uuid) from public, anon;
grant execute on function public.cancel_my_request(uuid) to authenticated;

-- Staff cancel a request with a reason the person sees on their status page.
create or replace function public.cancel_request(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reason text := nullif(trim(coalesce(p_reason, '')), '');
  s record;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can cancel requests';
  end if;
  if reason is null or char_length(reason) not between 3 and 300 then
    raise exception 'Give a reason of 3 to 300 characters';
  end if;
  select * into s from public.submissions where id = p_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if s.status::text in ('done', 'sold', 'cancelled') then
    raise exception 'This request is already closed';
  end if;
  update public.submissions
     set status = 'cancelled', cancelled_by = 'staff', cancel_reason = reason, handled_at = now()
   where id = p_id;
end;
$$;
revoke execute on function public.cancel_request(uuid, text) from public, anon;
grant execute on function public.cancel_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Notifications (on the site only: ReLoop sends no email)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z_]{3,40}$'),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  href text check (href is null or href ~ '^/[A-Za-z0-9/_?=&%.-]{0,200}$'),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- Adds a notification. Internal: only the triggers and functions below call it.
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, href)
  select p_user, p_kind, left(p_title, 120), left(coalesce(p_body, ''), 500), p_href
   where p_user is not null and exists (select 1 from auth.users u where u.id = p_user);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- Marks the caller's notifications read: the given ones, or all of them.
create or replace function public.mark_notifications_read(p_ids bigint[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'Log in first';
  end if;
  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.mark_notifications_read(bigint[]) from public, anon;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;

-- A buyer hears when their request moves on.
create or replace function public.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  what text := case new.kind::text
                 when 'reservation' then 'reservation'
                 when 'enquiry' then 'question'
                 when 'institution_pickup' then 'pickup booking'
                 else 'request' end;
  about text := coalesce(' for ' || new.item_id, '');
  title text;
  body text := '';
begin
  -- A new stage, or a new date for a booked pickup.
  if new.buyer_id is null
     or (new.status is not distinct from old.status
         and not (new.status::text = 'scheduled' and new.scheduled_for is distinct from old.scheduled_for)) then
    return new;
  end if;
  case new.status::text
    when 'contacted' then title := 'ReLoop has your ' || what || about;
                          body := 'We''ll be in touch on WhatsApp or by phone.';
    when 'scheduled' then title := 'Pickup booked for ' || to_char(new.scheduled_for, 'FMDD Mon YYYY');
    when 'collected' then title := 'We collected your items';
    when 'sold' then title := 'Your ' || what || about || ' is complete';
    when 'done' then title := 'Your ' || what || about || ' is done';
    when 'cancelled' then
      if new.cancelled_by = 'buyer' then
        return new;
      end if;
      title := 'Your ' || what || about || ' was cancelled';
      body := coalesce(new.cancel_reason, '');
    else return new;
  end case;
  perform public.notify(new.buyer_id, 'request_' || new.status::text, title, body, '/account/requests');
  return new;
end;
$$;
revoke execute on function public.notify_request_change() from public, anon, authenticated;
drop trigger if exists submissions_notify on public.submissions;
create trigger submissions_notify after update of status, scheduled_for on public.submissions
  for each row execute function public.notify_request_change();

-- A shop owner hears about verification and about each submission's offer.
create or replace function public.notify_shop_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verification_status is not distinct from old.verification_status then
    return new;
  end if;
  case new.verification_status
    when 'verified' then
      perform public.notify(new.id, 'shop_verified', 'Your shop is verified',
        'You can now submit items to ReLoop.', '/sell/shops');
    when 'rejected' then
      perform public.notify(new.id, 'shop_rejected', 'We couldn''t verify your shop',
        'Message us and we''ll tell you what to send.', '/account');
    else
      perform public.notify(new.id, 'shop_pending', 'We''re checking your shop again',
        'Your shop name or GSTIN changed, so an admin checks it before you submit more items.', '/account');
  end case;
  return new;
end;
$$;
revoke execute on function public.notify_shop_verification() from public, anon, authenticated;
drop trigger if exists shop_owners_notify on public.shop_owners;
create trigger shop_owners_notify after update of verification_status on public.shop_owners
  for each row execute function public.notify_shop_verification();

create or replace function public.notify_shop_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item text := left(coalesce(new.item_name, 'your items'), 60);
begin
  if new.status is not distinct from old.status or new.shop_owner_id is null then
    return new;
  end if;
  if new.status = 'Offered' then
    perform public.notify(new.shop_owner_id, 'offer_made', 'ReLoop made an offer for ' || item,
      coalesce('₹' || new.offer_price::text || ' each', ''), '/account');
  elsif new.status = 'Rejected' then
    perform public.notify(new.shop_owner_id, 'submission_rejected', 'Not accepted: ' || item,
      coalesce(new.rejection_reason, ''), '/account');
  elsif new.status = 'Purchased' then
    perform public.notify(new.shop_owner_id, 'submission_bought', 'ReLoop bought ' || item, '', '/account');
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_shop_submission() from public, anon, authenticated;
drop trigger if exists shop_submissions_notify on public.shop_submissions;
create trigger shop_submissions_notify after update of status on public.shop_submissions
  for each row execute function public.notify_shop_submission();

-- ---------------------------------------------------------------------------
-- 3. Editing your own details
-- ---------------------------------------------------------------------------
-- Profiles change only through update_my_profile(), which checks the values.
revoke update on public.profiles from authenticated;

create or replace function public.update_my_profile(p_full_name text, p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g'), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Log in first';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 80 then
    raise exception 'Enter your name (2 to 80 characters)';
  end if;
  if v_phone is null or char_length(v_phone) not between 6 and 20
     or char_length(regexp_replace(v_phone, '\D', '', 'g')) < 10 then
    raise exception 'Enter a phone number with at least 10 digits';
  end if;
  update public.profiles set full_name = v_name, phone = v_phone where user_id = auth.uid();
  -- A shop owner's contact details on the shop record follow.
  update public.shop_owners set owner_name = v_name, phone = v_phone, updated_at = now() where id = auth.uid();
end;
$$;
revoke execute on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.update_my_profile(text, text) to authenticated;

-- A shop owner edits the shop. A new shop name or GSTIN sends a verified or
-- rejected shop back to pending (and off the map) until an admin checks it.
-- Returns the verification status afterwards.
create or replace function public.update_my_shop(p_shop_name text, p_gstin text, p_business_address text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop record;
  v_name text := nullif(regexp_replace(trim(coalesce(p_shop_name, '')), '\s+', ' ', 'g'), '');
  v_gstin text := nullif(upper(regexp_replace(coalesce(p_gstin, ''), '\s', '', 'g')), '');
  v_address text := nullif(trim(coalesce(p_business_address, '')), '');
  recheck boolean;
begin
  select * into shop from public.shop_owners where id = auth.uid() for update;
  if auth.uid() is null or not found then
    raise exception 'Only shop owner accounts have shop details';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 120 then
    raise exception 'Enter the shop name (2 to 120 characters)';
  end if;
  if v_gstin is not null and v_gstin !~ '^[0-9A-Z]{15}$' then
    raise exception 'A GSTIN is 15 letters and numbers (leave it empty if the shop is not GST-registered)';
  end if;
  if v_address is null or char_length(v_address) not between 5 and 300 then
    raise exception 'Enter the shop address (5 to 300 characters)';
  end if;
  -- Compared as normalised on both sides, so an untouched name with extra
  -- spaces from sign-up doesn't count as a change.
  recheck := shop.verification_status <> 'pending'
             and (v_name is distinct from regexp_replace(trim(shop.shop_name), '\s+', ' ', 'g')
                  or v_gstin is distinct from nullif(upper(regexp_replace(coalesce(shop.gstin, ''), '\s', '', 'g')), ''));
  update public.shop_owners
     set shop_name = v_name,
         gstin = v_gstin,
         business_address = v_address,
         address = v_address,
         updated_at = now(),
         verification_status = case when recheck then 'pending' else shop.verification_status end,
         verified_at = case when recheck then null else shop.verified_at end,
         show_on_map = case when recheck then false else shop.show_on_map end
   where id = auth.uid();
  return case when recheck then 'pending' else shop.verification_status end;
end;
$$;
revoke execute on function public.update_my_shop(text, text, text) from public, anon;
grant execute on function public.update_my_shop(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Deleting an account
-- ---------------------------------------------------------------------------
-- Purchase records must outlive the account (tax and e-waste records), so a
-- bought lot keeps its row without the owner link; anything not bought goes.
alter table public.shop_submissions alter column shop_owner_id drop not null;
alter table public.shop_submissions drop constraint if exists shop_submissions_shop_owner_id_fkey;
alter table public.shop_submissions add constraint shop_submissions_shop_owner_id_fkey
  foreign key (shop_owner_id) references public.shop_owners (id) on delete set null;

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'done', 'refused')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null
);
create unique index if not exists deletion_requests_one_open on public.deletion_requests (user_id)
  where status = 'open';
create index if not exists deletion_requests_closed_idx on public.deletion_requests (handled_at)
  where status <> 'open';

alter table public.deletion_requests enable row level security;
revoke all on public.deletion_requests from anon, authenticated;
grant select on public.deletion_requests to authenticated;
drop policy if exists "Users read their own deletion requests" on public.deletion_requests;
create policy "Users read their own deletion requests" on public.deletion_requests for select
  to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Admins read deletion requests" on public.deletion_requests;
create policy "Admins read deletion requests" on public.deletion_requests for select
  to authenticated using ((select public.is_admin()));

-- The signed-in user asks for their account and data to be deleted.
create or replace function public.request_account_deletion(p_reason text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then
    raise exception 'Log in first';
  end if;
  select id into rid from public.deletion_requests where user_id = auth.uid() and status = 'open';
  if found then
    return rid;
  end if;
  insert into public.deletion_requests (user_id, reason)
  values (auth.uid(), left(trim(coalesce(p_reason, '')), 500))
  returning id into rid;
  return rid;
end;
$$;
revoke execute on function public.request_account_deletion(text) from public, anon;
grant execute on function public.request_account_deletion(text) to authenticated;

-- The user changes their mind while the request is open.
create or replace function public.withdraw_account_deletion()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.deletion_requests where user_id = auth.uid() and status = 'open';
$$;
revoke execute on function public.withdraw_account_deletion() from public, anon;
grant execute on function public.withdraw_account_deletion() to authenticated;

-- Open requests for the admin screen, with the name and role to recognise them.
create or replace function public.deletion_queue()
returns table (
  id uuid,
  created_at timestamptz,
  reason text,
  full_name text,
  role text,
  shop_name text,
  is_team boolean,
  purchased_lots bigint,
  requests bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins handle deletion requests';
  end if;
  return query
    select d.id, d.created_at, d.reason, p.full_name, p.role::text, o.shop_name,
           exists (select 1 from public.staff s where s.user_id = d.user_id)
             or exists (select 1 from public.admin_users a where a.id = d.user_id),
           (select count(*) from public.shop_submissions x
             where x.shop_owner_id = d.user_id and x.status in ('Purchased', 'Processing', 'Completed')),
           (select count(*) from public.submissions r where r.buyer_id = d.user_id)
      from public.deletion_requests d
      left join public.profiles p on p.user_id = d.user_id
      left join public.shop_owners o on o.id = d.user_id
     where d.status = 'open'
     order by d.created_at;
end;
$$;
revoke execute on function public.deletion_queue() from public, anon;
grant execute on function public.deletion_queue() to authenticated;

-- An admin carries out a deletion request, in one transaction:
--   * hub items bought from the shop keep the purchase, with "Deleted account"
--     in place of the shop name, contact name and phone;
--   * bought lots keep their row without the owner; other submissions go;
--   * the person's requests keep their stage, with "Deleted account" in place
--     of what they wrote;
--   * the account, profile, shop record and notifications are deleted.
-- Team members are removed from the team first; nobody deletes themselves here.
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

-- An admin declines, with a note the person sees on their account page.
create or replace function public.refuse_account_deletion(p_request uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only admins handle deletion requests';
  end if;
  if v_note is null or char_length(v_note) not between 3 and 300 then
    raise exception 'Say why, in 3 to 300 characters';
  end if;
  select * into d from public.deletion_requests where id = p_request for update;
  if not found or d.status <> 'open' then
    raise exception 'This deletion request is not open';
  end if;
  update public.deletion_requests
     set status = 'refused', note = v_note, handled_at = now(), handled_by = auth.uid()
   where id = p_request;
  insert into public.admin_audit_log (admin_id, target_user_id, action, detail)
  values (auth.uid(), d.user_id, 'deletion_refused', 'request ' || p_request::text);
  perform public.notify(d.user_id, 'deletion_refused', 'Your account wasn''t deleted', v_note, '/account/settings');
end;
$$;
revoke execute on function public.refuse_account_deletion(uuid, text) from public, anon;
grant execute on function public.refuse_account_deletion(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Retention and the hub's counts
-- ---------------------------------------------------------------------------
-- Notifications go after 90 days; handled deletion requests after 12 months;
-- closed requests as before (purge_closed_requests). One daily job runs all
-- three (supabase-fixes/2026-10-29-retention-cron.sql).
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
begin
  requests := public.purge_closed_requests(now_at);
  delete from public.notifications where created_at < now_at - interval '90 days';
  get diagnostics notes = row_count;
  delete from public.deletion_requests
   where status <> 'open' and handled_at < now_at - interval '12 months';
  get diagnostics deletions = row_count;
  return jsonb_build_object('requests', requests, 'notifications', notes, 'deletion_requests', deletions);
end;
$$;
revoke execute on function public.purge_expired_personal_data(timestamptz) from public, anon, authenticated;

-- The hub's counts gain open deletion requests (admins only).
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
    'offers_waiting', (select count(*) from public.shop_submissions x where x.status = 'Offered'),
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
