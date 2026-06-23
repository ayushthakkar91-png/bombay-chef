"use server";

import { unsubscribeByToken } from "@/lib/marketing/contacts";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

export async function unsubscribe(_p: ActionState, form: FormData): Promise<ActionState> {
  const token = str(form, "token");
  if (!token) return fail("This unsubscribe link is invalid.");
  const res = await unsubscribeByToken(token);
  if (!res.ok) return fail("This link is invalid or has already been used.");
  return ok(`You've been unsubscribed${res.email ? ` (${res.email})` : ""}. You won't receive marketing emails from us. You'll still get order and booking confirmations.`);
}
