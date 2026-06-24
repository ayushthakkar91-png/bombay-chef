import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Clock, Phone, UtensilsCrossed, CalendarDays, Bike, ArrowRight } from "lucide-react";

import { BRANCHES, branchBySlug } from "@/data/locations";
import { BranchSchema } from "@/components/seo/Schema";
import { ORDER_URL } from "@/lib/flags";

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = branchBySlug(slug);
  if (!b) return {};
  return {
    title: `${b.name} — Modern Indian Restaurant, ${b.locality} ${b.postcode} | Bombay Bicycle Chef`,
    description: `Bombay Bicycle Chef ${b.name} at ${b.street}, ${b.locality} ${b.postcode}. ${b.blurb} Reserve a table${b.orderingEnabled ? " or order online for collection & delivery" : ""}.`,
    alternates: { canonical: `/locations/${b.slug}` },
    openGraph: { title: `Bombay Bicycle Chef — ${b.name}`, description: b.blurb, url: `/locations/${b.slug}`, images: [b.image], type: "website" },
  };
}

export default async function LocationLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = branchBySlug(slug);
  if (!b) notFound();

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[110px] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <BranchSchema branch={b} />

      <div className="mx-auto max-w-[1100px] px-6 py-12 lg:py-16">
        <nav className="mb-8 font-sans text-[12px] text-[#5A524B]">
          <Link href="/locations" className="hover:text-[#B08A3E]">Locations</Link> <span className="text-[#2A211C]/30">/</span> <span className="text-[#2B221D]">{b.name}</span>
        </nav>

        {/* Hero */}
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">Bombay Bicycle Chef</p>
            <h1 className="font-serif text-[44px] font-light leading-[1.05] text-[#2B221D] lg:text-[60px]">{b.name}</h1>
            <p className="mt-5 max-w-md font-sans text-[16px] leading-relaxed text-[#5A524B]">{b.blurb}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {b.orderingEnabled && (
                <a href={ORDER_URL} className="inline-flex h-[54px] items-center justify-center gap-2 bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]"><Bike className="h-4 w-4" /> Order Online</a>
              )}
              <Link href="/reservations" className="inline-flex h-[54px] items-center justify-center gap-2 border border-[#2B221D] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#2B221D] hover:text-[#F6F2EA]"><CalendarDays className="h-4 w-4" /> Reserve a Table</Link>
              <Link href="/menu" className="inline-flex h-[54px] items-center justify-center gap-2 px-4 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:text-[#B08A3E]"><UtensilsCrossed className="h-4 w-4" /> View Menu</Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src={b.image} alt={`Bombay Bicycle Chef ${b.name}`} fill quality={78} className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>

        {/* Details */}
        <div className="mt-12 grid gap-6 border-t border-[#2A211C]/10 pt-12 sm:grid-cols-3">
          <Detail icon={MapPin} label="Find us">{b.street}<br />{b.locality} {b.postcode}</Detail>
          <Detail icon={Clock} label="Opening hours">{b.hoursLabel}</Detail>
          <Detail icon={Phone} label="Call us"><a href={`tel:${b.phone.replace(/\s/g, "")}`} className="hover:text-[#B08A3E]">{b.phone}</a></Detail>
        </div>

        {b.orderingEnabled ? (
          <p className="mt-8 font-sans text-[14px] text-[#5A524B]">Delivery across {b.outcodes.join(", ")}. <a href={ORDER_URL} className="font-medium text-[#5D0925] underline underline-offset-2">Check your postcode →</a></p>
        ) : (
          <p className="mt-8 font-sans text-[14px] text-[#5A524B]">Online ordering for {b.name} is coming soon — <Link href="/reservations" className="font-medium text-[#5D0925] underline underline-offset-2">reserve a table</Link> in the meantime.</p>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[#2A211C]/10 pt-10">
          <p className="font-serif text-[22px] text-[#2B221D]">Find your nearest kitchen</p>
          <Link href="/locations" className="group inline-flex items-center gap-1.5 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] hover:text-[#B08A3E]">All locations <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
      </div>
    </main>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B08A3E]"><Icon className="h-4 w-4" /> {label}</div>
      <p className="font-sans text-[15px] leading-relaxed text-[#2B221D]">{children}</p>
    </div>
  );
}
