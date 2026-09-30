-- ReLoop core schema: profiles, organizations, listings, photos, saved items,
-- basket, inquiries and audit log. Every table has Row Level Security on.
-- Design: docs/architecture.md §4 and docs/adr/0002-hybrid-moderation.md.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.listing_category as enum ('devices', 'components', 'repairable', 'bulk_lots', 'recycling');
create type public.listing_condition as enum ('working', 'tested', 'repairable', 'parts_only', 'end_of_life');
create type public.listing_status as enum ('draft', 'pending_review', 'published', 'rejected', 'sold', 'archived');
create type public.organization_type as enum ('business', 'college', 'collector', 'recycler');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.inquiry_status as enum ('new', 'contacted', 'closed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 20),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type public.organization_type not null,
  gstin text check (gstin ~ '^[0-9A-Z]{15}$'),
  city text not null check (char_length(city) between 2 and 80),
  verification_status public.verification_status not null default 'pending',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizations_owner_idx on public.organizations (owner_id);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  title text not null check (char_length(title) between 3 and 80),
  category public.listing_category not null,
  condition public.listing_condition not null,
  -- Integer paise; null means "request a quote".
  price_paise bigint check (price_paise >= 0),
  quantity integer not null default 1 check (quantity between 1 and 10000),
  city text not null check (char_length(city) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  status public.listing_status not null default 'draft',
  rejection_reason text check (char_length(rejection_reason) <= 500),
  published_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('simple', title), 'A')
    || setweight(to_tsvector('simple', description), 'B')
    || setweight(to_tsvector('simple', city), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rejected_needs_reason check (status <> 'rejected' or rejection_reason is not null)
);
create index listings_published_idx on public.listings (published_at desc) where status = 'published';
create index listings_category_idx on public.listings (category) where status = 'published';
create index listings_seller_idx on public.listings (seller_id);
create index listings_review_queue_idx on public.listings (created_at) where status = 'pending_review';
create index listings_search_idx on public.listings using gin (search);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique,
  -- Positions 0-7 and the unique constraint cap each listing at 8 photos.
  position smallint not null check (position between 0 and 7),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now(),
  unique (listing_id, position)
);

create table public.saved_listings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.basket_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  qty integer not null default 1 check (qty between 1 and 10000),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  contact text not null check (char_length(contact) between 5 and 120),
  message text not null default '' check (char_length(message) <= 1000),
  status public.inquiry_status not null default 'new',
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_listing_idx on public.inquiries (listing_id);
create index inquiries_buyer_idx on public.inquiries (buyer_id);
create index inquiries_open_idx on public.inquiries (created_at) where status = 'new';

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- True for ReLoop admins. SECURITY DEFINER so it can read profiles without
-- tripping the profiles RLS policy (which itself calls this function).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- True for admins and for trusted server contexts (migrations, seeds,
-- service-role jobs). Browser requests run as anon/authenticated.
create function public.can_moderate()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated') or public.is_admin();
$$;

create function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from left(regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g'), 60));
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger inquiries_updated_at before update on public.inquiries
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(new.raw_user_meta_data ->> 'full_name', 120), ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Members can edit their profile but never promote themselves to admin.
create function public.protect_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.can_moderate() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Only admins can verify organizations.
create function public.protect_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.can_moderate() then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.verified_by := null;
      new.verified_at := null;
    else
      new.verification_status := old.verification_status;
      new.verified_by := old.verified_by;
      new.verified_at := old.verified_at;
      new.owner_id := old.owner_id;
    end if;
  elsif new.verification_status = 'verified'
    and (tg_op = 'INSERT' or old.verification_status is distinct from 'verified') then
    new.verified_by := coalesce(new.verified_by, auth.uid());
    new.verified_at := coalesce(new.verified_at, now());
  end if;
  return new;
end;
$$;

create trigger organizations_protect before insert or update on public.organizations
  for each row execute function public.protect_organization();

-- The hybrid moderation rule (ADR 0002), enforced in the database:
-- when a non-admin submits a listing, it goes live only if it belongs to the
-- seller's own verified organization; otherwise it waits for review.
create function public.apply_listing_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  org_verified boolean := false;
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.title) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  end if;

  if not public.can_moderate() then
    if new.organization_id is not null then
      select o.verification_status = 'verified'
        into org_verified
        from public.organizations o
       where o.id = new.organization_id and o.owner_id = new.seller_id;
      if not found then
        raise exception 'You can only list under your own organization' using errcode = '42501';
      end if;
    end if;

    if new.status = 'rejected' then
      raise exception 'Only ReLoop admins can reject listings' using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' then
      new.seller_id := old.seller_id;
      new.rejection_reason := old.rejection_reason;
      -- Owners cannot re-list an item an admin rejected without resubmitting it.
      if old.status = 'rejected' and new.status not in ('draft', 'pending_review', 'published', 'archived') then
        new.status := old.status;
      end if;
    else
      new.rejection_reason := null;
    end if;

    if new.status in ('pending_review', 'published') then
      new.status := case when coalesce(org_verified, false) then 'published' else 'pending_review' end;
    end if;

    if new.status <> 'rejected' then
      new.rejection_reason := null;
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger listings_rules before insert or update on public.listings
  for each row execute function public.apply_listing_rules();

-- Record moderation decisions. SECURITY DEFINER: clients cannot write the log.
create function public.audit_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.status in ('published', 'rejected')
    and public.is_admin() then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'listing.' || new.status, 'listing', new.id,
            jsonb_build_object('from', old.status, 'reason', new.rejection_reason));
  end if;
  return null;
end;
$$;

create function public.audit_organization_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'organization.' || new.verification_status, 'organization', new.id,
            jsonb_build_object('from', old.verification_status));
  end if;
  return null;
end;
$$;

create trigger listings_audit after update on public.listings
  for each row execute function public.audit_listing_moderation();
create trigger organizations_audit after update on public.organizations
  for each row execute function public.audit_organization_verification();

-- Inquiries from the public always start as new and unassigned.
create function public.protect_inquiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.can_moderate() then
    new.status := 'new';
    new.handled_by := null;
    new.buyer_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger inquiries_protect before insert on public.inquiries
  for each row execute function public.protect_inquiry();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.saved_listings enable row level security;
alter table public.basket_items enable row level security;
alter table public.inquiries enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "Members read their own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Members update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- organizations
create policy "Verified organizations are public"
  on public.organizations for select to anon, authenticated
  using (verification_status = 'verified' or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Members create organizations they own"
  on public.organizations for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Owners and admins update organizations"
  on public.organizations for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins delete organizations"
  on public.organizations for delete to authenticated
  using ((select public.is_admin()));

-- listings
create policy "Published listings are public; sellers and admins see their own"
  on public.listings for select to anon, authenticated
  using (status = 'published' or seller_id = (select auth.uid()) or (select public.is_admin()));
create policy "Members create their own listings"
  on public.listings for insert to authenticated
  with check (seller_id = (select auth.uid()));
create policy "Sellers and admins update listings"
  on public.listings for update to authenticated
  using (seller_id = (select auth.uid()) or (select public.is_admin()))
  with check (seller_id = (select auth.uid()) or (select public.is_admin()));
create policy "Sellers and admins delete listings"
  on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()) or (select public.is_admin()));

-- listing_photos: visible when the listing is visible; managed by its seller.
create policy "Photos follow listing visibility"
  on public.listing_photos for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "Sellers add photos to their listings"
  on public.listing_photos for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy "Sellers and admins remove photos"
  on public.listing_photos for delete to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and (l.seller_id = (select auth.uid()) or (select public.is_admin()))));

-- saved_listings and basket_items: private to each member.
create policy "Members manage their saved listings"
  on public.saved_listings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members manage their basket"
  on public.basket_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- inquiries: anyone may ask about a published listing; only the sender and
-- admins can read them; only admins can change them.
create policy "Anyone can inquire about a published listing"
  on public.inquiries for insert to anon, authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published'));
create policy "Buyers read their inquiries; admins read all"
  on public.inquiries for select to authenticated
  using (buyer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update inquiries"
  on public.inquiries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- audit_log: read-only for admins; written only by SECURITY DEFINER triggers.
create policy "Admins read the audit log"
  on public.audit_log for select to authenticated
  using ((select public.is_admin()));
