import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isAdminPathEnabled } from "@/lib/admin/enabled-sections";

/**
 * Proxy (Next.js 16's renamed middleware). Scoped via the matcher below to
 * `/admin/*`, `/account/*`, `/platform/*` and the payment page `/order/checkout`,
 * so the public marketing site is never intercepted and stays static.
 *
 * Jobs:
 *   1. Payment page: a strict, per-request nonce Content-Security-Policy (PCI).
 *   2. Refresh the Supabase auth session cookie on admin/account/platform.
 *   3. Optimistic gate — bounce signed-out visitors to the area's login page.
 *
 * The auth gate is an OPTIMISTIC check (authentication only). Authorisation (is
 * this session staff? whose customer row is this?) and the real security
 * boundary live in the DAL (`requireRole` / `requireCustomer`) and Postgres RLS.
 */

const isDev = process.env.NODE_ENV !== "production";

/**
 * Strict CSP for the PAYMENT page, where Stripe's card iframe is mounted. Unlike
 * the site-wide CSP in next.config.ts it has NO 'unsafe-inline' for scripts: only
 * scripts carrying this request's nonce (Next.js applies it to its own scripts
 * automatically) and scripts those load ('strict-dynamic' — e.g. Stripe.js) may
 * run, so an injected inline script can't tamper with or skim the page.
 * Stripe hosts follow Stripe's CSP guide (Stripe.js + Checkout). Styles keep
 * 'unsafe-inline': a style nonce would disable React's inline style attributes,
 * and card data never touches this document anyway (it lives in Stripe's iframe).
 */
function paymentPageCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://va.vercel-scripts.com${isDev ? " ws: http://localhost:*" : ""}`,
    "frame-src https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function withPaymentPageCsp(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = paymentPageCsp(nonce);
  // Next.js reads the nonce from the REQUEST's CSP header while rendering and
  // stamps it on its scripts; the RESPONSE header is what the browser enforces.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/** Routes that must render for signed-out visitors (login/register). */
function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === "/admin/login" ||
    pathname === "/account/login" ||
    pathname === "/account/register"
  );
}

function loginFor(pathname: string): string {
  // Platform operators authenticate through the admin login.
  return pathname.startsWith("/admin") || pathname.startsWith("/platform") ? "/admin/login" : "/account/login";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Payment page: strict nonce CSP only — no auth gate (guests check out too).
  if (pathname === "/order/checkout") {
    return withPaymentPageCsp(request);
  }

  const isOpen = isPublicAuthPath(pathname);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured: nobody can authenticate. Let the login/register
  // pages render (they show a setup notice); send everything else there.
  if (!url || !anonKey) {
    if (!isOpen) return NextResponse.redirect(new URL(loginFor(pathname), request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isOpen) {
    const target = new URL(loginFor(pathname), request.url);
    target.searchParams.set("next", pathname);
    return NextResponse.redirect(target);
  }

  // NB: we do NOT bounce a signed-in user off the login pages here. For /admin
  // "is this an admin?" depends on staff_roles (RLS-aware), so the login *page*
  // owns that redirect — avoiding an /admin ⇄ /admin/login loop for a non-staff
  // session. The /account login/register pages do the same with requireCustomer.

  // Slimmed-down panel: hidden admin sections (see enabled-sections.ts) are
  // unreachable even by a typed/bookmarked URL — bounce them to the dashboard.
  // Only /admin/* panel routes are gated (not /admin/login, /account, /platform).
  if (pathname.startsWith("/admin/") && !isPublicAuthPath(pathname) && !isAdminPathEnabled(pathname)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  // Admin + account + platform + the payment page — the public marketing site is untouched.
  matcher: ["/admin/:path*", "/account/:path*", "/platform/:path*", "/order/checkout"],
};
