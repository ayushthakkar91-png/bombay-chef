-- Bombay Bicycle Chef — loyalty rewards catalogue seed (Phase 5)
-- Run after 0007 + 0011. Idempotent (keyed by reward name). These are the
-- point-redemption options shown in a customer's account. Earn rate is £1 = 1
-- point (100 pence = 1 point); redemption: 100 points = £1 of value.

insert into rewards (name, kind, points_cost, value_pence, min_tier, is_active)
select v.name, v.kind, v.points_cost, v.value_pence, v.min_tier, true
from (values
  ('£5 off your order',  'amount_off',    500,  500::int,  'bronze'),
  ('£10 off your order', 'amount_off',    1000, 1000::int, 'bronze'),
  ('Free delivery',      'free_delivery', 200,  null::int, 'bronze')
) as v(name, kind, points_cost, value_pence, min_tier)
where not exists (select 1 from rewards r where r.name = v.name);
