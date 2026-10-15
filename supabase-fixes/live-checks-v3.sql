-- Read-only checks for the batches after v2 (16 and later). Changes nothing. Run
-- it after live-checks-v2.sql: every row should show ok = true. Each batch that
-- adds a permission appends its checks here (numbers continue from 31).

select check_name, ok
  from (values
    (31, 'Impact and network flows: visitors read only the two aggregate views, with no names, ids or money columns',
        has_table_privilege('anon', 'public.impact_flows', 'SELECT')
        and has_table_privilege('anon', 'public.network_flows', 'SELECT')
        and not has_table_privilege('anon', 'public.partner_market_groups', 'SELECT')
        and not has_table_privilege('authenticated', 'public.partner_market_groups', 'SELECT')
        and not exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name in ('impact_flows', 'network_flows')
                           and column_name ~ '(name|phone|paise|price|id$|address|owner)')),
    (32, 'Buyer area: staff set it after a sale (function only), visitors cannot read it, and only admins change the list',
        not has_column_privilege('anon', 'public.items', 'buyer_area', 'SELECT')
        and not has_column_privilege('authenticated', 'public.items', 'buyer_area', 'UPDATE')
        and has_function_privilege('authenticated', 'public.set_item_buyer_area(text, text)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.set_item_buyer_area(text, text)', 'EXECUTE')
        and exists (select 1 from pg_trigger where tgrelid = 'public.items'::regclass and tgname = 'items_clear_buyer_area')
        and has_table_privilege('anon', 'public.buyer_areas', 'SELECT')
        and not has_table_privilege('anon', 'public.buyer_areas', 'INSERT'))
  ) as c(n, check_name, ok)
 order by n;
