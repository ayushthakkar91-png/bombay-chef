import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True once a Supabase project's URL + anon key are present in the env. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * Cookie-bound Supabase client carrying the signed-in user's session. RLS is
 * enforced, so this is the correct client for the admin panel: a manager can
 * only read/write what their `staff_roles` grant allows (policies in
 * migration 0002+). Returns `null` when Supabase isn't configured yet.
 *
 * Server-only. `cookies()` is async in Next.js 16. Writing cookies from a
 * Server Component throws (it's read-only there); we swallow that because the
 * `proxy` refreshes the session on every /admin request anyway.
 */
export async function getUserClient(): Promise<SupabaseClient | null> {
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — ignore; proxy handles refresh.
        }
      },
    },
  });
}

let serviceCached: SupabaseClient | null = null;

/**
 * Privileged service-role client. **Bypasses RLS** — server-only, never exposed
 * to the browser. Reserve for operations RLS can't express (e.g. audit-log
 * writes, GDPR jobs). Routine admin writes should use {@link getUserClient} so
 * RLS remains the security boundary. Returns `null` when the key is absent.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  if (!serviceCached) {
    serviceCached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceCached;
}
