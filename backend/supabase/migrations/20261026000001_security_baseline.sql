-- v1.0.0 security baseline: one access call for the browser, legacy tables
-- frozen, column-limited staff reviews, and role changes only through the
-- audited function.

-- 1. What the signed-in user may see, in one call. Pages use it to choose
--    menus and landing pages; the database still enforces every permission.
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'name', (select p.full_name from public.profiles p where p.user_id = auth.uid()),
    'role', (select p.role::text from public.profiles p where p.user_id = auth.uid()),
    'must_change_password', public.password_change_pending(),
    'is_staff', public.is_staff(),
    'is_admin', public.is_admin(),
    'shop_status', (select s.verification_status::text from public.shop_owners s where s.id = auth.uid())
  );
$$;
revoke execute on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- 2. The legacy marketplace tables are read-only. Their sample listings are
--    managed by migrations; the hub's items replace them. Freezing listings
--    also means no new listing id can ever collide with a hub tag.
drop policy if exists "Admins can create listings" on public.listings;
drop policy if exists "Admins can update listings" on public.listings;
drop policy if exists "Admins can delete listings" on public.listings;
drop policy if exists "Only admins can create listings" on public.listings;
drop policy if exists "Only admins can update listings" on public.listings;
drop policy if exists "Only admins can delete listings" on public.listings;
revoke insert, update, delete on public.listings from anon, authenticated;

drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Admins can create categories" on public.categories;
drop policy if exists "Admins can update categories" on public.categories;
drop policy if exists "Admins can delete categories" on public.categories;
drop policy if exists "Only admins can create categories" on public.categories;
drop policy if exists "Only admins can update categories" on public.categories;
drop policy if exists "Only admins can delete categories" on public.categories;
revoke insert, update, delete on public.categories from anon, authenticated;

-- 3. Staff review shop submissions through the review columns only. Buying
--    (purchase_price, purchased_at, status Purchased) happens inside
--    convert_submission(), which runs as its owner.
revoke update, delete on public.shop_submissions from anon;
revoke update on public.shop_submissions from authenticated;
grant update (status, offer_price, offer_note, rejection_reason, reviewed_at, reviewed_by)
  on public.shop_submissions to authenticated;

-- 4. Roles change only through set_account_role(), which checks the caller
--    and writes the audit log. Direct writes would skip both.
revoke insert, update, delete on public.admin_users from anon, authenticated;
revoke insert, update, delete on public.staff from anon, authenticated;

-- 5. Through the API, staff move a submission only through review statuses.
--    "Purchased" and later are set by convert_submission() (it runs as its
--    owner, so current_user is not an API role there), and a bought lot can't
--    be changed from the API at all.
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
      raise exception 'Shop submissions are bought only through "Create hub items"';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_submission_review() from public, anon, authenticated;

drop trigger if exists shop_submissions_guard_review on public.shop_submissions;
create trigger shop_submissions_guard_review before update on public.shop_submissions
  for each row execute function public.guard_submission_review();
