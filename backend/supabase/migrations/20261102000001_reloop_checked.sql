-- ReLoop Checked (v1.0.0 batch 11): a structured inspection per item, kept
-- in items.inspection with a version, and required before anything goes on
-- sale. The public item page shows it as the "ReLoop Checked" report: each
-- check (pass, fail or not applicable), battery and storage health where
-- measured, the data wipe (date and method) and the grade.
--
-- Shape (version 1):
--   { "version": 1,
--     "checks": { "<check name>": "pass" | "fail" | "na", ... },
--     "battery_health_pct": 0-100,   (optional)
--     "storage_health_pct": 0-100,   (optional)
--     "from_checklist": true }       (optional: backfilled from the old checklist)
-- Notes and faults stay in items.faults, which visitors never read.

alter table public.items
  add column if not exists inspection jsonb,
  add column if not exists inspected_at timestamptz;

-- Existing graded items keep what their checklist recorded, as version 1.
update public.items i
   set inspection = jsonb_build_object(
         'version', 1,
         'checks', coalesce((select jsonb_object_agg(c.key, case when c.value = 'true'::jsonb then 'pass' else 'fail' end)
                               from jsonb_each(i.checklist) c), '{}'::jsonb),
         'from_checklist', true),
       inspected_at = coalesce(i.graded_at, i.received_at)
 where i.inspection is null and i.grade is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_inspection_shape') then
    alter table public.items add constraint items_inspection_shape check (
      -- coalesce: a missing key gives NULL, which a check would let through.
      inspection is null or coalesce((
        jsonb_typeof(inspection) = 'object'
        and jsonb_typeof(inspection -> 'version') = 'number'
        and jsonb_typeof(inspection -> 'checks') = 'object'
        and not jsonb_path_exists(inspection -> 'checks', '$.* ? (@ != "pass" && @ != "fail" && @ != "na")')
        and (inspection -> 'battery_health_pct' is null
             or case when jsonb_typeof(inspection -> 'battery_health_pct') = 'number'
                     then (inspection ->> 'battery_health_pct')::numeric between 0 and 100 else false end)
        and (inspection -> 'storage_health_pct' is null
             or case when jsonb_typeof(inspection -> 'storage_health_pct') = 'number'
                     then (inspection ->> 'storage_health_pct')::numeric between 0 and 100 else false end)
        and pg_column_size(inspection) < 4000
      ), false)
    );
  end if;
  -- Nothing goes on sale without an inspection.
  if not exists (select 1 from pg_constraint where conname = 'items_inspected_before_sale') then
    alter table public.items add constraint items_inspected_before_sale check (
      status::text not in ('listed', 'reserved') or (inspection is not null and inspected_at is not null)
    );
  end if;
end $$;

-- Staff write it with the rest of the grade; visitors read it with the item
-- (and the wipe method, for the report). Still never costs, sources or notes.
grant update (inspection, inspected_at) on public.items to authenticated;
grant select (inspection, inspected_at, wipe_method) on public.items to anon;
