-- Business Plan v2: two new part types for the Parts Exchange. Enum values can't
-- be used in the transaction that adds them, so this is its own migration.
alter type public.part_type add value if not exists 'camera';
alter type public.part_type add value if not exists 'charging_port';
