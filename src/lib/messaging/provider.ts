import "server-only";

import type { Channel } from "./constants";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM;
const TWILIO_WA_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. +14155238886
const WA_TOKEN = process.env.WHATSAPP_CLOUD_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

export type SendResult = { ok: boolean; provider: string; sid?: string; error?: string };

export function isMessagingConfigured(): boolean {
  return Boolean((TWILIO_SID && TWILIO_TOKEN && TWILIO_SMS_FROM) || (WA_TOKEN && WA_PHONE_ID) || (TWILIO_SID && TWILIO_TOKEN && TWILIO_WA_FROM));
}

/** Send one message on a channel. Picks the best configured provider; console fallback. */
export async function sendMessage(channel: Channel, to: string, body: string, opts: { statusCallback?: string } = {}): Promise<SendResult> {
  if (channel === "whatsapp" && WA_TOKEN && WA_PHONE_ID) return sendWhatsAppCloud(to, body);
  if (channel === "whatsapp" && TWILIO_SID && TWILIO_TOKEN && TWILIO_WA_FROM) return sendTwilio(`whatsapp:${to}`, `whatsapp:${TWILIO_WA_FROM}`, body, opts.statusCallback);
  if (channel === "sms" && TWILIO_SID && TWILIO_TOKEN && TWILIO_SMS_FROM) return sendTwilio(to, TWILIO_SMS_FROM, body, opts.statusCallback);

  // Console fallback — keeps the queue flowing in dev without credentials.
  console.log(`[messaging:${channel}] → ${to}\n${body}\n`);
  return { ok: true, provider: "console", sid: `console-${Date.now()}` };
}

async function sendTwilio(to: string, from: string, body: string, statusCallback?: string): Promise<SendResult> {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  if (statusCallback) form.set("StatusCallback", statusCallback);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, provider: "twilio", error: json.message ?? `HTTP ${res.status}` };
    return { ok: true, provider: "twilio", sid: json.sid };
  } catch (e) {
    return { ok: false, provider: "twilio", error: e instanceof Error ? e.message : "network error" };
  }
}

async function sendWhatsAppCloud(to: string, body: string): Promise<SendResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body } }),
    });
    const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) return { ok: false, provider: "whatsapp_cloud", error: json.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, provider: "whatsapp_cloud", sid: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, provider: "whatsapp_cloud", error: e instanceof Error ? e.message : "network error" };
  }
}
