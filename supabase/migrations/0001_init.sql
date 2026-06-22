-- Bombay Bicycle Chef — initial schema
-- Menu categories, menu items, and locations. Public read; writes restricted to
-- the service role (server-side admin) until authenticated-admin policies land
-- in a later phase.

create extension if not exists "pgcrypto";

-- updated_at helper -----------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Menu categories -------------------------------------------------------------
create table if not exists menu_categories (
  id          text primary key,            -- slug, e.g. 'starters' (drives the #menu-<id> anchor)
  title       text not null,               -- display title, e.g. 'STARTERS'
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists menu_categories_updated on menu_categories;
create trigger menu_categories_updated before update on menu_categories
  for each row execute function set_updated_at();

-- Menu items ------------------------------------------------------------------
create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  text not null references menu_categories(id) on delete cascade,
  name         text not null,
  price        text not null,              -- display price e.g. '£11.55'
                                           -- (Phase 3 ordering adds price_pence integer for checkout math)
  description  text,
  is_available boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists menu_items_category_idx on menu_items(category_id);
drop trigger if exists menu_items_updated on menu_items;
create trigger menu_items_updated before update on menu_items
  for each row execute function set_updated_at();

-- Locations -------------------------------------------------------------------
create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  address     text not null,
  phone       text,
  hours       text,
  atmosphere  text,
  image_url   text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists locations_updated on locations;
create trigger locations_updated before update on locations
  for each row execute function set_updated_at();

-- Row Level Security ----------------------------------------------------------
-- Public (anon) may READ; nobody may write through the anon/auth keys. Seeding
-- and admin edits go through the service role key (which bypasses RLS) until a
-- proper admin role + write policies are added.
alter table menu_categories enable row level security;
alter table menu_items      enable row level security;
alter table locations       enable row level security;

drop policy if exists "public read menu_categories" on menu_categories;
drop policy if exists "public read menu_items"      on menu_items;
drop policy if exists "public read locations"       on locations;

create policy "public read menu_categories" on menu_categories for select using (true);
create policy "public read menu_items"      on menu_items      for select using (true);
create policy "public read locations"       on locations       for select using (is_active = true);
