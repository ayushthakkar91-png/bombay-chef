# Bombay Bicycle Chef — Restaurant Operating System

**Architecture & build blueprint for the management platform behind the public site.**

This document is the single source of truth for the back-of-house system: ordering, reservations,
customer accounts, loyalty, CRM/email, admin + staff panels, payments, reporting, and compliance.

> **Scope boundary — read first.** The public marketing site (homepage, chapters, storytelling,
> typography, colour, motion, navigation, branding) is **complete and frozen**. Nothing in this
> plan modifies it. The platform is built *alongside* it under new routes (`/order`, `/account`,
> `/admin`, `/api/*`) and new database tables, reusing the existing Supabase connection, repository
> pattern, feature flags, and design tokens. The reservation flow already scaffolded under
> `src/components/reservations/` is wired to a real backend by this plan, not redesigned.

---

## 0. Where we are starting from (the existing rails)

The repository already commits to a stack and a set of patterns. **The platform extends these; it does
not introduce a parallel architecture.**

| Concern | Already decided in the repo | Evidence |
|---|---|---|
| Framework | Next.js **16.2.9**, React **19.2** (App Router, Server Components) | `package.json` |
| Database | **Supabase** (Postgres) with Row Level Security | `supabase/migrations/0001_init.sql` |
| DB access | Repository pattern, server-only clients, graceful seed fallback | `src/lib/repositories/menu.ts`, `src/lib/supabase/server.ts` |
| Auth client | `@supabase/ssr` (cookie-based sessions) | `package.json` dependency |
| Roll-out | Phased, behind **feature flags**; ships OFF until ready | `src/lib/flags.ts` (`flags.ordering`) |
| Money | Display price now; **`price_pence` integer for checkout math** planned | comment in `0001_init.sql` |
| Writes | anon = read-only via RLS; privileged writes via **service-role**; admin policies "in a later phase" | `0001_init.sql` RLS block |
| Motion | GSAP, Framer Motion, Lenis | `package.json` |

> **Next.js 16 caveat (from `AGENTS.md`).** This is a modified Next.js — APIs and conventions may
> differ from training data. Before writing any route handler, Server Action, middleware, or
> caching directive, **read the relevant guide in `node_modules/next/dist/docs/`**. This blueprint
> specifies *what* each route does and its contract; confirm the exact API shape against the local
> docs at implementation time.

---

## 1. Complete system architecture

### 1.1 Logical components

```
                         ┌─────────────────────────────────────────────┐
                         │                Public internet               │
                         └─────────────────────────────────────────────┘
        guests / customers │            staff / managers │       webhooks │ (Stripe, email, SMS)
                           ▼                              ▼                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 app (Vercel)  — single deployment                       │
│                                                                                            │
│  PUBLIC (frozen)      CUSTOMER (new)        ADMIN/STAFF (new)        API / SERVER (new)      │
│  /  /menu  /about     /order  /account      /admin/*                 /api/checkout          │
│  /locations           /reserve (wired)      (role-gated)             /api/webhooks/stripe   │
│  /reservations        /track/[code]                                  /api/webhooks/email    │
│                                                                      Server Actions         │
│                                                                                            │
│  ── Server Components read via repositories ──  ── mutations via Server Actions / handlers ──│
└───────────────┬─────────────────────────────┬───────────────────────┬─────────────────────┘
                │ anon key (RLS, read)         │ user JWT (RLS)         │ service-role (bypass RLS,
                ▼                              ▼                        ▼  server-only, audited)
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                      Supabase (Postgres)                                     │
│  Auth · Postgres + RLS · Storage (dish/location images) · Realtime (order/KDS status)       │
│  Edge Functions / pg_cron (reminders, segment refresh, loyalty accrual, GDPR jobs)          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                │                │                │                │                │
                ▼                ▼                ▼                ▼                ▼
            Stripe          Email ESP        SMS (Twilio/    Address/postcode    Error/APM
        (Checkout,       (Brevo default;     MessageBird)    (getAddress.io /    (Sentry) +
         Connect opt,    Klaviyo/Mailchimp                   Ideal Postcodes)    Analytics
         Webhooks)       adapters)                                               (Plausible)
```

### 1.2 Design tenets

1. **One database, three locations (single-tenant, location-scoped).** This is one restaurant
   business with three branches — *not* a multi-tenant SaaS. Every operational row carries a
   `location_id`. Access is scoped by **location membership**, not by tenant isolation. This keeps
   cross-location reporting trivial while still letting a Location Manager see only their branch.
2. **RLS is the security boundary, not the app.** Every table has explicit policies. The app server
   uses three credential tiers (below); even a bug in a route can't read another customer's data
   because Postgres refuses it.
3. **Money is integer pence, server-authoritative.** Clients never compute totals. `price_pence`,
   `subtotal_pence`, etc. The display `price` string on `menu_items` stays for the public menu; a
   new `price_pence` column drives checkout (the `0001_init.sql` comment already anticipated this).
4. **Everything reversible ships behind a flag.** `flags.ordering`, `flags.loyalty`,
   `flags.reservationsV2`. Each subsystem can go live independently and roll back without a deploy.
5. **External services are adapters.** Email ESP, SMS, and postcode lookup sit behind interfaces so
   the business can switch Brevo↔Klaviyo↔Mailchimp without touching feature code.
6. **The atmosphere principle still holds.** Customer-facing new surfaces (`/order`, `/account`,
   the booking flow) inherit the existing tokens and motion language so the platform feels like the
   same restaurant, not a bolted-on portal. Admin/staff UI is its own utilitarian system.

### 1.3 Credential tiers (server-side)

| Tier | Key | RLS | Used by | Example |
|---|---|---|---|---|
| **Public read** | anon | enforced | Server Components rendering public + customer pages | menu, locations, availability |
| **User-scoped** | user JWT (`@supabase/ssr`) | enforced | logged-in customer + staff actions | "my orders", "my reservations", staff updating an order in their location |
| **Privileged** | service-role | **bypassed** | webhook handlers, cron jobs, admin writes that must transcend RLS | finalising a paid order, refunds, GDPR export/erasure, audit writes |

Service-role is **never** exposed to the browser and every privileged mutation writes an
`audit_log` row (§9).

### 1.4 Request flows (representative)

**Place a collection/delivery order**
```
Browser cart (client state)
  → POST /api/checkout  (validates items+prices server-side from DB, applies promo/loyalty,
                         computes totals, creates `orders` row status=pending_payment)
  → Stripe Checkout Session (hosted)  ← PCI boundary lives entirely at Stripe
  → customer pays on Stripe
  → Stripe webhook  → /api/webhooks/stripe (service-role)
        verify signature → mark order `confirmed` → decrement gift card / mark promo used
        → accrue loyalty points → enqueue confirmation email → push Realtime status
  → /track/[code] shows live status (Realtime subscription)
```

**Make a reservation**
```
/reserve flow (location → date/time → party → occasion → details)
  → Server Action createReservation()
        re-check availability in a transaction (capacity guard, no double-book)
        if slot full → offer waitlist row instead
        insert `reservations` status=confirmed (or `pending` if approval required)
  → enqueue confirmation email + schedule reminder (email + optional SMS) via pg_cron job rows
  → customer gets manage link /reserve/manage/[token]
```

### 1.5 Notification architecture

A single **`notifications` outbox** table decouples "something happened" from "a message was sent".
Producers (order paid, reservation booked, reminder due) insert an outbox row; a worker
(Edge Function on a schedule + on-insert) renders the template and dispatches via the right channel
adapter, recording provider message id + status. This gives retries, idempotency, an audit trail,
and a single place to enforce consent and quiet-hours.

```
event → insert notifications(channel, template, to, payload, send_after, status='queued')
worker (pg_cron every minute + realtime) → pick due+queued rows
        → check consent (transactional always allowed; marketing requires opt-in)
        → render template → call adapter (email ESP | SMS) → store provider_id, status
        → on failure: backoff retry up to N, then status='failed' + alert
```

### 1.6 Email architecture (transactional vs marketing)

- **Transactional** (order confirmation, reservation confirmation/reminder, password reset, refund
  receipt, data-export ready): always sent, sent through the ESP's transactional API, **not** gated
  by marketing consent. Owned by the `notifications` outbox.
- **Marketing** (newsletters, campaigns, birthday, abandoned cart, win-back): gated by
  `marketing_consent`, managed *in the ESP* (Brevo/Klaviyo/Mailchimp) as the system of record for
  campaigns. We **sync** customer + consent + segment membership to the ESP via the adapter; we do
  **not** rebuild a campaign editor. Segmentation traits are computed in Postgres (§7) and pushed as
  contact attributes/lists.

---

## 2. Database design

Full DDL lives in `supabase/migrations/0002_…0008` (real, runnable, ordered after the existing
`0001_init.sql`). This section is the map and the rationale. Conventions follow `0001`: snake_case,
`text` slug PKs for reference data, `uuid` PKs for entities, `set_updated_at()` triggers,
`timestamptz` everywhere, RLS enabled on every table.

### 2.1 Entity map

```
auth.users (Supabase)
   └─1:1─ profiles ───< staff_roles >─── locations ──┐
                          (RBAC)                      │ every operational row → location_id
customers (1:1 profiles for customer-type users)     │
   ├──< addresses                                     │
   ├──< consents (append-only log)                    │
   ├──< orders >── order_items                        │
   │       └──< payments, refunds                     │
   ├──< reservations  ──< reservation_status_history  │
   ├──< waitlist_entries                              │
   ├──< loyalty_account ──< loyalty_ledger            │
   ├──< favourites (→ menu_items)                     │
   ├──< gift_cards (purchased/redeemed)               │
   └──< referrals                                     │
menu_categories ─< menu_items ─< item_modifier_groups ─< item_modifiers   (extends 0001)
menu_items ──< item_allergens >── allergens
promo_codes ──< promo_redemptions
campaigns, email_events            (CRM/marketing mirror of ESP)
customer_segments (materialised), segment_members
audit_log, notifications, data_requests   (cross-cutting)
tables (physical), reservation_tables (assignment)
```

### 2.2 Table catalogue

**Identity & access** (`0002`)
- `profiles` — one row per `auth.users`, `full_name`, `phone`, `type` (`customer` | `staff`),
  marketing fields denormalised for fast reads. Created by a trigger on `auth.users` insert.
- `staff_roles` — `(profile_id, location_id NULL=all, role)` where role ∈
  `super_admin | restaurant_manager | location_manager | staff`. `location_id NULL` ⇒ org-wide.
- `permissions` model: roles map to a fixed permission set in code; `staff_roles` is the grant. RLS
  helper functions `is_staff()`, `has_location(loc)`, `role_at_least(r)` drive every staff policy.

**Customers** (`0003`)
- `customers` — extends a profile with `loyalty_opt_in`, `default_address_id`, `stripe_customer_id`,
  `lifetime_value_pence` (maintained), `last_order_at`, `tags`.
- `addresses` — saved delivery addresses, validated postcode, `lat/lng`, `is_default`.
- `consents` — **append-only** consent log: `(customer_id, purpose, granted, source, ip, ua, ts)`.
  Purposes: `marketing_email`, `marketing_sms`, `analytics_cookies`, `marketing_cookies`. Current
  state is the latest row per purpose (view `current_consent`). This is the GDPR evidence trail.

**Menu extensions** (`0004`)
- `menu_items` gains `price_pence int`, `image_url`, `is_signature`, `spice_level`,
  `dietary` (veg/vegan/etc), `calories`. Keeps existing `price` text for the public menu.
- `item_modifier_groups` / `item_modifiers` — e.g. "Spice level" (req, single), "Add-ons" (opt,
  multi) with `price_delta_pence`.
- `allergens` + `item_allergens` — the 14 UK FSA allergens, surfaced in ordering & admin.
- `location_menu_items` — per-location availability + price override (a dish 86'd at Kilburn only).

**Reservations** (`0005`)
- `tables` — physical tables per location: `seats`, `min_party`, `max_party`, `zone`,
  `combinable`, `is_active`.
- `reservation_slots` config: per-location service windows, slot length, turn time, max covers.
- `reservations` — `location_id`, `customer_id` (nullable for guest), `party_size`, `occasion`,
  `starts_at`, `duration_min`, `status` (`pending|confirmed|seated|completed|no_show|cancelled`),
  `manage_token`, contact snapshot, `special_requests`.
- `reservation_tables` — assignment join (a booking may span combined tables).
- `reservation_status_history` — every transition, who/when (audit).
- `waitlist_entries` — desired window + party; promoted to a reservation when capacity frees.

**Ordering & payments** (`0006`)
- `orders` — `location_id`, `customer_id` (nullable for guest), `fulfilment` (`collection|delivery`),
  `status` (state machine §6), `subtotal_pence`, `discount_pence`, `delivery_fee_pence`,
  `tip_pence`, `total_pence`, `promo_code`, `gift_card_id`, `loyalty_points_redeemed`,
  `delivery_address` (jsonb snapshot), `prep_time_min`, `ready_at`, `placed_at`, contact snapshot,
  short human `code` (e.g. `BAL-7F3K`).
- `order_items` — line snapshot: `name`, `unit_price_pence`, `qty`, `modifiers` (jsonb),
  `line_total_pence` (snapshotted so menu edits never rewrite history).
- `payments` — `provider` (`stripe`), `provider_payment_intent`, `amount_pence`, `status`,
  `method` (card/apple_pay/google_pay/paypal). No PAN, ever (§10).
- `refunds` — `payment_id`, `amount_pence` (supports partial), `reason`, `actor`, `provider_refund_id`.
- `gift_cards` — `code`, `initial_pence`, `balance_pence`, `status`; redemption writes ledger.
- `promo_codes` — `code`, `kind` (`percent|fixed|free_delivery`), `value`, constraints
  (min spend, first-order-only, per-customer/global usage caps, valid window, location scope).
- `promo_redemptions` — usage audit, enforces caps.

**Loyalty** (`0007`)
- `loyalty_accounts` — `customer_id`, `points_balance`, `tier` (`bronze|silver|gold|vip`),
  `points_lifetime`.
- `loyalty_ledger` — append-only `(customer_id, delta, reason, order_id?, expires_at?, ts)`.
  Earn, redeem, birthday, anniversary, referral, manual adjustment. Balance = sum(ledger) (or a
  maintained cache reconciled by a job).
- `rewards` — catalogue of redeemable rewards (free dish, £ off, free delivery) with point cost.
- `referrals` — `referrer_id`, `referee_id`, `code`, `status`, reward issued.

**CRM / marketing mirror** (`0008`)
- `campaigns` — local mirror of ESP campaigns for reporting (`provider`, `provider_id`, `name`,
  `sent_at`, `audience`, metrics snapshot).
- `email_events` — per-recipient events synced from ESP webhooks (`delivered|open|click|bounce|
  unsub|complaint`) for funnel + deliverability reports.
- `customer_segments` — definition (name, rule json) + `segment_members` materialised by a job.

**Cross-cutting**
- `notifications` — the outbox (§1.5).
- `audit_log` — `(actor_profile_id, action, entity, entity_id, before, after, ip, ts)`; every
  privileged/admin mutation.
- `data_requests` — GDPR export/erasure queue with status + artefact link (§9).

### 2.3 Integrity & money rules

- All amounts `int` pence, `>= 0` checks, totals recomputed server-side and asserted against the sum
  of components before payment.
- Order/reservation **status transitions are guarded by a trigger** that rejects illegal moves
  (e.g. `cancelled → seated`) — the state machine lives in the DB, not just the UI.
- Availability is enforced with a **capacity check inside a transaction** + a unique/exclusion
  constraint so two simultaneous bookings can't oversell a slot.

---

## 3. Admin panel — page structure

Route group `app/(admin)/admin/*`, gated by middleware (auth + `is_staff()`), then per-page by role.
Utilitarian design system (dense tables, keyboard-first, clear status colour), **separate** from the
public brand styling but sharing the colour tokens for family resemblance. Location switcher in the
top bar (Location Managers are pinned to their branch; Super Admin/Restaurant Manager can switch or
view "All locations").

| Section | Pages | Min role |
|---|---|---|
| **Dashboard** | KPIs (revenue, orders, covers, AOV, conversion, customer growth, top dishes) with date range + location filter; live "now" strip (orders in kitchen, upcoming covers) | location_manager |
| **Orders** | list (filter status/location/date/fulfilment) · detail (timeline, items, payment, customer) · actions: advance status, assign driver, **refund/partial refund**, cancel | staff (view), location_manager (refund) |
| **Kitchen (KDS)** | live order board per location, Realtime, bump/recall, prep-time control | staff |
| **Reservations** | calendar + list · detail/modify · **table management** (floor plan, assign/combine) · **waitlist** (promote, notify) · walk-ins | staff |
| **Menu** | categories · items (CRUD, `price_pence`, availability, **per-location 86**, allergens, modifiers, image upload to Storage) · drag-sort | location_manager (avail) / restaurant_manager (CRUD) |
| **Customers** | list/search · profile (orders, reservations, **loyalty**, LTV, tags, **consent state**) · manual loyalty adjust · GDPR actions | location_manager (view) / restaurant_manager (edit) |
| **Marketing** | campaigns (list synced from ESP, create draft → hand off to ESP) · segments (view/build) · **promo codes** (CRUD, caps) · gift cards | restaurant_manager |
| **Loyalty** | tiers config · rewards catalogue · referral settings · ledger search | restaurant_manager |
| **Reports** | revenue, orders, reservations, retention, **CLV**, popular dishes, marketing performance, loyalty performance · CSV export | location_manager (own loc) / restaurant_manager (all) |
| **Settings** | locations (hours, delivery radius/fees, slot config) · **staff & roles** (invite, assign location, deactivate) · **audit log** viewer · integrations (ESP/SMS/Stripe keys status) · feature flags | super_admin |

### Staff panel (subset)
"Staff Member" sees a focused subset: today's orders + KDS, today's reservations/waitlist, and item
availability toggling — no money, refunds, customer PII export, marketing, or settings.

---

## 4. Customer-facing flows

All under the existing brand; reuse tokens + motion. Guest-first (never force signup to buy).

1. **Order** `/order` → choose location & fulfilment → (delivery: postcode check → in-radius? →
   fee + min-spend shown) → browse menu (modifiers, allergen badges, upsell/cross-sell prompts) →
   cart (promo code, gift card, loyalty redeem, tip) → **guest or account** checkout → Stripe hosted
   → `/order/confirmed` → `/track/[code]` live status.
2. **Reserve** `/reserve` (wires the existing flow components) → location → date/time (live
   availability) → party → occasion → details → confirm → manage link emailed. Full slot ⇒ waitlist
   offer.
3. **Account** `/account` → overview · orders (track + **reorder**) · reservations (modify/cancel) ·
   **favourites** · addresses · **loyalty** (balance, tier, rewards, referral link) ·
   **preferences** (marketing consent toggles, data export/delete) · profile/security.
4. **Reorder** — one tap from a past order re-hydrates the cart at the current menu/price (flags any
   unavailable/changed item).

---

## 5. Reservation workflows

```
            create ──▶ pending ──(approval if required)──▶ confirmed ──▶ seated ──▶ completed
   (slot full) │                                              │  │
               ▼                                              │  └─(modify: re-check capacity)
           waitlist ──(capacity frees, auto-notify)──▶ offered─┘
                                                       │
   confirmed ──(customer/staff)──▶ cancelled          └─(expires)──▶ back to waitlist/closed
   confirmed ──(no arrival + grace)──▶ no_show
```
- **Confirmation email** on confirm (with manage link + add-to-calendar).
- **Reminder** 24h before (email) and **SMS** ~3h before (if SMS consent + phone).
- **Modify/cancel** via authenticated account or `manage_token` link; both re-check capacity and
  write `reservation_status_history`.
- **Waitlist**: when a cancel/extension frees capacity, the earliest matching waitlist entry is
  offered the slot with a time-boxed hold before falling through to the next.

## 6. Order workflows

```
pending_payment ──(Stripe webhook: paid)──▶ confirmed ──▶ preparing ──▶ ready
        │                                       │             │            │
        │                                       │   delivery: └─▶ out_for_delivery ─▶ delivered
        │                                       │   collection:            └─▶ collected
        └─(payment failed/expired)──▶ cancelled │
   confirmed/preparing ──(staff)──▶ cancelled ──▶ refund (full/partial) via Stripe
```
- `prep_time_min` drives the customer ETA; KDS bump moves `preparing → ready`.
- Status changes push **Realtime** to `/track/[code]` and the KDS.
- Refund (full or partial) calls Stripe, writes `refunds` + `audit_log`, reverses loyalty accrual
  proportionally.

## 7. Loyalty workflows

- **Earn**: on order `confirmed`, accrue `floor(total_pence / rate)` points → `loyalty_ledger`
  (reversed proportionally on refund). Configurable earn rate per £.
- **Tiers**: derived from rolling 12-month points/spend; tier unlocks perks (e.g. free delivery at
  Gold, priority waitlist at VIP).
- **Birthday / anniversary**: pg_cron daily job finds matching customers with consent → issues bonus
  points + enqueues a campaign trigger to the ESP.
- **Redeem**: at checkout, points → `rewards` (£ off / free item / free delivery); ledger debit,
  server-validated against balance.
- **Referral**: customer shares code → referee's first completed order credits both (ledger +
  `referrals` status), once, fraud-guarded (distinct payment method/address heuristics).

## 8. Email-marketing workflows

The ESP owns sending; we own the data + triggers. Adapter interface (`EmailProvider`) implemented for
**Brevo (default), Klaviyo, Mailchimp** — selected by env, swappable without feature changes.

| Flow | Trigger (ours) | Consent | Channel |
|---|---|---|---|
| Newsletter signup | footer/account opt-in → upsert contact + list | opt-in | ESP |
| Welcome series | new customer + consent → enrol in ESP automation | opt-in | ESP |
| Abandoned cart | cart idle N min, identified customer, consent | opt-in | ESP/outbox |
| Reservation reminder | pg_cron (24h/3h) | transactional | outbox (email) + SMS (consent) |
| Order confirmation/receipt | order paid/refunded | transactional | outbox |
| Birthday / anniversary | daily cron | opt-in | ESP |
| Promotional campaign | manual in ESP, audience = our segment | opt-in | ESP |
| Win-back (inactive) | segment membership change | opt-in | ESP |

**Segments** (computed in Postgres nightly, synced as ESP lists/attributes): new (`<1` order),
returning (`≥2`), high-value (LTV percentile / tier ≥ gold), inactive (`last_order_at > 90d`),
delivery-leaning, dine-in-leaning. Suppression always respects `current_consent` + ESP unsub
(synced back via `email_events`).

---

## 9. GDPR compliance requirements

UK GDPR + PECR. The data model is built for this, not retrofitted.

- **Lawful basis**: contract (orders/reservations), legitimate interest (fraud, service emails),
  **consent** (marketing, non-essential cookies). Recorded per purpose.
- **Cookie consent**: a banner + **preference centre** sets `analytics_cookies` /
  `marketing_cookies`; **no non-essential script loads before opt-in** (analytics + ESP/ad pixels are
  gated). Choice stored in a first-party cookie *and* `consents` when identified.
- **Marketing consent**: explicit opt-in, unbundled from T&Cs, per-channel (email/SMS), revocable in
  one click; every change appends to `consents` with source/IP/UA/timestamp (the audit trail).
- **Preference centre** (`/account/preferences` + tokenised link for non-account holders): manage all
  consents and channels.
- **Right of access / portability**: `data_requests(type='export')` → job assembles a JSON/CSV bundle
  (profile, orders, reservations, loyalty, consents) to Storage with a signed, expiring link, emailed
  to the verified address.
- **Right to erasure**: `data_requests(type='erasure')` → verify identity → **anonymise** (not hard
  delete) financial/order records required for tax/accounting (legal-obligation retention), null PII,
  remove from ESP, tombstone the account. Erasure itself is audit-logged.
- **Consent logging**: append-only `consents` is the evidence; never updated in place.
- **Retention**: policy per entity (e.g. orders 7y for tax, raw analytics 14m, abandoned-cart PII
  short). Enforced by a scheduled job.
- **Data minimisation**: card data never touches us (§10); we store only what each flow needs.
- **Processors**: Supabase, Stripe, ESP, SMS, Vercel, postcode API — listed in the privacy policy
  with DPAs; SCCs where data leaves the UK/EU.
- **Breach readiness**: audit log + Sentry + provider logs support 72h notification.

## 10. PCI compliance requirements

- **SAQ A** posture: card data is captured, processed, and stored **entirely by Stripe** via
  **Stripe-hosted Checkout / Payment Element**. The card form is Stripe's iframe; PAN/CVV never reach
  our servers, logs, or database.
- **No raw card storage** — we keep only Stripe ids (`stripe_customer_id`,
  `provider_payment_intent`, `provider_refund_id`) and non-sensitive metadata (brand, last4 as
  returned by Stripe for display only).
- **Apple Pay / Google Pay** via Stripe's Payment Request Button; **PayPal** as a separate hosted
  redirect (its own SAQ-A-equivalent), reconciled into `payments`.
- **Webhook security**: verify Stripe signature, idempotency keys, replay protection; webhook route
  uses service-role and is the *only* place an order is marked paid (never trust the client redirect).
- **Transport**: HTTPS/HSTS everywhere; secrets in Vercel env, never in the repo; service-role key
  server-only.
- **Fraud prevention**: Stripe Radar; plus app rules (velocity limits, mismatched address/postcode
  flags, gift-card/promo abuse caps, referral self-referral guard).

## 11. Recommended third-party integrations

| Need | Recommended | Alternatives | Notes |
|---|---|---|---|
| Payments | **Stripe** (Checkout, Payment Element, Radar, Connect-optional) | — | already implied by `flags.ordering`/`price_pence` |
| Wallets | Stripe **Apple/Google Pay** | — | Payment Request Button |
| Alt payment | **PayPal** | — | hosted redirect |
| Email ESP | **Brevo** (default) | **Klaviyo**, **Mailchimp** | adapter interface; Brevo = best price + transactional + SMS in one |
| SMS | **Twilio** | MessageBird, Brevo SMS | reservation reminders |
| Postcode/address | **Ideal Postcodes** / **getAddress.io** | Loqate | UK postcode validation, autocomplete, geocode for radius |
| Delivery routing (opt) | in-house radius (geocode + Haversine) | Stuart/own drivers | start with zones + radius per location |
| Auth | **Supabase Auth** (email/OTP, OAuth) | — | already in stack |
| Storage | **Supabase Storage** | — | dish/location images |
| Scheduling | **Supabase pg_cron + Edge Functions** | Vercel Cron | reminders, segments, loyalty, GDPR jobs |
| Errors/APM | **Sentry** | — | |
| Analytics | **Plausible** (cookieless) or GA4 (consent-gated) | — | Plausible avoids cookie-consent friction |
| Cookie consent | lightweight in-house banner + preference centre | Cookiebot/Osano | keeps brand control |

## 12. Recommended technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC, Server Actions) | already the repo's stack |
| Language | **TypeScript** (strict) | already configured |
| UI | React 19, Tailwind v4 tokens, GSAP/Framer/Lenis for customer surfaces; headless components for admin tables | reuse existing |
| DB | **Supabase Postgres + RLS** | already chosen; security at the data layer |
| Auth | **Supabase Auth** via `@supabase/ssr` | already a dependency |
| Realtime | **Supabase Realtime** | order/KDS/track live status |
| Files | **Supabase Storage** | images, GDPR export artefacts |
| Jobs | **pg_cron + Edge Functions** | reminders, segments, retention, accrual |
| Payments | **Stripe** | PCI SAQ A |
| Email | **Brevo** (adapter for Klaviyo/Mailchimp) | transactional + campaigns |
| SMS | **Twilio** | reminders |
| Hosting | **Vercel** | already implied (README mentions Vercel env) |
| Validation | **Zod** at every trust boundary | server-authoritative input |
| Testing | Vitest (unit), Playwright (e2e for checkout/booking) | protect money + booking paths |
| Observability | Sentry + Plausible | errors + privacy-friendly analytics |

---

## 13. Build phasing (how this ships without breaking the frozen site)

Each phase is independently shippable behind a flag; the public site never regresses.

1. **P2 (in progress) — Data foundation.** Connect Supabase, run `0002–0004` (RBAC, customers,
   menu extensions). Admin shell + menu management. *Flag: none (admin gated by auth).*
2. **P3 — Reservations v2.** `0005`, wire the existing reservation flow to the backend, admin
   reservations + tables + waitlist, confirmation/reminder notifications. *Flag: `reservationsV2`.*
3. **P4 — Ordering & payments.** `0006`, `/order`, Stripe Checkout + webhooks, KDS, refunds, promo
   codes, gift cards. *Flag: `ordering` (already stubbed).*
4. **P5 — Accounts & loyalty.** `0007`, `/account`, favourites, addresses, loyalty + referrals.
   *Flag: `loyalty`.*
5. **P6 — CRM, email & segments.** `0008`, ESP adapter, segments job, campaigns mirror, abandoned
   cart, lifecycle automations. *Flag: `marketing`.*
6. **P7 — Compliance hardening & reporting.** Cookie/preference centre, data export/erasure jobs,
   retention jobs, reporting suite, audit-log viewer. *Always-on once landed.*

> Implementation rule reminder: before writing any Next.js route handler, Server Action, middleware,
> or caching code, **read `node_modules/next/dist/docs/`** — this is a modified Next.js 16.

---

### Companion artefacts in this repo
- `supabase/migrations/0002_auth_and_rbac.sql` … `0008_crm_marketing.sql` — the real schema.
- `src/lib/flags.ts` — extend with `reservationsV2`, `loyalty`, `marketing`.
- `src/lib/repositories/` — one repository per aggregate (orders, reservations, customers, …),
  mirroring the existing `menu.ts` pattern (Supabase when connected, safe fallback, server-only).
