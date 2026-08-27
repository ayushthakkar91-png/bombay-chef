# Balham Ordering Launch — Design Spec

**Date:** 2026-08-27
**Branch base:** `security/batch1-f2-f3-f6` (contains uncommitted Batch 1: F2/F3/F6)
**Status:** Approved design, pre-implementation

## Goal

Launch the already-built internal ordering system for the **Balham** branch
only. **Battersea** and **Kilburn** keep routing "Order Online" out to the
third-party platform (`bombaybicyclechef.uk/locator`). Close all open
money/security findings before Balham takes a single real order. Zero
disruption to the two branches that stay external.

## Current state (verified from code)

- Ordering system is **fully built** but shipped behind env flag
  `NEXT_PUBLIC_FEATURE_ORDERING` (currently OFF). With it off, "Order Online"
  already points to `EXTERNAL_ORDER_URL = https://www.bombaybicyclechef.uk/locator`.
  So this is a **first launch** — no live internal orders exist to break.
- Cart → server-authoritative pricing → Stripe hosted Checkout → webhook-confirmed
  order → kitchen/admin/track. Guest + logged-in. Loyalty, promos, gift cards,
  delivery-zone postcode check all built.
- Per-branch data already exists: `src/data/locations.ts` — Balham
  `orderingEnabled:true`, Battersea/Kilburn `false`. DB `locations` carries
  per-branch delivery config; `delivery_zones` seeded for all three.
- Menu is Supabase-backed (`repositories/ordering-menu.ts`) with per-location
  86'ing + price override via `location_menu_items`. Checkout math uses integer
  `price_pence`.
- Security audit complete (`SECURITY_AUDIT_AND_BATCH1.txt`). Batch 1 (F2 customers
  RLS, F3 reservations RLS, F6 global-search scoping) implemented, **uncommitted**,
  on branch `security/batch1-f2-f3-f6`. F4/F5/F7/F8/F9 still open.

## Decisions (locked)

- Routing: "Order Online" → **branch picker**. Balham → internal flow;
  Battersea/Kilburn → **generic** `EXTERNAL_ORDER_URL` (already wired).
- Sequence: **security first**. Master flag stays OFF until Security Batch 2 is
  verified on a real DB. Then flip on for Balham.
- Master `NEXT_PUBLIC_FEATURE_ORDERING` kept as kill-switch: off ⇒ all three
  branches revert to external, no deploy needed.

## Out of scope (YAGNI)

- F1 multi-tenant isolation (no 2nd tenant; `NEXT_PUBLIC_FEATURE_PLATFORM=false`).
- Reservations changes. Moving Battersea/Kilburn internal. New payment methods.
- Per-branch external deep links (using generic locator).

---

## Section 1 — Security Batch 2 (pre-launch gate)

New migration `0022_security_batch2.sql` + logic changes. Nothing customer-facing
ships until pgTAP tests for these pass on a real DB.

### F4 — Voucher owner-scope (`src/lib/ordering/pricing.ts`)
- Current: `applyPromo()` looks up promo by `ilike(code)` only — no owner filter.
  Personal loyalty/birthday vouchers (minted with `customer_id`) are usable by
  anyone who guesses the code.
- Fix: filter promo lookup to `customer_id IS NULL OR customer_id = <authed uid>`.
  Enforce the currently-dead columns `per_customer_limit` and `first_order_only`
  against `promo_redemptions`. Guests (no uid) can use only public
  (`customer_id IS NULL`) vouchers.

### F5 — Atomic promo single-use (`promo_redemptions` + RPC)
- Current: single-use / global-limit is a non-atomic read-then-write; the
  `promo_redemptions` table exists but is never written. Concurrent checkouts all
  price at `used_count=0`.
- Fix: `SECURITY DEFINER` RPC `reserve_promo(p_code, p_order_id, p_customer)` that
  performs a `UNIQUE`-constrained insert into `promo_redemptions` at order-create,
  in the same server path that bakes the discount into the Stripe amount.
  Concurrent N → 1 succeeds, others get a unique-violation and are rejected.
  Redemption reversed when an unpaid/cancelled order is voided.
- Constraints: `UNIQUE(promo_id, order_id)`; plus a partial unique index to
  enforce `per_customer_limit` where applicable.

### F7 — Gift-card debit before "paid" (`order/actions.ts` + `giftcards/service.ts`)
- Current: a fully gift-card-covered order is marked paid **before** the card is
  debited; concurrency yields two paid orders on one balance.
- Fix: debit atomically first (`update ... where balance_pence >= amount`
  returning), mark the order paid **only** on a successful debit. On failed debit,
  no paid order is produced (order stays `pending_payment`, surfaced as an error).

### F8 — Loyalty double-earn (`0022` constraint + `loyalty/service.ts`)
- Current: no `UNIQUE(order_id, reason)` on `loyalty_ledger`; webhook retries
  double-award points.
- Fix: add `UNIQUE(order_id, reason)` and make the earn insert
  `on conflict do nothing`. (Redeem already safe via `points_balance >= 0` CHECK.)

### F9 — Rate-limit hardening (`src/lib/ratelimit.ts`)
- Current: falls back to per-instance in-memory when `UPSTASH_REDIS_*` unset or on
  Redis error — not multi-instance safe; weakens admin-login and booking caps.
- Fix: **fail closed** on sensitive operations (checkout create, admin login,
  promo apply) when Redis is unavailable in production; keep best-effort in-memory
  only for cosmetic/non-security paths. Add the missing env vars to `.env.example`.

### Batch 2 gate
- Author pgTAP tests reproducing F4/F5/F7/F8 (plus existing F2/F3 regression in
  `supabase/tests/rls_batch1_test.sql`). Run `supabase test db` on a real DB
  (Docker local or staging). All green is a hard precondition for Section 2 launch.

---

## Section 2 — Branch picker + routing

- `src/data/locations.ts`: replace boolean `orderingEnabled` with a provider model:
  ```
  ordering: { provider: 'internal' | 'external', externalUrl?: string }
  ```
  Balham = `{ provider: 'internal' }`; Battersea/Kilburn =
  `{ provider: 'external', externalUrl: EXTERNAL_ORDER_URL }`.
- New single routing helper `orderHrefFor(branch)` (in `src/lib/site.ts` or
  `flags.ts`): internal ⇒ `/order/menu?loc=<slug>`; external ⇒ the external URL.
  Route the ~63 existing `ORDER_URL` / `/order` references through it so there is
  one source of truth.
- New **branch picker** as the "Order Online" entry point: three branch cards;
  internal opens the internal menu, external opens the third-party site in a new
  tab (`target="_blank" rel="noopener noreferrer"`). Built with the design skill
  (`frontend-design` + `ui-ux-pro-max`) to match the existing Tailwind v4 token
  system in `src/app/globals.css`.
- Navbar / Footer / MenuCTA / DineInTakeaway / home CTAs point at the picker.

## Section 3 — Server guard + DB alignment (defense-in-depth)

- `/order/page.tsx`, `/order/menu`, `/order/checkout`, and `createCheckout`
  **reject any branch whose provider ≠ internal** — server-side redirect/404, not
  merely a hidden link. A hand-typed `?loc=kilburn` cannot reach checkout.
- DB alignment: confirm only Balham has `collection_enabled` / `delivery_enabled`
  true; Battersea/Kilburn false. `getOrderLocations()` already reads this and is
  the second gate. A branch must pass **both** the static provider check and the
  DB config check to be orderable.
- Master `NEXT_PUBLIC_FEATURE_ORDERING`: on ⇒ per-branch routing active; off ⇒ all
  branches external (instant rollback).

## Section 4 — Verification before go-live

- pgTAP: F4/F5/F7/F8 repro + F2/F3 regression on a real DB — green.
- Manual smoke: Balham order (collection + delivery, guest + logged-in), Stripe
  test-mode payment → webhook → order visible in kitchen + track page.
  Battersea/Kilburn buttons → external site. Typed `?loc=battersea` → blocked.
- `tsc --noEmit`, `next build`, eslint — clean vs baseline (145 pre-existing).

## Section 5 — Deploy / rollback

- Order: **security migration `0022` + code first**, flag OFF ⇒ verify on staging
  ⇒ flip `NEXT_PUBLIC_FEATURE_ORDERING` on for Balham.
- Batch 1 migration `0021` deploy order (from audit): **code first, migration
  second**; commit the uncommitted Batch 1 work before layering Batch 2.
- Rollback: flip flag off (instant; all external again), or `git revert`.
  Per-fix migration rollback SQL documented in the plan.

## Risks / unknowns

- pgTAP requires a runnable DB (Docker or Supabase staging); the audit env could
  not run it. If no local DB is available, F4/F5/F7/F8 must be verified on staging
  before the flag flips.
- Dashboard-only Supabase settings (Auth redirect allowlist, Storage buckets,
  leaked-password protection) are not visible in code — verify in dashboard as
  part of go-live checklist.
- Batch 1 changes are uncommitted; must be committed and its deploy-order honored
  so the birthday/default-address write path is not left in a no-op gap.
