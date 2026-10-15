-- Read-only checks for Business Plan v2 (batch 15b). Changes nothing. Run it
-- after 2026-10-14-checks.sql, live-checks-extra.sql and live-checks-v1.sql:
-- every row should show ok = true.

select check_name, ok
  from (values
    (20, 'Removed values: households, TVs, printers, UPS units, small appliances, consignment and shipping are blocked for new rows',
        exists (select 1 from pg_trigger where tgrelid = 'public.items'::regclass and tgname = 'items_guard_removed_values')
        and exists (select 1 from pg_trigger where tgrelid = 'public.submissions'::regclass and tgname = 'submissions_guard_removed_kinds')
        and exists (select 1 from pg_trigger where tgrelid = 'public.reference_prices'::regclass and tgname = 'reference_prices_guard_categories')
        and exists (select 1 from pg_trigger where tgrelid = 'public.consignments'::regclass and tgname = 'consignments_no_new')),
    (21, 'Settings: finance.* and vrg.* are staff-only, by rule and in fact',
        exists (select 1 from pg_constraint where conname = 'app_settings_private_keys')
        and not exists (select 1 from public.app_settings where key ~ '^(finance|vrg)\.' and is_public)
        and not exists (select 1 from public.public_settings where key ~ '^(finance|vrg|ownership|wipe|stock|capacity)\.')),
    (22, 'Settings: the only public prices are the rate card, its commission and the institution lot fee',
        not exists (select 1 from public.public_settings
                     where (key ~ '(paise|price|cost|margin|rate|fee|commission)' or key ~ '^pricing\.handling')
                       and key not in ('rate_card.screens_paise', 'rate_card.batteries_paise', 'rate_card.boards_paise',
                                       'rate_card.other_paise', 'rate_card.commission_pct', 'institution.lot_fee_paise',
                                       'rate_card.as_of'))),
    (23, 'Scrap, ownership, lots, listings and exchange sales: staff-only tables, no access for visitors',
        not has_table_privilege('anon', 'public.scrap_weighins', 'SELECT')
        and not has_table_privilege('anon', 'public.scrap_ledger', 'SELECT')
        and not has_table_privilege('anon', 'public.ownership_declarations', 'SELECT')
        and not has_table_privilege('anon', 'public.institution_lots', 'SELECT')
        and not has_table_privilege('anon', 'public.exchange_sales', 'SELECT')
        and not has_table_privilege('anon', 'public.part_listings', 'SELECT')
        and not has_table_privilege('anon', 'public.dealer_reports', 'SELECT')
        and not has_table_privilege('authenticated', 'public.scrap_weighins', 'INSERT')
        and not has_table_privilege('authenticated', 'public.scrap_ledger', 'INSERT')
        and not has_table_privilege('authenticated', 'public.part_listings', 'INSERT')
        and (select bool_and(relrowsecurity) from pg_class
              where oid in ('public.scrap_weighins'::regclass, 'public.scrap_ledger'::regclass,
                            'public.ownership_declarations'::regclass, 'public.institution_lots'::regclass,
                            'public.exchange_sales'::regclass, 'public.part_listings'::regclass,
                            'public.dealer_reports'::regclass, 'public.receipt_counters'::regclass))),
    (24, 'Receipts: visitors reach a receipt only with its private token, and see no staff fields',
        has_function_privilege('anon', 'public.receipt_by_token(text)', 'EXECUTE')
        and not has_table_privilege('anon', 'public.payouts', 'SELECT')
        and not has_function_privilege('anon', 'public.payout_receipt(text)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.my_payouts()', 'EXECUTE')
        and not has_function_privilege('anon', 'public.receipt_lines(uuid)', 'EXECUTE')
        and pg_get_functiondef('public.receipt_by_token(text)'::regprocedure) not like '%reference%'
        and pg_get_functiondef('public.receipt_by_token(text)'::regprocedure) not like '%internal_note%'),
    (25, 'Parts Exchange: visitors see parts and the consenting shop only, never the commission, buy price or source',
        (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
          where table_schema = 'public' and table_name = 'parts_exchange_listings')
          = array['item_id', 'part_type', 'brand', 'model', 'description', 'current_paise', 'price_cut_at',
                  'listed_at', 'status', 'listed_by_name', 'listed_by_market']
        and not has_column_privilege('anon', 'public.items', 'commission_pct', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'listed_by_partner_id', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'source_name', 'SELECT')
        and not has_column_privilege('anon', 'public.items', 'buy_paise', 'SELECT')
        and pg_get_viewdef('public.parts_exchange_listings'::regclass) like '%agree_named%'
        and pg_get_viewdef('public.parts_exchange_listings'::regclass) like '%NOT i.hidden%'),
    (26, 'Part photos: the upload bucket is private, 5 MB, images only, and anon can read nothing from it',
        exists (select 1 from storage.buckets where id = 'part-listing-photos' and not public
                 and file_size_limit = 5242880
                 and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp'])
        and not exists (select 1 from pg_policies
                         where schemaname = 'storage' and tablename = 'objects' and 'anon' = any (roles)
                           and qual like '%part-listing-photos%')),
    (27, 'Public KPIs: counts and kg only, no money',
        (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
          where table_schema = 'public' and table_name = 'public_kpis')
          = array['partner_repair_shops', 'partner_retailers', 'kg_through_hub', 'kg_to_vrrg',
                  'kg_to_vrrg_institution_lots', 'kg_awaiting_handover', 'devices_resold', 'parts_sold']
        and pg_get_viewdef('public.public_kpis'::regclass) not like '%paise%'),
    (28, 'Hub-only functions cannot be called by visitors',
        not has_function_privilege('anon', 'public.bin_status()', 'EXECUTE')
        and not has_function_privilege('anon', 'public.pilot_kpis(date)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.stock_alerts(timestamptz)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.weekly_price_cuts(timestamptz)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.rate_card_paise()', 'EXECUTE')
        and not has_function_privilege('anon', 'public.pay_part_sale(uuid, text)', 'EXECUTE')
        and not has_function_privilege('anon', 'public.pay_tested_parts(uuid, text[], text)', 'EXECUTE')
        and not has_function_privilege('authenticated', 'public.apply_stock_rules(timestamptz)', 'EXECUTE')
        and not has_function_privilege('authenticated', 'public.cutoff_date(text)', 'EXECUTE')),
    (29, 'Handovers: VRRG rates and receipts are staff-only',
        not has_table_privilege('anon', 'public.handovers', 'SELECT')
        and not has_column_privilege('anon', 'public.handovers', 'rates_paise', 'SELECT')),
    (30, 'The weigh-in ledger, ownership and wipe rules are enforced by triggers',
        exists (select 1 from pg_trigger where tgrelid = 'public.items'::regclass and tgname = 'items_guard_ownership_wipe')
        and exists (select 1 from pg_trigger where tgrelid = 'public.items'::regclass and tgname = 'items_ledger_d_devices')
        and exists (select 1 from pg_constraint where conname = 'payouts_one_source')
        and exists (select 1 from pg_constraint where conname = 'destroyed_storage_not_listed'))
  ) as c(n, check_name, ok)
 order by n;
