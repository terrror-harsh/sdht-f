insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'sdht-media',
  'sdht-media',
  false,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "SDHT roles read media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sdht-media'
  and public.has_role(array['admin', 'volunteer', 'veterinarian', 'ngo']::public.app_role[])
);

create policy "Care team uploads dog media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'dogs'
  and public.has_role(array['admin', 'veterinarian']::public.app_role[])
);

create policy "Care team updates dog media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'dogs'
  and public.has_role(array['admin', 'veterinarian']::public.app_role[])
)
with check (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'dogs'
  and public.has_role(array['admin', 'veterinarian']::public.app_role[])
);

create policy "Care team deletes dog media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'dogs'
  and public.has_role(array['admin', 'veterinarian']::public.app_role[])
);

create policy "Rescue team uploads report media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'health-reports'
  and public.has_role(array['admin', 'volunteer', 'veterinarian']::public.app_role[])
);

create policy "Rescue team updates report media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'health-reports'
  and public.has_role(array['admin', 'volunteer', 'veterinarian']::public.app_role[])
)
with check (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'health-reports'
  and public.has_role(array['admin', 'volunteer', 'veterinarian']::public.app_role[])
);

create policy "Rescue team deletes report media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sdht-media'
  and (storage.foldername(name))[1] = 'health-reports'
  and public.has_role(array['admin', 'volunteer', 'veterinarian']::public.app_role[])
);
