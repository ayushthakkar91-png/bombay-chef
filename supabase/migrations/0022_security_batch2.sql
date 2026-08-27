-- Bombay Bicycle Chef — 0022 security batch 2 (F4, F5, F7-adjacent, F8).
-- Stacks on 0021. Append-only. NOT applied automatically — run on staging first,
-- run `supabase test db`, then apply to production with explicit approval.
--
-- Contents (appended by plan tasks):
--   F8  loyalty double-earn        — unique index on loyalty_ledger(order_id, reason)
--   F5  atomic promo single-use    — reserve_promo / release_promo RPCs + sync trigger

-- ============================================================================
-- F8: prevent loyalty double-earn / double-reversal on webhook retries.
-- NULL order_id rows (redeem/adjustment/birthday) stay unconstrained because
-- NULLs are distinct in a unique index — only order-linked rows are capped.
-- ============================================================================
create unique index if not exists loyalty_ledger_order_reason_uidx
  on loyalty_ledger (order_id, reason)
  where order_id is not null;
