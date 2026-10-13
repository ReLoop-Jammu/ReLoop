-- Counts scans of the awareness-drive QR code (/go/drive). Only the campaign
-- and the time are stored: no IP address, device or anything personal. The
-- server route writes with the service-role key; admins can read the count;
-- visitors and other users can do nothing with it.
create table if not exists public.qr_scans (
  id bigint generated always as identity primary key,
  campaign text not null check (campaign ~ '^[a-z0-9-]{1,60}$'),
  scanned_at timestamptz not null default now()
);
create index if not exists qr_scans_campaign_idx on public.qr_scans (campaign, scanned_at);

alter table public.qr_scans enable row level security;
revoke all on public.qr_scans from anon, authenticated;
grant select on public.qr_scans to authenticated;

drop policy if exists "Admins read QR scans" on public.qr_scans;
create policy "Admins read QR scans" on public.qr_scans for select to authenticated
  using ((select public.is_admin()));
