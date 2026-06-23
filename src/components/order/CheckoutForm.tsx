"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import type { OrderingMenu } from "@/lib/repositories/ordering-menu";
import { useOrder } from "./OrderProvider";
import { CartContents } from "./CartContents";
import { createCheckout, checkGiftCard, type CheckoutInput } from "@/app/order/actions";

export function CheckoutForm({ menu, locationSlug }: { menu: OrderingMenu; locationSlug: string }) {
  const { lines, fulfilment, promoCode, postcode } = useOrder();
  const [pending, startTransition] = useTransition();
  const [giftPending, startGift] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [addr, setAddr] = useState({ line1: "", line2: "", city: "", postcode: postcode ?? "" });
  const [notes, setNotes] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [giftBalance, setGiftBalance] = useState<number | null>(null);
  const [giftMsg, setGiftMsg] = useState<string | null>(null);

  const applyGift = () => {
    setGiftMsg(null);
    startGift(async () => {
      const r = await checkGiftCard(giftCode);
      if (r.ok) { setGiftBalance(r.balancePence ?? 0); } else { setGiftBalance(null); setGiftMsg(r.error ?? "That code isn't valid."); }
    });
  };

  if (lines.length === 0) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Your basket is empty</p>
        <Link href={`/order/menu?loc=${locationSlug}`} className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">
          Back to menu
        </Link>
      </main>
    );
  }

  const pay = () => {
    setError(null);
    const input: CheckoutInput = {
      locationSlug,
      fulfilment,
      lines: lines.map((l) => ({ itemId: l.itemId, modifierIds: l.modifiers.map((m) => m.id), qty: l.qty, notes: l.notes })),
      promoCode,
      contact,
      deliveryAddress: fulfilment === "delivery" ? addr : undefined,
      notes,
      marketingOptIn,
      giftCardCode: giftBalance != null ? giftCode : null,
    };
    startTransition(async () => {
      const res = await createCheckout(input);
      if (res.ok) {
        window.location.href = res.url; // hand off to Stripe hosted Checkout
      } else {
        setError(res.error);
      }
    });
  };

  const field = "w-full bg-white border border-[#2A211C]/20 px-4 py-3 text-[16px] text-[#2B221D] font-sans focus:outline-none focus:border-[#B08A3E]";

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[92px] lg:pt-[104px] pb-24 px-5 lg:px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-[36px] lg:text-[44px] text-[#2B221D] font-light">Checkout</h1>
          <Link href={`/order/menu?loc=${locationSlug}`} className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-sans hover:text-[#B08A3E]">Back to menu</Link>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          {/* Form */}
          <div className="flex flex-col gap-7">
            <section>
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-4">Your details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <input className={field} placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" />
                <input className={field} placeholder="Phone" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" />
                <input className={`${field} sm:col-span-2`} placeholder="Email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" />
              </div>
            </section>

            {fulfilment === "delivery" ? (
              <section>
                <h2 className="font-serif text-[22px] text-[#2B221D] mb-4">Delivery address</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input className={`${field} sm:col-span-2`} placeholder="Address line 1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
                  <input className={`${field} sm:col-span-2`} placeholder="Address line 2 (optional)" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} />
                  <input className={field} placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                  <input className={`${field} uppercase`} placeholder="Postcode" value={addr.postcode} onChange={(e) => setAddr({ ...addr, postcode: e.target.value })} />
                </div>
              </section>
            ) : (
              <section>
                <h2 className="font-serif text-[22px] text-[#2B221D] mb-2">Collection</h2>
                <p className="text-[#5A524B] font-sans text-[14px]">Collect from {menu.locationName}. We&apos;ll have it ready in about {menu.prepTimeMin} minutes after the kitchen accepts your order.</p>
              </section>
            )}

            <section>
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Order notes</h2>
              <textarea className={`${field} resize-none`} rows={2} placeholder="Anything we should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </section>

            <section>
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Gift card</h2>
              <div className="flex gap-2">
                <input
                  value={giftCode}
                  onChange={(e) => { setGiftCode(e.target.value.toUpperCase()); setGiftBalance(null); setGiftMsg(null); }}
                  placeholder="Gift card code"
                  aria-label="Gift card code"
                  className={`${field} uppercase`}
                />
                {giftBalance != null ? (
                  <button type="button" onClick={() => { setGiftBalance(null); setGiftCode(""); }} className="px-5 text-[12px] tracking-[0.1em] uppercase font-sans text-[#5D0925] border border-[#5D0925]/30 hover:bg-[#5D0925]/5">Remove</button>
                ) : (
                  <button type="button" onClick={applyGift} disabled={giftPending || !giftCode.trim()} className="px-5 text-[12px] tracking-[0.1em] uppercase font-sans bg-[#2B221D] text-[#F6F2EA] hover:bg-[#B08A3E] transition-colors disabled:opacity-50">{giftPending ? "…" : "Apply"}</button>
                )}
              </div>
              {giftBalance != null && <p className="mt-2 text-[14px] text-[#3a6b2e] font-sans">Balance £{(giftBalance / 100).toFixed(2)} — applied to your total at payment.</p>}
              {giftMsg && <p className="mt-2 text-[14px] text-[#5D0925] font-sans">{giftMsg}</p>}
            </section>

            {/* Marketing consent — separate + optional, never bundled with payment. */}
            <label className="flex items-start gap-3 text-[14px] font-sans text-[#5A524B]">
              <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#B08A3E]" />
              <span>Email me occasional news and offers from Bombay Bicycle Chef. (Optional — your order goes ahead either way, and you can unsubscribe any time.)</span>
            </label>
          </div>

          {/* Summary */}
          <aside className="mt-10 lg:mt-0">
            <div className="bg-white border border-[#2A211C]/10 p-6 lg:sticky lg:top-[104px]">
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Order summary</h2>
              <CartContents menu={menu} locationSlug={locationSlug} />
              {error && <p role="alert" className="mt-4 text-[14px] text-[#5D0925] font-sans">{error}</p>}
              <button
                onClick={pay}
                disabled={pending}
                className="mt-5 w-full inline-flex items-center justify-center h-[54px] bg-[#B08A3E] text-[#2A211C] text-[13px] tracking-[0.15em] uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? "Redirecting to payment…" : "Pay securely"}
              </button>
              <p className="mt-3 text-[12px] text-[#5A524B] font-sans text-center">Payments are processed securely by Stripe. We never see your card details.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
