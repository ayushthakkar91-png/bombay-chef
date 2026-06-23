"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import type { OrderingMenu } from "@/lib/repositories/ordering-menu";
import type { PriceResult } from "@/lib/ordering/pricing";
import type { CartLineInput } from "@/lib/ordering/types";
import { priceCartAction } from "@/app/order/actions";
import { useOrder } from "./OrderProvider";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export function CartContents({
  menu,
  locationSlug,
  onCheckout,
}: {
  menu: OrderingMenu;
  locationSlug: string;
  onCheckout?: () => void;
}) {
  const { lines, fulfilment, promoCode, setQty, removeLine, setPromoCode } = useOrder();
  const [promoInput, setPromoInput] = useState(promoCode ?? "");

  const inputLines: CartLineInput[] = useMemo(
    () => lines.map((l) => ({ itemId: l.itemId, modifierIds: l.modifiers.map((m) => m.id), qty: l.qty, notes: l.notes })),
    [lines],
  );

  // Server-authoritative totals, keyed by a cart signature.
  const sig = JSON.stringify({ locationSlug, fulfilment, inputLines, promoCode });
  const [priced, setPriced] = useState<{ sig: string; result: PriceResult | null }>({ sig: "", result: null });
  const loading = lines.length > 0 && priced.sig !== sig;
  const result = priced.sig === sig ? priced.result : null;

  useEffect(() => {
    if (lines.length === 0) return; // empty cart renders an early return below
    let cancelled = false;
    priceCartAction({ locationSlug, fulfilment, lines: inputLines, promoCode })
      .then((r) => { if (!cancelled) setPriced({ sig, result: r }); })
      .catch(() => { if (!cancelled) setPriced({ sig, result: null }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Instant client estimate while the server total loads.
  const clientSubtotal = lines.reduce((s, l) => s + (l.basePence + l.modifiers.reduce((a, m) => a + m.pricePence, 0)) * l.qty, 0);

  if (lines.length === 0) {
    return <p className="text-[#5A524B] font-sans text-[14px] py-8 text-center">Your basket is empty.</p>;
  }

  const ok = result?.ok ? result : null;
  const error = result && !result.ok ? result.error : null;

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col divide-y divide-[#2A211C]/10">
        {lines.map((l) => {
          const unit = l.basePence + l.modifiers.reduce((a, m) => a + m.pricePence, 0);
          return (
            <li key={l.key} className="py-3 flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[16px] text-[#2B221D]">{l.name}</p>
                {l.modifiers.length > 0 && <p className="text-[#5A524B] text-[12px] font-sans">{l.modifiers.map((m) => m.name).join(", ")}</p>}
                {l.notes && <p className="text-[#5A524B] text-[12px] font-sans italic">“{l.notes}”</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center border border-[#2A211C]/20">
                    <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease" className="px-2 py-1 hover:text-[#B08A3E]"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-[14px] tabular-nums">{l.qty}</span>
                    <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase" className="px-2 py-1 hover:text-[#B08A3E]"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => removeLine(l.key)} aria-label="Remove" className="text-[#5A524B] hover:text-[#5D0925]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <span className="font-sans text-[15px] text-[#2B221D] tabular-nums">{money(unit * l.qty)}</span>
            </li>
          );
        })}
      </ul>

      {/* Promo */}
      <div className="mt-4 flex gap-2">
        <input
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
          placeholder="Promo code"
          className="flex-1 bg-white border border-[#2A211C]/20 px-3 py-2 text-[14px] font-sans uppercase focus:outline-none focus:border-[#B08A3E] placeholder:normal-case placeholder:text-[#2A211C]/30"
        />
        {promoCode ? (
          <button onClick={() => { setPromoCode(null); setPromoInput(""); }} className="px-4 text-[12px] tracking-[0.1em] uppercase font-sans text-[#5D0925] border border-[#5D0925]/30 hover:bg-[#5D0925]/5">Remove</button>
        ) : (
          <button onClick={() => setPromoCode(promoInput.trim() || null)} disabled={!promoInput.trim()} className="px-4 text-[12px] tracking-[0.1em] uppercase font-sans bg-[#2B221D] text-[#F6F2EA] hover:bg-[#B08A3E] transition-colors disabled:opacity-50">Apply</button>
        )}
      </div>
      {promoCode && ok?.promoApplied && ok.discountPence > 0 && <p className="mt-2 text-[13px] text-[#3a6b2e] font-sans">Code “{ok.promoApplied}” applied.</p>}
      {promoCode && error && <p className="mt-2 text-[13px] text-[#5D0925] font-sans">{error}</p>}

      {/* Totals */}
      <dl className="mt-4 border-t border-[#2A211C]/10 pt-4 flex flex-col gap-1.5 font-sans text-[14px]">
        <Row label="Subtotal" value={money(ok?.subtotalPence ?? clientSubtotal)} muted={loading} />
        {fulfilment === "delivery" && <Row label="Delivery" value={money(ok?.deliveryFeePence ?? menu.deliveryFeePence)} muted={loading} />}
        {ok && ok.discountPence > 0 && <Row label="Discount" value={`−${money(ok.discountPence)}`} accent />}
        <Row label="Total" value={money(ok?.totalPence ?? clientSubtotal + (fulfilment === "delivery" ? menu.deliveryFeePence : 0))} bold muted={loading} />
      </dl>

      {fulfilment === "delivery" && error && error.includes("minimum") && (
        <p className="mt-3 text-[13px] text-[#5D0925] font-sans">{error}</p>
      )}

      {onCheckout && (
        <button
          onClick={onCheckout}
          disabled={Boolean(error)}
          className="mt-5 w-full inline-flex items-center justify-center h-[52px] bg-[#B08A3E] text-[#2A211C] text-[13px] tracking-[0.15em] uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Go to checkout
        </button>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted, accent }: { label: string; value: string; bold?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-[#2B221D] text-[17px] font-medium pt-1.5 border-t border-[#2A211C]/10 mt-1" : "text-[#5A524B]"} ${muted ? "opacity-60" : ""}`}>
      <dt>{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-[#3a6b2e]" : ""}`}>{value}</dd>
    </div>
  );
}
