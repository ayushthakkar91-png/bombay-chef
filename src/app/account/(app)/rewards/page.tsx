import { requireCustomer } from "@/lib/auth/customer";
import { flags } from "@/lib/flags";
import { getMyLoyalty, listMyVouchers, listMyLedger, listCatalogue } from "@/lib/repositories/loyalty";
import { TIER_LABEL, nextTier } from "@/lib/loyalty/constants";
import { RewardsCatalogue } from "@/components/account/RewardsCatalogue";

const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(new Date(iso));

function voucherLabel(kind: string, value: number): string {
  if (kind === "fixed") return `£${(value / 100).toFixed(2)} off`;
  if (kind === "percent") return `${value}% off`;
  if (kind === "free_delivery") return "Free delivery";
  return "Reward";
}

const REASON_LABEL: Record<string, string> = {
  earn: "Earned", redeem: "Redeemed", birthday: "Birthday reward", anniversary: "Anniversary reward",
  referral: "Referral", adjustment: "Adjustment", expire: "Expired", refund_reversal: "Refund adjustment",
};

export default async function RewardsPage() {
  const ctx = await requireCustomer();

  if (!flags.loyalty) {
    return <div className="bg-white border border-[#2A211C]/10 p-10 text-center font-sans text-[#5A524B]">Rewards are coming soon.</div>;
  }

  const [loyalty, vouchers, ledger, catalogue] = await Promise.all([
    getMyLoyalty(ctx.userId),
    listMyVouchers(ctx.userId),
    listMyLedger(ctx.userId),
    listCatalogue(),
  ]);

  const next = nextTier(loyalty.pointsLifetime);

  return (
    <div className="flex flex-col gap-8">
      {/* Points hero */}
      <div className="bg-[#2A211C] text-[#F6F2EA] p-8 text-center">
        <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-2">{TIER_LABEL[loyalty.tier]} member</p>
        <p className="font-serif text-[56px] leading-none">{loyalty.pointsBalance}</p>
        <p className="text-[#F6F2EA]/70 font-sans text-[14px] mt-2">points · worth £{(loyalty.pointsBalance / 100).toFixed(2)}</p>
        {next && <p className="text-[#F6F2EA]/60 font-sans text-[13px] mt-4">{next.needed} more points to {TIER_LABEL[next.tier]}</p>}
        <p className="text-[#F6F2EA]/50 font-sans text-[12px] mt-4">Earn 1 point for every £1 spent on food.</p>
      </div>

      {/* Catalogue */}
      <section>
        <h2 className="font-serif text-[24px] text-[#2B221D] mb-4">Redeem your points</h2>
        <RewardsCatalogue rewards={catalogue} balance={loyalty.pointsBalance} tier={loyalty.tier} />
      </section>

      {/* Vouchers */}
      {vouchers.length > 0 && (
        <section>
          <h2 className="font-serif text-[24px] text-[#2B221D] mb-4">Your vouchers</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {vouchers.map((v) => (
              <div key={v.code} className="bg-white border border-dashed border-[#B08A3E]/60 p-4 flex items-center justify-between">
                <div>
                  <p className="font-serif text-[18px] text-[#2B221D]">{voucherLabel(v.kind, v.value)}</p>
                  {v.endsAt && <p className="text-[#5A524B] text-[12px] font-sans">Expires {dt(v.endsAt)}</p>}
                </div>
                <code className="bg-[#F6F2EA] px-3 py-1.5 text-[14px] font-sans tracking-wider text-[#2B221D]">{v.code}</code>
              </div>
            ))}
          </div>
          <p className="text-[#5A524B] text-[12px] font-sans mt-2">Enter a code in the promo field at checkout.</p>
        </section>
      )}

      {/* Activity */}
      {ledger.length > 0 && (
        <section>
          <h2 className="font-serif text-[24px] text-[#2B221D] mb-4">Activity</h2>
          <div className="bg-white border border-[#2A211C]/10 divide-y divide-[#2A211C]/10">
            {ledger.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 font-sans text-[14px]">
                <span className="text-[#2B221D]">{REASON_LABEL[l.reason] ?? l.reason}{l.note ? ` · ${l.note}` : ""}</span>
                <span className="flex items-center gap-3">
                  {l.delta !== 0 && <span className={`tabular-nums ${l.delta > 0 ? "text-[#3a6b2e]" : "text-[#5D0925]"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</span>}
                  <span className="text-[#5A524B] text-[12px]">{dt(l.createdAt)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
