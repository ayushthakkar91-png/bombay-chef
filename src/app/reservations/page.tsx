import { ReservationFlow } from "@/components/reservations/flow/ReservationFlow";

// Navbar, Footer and SmoothScroll are provided globally by PublicChrome (see
// src/app/layout.tsx); this page only renders the booking flow. A <div> (not a
// <main>) is used because PublicChrome already wraps children in <main>.
export default function ReservationsPage() {
  return (
    <div className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <ReservationFlow />
    </div>
  );
}
