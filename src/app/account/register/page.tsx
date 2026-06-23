import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCustomer } from "@/lib/auth/customer";
import { RegisterForm } from "@/components/account/RegisterForm";

export const metadata: Metadata = {
  title: "Create an account | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function AccountRegisterPage({
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
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-2">Your Account</p>
          <h1 className="font-serif text-[36px] text-[#2B221D] font-light">Join the table</h1>
          <p className="text-[#5A524B] font-sans text-[15px] mt-2">Track orders, manage reservations, and reorder your favourites.</p>
        </div>
        <div className="bg-white border border-[#2A211C]/10 p-7">
          <RegisterForm next={dest} />
        </div>
      </div>
    </main>
  );
}
