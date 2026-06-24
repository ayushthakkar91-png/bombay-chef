"use server";

import { redirect } from "next/navigation";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { subscribeContact } from "@/lib/marketing/contacts";
import { earnForOrder } from "@/lib/loyalty/service";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";
import { rateLimit } from "@/lib/ratelimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REVENUE_STATUSES = new Set(["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"]);

function safeNext(next: string): string {
  return next.startsWith("/account") ? next : "/account";
}

/**
 * Ensure a customers row exists and (safely) link this verified-email user to any
 * guest orders/reservations placed with the same email. Email is proven by the
 * Supabase auth session, so claiming by email is safe. Idempotent. Service
 * client because it spans rows the user can't yet see via RLS.
 */
async function linkAndEnsure(userId: string, email: string | null, marketing: boolean) {
  const service = getServiceClient();
  if (!service || !email) return;

  await service.from("customers").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  // Claim prior guest orders/reservations placed with this (now verified) email.
  const { data: linkedOrders } = await service.from("orders").update({ customer_id: userId }).is("customer_id", null).ilike("contact_email", email).select("id, status");
  await service.from("reservations").update({ customer_id: userId }).is("customer_id", null).ilike("guest_email", email);

  // Back-credit loyalty for the now-linked paid orders. earnForOrder was a no-op
  // while they had no customer, and it dedups on order_id ÔÇö so this is safe to re-run.
  for (const o of linkedOrders ?? []) {
    if (REVENUE_STATUSES.has(o.status as string)) await earnForOrder(o.id as string);
  }

  if (marketing) {
    await service.from("consents").insert({ customer_id: userId, purpose: "marketing_email", granted: true, source: "register" });
    await subscribeContact(email, { customerId: userId, source: "register", sendWelcome: true });
  }
}

export async function register(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("account-register", { limit: 5, windowSec: 60 })).ok) {
    return fail("Too many attempts. Please wait a minute and try again.");
  }
  const fullName = str(form, "fullName");
  const email = str(form, "email");
  const password = String(form.get("password") ?? "");
  const phone = str(form, "phone");
  const marketing = form.get("marketing") === "on";
  const next = safeNext(str(form, "next") || "/account");

  const errors: Record<string, string> = {};
  if (!fullName) errors.fullName = "Please enter your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email.";
  if (password.length < 8) errors.password = "At least 8 characters.";
  if (Object.keys(errors).length) return fail("Please check the fields below.", errors, { fullName, email, phone });

  const supabase = await getUserClient();
  if (!supabase) return fail("Accounts aren't available yet.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone: phone || null } },
  });
  if (error) return fail(error.message, undefined, { fullName, email, phone });

  // Email confirmation required (no session yet) — can't link until confirmed.
  if (!data.session) {
    return ok("Almost there — check your email to confirm your account, then sign in.");
  }

  await linkAndEnsure(data.user!.id, email, marketing);
  redirect(next);
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("account-login", { limit: 5, windowSec: 60 })).ok) {
    return fail("Too many attempts. Please wait a minute and try again.");
  }
  const email = str(form, "email");
  const password = String(form.get("password") ?? "");
  const next = safeNext(str(form, "next") || "/account");

  if (!email || !password) return fail("Enter your email and password.", undefined, { email });

  const supabase = await getUserClient();
  if (!supabase) return fail("Accounts aren't available yet.");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail("Email or password is incorrect.", undefined, { email });

  await linkAndEnsure(data.user.id, data.user.email ?? email, false);
  redirect(next);
}

export async function logout(): Promise<void> {
  const supabase = await getUserClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/account/login");
}
