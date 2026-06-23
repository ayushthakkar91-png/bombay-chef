-- Bombay Bicycle Chef — 0006 ordering, payments, promos, gift cards
-- Builds on 0002–0004. All money is integer pence, server-authoritative. Card
-- data never lands here (PCI SAQ A): only Stripe ids + display-safe metadata.
-- An order is only ever marked paid by the Stripe webhook (service-role).

-- Promo codes -----------------------------------------------------------------
create table if not exists promo_codes (
  id                 uuid primary key default gen_random_uuid(),
  code               text unique not null,
  kind               text not null check (kind in ('percent','fixed','free_delivery')),
  value              int  not null default 0,        -- percent (0-100) or pence
  min_spend_pence    int  not null default 0,
  first_order_only   boolean not null default false,
  per_customer_limit int,                            -- null = unlimited
  global_limit       int,
  used_count         int  not null default 0,
  location_id        uuid references locations(id) on delete cascade, -- null = all
  starts_at          timestamptz,
  ends_at            timestamptz,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Gift cards ------------------------------------------------------------------
create table if not exists gift_cards (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  initial_pence  int  not null check (initial_pence > 0),
  balance_pence  int  not null check (balance_pence >= 0),
  purchaser_id   uuid references customers(id) on delete set null,
  status         text not null default 'active'
                   check (status in ('active','redeemed','void')),
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- Orders ----------------------------------------------------------------------
create table if not exists orders (
  id                     uuid primary key default gen_random_uuid(),
  code                   text unique not null
                           default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  location_id            uuid not null references locations(id) on delete restrict,
  customer_id            uuid references customers(id) on delete set null,  -- null = guest
  fulfilment             text not null check (fulfilment in ('collection','delivery')),
  status                 text not null default 'pending_payment'
                           check (status in ('pending_payment','confirmed','preparing',
                                             'ready','out_for_delivery','delivered',
                                             'collected','cancelled')),
  -- money (all pence, recomputed server-side and asserted before payment)
  subtotal_pence         int  not null check (subtotal_pence >= 0),
  discount_pence         int  not null default 0 check (discount_pence >= 0),
  delivery_fee_pence     int  not null default 0 check (delivery_fee_pence >= 0),
  tip_pence              int  not null default 0 check (tip_pence >= 0),
  loyalty_redeem_pence   int  not null default 0 check (loyalty_redeem_pence >= 0),
  gift_card_pence        int  not null default 0 check (gift_card_pence >= 0),
  total_pence            int  not null check (total_pence >= 0),
  -- applied discounts/credits
  promo_code             text,
  gift_card_id           uuid references gift_cards(id) on delete set null,
  loyalty_points_redeemed int not null default 0,
  -- fulfilment details
  delivery_address       jsonb,                       -- snapshot, not an FK
  prep_time_min          int,
  ready_at               timestamptz,
  scheduled_for          timestamptz,                 -- null = ASAP
  -- contact snapshot (guest orders stand alone)
  contact_name           text,
  contact_email          text,
  contact_phone          text,
  notes                  text,
  placed_at              timestamptz,                 -- set when payment confirmed
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists orders_loc_status_idx on orders(location_id, status);
create index if not exists orders_customer_idx     on orders(customer_id);
create index if not exists orders_created_idx      on orders(created_at);
drop trigger if exists orders_updated on orders;
create trigger orders_updated before update on orders
  for each row execute function set_updated_at();

-- Order line items (snapshotted so later menu edits never rewrite history) -----
create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  item_id          uuid references menu_items(id) on delete set null,
  name             text not null,
  unit_price_pence int  not null check (unit_price_pence >= 0),
  qty              int  not null check (qty > 0),
  modifiers        jsonb not null default '[]',       -- [{name, price_delta_pence}]
  line_total_pence int  not null check (line_total_pence >= 0),
  notes            text
);
create index if not exists order_items_order_idx on order_items(order_id);

-- Payments (Stripe ids only — never PAN/CVV) ----------------------------------
create table if not exists payments (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references orders(id) on delete cascade,
  provider               text not null default 'stripe',
  provider_payment_intent text unique,
  amount_pence           int  not null check (amount_pence >= 0),
  currency               text not null default 'gbp',
  method                 text,                         -- 'card','apple_pay','google_pay','paypal'
  card_brand             text,                         -- display only, from Stripe
  card_last4             text,                         -- display only, from Stripe
  status                 text not null default 'pending'
                           check (status in ('pending','succeeded','failed','refunded','partially_refunded')),
  created_at             timestamptz not null default now()
);
create index if not exists payments_order_idx on payments(order_id);

-- Refunds (full or partial) ---------------------------------------------------
create table if not exists refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references payments(id) on delete cascade,
  amount_pence       int  not null check (amount_pence > 0),
  reason             text,
  actor_id           uuid references profiles(id) on delete set null,
  provider_refund_id text unique,
  created_at         timestamptz not null default now()
);

-- Promo redemptions (enforces usage caps) -------------------------------------
create table if not exists promo_redemptions (
  id          uuid primary key default gen_random_uuid(),
  promo_id    uuid not null references promo_codes(id) on delete cascade,
  order_id    uuid not null references orders(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists promo_redemptions_promo_idx on promo_redemptions(promo_id);

-- Guard illegal order status transitions.
create or replace function orders_guard_status() returns trigger as $$
declare ok boolean;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    ok := case old.status
      when 'pending_payment' then new.status in ('confirmed','cancelled')
      when 'confirmed'       then new.status in ('preparing','cancelled')
      when 'preparing'       then new.status in ('ready','cancelled')
      when 'ready'           then new.status in ('out_for_delivery','collected','cancelled')
      when 'out_for_delivery' then new.status in ('delivered','cancelled')
      else false end;
    if not ok then
      raise exception 'illegal order transition % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists orders_status_guard on orders;
create trigger orders_status_guard before update on orders
  for each row execute function orders_guard_status();

-- Row Level Security ----------------------------------------------------------
alter table promo_codes        enable row level security;
alter table gift_cards         enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table payments           enable row level security;
alter table refunds            enable row level security;
alter table promo_redemptions  enable row level security;

-- Promo codes: managers manage; validity/redemption is checked server-side
-- (service-role) so the code list itself isn't publicly enumerable.
drop policy if exists "managers manage promos" on promo_codes;
create policy "managers manage promos" on promo_codes for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));

-- Gift cards: managers read/manage; balance checks are server-side.
drop policy if exists "managers manage gift_cards" on gift_cards;
create policy "managers manage gift_cards" on gift_cards for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));

-- Orders: a customer reads their own; staff at the location manage. Guest orders
-- are created and progressed server-side (service-role) via the webhook + KDS.
drop policy if exists "own orders read"   on orders;
drop policy if exists "staff manage orders" on orders;
create policy "own orders read" on orders for select using (customer_id = auth.uid());
create policy "staff manage orders" on orders for all
  using (role_at_least('staff', location_id)) with check (role_at_least('staff', location_id));

-- Order items / payments / refunds inherit access from their order.
drop policy if exists "read own order_items"  on order_items;
drop policy if exists "staff rw order_items"   on order_items;
create policy "read own order_items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "staff rw order_items" on order_items for all
  using (exists (select 1 from orders o where o.id = order_id and role_at_least('staff', o.location_id)))
  with check (exists (select 1 from orders o where o.id = order_id and role_at_least('staff', o.location_id)));

drop policy if exists "read own payments"  on payments;
drop policy if exists "staff read payments" on payments;
create policy "read own payments" on payments for select
  using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "staff read payments" on payments for select
  using (exists (select 1 from orders o where o.id = order_id and role_at_least('staff', o.location_id)));

drop policy if exists "managers read refunds" on refunds;
create policy "managers read refunds" on refunds for select
  using (exists (select 1 from payments p join orders o on o.id = p.order_id
                 where p.id = payment_id and role_at_least('location_manager', o.location_id)));

drop policy if exists "managers read promo_redemptions" on promo_redemptions;
create policy "managers read promo_redemptions" on promo_redemptions for select
  using (role_at_least('restaurant_manager'));
