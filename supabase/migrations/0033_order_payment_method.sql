-- ============================================================================
-- Record HOW an order is being paid for on the order itself
-- ============================================================================
-- Until now the only record of "cash or card" was the payments row, which is
-- written a moment AFTER the order is marked paid — two statements, not one
-- transaction. A till polling in that gap saw a paid order with no payment
-- attached, read it as card, and printed PAID ONLINE on a cash delivery.
-- Order 30811412 on 21 Nov 2026 went out that way: £22.65 uncollected.
--
--   17:29:39.602  status -> paid
--   17:29:39.780  payments row written      <- 178ms window
--   17:29:43.734  ticket printed
--
-- The customer chooses cash or card BEFORE the order row is even written, so
-- the fact is known from the start. Putting it on the order closes the window
-- entirely rather than narrowing it: there is no moment when an order exists
-- and its payment method does not.
--
-- The payments row stays as the record of money actually taken. This column is
-- the INTENT, which is what the kitchen ticket needs.
--
-- Safe to run twice. Safe to run while the site is live — the column is
-- nullable and nothing reads it until it is there.
-- ============================================================================

alter table orders
  add column if not exists payment_method text;

comment on column orders.payment_method is
  'How the customer chose to pay: cash | card | gift_card. Set when the order is created, so a ticket never has to guess. payments.method remains the record of money actually taken.';

-- Backfill from the payments already recorded, so historic orders and the
-- reports agree with the new column.
update orders o
   set payment_method = p.method
  from payments p
 where p.order_id = o.id
   and o.payment_method is null
   and p.method is not null;

-- Anything older with no payment row at all was a card order (cash only
-- arrived on 11 Nov 2026, and every cash order has a row).
update orders
   set payment_method = 'card'
 where payment_method is null
   and status not in ('pending_payment', 'cancelled');

-- ============================================================================
-- Check
-- ============================================================================
--   select payment_method, count(*) from orders group by 1 order by 2 desc;
--
-- Expect mostly 'card', a handful of 'cash', and nulls only on orders that
-- never got past pending_payment.
-- ============================================================================
