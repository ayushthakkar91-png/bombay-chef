-- Bombay Bicycle Chef — 0014 staff & operations (Phase 9)
-- Builds on 0002 (profiles, staff_roles, role helpers, audit_log). Adds shift
-- scheduling and leave requests. Staff management + roles reuse the existing
-- staff_roles system; location scoping reuses role_at_least(role, location).

-- Shifts ----------------------------------------------------------------------
create table if not exists shifts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  position    text,                       -- 'kitchen','front','bar','manager'
  notes       text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists shifts_loc_time_idx on shifts(location_id, starts_at);
create index if not exists shifts_profile_idx on shifts(profile_id, starts_at);
drop trigger if exists shifts_updated on shifts;
create trigger shifts_updated before update on shifts for each row execute function set_updated_at();

-- Leave requests --------------------------------------------------------------
create table if not exists leave_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  start_date  date not null,
  end_date    date not null,
  kind        text not null default 'holiday' check (kind in ('holiday', 'sick', 'unpaid', 'other')),
  reason      text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by  uuid references profiles(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists leave_loc_idx on leave_requests(location_id, start_date);
create index if not exists leave_profile_idx on leave_requests(profile_id);

-- Row Level Security ----------------------------------------------------------
alter table shifts          enable row level security;
alter table leave_requests  enable row level security;

-- Shifts: staff see the schedule for their location; managers manage it.
drop policy if exists "staff read shifts" on shifts;
drop policy if exists "managers manage shifts" on shifts;
create policy "staff read shifts" on shifts for select
  using (role_at_least('staff', location_id));
create policy "managers manage shifts" on shifts for all
  using (role_at_least('location_manager', location_id))
  with check (role_at_least('location_manager', location_id));

-- Leave: a member reads + raises their own; managers at the location manage all.
drop policy if exists "own leave read"   on leave_requests;
drop policy if exists "own leave insert" on leave_requests;
drop policy if exists "managers manage leave" on leave_requests;
create policy "own leave read"   on leave_requests for select using (profile_id = auth.uid());
create policy "own leave insert" on leave_requests for insert with check (profile_id = auth.uid());
create policy "managers manage leave" on leave_requests for all
  using (role_at_least('location_manager', location_id))
  with check (role_at_least('location_manager', location_id));
