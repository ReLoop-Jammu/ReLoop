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
        and not has_table_privilege('authenticated', 'public.qr_scans', 'DELETE'))
  ) as c(n, check_name, ok)
 order by n;
