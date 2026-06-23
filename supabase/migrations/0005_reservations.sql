-- Bombay Bicycle Chef — 0005 reservations, tables, waitlist
-- Builds on 0002 (RBAC) + 0003 (customers). Wires the existing reservation flow
-- (src/components/reservations/) to a real backend. Guest bookings allowed
-- (customer_id null); a manage_token gives non-account holders a manage link.

-- Physical tables -------------------------------------------------------------
create table if not exists tables (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references locations(id) on delete cascade,
  name         text not null,                 -- 'T4', 'Window 2'
  seats        int  not null check (seats > 0),
  min_party    int  not null default 1,
  max_party    int  not null,
  zone         text,                          -- 'window','bar','private'
  combinable   boolean not null default true,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  unique (location_id, name)
);
create index if not exists tables_location_idx on tables(location_id);

-- Slot configuration per location --------------------------------------------
create table if not exists reservation_slots (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid not null references locations(id) on delete cascade,
  weekday         int  not null check (weekday between 0 and 6),  -- 0=Sun
  service_start   time not null,
  service_end     time not null,
  slot_minutes    int  not null default 15,    -- booking granularity
  turn_minutes    int  not null default 120,   -- how long a table is held
  max_covers      int  not null,               -- capacity guard for the window
  is_active       boolean not null default true,
  unique (location_id, weekday, service_start)
);

-- Reservations ----------------------------------------------------------------
create table if not exists reservations (
  id               uuid primary key default gen_random_uuid(),
  location_id      uuid not null references locations(id) on delete restrict,
  customer_id      uuid references customers(id) on delete set null,  -- null = guest
  party_size       int  not null check (party_size > 0),
  occasion         text,                       -- 'birthday','anniversary','date',...
  starts_at        timestamptz not null,
  duration_min     int  not null default 120,
  status           text not null default 'confirmed'
                     check (status in ('pending','confirmed','seated',
                                       'completed','no_show','cancelled')),
  -- contact snapshot (so guest bookings stand alone, GDPR-scoped)
  guest_name       text,
  guest_email      text,
  guest_phone      text,
  special_requests text,
  manage_token     text unique default encode(gen_random_bytes(16), 'hex'),
  source           text not null default 'web',  -- 'web','phone','walk_in'
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists reservations_loc_time_idx on reservations(location_id, starts_at);
create index if not exists reservations_customer_idx  on reservations(customer_id);
drop trigger if exists reservations_updated on reservations;
create trigger reservations_updated before update on reservations
  for each row execute function set_updated_at();

-- Table assignment (a booking may combine tables) -----------------------------
create table if not exists reservation_tables (
  reservation_id uuid not null references reservations(id) on delete cascade,
  table_id       uuid not null references tables(id) on delete restrict,
  primary key (reservation_id, table_id)
);

-- Status history (audit of every transition) ----------------------------------
create table if not exists reservation_status_history (
  id             bigint generated always as identity primary key,
  reservation_id uuid not null references reservations(id) on delete cascade,
  from_status    text,
  to_status      text not null,
  actor_id       uuid references profiles(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);

-- Guard illegal status transitions + record history.
create or replace function reservations_guard_status() returns trigger as $$
declare
  ok boolean;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    ok := case old.status
      when 'pending'   then new.status in ('confirmed','cancelled')
      when 'confirmed' then new.status in ('seated','cancelled','no_show')
      when 'seated'    then new.status in ('completed','cancelled')
      else false end;
    if not ok then
      raise exception 'illegal reservation transition % -> %', old.status, new.status;
    end if;
    insert into reservation_status_history (reservation_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists reservations_status_guard on reservations;
create trigger reservations_status_guard before update on reservations
  for each row execute function reservations_guard_status();

-- Waitlist --------------------------------------------------------------------
create table if not exists waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references locations(id) on delete cascade,
  customer_id   uuid references customers(id) on delete set null,
  party_size    int  not null check (party_size > 0),
  desired_from  timestamptz not null,
  desired_to    timestamptz not null,
  guest_name    text,
  guest_email   text,
  guest_phone   text,
  status        text not null default 'waiting'
                  check (status in ('waiting','offered','converted','expired','cancelled')),
  offered_until timestamptz,                 -- time-boxed hold when a slot is offered
  created_at    timestamptz not null default now()
);
create index if not exists waitlist_loc_idx on waitlist_entries(location_id, desired_from);

-- Row Level Security ----------------------------------------------------------
alter table tables                      enable row level security;
alter table reservation_slots           enable row level security;
alter table reservations                enable row level security;
alter table reservation_tables          enable row level security;
alter table reservation_status_history  enable row level security;
alter table waitlist_entries            enable row level security;

-- Public reads config needed to show availability.
drop policy if exists "public read tables" on tables;
drop policy if exists "public read slots"  on reservation_slots;
create policy "public read tables" on tables for select using (is_active);
create policy "public read slots"  on reservation_slots for select using (is_active);
-- Staff manage tables & slots for their location.
drop policy if exists "staff write tables" on tables;
drop policy if exists "managers write slots" on reservation_slots;
create policy "staff write tables" on tables for all
  using (role_at_least('staff', location_id)) with check (role_at_least('staff', location_id));
create policy "managers write slots" on reservation_slots for all
  using (role_at_least('location_manager', location_id))
  with check (role_at_least('location_manager', location_id));

-- Reservations: a customer reads/creates/updates their own; staff at the location
-- manage all bookings there. Guest bookings (customer_id null) are created/managed
-- server-side via the manage_token (service-role), not through anon RLS.
drop policy if exists "own reservations rw"   on reservations;
drop policy if exists "staff manage reservations" on reservations;
create policy "own reservations rw" on reservations for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "staff manage reservations" on reservations for all
  using (role_at_least('staff', location_id))
  with check (role_at_least('staff', location_id));

-- Assignment + history: staff at the location.
drop policy if exists "staff rw res_tables"   on reservation_tables;
drop policy if exists "staff read res_history" on reservation_status_history;
create policy "staff rw res_tables" on reservation_tables for all
  using (exists (select 1 from reservations r
                 where r.id = reservation_id and role_at_least('staff', r.location_id)))
  with check (exists (select 1 from reservations r
                 where r.id = reservation_id and role_at_least('staff', r.location_id)));
create policy "staff read res_history" on reservation_status_history for select
  using (exists (select 1 from reservations r
                 where r.id = reservation_id and role_at_least('staff', r.location_id)));

-- Waitlist: owner reads own; staff manage location waitlist.
drop policy if exists "own waitlist read"  on waitlist_entries;
drop policy if exists "staff manage waitlist" on waitlist_entries;
create policy "own waitlist read" on waitlist_entries for select
  using (customer_id = auth.uid());
create policy "staff manage waitlist" on waitlist_entries for all
  using (role_at_least('staff', location_id)) with check (role_at_least('staff', location_id));
