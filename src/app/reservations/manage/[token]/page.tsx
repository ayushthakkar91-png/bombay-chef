import type { Metadata } from "next";
import Link from "next/link";

import { getManageView } from "@/lib/repositories/reservations";
import { ManageGate } from "@/components/reservations/ManageGate";

export const metadata: Metadata = {
  title: "Manage your booking | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function ManageReservationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Existence check only — no booking details are rendered for the bare link.
  // The gate requires the booking email before anything is shown (see
  // ManageGate/verifyManage).
  const exists = Boolean(await getManageView(token));

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6">
      <div className="max-w-[760px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-3">Your Reservation</p>
          <h1 className="font-serif text-[40px] lg:text-[52px] text-[#2B221D] font-light leading-[1.1]">
            Manage Your Booking
          </h1>
        </div>

        {!exists ? (
          <div className="bg-white border border-[#2A211C]/10 p-10 text-center">
            <p className="font-serif text-[24px] text-[#2B221D] mb-3">We couldn&apos;t find that booking</p>
            <p className="text-[#5A524B] font-sans text-[15px] mb-8">
              The link may be incorrect or expired. Please check the link in your confirmation email.
            </p>
            <Link
              href="/reservations"
              className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors"
            >
              Make a Reservation
            </Link>
          </div>
        ) : (
          <ManageGate token={token} />
        )}
      </div>
    </main>
  );
}
