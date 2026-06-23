import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

/** GET /api/m/[id] — click tracking. Records the click, then redirects to the target. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServiceClient();
  const fallback = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  if (!supabase) return NextResponse.redirect(fallback);
  const { data } = await supabase.from("messages").select("link_url, clicked_at").eq("id", id).maybeSingle();
  if (!data) return NextResponse.redirect(fallback);
  if (!data.clicked_at) await supabase.from("messages").update({ clicked_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.redirect((data.link_url as string) || fallback);
}
