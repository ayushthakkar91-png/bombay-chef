import { NextResponse } from "next/server";
import { verifyPosRequest } from "@/lib/pos/auth";
import { updateOrderStatusPos } from "@/lib/pos/orders";
import { locationOfOrder } from "@/lib/pos/route-helpers";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationId = await locationOfOrder(id);
  if (!locationId) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await verifyPosRequest(request, locationId))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  if (typeof body?.status !== "string" || !body.status) return NextResponse.json({ error: "status required." }, { status: 400 });

  const result = await updateOrderStatusPos(id, locationId, body.status);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
