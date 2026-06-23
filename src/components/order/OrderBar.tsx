"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown, Check, Bike, ShoppingBag, Navigation } from "lucide-react";

import type { OrderingMenu } from "@/lib/repositories/ordering-menu";
import { useOrder } from "./OrderProvider";
import { checkDeliveryAction, suggestBranchAction } from "@/app/order/actions";
import type { DeliveryCheck, BranchSuggestion } from "@/lib/ordering/delivery";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
type Branch = { slug: string; name: string };

/**
 * Sticky "food-first" ordering bar. The menu is already on screen; this bar lets
 * the customer set method (collection/delivery) and branch without leaving the
 * food. Postcode entry suggests the nearest branch; branch switching soft-navigates.
 */
export function OrderBar({ menu, branches, locationSlug }: { menu: OrderingMenu; branches: Branch[]; locationSlug: string }) {
  const router = useRouter();
  const { fulfilment, setFulfilment, setPostcode } = useOrder();
  const [pcInput, setPcInput] = useState("");
  const [check, setCheck] = useState<DeliveryCheck | null>(null);
  const [suggestion, setSuggestion] = useState<BranchSuggestion | null>(null);
  const [pending, startTransition] = useTransition();
  const [locOpen, setLocOpen] = useState(false);
  const [nearPc, setNearPc] = useState("");
  const [nearMsg, setNearMsg] = useState<string | null>(null);

  const collectFrom = menu.prepTimeMin, collectTo = menu.prepTimeMin + 10;
  const deliverFrom = menu.prepTimeMin + menu.deliveryTimeMin, deliverTo = deliverFrom + 15;
  const multi = branches.length > 1;

  /** Soft-navigate to a branch, carrying method + postcode into the cart context. */
  const switchToBranch = (slug: string, opts: { delivery?: boolean; postcode?: string } = {}) => {
    if (opts.delivery) setFulfilment("delivery");
    if (opts.postcode) setPostcode(opts.postcode);
    setLocOpen(false);
    if (slug !== locationSlug) router.push(`/order/menu?loc=${slug}`);
  };

  const runCheck = () => startTransition(async () => {
    setSuggestion(null);
    const res = await checkDeliveryAction(locationSlug, pcInput);
    setCheck(res);
    if (res.served) { setPostcode(res.postcode ?? pcInput); return; }
    // Current branch can't deliver — is another one nearer? (matters once multi-branch)
    if (multi) {
      const sug = await suggestBranchAction(pcInput);
      if (sug && sug.slug !== locationSlug) setSuggestion(sug);
    }
  });

  const findNearest = () => startTransition(async () => {
    setNearMsg(null);
    const sug = await suggestBranchAction(nearPc);
    if (!sug) { setNearMsg("No branch covers that postcode yet."); return; }
    switchToBranch(sug.slug, sug.servesExact ? { delivery: true, postcode: nearPc } : {});
  });

  return (
    <div className="sticky top-[84px] z-30 border-b border-[#2A211C]/10 bg-[#F6F2EA]/95 backdrop-blur lg:top-[88px]">
      <div className="mx-auto max-w-[1200px] px-5 py-3 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          {/* Brand + location */}
          <div className="flex items-center gap-3">
            <div>
              <p className="font-serif text-[17px] leading-none text-[#2B221D]">Bombay Bicycle Chef</p>
              <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B08A3E]">Ordering Online</p>
            </div>
            <span className="h-8 w-px bg-[#2A211C]/12" />
            <div className="relative">
              <button onClick={() => multi && setLocOpen((v) => !v)} className={`flex items-center gap-1.5 rounded-full border border-[#2A211C]/15 bg-white px-3 py-1.5 font-sans text-[13px] text-[#2B221D] ${multi ? "hover:border-[#B08A3E]/60" : "cursor-default"}`}>
                <MapPin className="h-3.5 w-3.5 text-[#B08A3E]" /> {menu.locationName}
                {multi && <ChevronDown className="h-3.5 w-3.5 text-[#5A524B]" />}
              </button>
              {multi && locOpen && (
                <div className="absolute left-0 z-40 mt-1.5 w-60 overflow-hidden rounded-lg border border-[#2A211C]/12 bg-white shadow-lg">
                  <p className="px-3 pt-2 font-sans text-[10px] uppercase tracking-[0.15em] text-[#5A524B]">Choose your location</p>
                  <div className="py-1">
                    {branches.map((b) => (
                      <button key={b.slug} onClick={() => switchToBranch(b.slug)} className={`flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-[14px] hover:bg-[#F6F2EA] ${b.slug === locationSlug ? "text-[#B08A3E]" : "text-[#2B221D]"}`}>
                        <MapPin className="h-3.5 w-3.5" /> {b.name}{b.slug === locationSlug && <Check className="ml-auto h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#2A211C]/10 px-3 py-2.5">
                    <p className="mb-1.5 flex items-center gap-1 font-sans text-[10px] uppercase tracking-[0.12em] text-[#5A524B]"><Navigation className="h-3 w-3" /> Find your nearest</p>
                    <div className="flex gap-1.5">
                      <input value={nearPc} onChange={(e) => { setNearPc(e.target.value); setNearMsg(null); }} onKeyDown={(e) => { if (e.key === "Enter" && nearPc.trim().length >= 5) findNearest(); }} placeholder="Postcode" aria-label="Postcode" className="min-w-0 flex-1 border border-[#2A211C]/20 bg-white px-2.5 py-1.5 font-sans text-[13px] uppercase text-[#2B221D] placeholder:normal-case placeholder:text-[#2A211C]/35 focus:border-[#B08A3E] focus:outline-none" />
                      <button onClick={findNearest} disabled={pending || nearPc.trim().length < 5} className="bg-[#5D0925] px-3 font-sans text-[11px] uppercase tracking-[0.08em] text-[#F6F2EA] transition-colors hover:bg-[#420616] disabled:opacity-40">Go</button>
                    </div>
                    {nearMsg && <p className="mt-1.5 font-sans text-[12px] text-[#5D0925]">{nearMsg}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Method toggle */}
          <div className="inline-flex rounded-full border border-[#2A211C]/15 bg-white p-0.5">
            {(["collection", "delivery"] as const).map((f) => {
              const active = fulfilment === f;
              if (f === "delivery" && !menu.deliveryEnabled) return null;
              if (f === "collection" && !menu.collectionEnabled) return null;
              return (
                <button key={f} onClick={() => setFulfilment(f)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-sans text-[12px] font-medium uppercase tracking-[0.08em] transition-colors ${active ? "bg-[#5D0925] text-[#F6F2EA]" : "text-[#2B221D] hover:text-[#5D0925]"}`}>
                  {f === "collection" ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
                  {f === "collection" ? "Collection" : "Delivery"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Method detail strip */}
        {fulfilment === "collection" ? (
          <p className="mt-2 font-sans text-[12.5px] text-[#5A524B]">Free collection from {menu.locationName} · ready in {collectFrom}–{collectTo} mins.</p>
        ) : (
          <div className="mt-2.5">
            {check?.served ? (
              <div className="flex flex-wrap items-center gap-2 font-sans text-[12.5px] text-[#3a6b2e]">
                <Check className="h-4 w-4 shrink-0" /> Delivering to {check.postcode} · {money(check.feePence ?? menu.deliveryFeePence)} fee · min {money(menu.minOrderPence)} · ~{check.etaMin} mins.
                <button onClick={() => { setCheck(null); setSuggestion(null); }} className="text-[#5A524B] underline underline-offset-2 hover:text-[#2B221D]">change</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-[12.5px] text-[#5A524B]">Delivery {deliverFrom}–{deliverTo} mins · min {money(menu.minOrderPence)}.</span>
                <input value={pcInput} onChange={(e) => { setPcInput(e.target.value); setCheck(null); setSuggestion(null); }} onKeyDown={(e) => { if (e.key === "Enter" && pcInput.trim().length >= 5) runCheck(); }} placeholder="Postcode" aria-label="Delivery postcode" className="w-32 border border-[#2A211C]/20 bg-white px-3 py-1.5 font-sans text-[14px] uppercase text-[#2B221D] placeholder:normal-case placeholder:text-[#2A211C]/35 focus:border-[#B08A3E] focus:outline-none" />
                <button onClick={runCheck} disabled={pending || pcInput.trim().length < 5} className="border border-[#2B221D] px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.1em] text-[#2B221D] transition-colors hover:bg-[#2B221D] hover:text-[#F6F2EA] disabled:opacity-40">{pending ? "Checking…" : "Check area"}</button>
                {check && !check.served && !suggestion && <span className="w-full font-sans text-[12.5px] text-[#5D0925]">Sorry, we don&apos;t deliver to this postcode yet — switch to <button onClick={() => setFulfilment("collection")} className="font-medium underline underline-offset-2">collection</button> instead.</span>}
                {suggestion && (
                  <span className="flex w-full flex-wrap items-center gap-2 font-sans text-[12.5px] text-[#2B221D]">
                    {menu.locationName} doesn&apos;t deliver there, but <strong>{suggestion.name}</strong> does ({money(suggestion.feePence)} · ~{suggestion.etaMin} mins).
                    <button onClick={() => switchToBranch(suggestion.slug, { delivery: true, postcode: pcInput })} className="bg-[#5D0925] px-3 py-1 font-sans text-[11px] uppercase tracking-[0.08em] text-[#F6F2EA] transition-colors hover:bg-[#420616]">Switch to {suggestion.name}</button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
