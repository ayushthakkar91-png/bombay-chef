import Link from "next/link";
import { MapPin, Bike, ArrowRight, ArrowUpRight } from "lucide-react";

import { BRANCHES } from "@/data/locations";
import { orderHrefFor } from "@/lib/ordering/routing";

/**
 * "Order Online" entry point. One card per branch; internal branches open our own
 * ordering flow, external branches open the partner platform in a new tab. Server
 * component — routing is decided from static branch data at request time.
 */
export function BranchPicker() {
  return (
    <main className="min-h-screen bg-[#F6F2EA] px-5 pb-24 pt-[120px] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <div className="mx-auto max-w-[960px]">
        <header className="text-center">
          <p className="mb-2.5 font-sans text-[12px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">Order Online</p>
          <h1 className="font-serif text-[32px] font-light leading-[1.1] text-[#2B221D] lg:text-[40px]">Choose your kitchen</h1>
          <p className="mx-auto mt-3 max-w-md font-sans text-[15px] leading-relaxed text-[#5A524B]">
            Collection &amp; delivery, freshly cooked to order. Pick the Bombay Bicycle Chef nearest you.
          </p>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((b) => {
            const order = orderHrefFor(b);
            return (
              <div key={b.slug} className="flex flex-col rounded-2xl border border-[#2A211C]/10 bg-white p-6">
                <h2 className="font-serif text-[24px] font-light text-[#2B221D]">{b.name}</h2>
                <p className="mt-2 flex items-start gap-1.5 font-sans text-[14px] leading-relaxed text-[#5A524B]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B08A3E]" />
                  <span>{b.street}, {b.locality} {b.postcode}</span>
                </p>
                <p className="mt-3 font-sans text-[13px] text-[#5A524B]">
                  {order.external ? "Order on our partner platform" : "Collection & delivery across " + b.outcodes.join(", ")}
                </p>

                <div className="mt-6 flex-1" />

                {order.external ? (
                  <a
                    href={order.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[50px] items-center justify-center gap-2 border border-[#2B221D] px-6 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#2B221D] hover:text-[#F6F2EA]"
                  >
                    Order Online <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    href={order.href}
                    className="group inline-flex h-[50px] items-center justify-center gap-2 bg-[#5D0925] px-6 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]"
                  >
                    <Bike className="h-4 w-4" /> Start your order
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
