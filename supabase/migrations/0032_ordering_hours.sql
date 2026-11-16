-- ============================================================================
-- 0032 — when each branch takes online orders
-- ============================================================================
-- Until now the only control was locations.accepting_orders, a manual switch
-- somebody had to remember to flip. So the site took orders at four in the
-- morning and nobody found out until the kitchen opened.
--
-- Hours are kept per branch, per weekday, AND per fulfilment: the counter can
-- hand food over later than a driver can be sent out and still get back.
--
-- Times are London wall-clock. Stored as `time` with no zone on purpose —
-- "we close at 22:30" means half past ten in Balham, which is a different
-- instant in June and December. src/lib/ordering/hours.ts does the conversion.
--
-- Safe to run twice.
-- ============================================================================

create table if not exists location_ordering_hours (
  location_id uuid not null references locations(id) on delete cascade,
  -- 0 = Sunday … 6 = Saturday, matching Postgres extract(dow) and JS getDay().
  weekday     int  not null check (weekday between 0 and 6),
  fulfilment  text not null check (fulfilment in ('collection','delivery')),
  opens_at    time not null,
  closes_at   time not null,
  -- A day this branch takes no online orders of this kind at all.
  is_open     boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (location_id, weekday, fulfilment),
  -- We do not trade past midnight; a close before an open is a typo, and one
  -- that would silently shut ordering for the day.
  constraint ordering_hours_sane check (closes_at > opens_at)
);

create index if not exists ordering_hours_loc_idx on location_ordering_hours(location_id);

alter table location_ordering_hours enable row level security;

-- The menu has to show its hours to a logged-out visitor.
drop policy if exists "public read ordering hours" on location_ordering_hours;
create policy "public read ordering hours" on location_ordering_hours
  for select using (true);

-- Writes go through the service role (admin actions), as with the rest of the
-- location settings.

-- ---------------------------------------------------------------------------
-- The hours as they stand, for every active branch
--   collection  17:30 – 22:45
--   delivery    17:30 – 22:30
--   Monday both start at 18:00, because the shop itself opens later.
-- Change them in admin → Locations → Ordering hours; this only seeds them.
-- ---------------------------------------------------------------------------
insert into location_ordering_hours (location_id, weekday, fulfilment, opens_at, closes_at, is_open)
select l.id, d.weekday, f.fulfilment,
       case when d.weekday = 1 then time '18:00' else time '17:30' end,
       case when f.fulfilment = 'collection' then time '22:45' else time '22:30' end,
       true
  from locations l
  cross join (select generate_series(0, 6) as weekday) d
  cross join (select unnest(array['collection','delivery']) as fulfilment) f
 where l.is_active
on conflict (location_id, weekday, fulfilment) do nothing;

-- Check:
--   select l.slug, h.fulfilment, h.weekday, h.opens_at, h.closes_at, h.is_open
--     from location_ordering_hours h
--     join locations l on l.id = h.location_id
--    order by l.slug, h.fulfilment, h.weekday;
