-- Partner shops on the public map: an admin switches a verified shop on once
-- the shop has agreed, recording when, with an (approximate) position.

alter table public.shop_owners
  add column if not exists show_on_map boolean not null default false,
  add column if not exists map_consent_at timestamptz,
  add column if not exists map_market text not null default '' check (char_length(map_market) <= 80),
  add column if not exists map_lat numeric(9, 6) check (map_lat between -90 and 90),
  add column if not exists map_lng numeric(9, 6) check (map_lng between -180 and 180),
  add column if not exists map_approximate boolean not null default true;

-- A shop can only be on the map with a recorded consent date and a position.
alter table public.shop_owners drop constraint if exists shop_owners_map_needs_consent;
alter table public.shop_owners add constraint shop_owners_map_needs_consent check (
  not show_on_map or (map_consent_at is not null and map_lat is not null and map_lng is not null)
);

-- What the public map may show: name, market and position of verified shops
-- that agreed. Nothing else (no phone, email, GSTIN, owner or address). The
-- view runs as its owner so visitors never need access to shop_owners itself.
create or replace view public.map_partner_shops as
  select s.shop_name as name, s.map_market as market, s.map_lat::double precision as lat,
         s.map_lng::double precision as lng, s.map_approximate as approximate
    from public.shop_owners s
   where s.show_on_map and s.verification_status = 'verified';
revoke all on public.map_partner_shops from public, anon, authenticated;
grant select on public.map_partner_shops to anon, authenticated;
