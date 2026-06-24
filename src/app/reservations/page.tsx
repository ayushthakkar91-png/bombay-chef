import { ReservationFlow } from "@/components/reservations/flow/ReservationFlow";
import { getCustomer } from "@/lib/auth/customer";
import { RESERVATIONS_ONLINE } from "@/lib/flags";
import { BRANCHES } from "@/data/locations";

export const metadata = {
  title: "Book a Table — Reserve Online at Balham | Bombay Bicycle Chef",
  description: "Reserve a table at Bombay Bicycle Chef Balham. Pick your date and time in a few easy steps — see live availability, or join the waitlist if fully booked.",
  alternates: { canonical: "/reservations" },
  openGraph: { title: "Book a Table | Bombay Bicycle Chef", description: "Reserve a table at our London restaurants — live availability in a few steps.", url: "/reservations", type: "website" },
};

// Navbar, Footer and SmoothScroll are provided globally by PublicChrome (see
// src/app/layout.tsx); this page only renders the booking flow. A <div> (not a
// <main>) is used because PublicChrome already wraps children in <main>.
export default async function ReservationsPage() {
  // Online booking OFF → no flow; show the location(s) and a call-to-reserve.
  if (!RESERVATIONS_ONLINE) {
    const bookable = BRANCHES.filter((b) => b.reservable);
    return (
      <div className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
        <section className="mx-auto max-w-[640px] px-6 pt-[150px] pb-32 text-center">
          <p className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">Reservations</p>
          <h1 className="font-serif text-[44px] font-light leading-[1.05] text-[#2B221D] lg:text-[60px]">Reserve by Phone</h1>
          <p className="mx-auto mt-5 max-w-md font-sans text-[16px] leading-relaxed text-[#5A524B]">
            To book a table, please give us a call — our team will be delighted to welcome you.
          </p>
          <div className="mt-10 flex flex-col items-center gap-6">
            {bookable.map((b) => (
              <div key={b.slug} className="w-full max-w-[400px] border border-[#2B221D]/15 bg-white/40 px-7 py-7 text-center">
                <p className="font-serif text-[26px] font-light text-[#2B221D]">{b.name}</p>
                <p className="mt-2 font-sans text-[14px] leading-relaxed text-[#5A524B]">{b.street}, {b.locality} {b.postcode}</p>
                <a
                  href={`tel:${b.phone.replace(/\s/g, "")}`}
                  className="mt-5 inline-flex h-[52px] w-full items-center justify-center bg-[#5D0925] px-6 font-sans text-[12px] font-semibold uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]"
                >
                  Call us on {b.phone}
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const customer = await getCustomer();
  return (
    <div className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <ReservationFlow isLoggedIn={Boolean(customer)} />
    </div>
  );
}
