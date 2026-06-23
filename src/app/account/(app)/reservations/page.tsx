import Link from "next/link";

import { requireCustomer } from "@/lib/auth/customer";
import { listMyReservations, type AccountReservation } from "@/lib/repositories/account";
import { STATUS_LABEL } from "@/lib/reservations/constants";
import { formatInstantDate, formatInstantTime } from "@/lib/reservations/time";

export default async function AccountReservationsPage() {
  const ctx = await requireCustomer();
  const all = await listMyReservations(ctx.userId);
  // Server Component: runs once per request, so request-time `now` is fine here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = all.filter((r) => new Date(r.startsAt).getTime() > now && (r.status === "confirmed" || r.status === "pending"));
  const past = all.filter((r) => !upcoming.includes(r));

  if (all.length === 0) {
    return (
      <div className="bg-white border border-[#2A211C]/10 p-10 text-center">
        <p className="font-serif text-[24px] text-[#2B221D] mb-2">No reservations yet</p>
        <p className="text-[#5A524B] font-sans text-[15px] mb-6">Book a table and it&apos;ll show up here.</p>
        <Link href="/reservations" className="inline-flex items-center justify-center h-[50px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Reserve a table</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Upcoming</h2>
          <div className="bg-white border border-[#2A211C]/10 divide-y divide-[#2A211C]/10">
            {upcoming.map((r) => <Row key={r.id} r={r} manageable />)}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Past</h2>
          <div className="bg-white border border-[#2A211C]/10 divide-y divide-[#2A211C]/10">
            {past.map((r) => <Row key={r.id} r={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ r, manageable }: { r: AccountReservation; manageable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-serif text-[18px] text-[#2B221D]">{r.locationName}</p>
        <p className="text-[#5A524B] text-[13px] font-sans">
          {formatInstantDate(new Date(r.startsAt))}, {formatInstantTime(new Date(r.startsAt))} · party of {r.partySize}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[#B08A3E] text-[12px] font-sans uppercase tracking-[0.1em]">{STATUS_LABEL[r.status]}</p>
        {manageable && r.manageToken && (
          <Link href={`/reservations/manage/${r.manageToken}`} className="text-[#2B221D] text-[12px] font-sans underline hover:text-[#B08A3E]">Manage</Link>
        )}
      </div>
    </div>
  );
}
