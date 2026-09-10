"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/account/_actions/auth";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit, accountField } from "./forms";

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, IDLE);
  return (
    <form action={action} className="flex flex-col gap-5">
      <AccountBanner state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" autoFocus placeholder="At least 8 characters" className={accountField} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-[#5A524B] text-[12px] tracking-[0.15em] uppercase font-sans font-semibold">Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" placeholder="Re-enter your new password" className={accountField} />
      </div>
      <AccountSubmit className="w-full mt-1">Update password</AccountSubmit>
    </form>
  );
}
