-- Tracked links (/go/<slug>): Instagram bio, posts and stories, WhatsApp
-- shares and the awareness-drive QR code. Each real click stores the link, its
-- source and medium, and the time: no IP address, device or anything personal.
-- The server route writes with the service-role key; admins read the counts
-- through link_visit_counts(); visitors and other users can do nothing.
create table if not exists public.link_visits (
  id bigint generated always as identity primary key,
  slug text not null check (slug ~ '^[a-z0-9-]{1,40}$'),
  source text not null check (source ~ '^[a-z0-9-]{1,40}$'),
  medium text not null check (medium ~ '^[a-z0-9-]{1,40}$'),
  visited_at timestamptz not null default now()
);
create index if not exists link_visits_slug_idx on public.link_visits (slug, visited_at);

alter table public.link_visits enable row level security;
revoke all on public.link_visits from anon, authenticated;

-- QR scans counted before this migration move across as /go/drive visits.
-- qr_scans stays (empty of new rows) so nothing that reads it breaks.
insert into public.link_visits (slug, source, medium, visited_at)
select 'drive', 'qr', 'print', s.scanned_at
  from public.qr_scans s
 where s.campaign = 'awareness-drive-2026'
   and not exists (select 1 from public.link_visits v where v.slug = 'drive');

-- Clicks per link, this calendar month (IST) and all time. Admins only.
create or replace function public.link_visit_counts()
returns table (slug text, this_month bigint, all_time bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can see link counts';
  end if;
  return query
    select v.slug,
           count(*) filter (where v.visited_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'),
           count(*)
      from public.link_visits v
     group by v.slug;
end;
$$;
revoke execute on function public.link_visit_counts() from public, anon;
grant execute on function public.link_visit_counts() to authenticated;
