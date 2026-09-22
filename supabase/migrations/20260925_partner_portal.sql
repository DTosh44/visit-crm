-- Portal users have no workspace profile and no direct access to private CRM JSON.
-- All writes are validated through the portal-access Edge Function.
alter table public.portal_organisation_access drop constraint if exists portal_organisation_access_role_check;
alter table public.portal_organisation_access add constraint portal_organisation_access_role_check check(role in ('Member admin','Member editor','Member viewer','Billing contact'));
alter table public.portal_organisation_access add column if not exists primary_account boolean not null default false;
create unique index if not exists portal_one_active_org_per_user on public.portal_organisation_access(tenant_id,user_id) where active;
create unique index if not exists portal_one_primary_account_per_org on public.portal_organisation_access(tenant_id,organisation_id) where active and primary_account;
alter table public.public_listings add column if not exists accessibility text not null default '';

create table if not exists public.portal_change_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organisation_id text not null,
  contact_id text not null,
  actor_id uuid not null references auth.users(id),
  entity_type text not null check(entity_type in ('organisation','listing','event')),
  entity_id text,
  proposed jsonb not null default '{}'::jsonb,
  status text not null check(status in ('Draft','Submitted','Approved','Rejected')),
  review_note text not null default '',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portal_requests_org_idx on public.portal_change_requests(tenant_id,organisation_id,created_at desc);
alter table public.portal_change_requests enable row level security;
create policy "portal reads own requests" on public.portal_change_requests for select using(public.has_portal_organisation_access(tenant_id,organisation_id));
create policy "staff reads portal requests" on public.portal_change_requests for select using(public.is_tenant_member(tenant_id));
-- No portal insert/update/delete policies: service role validates and performs those actions.

drop policy if exists "portal editors update own listings" on public.public_listings;
drop policy if exists "portal editors submit own events" on public.events;
drop policy if exists "portal editors update own events" on public.events;
drop policy if exists "organisers submit events" on public.events;
drop policy if exists "organisers update own unpublished events" on public.events;
create policy "organisers submit unlinked events" on public.events for insert with check(public.is_tenant_member(tenant_id) or (organisation_id is null and submitted_by=auth.uid()));
create policy "organisers update own unlinked events" on public.events for update using(public.is_tenant_member(tenant_id) or (organisation_id is null and submitted_by=auth.uid() and status<>'Published')) with check(public.is_tenant_member(tenant_id) or (organisation_id is null and submitted_by=auth.uid() and status<>'Published'));
