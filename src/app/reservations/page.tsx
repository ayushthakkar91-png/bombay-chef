import { ReservationFlow } from "@/components/reservations/flow/ReservationFlow";
import { getCustomer } from "@/lib/auth/customer";

export const metadata = {
  title: "Book a Table — Reserve Online at Balham, Battersea & Kilburn | Bombay Bicycle Chef",
  description: "Reserve a table at Bombay Bicycle Chef. Pick your London location, date and time in a few easy steps — see live availability, or join the waitlist if fully booked.",
  alternates: { canonical: "/reservations" },
  openGraph: { title: "Book a Table | Bombay Bicycle Chef", description: "Reserve a table at our London restaurants — live availability in a few steps.", url: "/reservations", type: "website" },
};

// Navbar, Footer and SmoothScroll are provided globally by PublicChrome (see
// src/app/layout.tsx); this page only renders the booking flow. A <div> (not a
// <main>) is used because PublicChrome already wraps children in <main>.
export default async function ReservationsPage() {
  const customer = await getCustomer();
  return (
    <div className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <ReservationFlow isLoggedIn={Boolean(customer)} />
    </div>
  );
}
