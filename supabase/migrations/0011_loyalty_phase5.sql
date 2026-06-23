-- Bombay Bicycle Chef — 0011 loyalty (Phase 5): birthdays + personal vouchers
-- Builds on 0007 (loyalty_accounts, loyalty_ledger, rewards) + 0006 (promo_codes).
--
-- Integration design: redeeming points (or receiving a birthday reward) MINTS a
-- single-use promo_code bound to the customer. The existing Phase 3 promo field
-- redeems it at checkout — so the ordering flow needs no change. Points are
-- debited when the voucher is minted (an explicit account action), so an
-- abandoned checkout never loses points.

-- Birthday, for birthday rewards (set by the customer in preferences).
alter table customers add column if not exists birthday date;

-- Bind a promo_code to one customer (NULL = public/marketing promo). Personal
-- vouchers set customer_id + global_limit = 1.
alter table promo_codes add column if not exists customer_id uuid references customers(id) on delete cascade;
create index if not exists promo_codes_customer_idx on promo_codes(customer_id) where customer_id is not null;

-- Customers may read their OWN personal vouchers (to see codes in their account).
-- Checkout validation reads promo_codes via the service role, so this is only for
-- the account UI. Minting/usage stays server-side.
drop policy if exists "own promo vouchers read" on promo_codes;
create policy "own promo vouchers read" on promo_codes for select using (customer_id = auth.uid());
