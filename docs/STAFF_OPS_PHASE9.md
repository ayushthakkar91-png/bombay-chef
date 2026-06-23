# Phase 9 — Staff & Operations Management

Internal restaurant tools on the existing role system (`profiles` + `staff_roles`,
0002) plus new shift/leave tables. Read-only dashboards over existing orders +
reservations — **no ordering, reservation, loyalty, CRM, analytics, gift-card, or
public-site changes**. No env var or flag.

---

## 1. Files created

- `supabase/migrations/0014_staff_operations.sql` — `shifts`, `leave_requests` + RLS.
- `src/lib/staff/constants.ts`, helpers in `src/lib/auth/roles.ts` (`rankAt`, `canGrantRole`).
- `src/lib/repositories/staff.ts` — staff directory, shifts, leave, ops summary.
- Actions: `src/app/admin/_actions/{staff,shifts,leave}.ts`.
- Pages: `src/app/admin/(panel)/{staff,staff/shifts,staff/leave,operations,kitchen}/page.tsx`.
- Components: `src/components/admin/staff/{StaffManager,ShiftScheduler,LeaveManager,TeamLeave}.tsx`,
  `src/components/admin/operations/KitchenBoard.tsx`.

## 2. Files updated

- `src/components/admin/AdminShell.tsx` — Operations + Team nav groups. README.

## 3. Features → where

| Feature | Surface |
|---|---|
| Staff accounts | `/admin/staff` — create (or promote an existing user) + assign role/location |
| Role management | `/admin/staff` — grant/revoke roles per location; deactivate (remove all access) |
| Shift scheduling | `/admin/staff/shifts` — weekly grid per location; managers add/edit/delete |
| Leave requests | `/admin/staff/leave` — staff submit + track own; managers approve/reject |
| Kitchen dashboard / live board | `/admin/kitchen` — mobile-first, auto-refresh, tap to advance status |
| Reservation ops | surfaced in `/admin/operations` + links to the existing bookings view |
| Daily operations | `/admin/operations` — today's orders/revenue/covers/on-shift/pending leave |
| Location-based permissions | every table carries `location_id`; RLS scopes by `role_at_least(role, location)` |

## 4. Roles & permissions

Reuses the four roles (super_admin > restaurant_manager > location_manager > staff).
- **Staff**: see the schedule + kitchen for their location, submit/track own leave.
- **Location manager**: + manage shifts, approve leave, view ops, and add `staff`/
  `location_manager` at their location.
- **Restaurant manager / super admin**: org-wide — manage all staff/roles, deactivate.

A new guard (`canGrantRole`) enforces you can only assign a role **at or below your
own rank** and only where you're a manager; you can't deactivate someone who
outranks you, or remove your own super-admin role. All staff/role/leave changes
write to `audit_log`.

## 5. Real-time

The kitchen + live boards refresh on a 12s interval (`router.refresh()`) — the same
polling approach as the Phase 3 KDS (the codebase doesn't use Supabase Realtime
subscriptions). Mobile-first cards with large tap targets.

## 6. Data & RLS

`shifts` (staff read at their location; managers manage), `leave_requests` (members
read/insert own; managers manage at the location). Staff directory + ops summary use
the service client, gated by `requireRole` at the page. Deactivation = removing all
`staff_roles` rows (revokes admin access; the DAL then returns no staff context).

## 7. Testing checklist

- [ ] A manager adds a staff account → the new user can sign in at `/admin` and sees Schedule/Kitchen/Leave.
- [ ] Grant/revoke roles per location; a location manager can't grant a role above their own or for another location (action rejects).
- [ ] Deactivate removes all access; you can't deactivate yourself or someone who outranks you.
- [ ] Managers add/edit/delete shifts on the weekly grid; staff see the schedule read-only (incl. overnight shifts).
- [ ] Staff submit leave + cancel a pending one; managers approve/reject (writes `audit_log`).
- [ ] `/admin/kitchen` shows live orders, advances status on tap, and auto-refreshes; works on a phone screen.
- [ ] `/admin/operations` KPIs (orders/revenue/covers/on-shift/pending leave) + "on shift today" are correct per location.
- [ ] A `staff`-role user can't reach `/admin/staff`, `/admin/operations` (manager-gated) but can reach kitchen/schedule/leave.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 8. Notes / deferred
- New staff are created with a manager-set temporary password (works without email
  config); Supabase invite-by-email is a drop-in alternative if SMTP is configured.
- Real-time is interval polling (consistent with the KDS); Supabase Realtime
  subscriptions are a future upgrade.
- Shift conflict/overlap warnings and hours/cost rollups are not built (kept simple).
- Inventory is intentionally **not** built (per scope).
