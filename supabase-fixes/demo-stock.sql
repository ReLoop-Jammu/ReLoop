-- DEMO STOCK for trying the live shop before real stock exists.
-- Run once in the production project's SQL editor. Adds 10 listed hub items
-- (devices and tested parts) that can be reserved like real stock; the sample
-- listings hide themselves while hub stock exists.
-- Every row is marked source_name = 'DEMO STOCK (delete before launch)'.
-- Remove it all with supabase-fixes/demo-stock-wipe.sql.

begin;

do $$
begin
  if exists (select 1 from public.items where source_name = 'DEMO STOCK (delete before launch)') then
    raise exception 'Demo stock is already there; run demo-stock-wipe.sql first';
  end if;
end $$;

insert into public.items
  (source_type, source_name, category, part_type, brand, model, description, has_battery, weight_kg,
   grade, buy_mode, buy_paise, list_paise, current_paise, status, listed_at,
   wipe_method, wiped_at, inspection, inspected_at, ownership_confirmed_at)
values
  ('repair_shop', 'DEMO STOCK (delete before launch)', 'laptop', null, 'Lenovo', 'ThinkPad T480',
   'Intel Core i5 (8th gen), 8 GB RAM, 256 GB SSD, 14-inch full HD screen. Battery holds a full working day.',
   true, 1.6, 'A', 'free', 0, 1450000, 1450000, 'listed', now() - interval '2 days',
   'drive_wipe', now() - interval '3 days',
   '{"version":1,"checks":{"Powers on":"pass","Display":"pass","Keyboard":"pass","Trackpad":"pass","Battery health":"pass","Ports":"pass","Wi-Fi":"pass"},"battery_health_pct":86,"storage_health_pct":97}',
   now() - interval '3 days', now() - interval '4 days'),
  ('retailer', 'DEMO STOCK (delete before launch)', 'phone', null, 'Samsung', 'Galaxy M31',
   '6 GB RAM, 128 GB storage, 6.4-inch AMOLED screen. New battery fitted by a partner shop.',
   true, 0.19, 'B', 'free', 0, 620000, 620000, 'listed', now() - interval '1 day',
   'reset_overwrite', now() - interval '2 days',
   '{"version":1,"checks":{"Powers on":"pass","Display":"pass","Touch":"pass","Cameras":"pass","Battery health":"pass","Charging":"pass","Buttons":"pass"},"battery_health_pct":100}',
   now() - interval '2 days', now() - interval '5 days'),
  ('institution', 'DEMO STOCK (delete before launch)', 'monitor', null, 'Dell', 'E2216H 22-inch',
   '22-inch full HD monitor with VGA and DisplayPort. Stand included; no dead pixels.',
   false, 3.4, 'A', 'free', 0, 280000, 280000, 'listed', now() - interval '3 days',
   null, null,
   '{"version":1,"checks":{"Powers on":"pass","Display":"pass","No dead pixels":"pass","Inputs":"pass"}}',
   now() - interval '4 days', now() - interval '6 days'),
  ('repair_shop', 'DEMO STOCK (delete before launch)', 'laptop', null, 'HP', '250 G7',
   'Intel Core i3 (10th gen), 8 GB RAM, 512 GB SSD, 15.6-inch screen. Keyboard replaced and re-tested.',
   true, 1.8, 'B', 'free', 0, 1150000, 1150000, 'listed', now() - interval '4 days',
   'drive_wipe', now() - interval '5 days',
   '{"version":1,"checks":{"Powers on":"pass","Display":"pass","Keyboard":"pass","Trackpad":"pass","Battery health":"pass","Ports":"pass","Wi-Fi":"pass"},"battery_health_pct":78,"storage_health_pct":99}',
   now() - interval '5 days', now() - interval '7 days'),
  ('repair_shop', 'DEMO STOCK (delete before launch)', 'phone', null, 'Xiaomi', 'Redmi Note 10',
   '4 GB RAM, 64 GB storage, 6.43-inch AMOLED screen, 48 MP camera. Charger included.',
   true, 0.18, 'A', 'free', 0, 790000, 790000, 'listed', now() - interval '1 day',
   'reset_overwrite', now() - interval '2 days',
   '{"version":1,"checks":{"Powers on":"pass","Display":"pass","Touch":"pass","Cameras":"pass","Battery health":"pass","Charging":"pass","Buttons":"pass"},"battery_health_pct":91}',
   now() - interval '2 days', now() - interval '3 days'),
  ('institution', 'DEMO STOCK (delete before launch)', 'desktop', null, 'Dell', 'OptiPlex 3060',
   'Intel Core i5 (8th gen), 8 GB RAM, 256 GB SSD, small form factor. Keyboard and mouse not included.',
   false, 5.2, 'B', 'free', 0, 950000, 950000, 'listed', now() - interval '6 days',
   'drive_wipe', now() - interval '7 days',
   '{"version":1,"checks":{"Powers on":"pass","Boots":"pass","Ports":"pass","Storage":"pass"},"storage_health_pct":95}',
   now() - interval '7 days', now() - interval '9 days'),
  ('retailer', 'DEMO STOCK (delete before launch)', 'accessory', null, 'Logitech', 'K120 keyboard',
   'Full-size USB keyboard, spill-resistant. Every key tested.',
   false, 0.55, 'A', 'free', 0, 45000, 45000, 'listed', now() - interval '2 days',
   null, null,
   '{"version":1,"checks":{"Works":"pass","Cable / connector":"pass"}}',
   now() - interval '3 days', now() - interval '4 days'),
  ('stripped', 'DEMO STOCK (delete before launch)', 'part', 'screen', 'Samsung', 'Galaxy M31 display assembly',
   'Original AMOLED display with frame, tested working on a donor phone. No dead pixels or burn-in.',
   false, 0.06, 'C', 'free', 0, 180000, 180000, 'listed', now() - interval '3 days',
   null, null,
   '{"version":1,"checks":{"Tested working":"pass"}}',
   now() - interval '3 days', now() - interval '5 days'),
  ('stripped', 'DEMO STOCK (delete before launch)', 'part', 'ram', 'Kingston', '8 GB DDR4 laptop RAM (2666 MHz)',
   'SO-DIMM module from a stripped laptop. Passed a full memory test.',
   false, 0.01, 'C', 'free', 0, 90000, 90000, 'listed', now() - interval '2 days',
   null, null,
   '{"version":1,"checks":{"Tested working":"pass"}}',
   now() - interval '2 days', now() - interval '4 days'),
  ('stripped', 'DEMO STOCK (delete before launch)', 'part', 'battery', 'Xiaomi', 'Redmi Note 9 battery (BN54)',
   '5020 mAh battery, holds charge. Fitted and tested before listing.',
   true, 0.07, 'C', 'free', 0, 45000, 45000, 'listed', now() - interval '1 day',
   null, null,
   '{"version":1,"checks":{"Tested working":"pass"},"battery_health_pct":88}',
   now() - interval '1 day', now() - interval '2 days');

select id, category, brand, model, grade, current_paise / 100 as price_rupees
  from public.items where source_name = 'DEMO STOCK (delete before launch)' order by id;

commit;
