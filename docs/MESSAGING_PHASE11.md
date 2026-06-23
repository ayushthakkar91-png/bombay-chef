# Phase 11 — SMS & WhatsApp Communication System

Consent-gated SMS/WhatsApp automation via **Twilio** and the **WhatsApp Cloud API**.
The engine **observes** orders, reservations and rewards and queues messages — it
never modifies those flows. Separate from the email `notifications` outbox. **No
ordering, reservation, CRM, or loyalty changes.**

---

## 1. Why observation, not hooks

The brief freezes ordering/reservations/CRM/loyalty, yet order- and reservation-status
messages are driven by their events. So a cron **polls recent rows** and enqueues one
message per event using a unique `dedup_key` (`order:<id>:preparing`,
`res:<id>:reminder_24h`, `reward:<promoId>`). No existing code is touched; dedup makes
it idempotent. Trade-off: detection is best-effort per cron tick (a status passed
between ticks is skipped) — documented, acceptable for notifications.

## 2. Providers

`src/lib/messaging/provider.ts` picks the best configured sender per channel, via
`fetch` (no SDKs): **WhatsApp Cloud API** (Meta) → **Twilio WhatsApp** → **Twilio SMS**,
with a **console fallback** so the queue flows in dev. Twilio carries a `StatusCallback`
to `/api/webhooks/twilio` for delivery/read/failed updates.

## 3. Pieces

| File | Role |
|---|---|
| `0016_messaging.sql` | `messaging_preferences`, `message_templates` (seeded), `message_campaigns`, `messages` (queue+log) |
| `lib/messaging/engine.ts` | consent resolution, `{{var}}` render, dedup'd enqueue (skips → `skipped` row) |
| `lib/messaging/sync.ts` | observe orders / reservations / rewards |
| `lib/messaging/dispatch.ts` | send queued, retry w/ exponential backoff, append tracked links |
| `lib/messaging/campaigns.ts` | fan a marketing campaign to opted-in recipients |
| `api/cron/messaging` | heartbeat: sync + dispatch (CRON_SECRET) |
| `api/webhooks/twilio` | delivery status + inbound STOP/START (signature-verified) |
| `api/m/[id]` | click-tracking redirect |
| `/admin/messaging` `/campaigns` `/templates` | dashboards + management |

## 4. Messages covered

- **Reservation**: confirmation, 24h reminder, same-day reminder, cancellation.
- **Order**: accepted, preparing, ready for collection, out for delivery, delivered (completed).
- **Marketing**: loyalty + birthday rewards (minted `promo_codes`), and promotional **campaigns**.

## 5. Consent & GDPR

Keyed by phone (E.164) in `messaging_preferences` (`sms` / `whatsapp` / `marketing`
opt-ins + `opt_out_at`). **Default is opt-out** — nothing sends without an explicit
opt-in, so capture consent first (admin panel, or inbound `START`). Marketing also
requires `marketing_opt_in`. The channel is chosen from consent (WhatsApp preferred,
else SMS). Inbound **STOP** (and CANCEL/UNSUBSCRIBE/…) opts the number out of
everything; **START** opts back in. No-consent sends are logged as `skipped` for
visibility. Consent changes are audited.

## 6. Queue, retry, audit

`messages` is the queue. The dispatcher claims a row atomically (`queued → sending`),
sends, then sets `sent`/`delivered` or retries with backoff (2/4/8 min) up to
`max_attempts`, finally `failed`. Twilio callbacks advance `sent → delivered → read`.
Campaign sends and consent updates write to `audit_log`.

## 7. Reporting (`/admin/messaging`, last 30 days)

- **Delivery rate** = delivered ÷ sent · **Read rate** = read ÷ delivered (WhatsApp)
- **Click rate** = clicks ÷ delivered (tracked `/api/m/[id]` redirect)
- **Failed** and **Skipped (no consent)** counts · consent breakdown · recent log.

## 8. Setup

Run `0016`. Optionally set `TWILIO_*` and/or `WHATSAPP_CLOUD_*` (else console mode).
Schedule `GET /api/cron/messaging?secret=$CRON_SECRET` (~15 min). In Twilio, set the
messaging **status callback** and **inbound** webhooks to `/api/webhooks/twilio`. Use
**Run queue now** on the dashboard to sync+dispatch immediately while testing.

## 9. Testing checklist

- [ ] Capture consent for a phone (admin) → it appears in preferences.
- [ ] Place a test order; advance status; **Run queue now** → an order message is queued and (console/Twilio) sent, dedup'd per status.
- [ ] Create a confirmed reservation starting tomorrow → the 24h reminder queues once in the window.
- [ ] A phone with no consent → messages are recorded as **skipped**, never sent.
- [ ] Inbound **STOP** to the Twilio webhook opts the number out; **START** opts back in.
- [ ] Create a campaign → **Send** → queues to marketing-opted-in recipients only; with a link, `/api/m/[id]` records a click and redirects.
- [ ] Twilio status callback flips a message to delivered/read; a failing send retries then marks failed.
- [ ] Dashboard rates (delivery/read/click), failed and skipped counts look right.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 10. Notes / deferred

- **Console mode** marks sends as `delivered` so dev reporting is sane; real delivery comes from Twilio callbacks.
- **WhatsApp Cloud** delivery/read receipts need a Meta webhook subscription (not wired); Twilio's callback is the delivery path here.
- **Event detection is poll-based** (see §1) — fine for a ~15-min cadence; a future option is observing a status-events table if one is added.
- **Same-day vs 24h reminders** use time windows (1–6h / 20–28h before) with dedup; widen/narrow in `sync.ts` to taste.
- WhatsApp Business templates (pre-approved HSM) aren't modelled — bodies are free-text, which suits SMS and session WhatsApp; outbound WhatsApp outside the 24h window would need approved templates.
