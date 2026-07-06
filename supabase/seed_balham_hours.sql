-- Balham dinner service windows, matching the real opening hours in
-- src/data/locations.ts (Mon–Wed 17:30–23:00, Thu 17:30–22:30,
-- Fri–Sat 17:00–23:00, Sun 17:00–22:00).
--
-- Last bookable slot is ~90 min before close (2h table turn); adjust any row
-- later in Admin → Reservations → Tables & hours. Weekday: 0=Sun … 6=Sat.
-- Touches ONLY reservation_slots for Balham (tables and other branches are
-- left alone). Safe to re-run.

do $$
declare
  loc_id uuid;
begin
  select id into loc_id from locations where slug = 'balham';
  if loc_id is null then
    raise exception 'Balham location not found — run seed.sql first';
  end if;

  delete from reservation_slots where location_id = loc_id;

  insert into reservation_slots
    (location_id, weekday, service_start, service_end, slot_minutes, turn_minutes, max_covers, is_active)
  values
    -- weekday, first slot, last slot is one interval before service_end
    (loc_id, 1, '17:30', '22:00', 30, 120, 40, true),  -- Mon  17:30–21:30
    (loc_id, 2, '17:30', '22:00', 30, 120, 40, true),  -- Tue  17:30–21:30
    (loc_id, 3, '17:30', '22:00', 30, 120, 40, true),  -- Wed  17:30–21:30
    (loc_id, 4, '17:30', '21:30', 30, 120, 40, true),  -- Thu  17:30–21:00 (closes 22:30)
    (loc_id, 5, '17:00', '22:00', 30, 120, 40, true),  -- Fri  17:00–21:30
    (loc_id, 6, '17:00', '22:00', 30, 120, 40, true),  -- Sat  17:00–21:30
    (loc_id, 0, '17:00', '21:00', 30, 120, 40, true);  -- Sun  17:00–20:30 (closes 22:00)
end $$;

-- Verify:
-- select weekday, service_start, service_end, slot_minutes, max_covers
-- from reservation_slots rs join locations l on l.id = rs.location_id
-- where l.slug = 'balham' order by weekday;
