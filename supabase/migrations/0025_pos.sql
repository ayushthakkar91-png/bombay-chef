-- 0025_pos.sql — Sunmi POS support: device registry, print flags, fcm channel.

-- Print tracking on orders (the POS marks these; poll derives isPrinted).
alter table orders add column if not exists printed_at      timestamptz;
alter table orders add column if not exists print_failed_at timestamptz;
alter table orders add column if not exists print_error     text;

-- Device registry for FCM new-order pushes.
create table if not exists pos_devices (
  id           uuid primary key default gen_random_uuid(),
  fcm_token    text unique not null,
  location_id  uuid not null references locations(id) on delete cascade,
  profile_id   uuid references profiles(id) on delete set null,
  device_name  text,
  device_model text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists pos_devices_loc_idx on pos_devices(location_id);
alter table pos_devices enable row level security;
-- Writes/reads are service-role only (the POS routes use the service client
-- AFTER verifying the staff JWT). No public policy = deny by default.

-- Allow the 'fcm' channel on the notifications outbox.
-- The channel column is a text check constraint added in an earlier migration;
-- drop+recreate to include 'fcm'. Adjust the list if your constraint differs.
do $$
begin
  if exists (select 1 from information_schema.constraint_column_usage
             where table_name = 'notifications' and column_name = 'channel') then
    alter table notifications drop constraint if exists notifications_channel_check;
  end if;
end $$;
alter table notifications
  add constraint notifications_channel_check
  check (channel in ('email','sms','telegram','fcm'));
