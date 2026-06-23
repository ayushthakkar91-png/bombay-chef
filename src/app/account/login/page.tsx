import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCustomer } from "@/lib/auth/customer";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const ctx = await getCustomer();
  const { next } = await searchParams;
  const dest = next?.startsWith("/account") ? next : "/account";
  if (ctx) redirect(dest);

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-2">Your Account</p>
          <h1 className="font-serif text-[36px] text-[#2B221D] font-light">Welcome back</h1>
        </div>
        <div className="bg-white border border-[#2A211C]/10 p-7">
          <LoginForm next={dest} />
        </div>
      </div>
    </main>
  );
}
