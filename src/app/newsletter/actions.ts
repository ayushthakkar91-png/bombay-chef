"use server";

import { subscribeContact } from "@/lib/marketing/contacts";
import { flags } from "@/lib/flags";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";
import { rateLimit } from "@/lib/ratelimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletter(_p: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("newsletter", { limit: 3, windowSec: 60 })).ok) {
    return fail("You're going a little fast — please wait a moment and try again.");
  }
  if (!flags.marketing) return fail("Our newsletter isn't open yet — please check back soon.");
  const email = str(form, "email");
  const name = str(form, "name");
  if (!EMAIL_RE.test(email)) return fail("Please enter a valid email.", { email: "Invalid email." }, { name });

  const res = await subscribeContact(email, { name: name || undefined, source: "newsletter", sendWelcome: true });
  if (!res.ok) return fail("Sorry — we couldn't sign you up. Please try again.");

  return ok("You're in — welcome to the table. Look out for a hello in your inbox.");
}
