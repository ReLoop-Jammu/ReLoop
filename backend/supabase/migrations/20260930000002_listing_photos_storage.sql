-- Public bucket for listing photos. Each user uploads only into a folder named
-- after their user id: listing-photos/<user-id>/<listing-id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Listing photos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-photos');

create policy "Members upload into their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Members update files in their own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Members delete files in their own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
