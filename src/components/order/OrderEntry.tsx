"use client";

import { createContext, useContext } from "react";

import { EXTERNAL_ORDER_URL } from "@/lib/flags";

/**
 * Carries the runtime "Order Online" destination (resolved server-side in the
 * root layout from the admin on/off toggle) down to every client CTA — navbar,
 * hero, footer, mobile bar, etc. Default is the external locator so the safe
 * fallback is never the internal checkout.
 */
const OrderHrefContext = createContext<string>(EXTERNAL_ORDER_URL);

export function OrderHrefProvider({ href, children }: { href: string; children: React.ReactNode }) {
  return <OrderHrefContext.Provider value={href}>{children}</OrderHrefContext.Provider>;
}

/** The current "Order Online" href — `/order` when accepting, else external. */
export function useOrderHref(): string {
  return useContext(OrderHrefContext);
}
