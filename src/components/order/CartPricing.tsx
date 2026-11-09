"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { PriceResult } from "@/lib/ordering/pricing";
import type { CartLineInput } from "@/lib/ordering/types";
import { priceCartAction } from "@/app/order/actions";
import { useOrder } from "./OrderProvider";

/**
 * ONE server-authoritative price for the basket, shared by every place that shows
 * it — desktop basket, mobile drawer, the mobile "View basket" bar and the
 * checkout summary — so they can never disagree. Rapid +/- taps are debounced into
 * a single request, and the last good price stays on screen (dimmed) while a new
 * one loads, so totals don't flicker. The server re-prices again at checkout.
 */
export type CartPricing = {
  result: PriceResult | null;
  loading: boolean;
  /** Sum of line prices on the client — shown only until the first server price arrives. */
  clientSubtotalPence: number;
};

const PricingContext = createContext<CartPricing | null>(null);
const DEBOUNCE_MS = 250;

export function CartPricingProvider({ locationSlug, children }: { locationSlug: string; children: ReactNode }) {
  const { lines, fulfilment, promoCode, postcode, ready } = useOrder();

  const inputLines: CartLineInput[] = useMemo(
    () => lines.map((l) => ({ itemId: l.itemId, modifierIds: l.modifiers.map((m) => m.id), qty: l.qty, notes: l.notes })),
    [lines],
  );
  // Postcode is part of the signature so the tiered delivery fee re-prices when it changes.
  const deliveryPostcode = fulfilment === "delivery" ? postcode : null;
  const sig = JSON.stringify({ locationSlug, fulfilment, inputLines, promoCode, postcode: deliveryPostcode });
  const [priced, setPriced] = useState<{ sig: string; result: PriceResult | null }>({ sig: "", result: null });

  useEffect(() => {
    if (!ready || inputLines.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      priceCartAction({ locationSlug, fulfilment, lines: inputLines, promoCode, postcode: deliveryPostcode })
        .then((r) => { if (!cancelled) setPriced({ sig, result: r }); })
        .catch(() => { if (!cancelled) setPriced({ sig, result: null }); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
    // `sig` encodes every input used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);

  const clientSubtotalPence = lines.reduce((s, l) => s + (l.basePence + l.modifiers.reduce((a, m) => a + m.pricePence, 0)) * l.qty, 0);
  const loading = lines.length > 0 && priced.sig !== sig;

  const value = useMemo<CartPricing>(
    () => ({ result: priced.result, loading, clientSubtotalPence }),
    [priced.result, loading, clientSubtotalPence],
  );

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function useCartPricing(): CartPricing {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error("useCartPricing must be used within CartPricingProvider");
  return ctx;
}

/**
 * The basket total exactly as every basket view displays it. In the menu
 * (showDelivery = false) delivery is left out — it's priced at checkout. At
 * checkout it's included once the postcode is known.
 */
export function displayedTotalPence(
  pricing: CartPricing,
  opts: { isDelivery: boolean; showDelivery: boolean; hasPostcode: boolean },
): number {
  const ok = pricing.result?.ok ? pricing.result : null;
  if (!ok) return pricing.clientSubtotalPence;
  const excludeDelivery = opts.isDelivery && (!opts.showDelivery || !opts.hasPostcode);
  return excludeDelivery ? ok.totalPence - ok.deliveryFeePence : ok.totalPence;
}
