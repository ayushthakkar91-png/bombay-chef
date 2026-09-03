-- 0027_contact_enquiries.sql — store /contact form submissions so staff can see
-- them in admin (and get an email alert). Service-role only: the public submit
-- goes through a validated server action using the service client; admin reads
-- via the service client too. RLS on + no policies = denied to anon/authenticated.
create table if not exists contact_enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contact_enquiries_created_idx on contact_enquiries(created_at desc);
alter table contact_enquiries enable row level security;
