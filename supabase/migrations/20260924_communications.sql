-- Dedicated delivery ledger. Drafts and templates remain in tenant-scoped platform state.
create table if not exists public.communication_jobs (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  status text not null check(status in ('Scheduled','Sending','Sent','Failed')),
  scheduled_at timestamptz,
  claimed_at timestamptz,
  first_claimed_at timestamptz,
  sent_at timestamptz,
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(tenant_id,id)
);
create index if not exists communication_jobs_due_idx on public.communication_jobs(status,scheduled_at) where status='Scheduled';
create table if not exists public.communication_deliveries (
  tenant_id uuid not null,
  communication_id text not null,
  contact_id text not null,
  organisation_id text,
  email text not null,
  status text not null check(status in ('Queued','Sent to provider','Delivered','Failed','Bounced')),
  provider_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz,
  opens integer not null default 0,
  clicks integer not null default 0,
  error text,
  primary key(tenant_id,communication_id,contact_id),
  foreign key(tenant_id,communication_id) references public.communication_jobs(tenant_id,id) on delete cascade
);
create unique index if not exists communication_delivery_provider_idx on public.communication_deliveries(provider_id) where provider_id is not null;
create table if not exists public.communication_webhook_events(id text primary key,provider_id text not null,event_type text not null,received_at timestamptz not null default now());
alter table public.communication_jobs enable row level security;
alter table public.communication_deliveries enable row level security;
alter table public.communication_webhook_events enable row level security;
create policy "communications readers" on public.communication_jobs for select using(exists(select 1 from public.profiles p where p.tenant_id=communication_jobs.tenant_id and p.user_id=auth.uid() and p.active and p.role::text in ('Administrator','Membership manager','Marketing / PR','Travel Trade')));
create policy "delivery readers" on public.communication_deliveries for select using(exists(select 1 from public.profiles p where p.tenant_id=communication_deliveries.tenant_id and p.user_id=auth.uid() and p.active and p.role::text in ('Administrator','Membership manager','Marketing / PR','Travel Trade')));
-- Dispatch mutations are service-role only, after the Edge Function checks CRM permissions.
create or replace function public.claim_communication_job(p_tenant uuid,p_id text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  update public.communication_jobs set status='Sending',claimed_at=now(),first_claimed_at=coalesce(first_claimed_at,now()),error=null
  where tenant_id=p_tenant and id=p_id and ((status='Scheduled' and scheduled_at<=now()) or (status='Sending' and claimed_at<now()-interval '1 minute' and first_claimed_at>now()-interval '23 hours'));
  return found;
end;
$$;

create or replace function public.unsubscribe_communication(p_tenant uuid,p_communication text,p_contact text)
returns boolean language plpgsql security definer set search_path=public as $$
declare state jsonb; preferences jsonb; updated jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  if not exists(select 1 from public.communication_deliveries where tenant_id=p_tenant and communication_id=p_communication and contact_id=p_contact) then return false; end if;
  select data into state from public.platform_states where tenant_id=p_tenant for update;
  if state is null then return false; end if;
  preferences:=coalesce(state->'communicationPreferences','[]'::jsonb);
  select coalesce(jsonb_agg(case when item->>'contactId'=p_contact then item||'{"unsubscribed":true,"marketing":false}'::jsonb else item end),'[]'::jsonb)
    into updated from jsonb_array_elements(preferences) item;
  if not exists(select 1 from jsonb_array_elements(preferences) item where item->>'contactId'=p_contact) then
    updated:=updated||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'contactId',p_contact,'service',true,'marketing',false,'trade',false,'events',false,'research',false,'lawfulBasis','Not recorded','note','','unsubscribed',true));
  end if;
  update public.platform_states set data=jsonb_set(state,'{communicationPreferences}',updated),updated_at=now() where tenant_id=p_tenant;
  update public.communication_deliveries set unsubscribed_at=coalesce(unsubscribed_at,now()) where tenant_id=p_tenant and communication_id=p_communication and contact_id=p_contact;
  return true;
end;
$$;
