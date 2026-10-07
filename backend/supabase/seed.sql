-- Local development seed (runs on `supabase db reset`; never on production):
-- one hub admin and the 12 sample items shown in the shop before the hub opens.
-- Generated from frontend/src/data/shop-snapshot.json.

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'hub@reloop.local', 'authenticated', 'authenticated',
        '{"full_name": "Hub Admin"}');

insert into public.staff (user_id, full_name, role)
values ('00000000-0000-4000-8000-000000000001', 'Hub Admin', 'admin');

insert into public.items
  (id, source_type, category, part_type, brand, model, description, checklist, grade, wiped_at, wipe_method,
   buy_mode, list_paise, current_paise, price_cut_at, status, listed_at)
values
  ('RL-JMU-0001', 'repair_shop', 'laptop', null, 'Lenovo', 'ThinkPad T480', 'Intel Core i5 (8th gen), 8 GB RAM, 256 GB SSD. Battery holds a full charge.', '{"Powers on":true,"Display":true,"Keyboard":true,"Battery health":true,"Ports":true,"Wi-Fi":true}'::jsonb, 'A', '2026-10-20T10:00:00.000Z', 'reset_overwrite'::public.wipe_method, 'cash', 1450000, 1450000, null, 'listed', '2026-10-20T10:00:00.000Z'),
  ('RL-JMU-0002', 'repair_shop', 'phone', null, 'Samsung', 'Galaxy M31', '6 GB / 128 GB. Light scratches on the back, screen is clean.', '{"Powers on":true,"Display":true,"Touch":true,"Cameras":true,"Battery health":true,"Charging":true}'::jsonb, 'A', '2026-10-19T10:00:00.000Z', 'reset_overwrite'::public.wipe_method, 'cash', 620000, 620000, null, 'listed', '2026-10-19T10:00:00.000Z'),
  ('RL-JMU-0003', 'repair_shop', 'monitor', null, 'Dell', '22-inch monitor (E2216H)', 'Full HD, VGA and DisplayPort. Stand included.', '{"Powers on":true,"Display":true,"No dead pixels":true,"Inputs":true}'::jsonb, 'A', null, null, 'cash', 280000, 280000, null, 'listed', '2026-10-18T10:00:00.000Z'),
  ('RL-JMU-0004', 'repair_shop', 'laptop', null, 'HP', '250 G7 laptop', 'New battery fitted by a partner repair shop. Core i3, 8 GB RAM, 256 GB SSD.', '{"Powers on":true,"Display":true,"Keyboard":true,"Battery health":true,"Ports":true}'::jsonb, 'B', '2026-10-17T10:00:00.000Z', 'reset_overwrite'::public.wipe_method, 'cash', 1150000, 1150000, null, 'listed', '2026-10-17T10:00:00.000Z'),
  ('RL-JMU-0005', 'repair_shop', 'phone', null, 'Redmi', 'Note 10', 'Screen replaced by a partner repair shop. 4 GB / 64 GB.', '{"Powers on":true,"Display":true,"Touch":true,"Cameras":true,"Charging":true}'::jsonb, 'B', '2026-10-16T10:00:00.000Z', 'reset_overwrite'::public.wipe_method, 'cash', 675000, 540000, '2026-10-16T10:00:00.000Z', 'listed', '2026-10-16T10:00:00.000Z'),
  ('RL-JMU-0006', 'repair_shop', 'accessory', null, 'Logitech', 'K120 keyboard', 'USB keyboard, all keys tested.', '{"All keys":true,"Cable":true}'::jsonb, 'A', null, null, 'cash', 45000, 45000, null, 'listed', '2026-10-15T10:00:00.000Z'),
  ('RL-JMU-0007', 'repair_shop', 'printer', null, 'Canon', 'LBP2900 printer', 'Pickup roller replaced. Prints cleanly; toner about half full.', '{"Powers on":true,"Test print":true,"Paper feed":true}'::jsonb, 'B', null, null, 'cash', 320000, 320000, null, 'listed', '2026-10-14T10:00:00.000Z'),
  ('RL-JMU-0008', 'repair_shop', 'part', 'ram'::public.part_type, '8', 'GB DDR4 laptop RAM', 'Removed from a Dell laptop. Passed a memory test.', '{"Memory test":true}'::jsonb, 'C', null, null, 'cash', 95000, 95000, null, 'listed', '2026-10-13T10:00:00.000Z'),
  ('RL-JMU-0009', 'repair_shop', 'part', 'storage'::public.part_type, '240', 'GB SATA SSD', 'Removed from a desktop. Health 92%, securely wiped.', '{"Health check":true,"Secure wipe":true}'::jsonb, 'C', '2026-10-12T10:00:00.000Z', 'reset_overwrite'::public.wipe_method, 'cash', 125000, 125000, null, 'listed', '2026-10-12T10:00:00.000Z'),
  ('RL-JMU-0010', 'repair_shop', 'part', 'screen'::public.part_type, '15.6-inch', 'laptop screen (30-pin)', 'Full HD panel removed from an HP laptop. No dead pixels.', '{"No dead pixels":true,"Backlight":true}'::jsonb, 'C', null, null, 'cash', 180000, 180000, null, 'listed', '2026-10-11T10:00:00.000Z'),
  ('RL-JMU-0011', 'repair_shop', 'part', 'board'::public.part_type, 'Laptop', 'motherboard, Lenovo IdeaPad 320', 'Boots to BIOS with known-good RAM. For repairers.', '{"Boots to BIOS":true}'::jsonb, 'C', null, null, 'cash', 220000, 220000, null, 'listed', '2026-10-10T10:00:00.000Z'),
  ('RL-JMU-0012', 'repair_shop', 'part', 'charger'::public.part_type, '65', 'W laptop charger (round pin)', 'Output tested under load.', '{"Output under load":true}'::jsonb, 'C', null, null, 'cash', 40000, 40000, null, 'listed', '2026-10-09T10:00:00.000Z');

update public.item_counters set last_number = 12 where hub_code = 'JMU';
