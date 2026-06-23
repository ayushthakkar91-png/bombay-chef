"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/app/account/_actions/auth";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit, accountField } from "./forms";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(register, IDLE);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <AccountBanner state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Full name</label>
        <input id="fullName" name="fullName" autoComplete="name" defaultValue={state.values?.fullName} className={accountField} />
        {state.errors?.fullName && <p className="text-[#5D0925] text-[12px] font-sans">{state.errors.fullName}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} className={accountField} />
          {state.errors?.email && <p className="text-[#5D0925] text-[12px] font-sans">{state.errors.email}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={state.values?.phone} className={accountField} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className={accountField} />
        {state.errors?.password && <p className="text-[#5D0925] text-[12px] font-sans">{state.errors.password}</p>}
      </div>

      {/* Marketing consent — separate from account creation, optional, unticked. */}
      <label className="flex items-start gap-3 text-[14px] font-sans text-[#5A524B]">
        <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 accent-[#B08A3E]" />
        <span>Email me occasional news and offers. (Optional — separate from your account, unsubscribe any time.)</span>
      </label>

      <AccountSubmit className="w-full mt-1">Create account</AccountSubmit>
      <p className="text-center text-[#5A524B] text-[14px] font-sans">
        Already have an account? <Link href="/account/login" className="text-[#B08A3E] hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
