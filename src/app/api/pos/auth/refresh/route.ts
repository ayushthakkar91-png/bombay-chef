import { NextResponse } from "next/server";
import { posRefresh } from "@/lib/pos/auth";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await rateLimit("pos-refresh", { limit: 30, windowSec: 60, failClosed: true })).ok) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { refreshToken?: string } | null;
  if (typeof body?.refreshToken !== "string" || !body.refreshToken) return NextResponse.json({ error: "refreshToken required." }, { status: 400 });
  const result = await posRefresh(body.refreshToken);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json(result);
}
