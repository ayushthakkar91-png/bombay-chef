import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-2">Your Account</p>
          <h1 className="font-serif text-[36px] text-[#2B221D] font-light">Reset password</h1>
          <p className="text-[#5A524B] font-sans text-[15px] mt-2">Enter your email and we&apos;ll send you a link to set a new password.</p>
        </div>
        <div className="bg-white border border-[#2A211C]/10 p-7">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
