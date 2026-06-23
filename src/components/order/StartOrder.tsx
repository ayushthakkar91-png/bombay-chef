"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Check } from "lucide-react";

import type { OrderLocation } from "@/lib/repositories/ordering-menu";
import { useOrder } from "./OrderProvider";
import { checkDeliveryAction } from "@/app/order/actions";
import type { DeliveryCheck } from "@/lib/ordering/delivery";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export function StartOrder({ locations }: { locations: OrderLocation[] }) {
  const router = useRouter();
  const { locationSlug, fulfilment, postcode, setLocation, setFulfilment, setPostcode } = useOrder();
  const [pcInput, setPcInput] = useState(postcode ?? "");
  const [check, setCheck] = useState<DeliveryCheck | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = locations.find((l) => l.slug === locationSlug) ?? null;
  const deliveryReady = fulfilment === "collection" || (check?.served ?? false);
  const canContinue = Boolean(selected) && deliveryReady;

  const runCheck = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await checkDeliveryAction(selected.slug, pcInput);
      setCheck(res);
      if (res.served) setPostcode(res.postcode ?? pcInput);
    });
  };

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-28 px-6">
      <div className="max-w-[920px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-3">Order Online</p>
          <h1 className="font-serif text-[40px] lg:text-[52px] text-[#2B221D] font-light leading-[1.1]">Collection or Delivery</h1>
        </div>

        {/* Locations */}
        <h2 className="font-serif text-[24px] text-[#2B221D] mb-5">1 · Choose your kitchen</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {locations.map((loc) => {
            const isSel = loc.slug === locationSlug;
            return (
              <button
                key={loc.slug}
                onClick={() => { setLocation(loc.slug); setCheck(null); }}
                className={`text-left p-5 border transition-all duration-300 ${isSel ? "border-[#B08A3E] bg-[#B08A3E]/5" : "border-[#2A211C]/15 hover:border-[#B08A3E]/50 bg-white/40"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-[24px] text-[#2B221D]">{loc.name}</span>
                  {isSel && <Check className="h-5 w-5 text-[#B08A3E]" />}
                </div>
                <p className="flex items-start gap-1.5 text-[#5A524B] text-[13px] font-sans">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {loc.address}
                </p>
              </button>
            );
          })}
        </div>

        {/* Fulfilment */}
        {selected && (
          <>
            <h2 className="font-serif text-[24px] text-[#2B221D] mb-5">2 · How would you like it?</h2>
            <div className="flex gap-3 mb-8">
              {selected.collectionEnabled && (
                <FulfilButton active={fulfilment === "collection"} onClick={() => setFulfilment("collection")} label="Collection" sub="Ready to pick up" />
              )}
              {selected.deliveryEnabled && (
                <FulfilButton active={fulfilment === "delivery"} onClick={() => setFulfilment("delivery")} label="Delivery" sub={`From ${money(selected.deliveryFeePence)} · min ${money(selected.minOrderPence)}`} />
              )}
            </div>

            {fulfilment === "delivery" && (
              <div className="mb-10 max-w-md">
                <label className="block text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold mb-2">Delivery postcode</label>
                <div className="flex gap-2">
                  <input
                    value={pcInput}
                    onChange={(e) => { setPcInput(e.target.value); setCheck(null); }}
                    placeholder="e.g. SW12 9RG"
                    className="flex-1 bg-white border border-[#2A211C]/20 px-4 py-3 text-[16px] text-[#2B221D] font-sans focus:outline-none focus:border-[#B08A3E] uppercase placeholder:normal-case placeholder:text-[#2A211C]/30"
                  />
                  <button
                    onClick={runCheck}
                    disabled={pending || pcInput.trim().length < 5}
                    className="px-6 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors disabled:opacity-50"
                  >
                    {pending ? "…" : "Check"}
                  </button>
                </div>
                {check && (
                  <p className={`mt-3 text-[14px] font-sans ${check.served ? "text-[#3a6b2e]" : "text-[#5D0925]"}`}>
                    {check.served
                      ? `Great — we deliver to ${check.postcode}. Delivery ${money(check.feePence ?? 0)}, around ${check.etaMin} min.`
                      : check.error}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => router.push(`/order/menu?loc=${selected.slug}`)}
              disabled={!canContinue}
              className="w-full sm:w-auto inline-flex items-center justify-center h-[56px] px-14 bg-[#B08A3E] text-[#2A211C] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Browse the menu
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function FulfilButton({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none sm:min-w-[200px] p-4 border text-left transition-all duration-300 ${active ? "border-[#B08A3E] bg-[#B08A3E]/5" : "border-[#2A211C]/15 hover:border-[#B08A3E]/50 bg-white/40"}`}
    >
      <span className="block font-serif text-[20px] text-[#2B221D]">{label}</span>
      <span className="block text-[#5A524B] text-[12px] font-sans mt-0.5">{sub}</span>
    </button>
  );
}
