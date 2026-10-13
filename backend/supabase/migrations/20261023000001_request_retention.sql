-- Retention for public requests (the privacy policy's promise): a closed
-- request (done, sold or cancelled) is deleted 12 months after it was closed,
-- with the name, phone and other details in it. Open requests are never
-- deleted. Hub items, shop submissions and the audit log are not touched.

-- 1. When each request was closed. Set by the trigger below, never by hand.
alter table public.submissions add column if not exists closed_at timestamptz;

-- Requests closed before this migration: the time staff last changed them.
update public.submissions
   set closed_at = coalesce(handled_at, created_at)
 where status in ('done', 'sold', 'cancelled') and closed_at is null;

create index if not exists submissions_closed_idx on public.submissions (closed_at)
  where closed_at is not null;

-- Closing starts the clock once (moving between closed statuses keeps it);
-- reopening clears it.
create or replace function public.track_request_closed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('done', 'sold', 'cancelled') then
    if tg_op = 'UPDATE' and old.status in ('done', 'sold', 'cancelled') then
      new.closed_at := old.closed_at;
    else
      new.closed_at := now();
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.track_request_closed() from public, anon, authenticated;

drop trigger if exists submissions_track_closed on public.submissions;
create trigger submissions_track_closed before insert or update on public.submissions
  for each row execute function public.track_request_closed();

-- 2. The clean-up. Run daily by pg_cron (supabase-fixes/2026-10-23-request-retention-cron.sql).
create or replace function public.purge_closed_requests(now_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.submissions
   where status in ('done', 'sold', 'cancelled')
     and closed_at is not null
     and closed_at < now_at - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.purge_closed_requests(timestamptz) from public, anon, authenticated;
