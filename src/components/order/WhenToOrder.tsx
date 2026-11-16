"use client";

import { useEffect, useState, useTransition } from "react";

import { orderingWindowAction, type OrderingWindow } from "@/app/order/actions";
import type { Fulfilment } from "@/lib/ordering/constants";

/**
 * When the customer wants their food.
 *
 * Two jobs, and the second is the important one. It offers a later time today
 * — but it also tells somebody arriving at four in the afternoon that the
 * kitchen opens at half five, instead of letting them build a basket, fill in
 * an address and only then be refused at the payment screen.
 *
 * When the shop is open this is a quiet line of text with "as soon as
 * possible" already chosen, because that is what nearly everybody wants. When
 * it is shut, choosing a time is the only way forward and the control says so.
 */
export function WhenToOrder({
  locationSlug,
  fulfilment,
  value,
  onChange,
  onWindow,
}: {
  locationSlug: string;
  fulfilment: Fulfilment;
  /** ISO instant, or "" for as soon as possible. */
  value: string;
  onChange: (iso: string) => void;
  /** Lets the page disable payment while the kitchen is shut and no time is picked. */
  onWindow?: (w: OrderingWindow | null) => void;
}) {
  const [window_, setWindow] = useState<OrderingWindow | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    start(async () => {
      const w = await orderingWindowAction(locationSlug, fulfilment);
      if (cancelled) return;
      setWindow(w);
      onWindow?.(w);
      // Closed, nothing chosen yet: pre-select the first time we can do, so
      // the customer is pointed at the way forward rather than at a problem.
      if (!w.openNow && !value && w.slots.length > 0) onChange(w.slots[0].value);
      // Open again, or the chosen time has passed: fall back to ASAP rather
      // than carrying a slot that is no longer offered into the payment.
      if (value && !w.slots.some((s) => s.value === value)) onChange("");
    });
    return () => {
      cancelled = true;
    };
    // Re-asked when the branch or the fulfilment changes: delivery and
    // collection keep different hours, so switching between them can change
    // the answer entirely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationSlug, fulfilment]);

  if (!window_) {
    return <p className="font-sans text-[13.5px] text-[#5A524B]">{pending ? "Checking today's times…" : ""}</p>;
  }

  const closed = !window_.openNow;
  const noTimesLeft = closed && window_.slots.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {closed && (
        <p
          className={
            "font-sans text-[13.5px] " + (noTimesLeft ? "text-[#5D0925]" : "text-[#2B221D]")
          }
        >
          {window_.closedMessage}
          {!noTimesLeft && " You can still order now for a time later today."}
        </p>
      )}

      {!noTimesLeft && (
        <label className="flex flex-col gap-1">
          <span className="font-sans text-[12px] uppercase tracking-[0.12em] text-[#5A524B]">
            {closed ? "Choose a time" : "When"}
          </span>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full max-w-[280px] border border-[#2A211C]/20 bg-white px-3 py-2 font-sans text-[15px] text-[#2B221D] focus:border-[#B08A3E] focus:outline-none"
          >
            {/* Only offered while the kitchen is actually cooking. Leaving it
                on a closed shop would promise food nobody is there to make. */}
            {!closed && <option value="">As soon as possible</option>}
            {window_.slots.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
