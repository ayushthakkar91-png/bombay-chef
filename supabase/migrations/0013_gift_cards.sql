-- Bombay Bicycle Chef — 0013 gift cards (Phase 8)
-- Builds on 0006 (gift_cards + orders.gift_card_id/gift_card_pence). Adds the
-- purchase/delivery fields, a 'pending' (awaiting payment) status, a view token
-- for the printable card, and a transaction ledger for partial-balance tracking.

alter table gift_cards drop constraint if exists gift_cards_status_check;
alter table gift_cards add constraint gift_cards_status_check
  check (status in ('pending', 'active', 'redeemed', 'void'));

alter table gift_cards add column if not exists recipient_name  text;
alter table gift_cards add column if not exists recipient_email text;
alter table gift_cards add column if not exists sender_name     text;
alter table gift_cards add column if not exists message         text;
alter table gift_cards add column if not exists deliver_at      timestamptz;  -- null = immediate
alter table gift_cards add column if not exists delivered_at    timestamptz;
alter table gift_cards add column if not exists payment_intent  text;
alter table gift_cards add column if not exists view_token      text unique
  default encode(gen_random_bytes(16), 'hex');

create index if not exists gift_cards_status_idx on gift_cards(status);

-- Ledger: every load/redeem/refund against a card (audit + reporting).
create table if not exists gift_card_transactions (
  id            uuid primary key default gen_random_uuid(),
  gift_card_id  uuid not null references gift_cards(id) on delete cascade,
  delta_pence   int  not null,   -- + purchase/refund-in, - redeem
  kind          text not null check (kind in ('purchase', 'redeem', 'refund', 'adjust', 'void')),
  order_id      uuid references orders(id) on delete set null,
  actor_id      uuid references profiles(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists gct_card_idx on gift_card_transactions(gift_card_id);
create index if not exists gct_order_idx on gift_card_transactions(order_id);

-- Row Level Security ----------------------------------------------------------
alter table gift_card_transactions enable row level security;

-- gift_cards: managers manage (0006); the purchaser may read their own cards.
-- Redemption + the public printable view run server-side (service client) by
-- code / view token — bearer instruments, no broad public read.
drop policy if exists "own purchased cards" on gift_cards;
create policy "own purchased cards" on gift_cards for select using (purchaser_id = auth.uid());

drop policy if exists "managers read gct" on gift_card_transactions;
create policy "managers read gct" on gift_card_transactions for select
  using (role_at_least('restaurant_manager'));
