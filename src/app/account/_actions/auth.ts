"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { subscribeContact } from "@/lib/marketing/contacts";
import { earnForOrder } from "@/lib/loyalty/service";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";
import { rateLimit } from "@/lib/ratelimit";

import { EMAIL_RE } from "@/lib/patterns";
const REVENUE_STATUSES = new Set(["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"]);

function safeNext(next: string): string {
  // Only same-site paths we intend to return to (no open redirects). The prefix
  // must follow the single leading slash, so "//evil.com" can never match.
  return /^\/(account|order)(\/|$|\?)/.test(next) ? next : "/account";
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
  if (!(await rateLimit("account-register", { limit: 5, windowSec: 60, failClosed: true })).ok) {
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
  if (!(await rateLimit("account-login", { limit: 5, windowSec: 60, failClosed: true })).ok) {
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

/** Same-origin base URL for auth email links (works in local dev AND prod). */
async function originFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "";
}

/**
 * Send a password-reset email. Always returns the SAME success message whether
 * or not the address has an account, so this can't be used to discover which
 * emails are registered. The link lands on /auth/reset (a route handler that
 * exchanges the code for a short-lived session, then shows the new-password form).
 */
export async function requestPasswordReset(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("account-reset", { limit: 5, windowSec: 60, failClosed: true })).ok) {
    return fail("Too many attempts. Please wait a minute and try again.");
  }
  const email = str(form, "email");
  const generic = ok("If that email has an account, we've sent a link to reset your password. Check your inbox.");
  if (!EMAIL_RE.test(email)) return fail("Enter a valid email.", undefined, { email });

  const supabase = await getUserClient();
  if (!supabase) return fail("Accounts aren't available yet.");

  const origin = await originFromRequest();
  // Ignore the result: never reveal whether the address exists.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` });
  return generic;
}

/**
 * Set a new password for the recovery session established by /auth/reset. The
 * caller must already hold that session (the route handler set it); updateUser
 * fails otherwise, so an unauthenticated request can't change anyone's password.
 */
export async function updatePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("account-password", { limit: 10, windowSec: 60, failClosed: true })).ok) {
    return fail("Too many attempts. Please wait a minute and try again.");
  }
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (password !== confirm) return fail("Passwords don't match.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Accounts aren't available yet.");

  // Requires the recovery session; a signed-out request returns an error here.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Your reset link has expired. Please request a new one.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.message);

  redirect("/account");
}
