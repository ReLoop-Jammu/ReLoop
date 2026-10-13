-- Base tables for shop-owner accounts, shop submissions and institution pickup
-- requests. The accounts migration (20261011…) and the API routes depend on
-- them, so a fresh project must create them first.
--
-- Every statement is "if not exists": on a project that already has these
-- tables from the earlier deployment this migration changes nothing, and
-- 20261013… then aligns the constraints.

create table if not exists public.shop_owners (
  id uuid primary key references auth.users (id) on delete cascade,
  shop_name text not null check (char_length(shop_name) between 1 and 120),
  owner_name text not null check (char_length(owner_name) between 1 and 100),
  email text,
  phone text not null default '',
  address text not null default '',
  city text not null default 'Jammu',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_submissions (
  id uuid primary key default gen_random_uuid(),
  shop_owner_id uuid not null references public.shop_owners (id) on delete cascade,
  item_name text not null check (char_length(item_name) between 1 and 120),
  category_id integer,
  brand text check (brand is null or char_length(brand) <= 100),
  model text check (model is null or char_length(model) <= 100),
  description text check (description is null or char_length(description) <= 1000),
  quantity integer not null check (quantity between 1 and 100000),
  condition text not null,
  asking_price numeric(12, 2) check (asking_price is null or asking_price >= 0),
  image_url text check (image_url is null or (char_length(image_url) <= 1000 and image_url ~ '^https://')),
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);
create index if not exists shop_submissions_owner_idx on public.shop_submissions (shop_owner_id, created_at desc);

create table if not exists public.institution_submissions (
  id uuid primary key default gen_random_uuid(),
  institution_name text not null check (char_length(institution_name) between 2 and 200),
  contact_name text not null check (char_length(contact_name) between 2 and 150),
  phone text not null check (char_length(phone) between 6 and 30),
  email text check (email is null or char_length(email) <= 254),
  details jsonb not null default '{}'
    check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 8000),
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

-- Institution requests arrive only through the server (service role, which
-- bypasses RLS). Browsers get no access at all.
alter table public.institution_submissions enable row level security;
revoke all on public.institution_submissions from anon, authenticated;
