# Phase 2 — Reservation system

A complete, production-ready reservation system on the existing Next.js 16 +
Supabase stack. The public marketing site and the Phase 1 admin are unchanged;
the existing 6-step booking flow is now wired to a real backend, and a full
admin reservation suite is added.

> Not in this phase: ordering, loyalty, CRM, marketing.

---

## 1. Files created

**Schema** — `supabase/migrations/0009_reservation_blocks.sql` (blocks/closures +
`reservations.experience`), `supabase/seed_reservations.sql` (service windows + tables).

**Domain (`src/lib/reservations/`)** — `constants.ts` (experiences, occasions,
statuses, transitions), `time.ts` (London-TZ helpers, DST-correct), `availability.ts`
(capacity engine), `format.ts` (reference, manage URL, email payload).

**Email / notifications** — `src/lib/email/provider.ts` (Brevo + console adapter),
`src/lib/email/templates.ts` (6 transactional templates), `src/lib/notifications/outbox.ts`
(enqueue, dispatch with retry, reminder scheduler).

**Repository** — `src/lib/repositories/reservations.ts` (admin reads, token read,
waitlist, tables/slots/blocks). **Auth** — `src/lib/auth/scope.ts` (location scoping).

**Customer actions** — `src/app/reservations/actions.ts` (submit, waitlist),
`src/app/reservations/manage/actions.ts` (modify, cancel).

**API** — `src/app/api/reservations/availability/route.ts`,
`src/app/api/cron/reservations/route.ts`.

**Admin actions** — `src/app/admin/_actions/reservations.ts` (status, move,
waitlist convert/remove, blocks), `src/app/admin/_actions/tables.ts` (tables, slots).

**Admin pages** — `src/app/admin/(panel)/reservations/{page,calendar/page,waitlist/page,tables/page}.tsx`.

**Customer page** — `src/app/reservations/manage/[token]/page.tsx`.

**Components** — `src/components/reservations/ManageReservation.tsx`;
`src/components/admin/reservations/` (LocationSwitcher, DateNav, BookingsTable,
WaitlistManager, TablesManager, ServiceWindows, BlocksManager).

## 2. Files updated

- `src/components/reservations/flow/{types,ReservationFlow,StepDateTime,StepDetails,StepConfirm}.tsx`
  — wired the existing flow to the backend; **design preserved**. (Added the
  Occasion field, live availability, waitlist offer, real submission + success.)
- `src/components/admin/AdminShell.tsx` — Reservations nav group; exact-match active state.
- `.env.example`, `supabase/README.md`.

## 3. Database usage

`reservations` (create/read/update/status), `waitlist_entries`, `reservation_slots`
(service windows + `max_covers`), `reservation_blocks` (blocks/closures), `tables`
(capacities), `reservation_status_history` (auto via 0005 trigger), `notifications`
(email outbox), `locations` (read). RLS: guest create/read/modify run server-side
via the **service client** (manage token = bearer capability); admin reads/writes use
the **session client** under the staff RLS policies.

## 4. API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/reservations/availability` | GET | public | Open times for location+date+experience (aggregate only). |
| `/api/cron/reservations` | GET | `CRON_SECRET` | Schedule 24h reminders + dispatch the email outbox. Point a scheduler here. |

Mutations are React **Server Actions**, not REST endpoints (submit/modify/cancel/
waitlist; admin status/move/convert/block/table/slot).

## 5. Components & customer flow

Flow steps (unchanged design): Location → Experience → Date+Time → Party → Details
(now incl. Occasion) → Confirm. `StepDateTime` fetches live availability; a fully
booked date offers the **waitlist**. `StepConfirm` calls `submitReservation`
(or `joinWaitlist`), shows a reference + manage link, and gracefully falls back to
waitlist if the slot is taken in a race. Guests manage at `/reservations/manage/<token>`.

## 6. Reservation state flow

```
            create ─▶ confirmed ─▶ seated ─▶ completed
   (full) │              │  │
          ▼              │  └▶ (modify: re-check capacity, exclude self)
       waitlist ─(admin convert)─▶ confirmed
   confirmed ─▶ cancelled        confirmed ─▶ no_show
```
Transitions are enforced twice: the DB trigger (0005) and `STATUS_TRANSITIONS`
in the UI/actions. Availability = per-service `max_covers` minus covers of
overlapping reservations, minus blocks, with a 60-min lead and 90-day horizon.

## 7. Email workflow

Outbox pattern: an event enqueues a `notifications` row → the cron route renders
the template and sends via the provider (Brevo, or console in dev), with claim +
retry + backoff. Templates: confirmation, reminder (24h, scheduled by cron),
modification, cancellation, waitlist-joined, and an admin new-booking alert.
Marketing consent is not involved — these are transactional.

## 8. Admin workflow

- **Bookings** (`/admin/reservations`) — day view per location: covers/bookings
  summary, search (name/email/phone), inline status changes, move/modify modal.
- **Calendar** (`/admin/reservations/calendar`) — week & month grids with per-day
  counts; click a day → day view.
- **Waitlist** (`/admin/reservations/waitlist`) — offer a table (creates a confirmed
  booking + confirmation email) or remove.
- **Tables & hours** (`/admin/reservations/tables`) — table capacities, per-service
  `max_covers`, and blocks/closures.

Location switcher is scoped to the staff member's RLS-granted locations.

## 9. Setup

1. Run migrations `0001`–`0009`, then `supabase/seed_reservations.sql`.
2. Set Phase 2 env (`.env.example`): `NEXT_PUBLIC_SITE_URL`, email vars
   (optional — logs to console if unset), `CRON_SECRET`.
3. Point a scheduler (Vercel Cron / Supabase) at `/api/cron/reservations?secret=…`
   every few minutes for reminders + delivery.

## 10. Testing checklist

**Customer**
- [ ] Full flow books a table; confirmation screen shows a reference + manage link.
- [ ] Times reflect real availability; past dates/times are not selectable.
- [ ] A fully booked date (block the day in admin) offers the waitlist; joining works.
- [ ] Occasion is captured and shown on confirm + admin.
- [ ] Manage link loads; modify re-checks availability; cancel works; cancelled booking is read-only.
- [ ] With email configured, confirmation arrives; with it unset, it logs to the server console.

**Admin**
- [ ] Day view lists the day's bookings with covers; search finds by name/email/phone.
- [ ] Status transitions obey the state machine; illegal ones are blocked.
- [ ] Move/modify updates time/party/requests and emails the guest.
- [ ] Calendar week/month counts match; clicking a day opens it.
- [ ] Waitlist "offer a table" creates a confirmed booking + email; remove works.
- [ ] Tables CRUD; editing a service window's covers changes availability; a block/closure removes those times.
- [ ] A location-scoped manager only sees/acts on their branch.

**System** — `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## Notes / deferred
- Capacity is cover-based (per-service `max_covers`); table-level auto-assignment
  is modelled (`tables`, `reservation_tables`) but assignment is left manual.
- SMS reminders are designed (outbox `channel`) but only email is wired in Phase 2.
- Customer accounts (saved bookings without a token) arrive with Phase 5; Phase 2
  reservations are guest + manage-token based.
