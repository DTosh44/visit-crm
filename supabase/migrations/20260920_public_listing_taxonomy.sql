alter table if exists public.public_listings
  add column if not exists search_tags jsonb not null default '[]'::jsonb,
  add column if not exists visitor_taxonomy jsonb not null default '[]'::jsonb,
  add column if not exists review_highlights jsonb not null default '[]'::jsonb,
  add column if not exists review_sites jsonb not null default '[]'::jsonb,
  add column if not exists good_to_know jsonb not null default '[]'::jsonb,
  add column if not exists awards jsonb not null default '[]'::jsonb,
  add column if not exists image_rights_confirmed boolean not null default false;
