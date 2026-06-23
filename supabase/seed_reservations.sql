-- Bombay Bicycle Chef — reservation availability seed
-- Run AFTER 0005 + 0009 and after locations exist (seed.sql / admin). Safe to
-- re-run: it clears slots/tables for the three branches first. Sets a lunch and
-- a dinner service window per weekday, plus a starter set of physical tables.
--
-- Capacity model: `max_covers` is the per-service cover cap the availability
-- engine guards. Tune per branch in the admin Tables screen later.

do $$
declare
  loc record;
  wd  int;
  covers int;
begin
  for loc in select id, slug from locations where slug in ('balham','battersea','kilburn') loop
    covers := case loc.slug
      when 'battersea' then 60   -- flagship dining room
      when 'kilburn'   then 50
      else 40 end;               -- balham

    delete from reservation_slots where location_id = loc.id;
    delete from tables where location_id = loc.id;

    for wd in 0..6 loop
      -- Lunch
      insert into reservation_slots (location_id, weekday, service_start, service_end, slot_minutes, turn_minutes, max_covers)
      values (loc.id, wd, '12:00', '14:30', 30, 105, covers)
      on conflict (location_id, weekday, service_start) do nothing;
      -- Dinner
      insert into reservation_slots (location_id, weekday, service_start, service_end, slot_minutes, turn_minutes, max_covers)
      values (loc.id, wd, '17:30', '21:30', 30, 120, covers)
      on conflict (location_id, weekday, service_start) do nothing;
    end loop;

    -- A starter set of tables (capacities) for the Tables screen.
    insert into tables (location_id, name, seats, min_party, max_party, zone, sort_order) values
      (loc.id, 'T1', 2, 1, 2, 'window', 0),
      (loc.id, 'T2', 2, 1, 2, 'window', 1),
      (loc.id, 'T3', 4, 2, 4, 'main', 2),
      (loc.id, 'T4', 4, 2, 4, 'main', 3),
      (loc.id, 'T5', 6, 4, 6, 'main', 4),
      (loc.id, 'T6', 8, 6, 10, 'private', 5);
  end loop;
end $$;
