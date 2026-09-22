alter table public.public_listings
  add column if not exists map_latitude double precision,
  add column if not exists map_longitude double precision,
  add column if not exists map_visible boolean not null default true,
  add column if not exists map_featured boolean not null default false;

alter table public.events
  add column if not exists map_latitude double precision,
  add column if not exists map_longitude double precision,
  add column if not exists map_visible boolean not null default true,
  add column if not exists map_featured boolean not null default false;

update public.tenants
set features = features || '{"interactiveMap":true}'::jsonb,
    updated_at = now()
where not (features ? 'interactiveMap');
