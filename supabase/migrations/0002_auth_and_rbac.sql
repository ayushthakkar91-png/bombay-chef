-- Bombay Bicycle Chef — 0002 identity, RBAC, audit + RLS helpers
-- Builds on 0001_init.sql. Establishes who can do what. Every later migration's
-- staff policies are expressed in terms of the helper functions defined here.
--
-- Roles (most → least privilege):
--   super_admin         org-wide, settings, staff, integrations, audit
--   restaurant_manager  org-wide operations + menu/marketing/loyalty, no settings
--   location_manager    one location: operations, refunds, reports for their branch
--   staff               one location: today's orders/KDS/reservations, availability
--
-- A staff_roles row with location_id IS NULL grants the role org-wide.

-- Profiles --------------------------------------------------------------------
-- One row per auth.users. Auto-created by a trigger on signup.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  type          text not null default 'customer'
                  check (type in ('customer', 'staff')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists profiles_updated on profiles;
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-provision a profile when a new auth user is created.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, full_name, phone)
  values (new.id,
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Staff roles -----------------------------------------------------------------
create table if not exists staff_roles (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  location_id  uuid references locations(id) on delete cascade,  -- NULL = org-wide
  role         text not null
                 check (role in ('super_admin','restaurant_manager',
                                 'location_manager','staff')),
  created_at   timestamptz not null default now(),
  unique (profile_id, location_id, role)
);
create index if not exists staff_roles_profile_idx on staff_roles(profile_id);

-- RLS helper functions --------------------------------------------------------
-- security definer so they can read staff_roles regardless of the caller's RLS.
-- Rank lets us express "role at least X".
create or replace function role_rank(r text) returns int as $$
  select case r
    when 'super_admin' then 4
    when 'restaurant_manager' then 3
    when 'location_manager' then 2
    when 'staff' then 1
    else 0 end;
$$ language sql immutable;

-- Highest role the current user holds, considering org-wide grants and (when
-- loc is provided) grants scoped to that location.
create or replace function current_role_rank(loc uuid default null)
returns int as $$
  select coalesce(max(role_rank(role)), 0)
  from staff_roles
  where profile_id = auth.uid()
    and (location_id is null or (loc is not null and location_id = loc));
$$ language sql stable security definer set search_path = public;

create or replace function is_staff() returns boolean as $$
  select exists (select 1 from staff_roles where profile_id = auth.uid());
$$ language sql stable security definer set search_path = public;

-- True if the user can act at >= the given role for the given location
-- (org-wide grants satisfy any location).
create or replace function role_at_least(min_role text, loc uuid default null)
returns boolean as $$
  select current_role_rank(loc) >= role_rank(min_role);
$$ language sql stable security definer set search_path = public;

-- Audit log -------------------------------------------------------------------
-- Every privileged/admin mutation appends here (written by the app via
-- service-role). Append-only: no update/delete policy is ever granted.
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,                 -- e.g. 'order.refund'
  entity      text not null,                 -- e.g. 'orders'
  entity_id   text,
  location_id uuid references locations(id) on delete set null,
  before      jsonb,
  after       jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on audit_log(entity, entity_id);
create index if not exists audit_log_actor_idx  on audit_log(actor_id);

-- Row Level Security ----------------------------------------------------------
alter table profiles    enable row level security;
alter table staff_roles enable row level security;
alter table audit_log   enable row level security;

-- Profiles: a user reads/updates their own; managers read profiles. No one
-- changes another person's profile through these keys (admin edits use service-role).
drop policy if exists "own profile read"   on profiles;
drop policy if exists "own profile update" on profiles;
drop policy if exists "staff read profiles" on profiles;
create policy "own profile read"   on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid());
create policy "staff read profiles" on profiles for select
  using (role_at_least('location_manager'));

-- Staff roles: a user can see their own grants; only super_admin manages grants
-- (and that is normally done via service-role with an audit row).
drop policy if exists "own roles read"      on staff_roles;
drop policy if exists "super admin manage roles" on staff_roles;
create policy "own roles read" on staff_roles for select
  using (profile_id = auth.uid());
create policy "super admin manage roles" on staff_roles for all
  using (role_at_least('super_admin')) with check (role_at_least('super_admin'));

-- Audit log: managers may read (scoped to their location or org-wide); inserts
-- come from service-role only, so no insert policy is granted to anon/auth.
drop policy if exists "managers read audit" on audit_log;
create policy "managers read audit" on audit_log for select
  using (role_at_least('location_manager', location_id));

-- Let staff write the menu/locations from the admin panel now that roles exist
-- (0001 left writes to service-role only). Reads stay public (policies in 0001).
drop policy if exists "managers write menu_categories" on menu_categories;
drop policy if exists "managers write menu_items"      on menu_items;
drop policy if exists "managers write locations"       on locations;
create policy "managers write menu_categories" on menu_categories for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
create policy "managers write menu_items" on menu_items for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
create policy "managers write locations" on locations for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
