-- 0026_ordering_pause.sql — admin "pause online orders" switch.
-- When accepting_orders = false, the customer /order flow shows
-- ordering_pause_message instead of the menu/checkout (e.g. "No kitchen staff
-- right now — back at 6pm"). Per-location; defaults to accepting.
alter table locations add column if not exists accepting_orders       boolean not null default true;
alter table locations add column if not exists ordering_pause_message  text;
