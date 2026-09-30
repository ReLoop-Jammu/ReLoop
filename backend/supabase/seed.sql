-- Local development seed: one ReLoop admin account, the verified ReLoop Jammu
-- organization, and the 16 sample listings from the original prototype.
-- Runs on `supabase db reset`. Never run against production.

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'admin@reloop.local', 'authenticated', 'authenticated',
        '{"full_name": "ReLoop Admin"}');

update public.profiles set is_admin = true where id = '00000000-0000-4000-8000-000000000001';

insert into public.organizations (id, owner_id, name, slug, type, city, verification_status)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001',
        'ReLoop Jammu', 'reloop-jammu', 'collector', 'Jammu, J&K', 'verified');

insert into public.listings
  (slug, title, category, condition, price_paise, quantity, description, published_at,
   seller_id, organization_id, city, status)
select v.slug, v.title, v.category::public.listing_category, v.condition::public.listing_condition,
       v.price_paise, v.quantity, v.description, v.published_at,
       '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1',
       'Jammu, J&K', 'published'
from (values
  ('lenovo-thinkpad-t480', 'Lenovo ThinkPad T480', 'devices', 'working', 1450000, 1, 'Used business laptop. Listing shown as sample data.', timestamptz '2026-09-01 00:00:00+00' - interval '0 days'),
  ('ddr4-8gb-laptop-ram', 'DDR4 8GB Laptop RAM', 'components', 'tested', 95000, 8, 'Tested memory modules, sample lot.', timestamptz '2026-09-01 00:00:00+00' - interval '1 days'),
  ('hp-laptop-for-repair', 'HP Laptop — for repair', 'repairable', 'repairable', 320000, 1, 'Powers on intermittently. For repair or parts.', timestamptz '2026-09-01 00:00:00+00' - interval '2 days'),
  ('mixed-desktop-components-lot', 'Mixed desktop components (lot)', 'bulk_lots', 'parts_only', 850000, 1, 'Illustrative bulk lot; exact inventory to be verified.', timestamptz '2026-09-01 00:00:00+00' - interval '3 days'),
  ('refurbished-240gb-sata-ssd', 'Refurbished 240GB SATA SSD', 'components', 'tested', 125000, 5, 'Sample listing; testing report should be provided in production.', timestamptz '2026-09-01 00:00:00+00' - interval '4 days'),
  ('end-of-life-electronics-pickup-lot', 'End-of-life electronics pickup lot', 'recycling', 'end_of_life', null, 1, 'Demo only. Real end-of-life material must go through compliant authorised channels.', timestamptz '2026-09-01 00:00:00+00' - interval '5 days'),
  ('dell-22-inch-monitor', 'Dell 22-inch Monitor', 'devices', 'working', 280000, 1, 'Working monitor, local pickup preferred.', timestamptz '2026-09-01 00:00:00+00' - interval '6 days'),
  ('laptop-screens-assorted-lot', 'Laptop screens — assorted lot', 'bulk_lots', 'parts_only', 600000, 10, 'Assorted screens; compatibility and condition must be confirmed.', timestamptz '2026-09-01 00:00:00+00' - interval '7 days'),
  ('logitech-usb-keyboard', 'Logitech USB Keyboard', 'devices', 'working', 45000, 2, 'Clean USB keyboard, tested keys.', timestamptz '2026-09-01 00:00:00+00' - interval '8 days'),
  ('laptop-battery-pack-tested', 'Laptop battery pack — tested', 'components', 'tested', 110000, 4, 'Tested battery packs; compatibility varies by model.', timestamptz '2026-09-01 00:00:00+00' - interval '9 days'),
  ('desktop-tower-for-refurbishment', 'Desktop tower for refurbishment', 'repairable', 'repairable', 240000, 1, 'Needs storage replacement; suitable for refurbishment.', timestamptz '2026-09-01 00:00:00+00' - interval '10 days'),
  ('mixed-cables-and-adapters-lot', 'Mixed cables and adapters lot', 'bulk_lots', 'parts_only', 180000, 25, 'Mixed power and data cables, sold as one lot.', timestamptz '2026-09-01 00:00:00+00' - interval '11 days'),
  ('working-android-smartphone', 'Working Android smartphone', 'devices', 'working', 520000, 1, 'Demo listing. Check battery health and device status before purchase.', timestamptz '2026-09-01 00:00:00+00' - interval '12 days'),
  ('ddr3-ram-modules-bulk', 'DDR3 RAM modules — bulk', 'components', 'tested', 70000, 12, 'Tested modules for compatible older systems.', timestamptz '2026-09-01 00:00:00+00' - interval '13 days'),
  ('printer-for-parts', 'Printer for parts', 'repairable', 'parts_only', 65000, 1, 'Not printing; offered for repair or component recovery.', timestamptz '2026-09-01 00:00:00+00' - interval '14 days'),
  ('office-it-clearance-mixed-lot', 'Office IT clearance — mixed lot', 'bulk_lots', 'repairable', 1850000, 1, 'Illustrative institutional lot; inventory and condition require inspection.', timestamptz '2026-09-01 00:00:00+00' - interval '15 days')
) as v (slug, title, category, condition, price_paise, quantity, description, published_at);
