import "server-only";

/**
 * Email provider adapter. Transactional send only (reservations). Brevo over
 * HTTPS when configured; otherwise a console provider that logs the message so
 * local/dev works with zero setup — the same graceful-degradation pattern as
 * the Supabase clients. Swappable to Klaviyo/Mailchimp/Resend by adding a class.
 *
 * Env:
 *   EMAIL_PROVIDER       'brevo' | 'console' (default: brevo if BREVO_API_KEY set)
 *   BREVO_API_KEY        Brevo transactional API key
 *   EMAIL_FROM_ADDRESS   e.g. reservations@bombaybicyclechef.uk
 *   EMAIL_FROM_NAME      e.g. Bombay Bicycle Chef
 *   ADMIN_NOTIFY_EMAIL   inbox for new-booking admin alerts
 */

export type EmailMessage = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ id?: string }>;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "reservations@bombaybicyclechef.uk";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Bombay Bicycle Chef";

class BrevoProvider implements EmailProvider {
  readonly name = "brevo";
  constructor(private apiKey: string) {}

  async send(msg: EmailMessage): Promise<{ id?: string }> {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_ADDRESS },
        to: [{ email: msg.to, name: msg.toName }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Brevo send failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { id: data.messageId };
  }
}

class ConsoleProvider implements EmailProvider {
  readonly name = "console";
  async send(msg: EmailMessage): Promise<{ id?: string }> {
    console.info(`[email:console] → ${msg.to}\n  subject: ${msg.subject}\n  ${msg.text.slice(0, 200)}…`);
    return { id: `console-${Date.now()}` };
  }
}

export function getEmailProvider(): EmailProvider {
  const explicit = process.env.EMAIL_PROVIDER;
  const key = process.env.BREVO_API_KEY;
  if (explicit === "console") return new ConsoleProvider();
  if (key) return new BrevoProvider(key);
  return new ConsoleProvider();
}

export const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || FROM_ADDRESS;
