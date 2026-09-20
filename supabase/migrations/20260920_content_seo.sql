alter table if exists public.public_content
  add column if not exists meta_title text not null default '',
  add column if not exists meta_description text not null default '';
