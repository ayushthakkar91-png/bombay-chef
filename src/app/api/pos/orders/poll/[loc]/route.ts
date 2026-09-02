import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/clients";
import { verifyPosRequest } from "@/lib/pos/auth";
import { listLiveOrdersForPos } from "@/lib/pos/orders";

export const dynamic = "force-dynamic";

async function locationIdFromSlug(slug: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("locations").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data ? (data.id as string) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ loc: string }> }) {
  const { loc } = await params;
  const locationId = await locationIdFromSlug(loc);
  if (!locationId) return NextResponse.json({ error: "Unknown location." }, { status: 404 });

  const ctx = await verifyPosRequest(request, locationId);
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const orders = await listLiveOrdersForPos(locationId);
  return NextResponse.json({ orders });
}
