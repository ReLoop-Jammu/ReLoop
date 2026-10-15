-- Batch 23: the partner directory and the shop owner's own dashboard.

-- ---------------------------------------------------------------------------
-- 1. Directory consent: its own toggle, with the date the shop said yes
-- ---------------------------------------------------------------------------
alter table public.partners
  add column if not exists show_in_directory boolean not null default false,
  add column if not exists directory_consent_at timestamptz;
alter table public.partners drop constraint if exists partners_directory_needs_consent;
alter table public.partners add constraint partners_directory_needs_consent
  check (not show_in_directory or directory_consent_at is not null);

-- Admins switch a shop into the directory once it has agreed (the consent date
-- is recorded then), or take it out.
create or replace function public.set_partner_directory(p_partner uuid, p_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change the partner directory';
  end if;
  update public.partners
     set show_in_directory = p_show,
         directory_consent_at = case when p_show then coalesce(directory_consent_at, now()) else directory_consent_at end
   where id = p_partner;
  if not found then
    raise exception 'Partner not found';
  end if;
end;
$$;
revoke execute on function public.set_partner_directory(uuid, boolean) from public, anon;
grant execute on function public.set_partner_directory(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. partner_directory: consenting, active shops; kg in bands only
-- ---------------------------------------------------------------------------
-- Name, market, type, the month they joined and the weighed kg as a band. No
-- category split, no rupees, no phone or owner. Runs as its owner, so visitors
-- read it without any access to partners or weigh-ins.
create or replace view public.partner_directory as
select p.name,
       nullif(trim(p.market), '') as market,
       case p.type::text when 'repair_shop' then 'Repair shop' else 'Retailer or exchange store' end as type,
       date_trunc('month', p.joined_at at time zone 'Asia/Kolkata')::date as partner_since,
       case when coalesce(w.kg, 0) < 25 then 'under 25 kg'
            when w.kg < 100 then '25-100 kg'
            else '100+ kg' end as kg_band
  from public.partners p
  left join lateral (
    select sum(x.screens_kg + x.boards_kg + x.batteries_kg + x.other_kg) as kg
      from public.scrap_weighins x where x.partner_id = p.id
  ) w on true
 where p.show_in_directory and p.directory_consent_at is not null and p.status::text = 'active';
revoke all on public.partner_directory from anon, authenticated;
grant select on public.partner_directory to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. my_partner_dashboard(): the shop's own numbers (exact kg only here)
-- ---------------------------------------------------------------------------
-- Estimated kg: tagged items bought from the shop with no measured weight,
-- by the category weights setting, labelled as an estimate.
create or replace function public.my_partner_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_partner uuid;
  v_weights jsonb;
  v jsonb;
begin
  if v_me is null then
    raise exception 'Please log in';
  end if;
  select id into v_partner from public.partners where shop_owner_id = v_me;
  select value into v_weights from public.app_settings where key = 'categories.weight_kg';
  select jsonb_build_object(
    'submitted', (select count(*) from public.shop_submissions s where s.shop_owner_id = v_me),
    'offers_waiting', (select count(*) from public.shop_submissions s
                        where s.shop_owner_id = v_me and s.status in ('Offered', 'Contacted')),
    'accepted', (select count(*) from public.shop_submissions s
                  where s.shop_owner_id = v_me and s.status in ('Accepted', 'Purchased', 'Processing', 'Completed')),
    'picked_up', (select count(*) from public.pickups k where k.shop_owner_id = v_me and k.status = 'collected'),
    'paid_out_paise', (select coalesce(sum(p.amount_paise), 0) from public.payouts p where p.shop_owner_id = v_me),
    'weighins', (select count(*) from public.scrap_weighins w where v_partner is not null and w.partner_id = v_partner),
    'kg_weighed', (select coalesce(sum(w.screens_kg + w.boards_kg + w.batteries_kg + w.other_kg), 0)
                     from public.scrap_weighins w where v_partner is not null and w.partner_id = v_partner),
    'items_bought', (select count(*) from public.items i
                      where v_partner is not null and i.partner_id = v_partner
                        and i.source_type::text in ('repair_shop', 'retailer')),
    'kg_items_measured', (select coalesce(sum(i.weight_kg), 0) from public.items i
                           where v_partner is not null and i.partner_id = v_partner
                             and i.source_type::text in ('repair_shop', 'retailer') and i.weight_kg > 0),
    'kg_items_estimated', (select coalesce(sum((v_weights ->> i.category::text)::numeric), 0) from public.items i
                            where v_partner is not null and i.partner_id = v_partner
                              and i.source_type::text in ('repair_shop', 'retailer')
                              and coalesce(i.weight_kg, 0) = 0
                              and jsonb_typeof(v_weights -> i.category::text) = 'number'),
    'listings', (select coalesce(jsonb_object_agg(x.status, x.n), '{}'::jsonb)
                   from (select l.status, count(*) as n from public.part_listings l
                          where v_partner is not null and l.partner_id = v_partner group by l.status) x),
    'parts_sold', (select count(*) from public.exchange_sales e where v_partner is not null and e.partner_id = v_partner
                     and e.status <> 'refunded'),
    'parts_share_paise', (select coalesce(sum(e.shop_share_paise), 0) from public.exchange_sales e
                           where v_partner is not null and e.partner_id = v_partner and e.status <> 'refunded'),
    'in_directory', (select coalesce(p.show_in_directory, false) from public.partners p where p.id = v_partner)
  ) into v;
  return v;
end;
$$;
revoke execute on function public.my_partner_dashboard() from public, anon;
grant execute on function public.my_partner_dashboard() to authenticated;
