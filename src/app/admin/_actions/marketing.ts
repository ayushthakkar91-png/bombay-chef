"use server";

import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/ratelimit";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { sendCampaign } from "@/lib/marketing/campaigns";
import { recomputeSegments } from "@/lib/marketing/segments";
import { type ActionState, fail, ok, str, intOrNull, bool, isSlug } from "@/lib/admin/validation";

/* ---- Campaigns -------------------------------------------------------- */

export async function createCampaign(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const name = str(form, "name");
  const subject = str(form, "subject");
  const body = str(form, "body");
  const imageUrl = str(form, "imageUrl").trim() || null;
  const ctaUrl = str(form, "ctaUrl").trim() || null;
  const ctaLabel = str(form, "ctaLabel").trim() || null;
  const segmentId = str(form, "segmentId") || null;
  const values = { name, subject, body, imageUrl: imageUrl ?? "", ctaUrl: ctaUrl ?? "", ctaLabel: ctaLabel ?? "" };
  if (!name || !subject || !body) return fail("Name, subject and message are all required.", undefined, values);
  for (const [label, url] of [["image", imageUrl], ["button link", ctaUrl]] as const) {
    if (url && !/^https:\/\//i.test(url)) return fail(`The ${label} must be a full https:// link.`, undefined, values);
  }

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("campaigns").insert({
    provider: "internal",
    name,
    subject,
    body_text: body,
    image_url: imageUrl,
    cta_url: ctaUrl,
    cta_label: ctaLabel,
    segment_id: segmentId,
    audience: segmentId ?? "all subscribers",
    status: "draft",
  });
  if (error) return fail(error.message, undefined, values);
  revalidatePath("/admin/marketing/campaigns");
  return ok("Draft saved.");
}

export async function sendCampaignAction(_p: ActionState, form: FormData): Promise<ActionState> {
  if (!(await rateLimit("admin-campaign-send", { limit: 3, windowSec: 300, failClosed: true })).ok) {
    return fail("Campaigns are going out too quickly — wait a few minutes before sending another.");
  }
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing campaign.");
  const res = await sendCampaign(id);
  if (!res.ok) return fail(res.error ?? "Couldn't send.");
  revalidatePath("/admin/marketing/campaigns");
  return ok(`Sent to ${res.recipients} subscriber${res.recipients === 1 ? "" : "s"}.`);
}

/* ---- Segments --------------------------------------------------------- */

export async function refreshSegments(): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const res = await recomputeSegments();
  revalidatePath("/admin/marketing/segments");
  const total = Object.values(res.updated).reduce((s, n) => s + n, 0);
  return ok(`Segments refreshed (${total} memberships).`);
}

/* ---- Promotions (public discount codes) ------------------------------- */

export async function createPromo(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const code = str(form, "code").toUpperCase();
  const kind = str(form, "kind");
  const rawValue = str(form, "value");
  const minSpend = str(form, "minSpend");
  const globalLimit = intOrNull(form, "globalLimit");
  const values = { code, value: rawValue, minSpend };

  if (!code) return fail("A code is required.", { code: "Required." }, values);
  if (!isSlug(code.toLowerCase())) return fail("Letters, numbers and hyphens only.", { code: "Invalid." }, values);
  if (!["percent", "fixed", "free_delivery"].includes(kind)) return fail("Choose a discount type.");

  let value = 0;
  if (kind === "percent") {
    value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0 || value > 100) return fail("Percent must be 1–100.", { value: "1–100." }, values);
    value = Math.round(value);
  } else if (kind === "fixed") {
    const pounds = Number(rawValue);
    if (!Number.isFinite(pounds) || pounds <= 0) return fail("Enter a valid amount.", { value: "Invalid." }, values);
    value = Math.round(pounds * 100);
  }

  const minSpendPence = minSpend ? Math.round(Number(minSpend) * 100) : 0;

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("promo_codes").insert({
    code,
    kind,
    value,
    min_spend_pence: Number.isFinite(minSpendPence) ? minSpendPence : 0,
    global_limit: globalLimit ?? null,
    is_active: true,
  });
  if (error) {
    if (error.code === "23505") return fail("That code already exists.", { code: "Already in use." }, values);
    return fail(error.message, undefined, values);
  }
  revalidatePath("/admin/marketing/promotions");
  return ok(`Code ${code} created.`);
}

export async function togglePromo(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const next = bool(form, "next");
  if (!id) return fail("Missing code.");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("promo_codes").update({ is_active: next }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/marketing/promotions");
  return ok(next ? "Code activated." : "Code deactivated.");
}
