import Link from "next/link";

import { requireCustomer } from "@/lib/auth/customer";
import { listMyOrders } from "@/lib/repositories/account";
import { ORDER_STATUS_LABEL } from "@/lib/ordering/constants";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export default async function AccountOrdersPage() {
  const ctx = await requireCustomer();
  const orders = await listMyOrders(ctx.userId);

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-[#2A211C]/10 p-10 text-center">
        <p className="font-serif text-[24px] text-[#2B221D] mb-2">No orders yet</p>
        <p className="text-[#5A524B] font-sans text-[15px] mb-6">When you order collection or delivery, it&apos;ll appear here.</p>
        <Link href="/order" className="inline-flex items-center justify-center h-[50px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Order online</Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#2A211C]/10 divide-y divide-[#2A211C]/10">
      {orders.map((o) => (
        <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#F6F2EA]/60 transition-colors">
          <div>
            <p className="font-serif text-[18px] text-[#2B221D]">{o.code}</p>
            <p className="text-[#5A524B] text-[13px] font-sans capitalize">{dt(o.placedAt ?? o.createdAt)} · {o.fulfilment} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}</p>
          </div>
          <div className="text-right">
            <p className="font-sans text-[15px] text-[#2B221D] tabular-nums">{money(o.totalPence)}</p>
            <p className="text-[#B08A3E] text-[12px] font-sans">{ORDER_STATUS_LABEL[o.status]}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
