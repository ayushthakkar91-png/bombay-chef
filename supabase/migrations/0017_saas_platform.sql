-- Bombay Bicycle Chef → Restaurant OS — 0017 multi-tenant SaaS control plane (Phase 13)
-- Introduces the platform layer: tenants, plans, subscriptions, white-label settings,
-- tenant↔user membership, platform operators, and audit. The EXISTING restaurant is
-- seeded as tenant #1, so the live app keeps working unchanged. `locations` gains a
-- tenant_id anchor (most domain data hangs off a location); full per-table tenant RLS
-- is the documented, scripted rollout (see docs/SAAS_PHASE13.md) — not flipped blind.

-- Plans -----------------------------------------------------------------------
create table if not exists plans (
  id                  uuid primary key default gen_random_uuid(),
  key                 text unique not null check (key in ('starter', 'professional', 'enterprise')),
  name                text not null,
  monthly_price_pence int not null default 0,
  annual_price_pence  int not null default 0,
  max_locations       int,                      -- null = unlimited
  max_users           int,
  features            text[] not null default '{}',
  stripe_price_monthly text,
  stripe_price_annual  text,
  sort_order          int not null default 0,
  is_active           boolean not null default true
);

-- Tenants ---------------------------------------------------------------------
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  status      text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'suspended', 'cancelled')),
  plan_id     uuid references plans(id) on delete set null,
  owner_id    uuid references profiles(id) on delete set null,
  trial_ends_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists tenants_updated on tenants;
create trigger tenants_updated before update on tenants for each row execute function set_updated_at();

-- White-label settings --------------------------------------------------------
create table if not exists tenant_settings (
  tenant_id     uuid primary key references tenants(id) on delete cascade,
  brand_name    text,
  logo_url      text,
  primary_color text not null default '#2B221D',
  accent_color  text not null default '#B08A3E',
  theme         text not null default 'classic',
  custom_domain text unique,
  support_email text,
  locale        text not null default 'en-GB',
  currency      text not null default 'GBP',
  seed_menu     jsonb,                          -- staged menu from the setup wizard
  updated_at    timestamptz not null default now()
);
drop trigger if exists tenant_settings_updated on tenant_settings;
create trigger tenant_settings_updated before update on tenant_settings for each row execute function set_updated_at();

-- Subscriptions (Stripe) ------------------------------------------------------
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  plan_id                uuid references plans(id) on delete set null,
  interval               text not null default 'monthly' check (interval in ('monthly', 'annual')),
  status                 text not null default 'incomplete' check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'manual')),
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_tenant_idx on subscriptions(tenant_id);
drop trigger if exists subscriptions_updated on subscriptions;
create trigger subscriptions_updated before update on subscriptions for each row execute function set_updated_at();

-- Tenant membership -----------------------------------------------------------
create table if not exists tenant_users (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index if not exists tenant_users_user_idx on tenant_users(user_id);

-- Platform operators (run the SaaS itself) ------------------------------------
create table if not exists platform_admins (
  user_id    uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Audit -----------------------------------------------------------------------
create table if not exists tenant_audit_log (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references tenants(id) on delete set null,
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  entity     text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tenant_audit_tenant_idx on tenant_audit_log(tenant_id, created_at);

-- Tenant anchor on locations --------------------------------------------------
alter table locations add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists locations_tenant_idx on locations(tenant_id);

-- Helper functions ------------------------------------------------------------
create or replace function is_platform_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function is_tenant_member(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_users where user_id = auth.uid() and tenant_id = t);
$$;

create or replace function current_tenant_id() returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from tenant_users where user_id = auth.uid() order by created_at limit 1;
$$;

-- Seed: plans -----------------------------------------------------------------
insert into plans (key, name, monthly_price_pence, annual_price_pence, max_locations, max_users, features, sort_order) values
  ('starter',      'Starter',      4900,  49000,  1,    5,    array['Online ordering', 'Reservations', 'Menu management', 'Email receipts'], 0),
  ('professional', 'Professional', 14900, 149000, 5,    25,   array['Everything in Starter', 'Loyalty & CRM', 'SMS & WhatsApp', 'Inventory & suppliers', 'Analytics & insights'], 1),
  ('enterprise',   'Enterprise',   39900, 399000, null, null, array['Everything in Professional', 'Unlimited locations & users', 'White-label & custom domain', 'Priority support', 'API access'], 2)
on conflict (key) do nothing;

-- Seed: the existing restaurant becomes tenant #1 -----------------------------
insert into tenants (slug, name, status, plan_id, owner_id)
select 'bombay-bicycle-chef', 'Bombay Bicycle Chef', 'active',
       (select id from plans where key = 'enterprise'),
       (select sr.profile_id from staff_roles sr where sr.role = 'super_admin' order by sr.profile_id limit 1)
on conflict (slug) do nothing;

insert into tenant_settings (tenant_id, brand_name, support_email)
select id, 'Bombay Bicycle Chef', 'hello@bombaybicyclechef.uk' from tenants where slug = 'bombay-bicycle-chef'
on conflict (tenant_id) do nothing;

-- Map existing super admins as platform operators + owners/admins of tenant #1.
insert into platform_admins (user_id)
select distinct profile_id from staff_roles where role = 'super_admin'
on conflict (user_id) do nothing;

insert into tenant_users (tenant_id, user_id, role)
select t.id, sr.profile_id, 'owner'
from tenants t, staff_roles sr
where t.slug = 'bombay-bicycle-chef' and sr.role = 'super_admin'
on conflict (tenant_id, user_id) do nothing;

-- A manual, active subscription for the seed tenant.
insert into subscriptions (tenant_id, plan_id, interval, status)
select t.id, t.plan_id, 'annual', 'manual' from tenants t where t.slug = 'bombay-bicycle-chef'
on conflict do nothing;

-- Backfill: all existing locations belong to tenant #1.
update locations set tenant_id = (select id from tenants where slug = 'bombay-bicycle-chef') where tenant_id is null;

-- Row Level Security ----------------------------------------------------------
alter table plans             enable row level security;
alter table tenants           enable row level security;
alter table tenant_settings   enable row level security;
alter table subscriptions     enable row level security;
alter table tenant_users      enable row level security;
alter table platform_admins   enable row level security;
alter table tenant_audit_log  enable row level security;

-- Plans: public read (pricing); platform admins manage.
drop policy if exists "plans read" on plans;
drop policy if exists "plans manage" on plans;
create policy "plans read" on plans for select using (true);
create policy "plans manage" on plans for all using (is_platform_admin()) with check (is_platform_admin());

-- Tenants + settings + subscriptions + audit: platform admins everything;
-- tenant members read their own tenant.
drop policy if exists "tenants platform" on tenants;
drop policy if exists "tenants member read" on tenants;
create policy "tenants platform" on tenants for all using (is_platform_admin()) with check (is_platform_admin());
create policy "tenants member read" on tenants for select using (is_tenant_member(id));

drop policy if exists "settings platform" on tenant_settings;
drop policy if exists "settings member read" on tenant_settings;
create policy "settings platform" on tenant_settings for all using (is_platform_admin()) with check (is_platform_admin());
create policy "settings member read" on tenant_settings for select using (is_tenant_member(tenant_id));

drop policy if exists "subs platform" on subscriptions;
drop policy if exists "subs member read" on subscriptions;
create policy "subs platform" on subscriptions for all using (is_platform_admin()) with check (is_platform_admin());
create policy "subs member read" on subscriptions for select using (is_tenant_member(tenant_id));

drop policy if exists "tenant_users platform" on tenant_users;
drop policy if exists "tenant_users self read" on tenant_users;
create policy "tenant_users platform" on tenant_users for all using (is_platform_admin()) with check (is_platform_admin());
create policy "tenant_users self read" on tenant_users for select using (user_id = auth.uid() or is_tenant_member(tenant_id));

drop policy if exists "platform_admins manage" on platform_admins;
create policy "platform_admins manage" on platform_admins for all using (is_platform_admin()) with check (is_platform_admin());

drop policy if exists "audit platform" on tenant_audit_log;
drop policy if exists "audit member read" on tenant_audit_log;
create policy "audit platform" on tenant_audit_log for all using (is_platform_admin()) with check (is_platform_admin());
create policy "audit member read" on tenant_audit_log for select using (is_tenant_member(tenant_id));
