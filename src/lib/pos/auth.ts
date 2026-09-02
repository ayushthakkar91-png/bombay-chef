import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/clients";
import { roleAtLeast, type Role, type StaffGrant } from "@/lib/auth/roles";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type Tokens = { token: string; refreshToken: string; expiresAt: number };

/** Password grant against Supabase Auth, then require a staff role. */
export async function posLogin(email: string, password: string): Promise<Tokens | { error: string }> {
  if (!url || !anonKey) return { error: "Auth not configured." };
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return { error: "Invalid credentials." };

  const grants = await staffGrantsFor(data.user.id);
  if (!roleAtLeast(grants, "staff")) return { error: "Not a staff account." };

  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
  };
}

/** Exchange a refresh token for a fresh session (POS auto-reauth). */
export async function posRefresh(refreshToken: string): Promise<Tokens | { error: string }> {
  if (!url || !anonKey) return { error: "Auth not configured." };
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return { error: "Session expired." };
  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
  };
}

/** Validate a Bearer access token and return the staff context, or null. */
export async function verifyPosRequest(
  req: Request,
  locationId?: string,
): Promise<{ userId: string; grants: StaffGrant[] } | null> {
  if (!url || !anonKey) return null;
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;

  // Validate the JWT by asking Supabase who it belongs to (checks signature+expiry).
  const scoped = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error } = await scoped.auth.getUser();
  if (error || !user) return null;

  const grants = await staffGrantsFor(user.id);
  if (!roleAtLeast(grants, "staff", locationId ?? null)) return null;
  return { userId: user.id, grants };
}

async function staffGrantsFor(userId: string): Promise<StaffGrant[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("staff_roles").select("role, location_id").eq("profile_id", userId);
  return (data ?? []).map((r) => ({ role: r.role as Role, locationId: (r.location_id as string | null) ?? null }));
}
