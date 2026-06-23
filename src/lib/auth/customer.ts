import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getUserClient } from "@/lib/supabase/clients";

/**
 * Customer-account DAL — the counterpart to the staff DAL. Any authenticated
 * Supabase user can have a customer account; this loads their profile + current
 * marketing-consent state. Memoised per request.
 */

export type CustomerContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  birthday: string | null;
  marketingEmail: boolean;
  marketingSms: boolean;
};

export const getCustomer = cache(async (): Promise<CustomerContext | null> => {
  const supabase = await getUserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: customer }, { data: consentRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
    supabase.from("customers").select("birthday").eq("id", user.id).maybeSingle(),
    supabase
      .from("consents")
      .select("purpose, granted, created_at")
      .eq("customer_id", user.id)
      .in("purpose", ["marketing_email", "marketing_sms"])
      .order("created_at", { ascending: false }),
  ]);

  // Latest row per purpose is the current state.
  const latest = new Map<string, boolean>();
  for (const r of consentRows ?? []) {
    if (!latest.has(r.purpose as string)) latest.set(r.purpose as string, r.granted as boolean);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: (profile?.full_name as string | null) ?? null,
    phone: (profile?.phone as string | null) ?? null,
    birthday: (customer?.birthday as string | null) ?? null,
    marketingEmail: latest.get("marketing_email") ?? false,
    marketingSms: latest.get("marketing_sms") ?? false,
  };
});

export async function requireCustomer(): Promise<CustomerContext> {
  const ctx = await getCustomer();
  if (!ctx) redirect("/account/login");
  return ctx;
}
