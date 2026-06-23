-- Bombay Bicycle Chef — 0008 CRM/marketing mirror + cross-cutting outbox & GDPR
-- Builds on all prior. The ESP (Brevo/Klaviyo/Mailchimp) is the system of record
-- for campaign sending; these tables MIRROR it for reporting and own the trigger
-- data + the transactional outbox + the GDPR request queue.

-- Segments (materialised by a nightly job, synced to ESP lists) ----------------
create table if not exists customer_segments (
  id          text primary key,              -- 'new','returning','high_value','inactive',...
  name        text not null,
  rule        jsonb not null default '{}',   -- declarative definition for the refresh job
  esp_list_id text,                          -- mapping into the ESP
  created_at  timestamptz not null default now()
);

create table if not exists segment_members (
  segment_id  text not null references customer_segments(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (segment_id, customer_id)
);
create index if not exists segment_members_customer_idx on segment_members(customer_id);

-- Campaigns (local mirror for reporting) --------------------------------------
create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,                -- 'brevo','klaviyo','mailchimp'
  provider_id  text,
  name         text not null,
  audience     text,                         -- segment id or description
  sent_at      timestamptz,
  recipients   int,
  opens        int,
  clicks       int,
  unsubscribes int,
  revenue_pence bigint,                       -- attributed, if tracked
  created_at   timestamptz not null default now()
);

-- Per-recipient email events synced from ESP webhooks -------------------------
create table if not exists email_events (
  id          bigint generated always as identity primary key,
  campaign_id uuid references campaigns(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  email       text not null,
  event       text not null
                check (event in ('delivered','open','click','bounce','spam','unsubscribe')),
  provider_id text,
  created_at  timestamptz not null default now()
);
create index if not exists email_events_customer_idx on email_events(customer_id);

-- Notifications outbox (transactional email + SMS) ----------------------------
-- Producers insert a queued row; a worker (pg_cron + on-insert) dispatches via
-- the right channel adapter, recording provider id + status, with retries.
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null check (channel in ('email','sms')),
  template     text not null,                 -- 'order_confirmation','reservation_reminder',...
  to_address   text not null,
  payload      jsonb not null default '{}',
  send_after   timestamptz not null default now(),
  status       text not null default 'queued'
                 check (status in ('queued','sending','sent','failed')),
  attempts     int  not null default 0,
  provider_id  text,
  last_error   text,
  -- linkage for idempotency/audit
  customer_id  uuid references customers(id) on delete set null,
  order_id     uuid references orders(id) on delete set null,
  reservation_id uuid references reservations(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists notifications_due_idx on notifications(status, send_after);
drop trigger if exists notifications_updated on notifications;
create trigger notifications_updated before update on notifications
  for each row execute function set_updated_at();

-- GDPR data requests (export / erasure) ---------------------------------------
create table if not exists data_requests (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references customers(id) on delete set null,
  email        text not null,                 -- verified contact for the request
  type         text not null check (type in ('export','erasure')),
  status       text not null default 'pending'
                 check (status in ('pending','verifying','processing','completed','rejected')),
  artefact_url text,                           -- signed, expiring link for export bundles
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  note         text
);
create index if not exists data_requests_status_idx on data_requests(status);

-- Row Level Security ----------------------------------------------------------
alter table customer_segments enable row level security;
alter table segment_members   enable row level security;
alter table campaigns         enable row level security;
alter table email_events      enable row level security;
alter table notifications     enable row level security;
alter table data_requests     enable row level security;

-- Marketing data is staff-only (managers); mutations are server-side jobs.
drop policy if exists "managers read segments"  on customer_segments;
drop policy if exists "managers read members"   on segment_members;
drop policy if exists "managers read campaigns" on campaigns;
drop policy if exists "managers read email_events" on email_events;
create policy "managers read segments"  on customer_segments for select
  using (role_at_least('restaurant_manager'));
create policy "managers read members"   on segment_members for select
  using (role_at_least('restaurant_manager'));
create policy "managers read campaigns" on campaigns for select
  using (role_at_least('restaurant_manager'));
create policy "managers read email_events" on email_events for select
  using (role_at_least('restaurant_manager'));

-- Notifications: outbox is worker-only (service-role). No anon/auth policy
-- granted, so RLS denies all access through public keys by default.

-- Data requests: a customer may create + read their own; super_admin oversees.
-- Fulfilment runs server-side (service-role).
drop policy if exists "own data_requests"    on data_requests;
drop policy if exists "admin read data_requests" on data_requests;
create policy "own data_requests" on data_requests for select
  using (customer_id = auth.uid());
create policy "admin read data_requests" on data_requests for select
  using (role_at_least('super_admin'));

-- Seed the standard segment definitions.
insert into customer_segments (id, name, rule) values
  ('new',        'New customers',       '{"orders_count_lt": 1}'),
  ('returning',  'Returning customers', '{"orders_count_gte": 2}'),
  ('high_value', 'High-value customers','{"tier_gte": "gold"}'),
  ('inactive',   'Inactive customers',  '{"last_order_days_gt": 90}'),
  ('delivery',   'Delivery customers',  '{"prefers_fulfilment": "delivery"}'),
  ('dine_in',    'Dine-in customers',   '{"has_reservation": true}')
on conflict (id) do nothing;
