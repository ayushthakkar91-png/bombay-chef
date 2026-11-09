# Sunmi POS → Bombay Bicycle Chef Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing native Android/Kotlin Sunmi POS app (currently pointed at a Node/Mongo backend `api.americanpizzza.com`) to the Bombay Bicycle Chef backend (Next.js + Supabase), so paid BBC orders auto-print kitchen tickets and staff can accept/ready them from the terminal — while fixing the app's security issues.

**Architecture:** The **backend adapts to the app's existing REST contract** (login→token, poll, printed, status, devices/register) so the battle-tested app changes minimally. New `/api/pos/*` Next.js routes read/write the existing Supabase `orders` table, authenticated with Supabase Auth JWTs and gated by `staff_roles`. BBC's pence/modifiers/fulfilment schema is mapped to the app's pounds/toppings/orderType JSON **server-side**. A new FCM channel on the existing notifications outbox pushes new-order wakes (config-gated; app falls back to 5s polling without it). The app is rebranded, repointed, and hardened (no cleartext, encrypted token storage, refresh-token instead of stored password, backup exclusions).

**Tech Stack:** Next.js 16 App Router (route handlers), Supabase (Auth password grant + service client + Postgres/RLS), Kotlin/Jetpack Compose, OkHttp, Firebase Cloud Messaging (HTTP v1), Sunmi printer AIDL.

**Spec:** This plan is self-contained (design settled in-conversation 2026-09-02). Source app: `pos-app/` (package `com.example.newmilano`). Backend: BBC repo root.

## Global Constraints

- **Money:** BBC stores integer **pence**; the app expects **pounds as Double**. Every money field in a POS response is `pence / 100` (a Double). Never send pence to the app.
- **Auth:** All `/api/pos/*` routes except `auth/login` and `auth/refresh` require a valid Supabase access-token JWT in `Authorization: Bearer <jwt>` AND a `staff_roles` grant of at least `staff` for the order's/target location. Login and refresh are rate-limited (`failClosed: true`).
- **Source of truth:** Supabase `orders` is authoritative. The POS never sets money or creates orders; it only reads live orders and drives status/printed flags. Status transitions MUST validate against `ORDER_TRANSITIONS` from `src/lib/ordering/constants.ts`.
- **Status vocabulary mapping (backend-owned):** BBC→app on read: `paid→"pending"`, `accepted|preparing→"preparing"`, `ready_for_collection|out_for_delivery→"ready"`, others→`"ready"`. App→BBC on write: `"preparing"→accepted`, `"ready"→ready_for_collection` (collection) or `out_for_delivery` (delivery).
- **Live orders:** the poll returns orders whose status ∈ `LIVE_STATUSES` for the location, newest first.
- **Config-gating:** Missing Stripe/FCM/etc. env never crashes a route — it degrades (skip FCM, still poll). Follow the existing `if (!X) return`/best-effort pattern.
- **Branch discipline:** all work on `site-updates`; do not merge to `main` until the user says. Ordering stays OFF (`NEXT_PUBLIC_FEATURE_ORDERING`) — the POS is testable independently with a manually-seeded paid order.
- **Package rename:** `com.example.newmilano` → `com.bombaybicyclechef.pos` (applicationId already `com.americanpizza.pos` → change to `com.bombaybicyclechef.pos`).

---

## File Structure

**Backend (new):**
- `supabase/migrations/0025_pos.sql` — `pos_devices` table; `orders.printed_at/print_failed_at/print_error` columns; allow `fcm` in `notifications.channel`.
- `src/lib/pos/auth.ts` — POS token issue/refresh (Supabase password + refresh grant) + `verifyPosRequest()` (JWT→staff context for a location).
- `src/lib/pos/mapping.ts` — `orderToPosJson()` (BBC row → app JSON), `appStatusToBbc()`, `bbcStatusToApp()`.
- `src/lib/pos/orders.ts` — `listLiveOrdersForPos()`, `markPrinted()`, `markPrintFailed()`, `updateOrderStatusPos()`.
- `src/lib/pos/devices.ts` — `registerDevice()`.
- `src/lib/notifications/fcm.ts` — FCM HTTP v1 sender (`sendFcmData`) + `isFcmConfigured()`.
- `src/lib/notifications/fcm-dispatch.ts` — `dispatchFcmDue()` (outbox worker, mirrors telegram-dispatch).
- `src/lib/ordering/fcm-notify.ts` — `enqueueOrderFcm(orderId)` (producer).
- `src/app/api/pos/auth/login/route.ts`, `src/app/api/pos/auth/refresh/route.ts`
- `src/app/api/pos/orders/poll/[loc]/route.ts`
- `src/app/api/pos/orders/[id]/printed/route.ts`, `.../print-failed/route.ts`, `.../status/route.ts`
- `src/app/api/pos/devices/register/route.ts`

**Backend (modified):**
- `src/lib/ordering/confirm.ts` — enqueue FCM alongside Telegram; dispatch after response.
- `src/app/api/webhooks/stripe/route.ts` — `after(dispatchFcmDue)` alongside telegram.
- `src/app/api/cron/notifications/route.ts` — also call `dispatchFcmDue`.
- `src/lib/pos/events.ts` extension OR reuse `recordOrderEvent` with new event types (`POS_PRINTED`, `POS_PRINT_FAILED`).

**App (modified):** package/dir rename to `com/bombaybicyclechef/pos`; `SERVER_URL` → `BuildConfig` field; `AndroidManifest.xml` (cleartext off, backup exclusions); `SecureCreds.kt` (store refresh token); `OrderPrintService.reauth()` (use refresh endpoint); `strings.xml`/`Color.kt`/logo; `app/build.gradle.kts` (applicationId, targetSdk, buildConfigField); `app/google-services.json` (BBC Firebase); `res/xml/backup_rules.xml` + `data_extraction_rules.xml` (exclude cred prefs); `Format.kt` (already matches `deliveryAddress{street,city,postalCode}` — verify only).

---

## Phase 0 — Database

### Task 1: POS schema migration

**Files:**
- Create: `supabase/migrations/0025_pos.sql`

**Interfaces:**
- Produces: table `pos_devices(id, fcm_token unique, location_id, profile_id, device_name, device_model, last_seen_at, created_at)`; columns `orders.printed_at timestamptz`, `orders.print_failed_at timestamptz`, `orders.print_error text`; `notifications.channel` accepts `'fcm'`.

- [ ] **Step 1: Write the migration**

```sql
-- 0025_pos.sql — Sunmi POS support: device registry, print flags, fcm channel.

-- Print tracking on orders (the POS marks these; poll derives isPrinted).
alter table orders add column if not exists printed_at      timestamptz;
alter table orders add column if not exists print_failed_at timestamptz;
alter table orders add column if not exists print_error     text;

-- Device registry for FCM new-order pushes.
create table if not exists pos_devices (
  id           uuid primary key default gen_random_uuid(),
  fcm_token    text unique not null,
  location_id  uuid not null references locations(id) on delete cascade,
  profile_id   uuid references profiles(id) on delete set null,
  device_name  text,
  device_model text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists pos_devices_loc_idx on pos_devices(location_id);
alter table pos_devices enable row level security;
-- Writes/reads are service-role only (the POS routes use the service client
-- AFTER verifying the staff JWT). No public policy = deny by default.

-- Allow the 'fcm' channel on the notifications outbox.
-- The channel column is a text check constraint added in an earlier migration;
-- drop+recreate to include 'fcm'. Adjust the list if your constraint differs.
do $$
begin
  if exists (select 1 from information_schema.constraint_column_usage
             where table_name = 'notifications' and column_name = 'channel') then
    alter table notifications drop constraint if exists notifications_channel_check;
  end if;
end $$;
alter table notifications
  add constraint notifications_channel_check
  check (channel in ('email','sms','telegram','fcm'));
```

- [ ] **Step 2: Apply locally / verify columns exist**

Run (user applies to their Supabase, per project convention — migrations are NOT auto-applied):
```
-- in Supabase SQL editor or psql:
\d pos_devices
\d orders   -- confirm printed_at, print_failed_at, print_error
```
Expected: `pos_devices` exists; the three `orders` columns present; inserting a `notifications` row with `channel='fcm'` succeeds.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0025_pos.sql
git commit -m "feat(pos): schema — pos_devices, order print flags, fcm channel"
```

> **NOTE for executor:** Verify the real name of the existing `notifications.channel` check constraint first (`\d notifications`); the `drop constraint if exists notifications_channel_check` assumes that name. If the constraint has a different name, use it. If `channel` has no check constraint (free text), the whole `do $$ … alter table … add constraint` block can be omitted.

---

## Phase 1 — Backend auth + mapping libraries

### Task 2: POS auth (`src/lib/pos/auth.ts`)

**Files:**
- Create: `src/lib/pos/auth.ts`
- Reference: `src/lib/supabase/clients.ts` (`getServiceClient`), `src/lib/auth/roles.ts` (`roleAtLeast`)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service client.
- Produces:
  - `posLogin(email, password): Promise<{ token, refreshToken, expiresAt } | { error }>`
  - `posRefresh(refreshToken): Promise<{ token, refreshToken, expiresAt } | { error }>`
  - `verifyPosRequest(req: Request, locationId?: string): Promise<{ userId, grants } | null>` — validates the Bearer JWT via Supabase and returns the staff context iff the user holds ≥ `staff` (org-wide grant satisfies any location; when `locationId` is passed, a location-scoped grant must match it). Returns `null` on any failure.

- [ ] **Step 1: Implement**

```typescript
import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/clients";
import { roleAtLeast, type Role, type StaffGrant } from "@/lib/auth/roles";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Tokens = { token: string; refreshToken: string; expiresAt: number };

/** Password grant against Supabase Auth, then require a staff role. */
export async function posLogin(email: string, password: string): Promise<Tokens | { error: string }> {
  if (!url || !anonKey) return { error: "Auth not configured." };
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return { error: "Invalid credentials." };

  const grants = await staffGrantsFor(data.user.id);
  if (!roleAtLeast(grants, "staff")) return { error: "Not a staff account." };

  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
  };
}

/** Exchange a refresh token for a fresh session (POS auto-reauth). */
export async function posRefresh(refreshToken: string): Promise<Tokens | { error: string }> {
  if (!url || !anonKey) return { error: "Auth not configured." };
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return { error: "Session expired." };
  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
  };
}

/** Validate a Bearer access token and return the staff context, or null. */
export async function verifyPosRequest(
  req: Request,
  locationId?: string,
): Promise<{ userId: string; grants: StaffGrant[] } | null> {
  if (!url || !anonKey) return null;
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;

  // Validate the JWT by asking Supabase who it belongs to (checks signature+expiry).
  const scoped = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error } = await scoped.auth.getUser();
  if (error || !user) return null;

  const grants = await staffGrantsFor(user.id);
  if (!roleAtLeast(grants, "staff", locationId ?? null)) return null;
  return { userId: user.id, grants };
}

async function staffGrantsFor(userId: string): Promise<StaffGrant[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("staff_roles").select("role, location_id").eq("profile_id", userId);
  return (data ?? []).map((r) => ({ role: r.role as Role, locationId: (r.location_id as string | null) ?? null }));
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pos/auth.ts
git commit -m "feat(pos): Supabase-backed POS auth (login/refresh/verify)"
```

### Task 3: Order + status mapping (`src/lib/pos/mapping.ts`)

**Files:**
- Create: `src/lib/pos/mapping.ts`
- Reference: `src/lib/ordering/constants.ts` (`OrderStatus`, `Fulfilment`, `ORDER_TRANSITIONS`), app field names from `pos-app/.../Format.kt` + `MainActivity.kt`.

**Interfaces:**
- Consumes: a BBC order row + its `order_items` rows.
- Produces:
  - `bbcStatusToApp(s: OrderStatus): "pending" | "preparing" | "ready"`
  - `appStatusToBbc(appStatus: string, fulfilment: Fulfilment): OrderStatus | null`
  - `orderToPosJson(order, items): Record<string, unknown>` — the exact JSON the app parses.

- [ ] **Step 1: Implement**

```typescript
import "server-only";

import type { Fulfilment, OrderStatus } from "@/lib/ordering/constants";

const money = (pence: number | null | undefined) => (pence ?? 0) / 100;

export function bbcStatusToApp(s: OrderStatus): "pending" | "preparing" | "ready" {
  switch (s) {
    case "paid": return "pending";
    case "accepted":
    case "preparing": return "preparing";
    case "ready_for_collection":
    case "out_for_delivery": return "ready";
    default: return "ready";
  }
}

/** Map an app status button to the BBC target status. Returns null if unknown. */
export function appStatusToBbc(appStatus: string, fulfilment: Fulfilment): OrderStatus | null {
  if (appStatus === "preparing") return "accepted"; // ACCEPT button
  if (appStatus === "ready") return fulfilment === "delivery" ? "out_for_delivery" : "ready_for_collection";
  return null;
}

type OrderItemRow = {
  name: string;
  qty: number;
  line_total_pence: number;
  notes: string | null;
  modifiers: { name: string }[] | null;
};

type OrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  contact_name: string | null;
  total_pence: number;
  subtotal_pence: number;
  delivery_fee_pence: number;
  discount_pence: number;
  promo_code: string | null;
  notes: string | null;
  delivery_address: Record<string, string> | null;
  placed_at: string | null;
  created_at: string;
  printed_at: string | null;
};

/** BBC order → the JSON shape the Kotlin app already parses. Money in pounds. */
export function orderToPosJson(order: OrderRow, items: OrderItemRow[]): Record<string, unknown> {
  const a = order.delivery_address ?? {};
  return {
    _id: order.id,
    orderNumber: order.code,
    customerName: order.contact_name ?? "Guest",
    totalPrice: money(order.total_pence),
    status: bbcStatusToApp(order.status),
    isPrinted: order.printed_at != null,
    paymentStatus: "paid", // POS only ever sees paid orders
    orderType: order.fulfilment, // "collection" | "delivery" — app's isDelivery() matches
    createdAt: order.placed_at ?? order.created_at,
    subtotal: money(order.subtotal_pence),
    deliveryFee: money(order.delivery_fee_pence),
    discount: money(order.discount_pence),
    promoCode: order.promo_code ?? "",
    specialInstructions: order.notes ?? "",
    deliveryAddress: order.fulfilment === "delivery" ? {
      street: [a.line1, a.line2].filter(Boolean).join(", "),
      city: a.city ?? "",
      postalCode: a.postcode ?? "",
      notes: "",
    } : null,
    orderItems: items.map((it) => ({
      quantity: it.qty,
      productName: it.name,
      price: money(it.line_total_pence),
      specialInstructions: it.notes ?? "",
      // BBC modifiers → the app's "selectedToppings" line ("+ a, b" on receipt).
      selectedToppings: (it.modifiers ?? []).map((m) => ({ name: m.name, quantity: 1 })),
    })),
  };
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → no errors.
- [ ] **Step 3: Commit**

```bash
git add src/lib/pos/mapping.ts
git commit -m "feat(pos): BBC↔app order + status mapping"
```

### Task 4: POS order operations (`src/lib/pos/orders.ts`)

**Files:**
- Create: `src/lib/pos/orders.ts`
- Reference: `src/lib/ordering/constants.ts` (`LIVE_STATUSES`, `ORDER_TRANSITIONS`), `src/lib/ordering/events.ts` (`recordOrderEvent` — add types in Task 4a).

**Interfaces:**
- Produces:
  - `listLiveOrdersForPos(locationId): Promise<Record<string, unknown>[]>` (array of app-JSON orders)
  - `markPrinted(orderId, locationId): Promise<boolean>`
  - `markPrintFailed(orderId, locationId, error): Promise<boolean>`
  - `updateOrderStatusPos(orderId, locationId, appStatus): Promise<{ ok: boolean; error?: string }>`

- [ ] **Step 0 (Task 4a): Add POS event types**

In `src/lib/ordering/events.ts`, extend the `OrderEventType` union with:
```typescript
  | "POS_PRINTED"
  | "POS_PRINT_FAILED"
  | "POS_STATUS_CHANGED";
```

- [ ] **Step 1: Implement `src/lib/pos/orders.ts`**

```typescript
import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { LIVE_STATUSES, ORDER_TRANSITIONS, type Fulfilment, type OrderStatus } from "@/lib/ordering/constants";
import { recordOrderEvent } from "@/lib/ordering/events";
import { orderToPosJson, appStatusToBbc } from "./mapping";

const ORDER_COLS =
  "id, code, status, fulfilment, contact_name, total_pence, subtotal_pence, delivery_fee_pence, discount_pence, promo_code, notes, delivery_address, placed_at, created_at, printed_at";

export async function listLiveOrdersForPos(locationId: string): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data: orders } = await supabase
    .from("orders")
    .select(ORDER_COLS)
    .eq("location_id", locationId)
    .in("status", LIVE_STATUSES)
    .order("placed_at", { ascending: false })
    .limit(100);
  if (!orders?.length) return [];

  const ids = orders.map((o) => o.id as string);
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, name, qty, line_total_pence, notes, modifiers")
    .in("order_id", ids);

  const byOrder = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const arr = byOrder.get(it.order_id as string) ?? [];
    arr.push(it);
    byOrder.set(it.order_id as string, arr);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return orders.map((o: any) => orderToPosJson(o, (byOrder.get(o.id) ?? []) as any));
}

/** Confirm the order is at this location before any POS write (auth already
 *  proved the caller is staff for this location). */
async function orderAtLocation(orderId: string, locationId: string): Promise<{ status: OrderStatus; fulfilment: Fulfilment } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("orders").select("status, fulfilment").eq("id", orderId).eq("location_id", locationId).maybeSingle();
  return data ? { status: data.status as OrderStatus, fulfilment: data.fulfilment as Fulfilment } : null;
}

export async function markPrinted(orderId: string, locationId: string): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  if (!(await orderAtLocation(orderId, locationId))) return false;
  await supabase.from("orders").update({ printed_at: new Date().toISOString(), print_error: null }).eq("id", orderId);
  await recordOrderEvent(orderId, "POS_PRINTED", {});
  return true;
}

export async function markPrintFailed(orderId: string, locationId: string, error: string): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  if (!(await orderAtLocation(orderId, locationId))) return false;
  await supabase.from("orders")
    .update({ print_failed_at: new Date().toISOString(), print_error: error.slice(0, 300) })
    .eq("id", orderId);
  await recordOrderEvent(orderId, "POS_PRINT_FAILED", { error: error.slice(0, 300) });
  return true;
}

export async function updateOrderStatusPos(orderId: string, locationId: string, appStatus: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };
  const cur = await orderAtLocation(orderId, locationId);
  if (!cur) return { ok: false, error: "Order not found." };

  const target = appStatusToBbc(appStatus, cur.fulfilment);
  if (!target) return { ok: false, error: "Unknown status." };
  if (!ORDER_TRANSITIONS[cur.status]?.includes(target)) {
    return { ok: false, error: `Can't move a ${cur.status} order to ${target}.` };
  }
  const { error } = await supabase.from("orders").update({ status: target }).eq("id", orderId).eq("status", cur.status);
  if (error) return { ok: false, error: "Update failed." };
  await recordOrderEvent(orderId, "POS_STATUS_CHANGED", { from: cur.status, to: target, via: "pos" });
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`.
- [ ] **Step 3: Commit**

```bash
git add src/lib/pos/orders.ts src/lib/ordering/events.ts
git commit -m "feat(pos): live-order list, printed/failed marks, status update"
```

### Task 5: Device registry (`src/lib/pos/devices.ts`)

**Files:**
- Create: `src/lib/pos/devices.ts`

**Interfaces:**
- Produces: `registerDevice(params: { fcmToken, locationId, profileId, deviceName, deviceModel }): Promise<boolean>` — upsert on `fcm_token`.

- [ ] **Step 1: Implement**

```typescript
import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

export async function registerDevice(params: {
  fcmToken: string;
  locationId: string;
  profileId: string;
  deviceName?: string;
  deviceModel?: string;
}): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase || !params.fcmToken) return false;
  const { error } = await supabase.from("pos_devices").upsert(
    {
      fcm_token: params.fcmToken,
      location_id: params.locationId,
      profile_id: params.profileId,
      device_name: params.deviceName ?? null,
      device_model: params.deviceModel ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "fcm_token" },
  );
  return !error;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/lib/pos/devices.ts
git commit -m "feat(pos): device registry upsert"
```

---

## Phase 2 — Backend route handlers

> All routes: `export const dynamic = "force-dynamic";`. Resolve `locationId` from the `[loc]` slug (or `restaurantId` in the body → map to the BBC Balham location id). Because American Pizza used numeric `restaurantId=1`, the POS build will send a **location slug** after Task 12; until then, accept a slug. Provide a helper `locationIdFromSlug(slug)` (copy the one in `src/app/order/actions.ts:20`).

### Task 6: Auth routes

**Files:**
- Create: `src/app/api/pos/auth/login/route.ts`, `src/app/api/pos/auth/refresh/route.ts`
- Reference: `src/lib/ratelimit.ts` (`rateLimit`), `src/lib/pos/auth.ts`

**Interfaces:**
- `POST /api/pos/auth/login` body `{email,password}` → `200 {token, refreshToken, expiresAt}` | `401 {error}`
- `POST /api/pos/auth/refresh` body `{refreshToken}` → same shape.

- [ ] **Step 1: login route**

```typescript
import { NextResponse } from "next/server";
import { posLogin } from "@/lib/pos/auth";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await rateLimit("pos-login", { limit: 10, windowSec: 60, failClosed: true })).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Email and password required." }, { status: 400 });

  const result = await posLogin(body.email.trim(), body.password);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json(result);
}
```

- [ ] **Step 2: refresh route**

```typescript
import { NextResponse } from "next/server";
import { posRefresh } from "@/lib/pos/auth";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await rateLimit("pos-refresh", { limit: 30, windowSec: 60, failClosed: true })).ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { refreshToken?: string } | null;
  if (!body?.refreshToken) return NextResponse.json({ error: "refreshToken required." }, { status: 400 });
  const result = await posRefresh(body.refreshToken);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Manual test + commit**

Manual (after `npm run dev`, with a real staff Supabase user):
```
curl -sX POST localhost:3000/api/pos/auth/login -H 'content-type: application/json' \
  -d '{"email":"staff@example.com","password":"..."}'
```
Expected: `{token, refreshToken, expiresAt}` for a staff user; `401 {"error":"Not a staff account."}` for a non-staff user; `401 {"error":"Invalid credentials."}` for wrong password.

```bash
git add src/app/api/pos/auth
git commit -m "feat(pos): auth login + refresh routes (rate-limited)"
```

### Task 7: Poll route

**Files:**
- Create: `src/app/api/pos/orders/poll/[loc]/route.ts`
- Reference: `src/lib/pos/auth.ts`, `src/lib/pos/orders.ts`, `locationIdFromSlug`

**Interfaces:**
- `GET /api/pos/orders/poll/{loc}` (Bearer) → `200 {orders:[…app JSON…]}` | `401`

- [ ] **Step 1: Implement**

```typescript
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/clients";
import { verifyPosRequest } from "@/lib/pos/auth";
import { listLiveOrdersForPos } from "@/lib/pos/orders";

export const dynamic = "force-dynamic";

async function locationIdFromSlug(slug: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("locations").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data ? (data.id as string) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ loc: string }> }) {
  const { loc } = await params;
  const locationId = await locationIdFromSlug(loc);
  if (!locationId) return NextResponse.json({ error: "Unknown location." }, { status: 404 });

  const ctx = await verifyPosRequest(request, locationId);
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const orders = await listLiveOrdersForPos(locationId);
  return NextResponse.json({ orders });
}
```

- [ ] **Step 2: Manual test** — with a seeded paid Balham order: `curl -H "Authorization: Bearer <token>" localhost:3000/api/pos/orders/poll/balham` → `{orders:[{_id,orderNumber,totalPrice,…}]}`. Without token → 401.
- [ ] **Step 3: Commit** — `git commit -m "feat(pos): live-orders poll route"`

### Task 8: Printed / print-failed / status routes

**Files:**
- Create: `src/app/api/pos/orders/[id]/printed/route.ts`, `.../print-failed/route.ts`, `.../status/route.ts`

> **Auth note:** these routes take an order `id`, not a location slug. Verify the JWT is staff **for that order's location**: load the order's `location_id` (service client), then `verifyPosRequest(request, locationId)`. The `markPrinted`/`updateOrderStatusPos` helpers re-check `location_id` as defence-in-depth.

- [ ] **Step 1: shared helper** — add to each route (or a tiny `src/lib/pos/route-helpers.ts`):

```typescript
import { getServiceClient } from "@/lib/supabase/clients";
export async function locationOfOrder(orderId: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("orders").select("location_id").eq("id", orderId).maybeSingle();
  return data ? (data.location_id as string) : null;
}
```

- [ ] **Step 2: printed route** (`PATCH`)

```typescript
import { NextResponse } from "next/server";
import { verifyPosRequest } from "@/lib/pos/auth";
import { markPrinted } from "@/lib/pos/orders";
import { locationOfOrder } from "@/lib/pos/route-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationId = await locationOfOrder(id);
  if (!locationId) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await verifyPosRequest(request, locationId))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const ok = await markPrinted(id, locationId);
  return NextResponse.json({ ok });
}
```

- [ ] **Step 3: print-failed route** (`PATCH`, body `{error}`) — same guard, then `markPrintFailed(id, locationId, body.error ?? "")`.
- [ ] **Step 4: status route** (`PUT`, body `{status}`) — same guard, then:

```typescript
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  if (!body?.status) return NextResponse.json({ error: "status required." }, { status: 400 });
  const result = await updateOrderStatusPos(id, locationId, body.status);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
```

- [ ] **Step 5: Manual test** each (printed sets `printed_at`; status ACCEPT `"preparing"`→BBC `accepted`; illegal transition → 409). Then commit:

```bash
git add src/app/api/pos/orders/[id] src/lib/pos/route-helpers.ts
git commit -m "feat(pos): printed / print-failed / status routes"
```

### Task 9: Device register route

**Files:**
- Create: `src/app/api/pos/devices/register/route.ts`

**Interfaces:**
- `POST /api/pos/devices/register` (Bearer) body `{fcmToken, restaurantId | locationSlug, deviceName, deviceModel}` → `{ok}`

- [ ] **Step 1: Implement** — resolve location: prefer `locationSlug`; if the app still sends numeric `restaurantId`, map `1 → "balham"` via a constant `POS_RESTAURANT_TO_SLUG = { "1": "balham" }` (removed after Task 12). Verify JWT for that location, then `registerDevice({ fcmToken, locationId, profileId: ctx.userId, deviceName, deviceModel })`.
- [ ] **Step 2: Manual test + commit** — `git commit -m "feat(pos): device registration route"`

---

## Phase 3 — FCM push (config-gated)

### Task 10: FCM sender + dispatcher + producer

**Files:**
- Create: `src/lib/notifications/fcm.ts`, `src/lib/notifications/fcm-dispatch.ts`, `src/lib/ordering/fcm-notify.ts`
- Modify: `src/lib/ordering/confirm.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/cron/notifications/route.ts`
- Reference: `src/lib/notifications/telegram-dispatch.ts` (mirror its claim/retry/backoff), `src/lib/ordering/telegram-notify.ts` (mirror `enqueueOrderTelegram`).

**Env (new):** `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (service-account; from the BBC Firebase project). `isFcmConfigured()` = all three present.

**Interfaces:**
- `isFcmConfigured(): boolean`
- `sendFcmData(tokens: string[], data: Record<string,string>): Promise<{ sent: number; invalidTokens: string[] }>` — FCM HTTP v1, OAuth2 via the service account (mint a JWT → exchange for an access token; cache the token ~55 min). Send `data`-only messages (high priority) so `MilanoFcmService.onMessageReceived` fires.
- `dispatchFcmDue(limit?): Promise<{ sent; failed }>` — outbox worker for `channel='fcm'`; on send, prune `invalidTokens` from `pos_devices`.
- `enqueueOrderFcm(orderId): Promise<void>` — enqueue one `fcm` notification per new paid order, `to_address` = the location's device tokens (store token list in `payload.tokens`, `to_address='fcm'` placeholder), `payload.data = { action: "PRINT_ORDER", orderId, code }`.

- [ ] **Step 1: `fcm.ts`** — implement OAuth2 + HTTP v1 send. Use `crypto` to sign the service-account JWT (RS256) → POST `https://oauth2.googleapis.com/token` → bearer → POST `https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send` per token. Treat HTTP 404/`UNREGISTERED` as an invalid token. Guard everything behind `isFcmConfigured()`.

- [ ] **Step 2: `fcm-dispatch.ts`** — copy `telegram-dispatch.ts` structure; select `channel='fcm'`, claim queued→sending, call `sendFcmData(payload.tokens, payload.data)`, mark sent/failed with the same backoff, and `delete from pos_devices where fcm_token in (invalidTokens)`.

- [ ] **Step 3: `fcm-notify.ts`** — `enqueueOrderFcm`: load the order's `location_id`, gather `pos_devices.fcm_token` for that location; if none, no-op. Insert a `notifications` row `{channel:'fcm', template:'order_fcm', to_address:'fcm', payload:{tokens, data:{action:"PRINT_ORDER", orderId, code}}, status:'queued', order_id}`.

- [ ] **Step 4: wire producer** — in `confirm.ts` after `enqueueOrderTelegram(orderId)` add `await enqueueOrderFcm(orderId);`.

- [ ] **Step 5: wire dispatch** — in `webhooks/stripe/route.ts` change the `after` to also dispatch FCM: `if (ok) after(() => { dispatchTelegramDue(); dispatchFcmDue(); });`. In `cron/notifications/route.ts` add `const fcm = await dispatchFcmDue(50);` and include in the response.

- [ ] **Step 6: Typecheck + commit** — `npx tsc --noEmit`; then:

```bash
git add src/lib/notifications/fcm.ts src/lib/notifications/fcm-dispatch.ts src/lib/ordering/fcm-notify.ts src/lib/ordering/confirm.ts src/app/api/webhooks/stripe/route.ts src/app/api/cron/notifications/route.ts
git commit -m "feat(pos): FCM new-order push via outbox (config-gated)"
```

> **NOTE:** With FCM env unset, `enqueueOrderFcm` still enqueues if devices exist but `dispatchFcmDue` no-ops on `!isFcmConfigured()` — rows stay queued harmlessly. Prefer: `enqueueOrderFcm` early-returns when `!isFcmConfigured()`. Add that guard.

---

## Phase 4 — App rebrand, repoint, security hardening

> The app is a git repo of its own under `pos-app/` (has `.idea`, `.gradle`). Commit app changes with `pos:` prefix. These tasks need Android Studio / Gradle to fully verify a build; where a full build isn't run, at least confirm the files compile-clean by inspection and that `./gradlew :app:assembleDebug` is the verification command.

### Task 11: Package + brand rename

**Files:**
- Move: `app/src/main/java/com/example/newmilano/**` → `app/src/main/java/com/bombaybicyclechef/pos/**` (update every `package com.example.newmilano` → `package com.bombaybicyclechef.pos`, and `com.example.newmilano.ui.theme` → `com.bombaybicyclechef.pos.ui.theme`).
- Modify: `app/build.gradle.kts` (`namespace = "com.bombaybicyclechef.pos"`, `applicationId = "com.bombaybicyclechef.pos"`).
- Modify: `app/src/main/AndroidManifest.xml` (component names auto-follow package via `.MainActivity` relative names — keep the leading dot; the `ACTION_*` string constants `com.example.newmilano.*` → `com.bombaybicyclechef.pos.*`).
- Modify: `res/values/strings.xml` (`app_name` → `Bombay Bicycle Chef POS`), dashboard/login header strings (`"AMERICAN PIZZA"`, `"American Pizza"`, `KITCHEN TERMINAL` subtitle) in `MainActivity.kt`, notification title `"American Pizza POS"` in `OrderPrintService.kt`.
- Replace: `res/drawable/app_logo.*` with the BBC logo; `res/mipmap-*/ic_launcher*` with BBC icon.
- Modify: `ui/theme/Color.kt` + button colors (`0xFFFF5722` orange → BBC palette `#5D0925` maroon / `#B08A3E` gold from the website).

- [ ] **Step 1:** rename dirs + `package`/import lines; rename `ACTION_*` constants; rename `NewMilanoTheme` → `BbcPosTheme` (and its usages).
- [ ] **Step 2:** swap strings, colors, logo, launcher icon.
- [ ] **Step 3:** build — `./gradlew :app:assembleDebug` → BUILD SUCCESSFUL.
- [ ] **Step 4:** commit — `git commit -m "pos: rename package + rebrand to Bombay Bicycle Chef"`

### Task 12: Repoint SERVER_URL to a build field + location slug

**Files:**
- Modify: `app/build.gradle.kts` — add to `defaultConfig`:
  ```kotlin
  buildConfigField("String", "SERVER_URL", "\"https://bombay-bicycle-chef.com/api/pos\"")
  buildConfigField("String", "LOCATION_SLUG", "\"balham\"")
  ```
  and enable `buildFeatures { buildConfig = true }`.
- Modify: `DeviceRegistrar.kt`, `MainActivity.kt`, `OrderPrintService.kt` — replace every `private const val SERVER_URL = "https://api.americanpizzza.com/api"` / `private val SERVER_URL = …` with `BuildConfig.SERVER_URL`; replace `RESTAURANT_ID = 1` usage and the `.../poll/1` path with `BuildConfig.LOCATION_SLUG` (`"$SERVER_URL/orders/poll/${BuildConfig.LOCATION_SLUG}"`); in `DeviceRegistrar` send `put("locationSlug", BuildConfig.LOCATION_SLUG)` instead of `restaurantId`.

> Domain note: BBC website is `bombay-bicycle-chef.com` (hyphenated) per project memory — confirm the deployed API origin with the user before shipping the release build. Also add the BBC api host to a network-security-config (Task 13) — no cleartext.

- [ ] **Step 1:** add build fields; swap the three `SERVER_URL` constants + the poll path + device body.
- [ ] **Step 2:** build → SUCCESSFUL. **Step 3:** commit — `git commit -m "pos: point at BBC API via BuildConfig (SERVER_URL, LOCATION_SLUG)"`

### Task 13: Security hardening (the audit fixes)

**Files:**
- Modify: `AndroidManifest.xml` — remove `android:usesCleartextTraffic="true"`; add `android:networkSecurityConfig="@xml/network_security_config"`; set `android:allowBackup="false"` (simplest) OR keep backup but exclude cred prefs (Step 2).
- Create: `res/xml/network_security_config.xml` — https-only, no cleartext:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <network-security-config>
    <base-config cleartextTrafficPermitted="false"/>
  </network-security-config>
  ```
- Modify: `res/xml/backup_rules.xml` + `data_extraction_rules.xml` — if keeping backup, exclude `milano_pos`/renamed prefs and `pos_secure_creds` (`<exclude domain="sharedpref" path="milano_pos.xml"/>` etc.). If `allowBackup=false`, leave as-is.
- Modify: `MainActivity.kt` + `OrderPrintService.kt` + `BootReceiver.kt` — move the JWT out of plain `getSharedPreferences("milano_pos")` into `EncryptedSharedPreferences` (add a small `SecureStore` object like `SecureCreds`, or store the JWT via `SecureCreds`). Update every read/write of `jwt_token`.
- Modify: `SecureCreds.kt` + `OrderPrintService.reauth()` + `MainActivity.performLogin()` — **stop storing the password.** After login, store the **refresh token** (returned by `/auth/login`) instead. `reauth()` calls `POST $SERVER_URL/auth/refresh {refreshToken}` and, on success, saves the new `token` (and rotated `refreshToken`). `REJECTED` (401) → force manual login; `NETWORK` → keep retrying.
- Modify: `app/build.gradle.kts` — `targetSdk = 34` (from 30); test the build; if a 34 behavior breaks a POS feature, document and stay at the highest that builds.

- [ ] **Step 1:** network-security-config + manifest (cleartext off, backup off/excluded).
- [ ] **Step 2:** encrypted JWT storage.
- [ ] **Step 3:** refresh-token flow replacing stored password; update `performLogin` to persist `refreshToken` from the login response; update `reauth()` to hit `/auth/refresh`.
- [ ] **Step 4:** bump targetSdk; `./gradlew :app:assembleDebug` → SUCCESSFUL.
- [ ] **Step 5:** commit — `git commit -m "pos: security — no cleartext, encrypted tokens, refresh-token reauth, backup exclusions, targetSdk 34"`

### Task 14: BBC Firebase project (USER ACTION + wiring)

**Files:**
- Replace: `app/google-services.json` with the BBC Firebase project's file (package `com.bombaybicyclechef.pos`).
- Backend env: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` from the same Firebase project's service account → Vercel.

- [ ] **Step 1 (USER):** create a Firebase project for BBC, add an Android app with package `com.bombaybicyclechef.pos`, download `google-services.json`, and generate a service-account key. Provide both to the integrator.
- [ ] **Step 2:** drop in `google-services.json`; set the three `FCM_*` env vars in Vercel; redeploy.
- [ ] **Step 3:** end-to-end test (Task 15).
- [ ] **Step 4:** commit the `google-services.json` swap — `git commit -m "pos: BBC Firebase config"`

---

## Phase 5 — End-to-end verification

### Task 15: Full path test

- [ ] **Step 1:** Seed one paid Balham order (service-key script, as in prior testing) OR run a real test checkout with ordering temporarily on in a preview env.
- [ ] **Step 2:** Log into the POS with a staff account → expect the order to appear, print once, and show PRINTED.
- [ ] **Step 3:** Tap ACCEPT → verify BBC `orders.status` = `accepted`; tap READY → `ready_for_collection` (collection) / `out_for_delivery` (delivery). Confirm illegal transitions are refused (409).
- [ ] **Step 4:** With FCM configured, place another paid order → the terminal wakes and prints within ~1s (not waiting the 5s poll). Kill the device's network mid-order → on reconnect the 5s poll still prints it (no lost ticket).
- [ ] **Step 5:** Confirm `printed_at`, `order_events` (`POS_PRINTED`, `POS_STATUS_CHANGED`) recorded. Confirm a non-staff Supabase user is rejected at login (401).
- [ ] **Step 6:** commit any fixes; push `site-updates`.

---

## Self-Review

**Spec coverage:**
- App's 6 endpoints → Tasks 6–9. ✓
- Order JSON shape → Task 3 (`orderToPosJson`) matches `Format.kt`/`MainActivity.kt` field names (`_id, orderNumber, customerName, totalPrice, status, isPrinted, paymentStatus, orderType, createdAt, orderItems[quantity/productName/price/selectedToppings/specialInstructions], subtotal, deliveryFee, discount, promoCode, deliveryAddress{street,city,postalCode}`). ✓
- Status buttons (`preparing`/`ready`) → `appStatusToBbc` + transition validation. ✓
- Security audit fixes (cleartext, token storage, password→refresh, backup, targetSdk, cert-pinning-optional) → Task 13. ✓ (cert pinning left optional — network-security-config https-only + Supabase-hosted JWT covers the primary MITM risk.)
- FCM push + poll fallback → Phase 3 + Task 15 Step 4. ✓
- Auth on every route + staff-for-location → Global Constraints + `verifyPosRequest`. ✓

**Type consistency:** `verifyPosRequest`/`posLogin`/`posRefresh` (Task 2) used identically in Tasks 6–9. `orderToPosJson`/`appStatusToBbc`/`bbcStatusToApp` (Task 3) used in Task 4. `LIVE_STATUSES`/`ORDER_TRANSITIONS` from existing `constants.ts`. Event types added in Task 4a before use. ✓

**Open items requiring USER input:** (1) BBC Firebase project + service account (Task 14); (2) confirm the production API origin (`bombay-bicycle-chef.com` vs `.uk`) for the release build (Task 12); (3) which staff Supabase account the terminal logs in as.

**Known deferrals (YAGNI):** cert pinning (optional hardening); multi-location POS (only Balham has internal ordering today — `LOCATION_SLUG` build field; Battersea/Kilburn route to `.uk`); tip/loyalty fields on the receipt (not in the app's parser).
