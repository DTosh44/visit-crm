-- Canonical private CMS state and an append-only, server-attributed edit trail.
begin;

create table if not exists public.cms_pages (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('website_page','content_page')),
  name text not null,
  path text not null,
  template text not null default '',
  draft jsonb not null,
  published jsonb,
  version integer not null default 0,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  primary key (tenant_id,id),
  constraint cms_page_versions_valid check (version >= 0 and revision >= 1)
);
create unique index if not exists cms_pages_active_route on public.cms_pages(tenant_id,kind,path) where deleted_at is null;
alter table public.cms_pages enable row level security;

create table if not exists public.cms_page_revisions (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  page_id text not null,
  kind text not null check (kind in ('website_page','content_page')),
  action text not null check (action in ('created','draft_saved','published','restored','discarded','deleted','imported_published','imported_draft')),
  version integer not null,
  page_revision integer not null,
  snapshot jsonb,
  changed_fields text[] not null default '{}',
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  source_revision_id bigint,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,page_id) references public.cms_pages(tenant_id,id) on delete cascade
);
create index if not exists cms_page_revisions_page_time on public.cms_page_revisions(tenant_id,page_id,id desc);
alter table public.cms_page_revisions enable row level security;
grant select on public.cms_pages, public.cms_page_revisions to authenticated;
revoke insert,update,delete on public.public_content, public.public_website_pages from anon, authenticated;

create or replace function public.can_edit_cms(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.profiles
    where tenant_id=target_tenant and user_id=auth.uid() and active
      and role::text in ('Administrator','Membership manager','Content editor')
  );
$$;

create policy "cms staff read pages" on public.cms_pages for select to authenticated
  using (public.can_edit_cms(tenant_id));
create policy "cms staff read revisions" on public.cms_page_revisions for select to authenticated
  using (public.can_edit_cms(tenant_id));

-- Preserve the current workspace content, including previously kept published
-- versions. Older edits that were never recorded cannot be reconstructed.
insert into public.cms_pages(tenant_id,id,kind,name,path,template,draft,published,version,revision,updated_at,published_at)
select ws.tenant_id,p->>'id','website_page',coalesce(p->>'name',''),coalesce(p->>'path','/'),coalesce(p->>'template','Landing page'),
  coalesce(p->'draft','{}'::jsonb),p->'published',
  case when p->'published' is null then 0 else greatest(1,coalesce((p->>'version')::integer,1)) end,
  1,coalesce(nullif(p->>'updatedAt','')::timestamptz,now()),nullif(p->>'publishedAt','')::timestamptz
from public.workspace_states ws cross join lateral jsonb_array_elements(coalesce(ws.data->'websitePages','[]'::jsonb)) p
where p->>'id' is not null
on conflict (tenant_id,id) do nothing;

insert into public.cms_pages(tenant_id,id,kind,name,path,template,draft,published,version,revision,updated_at,published_at)
select ws.tenant_id,p->>'id','content_page',coalesce(p->>'title',''),
  case when p->>'type'='Itinerary' then 'itineraries/' else lower(coalesce(p->>'type','Guide'))||'s/' end||coalesce(p->>'slug',''),
  coalesce(p->>'type','Guide'),
  p-'id'-'status'-'published'-'publishedAt'-'version'-'updatedAt',
  case when p->'published' is not null then p->'published'
       when p->>'status'='Published' then p-'id'-'status'-'publishedAt'-'version'-'updatedAt'
       else null end,
  case when p->'published' is not null or p->>'status'='Published'
       then greatest(1,coalesce((p->>'version')::integer,1)) else 0 end,
  1,coalesce(nullif(p->>'updatedAt','')::timestamptz,now()),nullif(p->>'publishedAt','')::timestamptz
from public.workspace_states ws cross join lateral jsonb_array_elements(coalesce(ws.data->'contentPages','[]'::jsonb)) p
where p->>'id' is not null
on conflict (tenant_id,id) do nothing;

insert into public.cms_pages(tenant_id,id,kind,name,path,template,draft,published,version,revision,updated_at,published_at)
select tenant_id,id,'website_page',name,path,template,content,content,version,1,updated_at,published_at
from public.public_website_pages on conflict (tenant_id,id) do nothing;
insert into public.cms_pages(tenant_id,id,kind,name,path,template,draft,published,version,revision,updated_at,published_at)
select tenant_id,id,'content_page',title,(case when type='Itinerary' then 'itineraries/' else lower(type)||'s/' end)||slug,type,
  jsonb_build_object('type',type,'title',title,'slug',slug,'summary',summary,'body',body,'image',image,'metaTitle',meta_title,'metaDescription',meta_description),
  jsonb_build_object('type',type,'title',title,'slug',slug,'summary',summary,'body',body,'image',image,'metaTitle',meta_title,'metaDescription',meta_description),
  1,1,updated_at,updated_at
from public.public_content where status='Published' on conflict (tenant_id,id) do nothing;

-- The public tables are authoritative for the currently live revision when
-- legacy workspace JSON was stale or omitted its published snapshot.
update public.cms_pages c set published=p.content,version=greatest(c.version,p.version),published_at=p.published_at
from public.public_website_pages p
where c.tenant_id=p.tenant_id and c.id=p.id and c.kind='website_page'
  and (c.published is null or c.version<p.version);
update public.cms_pages c set published=jsonb_build_object('type',p.type,'title',p.title,'slug',p.slug,
  'summary',p.summary,'body',p.body,'image',p.image,'metaTitle',p.meta_title,'metaDescription',p.meta_description),
  version=greatest(c.version,1),published_at=p.updated_at
from public.public_content p
where c.tenant_id=p.tenant_id and c.id=p.id and c.kind='content_page' and p.status='Published' and c.published is null;

insert into public.cms_page_revisions(tenant_id,page_id,kind,action,version,page_revision,snapshot,actor_name,created_at)
select c.tenant_id,c.id,c.kind,'imported_published',coalesce((v->>'version')::integer,c.version),1,v->'content',
  'Imported history — original editor unverified',coalesce(nullif(v->>'publishedAt','')::timestamptz,c.published_at,now())
from public.cms_pages c join public.workspace_states ws on ws.tenant_id=c.tenant_id
cross join lateral jsonb_array_elements(coalesce((
  select p->'versions' from jsonb_array_elements(coalesce(ws.data->'websitePages','[]'::jsonb)) p where p->>'id'=c.id limit 1
),'[]'::jsonb)) v
where c.kind='website_page' and v->'content' is not null;

insert into public.cms_page_revisions(tenant_id,page_id,kind,action,version,page_revision,snapshot,actor_name,created_at)
select c.tenant_id,c.id,c.kind,'imported_published',c.version,1,c.published,'Imported history — original publisher unknown',coalesce(c.published_at,c.updated_at)
from public.cms_pages c
where c.published is not null and not exists (
  select 1 from public.cms_page_revisions r where r.tenant_id=c.tenant_id and r.page_id=c.id and r.action='imported_published'
);
insert into public.cms_page_revisions(tenant_id,page_id,kind,action,version,page_revision,snapshot,actor_name,created_at)
select c.tenant_id,c.id,c.kind,'imported_draft',c.version,1,c.draft,'Imported draft — original editor unknown',c.updated_at
from public.cms_pages c where c.published is null or c.draft is distinct from c.published;

create or replace function public.cms_page_mutate(
  p_tenant uuid,p_id text,p_action text,p_payload jsonb default null,
  p_expected_revision integer default null,p_kind text default null,
  p_name text default null,p_path text default null,p_template text default null,
  p_restore_revision bigint default null
) returns public.cms_pages language plpgsql security definer set search_path=public as $$
declare
  v_page public.cms_pages%rowtype;
  v_source public.cms_page_revisions%rowtype;
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_changed text[] := '{}';
  v_new_path text;
  v_now timestamptz := now();
begin
  if not public.can_edit_cms(p_tenant) then raise exception 'CMS editing permission required'; end if;
  select full_name into v_actor_name from public.profiles
    where tenant_id=p_tenant and user_id=v_actor and active;
  v_actor_name:=coalesce(nullif(v_actor_name,''),'Workspace user');

  if p_action='create' then
    if p_kind not in ('website_page','content_page') or jsonb_typeof(p_payload)<>'object'
      then raise exception 'Invalid page'; end if;
    if length(trim(coalesce(p_payload->>'title','')))=0 then raise exception 'Page title is required'; end if;
    if p_kind='content_page' then
      if p_payload->>'type' not in ('Guide','Itinerary','Trail')
        or coalesce(p_payload->>'slug','') !~ '^[a-z0-9-]+$' then raise exception 'Invalid content page type or slug'; end if;
      v_new_path:=(case when p_payload->>'type'='Itinerary' then 'itineraries/' else lower(p_payload->>'type')||'s/' end)||(p_payload->>'slug');
    else
      v_new_path:=p_path;
      if coalesce(v_new_path,'') not like '/%' then raise exception 'Website route must begin with /'; end if;
    end if;
    insert into public.cms_pages(tenant_id,id,kind,name,path,template,draft,updated_by)
    values(p_tenant,p_id,p_kind,coalesce(nullif(p_name,''),p_payload->>'title'),v_new_path,coalesce(p_template,''),p_payload,v_actor)
    returning * into v_page;
    v_changed:=array(select jsonb_object_keys(p_payload));
  else
    select * into v_page from public.cms_pages
      where tenant_id=p_tenant and id=p_id and deleted_at is null for update;
    if not found then raise exception 'Page not found'; end if;
    if p_expected_revision is null or v_page.revision<>p_expected_revision
      then raise exception 'This page changed since you opened it. Refresh and review the latest version before saving.'; end if;
    if p_action='save_draft' then
      if jsonb_typeof(p_payload)<>'object' or length(trim(coalesce(p_payload->>'title','')))=0
        then raise exception 'Page title is required'; end if;
      if v_page.kind='content_page' then
        if p_payload->>'type' not in ('Guide','Itinerary','Trail')
          or coalesce(p_payload->>'slug','') !~ '^[a-z0-9-]+$' then raise exception 'Invalid content page type or slug'; end if;
        v_new_path:=(case when p_payload->>'type'='Itinerary' then 'itineraries/' else lower(p_payload->>'type')||'s/' end)||(p_payload->>'slug');
      else v_new_path:=v_page.path; end if;
      select coalesce(array_agg(k order by k),'{}'::text[]) into v_changed
      from jsonb_object_keys(v_page.draft||p_payload) k
      where v_page.draft->k is distinct from p_payload->k;
      if cardinality(v_changed)=0 then return v_page; end if;
      update public.cms_pages set draft=p_payload,
        name=case when kind='content_page' then p_payload->>'title' else name end,
        path=v_new_path,template=case when kind='content_page' then p_payload->>'type' else template end,
        revision=revision+1,updated_at=v_now,updated_by=v_actor
      where tenant_id=p_tenant and id=p_id returning * into v_page;
    elsif p_action='publish' then
      select coalesce(array_agg(k order by k),'{}'::text[]) into v_changed
      from jsonb_object_keys(coalesce(v_page.published,'{}'::jsonb)||v_page.draft) k
      where v_page.published->k is distinct from v_page.draft->k;
      update public.cms_pages set published=draft,version=version+1,revision=revision+1,
        published_at=v_now,published_by=v_actor,updated_at=v_now,updated_by=v_actor
      where tenant_id=p_tenant and id=p_id returning * into v_page;
      if v_page.kind='website_page' then
        insert into public.public_website_pages(tenant_id,id,name,path,template,content,version,published_at,updated_at)
        values(p_tenant,p_id,v_page.name,v_page.path,v_page.template,v_page.published,v_page.version,v_now,v_now)
        on conflict (tenant_id,id) do update set name=excluded.name,path=excluded.path,template=excluded.template,
          content=excluded.content,version=excluded.version,published_at=excluded.published_at,updated_at=excluded.updated_at;
      else
        insert into public.public_content(tenant_id,id,type,title,slug,summary,body,image,status,meta_title,meta_description,updated_at)
        values(p_tenant,p_id,v_page.published->>'type',v_page.published->>'title',v_page.published->>'slug',
          coalesce(v_page.published->>'summary',''),coalesce(v_page.published->>'body',''),
          coalesce(v_page.published->>'image','hero'),'Published',coalesce(v_page.published->>'metaTitle',''),
          coalesce(v_page.published->>'metaDescription',''),v_now)
        on conflict (tenant_id,id) do update set type=excluded.type,title=excluded.title,slug=excluded.slug,
          summary=excluded.summary,body=excluded.body,image=excluded.image,status='Published',
          meta_title=excluded.meta_title,meta_description=excluded.meta_description,updated_at=excluded.updated_at;
      end if;
    elsif p_action='restore' then
      select * into v_source from public.cms_page_revisions
        where tenant_id=p_tenant and page_id=p_id and id=p_restore_revision
          and action in ('published','imported_published') and snapshot is not null;
      if not found then raise exception 'Published version not found'; end if;
      select coalesce(array_agg(k order by k),'{}'::text[]) into v_changed
      from jsonb_object_keys(v_page.draft||v_source.snapshot) k
      where v_page.draft->k is distinct from v_source.snapshot->k;
      if v_page.kind='content_page' then v_new_path:=(case when v_source.snapshot->>'type'='Itinerary' then 'itineraries/' else lower(v_source.snapshot->>'type')||'s/' end)||(v_source.snapshot->>'slug');
      else v_new_path:=v_page.path; end if;
      update public.cms_pages set draft=v_source.snapshot,
        name=case when kind='content_page' then v_source.snapshot->>'title' else name end,
        path=v_new_path,template=case when kind='content_page' then v_source.snapshot->>'type' else template end,
        revision=revision+1,updated_at=v_now,updated_by=v_actor
      where tenant_id=p_tenant and id=p_id returning * into v_page;
    elsif p_action='discard' then
      if v_page.published is null then raise exception 'No published version to restore'; end if;
      select coalesce(array_agg(k order by k),'{}'::text[]) into v_changed
      from jsonb_object_keys(v_page.draft||v_page.published) k
      where v_page.draft->k is distinct from v_page.published->k;
      update public.cms_pages set draft=published,
        name=case when kind='content_page' then published->>'title' else name end,
        path=case when kind='content_page' then (case when published->>'type'='Itinerary' then 'itineraries/' else lower(published->>'type')||'s/' end)||(published->>'slug') else path end,
        template=case when kind='content_page' then published->>'type' else template end,
        revision=revision+1,updated_at=v_now,updated_by=v_actor
      where tenant_id=p_tenant and id=p_id returning * into v_page;
    elsif p_action='delete' then
      v_changed:=array['page'];
      update public.cms_pages set deleted_at=v_now,revision=revision+1,updated_at=v_now,updated_by=v_actor
      where tenant_id=p_tenant and id=p_id returning * into v_page;
      if v_page.kind='website_page' then
        delete from public.public_website_pages where tenant_id=p_tenant and id=p_id;
      else
        delete from public.public_content where tenant_id=p_tenant and id=p_id;
      end if;
    else raise exception 'Unknown CMS action'; end if;
  end if;

  insert into public.cms_page_revisions(tenant_id,page_id,kind,action,version,page_revision,snapshot,changed_fields,actor_id,actor_name,source_revision_id,created_at)
  values(p_tenant,p_id,v_page.kind,case when p_action='create' then 'created'
    when p_action='save_draft' then 'draft_saved' when p_action='publish' then 'published' else p_action end,
    v_page.version,v_page.revision,
    case when p_action='publish' then v_page.published else v_page.draft end,
    v_changed,v_actor,v_actor_name,case when p_action='restore' then p_restore_revision else null end,v_now);
  insert into public.audit_log(tenant_id,actor_id,action,entity_type,entity_id,detail)
  values(p_tenant,v_actor,p_action,v_page.kind,p_id,jsonb_build_object('changed_fields',v_changed,'version',v_page.version,'page_revision',v_page.revision));
  -- Keep every action/actor/timestamp, but only the latest 20 restorable
  -- published snapshots for each page.
  update public.cms_page_revisions set snapshot=null
  where id in (
    select id from public.cms_page_revisions
    where tenant_id=p_tenant and page_id=p_id and action in ('published','imported_published') and snapshot is not null
    order by id desc offset 20
  );
  return v_page;
end;
$$;

revoke all on function public.cms_page_mutate(uuid,text,text,jsonb,integer,text,text,text,text,bigint) from public;
grant execute on function public.cms_page_mutate(uuid,text,text,jsonb,integer,text,text,text,text,bigint) to authenticated;
commit;
