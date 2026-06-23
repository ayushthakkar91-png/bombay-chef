-- Bombay Bicycle Chef — 0007 loyalty, rewards, referrals
-- Builds on 0003 (customers) + 0006 (orders). Points live in an append-only
-- ledger; the account balance is a maintained cache reconciled by a job.

-- Loyalty accounts ------------------------------------------------------------
create table if not exists loyalty_accounts (
  customer_id     uuid primary key references customers(id) on delete cascade,
  points_balance  int  not null default 0 check (points_balance >= 0),
  points_lifetime int  not null default 0,
  tier            text not null default 'bronze'
                    check (tier in ('bronze','silver','gold','vip')),
  updated_at      timestamptz not null default now()
);
drop trigger if exists loyalty_accounts_updated on loyalty_accounts;
create trigger loyalty_accounts_updated before update on loyalty_accounts
  for each row execute function set_updated_at();

-- Append-only ledger ----------------------------------------------------------
create table if not exists loyalty_ledger (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references customers(id) on delete cascade,
  delta       int  not null,                 -- + earn, - redeem/expire
  reason      text not null
                check (reason in ('earn','redeem','birthday','anniversary',
                                  'referral','adjustment','expire','refund_reversal')),
  order_id    uuid references orders(id) on delete set null,
  note        text,
  expires_at  timestamptz,                    -- points expiry (optional)
  actor_id    uuid references profiles(id) on delete set null,  -- set for manual adjust
  created_at  timestamptz not null default now()
);
create index if not exists loyalty_ledger_customer_idx on loyalty_ledger(customer_id, created_at);

-- Keep the cached balance in step with the ledger.
create or replace function loyalty_apply_ledger() returns trigger as $$
begin
  insert into loyalty_accounts (customer_id, points_balance, points_lifetime)
  values (new.customer_id,
          greatest(new.delta, 0) - greatest(-new.delta, 0),
          greatest(new.delta, 0))
  on conflict (customer_id) do update set
    points_balance  = loyalty_accounts.points_balance + new.delta,
    points_lifetime = loyalty_accounts.points_lifetime + greatest(new.delta, 0),
    updated_at = now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists loyalty_ledger_apply on loyalty_ledger;
create trigger loyalty_ledger_apply after insert on loyalty_ledger
  for each row execute function loyalty_apply_ledger();

-- Rewards catalogue -----------------------------------------------------------
create table if not exists rewards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         text not null check (kind in ('amount_off','free_item','free_delivery')),
  points_cost  int  not null check (points_cost > 0),
  value_pence  int,                            -- for amount_off
  item_id      uuid references menu_items(id) on delete set null, -- for free_item
  min_tier     text not null default 'bronze'
                 check (min_tier in ('bronze','silver','gold','vip')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Referrals -------------------------------------------------------------------
create table if not exists referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references customers(id) on delete cascade,
  referee_id    uuid references customers(id) on delete set null,
  code          text unique not null,
  status        text not null default 'pending'
                  check (status in ('pending','qualified','rewarded','void')),
  qualifying_order_id uuid references orders(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on referrals(referrer_id);

-- Row Level Security ----------------------------------------------------------
alter table loyalty_accounts enable row level security;
alter table loyalty_ledger   enable row level security;
alter table rewards          enable row level security;
alter table referrals        enable row level security;

-- Customers read their own loyalty; managers read for support. Mutations to the
-- ledger happen server-side (earn on order, manual adjust) via service-role.
drop policy if exists "own loyalty read"   on loyalty_accounts;
drop policy if exists "staff read loyalty"  on loyalty_accounts;
create policy "own loyalty read" on loyalty_accounts for select using (customer_id = auth.uid());
create policy "staff read loyalty" on loyalty_accounts for select
  using (role_at_least('location_manager'));

drop policy if exists "own ledger read"   on loyalty_ledger;
drop policy if exists "staff read ledger"  on loyalty_ledger;
create policy "own ledger read" on loyalty_ledger for select using (customer_id = auth.uid());
create policy "staff read ledger" on loyalty_ledger for select
  using (role_at_least('location_manager'));

-- Rewards: public reads the active catalogue; managers manage it.
drop policy if exists "public read rewards"   on rewards;
drop policy if exists "managers manage rewards" on rewards;
create policy "public read rewards" on rewards for select using (is_active);
create policy "managers manage rewards" on rewards for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));

-- Referrals: owner reads their own.
drop policy if exists "own referrals read" on referrals;
create policy "own referrals read" on referrals for select using (referrer_id = auth.uid());
