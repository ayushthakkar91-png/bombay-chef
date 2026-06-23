import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStaffContext } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/clients";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in · Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already a valid staff session → into the panel. (Owning this redirect here,
  // not in the proxy, prevents a loop for signed-in non-staff visitors.)
  const ctx = await getStaffContext();
  if (ctx) redirect("/admin");

  const { next } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 text-text">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl text-text">Bombay Bicycle Chef</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-brass">Management</p>
        </div>

        <div className="rounded-xl border border-sand bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-text">Sign in</h1>
          <p className="mb-5 text-sm text-body">Staff access only.</p>

          {configured ? (
            <LoginForm next={next ?? "/admin"} />
          ) : (
            <div className="rounded-md border border-primary/25 bg-primary/5 px-3.5 py-3 text-sm text-primary">
              Supabase isn’t configured yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and the keys to
              <code> .env.local</code>, then restart the dev server.
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-body">
          Bombay Bicycle Chef · staff portal
        </p>
      </div>
    </main>
  );
}
