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
                                                 'listed_at',
                                                 -- the ReLoop Checked report (20261102000001)
                                                 'inspection', 'inspected_at', 'wipe_method'))),
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
          >= coalesce((select max(id) from public.listings), 0)),
    (12, 'Password reset: users cannot change their own must_change_password flag',
        not has_column_privilege('authenticated', 'public.profiles', 'must_change_password', 'UPDATE')
        and not has_column_privilege('anon', 'public.profiles', 'must_change_password', 'UPDATE')),
    (13, 'Audit log: no visitor access, no writes by signed-in users, and no password column',
        not has_table_privilege('anon', 'public.admin_audit_log', 'SELECT')
        and not has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT')
        and not has_table_privilege('authenticated', 'public.admin_audit_log', 'UPDATE')
        and not exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'admin_audit_log'
                           and column_name ilike '%pass%')),
    (14, 'A temporary password opens nothing: admin and staff checks respect the flag',
        (select count(*) from pg_proc
          where proname in ('is_admin', 'is_staff') and prosrc like '%password_change_pending()%') = 2),
    (15, 'Requests: visitors and signed-in users cannot insert them directly (only the server route can)',
        not has_table_privilege('anon', 'public.submissions', 'INSERT')
        and not has_table_privilege('authenticated', 'public.submissions', 'INSERT')
        and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions'
                          and cmd in ('INSERT', 'ALL') and roles && array['anon']::name[])),
    (16, 'Requests: visitors cannot read them, and signed-in users only if they are staff',
        not has_table_privilege('anon', 'public.submissions', 'SELECT')
        and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'submissions'
                          and roles && array['authenticated']::name[]
                          and coalesce(qual, with_check, '') not like '%is_staff()%')),
    (17, 'Shop submissions: a signed-in user sees only their own rows unless they are staff or admin',
        not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_submissions'
                      and cmd in ('SELECT', 'ALL') and roles && array['authenticated']::name[]
                      and coalesce(qual, '') not like '%auth.uid()%'
                      and coalesce(qual, '') not like '%is_staff()%'
                      and coalesce(qual, '') not like '%is_admin()%')),
    (18, 'Shop submissions: owners can read their offer and note, but not internal notes',
        has_column_privilege('authenticated', 'public.shop_submissions', 'offer_price', 'SELECT')
        and has_column_privilege('authenticated', 'public.shop_submissions', 'offer_note', 'SELECT')
        and not has_column_privilege('authenticated', 'public.shop_submissions', 'internal_notes', 'SELECT')
        and not has_table_privilege('anon', 'public.shop_submissions', 'SELECT')),
    (19, 'Hub items: visitors cannot see which shop submission an item came from',
        not has_column_privilege('anon', 'public.items', 'shop_submission_id', 'SELECT')),
    (20, 'Converting a submission into hub items is not possible for visitors',
        not has_function_privilege('anon',
          'public.convert_submission(bigint, public.item_category, public.part_type, bigint)', 'EXECUTE')),
    (21, 'Partner map: the public view shows only name, market and an (approximate) position',
        (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
          where table_schema = 'public' and table_name = 'map_partner_shops')
          = array['name', 'market', 'lat', 'lng', 'approximate']),
    (22, 'Partner map: only verified shops that agreed appear, and visitors still cannot read shop_owners',
        (select pg_get_viewdef('public.map_partner_shops'::regclass) like '%show_on_map%'
            and pg_get_viewdef('public.map_partner_shops'::regclass) like '%verified%')
        and has_table_privilege('anon', 'public.map_partner_shops', 'SELECT')
        and not has_table_privilege('anon', 'public.shop_owners', 'SELECT')),
    (23, 'Team: ReLoop has at least one admin, and triggers keep it that way',
        public.active_admin_count() >= 1
        and exists (select 1 from pg_trigger where tgname = 'admin_users_keep_one_admin')
        and exists (select 1 from pg_trigger where tgname = 'staff_keep_one_admin')),
    (24, 'Team: visitors cannot change roles',
        not has_function_privilege('anon', 'public.set_account_role(uuid, boolean, boolean)', 'EXECUTE')),
    (25, 'Retention: closing a request starts its clock, and only the database can run the clean-up',
        exists (select 1 from pg_trigger where tgname = 'submissions_track_closed')
        and not has_function_privilege('anon', 'public.purge_closed_requests(timestamptz)', 'EXECUTE')
        and not has_function_privilege('authenticated', 'public.purge_closed_requests(timestamptz)', 'EXECUTE')),
    (26, 'Retention: the daily clean-up job is scheduled',
        exists (select 1 from cron.job where jobname = 'reloop-request-retention' and active
                  and (command like '%purge_closed_requests%'
                       -- since 20261029000001 one job runs every retention rule, requests first
                       or (command like '%purge_expired_personal_data%'
                           and exists (select 1 from pg_proc where proname = 'purge_expired_personal_data'
                                         and prosrc like '%public.purge_closed_requests(now_at)%'))))),
    (27, 'Tracked links: Row Level Security is on, and visitors and signed-in users cannot read or write clicks',
        (select relrowsecurity from pg_class where oid = 'public.link_visits'::regclass)
        and not has_table_privilege('anon', 'public.link_visits', 'SELECT')
        and not has_table_privilege('anon', 'public.link_visits', 'INSERT')
        and not has_table_privilege('authenticated', 'public.link_visits', 'SELECT')
        and not has_table_privilege('authenticated', 'public.link_visits', 'INSERT')),
    (28, 'Tracked links: only signed-in admins can read the counts, and clicks store nothing personal',
        not has_function_privilege('anon', 'public.link_visit_counts()', 'EXECUTE')
        and (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
              where table_schema = 'public' and table_name = 'link_visits')
            = array['id', 'slug', 'source', 'medium', 'visited_at']),
    (29, 'Impact counter: the public view shows only the three totals',
        has_table_privilege('anon', 'public.impact_totals', 'SELECT')
        and (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
              where table_schema = 'public' and table_name = 'impact_totals')
            = array['items_reused', 'kg_recycled', 'active_partner_shops']),
    (30, 'Impact counter: visitors still cannot read items cost, handovers or partners',
        not has_column_privilege('anon', 'public.items', 'buy_paise', 'SELECT')
        and not has_table_privilege('anon', 'public.handovers', 'SELECT')
        and not has_table_privilege('anon', 'public.partners', 'SELECT'))
  ) as c(n, check_name, ok)
 order by n;
