"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/app/newsletter/actions";
import { IDLE } from "@/lib/admin/validation";
import { AccountBanner, AccountSubmit, accountField } from "@/components/account/forms";

export function NewsletterForm() {
  const [state, action] = useActionState(subscribeNewsletter, IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <AccountBanner state={state} />
      <div className="grid sm:grid-cols-2 gap-4">
        <input name="name" placeholder="First name (optional)" defaultValue={state.values?.name} className={accountField} aria-label="First name" />
        <input name="email" type="email" placeholder="Your email" defaultValue={state.values?.email} className={accountField} aria-label="Email" />
      </div>
      <AccountSubmit className="w-full sm:w-auto sm:self-start">Subscribe</AccountSubmit>
      <p className="text-[#5A524B] text-[12px] font-sans">Occasional news from our kitchens. Unsubscribe any time — separate from any account.</p>
    </form>
  );
}
