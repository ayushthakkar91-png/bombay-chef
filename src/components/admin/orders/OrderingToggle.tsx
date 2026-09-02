"use client";

import { useState, useTransition } from "react";

import { setAcceptingOrders } from "@/app/admin/_actions/ordering";

/**
 * Pause / resume online ordering for a location + edit the customer-facing
 * message shown while paused. The switch saves immediately; the message saves
 * on blur (or when you flip the switch).
 */
export function OrderingToggle({
  locationId,
  initialAccepting,
  initialMessage,
}: {
  locationId: string;
  initialAccepting: boolean;
  initialMessage: string | null;
}) {
  const [accepting, setAccepting] = useState(initialAccepting);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const save = (nextAccepting: boolean, nextMessage: string) => {
    start(async () => {
      const r = await setAcceptingOrders(locationId, nextAccepting, nextMessage || null);
      if (r.ok) {
        setAccepting(nextAccepting);
        setNote("Saved");
        setTimeout(() => setNote(null), 1800);
      } else {
        setNote(r.error ?? "Couldn't save");
      }
    });
  };

  return (
    <div className={`rounded-lg border p-5 transition-colors ${accepting ? "border-sand bg-surface" : "border-amber-400/60 bg-amber-50"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-text">Accepting online orders</p>
          <p className="text-sm text-body">
            {accepting ? "Customers can place orders now." : "Paused — customers see your message instead of the menu."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={accepting}
          aria-label="Accepting online orders"
          disabled={pending}
          onClick={() => save(!accepting, message)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${accepting ? "bg-emerald-500" : "bg-neutral-300"}`}
        >
          <span className={`absolute top-1 block h-5 w-5 rounded-full bg-white shadow transition-transform ${accepting ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-body/80">Message shown while paused</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => { if (message !== (initialMessage ?? "")) save(accepting, message); }}
          rows={2}
          placeholder="e.g. We're not taking online orders right now — please call us on 020 …. Back shortly!"
          className="mt-1 w-full resize-none rounded border border-sand bg-bg/40 px-3 py-2 text-sm text-text placeholder:text-body/50 focus:border-brass focus:outline-none"
        />
      </div>

      {note && <p className="mt-2 text-xs text-body">{note}</p>}
    </div>
  );
}
