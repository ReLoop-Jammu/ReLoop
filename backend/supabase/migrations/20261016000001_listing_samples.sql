-- Marks illustrative listings, so the shop can label them "Sample, not for sale"
-- and hide reserving until real stock exists. Visitors read only granted
-- columns of listings (20261014000001), so the new column is granted too.
alter table public.listings add column if not exists is_sample boolean not null default false;
grant select (is_sample) on public.listings to anon, authenticated;
