-- Bombay Bicycle Chef — 0016 SMS & WhatsApp messaging (Phase 11)
-- A consent-gated messaging engine that OBSERVES orders/reservations/rewards
-- (never modifies them) and queues SMS/WhatsApp via Twilio or the WhatsApp Cloud
-- API. Separate from the email `notifications` outbox (0008) — that path is
-- untouched. Multi-location flows inherit their location via the source row.

-- Consent (keyed by phone in E.164) -------------------------------------------
create table if not exists messaging_preferences (
  id               uuid primary key default gen_random_uuid(),
  phone            text unique not null,
  customer_id      uuid references customers(id) on delete set null,
  sms_opt_in       boolean not null default false,
  whatsapp_opt_in  boolean not null default false,
  marketing_opt_in boolean not null default false,
  opt_out_at       timestamptz,
  source           text,                 -- 'admin','web','import','inbound_stop'
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists messaging_preferences_updated on messaging_preferences;
create trigger messaging_preferences_updated before update on messaging_preferences for each row execute function set_updated_at();

-- Templates -------------------------------------------------------------------
create table if not exists message_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,        -- 'order_accepted','reservation_confirmation',...
  name       text not null,
  channel    text not null default 'sms' check (channel in ('sms', 'whatsapp')),
  category   text not null check (category in ('reservation', 'order', 'marketing')),
  body       text not null,               -- supports {{placeholders}}
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists message_templates_updated on message_templates;
create trigger message_templates_updated before update on message_templates for each row execute function set_updated_at();

-- Campaigns (marketing) -------------------------------------------------------
create table if not exists message_campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  channel      text not null default 'sms' check (channel in ('sms', 'whatsapp')),
  body         text not null,
  link_url     text,
  status       text not null default 'draft' check (status in ('draft', 'queued', 'sending', 'sent', 'cancelled')),
  audience     text not null default 'marketing',   -- segment key
  scheduled_at timestamptz,
  total_count  int not null default 0,
  sent_count   int not null default 0,
  failed_count int not null default 0,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists message_campaigns_updated on message_campaigns;
create trigger message_campaigns_updated before update on message_campaigns for each row execute function set_updated_at();

-- Messages (queue + delivery log) ---------------------------------------------
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  channel         text not null check (channel in ('sms', 'whatsapp')),
  category        text not null check (category in ('reservation', 'order', 'marketing')),
  to_phone        text not null,
  customer_id     uuid references customers(id) on delete set null,
  template_key    text,
  body            text not null,
  link_url        text,
  status          text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  provider        text,                    -- 'twilio','whatsapp_cloud','console'
  provider_sid    text,
  error           text,
  attempts        int not null default 0,
  max_attempts    int not null default 3,
  next_attempt_at timestamptz not null default now(),
  dedup_key       text unique,             -- 'order:<id>:accepted'
  campaign_id     uuid references message_campaigns(id) on delete set null,
  order_id        uuid references orders(id) on delete set null,
  reservation_id  uuid references reservations(id) on delete set null,
  clicked_at      timestamptz,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_due_idx on messages(status, next_attempt_at);
create index if not exists messages_sid_idx on messages(provider_sid);
create index if not exists messages_created_idx on messages(created_at);

-- Row Level Security (manager-managed; cron/webhook/public use service role) ---
alter table messaging_preferences enable row level security;
alter table message_templates     enable row level security;
alter table message_campaigns     enable row level security;
alter table messages              enable row level security;

do $$
declare t text;
begin
  foreach t in array array['messaging_preferences', 'message_templates', 'message_campaigns', 'messages']
  loop
    execute format('drop policy if exists "managers manage %1$s" on %1$s', t);
    execute format('create policy "managers manage %1$s" on %1$s for all using (role_at_least(''restaurant_manager'')) with check (role_at_least(''restaurant_manager''))', t);
  end loop;
end $$;

-- Seed default templates ------------------------------------------------------
insert into message_templates (key, name, category, body) values
  ('reservation_confirmation',     'Reservation confirmed',     'reservation', 'Hi {{name}}, your table for {{party}} at Bombay Bicycle Chef {{location}} on {{datetime}} is confirmed. Ref {{ref}}. Reply STOP to opt out.'),
  ('reservation_reminder_24h',     'Reservation reminder (24h)','reservation', 'Reminder: your table for {{party}} at Bombay Bicycle Chef {{location}} is tomorrow at {{time}}. See you then! Ref {{ref}}.'),
  ('reservation_reminder_same_day','Reservation reminder (today)','reservation','See you today! Your table for {{party}} at Bombay Bicycle Chef {{location}} is at {{time}}. Ref {{ref}}.'),
  ('reservation_cancellation',     'Reservation cancelled',     'reservation', 'Your reservation {{ref}} at Bombay Bicycle Chef {{location}} on {{datetime}} has been cancelled. Call us to rebook.'),
  ('order_accepted',          'Order accepted',          'order', 'Thanks {{name}}! Order {{code}} is confirmed and heading to our kitchen.'),
  ('order_preparing',         'Order preparing',         'order', 'Order {{code}} is now being prepared by our chefs. 🍛'),
  ('order_ready_for_collection','Order ready',           'order', 'Order {{code}} is ready for collection at Bombay Bicycle Chef {{location}}.'),
  ('order_out_for_delivery',  'Order out for delivery',  'order', 'Order {{code}} is out for delivery and on its way to you.'),
  ('order_completed',         'Order delivered',         'order', 'Order {{code}} has been completed. Thank you for choosing Bombay Bicycle Chef!')
on conflict (key) do nothing;
