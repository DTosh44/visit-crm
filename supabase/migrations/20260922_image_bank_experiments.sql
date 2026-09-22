-- Image Bank metadata and experiment attribution. Binary files live in the
-- image-bank object-storage bucket under a tenant-id folder.
create table if not exists public.image_assets (
  id text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  storage_path text,
  public_url text not null,
  alt_text text not null default '',
  caption text not null default '',
  credit text not null default '',
  rights_holder text not null default '',
  licence text not null default 'Owned',
  usage_expiry date,
  tags text[] not null default '{}',
  collection_name text not null default 'Uncategorised',
  width integer not null default 0,
  height integer not null default 0,
  file_size bigint not null default 0,
  mime_type text not null default 'image/jpeg',
  status text not null default 'Ready',
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,id)
);

create table if not exists public.website_experiments (
  id text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  hypothesis text not null default '',
  page_path text not null,
  goal text not null default 'cta_click',
  status text not null default 'Draft',
  variants jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,id)
);

alter table public.website_analytics_events add column if not exists experiment_id text;
alter table public.website_analytics_events add column if not exists variant_id text;
create index if not exists website_analytics_experiment_idx on public.website_analytics_events(tenant_id,experiment_id,variant_id,occurred_at desc);

alter table public.image_assets enable row level security;
alter table public.website_experiments enable row level security;

drop policy if exists "Tenant members manage image assets" on public.image_assets;
create policy "Tenant members manage image assets" on public.image_assets for all to authenticated
using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
drop policy if exists "Tenant members manage experiments" on public.website_experiments;
create policy "Tenant members manage experiments" on public.website_experiments for all to authenticated
using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
drop policy if exists "Public can read running experiments" on public.website_experiments;
create policy "Public can read running experiments" on public.website_experiments for select to anon
using (status = 'Running');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('image-bank','image-bank',true,15728640,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Tenant members upload image bank files" on storage.objects;
create policy "Tenant members upload image bank files" on storage.objects for insert to authenticated
with check (bucket_id='image-bank' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "Tenant members update image bank files" on storage.objects;
create policy "Tenant members update image bank files" on storage.objects for update to authenticated
using (bucket_id='image-bank' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "Tenant members delete image bank files" on storage.objects;
create policy "Tenant members delete image bank files" on storage.objects for delete to authenticated
using (bucket_id='image-bank' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
