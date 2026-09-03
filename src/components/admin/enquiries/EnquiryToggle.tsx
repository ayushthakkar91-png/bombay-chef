"use client";

import { useState, useTransition } from "react";

import { markEnquiryHandled } from "@/app/admin/_actions/enquiries";

export function EnquiryToggle({ id, handled: initial }: { id: string; handled: boolean }) {
  const [handled, setHandled] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await markEnquiryHandled(id, !handled);
        if (r.ok) setHandled(!handled);
      })}
      className={`rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        handled ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-sand text-text hover:bg-bg/60"
      }`}
    >
      {handled ? "Handled ✓" : "Mark handled"}
    </button>
  );
}
