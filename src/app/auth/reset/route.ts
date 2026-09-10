import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getUserClient } from "@/lib/supabase/clients";

/**
 * Password-reset landing (the target of the email link). Supabase sends either a
 * PKCE `code` or a `token_hash`+`type`; we accept both, establish the short-lived
 * recovery session (cookies are writable in a route handler, unlike a Server
 * Component render), then send the user to the new-password form. Any failure —
 * expired or already-used link — bounces back to the request form with a notice.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await getUserClient();
  const bad = NextResponse.redirect(new URL("/account/forgot?error=expired", request.url));
  if (!supabase) return bad;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return bad;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return bad;
  } else {
    return bad;
  }

  return NextResponse.redirect(new URL("/account/reset", request.url));
}
