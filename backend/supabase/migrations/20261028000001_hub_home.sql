-- The hub's home screen and menu: counts of what is waiting (hub_badges) and
-- short-link visits per day (link_visit_series). Both are read-only, run as
-- the definer with an empty search path, and check the caller first.

-- What needs someone's attention, as counts for the hub menu and overview.
-- Staff get the shared queues; admins also get shops waiting for
-- verification (null for everyone else, so the key is never a hint).
create or replace function public.hub_badges()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the hub queues';
  end if;
  return jsonb_build_object(
    'new_requests', (select count(*) from public.submissions s where s.status = 'new'),
    'new_reservations', (select count(*) from public.submissions s
                          where s.status = 'new' and s.kind = 'reservation'),
    'new_institution_pickups', (select count(*) from public.submissions s
                                 where s.status = 'new' and s.kind = 'institution_pickup'),
    'new_questions', (select count(*) from public.submissions s
                       where s.status = 'new' and s.kind = 'enquiry'),
    'new_submissions', (select count(*) from public.shop_submissions x
                         where x.status in ('Pending', 'Under Review')),
    'offers_waiting', (select count(*) from public.shop_submissions x where x.status = 'Offered'),
    'pending_shops', case when admin then
                       (select count(*) from public.shop_owners o where o.verification_status = 'pending')
                     end
  );
end;
$$;
revoke execute on function public.hub_badges() from public, anon;
grant execute on function public.hub_badges() to authenticated;

-- Visits per short link per day (India time), for the last p_days days
-- (1 to 366). Days without visits are left out. Admins only.
create or replace function public.link_visit_series(p_days integer default 90)
returns table (day date, slug text, visits bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can see link counts';
  end if;
  if p_days is null or p_days < 1 or p_days > 366 then
    raise exception 'Choose between 1 and 366 days';
  end if;
  return query
    select (v.visited_at at time zone 'Asia/Kolkata')::date as day, v.slug, count(*)
      from public.link_visits v
     -- Midnight in India on the first day: the cast to timestamp makes
     -- "at time zone" give that instant (on a bare date it would not).
     where v.visited_at >= (((now() at time zone 'Asia/Kolkata')::date - (p_days - 1))::timestamp
                            at time zone 'Asia/Kolkata')
     group by 1, 2
     order by 1, 2;
end;
$$;
revoke execute on function public.link_visit_series(integer) from public, anon;
grant execute on function public.link_visit_series(integer) to authenticated;

-- The audit log with names, newest first, 1 to 200 entries at a time (pass
-- the last id seen as p_before for the next page). Admins only. Names come
-- from profiles; an empty admin means the account has since been deleted.
create or replace function public.admin_audit_entries(
  p_action text default null,
  p_before bigint default null,
  p_limit integer default 50
)
returns table (id bigint, at timestamptz, action text, detail text, admin_name text, target_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can read the audit log';
  end if;
  return query
    select l.id, l.at, l.action, l.detail, pa.full_name, pt.full_name
      from public.admin_audit_log l
      left join public.profiles pa on pa.user_id = l.admin_id
      left join public.profiles pt on pt.user_id = l.target_user_id
     where (p_action is null or l.action = p_action)
       and (p_before is null or l.id < p_before)
     order by l.id desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;
revoke execute on function public.admin_audit_entries(text, bigint, integer) from public, anon;
grant execute on function public.admin_audit_entries(text, bigint, integer) to authenticated;
