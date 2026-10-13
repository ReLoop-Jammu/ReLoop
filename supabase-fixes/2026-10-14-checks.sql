-- Read-only checks for supabase-fixes/2026-10-14.sql. Changes nothing.
-- Run it in the Supabase SQL Editor at any time: before the fix, several rows
-- show ok = false; after the fix, every row shows ok = true.

select check_name, ok
  from (values
    (1,  'Visitors can still read listing titles and prices (the shop works)',
         has_column_privilege('anon', 'public.listings', 'title', 'SELECT')
         and has_column_privilege('anon', 'public.listings', 'price', 'SELECT')),
    (2,  'Visitors cannot read listing purchase_cost, processing_cost or internal_notes',
         not has_column_privilege('anon', 'public.listings', 'purchase_cost', 'SELECT')
         and not has_column_privilege('anon', 'public.listings', 'processing_cost', 'SELECT')
         and not has_column_privilege('anon', 'public.listings', 'internal_notes', 'SELECT')),
    (3,  'Signed-in users cannot read listing purchase_cost, processing_cost or internal_notes',
         not has_column_privilege('authenticated', 'public.listings', 'purchase_cost', 'SELECT')
         and not has_column_privilege('authenticated', 'public.listings', 'processing_cost', 'SELECT')
         and not has_column_privilege('authenticated', 'public.listings', 'internal_notes', 'SELECT')),
    (4,  'Shop owners (verified or not) cannot insert submissions directly',
         not has_table_privilege('authenticated', 'public.shop_submissions', 'INSERT')
         and not has_table_privilege('anon', 'public.shop_submissions', 'INSERT')
         and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shop_submissions'
                           and cmd in ('INSERT', 'ALL') and roles && array['anon', 'authenticated']::name[])),
    (5,  'Shop owners cannot read internal notes on their submissions',
         not has_column_privilege('authenticated', 'public.shop_submissions', 'internal_notes', 'SELECT')),
    (6,  'Visitors cannot create orders or enquiries',
         not has_table_privilege('anon', 'public.orders', 'INSERT')
         and not has_table_privilege('anon', 'public.enquiries', 'INSERT')
         and not exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('orders', 'enquiries')
                           and cmd in ('INSERT', 'ALL') and roles && array['anon']::name[])),
    (7,  'Visitors cannot change or delete orders or enquiries',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('orders', 'enquiries')
                       and cmd in ('UPDATE', 'DELETE', 'ALL') and roles && array['anon']::name[])),
    (8,  'Shop verification is guarded by a trigger',
         exists (select 1 from pg_trigger where tgname = 'shop_owners_protect_verification'
                   and tgrelid = 'public.shop_owners'::regclass)),
    (9,  'Sign-up accepts shop owners without a GSTIN',
         exists (select 1 from pg_proc where proname = 'handle_new_reloop_user'
                   and prosrc like '%supplied_gstin is not null and%')),
    (10, 'Trigger functions cannot be called through the API',
         not has_function_privilege('anon', 'public.handle_new_reloop_user()', 'EXECUTE')
         and not has_function_privilege('authenticated', 'public.handle_new_reloop_user()', 'EXECUTE')),
    (11, 'No API role has TRUNCATE on any public table',
         not exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
                       and (has_table_privilege('anon', oid, 'TRUNCATE')
                            or has_table_privilege('authenticated', oid, 'TRUNCATE')))),
    (12, 'Every storage bucket allows at most 5 MB of JPEG, PNG or WebP',
         not exists (select 1 from storage.buckets
                      where file_size_limit is null or file_size_limit > 5242880 or allowed_mime_types is null
                         or not (allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp']))),
    (13, 'The 11 hub tables exist, each with Row Level Security on',
         (select count(*) from pg_class
           where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity
             and relname in ('items', 'item_events', 'item_photos', 'item_counters', 'staff', 'partners',
                             'institutions', 'repair_jobs', 'consignments', 'handovers', 'submissions')) = 11)
  ) as c(n, check_name, ok)
 order by n;
