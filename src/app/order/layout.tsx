import type { Metadata } from "next";
import Link from "next/link";

import { flags, EXTERNAL_ORDER_URL } from "@/lib/flags";
import { OrderProvider } from "@/components/order/OrderProvider";

export const metadata: Metadata = {
  title: "Order online | Bombay Bicycle Chef",
  description: "Order collection or delivery from Bombay Bicycle Chef — Balham, Battersea and Kilburn.",
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  // Ordering ships behind a flag. Until it's switched on, point guests at the
  // interim external locator (the existing fallback) — the public site is unaffected.
  if (!flags.ordering) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 flex items-start justify-center">
        <div className="max-w-md text-center">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-3">Order Online</p>
          <h1 className="font-serif text-[36px] text-[#2B221D] font-light mb-4">Coming Soon</h1>
          <p className="text-[#5A524B] font-sans text-[15px] mb-8">
            Online ordering is on its way. In the meantime you can order through our partners.
          </p>
          <a
            href={EXTERNAL_ORDER_URL}
            className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors"
          >
            Find your local kitchen
          </a>
          <div className="mt-6">
            <Link href="/" className="text-[#5A524B] text-[13px] underline hover:text-[#B08A3E]">Back to home</Link>
          </div>
        </div>
      </main>
    );
  }

  return <OrderProvider>{children}</OrderProvider>;
}
