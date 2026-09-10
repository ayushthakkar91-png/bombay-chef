import type { Metadata } from "next";
import Link from "next/link";

import { getMemberByToken } from "@/lib/loyalty/service";
import { TIER_LABEL, type Tier } from "@/lib/loyalty/constants";

export const metadata: Metadata = {
  title: "Membership | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

/**
 * Public membership card view, reached by scanning a member's QR. Read-only and
 * unindexed — it confirms the card is a valid member and shows their tier +
 * points. Identity/display only for now; no redemption happens here.
 */
export default async function MemberPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const member = await getMemberByToken(token);

  if (!member) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] px-6 pt-[120px] text-center">
        <p className="mb-3 font-serif text-[28px] text-[#2B221D]">Card not found</p>
        <p className="mx-auto mb-8 max-w-sm font-sans text-[15px] text-[#5A524B]">This membership link isn&apos;t valid. Please check the code and try again.</p>
        <Link href="/" className="inline-flex h-[52px] items-center justify-center bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] hover:bg-[#420616]">Home</Link>
      </main>
    );
  }

  const tierLabel = TIER_LABEL[member.tier as Tier] ?? "Member";

  return (
    <main className="min-h-screen bg-[#F6F2EA] px-6 pt-[110px] pb-24">
      <div className="mx-auto max-w-[420px]">
        <div className="overflow-hidden rounded-2xl border border-[#B08A3E]/30 bg-[#2A211C] p-7 text-center text-[#F6F2EA] shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">{tierLabel} Member</p>
          <p className="mt-3 font-serif text-[26px] leading-tight">{member.name?.trim() || "Bombay Bicycle Chef"}</p>
          <p className="mt-5 font-serif text-[44px] leading-none">{member.pointsBalance}</p>
          <p className="mt-1 font-sans text-[12px] text-[#F6F2EA]/60">points · £{(member.pointsBalance / 100).toFixed(2)}</p>
          <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.18em] text-[#F6F2EA]/45">Member no.</p>
          <p className="font-sans text-[15px] tracking-[0.12em] tabular-nums">{member.memberNo}</p>
          <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#3a6b2e]/25 px-3 py-1 font-sans text-[12px] text-[#8fce7a]">✓ Valid member</p>
        </div>
        <p className="mt-4 text-center font-sans text-[12.5px] text-[#5A524B]">Rewards redeem online at checkout. In-store redemption is coming soon.</p>
      </div>
    </main>
  );
}
