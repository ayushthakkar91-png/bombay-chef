# Email setup — Bombay Bicycle Chef

Reservation emails send via **Brevo** (transactional API). All site-facing email
uses **`info@bombaybicyclechef.com`**. Booking alerts to the owner go to a Gmail.

## Who does what

| Piece                          | Provider        | Address                       |
| ------------------------------ | --------------- | ----------------------------- |
| App sends confirmations        | **Brevo** (API) | from `info@bombaybicyclechef.com` |
| Owner's booking alerts         | **Gmail**       | `thakkarayush41@gmail.com`    |
| Site contact / location pages  | display only    | `info@bombaybicyclechef.com`  |
| Inbound mail for the domain    | **one.com**     | MX → one.com (read by others) |
| Website                        | Hostinger/Vercel| `bombay-bicycle-chef.com`     |

On a booking: the guest gets a confirmation from `info@`, and the owner gets an
alert at the Gmail. No reply-to is set — replies go to the From address (`info@`),
which routes to one.com.

> **Why alerts go to Gmail, not info@:** the domain's MX points at **one.com**, and
> that inbox is read by someone else — the owner has no one.com access. Sending
> owner alerts to Gmail guarantees the owner sees every booking. The SiteGround
> mailboxes (balham@, etc.) do NOT receive, because MX is one.com, not SiteGround.
> Do not change MX without confirming who relies on one.com mail.

## Brevo — done

- Domain `bombaybicyclechef.com` — **Authenticated** (DKIM + DMARC at GoDaddy).
- **Authorised-IP restriction is OFF** for API keys, and must stay off — Vercel
  egress IPs rotate; with it on, every send 401s.
- Send from any `@bombaybicyclechef.com` address (domain auth covers all).

## Vercel — production env vars

Project **bombay-chef** → Settings → Environment Variables → **Production**:

| Name                  | Value                                 |
| --------------------- | ------------------------------------- |
| `BREVO_API_KEY`       | *(Brevo transactional key)*           |
| `EMAIL_FROM_ADDRESS`  | `info@bombaybicyclechef.com`          |
| `EMAIL_FROM_NAME`     | `Bombay Bicycle Chef`                 |
| `ADMIN_NOTIFY_EMAIL`  | `thakkarayush41@gmail.com`            |
| `EMAIL_PROVIDER`      | `brevo`                               |
| `CRON_SECRET`         | *(any long random string)*            |
| `NEXT_PUBLIC_SITE_URL`| `https://www.bombay-bicycle-chef.com` |

No `EMAIL_REPLY_TO` — reply-to is not set. Env changes require a **Redeploy**.
`.env.local` is local-only and never deploys.

## Test

Book on the live site with your own email:
- guest inbox → confirmation from `info@bombaybicyclechef.com`
- `thakkarayush41@gmail.com` → owner alert

## Notes

- Email code: `src/lib/email/provider.ts` (Brevo via `fetch`, no npm package).
- Retry/reminder cron runs daily 00:00 (`vercel.json`); a failed send waits up to
  24h to retry. `CRON_SECRET` must be set or that route returns 503.
- Local testing without sending: `EMAIL_PROVIDER=console` prints to the console.
- **Future — to route site mail (info@ etc.) to the SiteGround mailboxes:** point
  the domain's MX at SiteGround (`mx10/20/30.mailspamprotection.com`). This stops
  one.com delivery, so confirm who reads one.com first. Reversible.
