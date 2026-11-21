-- ============================================================================
-- An order cannot exist without knowing how it is paid
-- ============================================================================
-- 0033 added orders.payment_method and the code writes it in the same insert
-- that creates the order. This makes the database refuse any order without
-- one, so there is no "unknown" for the kitchen ticket to handle — not as a
-- fallback, not as a safety net, not at all. If a future change forgot to
-- set it, the order would fail to be created and the bug would be found in
-- testing, not on a ticket.
--
-- Two values only. A gift-card order is paid online, which is all the
-- kitchen needs to know; the payments table keeps the detail.
--
-- Safe to run twice. Safe to run while the site is live: the only rows
-- without a method are abandoned baskets that never reached payment, and
-- they are marked card so the constraint can be applied.
-- ============================================================================

update orders
   set payment_method = 'card'
 where payment_method is null;

alter table orders
  alter column payment_method set not null;

alter table orders
  drop constraint if exists orders_payment_method_check;

alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('cash', 'card'));

-- ============================================================================
-- Check
-- ============================================================================
--   select payment_method, count(*) from orders group by 1;
--
-- Two rows, cash and card, nothing else. And this must FAIL:
--   insert into orders (location_id, code, fulfilment, status, total_pence)
--   select id, 'XXXX0000', 'collection', 'pending_payment', 0 from locations limit 1;
-- ============================================================================
