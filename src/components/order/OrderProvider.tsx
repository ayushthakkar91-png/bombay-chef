"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartLine, CartModifier } from "@/lib/ordering/types";
import type { Fulfilment } from "@/lib/ordering/constants";

type OrderState = {
  locationSlug: string | null;
  fulfilment: Fulfilment;
  postcode: string | null;
  lines: CartLine[];
  promoCode: string | null;
};

type OrderContextValue = OrderState & {
  ready: boolean;
  itemCount: number;
  setLocation: (slug: string) => void;
  setFulfilment: (f: Fulfilment) => void;
  setPostcode: (pc: string | null) => void;
  setPromoCode: (code: string | null) => void;
  addLine: (line: Omit<CartLine, "key" | "qty"> & { qty?: number }) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "bbc.order.v1";
const EMPTY: OrderState = { locationSlug: null, fulfilment: "collection", postcode: null, lines: [], promoCode: null };

const OrderContext = createContext<OrderContextValue | null>(null);

/** Stable key for a line: same dish + same modifier set + same notes stacks. */
function lineKey(itemId: string, modifiers: CartModifier[], notes?: string): string {
  const mods = modifiers.map((m) => m.id).sort().join(",");
  return `${itemId}|${mods}|${notes ?? ""}`;
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderState>(EMPTY);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once on mount. This is a one-time client-only
  // hydration (localStorage is unavailable during SSR, so a lazy useState
  // initializer can't be used) — not a cascading-render risk.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Persist on change (after hydration).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const value = useMemo<OrderContextValue>(() => {
    const itemCount = state.lines.reduce((n, l) => n + l.qty, 0);
    return {
      ...state,
      ready,
      itemCount,
      setLocation: (slug) =>
        setState((s) => (s.locationSlug === slug ? s : { ...s, locationSlug: slug, lines: [] })),
      setFulfilment: (fulfilment) => setState((s) => ({ ...s, fulfilment })),
      setPostcode: (postcode) => setState((s) => ({ ...s, postcode })),
      setPromoCode: (promoCode) => setState((s) => ({ ...s, promoCode })),
      addLine: (line) =>
        setState((s) => {
          const key = lineKey(line.itemId, line.modifiers, line.notes);
          const qty = line.qty ?? 1;
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
            : [...s.lines, { ...line, key, qty }];
          return { ...s, lines };
        }),
      setQty: (key, qty) =>
        setState((s) => ({
          ...s,
          lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        })),
      removeLine: (key) => setState((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => setState((s) => ({ ...s, lines: [], promoCode: null })),
    };
  }, [state, ready]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
