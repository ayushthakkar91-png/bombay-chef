import { redirect } from "next/navigation";
import Link from "next/link";
import { Phone, CalendarDays } from "lucide-react";

import { getOrderLocations } from "@/lib/repositories/ordering-menu";

// Which branches are online can change at runtime (admin toggles), so this
// redirect must be evaluated per request, not frozen at build time.
export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const orderable = (await getOrderLocations()).filter((l) => l.collectionEnabled || l.deliveryEnabled);

  // Food first: send the customer straight to the menu of the default branch.
  if (orderable.length > 0) redirect(`/order/menu?loc=${orderable[0].slug}`);

  // No branch online → premium "unavailable" state with clear next steps.
  return (
    <main className="min-h-screen bg-[#F6F2EA] px-5 pb-24 pt-[120px]">
      <div className="mx-auto max-w-md rounded-2xl border border-[#2A211C]/10 bg-white px-6 py-12 text-center">
        <p className="mb-2.5 font-sans text-[12px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">Order Online</p>
        <h1 className="font-serif text-[28px] font-light text-[#2B221D]">Online ordering is currently unavailable</h1>
        <p className="mx-auto mt-3 max-w-sm font-sans text-[15px] leading-relaxed text-[#5A524B]">We&apos;re not taking online orders right now. Call us to order, or book a table and dine with us.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/contact" className="inline-flex h-[52px] items-center justify-center gap-2 bg-[#5D0925] px-7 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]"><Phone className="h-4 w-4" /> Call the restaurant</Link>
          <Link href="/reservations" className="inline-flex h-[52px] items-center justify-center gap-2 border border-[#2B221D] px-7 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#2B221D] hover:text-[#F6F2EA]"><CalendarDays className="h-4 w-4" /> Reserve a table</Link>
        </div>
      </div>
    </main>
  );
}
