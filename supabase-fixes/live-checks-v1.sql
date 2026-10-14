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
        and not has_function_privilege('anon', 'public.set_setting(text, jsonb)', 'EXECUTE')),
    (9, 'Hub queues, link series and audit log: visitors cannot call them, and each checks the caller first',
        not has_function_privilege('anon', 'public.hub_badges()', 'EXECUTE')
        and not has_function_privilege('anon', 'public.link_visit_series(integer)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.admin_audit_entries(text, bigint, integer)', 'EXECUTE')
        and (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""'])
               from pg_proc p where p.oid in ('public.hub_badges()'::regprocedure,
                                              'public.link_visit_series(integer)'::regprocedure,
                                              'public.admin_audit_entries(text, bigint, integer)'::regprocedure))
        and pg_get_functiondef('public.admin_audit_entries(text, bigint, integer)'::regprocedure) like '%if not public.is_admin()%'
        and pg_get_functiondef('public.hub_badges()'::regprocedure) like '%if not public.is_staff()%'
        and pg_get_functiondef('public.link_visit_series(integer)'::regprocedure) like '%if not public.is_admin()%'),
    (10, 'Requests: visitors see one request''s stage by its link only; staff change only the stage and date',
        has_function_privilege('anon', 'public.request_status(text)', 'EXECUTE')
        and (select array_agg(attname::text order by attname) from pg_attribute a
              where a.attrelid = 'public.submissions'::regclass and a.attnum > 0 and not a.attisdropped
                and has_column_privilege('authenticated', 'public.submissions', a.attname, 'UPDATE'))
            = array['handled_at', 'scheduled_for', 'status']
        and not has_table_privilege('authenticated', 'public.submissions', 'DELETE')
        and not has_table_privilege('anon', 'public.submissions', 'SELECT')
        and not has_function_privilege('anon', 'public.my_requests()', 'EXECUTE')
        and pg_get_functiondef('public.my_requests()'::regprocedure) like '%s.buyer_id = auth.uid()%'
        and pg_get_functiondef('public.cancel_request(uuid, text)'::regprocedure) like '%if not public.is_staff()%'),
    (11, 'Notifications and deletion requests: each person reads only their own; nobody writes them directly',
        not has_table_privilege('anon', 'public.notifications', 'SELECT')
        and not has_table_privilege('authenticated', 'public.notifications', 'INSERT')
        and not has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
        and not has_table_privilege('anon', 'public.deletion_requests', 'SELECT')
        and not has_table_privilege('authenticated', 'public.deletion_requests', 'INSERT')
        and not has_table_privilege('authenticated', 'public.deletion_requests', 'UPDATE')
        and not has_function_privilege('authenticated', 'public.notify(uuid, text, text, text, text)', 'EXECUTE')
        and not has_function_privilege('authenticated', 'public.purge_expired_personal_data(timestamptz)', 'EXECUTE')
        and (select bool_and(c.relrowsecurity) from pg_class c
              where c.oid in ('public.notifications'::regclass, 'public.deletion_requests'::regclass))
        and not has_table_privilege('authenticated', 'public.profiles', 'UPDATE')),
    (12, 'Account deletion and the deletion queue are for admins only',
        not has_function_privilege('anon', 'public.approve_account_deletion(uuid)', 'EXECUTE')
        and pg_get_functiondef('public.approve_account_deletion(uuid)'::regprocedure) like '%if not public.is_admin()%'
        and pg_get_functiondef('public.refuse_account_deletion(uuid, text)'::regprocedure) like '%if not public.is_admin()%'
        and pg_get_functiondef('public.deletion_queue()'::regprocedure) like '%if not public.is_admin()%'),
    (13, 'Payouts and pickups: staff read them; a shop sees only its own, never the payment reference or note',
        not has_table_privilege('anon', 'public.payouts', 'SELECT')
        and not has_table_privilege('anon', 'public.pickups', 'SELECT')
        and not has_table_privilege('authenticated', 'public.payouts', 'INSERT')
        and not has_table_privilege('authenticated', 'public.payouts', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.pickups', 'INSERT')
        and not has_table_privilege('authenticated', 'public.pickups', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.payout_counters', 'SELECT')
        and (select bool_and(c.relrowsecurity) from pg_class c
              where c.oid in ('public.payouts'::regclass, 'public.pickups'::regclass, 'public.payout_counters'::regclass))
        and exists (select 1 from pg_policies where tablename = 'payouts' and qual like '%is_staff()%')
        and pg_get_functiondef('public.my_payouts()'::regprocedure) not like '%reference%'
        and pg_get_functiondef('public.my_payouts()'::regprocedure) not like '%internal_note%'
        and pg_get_functiondef('public.payout_receipt(text)'::regprocedure) not like '%p.reference%'
        and pg_get_functiondef('public.record_payout(bigint, text, date, text, text)'::regprocedure) like '%if not public.is_staff()%'
        and not has_function_privilege('anon', 'public.respond_to_offer(bigint, boolean, text)', 'EXECUTE')),
    (14, 'Hidden items: visitors never see them or their photos; brand, model and description change only with a reason',
        exists (select 1 from pg_policies where tablename = 'items' and policyname = 'Anyone reads stock on sale'
                  and qual like '%hidden%')
        and exists (select 1 from pg_policies where tablename = 'item_photos'
                      and policyname = 'Anyone sees photos of stock on sale' and qual like '%items%')
        and exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                      and policyname = 'Item photos are publicly readable' and qual like '%items%')
        and not has_column_privilege('anon', 'public.items', 'hidden', 'SELECT')
        and not has_column_privilege('authenticated', 'public.items', 'brand', 'UPDATE')
        and not has_column_privilege('authenticated', 'public.items', 'model', 'UPDATE')
        and not has_column_privilege('authenticated', 'public.items', 'description', 'UPDATE')
        and has_column_privilege('authenticated', 'public.items', 'hidden', 'UPDATE')
        and pg_get_functiondef('public.edit_item_details(text, text, text, text, text)'::regprocedure) like '%if not public.is_staff()%'
        and pg_get_functiondef('public.mark_item_returned(text, text)'::regprocedure) like '%if not public.is_staff()%'),
    (15, 'Warranty claims: staff read them; a buyer sees only their own, never the staff note',
        not has_table_privilege('anon', 'public.warranty_claims', 'SELECT')
        and not has_table_privilege('authenticated', 'public.warranty_claims', 'INSERT')
        and not has_table_privilege('authenticated', 'public.warranty_claims', 'UPDATE')
        and (select relrowsecurity from pg_class where oid = 'public.warranty_claims'::regclass)
        and exists (select 1 from pg_policies where tablename = 'warranty_claims' and qual like '%is_staff()%')
        and pg_get_functiondef('public.my_warranty_claims()'::regprocedure) not like '%staff_note%'
        and pg_get_functiondef('public.my_warranty_claims()'::regprocedure) like '%c.buyer_id = auth.uid()%'
        and pg_get_functiondef('public.decide_warranty_claim(uuid, text, text, text)'::regprocedure) like '%if not public.is_staff()%'
        and pg_get_functiondef('public.log_warranty_claim(text, text, text, text)'::regprocedure) like '%if not public.is_staff()%'
        and not has_function_privilege('anon', 'public.open_warranty_claim(text, text)', 'EXECUTE')),
    (16, 'ReLoop Checked: nothing is on sale without an inspection, which visitors may read (never faults or notes)',
        exists (select 1 from pg_constraint where conname = 'items_inspected_before_sale' and convalidated)
        and exists (select 1 from pg_constraint where conname = 'items_inspection_shape' and convalidated)
        and not exists (select 1 from public.items where status::text in ('listed', 'reserved') and inspection is null)
        and has_column_privilege('anon', 'public.items', 'inspection', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'faults', 'SELECT')),
    (17, 'Item passport: visitors read the tag, category, stage and date only, and nothing of hidden items',
        has_table_privilege('anon', 'public.item_passport', 'SELECT')
        and not has_table_privilege('anon', 'public.item_passport', 'INSERT')
        and (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
              where table_schema = 'public' and table_name = 'item_passport')
            = array['item_id', 'category', 'part_type', 'stage', 'at']
        and pg_get_viewdef('public.item_passport'::regclass) like '%NOT i.hidden%'
        and pg_get_viewdef('public.item_passport'::regclass) not like '%note%'
        and pg_get_viewdef('public.item_passport'::regclass) not like '%paise%'
        and pg_get_viewdef('public.item_passport'::regclass) not like '%source%')
  ) as c(n, check_name, ok)
 order by n;
