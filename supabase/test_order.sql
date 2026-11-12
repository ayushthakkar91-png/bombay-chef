-- Make a test order that the kitchen printer will pick up.
--
-- Paste into the Supabase SQL Editor and run. Within about five seconds the
-- till should print a ticket, exactly as it would for a real customer — same
-- rows, same code path, no shortcuts. Nothing here touches Stripe, so no money
-- moves and no card is charged.
--
-- Every order made this way has a code starting TEST, so it is obvious on the
-- kitchen screen and easy to clear out afterwards (see the bottom of the file).
--
-- To print again, just run it again: each run makes a new order.

with loc as (
  select id from locations where slug = 'balham'
),
new_order as (
  insert into orders (
    location_id, code, fulfilment, status,
    subtotal_pence, delivery_fee_pence, discount_pence, total_pence,
    promo_code, delivery_address,
    contact_name, contact_email, contact_phone, notes,
    placed_at, printed_at
  )
  select
    loc.id,
    'TEST' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4)),
    'delivery',          -- change to 'collection' to test the other ticket
    'paid',              -- what the kitchen sees for a real paid order
    1840, 199, 0, 2039,
    null,
    jsonb_build_object(
      'line1', '14 Balham High Road',
      'line2', '',
      'city', 'London',
      'postcode', 'SW12 9AJ'
    ),
    'TEST - please ignore',
    null,                -- no email address: nobody gets a confirmation
    '07700 900123',
    'TEST ORDER - not a real customer',
    now(),
    null                 -- not printed yet; this is what the agent looks for
  from loc
  returning id, code
),
items as (
  insert into order_items (order_id, name, unit_price_pence, qty, modifiers, line_total_pence, notes)
  select new_order.id, i.name, i.unit, i.qty, i.modifiers::jsonb, i.unit * i.qty, i.notes
  from new_order,
  (values
    ('Chicken Tikka Masala', 895, 1, '[{"name":"Extra hot"}]', null),
    ('Lamb Biryani',         845, 1, '[]',                     'no onions please'),
    ('Garlic Naan',          350, 2, '[]',                     null)
  ) as i(name, unit, qty, modifiers, notes)
  returning 1
),
payment as (
  -- Recorded as cash so the ticket prints "COLLECT CASH". Change 'cash' to
  -- 'card' and the ticket says "PAID ONLINE" instead.
  insert into payments (order_id, provider, amount_pence, currency, method, status)
  select new_order.id, 'manual', 2039, 'gbp', 'cash', 'succeeded' from new_order
  returning 1
)
select code as "Test order placed - watch the printer" from new_order;


-- ---------------------------------------------------------------------------
-- Clearing up. Run this when you have finished testing, so the kitchen screen
-- and the sales figures are not carrying made-up orders.
--
--   delete from orders where code like 'TEST%';
--
-- (order_items and payments go with it — they cascade.)
-- ---------------------------------------------------------------------------
