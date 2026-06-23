# Phase 10 — Inventory & Supplier Management

A complete inventory module: items, per-location stock, movements, suppliers +
catalogue, purchase orders with receiving, waste, and dish costing. Self-contained
(`0015`); reads existing menu items for costing. **No homepage, ordering,
reservation, loyalty, CRM, analytics, gift-card, or staff/operations changes.** No
env var or flag.

---

## 1. Routes

| Route | Purpose | Min role |
|---|---|---|
| `/admin/inventory` | Overview — stock value, low-stock alerts, KPIs, links | staff |
| `/admin/inventory/stock` | Stock per location: counts, reorder levels, adjustments; item CRUD | staff (view) · location manager (adjust) · restaurant manager (items) |
| `/admin/inventory/waste` | Log damaged/expired/kitchen waste (deducts stock) | staff |
| `/admin/inventory/purchase-orders` `/[id]` | Create PO → add items → send → receive stock | staff (view) · location manager (manage) |
| `/admin/inventory/suppliers` `/[id]` | Supplier profiles, contacts, price catalogue + history | restaurant manager |
| `/admin/inventory/costing` | Food cost %, margin & profit per dish; recipe editor | restaurant manager |

## 2. Data model (`0015`)

- **`inventory_items`** — catalogue (ingredient / raw_material / packaging / beverage), unit, `cost_pence` per base unit.
- **`location_stock`** — per (location, item): qty, min, reorder level + qty.
- **`stock_movements`** — append-only ledger (receive / adjust / waste / transfer / correction) with actor + PO link.
- **`suppliers`**, **`supplier_products`** (pack size + price), **`supplier_price_history`**.
- **`purchase_orders`** + **`purchase_order_items`** (packs ordered/received, £/pack, pack size).
- **`waste_records`** (qty, reason, notes).
- **`menu_item_ingredients`** — recipes linking menu items → inventory for costing.

## 3. How the flows work

- **Stock** is kept on `location_stock.qty`; every change also writes a `stock_movements` row via one privileged helper (`applyStockDelta`) — `location_stock` is the current count, the ledger is the audit trail.
- **Receiving a PO** (in full) adds `packs × pack_size` to stock, logs a `receive` movement, and refreshes the item's `cost_pence` to the latest `£/pack ÷ pack_size`. Idempotent — already-received lines are skipped.
- **Waste** inserts a record and deducts stock (`waste` movement).
- **Costing**: dish cost = Σ(recipe qty × item unit cost); food cost % = cost ÷ price; margin = price − cost. Colour-coded (≤30% good, ≤40% watch, >40% high).
- **Pricing history**: changing a supplier's price logs to `supplier_price_history`, shown inline in the catalogue.

## 4. Permissions & audit

Multi-location throughout. Catalogue tables (items, suppliers, products, recipes) are
**org-level**: any staff read (`is_staff()`), restaurant managers manage. Stock,
movements, POs and waste carry `location_id` and scope by
`role_at_least(role, location)` — staff read their location, location managers adjust
stock / manage POs, and waste can be logged by any staff at the location. Stock
adjustments, waste, and PO receipts write to `audit_log`. The standard service/user
client split applies (privileged ledger writes via service, role-gated at the action;
location-scoped reads via the RLS user client).

## 5. Reporting

The overview page (stock value, low-stock count, open POs, 30-day waste cost) and the
costing page (avg food cost %, dishes costed, per-dish margin/profit) are the reporting
dashboards; the waste page adds 30-day waste totals. These are new surfaces — the
Phase 7 analytics dashboards are untouched.

## 6. Testing checklist

- [ ] Add inventory items (each category); they appear in stock with qty 0.
- [ ] Set reorder levels; items at/below show **Low** and surface on the overview's low-stock list.
- [ ] Adjust stock (+/−) with a reason → qty changes and a movement is logged.
- [ ] Add a supplier + catalogue entries; changing a price records history (shown inline).
- [ ] Create a PO → add items → mark sent → **receive** → stock increases by packs×pack-size, item cost updates, status = Received; re-receiving doesn't double-count.
- [ ] Log waste → stock decreases; waste cost shows on the overview + waste page.
- [ ] Costing: add ingredients to a dish → cost, margin and food-cost % compute and colour-code.
- [ ] A `staff` user sees stock/waste/overview for their location but not suppliers/costing (manager-gated); a location manager can't manage another location's stock/POs.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 7. Notes / deferred

- **PO receiving is full-receipt** (whole order at once); partial/line-level receiving is a future addition (the schema already tracks `qty_received` per line).
- **Item cost** is maintained as the latest received/supplier unit price (not a weighted moving average) — simple and predictable; WMA is a future option.
- **Cost trends** are represented by supplier price history; a time-series chart of food-cost drift is a future enhancement.
- **Stock is not auto-depleted by customer orders** — depletion is via adjustments/waste/receiving. Wiring sales→recipe depletion would touch the (frozen) ordering flow, so it's intentionally out of scope.
- Quantities are stored as `numeric` to support fractional units (e.g. 1.5 kg).
