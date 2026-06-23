import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { audit } from "./tenancy";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "tenant";

export type ProvisionInput = {
  name: string;
  ownerEmail: string;
  ownerPassword: string;
  planKey: string;
  brandName?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
  customDomain?: string | null;
  locations: { name: string; address: string }[];
  seedMenu?: { category: string; name: string; price: string; description?: string }[];
};

export async function provisionTenant(input: ProvisionInput, actorId: string): Promise<{ tenantId: string } | { error: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { error: "Unavailable." };

  // Unique slug.
  let slug = slugify(input.name);
  for (let i = 0; ; i++) {
    const { data } = await supabase.from("tenants").select("id").eq("slug", i === 0 ? slug : `${slug}-${i}`).maybeSingle();
    if (!data) { slug = i === 0 ? slug : `${slug}-${i}`; break; }
    if (i > 20) return { error: "Could not allocate a unique slug." };
  }

  // Owner (create or link existing auth user).
  let ownerId: string | null = null;
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({ email: input.ownerEmail, password: input.ownerPassword, email_confirm: true });
  if (created?.user) ownerId = created.user.id;
  else if (cErr) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    ownerId = list?.users.find((u) => u.email?.toLowerCase() === input.ownerEmail.toLowerCase())?.id ?? null;
    if (!ownerId) return { error: cErr.message };
  }
  if (!ownerId) return { error: "Could not create the owner account." };

  const { data: plan } = await supabase.from("plans").select("id").eq("key", input.planKey).maybeSingle();

  const { data: tenant, error: tErr } = await supabase.from("tenants").insert({ slug, name: input.name, status: "trialing", plan_id: plan?.id ?? null, owner_id: ownerId, trial_ends_at: null }).select("id").single();
  if (tErr || !tenant) return { error: tErr?.message ?? "Could not create the tenant." };
  const tenantId = tenant.id as string;

  await supabase.from("tenant_settings").insert({
    tenant_id: tenantId,
    brand_name: input.brandName || input.name,
    primary_color: input.primaryColor || "#2B221D",
    accent_color: input.accentColor || "#B08A3E",
    custom_domain: input.customDomain || null,
    support_email: input.supportEmail || null,
    seed_menu: input.seedMenu && input.seedMenu.length ? input.seedMenu : null,
  });

  await supabase.from("tenant_users").insert({ tenant_id: tenantId, user_id: ownerId, role: "owner" });
  await supabase.from("subscriptions").insert({ tenant_id: tenantId, plan_id: plan?.id ?? null, interval: "monthly", status: "manual" });

  // Locations (slugs namespaced by tenant to stay globally unique).
  const locRows = (input.locations ?? []).filter((l) => l.name.trim()).map((l, i) => ({ tenant_id: tenantId, slug: `${slug}-${slugify(l.name)}`.slice(0, 60) + (i ? `-${i}` : ""), name: l.name.trim(), address: l.address.trim() || "—", is_active: true, sort_order: i }));
  if (locRows.length) await supabase.from("locations").insert(locRows);

  await audit(tenantId, actorId, "tenant.provision", "tenants", { slug, plan: input.planKey, locations: locRows.length });
  return { tenantId };
}
