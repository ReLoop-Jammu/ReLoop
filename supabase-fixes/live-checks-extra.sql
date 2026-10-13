-- Read-only checks for everything added after the 2026-10-14 fix. Changes
-- nothing. Run it alongside supabase-fixes/2026-10-14-checks.sql: every row
-- should show ok = true.

select check_name, ok
  from (values
    (1, 'Visitors can read whether a listing is a sample',
        has_column_privilege('anon', 'public.listings', 'is_sample', 'SELECT')),
    (2, 'QR scans: Row Level Security is on',
        (select relrowsecurity from pg_class where oid = 'public.qr_scans'::regclass)),
    (3, 'QR scans: visitors cannot read or write them',
        not has_table_privilege('anon', 'public.qr_scans', 'SELECT')
        and not has_table_privilege('anon', 'public.qr_scans', 'INSERT')),
    (4, 'QR scans: signed-in users cannot write them (admins may read the count)',
        not has_table_privilege('authenticated', 'public.qr_scans', 'INSERT')
        and not has_table_privilege('authenticated', 'public.qr_scans', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.qr_scans', 'DELETE')),
    (5, 'Hub items: visitors can read the shop-facing columns',
        (select bool_and(has_column_privilege('anon', 'public.items', col, 'SELECT'))
           from unnest(array['id', 'category', 'part_type', 'grade', 'brand', 'model', 'description', 'checklist',
                             'wipe_required', 'wiped_at', 'list_paise', 'current_paise', 'price_cut_at', 'status',
                             'listed_at']) as col)),
    (6, 'Hub items: visitors cannot read buy price, supplier, payment, faults or any other staff-only column',
        not exists (select 1 from information_schema.columns c
                     where c.table_schema = 'public' and c.table_name = 'items'
                       and has_column_privilege('anon', 'public.items', c.column_name, 'SELECT')
                       and c.column_name not in ('id', 'category', 'part_type', 'grade', 'brand', 'model',
                                                 'description', 'checklist', 'wipe_required', 'wiped_at',
                                                 'list_paise', 'current_paise', 'price_cut_at', 'status',
                                                 'listed_at'))),
    (7, 'Hub: visitors cannot read item history, repairs, handovers, partners, institutions, staff or counters',
        not exists (select 1 from unnest(array['item_events', 'repair_jobs', 'handovers', 'partners', 'institutions',
                                               'staff', 'consignments', 'item_counters']) as t
                     where has_table_privilege('anon', 'public.' || t, 'SELECT'))),
    (8, 'Hub: signed-in users see items, repairs and handovers only if they are staff',
        not exists (select 1 from pg_policies
                     where schemaname = 'public' and tablename in ('items', 'repair_jobs', 'handovers', 'item_events')
                       and roles && array['authenticated']::name[]
                       and coalesce(qual, with_check, '') not like '%is_staff()%')),
    (9, 'Stock rules: only the daily job runs them directly; staff use run_stock_rules()',
        not has_function_privilege('anon', 'public.apply_stock_rules(timestamptz)', 'EXECUTE')
        and not has_function_privilege('authenticated', 'public.apply_stock_rules(timestamptz)', 'EXECUTE')
        and has_function_privilege('authenticated', 'public.run_stock_rules()', 'EXECUTE')
        and not has_function_privilege('anon', 'public.run_stock_rules()', 'EXECUTE')),
    (10, 'Admins count as hub staff',
        exists (select 1 from pg_proc where proname = 'is_staff' and prosrc like '%is_admin()%')),
    (11, 'Hub tags continue after the sample listings',
        (select last_number from public.item_counters where hub_code = 'JMU')
          >= coalesce((select max(id) from public.listings), 0))
  ) as c(n, check_name, ok)
 order by n;
