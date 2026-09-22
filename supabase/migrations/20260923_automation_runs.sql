-- Tenant-scoped execution receipts. The unique event key is claimed before
-- actions run so two open CRM sessions cannot execute the same rule twice.
create table if not exists public.automation_runs (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  automation_id text not null,
  event_key text not null,
  trigger text not null,
  record_id text not null,
  record_label text not null,
  status text not null check (status in ('running','success','failed')),
  actions jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  unique (tenant_id,automation_id,event_key)
);
create index if not exists automation_runs_tenant_started_idx on public.automation_runs(tenant_id,started_at desc);
alter table public.automation_runs enable row level security;
create policy "workspace members read automation runs" on public.automation_runs for select using (public.is_tenant_member(tenant_id));
create policy "workspace members claim automation runs" on public.automation_runs for insert with check (public.is_tenant_member(tenant_id));
create policy "workspace members finish automation runs" on public.automation_runs for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='platform_states') then
    alter publication supabase_realtime add table public.platform_states;
  end if;
end $$;

-- Commit both JSON state snapshots and the receipt in one database transaction.
create or replace function public.complete_automation_run(
  p_tenant uuid,p_run_id text,p_workspace jsonb,p_platform jsonb,p_actions jsonb
) returns void language plpgsql security invoker set search_path=public as $$
begin
  if auth.role() <> 'service_role' and not public.is_tenant_member(p_tenant) then raise exception 'Not a destination workspace member'; end if;
  update public.automation_runs set status='success',actions=p_actions,error=null
    where id=p_run_id and tenant_id=p_tenant and status='running';
  if not found then raise exception 'Automation run is not claimable'; end if;
  insert into public.workspace_states(tenant_id,data,updated_by,updated_at)
    values(p_tenant,p_workspace,auth.uid(),now())
    on conflict(tenant_id) do update set data=excluded.data,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  insert into public.platform_states(tenant_id,data,updated_by,updated_at)
    values(p_tenant,p_platform,auth.uid(),now())
    on conflict(tenant_id) do update set data=excluded.data,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
end;
$$;
