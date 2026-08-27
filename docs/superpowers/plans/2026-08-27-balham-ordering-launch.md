# Balham Ordering Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch the existing internal ordering system for Balham only, route Battersea/Kilburn to the external platform via a branch picker, and close money/security findings F4/F5/F7/F8/F9 before any real order.

**Architecture:** Two phases. **Phase A (security)** lands migration `0022` + logic fixes and must pass pgTAP on a real DB before anything customer-facing ships. **Phase B (launch)** replaces the global ordering flag's routing with per-branch provider routing (`internal` vs `external`), adds a branch picker, and hard-blocks non-internal branches server-side. The master flag `NEXT_PUBLIC_FEATURE_ORDERING` stays as an instant kill-switch.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Supabase (Postgres + RLS), hand-rolled Stripe REST client, Tailwind v4 (CSS-first tokens in `globals.css`), pgTAP (`supabase test db`).

**Spec:** `docs/superpowers/specs/2026-08-27-balham-ordering-launch-design.md`

## Global Constraints

- Money is always **integer pence**, server-authoritative. Clients never send an amount.
- An order is marked `paid` **only** by the Stripe webhook or the gift-card-fully-covered server path — never the client redirect.
- Guest ordering + webhooks use `getServiceClient()` (bypasses RLS); it is `import "server-only"`. Never expose it to the client.
- New `SECURITY DEFINER` functions must `set search_path = public, pg_temp` and `revoke execute ... from public, anon, authenticated`.
- Migrations are **append-only, numbered**; next is `0022`. Do NOT edit a deployed migration. `0021` is committed but NOT yet applied — Phase A stacks on it.
- Deploy order for the whole branch: **code first, migration second** (per audit). Master flag `NEXT_PUBLIC_FEATURE_ORDERING` stays `false` until Phase A is verified on a real DB.
- No JS test framework exists yet. Phase A adds **vitest** for pure functions and uses **pgTAP** for DB-level guarantees. DB-coupled server actions are verified by pgTAP + a documented manual smoke on staging.
- External order URL is the generic locator: `EXTERNAL_ORDER_URL = "https://www.bombaybicyclechef.uk/locator"` (already in `src/lib/flags.ts`).

---

# PHASE A — Security Batch 2 (pre-launch gate)

## Task A0: Test tooling (vitest) + migration scaffold

**Files:**
- Modify: `package.json` (add `vitest` devDep + `"test": "vitest run"` script)
- Create: `vitest.config.ts`
- Create: `supabase/migrations/0022_security_batch2.sql` (empty header for now)
- Create: `supabase/tests/rls_batch2_test.sql` (pgTAP header for now)

**Interfaces:**
- Produces: `npm test` runs vitest; `0022_security_batch2.sql` is the single migration all Phase A DB tasks append to; `rls_batch2_test.sql` is where Phase A pgTAP assertions accumulate.

- [ ] **Step 1: Add vitest**

```jsonc
// package.json — devDependencies (add) and scripts (add)
"scripts": { "test": "vitest run", "test:watch": "vitest" }
"devDependencies": { "vitest": "^3" }
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 2: Install + verify runner**

Run: `npm install` then `npm test`
Expected: vitest runs, "No test files found" (exit 0 or the no-tests notice). Runner works.

- [ ] **Step 3: Create migration + pgTAP headers**

```sql
-- supabase/migrations/0022_security_batch2.sql
-- Bombay Bicycle Chef — 0022 security batch 2 (F4, F5, F7-adjacent, F8).
-- Stacks on 0021. Append-only. NOT applied automatically — run on staging first.
-- (Tasks below append their statements here.)
```

```sql
-- supabase/tests/rls_batch2_test.sql
-- pgTAP regression for security batch 2. Run: supabase test db
begin;
select plan(1);
select ok(true, 'placeholder — replaced by real assertions');
select finish();
rollback;
```

- [ ] **Step 4: Commit**

```bash
git add package.json vitest.config.ts vitest.config.* supabase/migrations/0022_security_batch2.sql supabase/tests/rls_batch2_test.sql package-lock.json
git commit -m "chore: add vitest + scaffold security batch 2 migration and pgTAP"
```

---

## Task A1: F8 — loyalty double-earn UNIQUE constraint

**Files:**
- Modify: `supabase/migrations/0022_security_batch2.sql`
- Modify: `src/lib/loyalty/service.ts:55-60` (earn insert → conflict-ignore)
- Modify: `supabase/tests/rls_batch2_test.sql`

**Interfaces:**
- Consumes: `loyalty_ledger(customer_id, delta, reason, order_id, note, actor_id)` from 0007.
- Produces: DB guarantees at most one `(order_id, reason)` row where `order_id` is not null.

- [ ] **Step 1: Write the failing pgTAP test**

Append inside the `begin;`…`rollback;` block (raise the `plan(N)` count accordingly):

```sql
-- F8: two identical earn rows for one order must not both persist.
prepare earn1 as insert into loyalty_ledger(customer_id, delta, reason, order_id)
  values ('00000000-0000-0000-0000-000000000001', 10, 'earn',
          '00000000-0000-0000-0000-0000000000aa');
select lives_ok('earn1', 'first earn inserts');
select throws_ok('earn1', '23505', null, 'duplicate earn for same order is rejected');
```

- [ ] **Step 2: Run pgTAP to verify it fails**

Run: `supabase test db`
Expected: FAIL — no unique constraint yet, second insert succeeds (throws_ok gets no error).

- [ ] **Step 3: Add the constraint**

Append to `0022_security_batch2.sql`:

```sql
-- F8: prevent double-earn / double-reversal on webhook retries. NULL order_id
-- rows (redeem/adjustment/birthday) stay unconstrained (NULLs are distinct).
create unique index if not exists loyalty_ledger_order_reason_uidx
  on loyalty_ledger (order_id, reason)
  where order_id is not null;
```

- [ ] **Step 4: Make the earn insert conflict-safe**

In `src/lib/loyalty/service.ts`, replace the insert at ~55-60:

```ts
  await supabase.from("loyalty_ledger").upsert(
    { customer_id: order.customer_id, delta: points, reason: "earn", order_id: orderId },
    { onConflict: "order_id,reason", ignoreDuplicates: true },
  );
```

Do the same for the `reverseEarnForOrder` insert (reason `refund_reversal`, ~74-79) — upsert with `onConflict: "order_id,reason", ignoreDuplicates: true`. Keep the existing pre-checks (they short-circuit the common case; the index is the race backstop).

- [ ] **Step 5: Verify**

Run: `supabase test db` → the F8 assertions PASS.
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0022_security_batch2.sql src/lib/loyalty/service.ts supabase/tests/rls_batch2_test.sql
git commit -m "fix(F8): unique(order_id,reason) on loyalty_ledger; conflict-safe earn"
```

---

## Task A2: F5 — atomic promo reservation RPC

**Files:**
- Modify: `supabase/migrations/0022_security_batch2.sql`
- Modify: `supabase/tests/rls_batch2_test.sql`

**Interfaces:**
- Consumes: `promo_codes(id, global_limit, per_customer_limit, first_order_only)`, `promo_redemptions(promo_id, order_id, customer_id)`, `orders(customer_id, status)` from 0006.
- Produces: SQL functions
  - `reserve_promo(p_promo_id uuid, p_order_id uuid, p_customer_id uuid) returns void` — raises `check_violation` (SQLSTATE `23514`) when a cap is exceeded; inserts one redemption row under a row lock otherwise.
  - `release_promo(p_order_id uuid) returns void` — deletes redemptions for an order (used on checkout failure / cancel).

- [ ] **Step 1: Write the failing pgTAP test**

Append (bump `plan`):

```sql
-- F5: a global_limit=1 code can be reserved once; a second reservation raises.
-- (fixtures: one promo id ...b1, two orders ...c1/...c2, guest customer null)
select lives_ok(
  $$ select reserve_promo('...b1'::uuid, '...c1'::uuid, null) $$,
  'first reservation of a single-use code succeeds');
select throws_ok(
  $$ select reserve_promo('...b1'::uuid, '...c2'::uuid, null) $$,
  '23514', null, 'second reservation of a single-use code is rejected');
```

(Replace `...b1/...c1/...c2` with real UUIDs inserted as fixtures at the top of the test block: a `promo_codes` row with `global_limit = 1`, and two `orders` rows.)

- [ ] **Step 2: Run to verify it fails**

Run: `supabase test db`
Expected: FAIL — `reserve_promo` does not exist yet.

- [ ] **Step 3: Implement the RPC**

Append to `0022_security_batch2.sql`:

```sql
-- F5: atomic single-use / per-customer / first-order enforcement. Row lock on
-- the promo serialises concurrent checkouts; the redemption row is the ledger.
create or replace function reserve_promo(
  p_promo_id uuid, p_order_id uuid, p_customer_id uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_global   int;
  v_per_cust int;
  v_first    boolean;
  v_used     int;
  v_by_cust  int;
  v_prior    int;
begin
  select global_limit, per_customer_limit, first_order_only
    into v_global, v_per_cust, v_first
    from promo_codes where id = p_promo_id for update;   -- lock serialises
  if not found then
    raise exception 'unknown promo' using errcode = 'check_violation';
  end if;

  select count(*) into v_used from promo_redemptions where promo_id = p_promo_id;
  if v_global is not null and v_used >= v_global then
    raise exception 'promo global limit reached' using errcode = 'check_violation';
  end if;

  if p_customer_id is not null then
    select count(*) into v_by_cust
      from promo_redemptions where promo_id = p_promo_id and customer_id = p_customer_id;
    if v_per_cust is not null and v_by_cust >= v_per_cust then
      raise exception 'promo per-customer limit reached' using errcode = 'check_violation';
    end if;
    if v_first then
      select count(*) into v_prior
        from orders where customer_id = p_customer_id and status <> 'pending_payment';
      if v_prior > 0 then
        raise exception 'promo is first-order only' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  insert into promo_redemptions (promo_id, order_id, customer_id)
    values (p_promo_id, p_order_id, p_customer_id);
end $$;

create or replace function release_promo(p_order_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from promo_redemptions where order_id = p_order_id;
end $$;

revoke execute on function reserve_promo(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function release_promo(uuid) from public, anon, authenticated;

-- Belt-and-braces: one redemption per (promo, order).
create unique index if not exists promo_redemptions_promo_order_uidx
  on promo_redemptions (promo_id, order_id);
```

- [ ] **Step 4: Verify**

Run: `supabase test db` → F5 assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0022_security_batch2.sql supabase/tests/rls_batch2_test.sql
git commit -m "fix(F5): reserve_promo/release_promo RPCs for atomic single-use enforcement"
```

---

## Task A3: F4 + F5 wiring — owner-scoped promos, reserve at checkout

**Files:**
- Modify: `src/lib/ordering/pricing.ts:53-194` (`priceCart` + `applyPromo` take an optional `customerId`, owner-scope the lookup, return `promoId`)
- Modify: `src/app/order/actions.ts:37-189` (`priceCartAction` + `createCheckout` resolve the customer, set `orders.customer_id`, call `reserve_promo`, `release_promo` on failure)
- Modify: `src/lib/ordering/confirm.ts:49-52` (stop the non-atomic `used_count` increment; leave display counter to a trigger or drop it)
- Modify: `supabase/migrations/0022_security_batch2.sql` (trigger to keep `promo_codes.used_count` accurate from redemptions — display only)

**Interfaces:**
- Consumes: `reserve_promo` / `release_promo` (Task A2); `getCustomer()` from `src/lib/auth/customer.ts` returning `{ userId }` or null.
- Produces: `priceCart(locationId, fulfilment, lines, promoCode?, customerId?)`; `PriceResult.ok` gains `promoId: string | null`. `applyPromo` returns `{ ...; promoId: string | null }`.

- [ ] **Step 1: Owner-scope the promo lookup (F4)**

In `pricing.ts applyPromo`, thread `customerId: string | null` and change the query to reject other customers' personal vouchers, and return the id:

```ts
async function applyPromo(
  code: string, subtotalPence: number, deliveryFeePence: number,
  locationId: string, customerId: string | null,
): Promise<{ discountPence: number; freesDelivery: boolean; code: string | null; promoId: string | null; error?: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { discountPence: 0, freesDelivery: false, code: null, promoId: null };

  const { data: promo } = await supabase
    .from("promo_codes")
    .select("id, code, kind, value, min_spend_pence, per_customer_limit, first_order_only, global_limit, used_count, location_id, customer_id, starts_at, ends_at, is_active")
    .ilike("code", code)
    .maybeSingle();

  const invalid = { discountPence: 0, freesDelivery: false, code: null, promoId: null, error: "That promo code isn't valid." };
  if (!promo || !promo.is_active) return invalid;
  // F4: a personal voucher (customer_id set) is usable ONLY by its owner.
  if (promo.customer_id && promo.customer_id !== customerId) return invalid;
  // ... keep existing starts_at/ends_at/location/global_limit/min_spend checks ...
  // return branches now also include `promoId: promo.id as string`
}
```

Thread `customerId` from `priceCart(...)` into `applyPromo(...)`, and add `promoId` to the successful `PriceResult` (default `null` when no promo).

- [ ] **Step 2: Resolve customer + set customer_id + reserve (F4/F5) in createCheckout**

In `order/actions.ts`:

```ts
import { getCustomer } from "@/lib/auth/customer";
// ...
const customer = await getCustomer();          // null for guests
const customerId = customer?.userId ?? null;
const price = await priceCart(locationId, input.fulfilment, input.lines, input.promoCode, customerId);
if (!price.ok) return { ok: false, error: price.error };
```

Add `customer_id: customerId` to the `orders` insert object.

After the order + items are inserted, and BEFORE opening Stripe / confirming, reserve the promo atomically:

```ts
if (price.promoId) {
  const { error: reserveErr } = await supabase.rpc("reserve_promo", {
    p_promo_id: price.promoId, p_order_id: orderId, p_customer_id: customerId,
  });
  if (reserveErr) {
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("orders").delete().eq("id", orderId);
    return { ok: false, error: "That promo code can no longer be applied." };
  }
}
```

On the Stripe-session `catch` (currently `order/actions.ts:186-188`), release the reservation so an abandoned order doesn't consume the code:

```ts
} catch {
  await supabase.rpc("release_promo", { p_order_id: orderId });
  return { ok: false, error: "We couldn't reach the payment provider — please try again." };
}
```

- [ ] **Step 3: Stop the non-atomic increment (F5) in confirm.ts**

Delete the `claimed.promo_code` `used_count` read-then-write block (`confirm.ts:49-52`). The redemption row already exists from reserve. Add a trigger to keep the display counter correct:

```sql
-- 0022: keep promo_codes.used_count in sync with redemptions (display only).
create or replace function sync_promo_used_count() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update promo_codes p set used_count = (
    select count(*) from promo_redemptions r where r.promo_id = p.id
  ) where p.id = coalesce(new.promo_id, old.promo_id);
  return null;
end $$;
drop trigger if exists promo_redemptions_count on promo_redemptions;
create trigger promo_redemptions_count
  after insert or delete on promo_redemptions
  for each row execute function sync_promo_used_count();
revoke execute on function sync_promo_used_count() from public, anon, authenticated;
```

- [ ] **Step 4: Reverse on order cancel**

In `src/app/admin/_actions/orders.ts` (`setOrderStatus`, and the refund path in `refundOrder`), when an order moves to `cancelled`, call `release_promo`:

```ts
await supabase.rpc("release_promo", { p_order_id: orderId });
```

(Add only to the cancel branch; a `cancelled` order should free its code. Reversal of a *paid+cancelled* order is a manager action already gated by the existing refund flow.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → clean.
Run: `supabase test db` → all Phase A assertions still PASS.
Manual reasoning check documented in the PR: guest cannot apply a `BDAY-xxxx` personal code (owner mismatch → invalid); concurrent single-use reserve → one wins.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ordering/pricing.ts src/app/order/actions.ts src/lib/ordering/confirm.ts src/app/admin/_actions/orders.ts supabase/migrations/0022_security_batch2.sql
git commit -m "fix(F4,F5): owner-scope vouchers; reserve promo atomically at checkout; release on failure/cancel"
```

---

## Task A4: F7 — debit gift card before marking a fully-covered order paid

**Files:**
- Modify: `src/lib/giftcards/service.ts:159-182` (`debitGiftCard` returns success)
- Modify: `src/lib/ordering/confirm.ts:44-47` (use the boolean; no behaviour change for card orders)
- Modify: `src/app/order/actions.ts:169-173` (fully-covered path: debit first, confirm only on success)

**Interfaces:**
- Produces: `debitGiftCard(giftCardId, amountPence, orderId): Promise<{ ok: boolean; debitedPence: number }>` — `ok:false` when it could not debit the full requested amount (insufficient/lost race). Idempotent per `order_id` (a prior debit for the order returns `ok:true` with the already-debited amount).

- [ ] **Step 1: Make debitGiftCard report success**

Rewrite `debitGiftCard` to return `{ ok, debitedPence }`:
- If an existing redeem txn for `(giftCardId, orderId)` exists → return `{ ok: true, debitedPence: <that txn's amount> }` (idempotent).
- Read card; if not active → `{ ok: false, debitedPence: 0 }`.
- `amount = min(amountPence, balance)`; if `amount < amountPence` → cannot fully cover → `{ ok: false, debitedPence: 0 }` (do NOT partially debit for a fully-covered order).
- Optimistic update guarded on `balance_pence`; on 0 rows updated → `{ ok: false, debitedPence: 0 }`.
- On success insert the txn and return `{ ok: true, debitedPence: amount }`.

- [ ] **Step 2: Update confirm.ts caller (card + partial path unchanged)**

`confirm.ts:44-47` — keep calling `debitGiftCard` for the partial-balance redemption; ignore the boolean here (webhook path already claimed paid; this remains best-effort for partials). No functional change.

- [ ] **Step 3: Fully-covered path debits first (F7)**

In `order/actions.ts`, replace the `chargePence <= 0` block:

```ts
if (chargePence <= 0) {
  const debit = giftCardId
    ? await debitGiftCard(giftCardId, giftRedeem, orderId)
    : { ok: true, debitedPence: 0 };
  if (!debit.ok) {
    await supabase.rpc("release_promo", { p_order_id: orderId });
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    return { ok: false, error: "That gift card no longer covers the order — please try again." };
  }
  await confirmPaidOrder(orderId, { method: "gift_card", amountPence: debit.debitedPence, paymentIntent: null });
  return { ok: true, url: `${siteUrl()}/order/track/${order.track_token as string}?paid=1` };
}
```

Import `debitGiftCard` in `order/actions.ts`. `confirmPaidOrder`'s internal debit is now a no-op for this order (idempotent by `order_id`), so no double-debit.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → clean.
Reasoning check in PR: two orders fully covered by one card racing → the second `debitGiftCard` returns `ok:false` (optimistic guard / insufficient) → its order is cancelled, NOT marked paid. No free order.

- [ ] **Step 5: Commit**

```bash
git add src/lib/giftcards/service.ts src/lib/ordering/confirm.ts src/app/order/actions.ts
git commit -m "fix(F7): debit gift card before marking a fully-covered order paid; no free order on race"
```

---

## Task A5: F9 — fail-closed rate limiting for sensitive buckets

**Files:**
- Modify: `src/lib/ratelimit.ts` (add `failClosed` option)
- Modify: `src/app/order/actions.ts` (`checkout`, `gift-card-check` → `failClosed: true`)
- Modify: `src/app/admin/_actions/auth.ts` (admin login limiter → `failClosed: true`)
- Modify: `src/lib/ordering/pricing.ts` or the promo action path if a promo-specific limiter is added
- Create: `src/lib/ratelimit.test.ts` (vitest)
- Modify: `.env.example` (document `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

**Interfaces:**
- Produces: `rateLimit(bucket, { limit, windowSec, failClosed? })`. When `failClosed` is true, `NODE_ENV === "production"`, and Redis is not configured (or errors), returns `{ ok: false, retryAfter: windowSec }` instead of the in-memory best-effort path.

- [ ] **Step 1: Write the failing vitest**

```ts
// src/lib/ratelimit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Map([["x-real-ip", "1.2.3.4"]]) }));

describe("rateLimit failClosed", () => {
  beforeEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; });

  it("denies when Redis unset in production and failClosed=true", async () => {
    process.env.NODE_ENV = "production";
    const { rateLimit } = await import("./ratelimit");
    const r = await rateLimit("checkout-test", { limit: 10, windowSec: 60, failClosed: true });
    expect(r.ok).toBe(false);
  });

  it("allows (best-effort) when failClosed is not set", async () => {
    process.env.NODE_ENV = "production";
    const { rateLimit } = await import("./ratelimit");
    const r = await rateLimit("cosmetic-test", { limit: 10, windowSec: 60 });
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/ratelimit.test.ts`
Expected: FAIL — `failClosed` not implemented; first test gets `ok:true`.

- [ ] **Step 3: Implement failClosed**

In `ratelimit.ts`, extend the signature and the no-Redis branch:

```ts
export async function rateLimit(
  bucket: string,
  opts: { limit: number; windowSec: number; failClosed?: boolean },
): Promise<RateResult> {
  const ip = await clientIp();
  const rawKey = `rl:${bucket}:${ip}`;
  if (UPSTASH_URL && UPSTASH_TOKEN) return redisHit(rawKey, opts.limit, opts.windowSec);
  if (process.env.NODE_ENV === "production") {
    if (opts.failClosed) return { ok: false, retryAfter: opts.windowSec };
    if (!warnedNoRedis) { warnedNoRedis = true; console.warn("[ratelimit] Upstash not set — best-effort in-memory limiter."); }
  }
  return memHit(rawKey, opts.limit, opts.windowSec);
}
```

Also make `redisHit`'s error fallbacks respect `failClosed` (pass it down): on `!res.ok` / `catch`, if `failClosed` return `{ ok: false, retryAfter: windowSec }` instead of `memHit`.

- [ ] **Step 4: Set failClosed on sensitive callers**

- `order/actions.ts` `createCheckout` limiter → `{ limit: 10, windowSec: 60, failClosed: true }`.
- `order/actions.ts` `checkGiftCard` limiter → `failClosed: true`.
- `admin/_actions/auth.ts` login limiter → `failClosed: true`.

- [ ] **Step 5: Run tests + document env**

Run: `npx vitest run src/lib/ratelimit.test.ts` → PASS.
Add to `.env.example`:

```
# Rate limiting (REQUIRED in production — sensitive endpoints fail closed without it)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/ratelimit.ts src/lib/ratelimit.test.ts src/app/order/actions.ts src/app/admin/_actions/auth.ts .env.example
git commit -m "fix(F9): fail-closed rate limiting for checkout/gift-card/admin-login when Redis unavailable"
```

---

## Task A6: Phase A verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full pgTAP run on a real DB**

Run: `supabase test db` (Docker local or a staging DB)
Expected: `rls_batch1_test.sql` (F2/F3/F10 repro) AND `rls_batch2_test.sql` (F4/F5/F8) all PASS. If no local Docker, apply `0021`+`0022` to a **staging** Supabase and run there. **Do not proceed to Phase B until green.**

- [ ] **Step 2: Build + typecheck + unit**

Run: `npx tsc --noEmit && npm test && npx next build`
Expected: tsc exit 0; vitest PASS; build exit 0. ESLint no worse than baseline (145 problems).

- [ ] **Step 3: Record the gate in the PR**

Note pgTAP output, tsc/build/vitest results. This is the hard precondition for launch.

---

# PHASE B — Balham launch (branch picker + routing + guard)

## Task B1: Per-branch ordering provider model

**Files:**
- Modify: `src/data/locations.ts:7-24` (Branch type), `:75,:104,:133` (per-branch value)
- Modify: `src/lib/flags.ts` (add `orderHrefFor`, keep `ORDER_URL` for back-compat)
- Create: `src/lib/ordering/routing.ts` (single routing helper + `isInternalOrdering`)
- Create: `src/lib/ordering/routing.test.ts` (vitest)

**Interfaces:**
- Produces:
  - `Branch.ordering: { provider: "internal" | "external"; externalUrl?: string }` (replaces `orderingEnabled: boolean`).
  - `isInternalOrdering(slug: string): boolean` — true only for branches whose provider is `internal` AND the master flag is on.
  - `orderHrefFor(branch: Branch): { href: string; external: boolean }` — internal ⇒ `/order/menu?loc=<slug>`; external ⇒ its `externalUrl` (or `EXTERNAL_ORDER_URL`).
  - `ORDER_ENTRY_HREF: string` = `/order` when the master flag is on (branch picker), else `EXTERNAL_ORDER_URL`.

- [ ] **Step 1: Write failing vitest for routing**

```ts
// src/lib/ordering/routing.test.ts
import { describe, it, expect } from "vitest";
import { orderHrefFor, isInternalOrdering } from "./routing";
import { branchBySlug } from "@/data/locations";

describe("orderHrefFor", () => {
  it("routes Balham to the internal menu when the flag is on", () => {
    process.env.NEXT_PUBLIC_FEATURE_ORDERING = "true";
    const r = orderHrefFor(branchBySlug("balham")!);
    expect(r.external).toBe(false);
    expect(r.href).toBe("/order/menu?loc=balham");
  });
  it("routes Kilburn to the external locator", () => {
    const r = orderHrefFor(branchBySlug("kilburn")!);
    expect(r.external).toBe(true);
    expect(r.href).toContain("bombaybicyclechef.uk");
  });
  it("isInternalOrdering false for battersea", () => {
    expect(isInternalOrdering("battersea")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/ordering/routing.test.ts`
Expected: FAIL — `routing.ts` does not exist.

- [ ] **Step 3: Update the Branch type + data**

In `src/data/locations.ts`: replace `orderingEnabled: boolean;` with:

```ts
  ordering: { provider: "internal" | "external"; externalUrl?: string };
```

Balham → `ordering: { provider: "internal" }`. Battersea & Kilburn → `ordering: { provider: "external" }` (no `externalUrl` ⇒ falls back to `EXTERNAL_ORDER_URL`).

- [ ] **Step 4: Implement routing.ts**

```ts
// src/lib/ordering/routing.ts
import { flags, EXTERNAL_ORDER_URL } from "@/lib/flags";
import type { Branch } from "@/data/locations";
import { branchBySlug } from "@/data/locations";

export function isInternalOrdering(slug: string): boolean {
  if (!flags.ordering) return false;
  return branchBySlug(slug)?.ordering.provider === "internal";
}

export function orderHrefFor(branch: Branch): { href: string; external: boolean } {
  if (flags.ordering && branch.ordering.provider === "internal") {
    return { href: `/order/menu?loc=${branch.slug}`, external: false };
  }
  return { href: branch.ordering.externalUrl ?? EXTERNAL_ORDER_URL, external: true };
}
```

Add to `flags.ts`: `export const ORDER_ENTRY_HREF = flags.ordering ? "/order" : EXTERNAL_ORDER_URL;` (keep `ORDER_URL` exported for any not-yet-migrated caller).

- [ ] **Step 5: Fix compile fallout**

`npx tsc --noEmit` will flag every reader of `orderingEnabled`. Update them to `.ordering.provider === "internal"` (e.g. `/locations/[slug]/page.tsx`, SEO landings, any `reservable`-adjacent checks). Do NOT touch `reservable` — that stays a boolean.

- [ ] **Step 6: Verify + commit**

Run: `npx vitest run src/lib/ordering/routing.test.ts && npx tsc --noEmit` → PASS/clean.

```bash
git add src/data/locations.ts src/lib/flags.ts src/lib/ordering/routing.ts src/lib/ordering/routing.test.ts src/app/locations src/app/indian-restaurant-*
git commit -m "feat: per-branch ordering provider model + routing helper"
```

---

## Task B2: Branch picker entry page

**Files:**
- Modify: `src/app/order/page.tsx` (replace auto-redirect with the branch picker)
- Create: `src/components/order/BranchPicker.tsx`

**Interfaces:**
- Consumes: `BRANCHES` from `src/data/locations.ts`, `orderHrefFor` (B1), `getOrderLocations()` for live DB config.
- Produces: `/order` renders three branch cards; internal branch → `/order/menu?loc=<slug>`; external → new tab to the locator.

- [ ] **Step 1: Build the picker component**

`BranchPicker.tsx` — a server component listing `BRANCHES`. For each branch compute `orderHrefFor(branch)`. Internal cards use `<Link href>`; external cards use `<a href target="_blank" rel="noopener noreferrer">` with a small "external" affordance. Match the existing palette/typography (colors already used in `order/page.tsx`: bg `#F6F2EA`, maroon `#5D0925`, serif headings). Use the design skill (`frontend-design`) for the visual pass — cards with branch name, address, "Collection & delivery" (internal) vs "Order on our partner site" (external), and a clear CTA.

- [ ] **Step 2: Rewire /order**

Replace the auto-redirect in `order/page.tsx` with `<BranchPicker />`. Keep `export const dynamic = "force-dynamic"`. Keep the "unavailable" state as a fallback when NO branch is internal-orderable.

- [ ] **Step 3: Verify visually**

Run the app (hand to user — do not start servers yourself). Confirm `/order` shows three cards; Balham → menu, others → external tab.

- [ ] **Step 4: Commit**

```bash
git add src/app/order/page.tsx src/components/order/BranchPicker.tsx
git commit -m "feat: Order Online branch picker (Balham internal, others external)"
```

---

## Task B3: Point all Order-Online CTAs at the entry

**Files:**
- Modify: `src/components/Navbar.tsx:117,226`, `src/app/locations/[slug]/page.tsx:54,79`, Footer, `MenuCTA`, `DineInTakeaway`, home components — every consumer of `ORDER_URL` / hardcoded `/order`.

**Interfaces:**
- Consumes: `ORDER_ENTRY_HREF` (global CTAs) and `orderHrefFor(branch)` (branch-specific CTAs on a location page).

- [ ] **Step 1: Global CTAs → ORDER_ENTRY_HREF**

Replace `ORDER_URL` usages that mean "go order (choose a branch)" with `ORDER_ENTRY_HREF`.

- [ ] **Step 2: Branch-scoped CTAs → orderHrefFor(branch)**

On `/locations/[slug]` and SEO landings, the "Order Online" button should route that specific branch: internal → menu, external → locator (new tab). Use `orderHrefFor`.

- [ ] **Step 3: Grep for stragglers**

Run: `git grep -n "ORDER_URL\|/order\"" src` — confirm every hit is intentional (picker entry vs branch-scoped vs internal menu link).

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add -A
git commit -m "feat: route Order Online CTAs through the branch picker / per-branch helper"
```

---

## Task B4: Server-side guard — non-internal branches cannot order

**Files:**
- Modify: `src/app/order/menu/page.tsx` (block if `!isInternalOrdering(slug)`)
- Modify: `src/app/order/checkout/page.tsx` (same guard on the active cart's branch)
- Modify: `src/app/order/actions.ts` `priceCartAction` + `createCheckout` (reject non-internal slug server-side)

**Interfaces:**
- Consumes: `isInternalOrdering(slug)` (B1).
- Produces: a hand-typed `/order/menu?loc=battersea` or a forged `createCheckout({ locationSlug: "kilburn" })` is rejected before any DB order is created.

- [ ] **Step 1: Guard the menu route**

In `order/menu/page.tsx`, before rendering: `if (!isInternalOrdering(slug)) redirect("/order");` (slug comes from `searchParams.loc`).

- [ ] **Step 2: Guard checkout page**

In `order/checkout/page.tsx`, resolve the cart's branch slug (from the same source the page already uses) and `redirect("/order")` if not internal.

- [ ] **Step 3: Guard the server actions (authoritative)**

At the top of `priceCartAction` and `createCheckout` in `order/actions.ts`:

```ts
import { isInternalOrdering } from "@/lib/ordering/routing";
// ...
if (!isInternalOrdering(input.locationSlug)) {
  return { ok: false, error: "Online ordering isn't available for that location." };
}
```

Place it before pricing / order creation. This is the real boundary — the UI guards are convenience.

- [ ] **Step 4: DB alignment**

Confirm in Supabase that only Balham has `collection_enabled`/`delivery_enabled` = true; set Battersea/Kilburn false. Add/keep this in `supabase/seed_ordering.sql` so a fresh DB matches. `getOrderLocations()` then lists only Balham as orderable — the second gate.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → clean. Manual: typed `?loc=battersea` → redirected to `/order`; `createCheckout` with `locationSlug:"kilburn"` → error, no order row.

- [ ] **Step 6: Commit**

```bash
git add src/app/order/menu/page.tsx src/app/order/checkout/page.tsx src/app/order/actions.ts supabase/seed_ordering.sql
git commit -m "feat: hard-block non-internal branches at order routes + server actions + DB config"
```

---

## Task B5: Launch verification + go-live checklist

**Files:**
- Create: `docs/superpowers/plans/2026-08-27-balham-launch-checklist.md` (living checklist)

- [ ] **Step 1: Full build gate**

Run: `npx tsc --noEmit && npm test && npx next build` → all clean/PASS; ESLint no worse than baseline.

- [ ] **Step 2: Manual smoke (staging, flag ON, Stripe test mode)**

- Balham collection order (guest) → Stripe test card → webhook → order in `/admin` kitchen + `/order/track/<token>`.
- Balham delivery order to a served postcode (logged-in) → `orders.customer_id` set → loyalty earns once.
- Apply a valid public promo → discount; apply another customer's `BDAY-` code → rejected.
- Fully gift-card-covered order → paid; second concurrent attempt on a drained card → rejected, no free order.
- Battersea + Kilburn "Order Online" → external locator (new tab). Typed `?loc=battersea` → blocked.

- [ ] **Step 3: Dashboard checks (not visible in code)**

Supabase Auth: email confirmation, password policy, leaked-password protection, allowed redirect URLs. Storage buckets (if any) policies. Rotate `BREVO_API_KEY`. Confirm `UPSTASH_REDIS_*` set in prod (else checkout fails closed).

- [ ] **Step 4: Go-live**

Deploy code (flag OFF) → apply `0021` + `0022` to production (explicit approval; `supabase db push` or SQL editor) → smoke on production with flag still OFF where possible → flip `NEXT_PUBLIC_FEATURE_ORDERING=true`. Rollback = flip flag OFF (instant; all branches external again).

- [ ] **Step 5: Commit checklist**

```bash
git add docs/superpowers/plans/2026-08-27-balham-launch-checklist.md
git commit -m "docs: Balham launch verification + go-live checklist"
```

---

## Self-review notes

- **Spec coverage:** F4→A3, F5→A2+A3, F7→A4, F8→A1, F9→A5; routing→B1, picker→B2, CTAs→B3, guard+DB→B4, verify/deploy→A6+B5. All spec sections mapped.
- **Sequencing:** Phase A gate (A6) blocks Phase B; master flag stays OFF until B5 go-live. Matches "security first."
- **Type consistency:** `orderHrefFor`/`isInternalOrdering` names stable across B1–B4; `debitGiftCard` new return type updated at both call sites (A4); `priceCart`/`applyPromo` gain `customerId`+`promoId` consistently (A3).
- **Known limitation:** pgTAP + vitest cover DB guarantees and pure functions; Supabase-coupled server actions (createCheckout race paths) are verified by reasoning + staging smoke, not an automated integration test — called out in A3/A4/B5.
