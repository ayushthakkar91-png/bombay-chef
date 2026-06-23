"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/account/_actions/auth";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit, accountField } from "./forms";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, IDLE);
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <AccountBanner state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" autoFocus defaultValue={state.values?.email} className={accountField} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className={accountField} />
      </div>
      <AccountSubmit className="w-full mt-1">Sign in</AccountSubmit>
      <p className="text-center text-[#5A524B] text-[14px] font-sans">
        New here? <Link href="/account/register" className="text-[#B08A3E] hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
