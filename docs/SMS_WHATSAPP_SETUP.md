# SMS & WhatsApp Setup — Step by Step

How to get every value in this block and wire it up:
```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_FROM=+44...
TWILIO_WHATSAPP_FROM=+14155238886
WHATSAPP_CLOUD_TOKEN=...
WHATSAPP_PHONE_ID=...
```

> **You don't need all of them.** Pick a path:
> - **SMS only** → set the 3 `TWILIO_*` SMS values.
> - **WhatsApp via Twilio** → add `TWILIO_WHATSAPP_FROM`.
> - **WhatsApp via Meta (Cloud API)** → set the 2 `WHATSAPP_*` values instead.
> - **Nothing set** → messages safely log to the server console (great for testing the flow).
The easy way is Twilio only — one account gives you both SMS and WhatsApp (via its sandbox), with no Meta business verification. Skip the WhatsApp Cloud API for now (that's the hard path).

Easy setup — Twilio (≈15 min)

1. Sign up → https://twilio.com (free trial + free credit). Verify your email + phone.

2. Copy 2 keys — on the Console dashboard, under Account Info:
- Account SID → TWILIO_ACCOUNT_SID
- Auth Token (click show) → TWILIO_AUTH_TOKEN

3. Buy a phone number — PhoCountry United Kingdom,

How is Claude doing this session? (optional)
1: Bad    2: Fine   3: Good
The app picks the best configured provider automatically: WhatsApp Cloud → Twilio WhatsApp → Twilio SMS → console.

---

## What this powers
Once configured + with customer **consent**, the platform sends: reservation confirmations/reminders/cancellations, order status updates (accepted → preparing → ready/out → delivered), and marketing (loyalty/birthday rewards, campaigns). Managed at **`/admin/messaging`**. It's **consent-gated** (default opt-out) and honours inbound **STOP/START**.

---

# PART A — Twilio (SMS, and optionally WhatsApp)

### A1. Create the account
1. Go to **twilio.com** → sign up → verify your email + phone.
2. You start on a **trial** (free credit). Trial can only message **verified** numbers — fine for testing; upgrade (add a card) to message anyone.

### A2. Get `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
1. Open the **Twilio Console** (console.twilio.com) — the home dashboard.
2. Under **Account Info** you'll see:
   - **Account SID** → copy into `TWILIO_ACCOUNT_SID`
   - **Auth Token** (click "show") → copy into `TWILIO_AUTH_TOKEN`
   > The Auth Token is a **secret** — it also verifies the inbound webhook signatures. Keep it server-only.

### A3. Get `TWILIO_SMS_FROM` (a phone number)
1. Console → **Phone Numbers → Manage → Buy a number**.
2. Filter: **Country = United Kingdom**, capability **SMS**. Buy a mobile-capable number (~£1/mo).
3. Copy it in **E.164 format** (e.g. `+447700900123`) into `TWILIO_SMS_FROM`.
   > UK note: for app-to-person SMS, a purchased long number works out of the box. (Alphanumeric Sender IDs are possible but can't receive STOP replies, so a real number is recommended here.)

### A4. Configure the inbound/STOP webhook
So replies like **STOP** opt customers out automatically:
1. Console → **Phone Numbers → Manage → Active numbers** → click your number.
2. Scroll to **Messaging → "A message comes in"**:
   - Set to **Webhook**, `HTTP POST`, URL:
     ```
     https://www.bombay-bicycle-chef.com/api/webhooks/twilio
     ```
3. Save.
   > Delivery **status** callbacks (sent/delivered/read/failed) are attached per-message by the app automatically — no extra config needed.

### A5. (Optional) WhatsApp via Twilio → `TWILIO_WHATSAPP_FROM`
**For testing (Sandbox — instant, free):**
1. Console → **Messaging → Try it out → Send a WhatsApp message**.
2. You'll see a **sandbox number** (e.g. `+1 415 523 8886`) and a **join code** (e.g. "join velvet-tiger").
3. From your own WhatsApp, send that join code to the sandbox number to opt your phone in.
4. Set `TWILIO_WHATSAPP_FROM=+14155238886` (the sandbox number).
   > Sandbox only messages numbers that have joined — perfect for testing.

**For production WhatsApp:**
- Register a **WhatsApp Sender** (Messaging → Senders → WhatsApp senders). Requires a **Meta Business** account, business verification, and **approved message templates** for proactive messages. Then set `TWILIO_WHATSAPP_FROM` to your approved WhatsApp number.

---

# PART B — WhatsApp Cloud API (Meta) — alternative to Twilio WhatsApp

Use this **instead of** Twilio for WhatsApp (set the 2 `WHATSAPP_*` values; if both are set, the app prefers Cloud API for WhatsApp).

### B1. Create a Meta app
1. Go to **developers.facebook.com** → log in → **My Apps → Create App**.
2. Choose **Business** type → name it → create.
3. On the app dashboard, **Add product → WhatsApp → Set up**.
   - It links/creates a **Meta Business Account**.

### B2. Get `WHATSAPP_PHONE_ID` + a token (`WHATSAPP_CLOUD_TOKEN`)
1. In the app → **WhatsApp → API Setup**. You'll see:
   - A **test phone number** Meta provides (free, for testing).
   - **Phone number ID** → copy into `WHATSAPP_PHONE_ID`.
   - A **temporary access token** (valid ~24h) → copy into `WHATSAPP_CLOUD_TOKEN` (for first tests).
2. Add a recipient: under **To**, add + verify your own WhatsApp number, then "Send message" to confirm it works.

### B3. Get a PERMANENT token (for production)
The 24h token expires — for live use create a permanent one:
1. **business.facebook.com → Business Settings → Users → System Users → Add** (Admin).
2. **Generate new token** → select your app → grant permissions **`whatsapp_business_messaging`** and **`whatsapp_business_management`**.
3. Copy that token → `WHATSAPP_CLOUD_TOKEN` (it doesn't expire).

### B4. Add your real business number (production)
- **WhatsApp → API Setup → Add phone number** → verify your business number (it must not already be on a personal WhatsApp). Use its **Phone number ID** for `WHATSAPP_PHONE_ID`.

> **Important WhatsApp rule:** outside the 24-hour customer-service window, WhatsApp only allows **pre-approved message templates** (HSM). This app sends free-text — perfect for replies and in-window messages; proactive marketing on WhatsApp would require approved templates (a future add-on). SMS has no such restriction.

---

# PART C — Put the keys in & test

### C1. Add the env vars
- **Local:** add to `.env.local`.
- **Production:** Vercel → Project → **Settings → Environment Variables** (Production + Preview).
- Also make sure these are already set: `NEXT_PUBLIC_SITE_URL=https://www.bombay-bicycle-chef.com` and `CRON_SECRET=...`.
- Redeploy (or restart `npm run dev` locally) so the values load.

### C2. Capture consent (required — nothing sends without it)
1. Go to **`/admin/messaging`** (sign in as a manager).
2. In **Customer preferences**, add a phone in E.164 (e.g. `+447700900123`) and tick **SMS** (and/or WhatsApp / Marketing).
   - Or have the customer text **START** to your number / join the WhatsApp sandbox.

### C3. Send a test
1. Place a test order (or create a confirmed reservation) using **that consented phone**.
2. On `/admin/messaging`, click **"Run queue now"** (this syncs events + sends immediately, instead of waiting for the cron).
3. Check the **Recent messages** table — status should move to *sent → delivered* (read for WhatsApp). With no provider keys, you'll see them logged in the server console marked `delivered` (dev mode).

### C4. Schedule the cron (production)
Already configured in `vercel.json` (`/api/cron/messaging` every 15 min) and auto-authenticated by `CRON_SECRET`. It observes orders/reservations/rewards and dispatches the queue automatically.

---

## Quick reference
| Variable | Where to get it |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info (show) |
| `TWILIO_SMS_FROM` | Twilio → Phone Numbers → Buy a number (E.164) |
| `TWILIO_WHATSAPP_FROM` | Twilio → Messaging → WhatsApp Sandbox (or approved sender) |
| `WHATSAPP_CLOUD_TOKEN` | Meta → System User permanent token (or 24h test token) |
| `WHATSAPP_PHONE_ID` | Meta → WhatsApp → API Setup → Phone number ID |

**Webhook to register (Twilio number):** `https://www.bombay-bicycle-chef.com/api/webhooks/twilio`

See `docs/MESSAGING_PHASE11.md` for how the engine works under the hood.
