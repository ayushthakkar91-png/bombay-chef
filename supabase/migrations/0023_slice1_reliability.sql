-- Bombay Bicycle Chef — 0023 Slice 1 reliability (Telegram + idempotency + audit)
-- Stacks on 0022. Append-only. NOT applied automatically — staging first, then
-- production with explicit approval.
--
-- Contents:
--   S1  Stripe webhook dedup     — stripe_webhook_events
--   S2  Order idempotency        — orders.idempotency_key (unique)
--   S4  Order event audit log    — order_events
--   S5  Telegram channel         — notifications.channel += 'telegram'

-- ============================================================================
-- S1: Stripe webhook idempotency. Store each processed event id; the webhook
-- inserts on-conflict-do-nothing and skips side effects if the row already
-- existed. Service-role only (no public policy).
-- ============================================================================
create table if not exists stripe_webhook_events (
  stripe_event_id text primary key,
  event_type      text not null,
  processed_at    timestamptz not null default now()
);
alter table stripe_webhook_events enable row level security;
-- No policy => deny-all to anon/authenticated; only the service role (webhook) touches it.

-- ============================================================================
-- S2: Order idempotency key. A client sends one UUID per checkout attempt
-- (persisted client-side across refresh/retry); the server dedupes on it so a
-- double-click / network retry returns the SAME order instead of a duplicate.
-- ============================================================================
alter table orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency_key_uidx
  on orders (idempotency_key) where idempotency_key is not null;

-- ============================================================================
-- S4: Order event audit log — a complete, append-only trail per order,
-- distinct from notification status. Staff at the order's location read it;
-- all writes are service-role.
-- ============================================================================
create table if not exists order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  type       text not null,
  actor_id   uuid references profiles(id) on delete set null,
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);
alter table order_events enable row level security;
drop policy if exists "staff read order_events" on order_events;
create policy "staff read order_events" on order_events for select
  using (exists (select 1 from orders o where o.id = order_id and role_at_least('staff', o.location_id)));
-- Writes are service-role only (no insert policy) — the outbox/webhook/actions write.

-- ============================================================================
-- S5: allow a 'telegram' notification channel in the existing outbox.
-- ============================================================================
alter table notifications drop constraint if exists notifications_channel_check;
alter table notifications add constraint notifications_channel_check
  check (channel in ('email','sms','telegram'));
