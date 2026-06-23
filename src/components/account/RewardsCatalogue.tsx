"use client";

import { useActionState } from "react";

import type { CatalogueReward } from "@/lib/repositories/loyalty";
import { IDLE } from "@/lib/admin/validation";
import { tierRank, type Tier } from "@/lib/loyalty/constants";
import { redeem } from "@/app/account/_actions/loyalty";
import { useActionResult } from "@/components/admin/useActionResult";
import { AccountBanner } from "./forms";

export function RewardsCatalogue({ rewards, balance, tier }: { rewards: CatalogueReward[]; balance: number; tier: Tier }) {
  if (rewards.length === 0) return <p className="text-[#5A524B] font-sans text-[14px]">No rewards available yet.</p>;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {rewards.map((r) => <RewardCard key={r.id} reward={r} balance={balance} tier={tier} />)}
    </div>
  );
}

function RewardCard({ reward, balance, tier }: { reward: CatalogueReward; balance: number; tier: Tier }) {
  const [state, action] = useActionState(redeem, IDLE);
  useActionResult(state);
  const affordable = balance >= reward.pointsCost;
  const tierOk = tierRank(tier) >= tierRank(reward.minTier);
  const canRedeem = affordable && tierOk;

  return (
    <div className="bg-white border border-[#2A211C]/10 p-5 flex flex-col">
      <p className="font-serif text-[20px] text-[#2B221D]">{reward.name}</p>
      <p className="text-[#B08A3E] text-[13px] font-sans mt-1">{reward.pointsCost} points</p>
      <div className="mt-3"><AccountBanner state={state} /></div>
      <form action={action} className="mt-auto pt-4">
        <input type="hidden" name="rewardId" value={reward.id} />
        <button
          type="submit"
          disabled={!canRedeem}
          className="w-full inline-flex items-center justify-center h-[46px] bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!tierOk ? "Higher tier needed" : affordable ? "Redeem" : `${reward.pointsCost - balance} more points`}
        </button>
      </form>
    </div>
  );
}
