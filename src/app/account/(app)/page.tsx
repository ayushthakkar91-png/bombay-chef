import Link from "next/link";
import { ArrowRight, ShoppingBag, CalendarDays } from "lucide-react";

import { requireCustomer } from "@/lib/auth/customer";
import { listMyOrders, listMyReservations } from "@/lib/repositories/account";
import { ORDER_STATUS_LABEL } from "@/lib/ordering/constants";
import { formatInstantDate, formatInstantTime } from "@/lib/reservations/time";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export default async function AccountHomePage() {
  const ctx = await requireCustomer();
  const [orders, reservations] = await Promise.all([listMyOrders(ctx.userId), listMyReservations(ctx.userId)]);

  // Server Component: runs once per request, so request-time `now` is fine here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = reservations
    .filter((r) => new Date(r.startsAt).getTime() > now && (r.status === "confirmed" || r.status === "pending"))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const nextRes = upcoming[0];
  const lastOrder = orders[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="Recent orders" icon={<ShoppingBag className="h-5 w-5 text-[#B08A3E]" />} href="/account/orders" cta="All orders">
          {lastOrder ? (
            <p className="text-[#5A524B] font-sans text-[14px]">
              Latest: <span className="text-[#2B221D]">{lastOrder.code}</span> · {ORDER_STATUS_LABEL[lastOrder.status]} · {money(lastOrder.totalPence)}
            </p>
          ) : (
            <p className="text-[#5A524B] font-sans text-[14px]">No orders yet. <Link href="/order" className="text-[#B08A3E] hover:underline">Order online</Link>.</p>
          )}
        </Card>

        <Card title="Upcoming reservation" icon={<CalendarDays className="h-5 w-5 text-[#B08A3E]" />} href="/account/reservations" cta="All reservations">
          {nextRes ? (
            <p className="text-[#5A524B] font-sans text-[14px]">
              {nextRes.locationName} · {formatInstantDate(new Date(nextRes.startsAt))}, {formatInstantTime(new Date(nextRes.startsAt))} · party of {nextRes.partySize}
            </p>
          ) : (
            <p className="text-[#5A524B] font-sans text-[14px]">No upcoming bookings. <Link href="/reservations" className="text-[#B08A3E] hover:underline">Reserve a table</Link>.</p>
          )}
        </Card>
      </div>

      <div className="bg-white border border-[#2A211C]/10 p-6">
        <h2 className="font-serif text-[20px] text-[#2B221D] mb-4">Quick links</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { href: "/account/addresses", label: "Delivery addresses" },
            { href: "/account/favourites", label: "Favourite dishes" },
            { href: "/account/preferences", label: "Preferences & privacy" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center justify-between px-4 py-3 border border-[#2A211C]/10 hover:border-[#B08A3E]/50 transition-colors font-sans text-[14px] text-[#2B221D]">
              {l.label}
              <ArrowRight className="h-4 w-4 text-[#5A524B]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, href, cta, children }: { title: string; icon: React.ReactNode; href: string; cta: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#2A211C]/10 p-6 flex flex-col">
      <div className="flex items-center gap-2.5 mb-3">{icon}<h2 className="font-serif text-[20px] text-[#2B221D]">{title}</h2></div>
      <div className="flex-1">{children}</div>
      <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-[#B08A3E] text-[12px] uppercase tracking-[0.12em] font-sans hover:gap-2.5 transition-all">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
