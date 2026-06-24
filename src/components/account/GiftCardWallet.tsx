import Link from "next/link";

import type { AccountGiftCard } from "@/lib/repositories/account";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-[#3a6b2e]/10 text-[#3a6b2e]" },
  redeemed: { label: "Fully used", cls: "bg-[#2A211C]/8 text-[#5A524B]" },
  void: { label: "Cancelled", cls: "bg-[#5D0925]/10 text-[#5D0925]" },
};

export function GiftCardWallet({ cards }: { cards: AccountGiftCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="rounded-sm border border-[#2A211C]/10 bg-white px-6 py-12 text-center">
        <p className="font-serif text-[22px] text-[#2B221D]">No gift cards yet</p>
        <p className="mx-auto mt-2 max-w-sm font-sans text-[14px] text-[#5A524B]">Gift cards you buy or receive will appear here, with live balances you can spend at checkout.</p>
        <Link href="/gift" className="mt-6 inline-flex h-[48px] items-center justify-center bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]">Buy a gift card</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cards.map((c) => {
        const s = STATUS[c.status] ?? { label: c.status, cls: "bg-[#2A211C]/8 text-[#5A524B]" };
        return (
          <div key={c.id} className="overflow-hidden rounded-sm border border-[#2A211C]/10 bg-[#2A211C] text-[#F6F2EA]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 lg:p-6">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#B08A3E]">{c.role === "purchased" ? "Purchased" : "Received"} gift card</p>
                <p className="mt-1.5 font-sans text-[18px] tracking-[2px]">{c.code}</p>
                <p className="mt-1 font-sans text-[12px] text-[#F6F2EA]/55">{c.status === "active" && c.expiresAt ? `Expires ${fmtDate(c.expiresAt)}` : c.status === "active" ? "No expiry" : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-[30px] leading-none">{money(c.status === "redeemed" ? 0 : c.balancePence)}</p>
                <p className="mt-1 font-sans text-[11px] text-[#F6F2EA]/55">balance · {money(c.initialPence)} original</p>
                <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 font-sans text-[11px] font-medium ${s.cls}`}>{s.label}</span>
              </div>
            </div>
            {c.status === "active" && (
              <div className="flex items-center justify-between gap-3 border-t border-[#F6F2EA]/10 px-5 py-3 lg:px-6">
                <span className="font-sans text-[12px] text-[#F6F2EA]/60">Redeem the code at checkout.</span>
                {c.viewToken && <Link href={`/gift/${c.viewToken}`} className="font-sans text-[11px] uppercase tracking-[0.12em] text-[#B08A3E] hover:text-[#F6F2EA]">View &amp; print →</Link>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
