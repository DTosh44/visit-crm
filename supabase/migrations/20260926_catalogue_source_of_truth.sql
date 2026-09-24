-- Staff need to read drafts as well as published records when the catalogue
-- tables, rather than workspace_states, are the CRM source of truth.
drop policy if exists "members read all listings" on public.public_listings;
create policy "members read all listings" on public.public_listings
  for select using (public.is_tenant_member(tenant_id));

-- The moderation UI supports these states and must be able to persist them.
alter table public.public_listings drop constraint if exists public_listings_status_check;
alter table public.public_listings add constraint public_listings_status_check
  check (status in ('Published','Draft','In review','Changes requested','Rejected'));
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('Published','Draft','In review','Changes requested','Rejected','Withdrawn'));
