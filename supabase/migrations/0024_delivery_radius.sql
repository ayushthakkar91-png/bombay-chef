-- Bombay Bicycle Chef — 0024 delivery radius + free-delivery threshold
-- Stacks on 0023. Append-only. NOT applied automatically — staging first.
--
-- Adds geo + radius delivery (distance from the branch) alongside the existing
-- outcode zones (radius is used when the branch has coordinates + a radius; the
-- outcode zones remain the fallback). Delivery fee gains a free-over threshold.

alter table locations add column if not exists latitude             double precision;
alter table locations add column if not exists longitude            double precision;
alter table locations add column if not exists delivery_radius_miles double precision;
-- Order subtotal (pence) at/above which delivery is free. NULL = never free.
alter table locations add column if not exists free_delivery_over_pence int
  check (free_delivery_over_pence is null or free_delivery_over_pence >= 0);
