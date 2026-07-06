"use server";

import { headers } from "next/headers";
import { getServiceClient } from "@/lib/supabase/clients";

/**
 * Record a visitor's cookie-banner choice with a timestamp (audit trail).
 * Fire-and-forget from the banner: any failure (table missing, DB down) is
 * swallowed so the banner UX never breaks.
 */
export async function recordCookieConsent(choice: "accepted" | "rejected"): Promise<void> {
  if (choice !== "accepted" && choice !== "rejected") return;
  const supabase = getServiceClient();
  if (!supabase) return;
  try {
    const h = await headers();
    await supabase.from("cookie_consents").insert({
      choice,
      user_agent: (h.get("user-agent") ?? "").slice(0, 300) || null,
    });
  } catch {
    /* best effort */
  }
}
