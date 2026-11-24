import { NextResponse } from "next/server";
import { verifyPosRequest } from "@/lib/pos/auth";
import { listLiveOrdersForPos } from "@/lib/pos/orders";

export const dynamic = "force-dynamic";

import { locationIdFromSlug } from "@/lib/locations";

export async function GET(request: Request, { params }: { params: Promise<{ loc: string }> }) {
  const { loc } = await params;
  // An unknown slug gets the same answer as a bad token. Answering 404 first
  // let anyone list which branch slugs exist without a token.
  const locationId = await locationIdFromSlug(loc);
  const ctx = locationId ? await verifyPosRequest(request, locationId) : null;
  if (!locationId || !ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const orders = await listLiveOrdersForPos(locationId);
  return NextResponse.json({ orders });
}
