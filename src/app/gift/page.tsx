import type { Metadata } from "next";
import Link from "next/link";

import { BuyGiftCard } from "@/components/giftcards/BuyGiftCard";

export const metadata: Metadata = {
  title: "Gift cards | Bombay Bicycle Chef",
  description: "Give the gift of Bombay Bicycle Chef — a gift card delivered by email, now or on a chosen date.",
};

export default async function GiftPage({ searchParams }: { searchParams: Promise<{ purchased?: string }> }) {
  const { purchased } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6">
      <div className="max-w-[760px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-3">Gift Cards</p>
          <h1 className="font-serif text-[40px] lg:text-[52px] text-[#2B221D] font-light leading-[1.1]">The Gift of a Table</h1>
          <p className="text-[#5A524B] font-sans text-[15px] mt-3">Delivered by email, redeemable on any online order.</p>
        </div>

        {purchased ? (
          <div className="bg-white border border-[#2A211C]/10 p-10 text-center">
            <p className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-sans font-semibold mb-3">Thank you</p>
            <p className="font-serif text-[28px] text-[#2B221D] mb-3">Your gift card is on its way</p>
            <p className="text-[#5A524B] font-sans text-[15px] mb-8">We&apos;ve emailed the recipient (or scheduled it for your chosen date). A receipt is in your inbox.</p>
            <Link href="/gift" className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Buy another</Link>
          </div>
        ) : (
          <div className="bg-white border border-[#2A211C]/10 p-7 lg:p-9">
            <BuyGiftCard />
          </div>
        )}
      </div>
    </main>
  );
}
