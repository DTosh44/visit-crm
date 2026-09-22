create table if not exists public.website_analytics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null check (event_type in ('page_view','form_submit','cta_click','booking_completed')),
  path text not null,
  title text not null default '',
  visitor_id text not null,
  source text not null default 'Direct',
  campaign text,
  occurred_at timestamptz not null default now()
);

create index if not exists website_analytics_events_tenant_date_idx
  on public.website_analytics_events (tenant_id, occurred_at desc);

alter table public.website_analytics_events enable row level security;
drop policy if exists "anyone creates consented analytics events" on public.website_analytics_events;
create policy "anyone creates consented analytics events" on public.website_analytics_events for insert with check (true);
drop policy if exists "tenant members read analytics events" on public.website_analytics_events;
create policy "tenant members read analytics events" on public.website_analytics_events for select using (public.is_tenant_member(tenant_id));
