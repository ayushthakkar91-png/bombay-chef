-- Bombay Bicycle Chef — 0009 reservation blocks & special-event closures
-- Extends the 0005 reservation schema with admin-controlled unavailability:
-- a `block` removes a time range from availability at one location; a `closure`
-- is the same mechanism flagged as a whole-day/special-event close. The
-- availability engine subtracts any overlapping block from open slots.

-- The booking flow captures a chosen "experience" (lunch/dinner/private/…).
-- Store it on the reservation for confirmations and admin context.
alter table reservations add column if not exists experience text;

create table if not exists reservation_blocks (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  kind        text not null default 'block' check (kind in ('block', 'closure')),
  reason      text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists reservation_blocks_loc_idx
  on reservation_blocks(location_id, starts_at);

alter table reservation_blocks enable row level security;

-- Availability is computed server-side with the service role, so no public read
-- policy is needed. Staff at the location manage blocks; managers see all.
drop policy if exists "staff manage blocks" on reservation_blocks;
create policy "staff manage blocks" on reservation_blocks for all
  using (role_at_least('staff', location_id))
  with check (role_at_least('staff', location_id));
