import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireCustomer } from "@/lib/auth/customer";
import { getMyOrder } from "@/lib/repositories/account";
import { ORDER_STATUS_LABEL } from "@/lib/ordering/constants";
import { ReorderButton } from "@/components/account/ReorderButton";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCustomer();
  const { id } = await params;
  const order = await getMyOrder(ctx.userId, id);

  if (!order) {
    return (
      <div className="bg-white border border-[#2A211C]/10 p-10 text-center">
        <p className="font-serif text-[24px] text-[#2B221D] mb-4">Order not found</p>
        <Link href="/account/orders" className="text-[#B08A3E] hover:underline font-sans text-[14px]">Back to orders</Link>
      </div>
    );
  }

  const address = order.deliveryAddress as { line1?: string; line2?: string; city?: string; postcode?: string } | null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-[#5A524B] text-[13px] font-sans hover:text-[#B08A3E]">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="bg-white border border-[#2A211C]/10 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-[30px] text-[#2B221D]">{order.code}</h1>
            <p className="text-[#5A524B] text-[14px] font-sans capitalize">{dt(order.placedAt ?? order.createdAt)} · {order.fulfilment} · {order.locationName}</p>
          </div>
          <span className="text-[12px] tracking-[0.12em] uppercase font-sans px-3 py-1.5 bg-[#B08A3E]/15 text-[#7a5e23]">{ORDER_STATUS_LABEL[order.status]}</span>
        </div>

        {order.fulfilment === "delivery" && address && (
          <p className="text-[#5A524B] font-sans text-[14px] mb-5">Delivered to {[address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(", ")}</p>
        )}

        <ul className="divide-y divide-[#2A211C]/10">
          {order.items.map((it, i) => (
            <li key={i} className="py-3 flex justify-between gap-4">
              <div>
                <p className="font-serif text-[16px] text-[#2B221D]">{it.qty}× {it.name}</p>
                {it.modifiers.length > 0 && <p className="text-[#5A524B] text-[12px] font-sans">{it.modifiers.map((m) => m.name).join(", ")}</p>}
                {it.notes && <p className="text-[#5A524B] text-[12px] font-sans italic">“{it.notes}”</p>}
              </div>
              <span className="font-sans text-[15px] text-[#2B221D] tabular-nums">{money(it.lineTotalPence)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 border-t border-[#2A211C]/10 pt-4 flex flex-col gap-1.5 font-sans text-[14px]">
          <div className="flex justify-between text-[#5A524B]"><dt>Subtotal</dt><dd className="tabular-nums">{money(order.subtotalPence)}</dd></div>
          {order.discountPence > 0 && <div className="flex justify-between text-[#3a6b2e]"><dt>Discount</dt><dd className="tabular-nums">−{money(order.discountPence)}</dd></div>}
          {order.fulfilment === "delivery" && <div className="flex justify-between text-[#5A524B]"><dt>Delivery</dt><dd className="tabular-nums">{money(order.deliveryFeePence)}</dd></div>}
          <div className="flex justify-between text-[#2B221D] text-[17px] font-medium pt-1.5 border-t border-[#2A211C]/10 mt-1"><dt>Total</dt><dd className="tabular-nums">{money(order.totalPence)}</dd></div>
        </dl>

        <div className="mt-6">
          <ReorderButton locationSlug={order.locationSlug} items={order.items} />
        </div>
      </div>
    </div>
  );
}
