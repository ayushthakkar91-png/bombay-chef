"use server";

import { revalidatePath } from "next/cache";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { sendCampaign } from "@/lib/messaging/campaigns";
import { syncOrders, syncReservations, syncRewards } from "@/lib/messaging/sync";
import { dispatchQueued } from "@/lib/messaging/dispatch";
import { toE164 } from "@/lib/messaging/constants";
import { type ActionState, fail, ok, str, bool } from "@/lib/admin/validation";

async function audit(action: string, entity: string, entityId: string, after: Record<string, unknown>) {
  const service = getServiceClient();
  if (!service) return;
  const ctx = await requireRole("restaurant_manager");
  await service.from("audit_log").insert({ actor_id: ctx.userId, action, entity, entity_id: entityId, after });
}

/* ---- Templates -------------------------------------------------------- */

export async function saveTemplate(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const name = str(form, "name");
  const body = str(form, "body");
  const channel = str(form, "channel") === "whatsapp" ? "whatsapp" : "sms";
  const isActive = bool(form, "isActive");
  if (!name) return fail("Name is required.");
  if (!body) return fail("Body is required.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("message_templates").update({ name, body, channel, is_active: isActive }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/messaging/templates");
  return ok("Template saved.");
}

/* ---- Campaigns -------------------------------------------------------- */

export async function saveCampaign(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("restaurant_manager");
  const name = str(form, "name");
  const body = str(form, "body");
  const channel = str(form, "channel") === "whatsapp" ? "whatsapp" : "sms";
  const linkUrl = str(form, "linkUrl") || null;
  if (!name) return fail("Campaign name is required.", { name: "Required." }, { name });
  if (!body) return fail("Message body is required.", { body: "Required." }, { name });

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("message_campaigns").insert({ name, body, channel, link_url: linkUrl, created_by: ctx.userId });
  if (error) return fail(error.message);
  revalidatePath("/admin/messaging/campaigns");
  return ok("Campaign created as draft.");
}

export async function sendCampaignAction(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing campaign.");
  const res = await sendCampaign(id);
  if ("error" in res) return fail(res.error);
  await audit("campaign.send", "message_campaigns", id, { queued: res.queued });
  revalidatePath("/admin/messaging/campaigns");
  return ok(`Campaign queued to ${res.queued} opted-in recipient${res.queued === 1 ? "" : "s"}.`);
}

/* ---- Consent ---------------------------------------------------------- */

export async function setConsent(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const phone = toE164(str(form, "phone"));
  if (!phone) return fail("Enter a valid phone number.");
  const sms = bool(form, "sms");
  const whatsapp = bool(form, "whatsapp");
  const marketing = bool(form, "marketing");
  const optedOut = !sms && !whatsapp && !marketing;

  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  const { error } = await service.from("messaging_preferences").upsert(
    { phone, sms_opt_in: sms, whatsapp_opt_in: whatsapp, marketing_opt_in: marketing, opt_out_at: optedOut ? new Date().toISOString() : null, source: "admin" },
    { onConflict: "phone" },
  );
  if (error) return fail(error.message);
  await audit("consent.update", "messaging_preferences", phone, { sms, whatsapp, marketing });
  revalidatePath("/admin/messaging");
  return ok("Preferences saved.");
}

/* ---- Manual run (demo / catch-up) ------------------------------------- */

export async function runMessagingNow(): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const now = Date.now();
  const [o, r, rw] = await Promise.all([syncOrders(now), syncReservations(now), syncRewards(now)]);
  const d = await dispatchQueued(now);
  revalidatePath("/admin/messaging");
  return ok(`Queued ${o + r + rw} new · sent ${d.sent} · failed ${d.failed}.`);
}
