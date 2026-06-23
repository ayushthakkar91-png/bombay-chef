-- Bombay Bicycle Chef — 0004 menu extensions for ordering
-- Builds on 0001 (menu_categories, menu_items, locations). Adds the columns and
-- tables ordering needs: integer pence pricing, modifiers, allergens, and
-- per-location availability/price overrides. The public menu keeps using the
-- existing text `price`; checkout math uses `price_pence`.

-- Item columns ----------------------------------------------------------------
alter table menu_items add column if not exists price_pence  int;       -- checkout math
alter table menu_items add column if not exists image_url    text;
alter table menu_items add column if not exists is_signature boolean not null default false;
alter table menu_items add column if not exists spice_level  int  check (spice_level between 0 and 3);
alter table menu_items add column if not exists dietary      text[] not null default '{}'; -- 'veg','vegan','gf'
alter table menu_items add column if not exists calories     int;

-- Modifier groups & options ---------------------------------------------------
-- e.g. group "Spice" (required, single choice); group "Add-ons" (optional, multi).
create table if not exists item_modifier_groups (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references menu_items(id) on delete cascade,
  name         text not null,
  min_select   int not null default 0,
  max_select   int not null default 1,
  sort_order   int not null default 0
);
create index if not exists modifier_groups_item_idx on item_modifier_groups(item_id);

create table if not exists item_modifiers (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references item_modifier_groups(id) on delete cascade,
  name              text not null,
  price_delta_pence int not null default 0,
  is_default        boolean not null default false,
  is_available      boolean not null default true,
  sort_order        int not null default 0
);
create index if not exists modifiers_group_idx on item_modifiers(group_id);

-- Allergens (14 UK FSA) -------------------------------------------------------
create table if not exists allergens (
  id     text primary key,                 -- 'gluten','peanuts',...
  label  text not null
);
insert into allergens (id, label) values
  ('celery','Celery'),('gluten','Cereals containing gluten'),('crustaceans','Crustaceans'),
  ('eggs','Eggs'),('fish','Fish'),('lupin','Lupin'),('milk','Milk'),('molluscs','Molluscs'),
  ('mustard','Mustard'),('peanuts','Peanuts'),('sesame','Sesame'),('soya','Soya'),
  ('sulphites','Sulphur dioxide & sulphites'),('tree_nuts','Tree nuts')
on conflict (id) do nothing;

create table if not exists item_allergens (
  item_id     uuid not null references menu_items(id) on delete cascade,
  allergen_id text not null references allergens(id) on delete cascade,
  primary key (item_id, allergen_id)
);

-- Per-location availability / price override ----------------------------------
-- Absence of a row ⇒ the item uses its base availability/price at that location.
create table if not exists location_menu_items (
  location_id        uuid not null references locations(id) on delete cascade,
  item_id            uuid not null references menu_items(id) on delete cascade,
  is_available       boolean not null default true,   -- '86' a dish at one branch
  price_pence_override int,
  primary key (location_id, item_id)
);

-- Row Level Security ----------------------------------------------------------
alter table item_modifier_groups enable row level security;
alter table item_modifiers        enable row level security;
alter table allergens             enable row level security;
alter table item_allergens        enable row level security;
alter table location_menu_items   enable row level security;

-- Public may read everything needed to render the ordering menu.
drop policy if exists "public read modifier_groups" on item_modifier_groups;
drop policy if exists "public read modifiers"        on item_modifiers;
drop policy if exists "public read allergens"        on allergens;
drop policy if exists "public read item_allergens"   on item_allergens;
drop policy if exists "public read location_menu"    on location_menu_items;
create policy "public read modifier_groups" on item_modifier_groups for select using (true);
create policy "public read modifiers"        on item_modifiers        for select using (true);
create policy "public read allergens"        on allergens             for select using (true);
create policy "public read item_allergens"   on item_allergens        for select using (true);
create policy "public read location_menu"    on location_menu_items   for select using (true);

-- Managers write menu structure; location managers/staff toggle availability.
drop policy if exists "managers write modifier_groups" on item_modifier_groups;
drop policy if exists "managers write modifiers"        on item_modifiers;
drop policy if exists "managers write item_allergens"   on item_allergens;
drop policy if exists "staff write location_menu"       on location_menu_items;
create policy "managers write modifier_groups" on item_modifier_groups for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
create policy "managers write modifiers" on item_modifiers for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
create policy "managers write item_allergens" on item_allergens for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
-- Staff at the location can 86 a dish there; managers can do any location.
create policy "staff write location_menu" on location_menu_items for all
  using (role_at_least('staff', location_id))
  with check (role_at_least('staff', location_id));
