-- Visit platform: tenant-aware authentication and first persistence layer.
-- Run in a new Supabase project's SQL editor before adding the Vercel variables.

create extension if not exists pgcrypto;

create type public.workspace_role as enum (
  'Administrator',
  'Membership manager',
  'Content editor',
  'Finance user'
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  legal_name text not null,
  active boolean not null default true,
  brand jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  role public.workspace_role not null default 'Content editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- A transitional persistence table lets the current provider move off localStorage
-- without forcing the UI to know about the eventual relational service layer.
create table public.workspace_states (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dashboard_widgets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- Public content is separated from private CRM state so anonymous visitors can
-- never read contacts, invoices, notes, agreements or tasks.
create table public.public_listings (
  id text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organisation_id text not null,
  name text not null,
  category text not null,
  town text not null,
  status text not null default 'Draft' check (status in ('Published','Draft','In review','Changes requested')),
  completeness integer not null default 0 check (completeness between 0 and 100),
  views integer not null default 0,
  enquiries integer not null default 0,
  short_description text not null default '',
  description text not null default '',
  website text not null default '',
  booking_url text not null default '',
  phone text not null default '',
  email text not null default '',
  opening_hours text not null default '',
  facilities jsonb not null default '[]'::jsonb,
  image text not null default '',
  media jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

alter table public.public_listings add column if not exists media jsonb not null default '[]'::jsonb;

-- Event organisers use standard Supabase Auth accounts. Events can be submitted
-- by any authenticated organiser and are deliberately independent of membership.
create table public.event_organisers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  organisation_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organisation_id text,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_by_label text not null default '',
  title text not null,
  category text not null,
  format text not null default 'One-off and short run' check (format in ('One-off and short run','Ongoing events','Online events')),
  description text not null,
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  venue_name text not null,
  address text not null,
  town text not null,
  postcode text not null,
  price text not null default 'Free',
  booking_url text not null default '',
  contact_name text not null,
  contact_email text not null,
  image text not null default 'theatre',
  accessibility text not null default '',
  status text not null default 'In review' check (status in ('Published','Draft','In review','Changes requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normalised metrics are ready for scheduled social API imports. The current
-- local workspace also keeps a copy in workspace_states so it works without credentials.
create table public.social_metrics (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null,
  channel text,
  metric_key text not null,
  metric_label text not null,
  value numeric not null,
  display_value text not null,
  context text not null default '',
  period text not null,
  measured_at date not null,
  imported_at timestamptz not null default now(),
  unique (tenant_id, source, channel, metric_key, period)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and tenant_id = target_tenant
      and active = true
  );
$$;

create or replace function public.is_tenant_admin(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and tenant_id = target_tenant
      and active = true
      and role = 'Administrator'
  );
$$;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_states enable row level security;
alter table public.user_preferences enable row level security;
alter table public.public_listings enable row level security;
alter table public.event_organisers enable row level security;
alter table public.events enable row level security;
alter table public.social_metrics enable row level security;
alter table public.audit_log enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=10485760, allowed_mime_types=excluded.allowed_mime_types;

create policy "public reads listing media" on storage.objects
  for select using (bucket_id='listing-media');
create policy "members upload listing media" on storage.objects
  for insert with check (bucket_id='listing-media' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
create policy "members update listing media" on storage.objects
  for update using (bucket_id='listing-media' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));
create policy "members delete listing media" on storage.objects
  for delete using (bucket_id='listing-media' and public.is_tenant_member(((storage.foldername(name))[1])::uuid));

create policy "members read tenant" on public.tenants
  for select using (public.is_tenant_member(id));
create policy "admins update tenant" on public.tenants
  for update using (public.is_tenant_admin(id));

create policy "members read profiles" on public.profiles
  for select using (public.is_tenant_member(tenant_id));
create policy "admins manage profiles" on public.profiles
  for all using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create policy "members read workspace" on public.workspace_states
  for select using (public.is_tenant_member(tenant_id));
create policy "members create workspace" on public.workspace_states
  for insert with check (public.is_tenant_member(tenant_id));
create policy "members update workspace" on public.workspace_states
  for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "users read own preferences" on public.user_preferences
  for select using (user_id = auth.uid() and public.is_tenant_member(tenant_id));
create policy "users create own preferences" on public.user_preferences
  for insert with check (user_id = auth.uid() and public.is_tenant_member(tenant_id));
create policy "users update own preferences" on public.user_preferences
  for update using (user_id = auth.uid() and public.is_tenant_member(tenant_id))
  with check (user_id = auth.uid() and public.is_tenant_member(tenant_id));

create policy "public reads published listings" on public.public_listings
  for select using (status = 'Published');
create policy "members create listings" on public.public_listings
  for insert with check (public.is_tenant_member(tenant_id));
create policy "members update listings" on public.public_listings
  for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members delete listings" on public.public_listings
  for delete using (public.is_tenant_member(tenant_id));

create policy "organisers read own profile" on public.event_organisers
  for select using (user_id = auth.uid());
create policy "organisers create own profile" on public.event_organisers
  for insert with check (user_id = auth.uid());
create policy "organisers update own profile" on public.event_organisers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "public reads published events" on public.events
  for select using (status = 'Published' or submitted_by = auth.uid() or public.is_tenant_member(tenant_id));
create policy "organisers submit events" on public.events
  for insert with check (submitted_by = auth.uid() or public.is_tenant_member(tenant_id));
create policy "organisers update own unpublished events" on public.events
  for update using ((submitted_by = auth.uid() and status <> 'Published') or public.is_tenant_member(tenant_id))
  with check ((submitted_by = auth.uid() and status <> 'Published') or public.is_tenant_member(tenant_id));
create policy "members delete events" on public.events
  for delete using (public.is_tenant_member(tenant_id));

create policy "members read social metrics" on public.social_metrics
  for select using (public.is_tenant_member(tenant_id));
create policy "members create social metrics" on public.social_metrics
  for insert with check (public.is_tenant_member(tenant_id));
create policy "members update social metrics" on public.social_metrics
  for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members delete social metrics" on public.social_metrics
  for delete using (public.is_tenant_member(tenant_id));

create policy "members read audit" on public.audit_log
  for select using (public.is_tenant_member(tenant_id));
create policy "members create audit" on public.audit_log
  for insert with check (public.is_tenant_member(tenant_id));

-- The fixed UUID makes the reference tenant easy to use in local seed scripts.
insert into public.tenants (id, slug, name, legal_name, brand, features)
values (
  '00000000-0000-4000-8000-000000000001',
  'valechester',
  'Visit Valechester',
  'Valechester Visitor Economy Partnership',
  '{"primary":"#6d294f","primaryDark":"#4f1b39","accent":"#f0785e","sage":"#7a9a83","ink":"#22152b","strapline":"Past, present, perfectly placed."}'::jsonb,
  '{"publicWebsite":true,"organisations":true,"salesPipeline":true,"memberships":true,"listings":true,"events":true,"itineraries":true,"billing":true,"agreements":true,"tasks":true,"businessPortal":false,"travelTrade":false,"reviewIntelligence":false,"socialInsights":true,"aiWebsiteEditor":false}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  brand = excluded.brand,
  features = excluded.features,
  updated_at = now();

-- Create staff through Supabase Authentication, then link them to a tenant:
-- insert into public.profiles (user_id, tenant_id, full_name, role)
-- values ('AUTH_USER_UUID', '00000000-0000-4000-8000-000000000001', 'Full Name', 'Administrator');
