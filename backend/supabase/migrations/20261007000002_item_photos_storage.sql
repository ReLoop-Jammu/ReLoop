-- Photos of items. Publicly readable (the shop shows them for stock on sale);
-- only hub staff can upload or delete. Safe to run more than once.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Item photos are publicly readable" on storage.objects;
create policy "Item photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-photos');

drop policy if exists "Staff upload item photos" on storage.objects;
create policy "Staff upload item photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (select public.is_staff()));

drop policy if exists "Staff delete item photos" on storage.objects;
create policy "Staff delete item photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (select public.is_staff()));
