# Supabase setup (Phase 2 — connect the live database)

Until this is done, the site runs fine on the bundled seed data (`src/data/menu.ts`).
Connecting Supabase makes the menu (and later locations, orders, customers)
editable without code.

## 1. Create the project
1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Project Settings → API. Copy the **Project URL**, the **anon public** key, and
   the **service_role** key.

## 2. Add the env vars
Create `.env.local` (copy from `.env.example`) and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Add the same three to the Vercel project (Settings → Environment Variables) for
production.

## 3. Create the schema
In the Supabase dashboard → SQL Editor, run the migrations **in order**:

1. [`0001_init.sql`](./migrations/0001_init.sql) — menu, locations (Phase 2).
2. [`0002_auth_and_rbac.sql`](./migrations/0002_auth_and_rbac.sql) — profiles, staff roles, audit, RLS helpers.
3. [`0003_customers.sql`](./migrations/0003_customers.sql) — customers, addresses, consent log.
4. [`0004_menu_extensions.sql`](./migrations/0004_menu_extensions.sql) — `price_pence`, modifiers, allergens.
5. [`0005_reservations.sql`](./migrations/0005_reservations.sql) — tables, slots, reservations, waitlist.
6. [`0006_ordering_payments.sql`](./migrations/0006_ordering_payments.sql) — orders, payments, promos, gift cards.
7. [`0007_loyalty.sql`](./migrations/0007_loyalty.sql) — points ledger, rewards, referrals.
8. [`0008_crm_marketing.sql`](./migrations/0008_crm_marketing.sql) — segments, campaigns, outbox, GDPR requests.
9. [`0009_reservation_blocks.sql`](./migrations/0009_reservation_blocks.sql) — block/closure overrides + `reservations.experience`.

Only `0001` is needed for the menu to go live; `0002`+ land with the management
platform (see [`../docs/SYSTEM_ARCHITECTURE.md`](../docs/SYSTEM_ARCHITECTURE.md)).

**Reservations (Phase 2):** after `0001`–`0009`, run
[`seed_reservations.sql`](./seed_reservations.sql) to create lunch/dinner service
windows and starter tables for each branch. See
[`../docs/RESERVATIONS_PHASE2.md`](../docs/RESERVATIONS_PHASE2.md).

**Ordering (Phase 3):** run
[`0010_ordering_config.sql`](./migrations/0010_ordering_config.sql), then
[`seed_ordering.sql`](./seed_ordering.sql) (backfills `price_pence` + delivery
zones). Set the Stripe env vars and `NEXT_PUBLIC_FEATURE_ORDERING=true`, and add a
Stripe webhook for `checkout.session.completed` → `/api/webhooks/stripe`. See
[`../docs/ORDERING_PHASE3.md`](../docs/ORDERING_PHASE3.md).

**Customer accounts (Phase 4):** no new migration — reuses the `0003` schema
(`customers`, `addresses`, `consents`, `favourites`) + `data_requests` (`0008`).
In Supabase → Authentication → Providers, enable Email. The "Confirm email"
setting affects sign-up UX: ON = users confirm via email before first login
(the form tells them); OFF = instant sign-in. See
[`../docs/ACCOUNTS_PHASE4.md`](../docs/ACCOUNTS_PHASE4.md).

**Loyalty (Phase 5):** run
[`0011_loyalty_phase5.sql`](./migrations/0011_loyalty_phase5.sql) (builds on the
0007 loyalty tables), then [`seed_loyalty.sql`](./seed_loyalty.sql) (rewards
catalogue). Set `NEXT_PUBLIC_FEATURE_LOYALTY=true` and schedule
`GET /api/cron/loyalty?secret=…` once a day for birthday rewards. See
[`../docs/LOYALTY_PHASE5.md`](../docs/LOYALTY_PHASE5.md).

**CRM & marketing (Phase 6):** run
[`0012_crm_marketing.sql`](./migrations/0012_crm_marketing.sql) (builds on the
0008 CRM tables). Set `NEXT_PUBLIC_FEATURE_MARKETING=true` and schedule
`GET /api/cron/marketing?secret=…` a few times a day (segments + abandoned cart).
Sends via the existing Brevo/`EMAIL_*` config (console fallback). See
[`../docs/CRM_MARKETING_PHASE6.md`](../docs/CRM_MARKETING_PHASE6.md).

**Reporting (Phase 7):** no migration, env var or flag — read-only dashboards over
existing data at `/admin/reports` (restaurant_manager). See
[`../docs/REPORTING_PHASE7.md`](../docs/REPORTING_PHASE7.md).

**Gift cards (Phase 8):** run
[`0013_gift_cards.sql`](./migrations/0013_gift_cards.sql) (builds on the 0006
gift_cards table). Reuses the existing Stripe + `EMAIL_*` config; schedule
`GET /api/cron/giftcards?secret=…` a few times a day for scheduled deliveries.
No new flag. See [`../docs/GIFT_CARDS_PHASE8.md`](../docs/GIFT_CARDS_PHASE8.md).

**Staff & operations (Phase 9):** run
[`0014_staff_operations.sql`](./migrations/0014_staff_operations.sql) (shifts +
leave; staff/roles reuse `staff_roles` from 0002). No env var or flag — internal
tools at `/admin/staff`, `/admin/operations`, `/admin/kitchen`. See
[`../docs/STAFF_OPS_PHASE9.md`](../docs/STAFF_OPS_PHASE9.md).

**Inventory & suppliers (Phase 10):** run
[`0015_inventory.sql`](./migrations/0015_inventory.sql) (inventory, stock, movements,
suppliers + catalogue, purchase orders, waste, recipes). No env var or flag — tools
at `/admin/inventory/*`. Location-scoped via `role_at_least`; catalogue is org-level
(any staff read, managers manage). See
[`../docs/INVENTORY_PHASE10.md`](../docs/INVENTORY_PHASE10.md).

**SMS & WhatsApp (Phase 11):** run
[`0016_messaging.sql`](./migrations/0016_messaging.sql) (consent, templates, queue,
campaigns; seeds default templates). Set `TWILIO_*` / `WHATSAPP_CLOUD_*` (else
console mode) and schedule `GET /api/cron/messaging?secret=…` every ~15 min; point
Twilio status + inbound webhooks at `/api/webhooks/twilio`. Consent-gated; observes
orders/reservations/rewards without modifying them. Tools at `/admin/messaging/*`.
See [`../docs/MESSAGING_PHASE11.md`](../docs/MESSAGING_PHASE11.md).

## 4. Seed the menu
In the SQL Editor, paste and run [`seed.sql`](./seed.sql). It loads the current
menu into the tables (safe to re-run). After that, edit the menu from the
Supabase **Table Editor** and the live site updates within ~60s.

## How it fits together
- `src/lib/supabase/server.ts` — public read-only client (returns `null` when env
  is absent → seed fallback).
- `src/lib/repositories/menu.ts` — `getMenu()`: Supabase when connected, else seed,
  with error fallback so the menu never renders empty.
- Row Level Security: anon can **read**; writes require the service role key.
