"use server";

import { redirect } from "next/navigation";

import { getUserClient } from "@/lib/supabase/clients";
import { type ActionState, fail, str } from "@/lib/admin/validation";

/**
 * Sign in to the admin panel. On success a Supabase session cookie is set (via
 * the SSR client's setAll) and we redirect into the panel. A valid login that
 * holds NO staff role is rejected and signed straight back out, so a customer
 * account can never hold a lingering admin session.
 */
export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email");
  const password = String(form.get("password") ?? "");
  const next = str(form, "next") || "/admin";

  const errors: Record<string, string> = {};
  if (!email) errors.email = "Enter your email.";
  if (!password) errors.password = "Enter your password.";
  if (Object.keys(errors).length) return fail("Check the fields below.", errors, { email });

  const supabase = await getUserClient();
  if (!supabase) {
    return fail("Supabase isn't configured yet. Add the env vars and restart.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return fail("Email or password is incorrect.", undefined, { email });
  }

  const { data: roles } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("profile_id", data.user.id)
    .limit(1);

  if (!roles || roles.length === 0) {
    await supabase.auth.signOut();
    return fail("This account doesn't have admin access.", undefined, { email });
  }

  // Only allow same-origin relative paths as the post-login destination.
  const dest = next.startsWith("/admin") ? next : "/admin";
  redirect(dest);
}

/** Sign out and return to the login screen. */
export async function logout(): Promise<void> {
  const supabase = await getUserClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}
