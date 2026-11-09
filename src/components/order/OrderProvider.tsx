"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

// Bumped to v2 on 2026-11-09, when the menu was rebuilt from the Balham Touch
// site and every menu_items row got a new UUID. Baskets saved under v1 point at
// item ids that no longer exist, and checkout dead-ends on "An item in your
// basket is no longer available" with no way for the customer to recover.
// Changing the key quietly retires those baskets.
const STORAGE_KEY = "bbc.order.v2";
const EMPTY: OrderState = { locationSlug: null, fulfilment: "delivery", postcode: null, lines: [], promoCode: null };

const OrderContext = createContext<OrderContextValue | null>(null);

/** Stable key for a line: same dish + same modifier set + same notes stacks. */
function lineKey(itemId: string, modifiers: CartModifier[], notes?: string): string {
  const mods = modifiers.map((m) => m.id).sort().join(",");
  return `${itemId}|${mods}|${notes ?? ""}`;
}

function readStored(): OrderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<OrderState>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStored(state: OrderState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — the cart still works for this page view */
  }
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderState>(EMPTY);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // Hydrate once from localStorage (unavailable during SSR, so a lazy useState
  // initializer can't be used), and follow changes made in other tabs so two open
  // tabs never show different baskets.
  useEffect(() => {
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStored());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(e.newValue ? readStored() : EMPTY);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Every change is saved in the same step it's made (not in a later effect), so
  // it can't be lost to an immediate navigation or reload — e.g. Reorder → menu,
  // or the full-page load into checkout. The write is idempotent, so it's safe if
  // React re-runs the updater. Changes before hydration aren't saved, so they can
  // never overwrite the stored basket before it has been read.
  const commit = useCallback((update: (s: OrderState) => OrderState) => {
    setState((prev) => {
      const next = update(prev);
      if (hydrated.current) writeStored(next);
      return next;
    });
  }, []);

  const value = useMemo<OrderContextValue>(() => {
    const itemCount = state.lines.reduce((n, l) => n + l.qty, 0);
    return {
      ...state,
      ready,
      itemCount,
      setLocation: (slug) =>
        commit((s) => (s.locationSlug === slug ? s : { ...s, locationSlug: slug, lines: [] })),
      setFulfilment: (fulfilment) => commit((s) => ({ ...s, fulfilment })),
      setPostcode: (postcode) => commit((s) => ({ ...s, postcode })),
      setPromoCode: (promoCode) => commit((s) => ({ ...s, promoCode })),
      addLine: (line) =>
        commit((s) => {
          const key = lineKey(line.itemId, line.modifiers, line.notes);
          const qty = line.qty ?? 1;
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
            : [...s.lines, { ...line, key, qty }];
          return { ...s, lines };
        }),
      setQty: (key, qty) =>
        commit((s) => ({
          ...s,
          lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        })),
      removeLine: (key) => commit((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => {
        // Drop the checkout idempotency key too, so the next order gets a fresh
        // one (a re-order of identical items must not resume the completed order).
        try { localStorage.removeItem("bbc.order.idem"); } catch { /* ignore */ }
        commit((s) => ({ ...s, lines: [], promoCode: null }));
      },
    };
  }, [state, ready, commit]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
