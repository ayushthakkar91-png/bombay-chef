-- Bombay Bicycle Chef — 0012 CRM & email marketing (Phase 6)
-- Builds on 0008 (customer_segments, segment_members, campaigns, email_events,
-- notifications). Adds the operational marketing list + campaign authoring. We
-- send through the existing Brevo provider + notifications outbox (consent-gated);
-- no external ESP sync.

-- Operational marketing list. The append-only `consents` log stays the GDPR
-- evidence trail; this is the working "who receives marketing email" table with
-- per-contact unsubscribe tokens. Kept in sync with customer consent + newsletter
-- signups. Holds email-only subscribers who aren't (yet) account holders.
create table if not exists marketing_contacts (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,            -- stored lowercased
  name              text,
  consent           boolean not null default true,
  source            text,                            -- 'newsletter','account','checkout'
  customer_id       uuid references customers(id) on delete set null,
  unsubscribe_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  subscribed_at     timestamptz not null default now(),
  unsubscribed_at   timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists marketing_contacts_customer_idx on marketing_contacts(customer_id);

alter table marketing_contacts enable row level security;
-- Managers read; all writes are server-side (service client). Unsubscribe is a
-- tokenised server action, not a direct client write.
drop policy if exists "managers read contacts" on marketing_contacts;
create policy "managers read contacts" on marketing_contacts for select
  using (role_at_least('restaurant_manager'));

-- Campaign authoring + targeting on the existing campaigns table.
alter table campaigns add column if not exists subject    text;
alter table campaigns add column if not exists body_text  text;
alter table campaigns add column if not exists segment_id text references customer_segments(id);
alter table campaigns add column if not exists status     text not null default 'draft'
  check (status in ('draft', 'sending', 'sent'));

-- Managers manage campaigns (0008 granted read only).
drop policy if exists "managers read campaigns"   on campaigns;
drop policy if exists "managers manage campaigns" on campaigns;
create policy "managers manage campaigns" on campaigns for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
