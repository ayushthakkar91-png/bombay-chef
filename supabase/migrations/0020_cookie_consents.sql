-- Cookie-consent audit log. The public site records each Accept/Reject via a
-- server action using the service client; there is no public read or write
-- policy (RLS on, service-role only).

create table if not exists cookie_consents (
  id         uuid primary key default gen_random_uuid(),
  choice     text not null check (choice in ('accepted', 'rejected')),
  user_agent text,
  created_at timestamptz not null default now()
);

alter table cookie_consents enable row level security;
