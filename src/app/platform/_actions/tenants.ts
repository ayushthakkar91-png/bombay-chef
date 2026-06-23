"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getServiceClient } from "@/lib/supabase/clients";
import { requirePlatformAdmin, requireTenantAccess, audit } from "@/lib/saas/tenancy";
import { provisionTenant, type ProvisionInput } from "@/lib/saas/provision";
import { createSubscriptionCheckout, createBillingPortal } from "@/lib/saas/billing";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

/* ---- Provisioning (setup wizard) -------------------------------------- */

export type ProvisionResult = { ok: true; tenantId: string } | { ok: false; error: string };

export async function provisionTenantAction(input: ProvisionInput): Promise<ProvisionResult> {
  const ctx = await requirePlatformAdmin();
  if (!input.name?.trim()) return { ok: false, error: "Restaurant name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.ownerEmail ?? "")) return { ok: false, error: "A valid owner email is required." };
  if ((input.ownerPassword ?? "").length < 8) return { ok: false, error: "Owner password must be at least 8 characters." };
  const res = await provisionTenant(input, ctx.userId);
  if ("error" in res) return { ok: false, error: res.error };
  return { ok: true, tenantId: res.tenantId };
}

/* ---- Lifecycle (platform admin) --------------------------------------- */

export async function updateTenantStatus(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requirePlatformAdmin();
  const id = str(form, "id");
  const status = str(form, "status");
  if (!id || !["trialing", "active", "suspended", "cancelled"].includes(status)) return fail("Invalid request.");
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  await service.from("tenants").update({ status }).eq("id", id);
  await audit(id, ctx.userId, "tenant.status", "tenants", { status });
  revalidatePath(`/platform/tenants/${id}`);
  return ok(`Tenant ${status}.`);
}

export async function updateTenantPlan(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requirePlatformAdmin();
  const id = str(form, "id");
  const planKey = str(form, "planKey");
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  const { data: plan } = await service.from("plans").select("id").eq("key", planKey).maybeSingle();
  if (!plan) return fail("Unknown plan.");
  await service.from("tenants").update({ plan_id: plan.id }).eq("id", id);
  await service.from("subscriptions").update({ plan_id: plan.id }).eq("tenant_id", id);
  await audit(id, ctx.userId, "tenant.plan", "tenants", { planKey });
  revalidatePath(`/platform/tenants/${id}`);
  return ok("Plan updated.");
}

/* ---- Branding / white-label (owner or platform admin) ----------------- */

export async function updateBranding(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  if (!id) return fail("Missing tenant.");
  const ctx = await requireTenantAccess(id);
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  await service.from("tenant_settings").upsert({
    tenant_id: id,
    brand_name: str(form, "brandName") || null,
    logo_url: str(form, "logoUrl") || null,
    primary_color: str(form, "primaryColor") || "#2B221D",
    accent_color: str(form, "accentColor") || "#B08A3E",
    custom_domain: str(form, "customDomain") || null,
    support_email: str(form, "supportEmail") || null,
  }, { onConflict: "tenant_id" });
  await audit(id, ctx.userId, "tenant.branding", "tenant_settings");
  revalidatePath(`/platform/tenants/${id}`);
  return ok("Branding saved.");
}

/* ---- Tenant users ----------------------------------------------------- */

export async function addTenantUser(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const email = str(form, "email").toLowerCase();
  const role = ["owner", "admin", "member"].includes(str(form, "role")) ? str(form, "role") : "member";
  if (!id || !email) return fail("Email is required.");
  const ctx = await requireTenantAccess(id);
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  const { data: list } = await service.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) return fail("No account with that email — they must sign up first.");
  const { error } = await service.from("tenant_users").upsert({ tenant_id: id, user_id: user.id, role }, { onConflict: "tenant_id,user_id" });
  if (error) return fail(error.message);
  await audit(id, ctx.userId, "tenant.user.add", "tenant_users", { email, role });
  revalidatePath(`/platform/tenants/${id}`);
  return ok("Member added.");
}

export async function removeTenantUser(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const userId = str(form, "userId");
  if (!id || !userId) return fail("Missing member.");
  const ctx = await requireTenantAccess(id);
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  await service.from("tenant_users").delete().eq("tenant_id", id).eq("user_id", userId);
  await audit(id, ctx.userId, "tenant.user.remove", "tenant_users", { userId });
  revalidatePath(`/platform/tenants/${id}`);
  return ok("Member removed.");
}

/* ---- Billing ---------------------------------------------------------- */

export async function startSubscription(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const interval = str(form, "interval") === "annual" ? "annual" : "monthly";
  if (!id) return fail("Missing tenant.");
  await requireTenantAccess(id);
  const res = await createSubscriptionCheckout(id, interval);
  if ("error" in res) return fail(res.error);
  redirect(res.url);
}

export async function openBillingPortal(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const customerId = str(form, "customerId");
  if (!id || !customerId) return fail("No Stripe customer yet.");
  await requireTenantAccess(id);
  const res = await createBillingPortal(customerId);
  if ("error" in res) return fail(res.error);
  redirect(res.url);
}
