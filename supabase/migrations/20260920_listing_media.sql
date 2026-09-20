alter table public.public_listings
  add column if not exists media jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media',
  'listing-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public listing media is readable" on storage.objects;
create policy "Public listing media is readable"
on storage.objects for select
using (bucket_id = 'listing-media');

drop policy if exists "Tenant members can upload listing media" on storage.objects;
create policy "Tenant members can upload listing media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-media'
  and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Tenant members can update listing media" on storage.objects;
create policy "Tenant members can update listing media"
on storage.objects for update to authenticated
using (
  bucket_id = 'listing-media'
  and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'listing-media'
  and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Tenant members can delete listing media" on storage.objects;
create policy "Tenant members can delete listing media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-media'
  and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
);
