"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { ActionState } from "@/lib/admin/validation";

export const accountField =
  "w-full bg-white border border-[#2A211C]/20 px-4 py-3 text-[16px] text-[#2B221D] font-sans focus:outline-none focus:border-[#B08A3E]";

export function AccountBanner({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  const isError = state.ok === false;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`px-4 py-3 text-[14px] font-sans border ${
        isError ? "border-[#5D0925]/25 bg-[#5D0925]/5 text-[#5D0925]" : "border-[#3a6b2e]/25 bg-[#3a6b2e]/5 text-[#3a6b2e]"
      }`}
    >
      {state.message}
    </div>
  );
}

export function AccountSubmit({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center h-[54px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500 disabled:opacity-60 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
