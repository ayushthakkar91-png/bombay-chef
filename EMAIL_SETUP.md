# Email setup — Bombay Bicycle Chef

Reservation emails send via **Brevo** (transactional API). Incoming mail is
untouched — it stays on **one.com**, where it already lives.

## Who does what

| Piece                          | Provider        | Domain                        |
| ------------------------------ | --------------- | ----------------------------- |
| App sends confirmations/alerts | **Brevo** (API) | from `@bombaybicyclechef.com` |
| Mailboxes (receive / read)     | **one.com**     | `@bombaybicyclechef.com`      |
| DNS records (authoritative)    | **GoDaddy**     | `bombaybicyclechef.com`       |
| Website                        | Hostinger/Vercel| `bombay-bicycle-chef.com`     |

> ⚠️ **DNS is edited at GoDaddy only.** The domain's nameservers are GoDaddy
> (`ns21/ns22.domaincontrol.com`). SiteGround also shows a DNS Zone Editor for
> this domain, but it is **dormant and ignored** — editing it does nothing.

On a booking: the guest gets a confirmation, and `balham@bombaybicyclechef.com`
gets an admin alert. Guest replies also go to `balham@`. `balham@` is a live
one.com mailbox (MX points at one.com, so it receives).

## Sending records at GoDaddy (added — additive, non-destructive)

These authorise Brevo to send. They do **not** change MX or SPF, so incoming
one.com mail is unaffected.

| Type  | Name                | Value                                              |
| ----- | ------------------- | -------------------------------------------------- |
| TXT   | `@`                 | `brevo-code:edb22dadc89b1d3cf66b158ba506a39c`      |
| CNAME | `brevo1._domainkey` | `b1.bombaybicyclechef-com.dkim.brevo.com`          |
| CNAME | `brevo2._domainkey` | `b2.bombaybicyclechef-com.dkim.brevo.com`          |
| TXT   | `_dmarc`            | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

Left untouched (do NOT change): `MX → …one.com`, `TXT SPF → include:_custspf.one.com`.

## Brevo

- Domain `bombaybicyclechef.com` — **Authenticated**.
- **Authorised-IP restriction must stay OFF** for API keys. Vercel egress IPs
  rotate and can't be allowlisted; with the restriction on, every send 401s.
- Send from any `@bombaybicyclechef.com` address (domain auth covers all of them);
  no per-sender verification needed.

## Vercel — production env vars

Project **bombay-chef** → Settings → Environment Variables → **Production**:

| Name                  | Value                                 |
| --------------------- | ------------------------------------- |
| `BREVO_API_KEY`       | *(Brevo transactional key)*           |
| `EMAIL_FROM_ADDRESS`  | `reservations@bombaybicyclechef.com`  |
| `EMAIL_FROM_NAME`     | `Bombay Bicycle Chef`                 |
| `EMAIL_REPLY_TO`      | `balham@bombaybicyclechef.com`        |
| `ADMIN_NOTIFY_EMAIL`  | `balham@bombaybicyclechef.com`        |
| `EMAIL_PROVIDER`      | `brevo`                               |
| `CRON_SECRET`         | *(any long random string)*            |
| `NEXT_PUBLIC_SITE_URL`| `https://www.bombay-bicycle-chef.com` |

Env changes require a **Redeploy** to take effect. `.env.local` is local-only and
never deploys — production reads these.

## Test

Make a real booking on the live site with your own email:
- guest inbox → confirmation arrives (check spam the first few times)
- `balham@` → admin alert arrives
- reply to the confirmation → lands in `balham@`

## Verify DNS from a terminal

```bash
# Brevo DKIM resolves?
curl -s "https://dns.google/resolve?name=brevo1._domainkey.bombaybicyclechef.com&type=CNAME" | grep -o '"data":"[^"]*"'
# one.com MX still intact (must be unchanged)?
curl -s "https://dns.google/resolve?name=bombaybicyclechef.com&type=MX" | grep -o '"data":"[^"]*"'
```

## Notes

- Per-branch addresses (`src/data/locations.ts`): balham@ / battersea@ / kilburn@.
  General + legal pages use `hello@`. All on `bombaybicyclechef.com`.
- Email code: `src/lib/email/provider.ts` (Brevo via `fetch`, no npm package).
- Retry/reminder cron runs daily 00:00 (`vercel.json`); a failed send waits up to
  24h to retry. `CRON_SECRET` must be set or that route returns 503.
- Local testing without sending: `EMAIL_PROVIDER=console` prints emails to the
  server console instead of hitting Brevo.
- Optional future: `hello@`, `battersea@`, `kilburn@` mailboxes — create on one.com
  so page-listed addresses receive. Not required for reservation emails to work.
