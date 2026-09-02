import "server-only";

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/clients";
import { verifyPosRequest } from "@/lib/pos/auth";
import { registerDevice } from "@/lib/pos/devices";

export const dynamic = "force-dynamic";

const POS_RESTAURANT_TO_SLUG: Record<string, string> = {
  "1": "balham",
};

async function locationIdFromSlug(slug: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("locations")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ? (data.id as string) : null;
}

export async function POST(request: Request) {
  // Parse request body
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const { fcmToken, restaurantId, locationSlug, deviceName, deviceModel } = body;

  // Resolve location ID from locationSlug or restaurantId
  let slug: string | null = null;
  if (locationSlug) {
    slug = locationSlug;
  } else if (restaurantId) {
    slug = POS_RESTAURANT_TO_SLUG[String(restaurantId)] ?? null;
  }
  if (!slug) return NextResponse.json({ error: "Unknown location." }, { status: 400 });

  const locationId = await locationIdFromSlug(slug);
  if (!locationId) return NextResponse.json({ error: "Unknown location." }, { status: 400 });

  // Verify POS request for this location
  const ctx = await verifyPosRequest(request, locationId);
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Guard fcmToken is a non-empty string
  if (typeof fcmToken !== "string" || !fcmToken.trim()) {
    return NextResponse.json({ error: "fcmToken is required." }, { status: 400 });
  }

  // Register the device
  const ok = await registerDevice({
    fcmToken,
    locationId,
    profileId: ctx.userId,
    deviceName,
    deviceModel,
  });

  return NextResponse.json({ ok });
}
