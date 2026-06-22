import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once a Supabase project's URL + anon key are present in the env. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let cached: SupabaseClient | null = null;

/**
 * Public, read-only Supabase client (anon key, RLS-enforced). Returns `null`
 * when the env isn't configured yet, so callers can fall back to seed data and
 * the site keeps working before the database is connected (Phase 2).
 *
 * Server-side use only. Privileged writes (admin, orders) will use the service
 * role key in a separate client added in later phases.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createClient(url!, anonKey!, { auth: { persistSession: false } });
  }
  return cached;
}
