-- Production account readiness: keep workspace contact details alongside the
-- profile and make reporting-only accounts read-only at the database boundary.

alter table public.profiles add column if not exists email text;

update public.profiles as profile
set email=auth_user.email
from auth.users as auth_user
where auth_user.id=profile.user_id
  and (profile.email is null or profile.email='');

create unique index if not exists profiles_tenant_email_unique
on public.profiles(tenant_id,lower(email))
where email is not null and email<>'';

create or replace function public.can_write_tenant(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where user_id=auth.uid()
      and tenant_id=target_tenant
      and active=true
      and role<>'Viewer / Reporting'
  );
$$;

alter policy "members create workspace" on public.workspace_states
  with check(public.can_write_tenant(tenant_id));
alter policy "members update workspace" on public.workspace_states
  using(public.can_write_tenant(tenant_id)) with check(public.can_write_tenant(tenant_id));

alter policy "workspace members create platform state" on public.platform_states
  with check(public.can_write_tenant(tenant_id));
alter policy "workspace members update platform state" on public.platform_states
  using(public.can_write_tenant(tenant_id)) with check(public.can_write_tenant(tenant_id));

alter policy "members create audit" on public.audit_log
  with check(public.can_write_tenant(tenant_id));
