-- Read-only checks for everything added in v1.0.0. Changes nothing. Run it
-- after supabase-fixes/2026-10-14-checks.sql and live-checks-extra.sql:
-- every row should show ok = true.

select check_name, ok
  from (values
    (1, 'Access: my_access() is callable by signed-in users only',
        has_function_privilege('authenticated', 'public.my_access()', 'EXECUTE')
        and not has_function_privilege('anon', 'public.my_access()', 'EXECUTE')),
    (2, 'Legacy listings and categories: nobody can write them through the API',
        not has_table_privilege('anon', 'public.listings', 'INSERT')
        and not has_table_privilege('authenticated', 'public.listings', 'INSERT')
        and not has_table_privilege('authenticated', 'public.listings', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.listings', 'DELETE')
        and not has_table_privilege('anon', 'public.categories', 'INSERT')
        and not has_table_privilege('authenticated', 'public.categories', 'UPDATE')
        and not exists (select 1 from pg_policies where schemaname = 'public'
                          and tablename in ('listings', 'categories') and cmd <> 'SELECT')),
    (3, 'Shop submissions: staff can change only the review columns',
        has_column_privilege('authenticated', 'public.shop_submissions', 'offer_price', 'UPDATE')
        and not has_column_privilege('authenticated', 'public.shop_submissions', 'purchase_price', 'UPDATE')
        and not has_column_privilege('authenticated', 'public.shop_submissions', 'shop_owner_id', 'UPDATE')
        and not has_column_privilege('authenticated', 'public.shop_submissions', 'internal_notes', 'UPDATE')
        and not has_table_privilege('anon', 'public.shop_submissions', 'UPDATE')),
    (4, 'Roles: admin_users and staff change only through set_account_role()',
        not has_table_privilege('authenticated', 'public.admin_users', 'INSERT')
        and not has_table_privilege('authenticated', 'public.admin_users', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.staff', 'INSERT')
        and not has_table_privilege('authenticated', 'public.staff', 'DELETE')),
    (5, 'Hub items: visitors cannot read costs, suppliers, payment details or faults',
        not has_column_privilege('anon', 'public.items', 'buy_paise', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'expected_resale_paise', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'purchase_payment_method', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'purchase_reference', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'source_name', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'source_contact_name', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'source_phone', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'faults', 'SELECT')),
    (6, 'Shop submissions: only convert_submission() can mark a lot bought',
        exists (select 1 from pg_trigger where tgname = 'shop_submissions_guard_review')
        and not has_function_privilege('authenticated', 'public.guard_submission_review()', 'EXECUTE')),
    (7, 'Settings: visitors read only public keys, and no pricing or capacity key is public',
        not has_table_privilege('anon', 'public.app_settings', 'SELECT')
        and has_table_privilege('anon', 'public.public_settings', 'SELECT')
        and not exists (select 1 from public.app_settings where is_public
                          and (key like 'pricing.target%' or key like 'pricing.handling%' or key like 'capacity.%'))
        and (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
              where table_schema = 'public' and table_name = 'public_settings') = array['key', 'value']),
    (8, 'Settings: only admins change them, through set_setting()',
        not has_table_privilege('authenticated', 'public.app_settings', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.app_settings', 'INSERT')
        and not has_function_privilege('anon', 'public.set_setting(text, jsonb)', 'EXECUTE'))
  ) as c(n, check_name, ok)
 order by n;
