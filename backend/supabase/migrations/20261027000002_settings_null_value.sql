-- PostgREST passes a JSON null argument as SQL NULL, so clearing a text
-- setting (for example the support email, to fall back to the built-in
-- value) skipped the type check and then broke the not-null column. SQL NULL
-- now means JSON null: allowed for text settings, a type error for the rest.

create or replace function public.set_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := public.setting_type(p_key);
  v jsonb := coalesce(p_value, 'null'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Only admins can change settings';
  end if;
  if wanted is null then
    raise exception 'Unknown setting %', p_key;
  end if;
  if jsonb_typeof(v) <> wanted and not (jsonb_typeof(v) = 'null' and wanted = 'string') then
    raise exception 'Setting % must be a JSON %', p_key, wanted;
  end if;
  if pg_column_size(v) > 20000 then
    raise exception 'Setting % is too large', p_key;
  end if;
  update public.app_settings
     set value = v, updated_at = now(), updated_by = auth.uid()
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
