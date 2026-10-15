-- Batch 22: staff pricing. Margins, costs and benchmarks are staff-only.
--
-- COGS = what ReLoop paid + every repair fee + handling (a per-grade staff
-- setting, Rs 0 by default). Benchmarks are only the plan's unit figures, held
-- in staff-only settings (finance.device_unit_paise, finance.scrap_spread_paise_per_kg);
-- their values are entered locally, never in the repository. There is no
-- margin target. Shop-listed parts earn a commission and are not margin-tested.

-- ---------------------------------------------------------------------------
-- 1. item_margins: one row per item, read as the caller (staff only by RLS)
-- ---------------------------------------------------------------------------
create or replace view public.item_margins
with (security_invoker = true) as
select i.id as item_id,
       i.category::text as category,
       i.part_type::text as part_type,
       i.grade::text as grade,
       i.status::text as status,
       i.source_type::text as source_type,
       i.received_at,
       i.listed_at,
       i.sold_at,
       case when i.sold_at is not null and i.listed_at is not null
            then greatest(0, (i.sold_at::date - i.listed_at::date)) end as days_to_sell,
       i.buy_paise,
       coalesce((select sum(r.fee_paise) from public.repair_jobs r where r.item_id = i.id), 0)::bigint as repair_paise,
       coalesce((select (s.value ->> i.grade::text)::bigint from public.app_settings s
                  where s.key = 'pricing.handling_paise' and i.grade is not null), 0)::bigint as handling_paise,
       (i.buy_paise
        + coalesce((select sum(r.fee_paise) from public.repair_jobs r where r.item_id = i.id), 0)
        + coalesce((select (s.value ->> i.grade::text)::bigint from public.app_settings s
                     where s.key = 'pricing.handling_paise' and i.grade is not null), 0))::bigint as cogs_paise,
       i.expected_resale_paise,
       i.list_paise,
       i.current_paise,
       i.sold_paise,
       i.listed_by_partner_id is not null as commission_item,
       i.commission_pct,
       case when i.sold_paise is not null and i.listed_by_partner_id is not null
            then round(i.sold_paise * i.commission_pct / 100)::bigint end as commission_paise,
       case when i.sold_paise is not null and i.listed_by_partner_id is null
            then (i.sold_paise - i.buy_paise
                  - coalesce((select sum(r.fee_paise) from public.repair_jobs r where r.item_id = i.id), 0)
                  - coalesce((select (s.value ->> i.grade::text)::bigint from public.app_settings s
                               where s.key = 'pricing.handling_paise' and i.grade is not null), 0))::bigint
       end as margin_paise
  from public.items i;
revoke all on public.item_margins from anon, authenticated;
grant select on public.item_margins to authenticated;

-- ---------------------------------------------------------------------------
-- 2. pricing_benchmarks(): the plan's unit figures and the VRRG rates (staff)
-- ---------------------------------------------------------------------------
create or replace function public.pricing_benchmarks()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb := '{}';
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see the pricing benchmarks';
  end if;
  select jsonb_object_agg(s.key, s.value) into v
    from public.app_settings s
   where s.key in ('finance.device_unit_paise', 'finance.scrap_spread_paise_per_kg', 'vrg.rates_paise',
                   'rate_card.screens_paise', 'rate_card.boards_paise', 'rate_card.batteries_paise',
                   'rate_card.other_paise', 'rate_card.commission_pct', 'pricing.handling_paise',
                   'pricing.grade_b_factor');
  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke execute on function public.pricing_benchmarks() from public, anon;
grant execute on function public.pricing_benchmarks() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. suggested_price(): a list price from the freshest matching reference
-- ---------------------------------------------------------------------------
-- Grade A and tested parts: the reference's typical price; grade B: typical
-- times the B factor. Rounded to Rs 10. Null when there is no fresh reference.
create or replace function public.suggested_price(p_category public.item_category, p_part_type public.part_type,
                                                  p_brand text, p_model text, p_grade public.grade)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fresh integer;
  v_b numeric;
  r record;
  v_factor numeric;
begin
  if not public.is_staff() then
    raise exception 'Only hub staff can see suggested prices';
  end if;
  if p_grade is null or p_grade::text = 'D' or (p_grade::text = 'C' and p_category::text <> 'part') then
    return null;
  end if;
  select coalesce((select (value #>> '{}')::integer from public.app_settings
                    where key = 'pricing.reference_fresh_days' and jsonb_typeof(value) = 'number'), 180) into v_fresh;
  select coalesce((select (value #>> '{}')::numeric from public.app_settings
                    where key = 'pricing.grade_b_factor' and jsonb_typeof(value) = 'number'), 0.75) into v_b;
  select rp.typical_paise, rp.source, rp.checked_on,
         case when rp.brand = '' and rp.model = '' then 'category' else 'model' end as scope
    into r
    from public.reference_prices rp
   where rp.category = p_category
     and rp.part_type is not distinct from p_part_type
     and (rp.brand = '' or lower(rp.brand) = lower(coalesce(p_brand, '')))
     and (rp.model = '' or lower(rp.model) = lower(coalesce(p_model, '')))
     and rp.checked_on >= current_date - v_fresh
   order by (rp.model <> '') desc, (rp.brand <> '') desc, rp.checked_on desc
   limit 1;
  if not found then
    return null;
  end if;
  v_factor := case when p_grade::text = 'B' then v_b else 1 end;
  return jsonb_build_object(
    'paise', greatest(1000, round(r.typical_paise * v_factor / 1000) * 1000)::bigint,
    'factor', v_factor,
    'source', r.source,
    'checked_on', r.checked_on,
    'scope', r.scope);
end;
$$;
revoke execute on function public.suggested_price(public.item_category, public.part_type, text, text, public.grade)
  from public, anon;
grant execute on function public.suggested_price(public.item_category, public.part_type, text, text, public.grade)
  to authenticated;
