-- Team management: admins promote or demote hub staff and admins by account,
-- every change is logged, and ReLoop always keeps at least one admin.

-- How many accounts are admins right now (admin_users or hub staff admins).
create or replace function public.active_admin_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from (
    select a.id from public.admin_users a where a.is_active
    union
    select s.user_id from public.staff s where s.role = 'admin'
  ) admins;
$$;
revoke execute on function public.active_admin_count() from public, anon;

-- Never zero admins, whoever makes the change (this function, the dashboard,
-- or deleting the account).
create or replace function public.keep_one_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.active_admin_count() = 0 then
    raise exception 'ReLoop must always have at least one admin';
  end if;
  return null;
end;
$$;
revoke execute on function public.keep_one_admin() from public, anon, authenticated;

drop trigger if exists admin_users_keep_one_admin on public.admin_users;
create trigger admin_users_keep_one_admin after update or delete on public.admin_users
  for each row execute function public.keep_one_admin();
drop trigger if exists staff_keep_one_admin on public.staff;
create trigger staff_keep_one_admin after update or delete on public.staff
  for each row execute function public.keep_one_admin();

-- Promote or demote one account. Admins only.
create or replace function public.set_account_role(p_user uuid, p_staff boolean, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  label text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'No such account';
  end if;
  select left(coalesce(nullif(trim(p.full_name), ''), split_part(u.email, '@', 1), 'ReLoop staff'), 80)
    into label
    from auth.users u left join public.profiles p on p.user_id = u.id
   where u.id = p_user;
  if char_length(label) < 2 then
    label := 'ReLoop staff';
  end if;

  if p_admin then
    insert into public.admin_users (id, name, is_active) values (p_user, label, true)
      on conflict (id) do update set is_active = true;
  else
    update public.admin_users set is_active = false where id = p_user and is_active;
    update public.staff set role = 'staff' where user_id = p_user and role = 'admin';
  end if;

  if p_staff then
    insert into public.staff (user_id, full_name) values (p_user, label) on conflict (user_id) do nothing;
  else
    delete from public.staff where user_id = p_user;
  end if;

  update public.profiles p
     set role = case
       when p_admin then 'admin'::public.account_role
       when p.role = 'admin' then case when exists (select 1 from public.shop_owners s where s.id = p_user)
                                       then 'shop_owner'::public.account_role else 'buyer'::public.account_role end
       else p.role end
   where p.user_id = p_user;

  insert into public.admin_audit_log (admin_id, target_user_id, action, detail)
  values (auth.uid(), p_user, 'role_change',
          'staff ' || case when p_staff then 'on' else 'off' end || ', admin ' || case when p_admin then 'on' else 'off' end);
end;
$$;
revoke execute on function public.set_account_role(uuid, boolean, boolean) from public, anon;
grant execute on function public.set_account_role(uuid, boolean, boolean) to authenticated;
