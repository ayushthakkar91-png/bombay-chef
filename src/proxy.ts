import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (Next.js 16's renamed middleware). Scoped to `/admin/*` and `/account/*`
 * via the matcher below, so the public marketing site is never intercepted,
 * kept static, or otherwise affected.
 *
 * Two jobs:
 *   1. Refresh the Supabase auth session cookie on each matched request.
 *   2. Optimistic gate — bounce signed-out visitors to the area's login page.
 *
 * This is an OPTIMISTIC check (authentication only). Authorisation (is this
 * session staff? whose customer row is this?) and the real security boundary
 * live in the DAL (`requireRole` / `requireCustomer`) and Postgres RLS.
 */

/** Routes that must render for signed-out visitors (login/register). */
function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === "/admin/login" ||
    pathname === "/account/login" ||
    pathname === "/account/register"
  );
}

function loginFor(pathname: string): string {
  return pathname.startsWith("/admin") ? "/admin/login" : "/account/login";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  return response;
}

export const config = {
  // Admin + account only — the public marketing site is deliberately untouched.
  matcher: ["/admin/:path*", "/account/:path*"],
};
