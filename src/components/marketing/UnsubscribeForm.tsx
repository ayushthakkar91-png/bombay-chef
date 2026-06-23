"use client";

import { useActionState } from "react";
import { unsubscribe } from "@/app/unsubscribe/actions";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit } from "@/components/account/forms";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action] = useActionState(unsubscribe, IDLE);
  if (state.ok) return <AccountBanner state={state} />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <AccountBanner state={state} />
      <p className="text-[#5A524B] font-sans text-[15px]">Stop receiving marketing emails from Bombay Bicycle Chef?</p>
      <input type="hidden" name="token" value={token} />
      <AccountSubmit className="w-full sm:w-auto sm:self-start">Confirm unsubscribe</AccountSubmit>
    </form>
  );
}
