"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

/**
 * Checkout entry choice for signed-out customers: continue as guest (the
 * fastest path, so it's the primary action), sign in, or create an account.
 * Sign-in/register return straight to checkout via `next`. Signed-in customers
 * never see this — they go directly to checkout with details prefilled.
 * Bottom sheet on mobile, centred dialog on larger screens.
 */
export function CheckoutChoice({
  open,
  onClose,
  onGuest,
  locationSlug,
}: {
  open: boolean;
  onClose: () => void;
  onGuest: () => void;
  locationSlug: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const next = encodeURIComponent(`/order/checkout?loc=${locationSlug}`);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-choice-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />

      <div className="relative w-full max-w-[440px] rounded-t-2xl bg-[#F6F2EA] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:rounded-2xl sm:pb-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="checkout-choice-title" className="font-serif text-[26px] leading-tight text-[#2B221D]">How would you like to check out?</h2>
            <p className="mt-1 font-sans text-[13.5px] text-[#5A524B]">Guest checkout takes about a minute.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded-full p-1.5 text-[#2B221D] hover:bg-[#2A211C]/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={onGuest}
          autoFocus
          className="flex h-[56px] w-full items-center justify-center gap-2 bg-[#5D0925] font-sans text-[13px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]"
        >
          Continue as guest <ArrowRight className="h-4 w-4" />
        </button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#2A211C]/12" />
          <span className="font-sans text-[11px] uppercase tracking-[0.15em] text-[#5A524B]">or</span>
          <span className="h-px flex-1 bg-[#2A211C]/12" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/account/login?next=${next}`}
            className="flex h-[50px] items-center justify-center border border-[#2B221D]/30 font-sans text-[12px] uppercase tracking-[0.12em] text-[#2B221D] transition-colors hover:border-[#2B221D] hover:bg-[#2B221D] hover:text-[#F6F2EA]"
          >
            Sign in
          </Link>
          <Link
            href={`/account/register?next=${next}`}
            className="flex h-[50px] items-center justify-center border border-[#2B221D]/30 font-sans text-[12px] uppercase tracking-[0.12em] text-[#2B221D] transition-colors hover:border-[#2B221D] hover:bg-[#2B221D] hover:text-[#F6F2EA]"
          >
            Create account
          </Link>
        </div>

        <p className="mt-4 text-center font-sans text-[12.5px] text-[#5A524B]">
          Members save their details, reorder in one tap and earn rewards.
        </p>
      </div>
    </div>
  );
}
