-- Photos of items. Publicly readable (the shop shows them for stock on sale);
-- only hub staff can upload or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Item photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-photos');

create policy "Staff upload item photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (select public.is_staff()));

create policy "Staff delete item photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (select public.is_staff()));
