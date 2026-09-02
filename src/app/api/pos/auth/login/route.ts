import { NextResponse } from "next/server";
import { posLogin } from "@/lib/pos/auth";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await rateLimit("pos-login", { limit: 10, windowSec: 60, failClosed: true })).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (typeof body?.email !== "string" || typeof body?.password !== "string" || !body.email.trim() || !body.password) return NextResponse.json({ error: "Email and password required." }, { status: 400 });

  const result = await posLogin(body.email.trim(), body.password);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json(result);
}
