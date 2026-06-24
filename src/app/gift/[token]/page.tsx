import type { Metadata } from "next";
import Link from "next/link";

import { getGiftCardView } from "@/lib/giftcards/service";
import { gbp } from "@/lib/giftcards/constants";
import { PrintButton } from "@/components/giftcards/PrintButton";

export const metadata: Metadata = {
  title: "Your gift card | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function GiftCardViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await getGiftCardView(token);

  if (!card) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Gift card not found</p>
        <Link href="/gift" className="text-[#B08A3E] hover:underline font-sans text-[14px]">Buy a gift card</Link>
      </main>
    );
  }

  const usable = card.status === "active" || card.status === "redeemed";

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6">
      <div className="max-w-[560px] mx-auto">
        {/* The card */}
        <div className="bg-[#2A211C] text-[#F6F2EA] p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-3 border border-[#B08A3E]/40 pointer-events-none" />
          <div className="relative text-center">
            <p className="font-serif text-[26px] tracking-wide">Bombay Bicycle Chef</p>
            <p className="text-[#B08A3E] text-[11px] tracking-[0.3em] uppercase font-sans mt-1">Gift Card</p>

            {card.recipientName && <p className="font-sans text-[14px] text-[#F6F2EA]/70 mt-8">For {card.recipientName}{card.senderName ? `, from ${card.senderName}` : ""}</p>}
            {card.message && <p className="font-serif text-[18px] italic mt-3 text-[#F6F2EA]/90">“{card.message}”</p>}

            <p className="font-serif text-[52px] mt-8 leading-none">{gbp(card.status === "redeemed" ? 0 : card.balancePence)}</p>
            <p className="text-[#F6F2EA]/60 text-[12px] font-sans mt-1">{card.status === "redeemed" ? "fully redeemed" : `balance · ${gbp(card.initialPence)} original value`}</p>

            {usable && (
              <div className="mt-8 inline-block border border-[#B08A3E] px-6 py-3">
                <p className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-sans">Code</p>
                <p className="font-sans text-[20px] tracking-[2px] mt-1">{card.code}</p>
              </div>
            )}
            {card.status === "pending" && <p className="mt-8 text-[#F6F2EA]/70 font-sans text-[14px]">This card is being activated — check back shortly.</p>}
            {card.status === "void" && <p className="mt-8 text-[#E8B4A0] font-sans text-[14px]">This gift card is no longer valid.</p>}
          </div>
        </div>

        <p className="text-center text-[#5A524B] font-sans text-[14px] mt-6 print:hidden">Redeem the code at checkout when ordering online at bombay-bicycle-chef.com.</p>

        <div className="flex justify-center gap-4 mt-6 print:hidden">
          <PrintButton />
          <Link href="/order" className="inline-flex items-center justify-center h-[48px] px-7 border border-[#2A211C]/25 text-[#2B221D] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#2A211C]/5 transition-colors">Order online</Link>
        </div>
      </div>
    </main>
  );
}
