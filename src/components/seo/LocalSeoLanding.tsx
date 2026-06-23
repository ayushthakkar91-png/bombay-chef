import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, Phone, UtensilsCrossed, CalendarDays, Bike, Star } from "lucide-react";

import type { Branch } from "@/data/locations";
import { BranchSchema } from "./Schema";
import { ORDER_URL } from "@/lib/flags";

/** Keyword-targeted local SEO landing for "Indian restaurant {city}" searches.
 *  Premium copy, real links, LocalBusiness schema — built to rank + convert. */
export function LocalSeoLanding({ branch }: { branch: Branch }) {
  const c = branch.name;
  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[110px] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <BranchSchema branch={branch} />

      <div className="mx-auto max-w-[1000px] px-6 py-12 lg:py-16">
        <p className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">Indian Restaurant · {c}</p>
        <h1 className="font-serif text-[40px] font-light leading-[1.08] text-[#2B221D] lg:text-[56px]">
          Indian Restaurant in {c}
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-[#B08A3E] text-[#B08A3E]" strokeWidth={0} />)}</div>
          <span className="font-sans text-[13px] text-[#5A524B]">4.8/5 · &ldquo;Best Indian food in South London&rdquo; — Google Reviews</span>
        </div>

        <p className="mt-6 max-w-2xl font-sans text-[16px] leading-relaxed text-[#5A524B]">
          {branch.blurb} Widely loved as one of the <strong className="font-medium text-[#2B221D]">best Indian restaurants in {c}</strong>, Bombay Bicycle Chef serves modern Indian cooking — tandoori grills, signature curries, biryanis and street-food classics — for dine-in, <strong className="font-medium text-[#2B221D]">Indian takeaway in {c}</strong> and delivery.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {branch.orderingEnabled && (
            <a href={ORDER_URL} className="inline-flex h-[54px] items-center justify-center gap-2 bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]"><Bike className="h-4 w-4" /> Order Online</a>
          )}
          <Link href="/reservations" className="inline-flex h-[54px] items-center justify-center gap-2 border border-[#2B221D] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#2B221D] hover:text-[#F6F2EA]"><CalendarDays className="h-4 w-4" /> Reserve a Table</Link>
          <Link href="/menu" className="inline-flex h-[54px] items-center justify-center gap-2 px-4 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:text-[#B08A3E]"><UtensilsCrossed className="h-4 w-4" /> View Menu</Link>
        </div>

        <div className="relative mt-12 aspect-[16/7] overflow-hidden">
          <Image src={branch.image} alt={`Bombay Bicycle Chef — Indian restaurant in ${c}`} fill unoptimized className="object-cover" sizes="(max-width: 1024px) 100vw, 1000px" />
        </div>

        {/* Keyword-rich, genuinely useful sections */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <Block title={`Indian food near ${c}`}>
            From our {branch.street} kitchen we serve fresh, modern Indian food to {c} and the surrounding area. Whether it&apos;s a relaxed dinner, a family feast or a quick lunch, you&apos;ll find the flavours of Bombay just around the corner.
          </Block>
          <Block title={`Indian takeaway & delivery in ${c}`}>
            {branch.orderingEnabled
              ? <>Order online for collection or delivery across {branch.outcodes.join(", ")}. Freshly prepared, ready in minutes — the easiest Indian takeaway in {c}.</>
              : <>Online ordering for {c} is coming soon. In the meantime, reserve a table to dine in with us.</>}
          </Block>
          <Block title={`Best Indian restaurant in ${c}`}>
            Rated 4.8/5 by our guests, Bombay Bicycle Chef pairs authentic recipes with a warm, candle-lit room — a special-occasion favourite and an everyday treat alike.
          </Block>
          <Block title="Find us & opening hours">
            <span className="flex flex-col gap-1.5 not-italic">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#B08A3E]" /> {branch.street}, {branch.locality} {branch.postcode}</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#B08A3E]" /> {branch.hoursLabel}</span>
              <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#B08A3E]" /> <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="hover:text-[#B08A3E]">{branch.phone}</a></span>
            </span>
          </Block>
        </div>

        <div className="mt-12 border-t border-[#2A211C]/10 pt-8 text-center">
          <p className="font-serif text-[24px] text-[#2B221D]">Hungry for Indian food in {c}?</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {branch.orderingEnabled && <a href={ORDER_URL} className="inline-flex h-[52px] items-center justify-center bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]">Order Online</a>}
            <Link href="/reservations" className="inline-flex h-[52px] items-center justify-center border border-[#2B221D] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#2B221D] hover:text-[#F6F2EA]">Book a Table</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-serif text-[22px] text-[#2B221D]">{title}</h2>
      <p className="font-sans text-[15px] leading-relaxed text-[#5A524B]">{children}</p>
    </div>
  );
}
