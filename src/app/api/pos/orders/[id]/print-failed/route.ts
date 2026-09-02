import { NextResponse } from "next/server";
import { verifyPosRequest } from "@/lib/pos/auth";
import { markPrintFailed } from "@/lib/pos/orders";
import { locationOfOrder } from "@/lib/pos/route-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationId = await locationOfOrder(id);
  if (!locationId) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await verifyPosRequest(request, locationId))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { error?: string } | null;
  const errorMessage = typeof body?.error === "string" ? body.error : "";

  const ok = await markPrintFailed(id, locationId, errorMessage);
  return NextResponse.json({ ok });
}
