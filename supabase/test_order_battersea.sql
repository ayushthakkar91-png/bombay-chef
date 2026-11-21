-- Make a test order that the BATTERSEA printer will pick up.
--
-- Paste into the Supabase SQL Editor and run. Within about five seconds the
-- Battersea till should print a ticket, exactly as it would for a real
-- customer. Nothing here touches Stripe, so no money moves and no card is
-- charged.
--
-- This one is built to check the two recent changes:
--   * the customer's name now prints at DOUBLE HEIGHT, so the name below is a
--     long one — it should still fit on one line;
--   * a dish ordered with a size option prints its option underneath.
--
-- Every order made this way has a code starting TEST, so it is obvious on the
-- kitchen screen and easy to clear out afterwards (see the bottom of the file).
--
-- To print again, just run it again: each run makes a new order.

with loc as (
  select id from locations where slug = 'battersea'
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
    1945, 299, 0, 2244,
    null,
    jsonb_build_object(
      'line1', '27 Battersea Rise',
      'line2', 'Flat 2',
      'city', 'London',
      'postcode', 'SW11 1HG'
    ),
    'Jonathan Richardson',   -- long on purpose: checks the double-height name
    null,                    -- no email address: nobody gets a confirmation
    '07700 900456',
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
    ('Chicken Tikka Masala', 995, 1, '[]',                            null),
    ('Peas Rice (D)',        555, 1, '[{"name":"Large"}]',            null),
    ('Basmati Plain Rice',   335, 1, '[]',                            'extra hot on the side'),
    ('Garlic Naan',          350, 1, '[]',                            null)
  ) as i(name, unit, qty, modifiers, notes)
  returning 1
),
payment as (
  -- Recorded as cash so the ticket prints "COLLECT CASH". Change 'cash' to
  -- 'card' and the ticket says "PAID ONLINE" instead.
  insert into payments (order_id, provider, amount_pence, currency, method, status)
  select new_order.id, 'manual', 2244, 'gbp', 'cash', 'succeeded' from new_order
  returning 1
)
select code as "Battersea test order placed - watch the printer" from new_order;


-- ---------------------------------------------------------------------------
-- What the ticket should show
-- ---------------------------------------------------------------------------
--   BOMBAY BICYCLE CHEF BATTERSEA  at the top
--   DELIVERY #TESTxxxx
--   For: Jonathan Richardson       <- twice the height of the lines around it
--   Peas Rice (D) with "Large" underneath it
--   COLLECT CASH at the bottom
--
-- If the name is the same size as everything else, the till is still running
-- the old agent — run update.ps1 on it again.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Clearing up. Run this when you have finished testing, so the kitchen screen
-- and the sales figures are not carrying made-up orders.
--
--   delete from orders where code like 'TEST%';
--
-- (order_items and payments go with it — they cascade.)
-- ---------------------------------------------------------------------------
