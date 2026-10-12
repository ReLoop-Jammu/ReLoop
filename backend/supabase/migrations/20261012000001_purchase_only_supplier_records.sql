-- ReLoop purchase-only supplier intake records. Additive and safe for existing data.
alter table public.items
  add column if not exists source_contact_name text not null default '',
  add column if not exists source_phone text not null default '',
  add column if not exists purchase_payment_method text not null default 'not_paid',
  add column if not exists purchase_reference text not null default '',
  add column if not exists purchase_paid_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_purchase_payment_method_check'
  ) then
    alter table public.items
      add constraint items_purchase_payment_method_check
      check (purchase_payment_method in ('cash', 'upi', 'bank_transfer', 'other', 'not_paid'));
  end if;
end $$;
