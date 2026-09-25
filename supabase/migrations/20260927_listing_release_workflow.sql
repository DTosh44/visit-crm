-- Keep unpublished edits private while the currently published listing remains live.
begin;
create or replace function public.has_listing_role(target_tenant uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles
    where user_id=auth.uid() and tenant_id=target_tenant and active
      and role::text=any(allowed_roles));
$$;

create table if not exists public.listing_drafts (
  tenant_id uuid not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (tenant_id,id),
  foreign key (tenant_id,id) references public.public_listings(tenant_id,id) on delete cascade,
  constraint listing_draft_identity check (data->>'tenant_id'=tenant_id::text and data->>'id'=id)
);
alter table public.listing_drafts enable row level security;
create policy "listing staff read drafts" on public.listing_drafts for select
  using (public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']));
create policy "listing staff create drafts" on public.listing_drafts for insert
  with check (public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']));
create policy "listing staff update drafts" on public.listing_drafts for update
  using (public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']))
  with check (public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']));
create policy "listing staff delete drafts" on public.listing_drafts for delete
  using (public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']));

drop policy if exists "members create listings" on public.public_listings;
drop policy if exists "members update listings" on public.public_listings;
drop policy if exists "members delete listings" on public.public_listings;
create policy "listing staff create unpublished listings" on public.public_listings for insert
  with check (status='Draft' and public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']));
create policy "listing staff edit unpublished listings" on public.public_listings for update
  using (status<>'Published' and public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']))
  with check (status<>'Published' and public.has_listing_role(tenant_id,array['Administrator','Membership manager','Content editor']));
create policy "listing managers delete unpublished listings" on public.public_listings for delete
  using (status<>'Published' and public.has_listing_role(tenant_id,array['Administrator','Membership manager']));

drop policy if exists "members upload listing media" on storage.objects;
drop policy if exists "members update listing media" on storage.objects;
drop policy if exists "members delete listing media" on storage.objects;
drop policy if exists "Tenant members can upload listing media" on storage.objects;
drop policy if exists "Tenant members can update listing media" on storage.objects;
drop policy if exists "Tenant members can delete listing media" on storage.objects;
create policy "listing staff upload media" on storage.objects for insert to authenticated
  with check(bucket_id='listing-media' and public.has_listing_role(((storage.foldername(name))[1])::uuid,array['Administrator','Membership manager','Content editor']));
create policy "listing staff update media" on storage.objects for update to authenticated
  using(bucket_id='listing-media' and public.has_listing_role(((storage.foldername(name))[1])::uuid,array['Administrator','Membership manager','Content editor']))
  with check(bucket_id='listing-media' and public.has_listing_role(((storage.foldername(name))[1])::uuid,array['Administrator','Membership manager','Content editor']));
create policy "listing staff delete media" on storage.objects for delete to authenticated
  using(bucket_id='listing-media' and public.has_listing_role(((storage.foldername(name))[1])::uuid,array['Administrator','Membership manager','Content editor']));

create or replace function public.publish_listing_draft(p_tenant uuid,p_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_current public.public_listings%rowtype; v_draft jsonb; v_next public.public_listings%rowtype;
begin
  if not public.has_listing_role(p_tenant,array['Administrator','Membership manager']) then
    raise exception 'Publishing permission required';
  end if;
  select * into v_current from public.public_listings where tenant_id=p_tenant and id=p_id for update;
  if not found then raise exception 'Listing not found'; end if;
  select data into v_draft from public.listing_drafts where tenant_id=p_tenant and id=p_id for update;
  if v_draft is not null then
    select * into v_next from jsonb_populate_record(null::public.public_listings,v_draft);
  else
    v_next:=v_current;
  end if;
  if v_next.tenant_id<>p_tenant or v_next.id<>p_id or v_next.organisation_id<>v_current.organisation_id then
    raise exception 'Listing identity cannot change during publishing';
  end if;
  if length(trim(v_next.name))=0 or length(trim(v_next.category))=0 or length(trim(v_next.town))=0
     or length(trim(v_next.short_description))=0 or length(trim(v_next.description))=0
     or length(trim(v_next.opening_hours))=0 then
    raise exception 'Complete the name, category, town, descriptions and opening information before publishing';
  end if;
  if v_next.website<>'' and v_next.website !~ '^https://[^ ]+$' then raise exception 'Website must use HTTPS'; end if;
  if v_next.booking_url<>'' and v_next.booking_url !~ '^https://[^ ]+$' then raise exception 'Booking link must use HTTPS'; end if;
  update public.public_listings set
    name=v_next.name,category=v_next.category,town=v_next.town,status='Published',completeness=v_next.completeness,
    short_description=v_next.short_description,description=v_next.description,website=v_next.website,
    booking_url=v_next.booking_url,phone=v_next.phone,email=v_next.email,opening_hours=v_next.opening_hours,
    facilities=v_next.facilities,accessibility=v_next.accessibility,image=v_next.image,media=v_next.media,
    search_tags=v_next.search_tags,visitor_taxonomy=v_next.visitor_taxonomy,review_highlights=v_next.review_highlights,
    review_sites=v_next.review_sites,good_to_know=v_next.good_to_know,awards=v_next.awards,
    image_rights_confirmed=v_next.image_rights_confirmed,map_latitude=v_next.map_latitude,
    map_longitude=v_next.map_longitude,map_visible=v_next.map_visible,map_featured=v_next.map_featured,
    published_at=coalesce(v_current.published_at,now()),updated_at=now()
  where tenant_id=p_tenant and id=p_id;
  delete from public.listing_drafts where tenant_id=p_tenant and id=p_id;
  insert into public.audit_log(tenant_id,actor_id,action,entity_type,entity_id,detail)
  values(p_tenant,auth.uid(),'publish','listing',p_id,jsonb_build_object('had_draft',v_draft is not null));
end;
$$;

create or replace function public.unpublish_listing(p_tenant uuid,p_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_listing_role(p_tenant,array['Administrator','Membership manager']) then
    raise exception 'Publishing permission required';
  end if;
  update public.public_listings set status='Draft',updated_at=now() where tenant_id=p_tenant and id=p_id;
  if not found then raise exception 'Listing not found'; end if;
  update public.listing_drafts set data=jsonb_set(data,'{status}','"Draft"'::jsonb),updated_at=now()
    where tenant_id=p_tenant and id=p_id;
  insert into public.audit_log(tenant_id,actor_id,action,entity_type,entity_id,detail)
  values(p_tenant,auth.uid(),'unpublish','listing',p_id,'{}'::jsonb);
end;
$$;

create or replace function public.delete_listing(p_tenant uuid,p_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_listing_role(p_tenant,array['Administrator','Membership manager']) then
    raise exception 'Membership manager permission required';
  end if;
  delete from public.public_listings where tenant_id=p_tenant and id=p_id;
  if not found then raise exception 'Listing not found'; end if;
  insert into public.audit_log(tenant_id,actor_id,action,entity_type,entity_id,detail)
  values(p_tenant,auth.uid(),'delete','listing',p_id,'{}'::jsonb);
end;
$$;

create or replace function public.relink_listing_organisation(p_tenant uuid,p_from text,p_to text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_listing_role(p_tenant,array['Administrator','Membership manager']) then
    raise exception 'Membership manager permission required';
  end if;
  if not exists(select 1 from public.workspace_states ws cross join lateral jsonb_array_elements(ws.data->'organisations') org
    where ws.tenant_id=p_tenant and org->>'id'=p_to) then
    raise exception 'Destination organisation not found';
  end if;
  update public.public_listings set organisation_id=p_to,updated_at=now()
    where tenant_id=p_tenant and organisation_id=p_from;
  update public.listing_drafts set data=jsonb_set(data,'{organisation_id}',to_jsonb(p_to)),updated_at=now()
    where tenant_id=p_tenant and data->>'organisation_id'=p_from;
end;
$$;

create or replace function public.listing_performance(p_tenant uuid)
returns table(listing_id text,views bigint,views_this_month bigint,enquiries bigint)
language sql stable security definer set search_path=public as $$
  with visits as (
    select substring(path from '^/place/([^/?#]+)') as id,count(*) as total,
      count(*) filter(where occurred_at>=date_trunc('month',now())) as month_total
    from public.website_analytics_events
    where tenant_id=p_tenant and event_type='page_view' and path like '/place/%'
    group by 1
  ), requests as (
    select payload->>'listingId' as id,count(*) as total
    from public.public_submissions
    where tenant_id=p_tenant and kind='listing-enquiries'
    group by 1
  )
  select l.id,coalesce(v.total,0),coalesce(v.month_total,0),coalesce(r.total,0)
  from public.public_listings l left join visits v on v.id=l.id left join requests r on r.id=l.id
  where l.tenant_id=p_tenant and public.is_tenant_member(p_tenant);
$$;

revoke all on function public.publish_listing_draft(uuid,text) from public;
revoke all on function public.unpublish_listing(uuid,text) from public;
revoke all on function public.delete_listing(uuid,text) from public;
revoke all on function public.relink_listing_organisation(uuid,text,text) from public;
revoke all on function public.listing_performance(uuid) from public;
grant execute on function public.publish_listing_draft(uuid,text) to authenticated;
grant execute on function public.unpublish_listing(uuid,text) to authenticated;
grant execute on function public.delete_listing(uuid,text) to authenticated;
grant execute on function public.relink_listing_organisation(uuid,text,text) to authenticated;
grant execute on function public.listing_performance(uuid) to authenticated;
commit;
