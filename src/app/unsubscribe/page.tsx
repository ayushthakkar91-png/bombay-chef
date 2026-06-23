import type { Metadata } from "next";
import Link from "next/link";

import { UnsubscribeForm } from "@/components/marketing/UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6">
      <div className="max-w-[520px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-serif text-[36px] text-[#2B221D] font-light">Email preferences</h1>
        </div>
        <div className="bg-white border border-[#2A211C]/10 p-7">
          {token ? (
            <UnsubscribeForm token={token} />
          ) : (
            <p className="text-[#5A524B] font-sans text-[15px] text-center">This unsubscribe link is missing its token. Please use the link from your email.</p>
          )}
        </div>
        <p className="text-center mt-6"><Link href="/" className="text-[#5A524B] text-[13px] underline hover:text-[#B08A3E] font-sans">Back to home</Link></p>
      </div>
    </main>
  );
}
