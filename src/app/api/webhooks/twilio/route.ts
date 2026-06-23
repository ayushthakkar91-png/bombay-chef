import { NextResponse } from "next/server";
import crypto from "crypto";

import { getServiceClient } from "@/lib/supabase/clients";
import { toE164 } from "@/lib/messaging/constants";

export const dynamic = "force-dynamic";

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_WORDS = new Set(["START", "YES", "UNSTOP"]);

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Twilio signs requests: base64(HMAC-SHA1(authToken, url + sorted key+value concat)). */
function verifyTwilio(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true; // dev / console mode — nothing to verify against
  if (!signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

const STATUS_MAP: Record<string, { status: string; field?: "delivered_at" | "read_at" }> = {
  sent: { status: "sent" },
  delivered: { status: "delivered", field: "delivered_at" },
  read: { status: "read", field: "read_at" },
  failed: { status: "failed" },
  undelivered: { status: "failed" },
};

export async function POST(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;

  if (!verifyTwilio(`${siteUrl()}/api/webhooks/twilio`, params, request.headers.get("x-twilio-signature"))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 403 });
  }

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  // 1) Delivery status callback.
  if (params.MessageStatus && params.MessageSid) {
    const map = STATUS_MAP[params.MessageStatus];
    if (map) {
      const patch: Record<string, unknown> = { status: map.status };
      if (map.field) patch[map.field] = new Date().toISOString();
      if (params.ErrorMessage) patch.error = params.ErrorMessage;
      // Don't regress a delivered/read message back to 'sent'.
      let q = supabase.from("messages").update(patch).eq("provider_sid", params.MessageSid);
      if (map.status === "sent") q = q.not("status", "in", "(delivered,read)");
      await q;
    }
    return new NextResponse("", { status: 204 });
  }

  // 2) Inbound message → consent keywords (STOP / START).
  if (params.Body && params.From) {
    const phone = toE164(params.From.replace(/^whatsapp:/, ""));
    const word = params.Body.trim().toUpperCase();
    if (phone && STOP_WORDS.has(word)) {
      await supabase.from("messaging_preferences").upsert(
        { phone, sms_opt_in: false, whatsapp_opt_in: false, marketing_opt_in: false, opt_out_at: new Date().toISOString(), source: "inbound_stop" },
        { onConflict: "phone" },
      );
    } else if (phone && START_WORDS.has(word)) {
      await supabase.from("messaging_preferences").upsert(
        { phone, sms_opt_in: true, opt_out_at: null, source: "inbound_start" },
        { onConflict: "phone" },
      );
    }
    return new NextResponse("", { status: 204 });
  }

  return new NextResponse("", { status: 204 });
}
