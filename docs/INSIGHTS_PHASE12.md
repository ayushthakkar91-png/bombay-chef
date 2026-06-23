# Phase 12 — AI Business Intelligence

Read-only insights over everything built in Phases 1–11. **No migration, no schema
or behaviour change to any existing system** — the engine only *reads* (reusing the
existing reporting, costing, inventory and order data). Every figure, forecast and
recommendation is computed deterministically and carries an **explanation**, a
**confidence score**, and a **historical comparison**; an optional LLM adds a prose
executive brief on top of those figures.

---

## 1. Design — real math, optional AI

The numbers are not asked of a model — they're computed (`src/lib/insights/`):
- `stats.ts` — least-squares regression + projection, deltas, confidence (saturating in sample size).
- `engine.ts` — the four page computations from live data.
- `ai.ts` — **optional** narration: feeds the *computed* JSON to Claude (`ANTHROPIC_API_KEY`) with a "never invent numbers" system prompt; **falls back to a templated brief** when no key is set. So the AI layer can't fabricate data, and the feature works fully offline.

## 2. Routes → what's on them

| Route | Contents |
|---|---|
| `/admin/insights` | Executive brief (AI/auto), revenue/orders/AOV vs prior period, 7-day revenue **forecast**, alerts, key insights, top recommendations, best sellers |
| `/admin/insights/revenue` | Revenue trend + 14-day forecast, **demand by weekday**, best-selling / most-profitable / low-performing dishes, **pricing** recommendations |
| `/admin/insights/customers` | Repeat rate, **churn-risk** customers (RFM-style), **repeat opportunities**, retention alerts, **marketing** recommendations |
| `/admin/insights/inventory` | Stock alerts, **staffing forecast** by weekday, **inventory** + **staff** optimisation recommendations, waste insight |

## 3. How the headline numbers work

- **Revenue/growth trends** — period total vs the immediately-prior equal period (Δ%, direction).
- **Forecasts** — linear regression on the daily revenue series, projected forward; **confidence = fit (R²) × span**. Demand forecast = average orders per weekday. Staffing forecast = demand ÷ ~8 orders per head.
- **Dish insights** — `order_items` volume/revenue joined to recipe cost (Phase 10 costing) → best-selling (units), most-profitable (gross profit), low-performing (volume/margin).
- **Churn risk** — per customer: recency vs their own ordering cadence; `risk = (recency / cadence − 1)·55`, weighted by lifetime value; **confidence rises with order history**.
- **Repeat opportunity** — one-time buyers who ordered in the last 60 days.
- **Recommendations** — pricing (high food-cost or under-promoted dishes), marketing (win-back / second-order), inventory (reorder / waste), staffing (peak vs quiet). Each states **Why** (the numbers), **what to do**, an **impact** estimate, and a **confidence** score.
- **Alerts** — revenue drop ≥10% vs prior, items below reorder, rising churn / low repeat rate.

## 4. Requirements

- **Explain recommendations** — every card has a "Why" line citing the figures.
- **Confidence scores** — every insight/recommendation/forecast carries a 0–100 score (low/medium/high) derived from sample size or model fit; hover for the basis.
- **Historical comparisons** — KPI tiles show current vs prior-period with Δ%.

## 5. Permissions & scope

`restaurant_manager` (org-wide). Period (7/30/90/365 days) and location (all or one)
are URL filters. Customer insights use a fixed 12-month window. All reads go through
the existing service/RLS clients; nothing is written.

## 6. Setup

Nothing required — it works on existing data immediately. Optionally set
`ANTHROPIC_API_KEY` (and `INSIGHTS_MODEL`, default `claude-sonnet-4-6`) to enable the
LLM-written executive brief; otherwise a deterministic summary is shown and labelled
"auto-summary".

## 7. Testing checklist

- [ ] `/admin/insights` shows the brief (labelled AI-generated or auto-summary), KPI deltas, a forecast chart, alerts and recommendations.
- [ ] Changing period/location refilters every page.
- [ ] Revenue page: forecast, weekday demand, and the three dish tables populate from real orders; pricing recs cite food-cost %.
- [ ] Customers page: churn-risk and repeat lists show real customers with LTV, recency and a confidence badge; alerts fire when applicable.
- [ ] Inventory page: low-stock alerts + reorder recs match the Stock page; staffing forecast reflects busy/quiet weekdays.
- [ ] With no `ANTHROPIC_API_KEY`, the brief still renders (fallback); with a key, it reads as prose and invents no new numbers.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static` · no existing system modified.

## 8. Notes / deferred

- **Forecasts are linear-trend** (transparent + explainable); seasonality/ARIMA is a future upgrade. Low fit → honestly low confidence rather than a confident wrong number.
- **Aggregation is in-app over date-scoped fetches** (same approach as Phase 7) — fine at a restaurant's scale; materialised views are the scale-up path.
- The LLM only **narrates**; all decisions/numbers come from the deterministic engine, so output stays grounded and auditable.
