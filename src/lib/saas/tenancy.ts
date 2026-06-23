import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";

export type PlatformContext = { userId: string; email: string | null; isPlatformAdmin: boolean; ownedTenantIds: string[] };

/** Who is this, and what platform/tenant access do they have? Memoised per request. */
export const getPlatformContext = cache(async (): Promise<PlatformContext | null> => {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = getServiceClient();
  if (!service) return null;
  const [{ data: pa }, { data: tu }] = await Promise.all([
    service.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    service.from("tenant_users").select("tenant_id, role").eq("user_id", user.id).in("role", ["owner", "admin"]),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    isPlatformAdmin: Boolean(pa),
    ownedTenantIds: (tu ?? []).map((r) => r.tenant_id as string),
  };
});

/** Require a platform operator. Tenant owners are bounced to their own admin. */
export async function requirePlatformAdmin(): Promise<PlatformContext> {
  const ctx = await getPlatformContext();
  if (!ctx) redirect("/admin/login");
  if (!ctx.isPlatformAdmin) redirect("/admin");
  return ctx;
}

/** Require platform admin OR owner/admin of the given tenant. */
export async function requireTenantAccess(tenantId: string): Promise<PlatformContext> {
  const ctx = await getPlatformContext();
  if (!ctx) redirect("/admin/login");
  if (!ctx.isPlatformAdmin && !ctx.ownedTenantIds.includes(tenantId)) redirect("/admin");
  return ctx;
}

export async function audit(tenantId: string | null, actorId: string, action: string, entity?: string, meta?: Record<string, unknown>): Promise<void> {
  const service = getServiceClient();
  if (!service) return;
  await service.from("tenant_audit_log").insert({ tenant_id: tenantId, actor_id: actorId, action, entity: entity ?? null, meta: meta ?? null });
}
