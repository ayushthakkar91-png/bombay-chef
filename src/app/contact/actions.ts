"use server";

import { createEnquiry } from "@/lib/repositories/enquiries";
import { getEmailProvider, ADMIN_NOTIFY_EMAIL } from "@/lib/email/provider";
import { rateLimit } from "@/lib/ratelimit";
import { EMAIL_RE } from "@/lib/patterns";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Handle a /contact submission: validate, store the enquiry (the reliable record
 * staff see in admin), then best-effort email ADMIN_NOTIFY_EMAIL. Rate-limited.
 */
export async function submitEnquiry(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await rateLimit("contact", { limit: 5, windowSec: 300 })).ok) {
    return { ok: false, error: "Too many messages just now — please wait a moment and try again." };
  }

  const name = input.name?.trim();
  const email = input.email?.trim();
  const subject = input.subject?.trim() || null;
  const message = input.message?.trim();
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email ?? "")) return { ok: false, error: "Please enter a valid email address." };
  if (!message) return { ok: false, error: "Please enter a message." };
  if (message.length > 5000) return { ok: false, error: "That message is a little long — please shorten it." };

  const stored = await createEnquiry({ name, email, subject, message });
  if (!stored) return { ok: false, error: "Something went wrong — please try again." };

  // Best-effort alert. The stored row is the source of truth (visible in admin),
  // so a mail failure never loses the enquiry.
  try {
    await getEmailProvider().send({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `New enquiry — ${subject ?? "Contact form"} (${name})`,
      text: `From: ${name} <${email}>\nSubject: ${subject ?? "—"}\n\n${message}`,
      html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>`
        + `<p><strong>Subject:</strong> ${esc(subject ?? "—")}</p>`
        + `<p>${esc(message).replace(/\n/g, "<br>")}</p>`,
    });
  } catch {
    /* email best-effort — enquiry already saved */
  }
  return { ok: true };
}
