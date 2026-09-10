"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

import type { OrderingMenu } from "@/lib/repositories/ordering-menu";
import type { DeliveryCheck } from "@/lib/ordering/delivery";
import { useOrder } from "./OrderProvider";
import { CartContents } from "./CartContents";
import { CheckoutSteps } from "./CheckoutSteps";
import { createCheckout, checkGiftCard, checkDeliveryAction, type CheckoutInput } from "@/app/order/actions";

import { money } from "@/lib/format";

// Stripe.js is loaded once for the whole app. The publishable key is safe to
// expose (that's its purpose). Null when unset → we surface a clear message
// rather than crashing the checkout.
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

export function CheckoutForm({
  menu,
  locationSlug,
  signedIn = false,
  initialContact,
  initialAddress,
}: {
  menu: OrderingMenu;
  locationSlug: string;
  /** True when a customer is signed in — drives the quick-checkout prefill + hint. */
  signedIn?: boolean;
  /** Prefill for a signed-in customer's saved contact details. */
  initialContact?: { name: string; email: string; phone: string };
  /** Prefill for a signed-in customer's default delivery address. */
  initialAddress?: { line1: string; line2: string; city: string; postcode: string };
}) {
  const { lines, fulfilment, promoCode, postcode, setPostcode, setFulfilment } = useOrder();
  const [pending, startTransition] = useTransition();
  const [giftPending, startGift] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Set once createCheckout returns an embedded Stripe session — swaps the form
  // for the in-page card entry.
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [contact, setContact] = useState({ name: initialContact?.name ?? "", email: initialContact?.email ?? "", phone: initialContact?.phone ?? "" });
  // A saved address wins; otherwise seed the postcode already checked in the menu.
  const [addr, setAddr] = useState({
    line1: initialAddress?.line1 ?? "",
    line2: initialAddress?.line2 ?? "",
    city: initialAddress?.city ?? "",
    postcode: initialAddress?.postcode ?? postcode ?? "",
  });
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [showGift, setShowGift] = useState(false);
  const [giftBalance, setGiftBalance] = useState<number | null>(null);
  const [giftMsg, setGiftMsg] = useState<string | null>(null);
  // Payable total reported by the order summary (null until delivery is priced).
  const [payTotal, setPayTotal] = useState<number | null>(null);

  // Live delivery check: as the postcode is typed we confirm the area and set it
  // on the cart, which re-prices the summary with the exact distance-tiered fee.
  const [pcCheck, setPcCheck] = useState<DeliveryCheck | null>(null);
  const [pcChecking, setPcChecking] = useState(false);
  const pcValue = addr.postcode.replace(/\s+/g, "").toUpperCase();

  useEffect(() => {
    if (fulfilment !== "delivery" || pcValue.length < 5) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setPcChecking(true);
      const res = await checkDeliveryAction(locationSlug, pcValue);
      if (cancelled) return;
      setPcChecking(false);
      setPcCheck(res);
      setPostcode(res.served ? (res.postcode ?? pcValue) : null);
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
    // setPostcode's identity changes whenever cart state changes; depending on it
    // would re-run this check in a loop. Re-check only when the postcode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pcValue, fulfilment, locationSlug]);

  const onPostcodeChange = (value: string) => {
    setAddr((a) => ({ ...a, postcode: value }));
    setPcCheck(null);
    if (value.replace(/\s+/g, "").length < 5) {
      setPcChecking(false);
      if (postcode) setPostcode(null);
    }
  };

  // A stable idempotency key for THIS cart: the same across refresh/retry (so a
  // lost response never creates a duplicate order), but freshly generated when
  // the cart contents change. Persisted in localStorage.
  const idempotencyKey = (): string => {
    const hash = JSON.stringify(lines.map((l) => [l.itemId, l.qty, l.modifiers.map((m) => m.id).sort(), l.notes ?? ""])) + "|" + fulfilment;
    try {
      const raw = localStorage.getItem("bbc.order.idem");
      if (raw) { const o = JSON.parse(raw) as { hash?: string; key?: string }; if (o.hash === hash && o.key) return o.key; }
    } catch { /* storage unavailable — fall through to a fresh key */ }
    const key = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    try { localStorage.setItem("bbc.order.idem", JSON.stringify({ hash, key })); } catch { /* ignore */ }
    return key;
  };

  const applyGift = () => {
    setGiftMsg(null);
    startGift(async () => {
      const r = await checkGiftCard(giftCode);
      if (r.ok) { setGiftBalance(r.balancePence ?? 0); } else { setGiftBalance(null); setGiftMsg(r.error ?? "That code isn't valid."); }
    });
  };

  const menuHref = `/order/menu?loc=${locationSlug}`;

  if (lines.length === 0) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Your basket is empty</p>
        <Link href={menuHref} className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">
          Back to menu
        </Link>
      </main>
    );
  }

  // Payment step: Stripe's card form mounted in-page (no redirect off-site).
  if (clientSecret) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[92px] lg:pt-[104px] pb-24 px-5 lg:px-8">
        <div className="max-w-[720px] mx-auto">
          <CheckoutSteps current={3} menuHref={menuHref} />
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-[32px] lg:text-[40px] text-[#2B221D] font-light">Payment</h1>
            <button
              type="button"
              onClick={() => setClientSecret(null)}
              className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-sans hover:text-[#B08A3E]"
            >
              Back
            </button>
          </div>
          {stripePromise ? (
            <div className="bg-white border border-[#2A211C]/15 p-4 lg:p-6">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <p className="font-sans text-[15px] text-[#5A524B]">
              Online payment isn&apos;t available right now. Please try again shortly.
            </p>
          )}
        </div>
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
      idempotencyKey: idempotencyKey(),
    };
    startTransition(async () => {
      const res = await createCheckout(input);
      if (!res.ok) {
        setError(res.error);
      } else if ("clientSecret" in res) {
        setClientSecret(res.clientSecret); // mount Stripe Embedded Checkout in-page
      } else {
        window.location.href = res.url; // gift-card covered / already paid → tracking
      }
    });
  };

  // What the card will actually be charged (display only — the server re-prices).
  const chargePence = payTotal == null ? null : Math.max(0, payTotal - (giftBalance ?? 0));
  const field = "w-full bg-white border border-[#2A211C]/20 px-4 py-3 text-[16px] text-[#2B221D] font-sans focus:outline-none focus:border-[#B08A3E]";
  const addLink = "self-start font-sans text-[14px] text-[#5D0925] underline-offset-2 hover:underline";

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[92px] lg:pt-[104px] pb-24 px-5 lg:px-8">
      <div className="max-w-[1100px] mx-auto">
        <CheckoutSteps current={2} menuHref={menuHref} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-[36px] lg:text-[44px] text-[#2B221D] font-light">Checkout</h1>
          <Link href={menuHref} className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-sans hover:text-[#B08A3E]">Back to menu</Link>
        </div>

        {signedIn ? (
          <p className="mb-6 flex items-center gap-2 border border-[#3a6b2e]/25 bg-[#3a6b2e]/5 px-4 py-3 font-sans text-[13.5px] text-[#3a6b2e]">
            <Check className="h-4 w-4 shrink-0" aria-hidden /> Signed in — your details are filled in.
          </p>
        ) : (
          <p className="mb-6 font-sans text-[13.5px] text-[#5A524B]">
            Checking out as a guest ·{" "}
            <Link href={`/account/login?next=${encodeURIComponent(`/order/checkout?loc=${locationSlug}`)}`} className="font-medium text-[#5D0925] underline underline-offset-2 hover:text-[#420616]">Sign in instead</Link>
          </p>
        )}

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          {/* Form */}
          <div className="flex flex-col gap-7">
            {fulfilment === "delivery" ? (
              <section>
                <h2 className="font-serif text-[22px] text-[#2B221D] mb-4">Delivery address</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Postcode first: it decides whether we deliver and what it costs. */}
                  <div className="sm:col-span-2">
                    <input
                      className={`${field} uppercase`}
                      placeholder="Postcode"
                      value={addr.postcode}
                      onChange={(e) => onPostcodeChange(e.target.value)}
                      autoComplete="postal-code"
                      aria-label="Postcode"
                      aria-describedby="postcode-status"
                    />
                    <div id="postcode-status" aria-live="polite" className="mt-2 min-h-[20px] font-sans text-[13.5px]">
                      {pcChecking && <span className="text-[#5A524B]">Checking delivery…</span>}
                      {!pcChecking && pcCheck?.served && (
                        <span className="flex items-center gap-1.5 text-[#3a6b2e]">
                          <Check className="h-4 w-4 shrink-0" aria-hidden />
                          We deliver here · {money(pcCheck.feePence ?? 0)} delivery{pcCheck.etaMin ? ` · ~${pcCheck.etaMin} mins` : ""}
                        </span>
                      )}
                      {!pcChecking && pcCheck && !pcCheck.served && (
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#5D0925]">
                          {pcCheck.error?.trim() || "Sorry, we don't deliver to that postcode."}
                          {menu.collectionEnabled && (
                            <button type="button" onClick={() => setFulfilment("collection")} className="font-medium underline underline-offset-2">
                              Switch to collection
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <input className={`${field} sm:col-span-2`} placeholder="Address line 1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="address-line1" aria-label="Address line 1" />
                  <input className={field} placeholder="Address line 2 (optional)" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} autoComplete="address-line2" aria-label="Address line 2" />
                  <input className={field} placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" aria-label="City" />
                </div>
              </section>
            ) : (
              <section>
                <h2 className="font-serif text-[22px] text-[#2B221D] mb-2">Collection</h2>
                <p className="text-[#5A524B] font-sans text-[14px]">Collect from {menu.locationName}. We&apos;ll have it ready in about {menu.prepTimeMin} minutes after the kitchen accepts your order.</p>
              </section>
            )}

            <section>
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-4">Your details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <input className={field} placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" aria-label="Full name" />
                <input className={field} placeholder="Phone" type="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" aria-label="Phone" />
                <input className={`${field} sm:col-span-2`} placeholder="Email (for your receipt)" type="email" inputMode="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" aria-label="Email" />
              </div>
            </section>

            {/* Optional extras stay folded away so the main path stays short. */}
            <div className="flex flex-col gap-4">
              {showNotes || notes ? (
                <section>
                  <h2 className="font-serif text-[20px] text-[#2B221D] mb-3">Order notes</h2>
                  <textarea className={`${field} resize-none`} rows={2} placeholder="Anything we should know?" value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus={showNotes && !notes} />
                </section>
              ) : (
                <button type="button" onClick={() => setShowNotes(true)} className={addLink}>+ Add order notes</button>
              )}

              {showGift || giftBalance != null ? (
                <section>
                  <h2 className="font-serif text-[20px] text-[#2B221D] mb-3">Gift card</h2>
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
              ) : (
                <button type="button" onClick={() => setShowGift(true)} className={addLink}>+ Use a gift card</button>
              )}
            </div>

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
              <CartContents menu={menu} locationSlug={locationSlug} showDelivery onTotalChange={setPayTotal} />
              {error && <p role="alert" className="mt-4 text-[14px] text-[#5D0925] font-sans">{error}</p>}
              <button
                onClick={pay}
                disabled={pending}
                className="mt-5 w-full inline-flex items-center justify-center h-[56px] bg-[#5D0925] text-[#F6F2EA] text-[14px] tracking-[0.12em] uppercase font-sans hover:bg-[#420616] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? "Starting payment…" : chargePence != null ? `Pay ${money(chargePence)}` : "Pay securely"}
              </button>
              <p className="mt-3 text-[12px] text-[#5A524B] font-sans text-center">Card, Apple Pay &amp; Google Pay · processed securely by Stripe.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
