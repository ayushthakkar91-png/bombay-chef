"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/account/_actions/auth";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit, accountField } from "./forms";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, IDLE);
  return (
    <form action={action} className="flex flex-col gap-5">
      <AccountBanner state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" autoFocus defaultValue={state.values?.email} placeholder="Enter your email" className={accountField} />
      </div>
      <AccountSubmit className="w-full mt-1">Send reset link</AccountSubmit>
      <p className="text-center text-[#5A524B] text-[14px] font-sans">
        Remembered it? <Link href="/account/login" className="text-[#B08A3E] hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
