-- ReLoop account roles and verified shop-owner accounts for the existing shop_owners workflow.
-- Apply only to the Supabase project that already has public.shop_owners and public.shop_submissions.
create type public.account_role as enum ('buyer', 'shop_owner');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (char_length(phone) between 6 and 20),
  role public.account_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuse the existing shop_owners table; its ID becomes the authenticated user's ID.

alter table public.shop_owners add column if not exists gstin text;
alter table public.shop_owners add column if not exists verification_status text not null default 'pending';
alter table public.shop_owners add column if not exists business_address text;
alter table public.shop_owners add column if not exists verified_at timestamptz;
alter table public.shop_owners add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.shop_owners add column if not exists review_notes text not null default '';
alter table public.shop_owners add constraint shop_owners_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected'));
alter table public.shop_owners add constraint shop_owners_gstin_format_check
  check (gstin is null or gstin ~ '^[0-9A-Z]{15}$');
create unique index if not exists shop_owners_gstin_unique_idx on public.shop_owners(gstin) where gstin is not null;

alter table public.profiles enable row level security;
alter table public.shop_owners enable row level security;
alter table public.shop_submissions enable row level security;

create policy "Users read own profile" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users update own basic profile" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- Shop owners can read their own business details. Verification fields are writable only by service-role/admin workflows.
create policy "Owners read own shop profile" on public.shop_owners for select to authenticated
  using (id = (select auth.uid()));
grant select on public.shop_owners to authenticated;

-- The authenticated owner can only see their own submissions. Existing admin policies remain in place.
create policy "Shop owners read own submissions" on public.shop_submissions for select to authenticated
  using (shop_owner_id = (select auth.uid()));

create function public.handle_new_reloop_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_role text;
  chosen_role public.account_role;
begin
  raw_role := coalesce(new.raw_user_meta_data ->> 'account_type', 'buyer');
  if raw_role not in ('buyer', 'shop_owner') then raw_role := 'buyer'; end if;
  chosen_role := raw_role::public.account_role;
  insert into public.profiles(user_id, full_name, phone, role)
  values (new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'ReLoop user'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 'not-provided'),
    chosen_role);
  if chosen_role = 'shop_owner' then
    insert into public.shop_owners(id, shop_name, owner_name, email, phone, address, city, is_active, gstin, verification_status, business_address)
    values (new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'shop_name'), ''), 'Pending shop details'),
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'ReLoop user'),
      new.email,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 'not-provided'),
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_address'), ''), ''),
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'city'), ''), 'Jammu'),
      true,
      nullif(upper(trim(new.raw_user_meta_data ->> 'gstin')), ''),
      'pending',
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_address'), ''), 'Pending address'));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_reloop_profile
after insert on auth.users
for each row execute function public.handle_new_reloop_user();
