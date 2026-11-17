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
      // Nothing is chosen for them, even when the shop is shut. Picking the
      // first slot put a time on the order the customer never agreed to —
      // they may well want nine o'clock, and a pre-filled 17:30 is easy to
      // scroll past. They choose, or they do not order.
      //
      // A slot that has since passed is cleared, so a stale page cannot carry
      // a time we no longer offer into the payment.
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
    return (
      <p className="font-sans text-[13.5px] text-[#5A524B]">{pending ? "Checking today's times…" : ""}</p>
    );
  }

  const closed = !window_.openNow;
  const noTimesLeft = closed && window_.slots.length === 0;
  const scheduled = value !== "";
  const chosen = window_.slots.find((s) => s.value === value);

  // Matches the address and contact fields either side of it — this sat on the
  // page in a different type size and border weight from everything around it.
  const field =
    "w-full bg-white border border-[#2A211C]/20 px-4 py-3 text-[16px] text-[#2B221D] font-sans focus:outline-none focus:border-[#B08A3E]";

  return (
    <div className="flex flex-col gap-3">
      {closed && (
        <p
          className={
            "font-sans text-[14px] leading-relaxed " +
            (noTimesLeft ? "text-[#5D0925]" : "text-[#2B221D]")
          }
        >
          {window_.closedMessage}
          {!noTimesLeft && " You can still order now for a time later today."}
        </p>
      )}

      {!noTimesLeft && (
        <>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="When you would like your order"
            className={field + " max-w-[320px] appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10"}
            style={{
              // A caret, so it reads as a menu rather than a text box. Inline
              // because it is one data URI, not worth a Tailwind plugin.
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%232A211C' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
            }}
          >
            {/* Open: "as soon as possible" is the default and what nearly
                everybody wants. Closed: an empty prompt, because there is no
                such thing as "now" and a pre-filled time is a decision taken
                on the customer's behalf. */}
            <option value="">{closed ? "Choose a time…" : "As soon as possible"}</option>
            {window_.slots.map((s) => (
              <option key={s.value} value={s.value}>
                {closed ? s.label : `Later today — ${s.label}`}
              </option>
            ))}
          </select>

          {/* Say the choice back in words. A time sitting in a dropdown is
              easy to scroll past, and arriving an hour early for food is a
              bad way to find out. */}
          {scheduled && chosen && (
            <p className="font-sans text-[13.5px] text-[#3a6b2e]">
              Scheduled for <strong>{chosen.label}</strong> today.
            </p>
          )}
          {!scheduled && !closed && window_.slots.length > 0 && (
            <p className="font-sans text-[13.5px] text-[#5A524B]">
              Or pick a later time today from the list.
            </p>
          )}
        </>
      )}
    </div>
  );
}
