create table if not exists public.public_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.public_submissions enable row level security;
drop policy if exists "anyone creates public submissions" on public.public_submissions;
create policy "anyone creates public submissions" on public.public_submissions for insert with check (true);
drop policy if exists "tenant members read submissions" on public.public_submissions;
create policy "tenant members read submissions" on public.public_submissions for select using (public.is_tenant_member(tenant_id));

drop policy if exists "public reads active tenant configuration" on public.tenants;
create policy "public reads active tenant configuration" on public.tenants for select using (active=true);

-- Event organisers use Supabase Auth. Staff membership is deliberately separate
-- in public.profiles, so an organiser account cannot open the CRM.
alter table public.event_organisers add column if not exists email text;
alter table public.profiles add column if not exists email text;
alter table public.events add column if not exists moderation_note text not null default '';

-- Storage for event imagery uses the same tenant-folder access pattern as listings.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('event-media','event-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public event media is readable" on storage.objects;
create policy "Public event media is readable" on storage.objects for select using (bucket_id='event-media');
drop policy if exists "Authenticated users upload event media" on storage.objects;
create policy "Authenticated users upload event media" on storage.objects for insert to authenticated with check (bucket_id='event-media');
drop policy if exists "Owners update event media" on storage.objects;
create policy "Owners update event media" on storage.objects for update to authenticated using (bucket_id='event-media' and owner_id=auth.uid()::text);
drop policy if exists "Owners delete event media" on storage.objects;
create policy "Owners delete event media" on storage.objects for delete to authenticated using (bucket_id='event-media' and owner_id=auth.uid()::text);
