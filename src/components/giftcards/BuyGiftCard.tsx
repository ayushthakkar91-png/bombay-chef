"use client";

import { useState, useTransition } from "react";
import { buyGiftCard } from "@/app/gift/actions";
import { GIFT_PRESETS_PENCE, GIFT_MIN_PENCE, GIFT_MAX_PENCE, gbp } from "@/lib/giftcards/constants";

const field = "w-full bg-white border border-[#2A211C]/20 px-4 py-3 text-[16px] text-[#2B221D] font-sans focus:outline-none focus:border-[#B08A3E]";

export function BuyGiftCard() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<number | "custom">(GIFT_PRESETS_PENCE[1]);
  const [customPounds, setCustomPounds] = useState("");
  const [r, setR] = useState({ recipientName: "", recipientEmail: "", senderName: "", message: "" });
  const [when, setWhen] = useState<"now" | "scheduled">("now");
  const [deliverDate, setDeliverDate] = useState("");

  const amountPence = preset === "custom" ? Math.round((Number(customPounds) || 0) * 100) : preset;

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await buyGiftCard({
        amountPence,
        recipientName: r.recipientName,
        recipientEmail: r.recipientEmail,
        senderName: r.senderName,
        message: r.message,
        deliverDate: when === "scheduled" ? deliverDate || null : null,
      });
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  };

  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">1 · Amount</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {GIFT_PRESETS_PENCE.map((p) => (
            <button key={p} type="button" onClick={() => setPreset(p)} className={`h-[56px] border font-serif text-[20px] transition-colors ${preset === p ? "border-[#B08A3E] bg-[#B08A3E]/5 text-[#B08A3E]" : "border-[#2A211C]/15 text-[#2B221D] hover:border-[#B08A3E]/50"}`}>
              {gbp(p)}
            </button>
          ))}
          <button type="button" onClick={() => setPreset("custom")} className={`h-[56px] border font-sans text-[14px] uppercase tracking-[0.1em] transition-colors ${preset === "custom" ? "border-[#B08A3E] bg-[#B08A3E]/5 text-[#B08A3E]" : "border-[#2A211C]/15 text-[#2B221D] hover:border-[#B08A3E]/50"}`}>
            Custom
          </button>
        </div>
        {preset === "custom" && (
          <div className="mt-3 max-w-[200px]">
            <input value={customPounds} onChange={(e) => setCustomPounds(e.target.value)} type="number" min={GIFT_MIN_PENCE / 100} max={GIFT_MAX_PENCE / 100} placeholder="£ amount" className={field} aria-label="Custom amount" />
            <p className="mt-1 text-[12px] text-[#5A524B] font-sans">{gbp(GIFT_MIN_PENCE)}–{gbp(GIFT_MAX_PENCE)}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">2 · Recipient</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input className={field} placeholder="Recipient's name" value={r.recipientName} onChange={(e) => setR({ ...r, recipientName: e.target.value })} />
          <input className={field} type="email" placeholder="Recipient's email" value={r.recipientEmail} onChange={(e) => setR({ ...r, recipientEmail: e.target.value })} />
          <input className={`${field} sm:col-span-2`} placeholder="Your name (from)" value={r.senderName} onChange={(e) => setR({ ...r, senderName: e.target.value })} />
          <textarea className={`${field} sm:col-span-2 resize-none`} rows={3} placeholder="Personal message (optional)" value={r.message} onChange={(e) => setR({ ...r, message: e.target.value })} />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">3 · Delivery</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setWhen("now")} className={`px-5 h-[48px] border text-[13px] uppercase tracking-[0.1em] font-sans transition-colors ${when === "now" ? "border-[#B08A3E] bg-[#B08A3E]/5 text-[#B08A3E]" : "border-[#2A211C]/15 text-[#2B221D] hover:border-[#B08A3E]/50"}`}>Send now</button>
          <button type="button" onClick={() => setWhen("scheduled")} className={`px-5 h-[48px] border text-[13px] uppercase tracking-[0.1em] font-sans transition-colors ${when === "scheduled" ? "border-[#B08A3E] bg-[#B08A3E]/5 text-[#B08A3E]" : "border-[#2A211C]/15 text-[#2B221D] hover:border-[#B08A3E]/50"}`}>Schedule</button>
          {when === "scheduled" && <input type="date" min={minDate} value={deliverDate} onChange={(e) => setDeliverDate(e.target.value)} className={`${field} max-w-[200px]`} aria-label="Delivery date" />}
        </div>
      </section>

      {error && <p role="alert" className="text-[14px] text-[#5D0925] font-sans">{error}</p>}

      <button
        onClick={submit}
        disabled={pending || amountPence < GIFT_MIN_PENCE || (when === "scheduled" && !deliverDate)}
        className="inline-flex items-center justify-center h-[56px] px-12 bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed self-start"
      >
        {pending ? "Redirecting to payment…" : `Pay ${gbp(Math.max(0, amountPence))}`}
      </button>
      <p className="text-[12px] text-[#5A524B] font-sans -mt-3">Secure payment by Stripe. The card is emailed to the recipient (or on your chosen date).</p>
    </div>
  );
}
