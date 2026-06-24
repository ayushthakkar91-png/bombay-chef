-- Grant admin access (Phase 1)
-- ---------------------------------------------------------------------------
-- Admin sign-in uses Supabase Auth. A login only counts as "admin" if the user
-- has a row in `staff_roles` (migration 0002). Run this AFTER 0002 is applied
-- and after the user exists in Authentication → Users.
--
-- 1. Create the user: Supabase dashboard → Authentication → Users → "Add user"
--    (set a password and tick "Auto Confirm"). A `profiles` row is created
--    automatically by the on-signup trigger from 0002.
-- 2. Replace the email below and run this in the SQL Editor.

-- ── Super admin (org-wide, every location) ─────────────────────────────────
insert into staff_roles (profile_id, location_id, role)
select id, null, 'super_admin'
from auth.users
where email = 'you@bombay-bicycle-chef.com'
on conflict (profile_id, location_id, role) do nothing;

-- ── Other role examples ────────────────────────────────────────────────────
-- Org-wide restaurant manager (menu, marketing, loyalty across all branches):
-- insert into staff_roles (profile_id, location_id, role)
-- select id, null, 'restaurant_manager' from auth.users where email = '…'
-- on conflict do nothing;
--
-- Location manager / staff scoped to ONE branch (only that branch's data):
-- insert into staff_roles (profile_id, location_id, role)
-- select u.id, l.id, 'location_manager'
-- from auth.users u, locations l
-- where u.email = '…' and l.slug = 'balham'
-- on conflict do nothing;

-- Verify:
-- select p.full_name, u.email, sr.role, l.name as location
-- from staff_roles sr
-- join auth.users u on u.id = sr.profile_id
-- left join profiles p on p.id = sr.profile_id
-- left join locations l on l.id = sr.location_id
-- order by sr.role;
