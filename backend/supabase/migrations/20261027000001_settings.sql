-- Settings admins can change without code: contact details and hours,
-- drop-off shops, category labels and weights, what we accept and don't take,
-- and the pricing and capacity numbers. Only listed keys exist, each with a
-- type check; public keys are readable through public_settings, the rest by
-- staff only. Every change is logged in admin_audit_log.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
drop policy if exists "Staff read settings" on public.app_settings;
create policy "Staff read settings" on public.app_settings for select to authenticated
  using ((select public.is_staff()));

-- The audit log now records more kinds of admin action (settings first).
alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action ~ '^[a-z_]{3,40}$');

-- The allowed keys and the JSON type of each.
create or replace function public.setting_type(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'contact.whatsapp' then 'string'
    when 'contact.phone' then 'string'
    when 'contact.email' then 'string'
    when 'contact.hours' then 'string'
    when 'hub.address' then 'string'
    when 'hub.opens' then 'string'
    when 'dropoff.shops' then 'array'
    when 'categories.info' then 'object'
    when 'categories.weight_kg' then 'object'
    when 'accept.take' then 'array'
    when 'accept.dont' then 'array'
    when 'pricing.grade_b_factor' then 'number'
    when 'pricing.reference_fresh_days' then 'number'
    when 'pricing.target_margin_pct' then 'number'
    when 'pricing.handling_paise' then 'object'
    when 'capacity.racks' then 'number'
  end;
$$;

-- Admins change one setting at a time; the old and new values are not
-- logged (they can hold contact details), only which key changed.
create or replace function public.set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := public.setting_type(p_key);
begin
  if not public.is_admin() then
    raise exception 'Only admins can change settings';
  end if;
  if wanted is null then
    raise exception 'Unknown setting %', p_key;
  end if;
  if jsonb_typeof(p_value) <> wanted and not (jsonb_typeof(p_value) = 'null' and wanted = 'string') then
    raise exception 'Setting % must be a JSON %', p_key, wanted;
  end if;
  if pg_column_size(p_value) > 20000 then
    raise exception 'Setting % is too large', p_key;
  end if;
  update public.app_settings
     set value = p_value, updated_at = now(), updated_by = auth.uid()
   where key = p_key;
  if not found then
    raise exception 'Unknown setting %', p_key;
  end if;
  insert into public.admin_audit_log (admin_id, action, detail)
  values (auth.uid(), 'setting_change', p_key);
end;
$$;
revoke execute on function public.set_setting(text, jsonb) from public, anon;
grant execute on function public.set_setting(text, jsonb) to authenticated;
revoke execute on function public.setting_type(text) from public, anon, authenticated;

-- What visitors may read: the public keys only.
create or replace view public.public_settings as
select s.key, s.value
  from public.app_settings s
 where s.is_public;
revoke all on public.public_settings from anon, authenticated;
grant select on public.public_settings to anon, authenticated;

-- Defaults: today's values from the site's config. Re-running keeps any edits.
insert into public.app_settings (key, value, is_public) values
  ('contact.whatsapp', '"919871276179"', true),
  ('contact.phone', '"+91 98712 76179"', true),
  ('contact.email', 'null', true),
  ('contact.hours', '"Mon–Sat, 10:00–18:00 IST from November 2026. Until then, WhatsApp replies within one working day."', true),
  ('hub.address', '"Old-city market belt, between Raghunath Bazaar and Residency Road. Exact address when we open in November 2026."', true),
  ('hub.opens', '"November 2026"', true),
  ('dropoff.shops', '[]', true),
  ('categories.info', '{}', true),
  ('categories.weight_kg', '{"phone": 0.2, "laptop": 2.2, "desktop": 8, "monitor": 4.5, "tv": 8, "printer": 6, "ups": 7, "small_appliance": 2, "accessory": 0.3, "part": 0.2}', true),
  ('accept.take', '[]', true),
  ('accept.dont', '["Large appliances: fridges, washing machines and air conditioners.", "Anything that isn''t electrical or electronic.", "Leaking or swollen batteries, except handed over at the hub, where they go straight into the battery cabinet for the recycler."]', true),
  ('pricing.grade_b_factor', '0.75', true),
  ('pricing.reference_fresh_days', '180', true),
  ('pricing.target_margin_pct', '40', false),
  ('pricing.handling_paise', '{"A": 10000, "B": 10000, "C": 6000, "D": 0}', false),
  ('capacity.racks', '300', false)
on conflict (key) do nothing;
