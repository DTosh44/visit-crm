-- VisitMade platform extensions. Private operational data is kept tenant-owned;
-- portal access is a separate security boundary from internal workspace profiles.

alter type public.workspace_role add value if not exists 'Marketing / PR';
alter type public.workspace_role add value if not exists 'Travel Trade';
alter type public.workspace_role add value if not exists 'Viewer / Reporting';

create table if not exists public.platform_states (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.platform_states enable row level security;
create policy "workspace members read platform state" on public.platform_states for select using (public.is_tenant_member(tenant_id));
create policy "workspace members create platform state" on public.platform_states for insert with check (public.is_tenant_member(tenant_id));
create policy "workspace members update platform state" on public.platform_states for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create table if not exists public.portal_organisation_access (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id text not null,
  contact_id text not null,
  role text not null default 'Member editor' check (role in ('Member viewer','Member editor','Billing contact')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,user_id,organisation_id)
);
create index if not exists portal_access_user_idx on public.portal_organisation_access(user_id,active);
create index if not exists portal_access_tenant_org_idx on public.portal_organisation_access(tenant_id,organisation_id);
alter table public.portal_organisation_access enable row level security;
create policy "portal users read own access" on public.portal_organisation_access for select using (user_id=auth.uid() and active=true);
create policy "tenant admins manage portal access" on public.portal_organisation_access for all using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create or replace function public.has_portal_organisation_access(target_tenant uuid,target_organisation text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.portal_organisation_access where tenant_id=target_tenant and organisation_id=target_organisation and user_id=auth.uid() and active=true);
$$;

create policy "portal users read own listings" on public.public_listings for select using (public.has_portal_organisation_access(tenant_id,organisation_id));
create policy "portal editors update own listings" on public.public_listings for update using (public.has_portal_organisation_access(tenant_id,organisation_id)) with check (public.has_portal_organisation_access(tenant_id,organisation_id) and status in ('Draft','In review','Changes requested'));
create policy "portal users read own events" on public.events for select using (organisation_id is not null and public.has_portal_organisation_access(tenant_id,organisation_id));
create policy "portal editors submit own events" on public.events for insert with check (organisation_id is not null and public.has_portal_organisation_access(tenant_id,organisation_id) and status in ('Draft','In review'));
create policy "portal editors update own events" on public.events for update using (organisation_id is not null and public.has_portal_organisation_access(tenant_id,organisation_id)) with check (organisation_id is not null and public.has_portal_organisation_access(tenant_id,organisation_id) and status in ('Draft','In review','Changes requested','Withdrawn'));

create table if not exists public.public_surveys (
  id text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  definition jsonb not null,
  status text not null default 'Draft' check(status in ('Draft','Open','Closed')),
  opening_date date,
  closing_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(tenant_id,id), unique(tenant_id,slug)
);
create index if not exists public_surveys_slug_idx on public.public_surveys(slug,status);
alter table public.public_surveys enable row level security;
create policy "public reads open surveys" on public.public_surveys for select using(status='Open' and (opening_date is null or opening_date<=current_date) and (closing_date is null or closing_date>=current_date));
create policy "members manage surveys" on public.public_surveys for all using(public.is_tenant_member(tenant_id)) with check(public.is_tenant_member(tenant_id));

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  survey_id text not null,
  organisation_id text,
  contact_id text,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  foreign key(tenant_id,survey_id) references public.public_surveys(tenant_id,id) on delete cascade
);
create index if not exists survey_responses_tenant_survey_idx on public.survey_responses(tenant_id,survey_id,submitted_at desc);
alter table public.survey_responses enable row level security;
create policy "anyone submits open surveys" on public.survey_responses for insert with check(exists(select 1 from public.public_surveys s where s.tenant_id=survey_responses.tenant_id and s.id=survey_responses.survey_id and s.status='Open'));
create policy "members read survey responses" on public.survey_responses for select using(public.is_tenant_member(tenant_id));

update public.tenants set features=features||'{"memberPortal":true,"memberValue":true,"communications":true,"automations":true,"campaigns":true,"coopOpportunities":true,"travelTrade":true,"businessEvents":true,"prMedia":true,"surveys":true,"websiteHealth":true,"aiAssistant":true}'::jsonb,updated_at=now()
where id='00000000-0000-4000-8000-000000000001';
