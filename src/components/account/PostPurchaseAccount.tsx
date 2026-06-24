"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { register } from "@/app/account/_actions/auth";
import { IDLE } from "@/lib/admin/validation";

const BENEFITS = [
  "Track your orders",
  "View reservation history",
  "Earn loyalty points",
  "Save your addresses",
  "Manage gift cards",
  "Faster checkout",
  "Birthday rewards",
  "Exclusive offers",
];

/**
 * Post-purchase, guest-only prompt to create an account in (almost) one click —
 * the email used at checkout is pre-filled, so the guest only chooses a password.
 * On creation, the existing `register` action links this order/reservation/gift
 * card and back-credits loyalty automatically.
 */
export function PostPurchaseAccount({ email, name }: { email: string; name?: string | null }) {
  const [state, action] = useActionState(register, IDLE);

  if (state.ok) {
    return (
      <div className="mt-8 rounded-sm bg-[#2A211C] p-6 text-center text-[#F6F2EA] lg:p-8">
        <Check className="mx-auto mb-2 h-7 w-7 text-[#B08A3E]" />
        <p className="font-serif text-[22px]">Almost there</p>
        <p className="mt-2 font-sans text-[14px] text-[#F6F2EA]/75">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-sm bg-[#2A211C] text-[#F6F2EA]">
      <div className="grid lg:grid-cols-2">
        {/* Benefits */}
        <div className="border-b border-[#F6F2EA]/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B08A3E]">Join the table</p>
          <p className="font-serif text-[26px] leading-tight">Create your Bombay Bicycle Chef account</p>
          <ul className="mt-5 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 font-sans text-[13.5px] text-[#F6F2EA]/85">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#B08A3E]" /> {b}
              </li>
            ))}
          </ul>
        </div>

        {/* One-click form (email pre-filled) */}
        <form action={action} className="flex flex-col gap-3 p-6 lg:p-8">
          <input type="hidden" name="next" value="/account" />
          <input type="hidden" name="email" value={email} />
          {name ? <input type="hidden" name="fullName" value={name} /> : null}

          <p className="font-sans text-[13px] text-[#F6F2EA]/70">Setting up for <span className="font-medium text-[#F6F2EA]">{email}</span></p>

          {!name && (
            <div>
              <label htmlFor="ppa-name" className="sr-only">Your name</label>
              <input id="ppa-name" name="fullName" defaultValue={state.values?.fullName} placeholder="Your name" className="w-full border border-[#F6F2EA]/20 bg-[#F6F2EA]/5 px-4 py-3 font-sans text-[15px] text-[#F6F2EA] placeholder:text-[#F6F2EA]/40 focus:border-[#B08A3E] focus:outline-none" />
              {state.errors?.fullName && <p className="mt-1 font-sans text-[12px] text-[#E8B4A0]">{state.errors.fullName}</p>}
            </div>
          )}

          <div>
            <label htmlFor="ppa-pw" className="sr-only">Choose a password</label>
            <input id="ppa-pw" name="password" type="password" placeholder="Choose a password" autoComplete="new-password" className="w-full border border-[#F6F2EA]/20 bg-[#F6F2EA]/5 px-4 py-3 font-sans text-[15px] text-[#F6F2EA] placeholder:text-[#F6F2EA]/40 focus:border-[#B08A3E] focus:outline-none" />
            {state.errors?.password && <p className="mt-1 font-sans text-[12px] text-[#E8B4A0]">{state.errors.password}</p>}
          </div>

          <label className="flex items-start gap-2 font-sans text-[12.5px] text-[#F6F2EA]/70">
            <input type="checkbox" name="marketing" defaultChecked className="mt-0.5 h-4 w-4 accent-[#B08A3E]" /> Email me birthday rewards & exclusive offers.
          </label>

          {!state.ok && state.message && <p className="font-sans text-[12.5px] text-[#E8B4A0]">{state.message}</p>}

          <button type="submit" className="mt-1 inline-flex h-[50px] items-center justify-center bg-[#B08A3E] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2A211C] transition-colors hover:bg-[#F6F2EA]">
            Create my account
          </button>
          <p className="text-center font-sans text-[12px] text-[#F6F2EA]/50">No thanks — your order is confirmed either way.</p>
        </form>
      </div>
    </div>
  );
}
