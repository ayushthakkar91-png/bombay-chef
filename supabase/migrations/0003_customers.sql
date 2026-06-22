-- Bombay Bicycle Chef — 0003 customers, addresses, consent (GDPR trail)
-- Builds on 0002. A "customer" is a profile that places orders / books tables.
-- The consents table is the append-only evidence trail for UK GDPR / PECR.

-- Customers -------------------------------------------------------------------
create table if not exists customers (
  id                   uuid primary key references profiles(id) on delete cascade,
  stripe_customer_id   text unique,
  default_address_id   uuid,                       -- FK added after addresses exists
  loyalty_opt_in       boolean not null default false,
  lifetime_value_pence bigint  not null default 0, -- maintained on order completion
  orders_count         int     not null default 0,
  last_order_at        timestamptz,
  tags                 text[]  not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
drop trigger if exists customers_updated on customers;
create trigger customers_updated before update on customers
  for each row execute function set_updated_at();

-- Addresses -------------------------------------------------------------------
create table if not exists addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers(id) on delete cascade,
  label        text,                               -- 'Home', 'Work'
  line1        text not null,
  line2        text,
  city         text not null,
  postcode     text not null,                      -- validated UK postcode
  lat          double precision,                   -- geocoded for radius checks
  lng          double precision,
  notes        text,                               -- "buzzer broken, call on arrival"
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists addresses_customer_idx on addresses(customer_id);
drop trigger if exists addresses_updated on addresses;
create trigger addresses_updated before update on addresses
  for each row execute function set_updated_at();

alter table customers
  drop constraint if exists customers_default_address_fk;
alter table customers
  add constraint customers_default_address_fk
  foreign key (default_address_id) references addresses(id) on delete set null;

-- Consents (append-only) ------------------------------------------------------
-- Never updated in place. The current state per purpose is the latest row.
create table if not exists consents (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  purpose     text not null
                check (purpose in ('marketing_email','marketing_sms',
                                   'analytics_cookies','marketing_cookies')),
  granted     boolean not null,
  source      text,                                -- 'signup','preference_centre','checkout'
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists consents_customer_idx on consents(customer_id, purpose, created_at desc);

-- Latest consent state per (customer, purpose).
create or replace view current_consent as
  select distinct on (customer_id, purpose)
    customer_id, purpose, granted, created_at
  from consents
  order by customer_id, purpose, created_at desc;

-- Favourites ------------------------------------------------------------------
create table if not exists favourites (
  customer_id  uuid not null references customers(id) on delete cascade,
  item_id      uuid not null references menu_items(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, item_id)
);

-- Row Level Security ----------------------------------------------------------
alter table customers   enable row level security;
alter table addresses   enable row level security;
alter table consents    enable row level security;
alter table favourites  enable row level security;

-- Customers own their row; managers may read for support/CRM.
drop policy if exists "own customer rw"     on customers;
drop policy if exists "staff read customers" on customers;
create policy "own customer rw" on customers for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy "staff read customers" on customers for select
  using (role_at_least('location_manager'));

-- Addresses: owner full control; managers read (delivery support).
drop policy if exists "own addresses rw"     on addresses;
drop policy if exists "staff read addresses" on addresses;
create policy "own addresses rw" on addresses for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "staff read addresses" on addresses for select
  using (role_at_least('location_manager'));

-- Consents: owner inserts + reads their own history; managers read (audit).
-- No update/delete policy — append-only by construction.
drop policy if exists "own consent insert" on consents;
drop policy if exists "own consent read"   on consents;
drop policy if exists "staff read consent"  on consents;
create policy "own consent insert" on consents for insert
  with check (customer_id = auth.uid());
create policy "own consent read" on consents for select
  using (customer_id = auth.uid());
create policy "staff read consent" on consents for select
  using (role_at_least('location_manager'));

-- Favourites: owner only.
drop policy if exists "own favourites rw" on favourites;
create policy "own favourites rw" on favourites for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
