create table if not exists public.public_website_pages (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id text not null,
  name text not null,
  path text not null,
  template text not null,
  content jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id),
  unique (tenant_id, path)
);

alter table public.public_website_pages enable row level security;

drop policy if exists "public reads website pages" on public.public_website_pages;
create policy "public reads website pages" on public.public_website_pages
  for select using (true);

drop policy if exists "members create website pages" on public.public_website_pages;
create policy "members create website pages" on public.public_website_pages
  for insert with check (public.is_tenant_member(tenant_id));

drop policy if exists "members update website pages" on public.public_website_pages;
create policy "members update website pages" on public.public_website_pages
  for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

drop policy if exists "members delete website pages" on public.public_website_pages;
create policy "members delete website pages" on public.public_website_pages
  for delete using (public.is_tenant_member(tenant_id));

create index if not exists public_website_pages_tenant_path_idx
  on public.public_website_pages (tenant_id, path);
