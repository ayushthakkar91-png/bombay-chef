"use client";

import { useState, useTransition } from "react";

import { verifyManage, type ManageViewData } from "@/app/reservations/manage/actions";
import { ManageReservation } from "@/components/reservations/ManageReservation";

/**
 * Email-verification gate in front of the manage-booking view. The URL token
 * alone shows nothing: the guest must also enter the email the booking was
 * made with. On success the server returns the booking details, which are
 * held in state (never rendered into the page HTML for the bare link).
 */
export function ManageGate({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [view, setView] = useState<ManageViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await verifyManage(token, email);
      if (r.ok) setView(r.view);
      else setError(r.error);
    });
  };

  if (view) {
    return <ManageReservation token={token} email={email} onView={setView} {...view} />;
  }

  return (
    <div className="bg-white border border-[#2A211C]/10 p-8 lg:p-12 max-w-[520px] mx-auto">
      <p className="text-[#B08A3E] text-[11px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">
        Verify it&apos;s you
      </p>
      <p className="text-[#5A524B] font-sans text-[15px] leading-relaxed mb-8">
        For your security, enter the email address you booked with to view and manage this reservation.
      </p>

      <form onSubmit={unlock} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-[#B08A3E] text-[11px] tracking-[0.15em] uppercase font-sans font-semibold">
            Email address
          </span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[16px] text-[#2B221D] font-serif focus:outline-none focus:border-[#B08A3E] transition-colors placeholder:text-[#2A211C]/25"
          />
        </label>

        {error && (
          <p role="alert" className="text-[#5D0925] text-[14px] font-sans">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !email}
          className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Checking…" : "View my booking"}
        </button>
      </form>
    </div>
  );
}
