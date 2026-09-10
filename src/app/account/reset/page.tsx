import type { Metadata } from "next";
import Link from "next/link";

import { getCustomer } from "@/lib/auth/customer";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

/**
 * New-password form. Reached only after /auth/reset established the recovery
 * session, so a valid session must be present; otherwise the link expired or was
 * opened out of context and we send them back to request a fresh one.
 */
export default async function ResetPasswordPage() {
  const ctx = await getCustomer();

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-2">Your Account</p>
          <h1 className="font-serif text-[36px] text-[#2B221D] font-light">Set a new password</h1>
        </div>
        <div className="bg-white border border-[#2A211C]/10 p-7">
          {ctx ? (
            <ResetPasswordForm />
          ) : (
            <div className="text-center">
              <p className="font-sans text-[15px] text-[#5A524B] mb-6">This reset link has expired or already been used. Please request a new one.</p>
              <Link href="/account/forgot" className="inline-flex h-[52px] items-center justify-center bg-[#2B221D] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] hover:bg-[#B08A3E] transition-colors">Request a new link</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
