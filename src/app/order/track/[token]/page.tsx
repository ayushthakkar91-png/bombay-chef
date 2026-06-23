import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { getOrderByToken } from "@/lib/repositories/orders";
import { getCustomer } from "@/lib/auth/customer";
import { ORDER_STATUS_LABEL, LIVE_STATUSES, type OrderStatus, type Fulfilment } from "@/lib/ordering/constants";
import { TrackingControls } from "@/components/order/TrackingControls";

export const metadata: Metadata = {
  title: "Your order | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

function steps(fulfilment: Fulfilment): { status: OrderStatus; label: string }[] {
  return [
    { status: "paid", label: "Confirmed" },
    { status: "accepted", label: "Accepted" },
    { status: "preparing", label: "Preparing" },
    fulfilment === "delivery"
      ? { status: "out_for_delivery", label: "On its way" }
      : { status: "ready_for_collection", label: "Ready" },
    { status: "completed", label: "Completed" },
  ];
}

export default async function OrderTrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  const order = await getOrderByToken(token);

  if (!order) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Order not found</p>
        <p className="text-[#5A524B] font-sans text-[15px] mb-8">Please check the link in your confirmation email.</p>
        <Link href="/order" className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Start an order</Link>
      </main>
    );
  }

  const customer = await getCustomer();
  const isLive = LIVE_STATUSES.includes(order.status);
  const stopped = order.status === "cancelled" || order.status === "refunded";
  const flow = steps(order.fulfilment);
  const currentIndex = flow.findIndex((s) => s.status === order.status);
  const address = order.deliveryAddress as { line1?: string; line2?: string; city?: string; postcode?: string } | null;

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6">
      <TrackingControls isLive={isLive} paid={paid === "1"} />
      <div className="max-w-[720px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-3">{order.status === "pending_payment" ? "Awaiting Payment" : "Order Received"}</p>
          <h1 className="font-serif text-[40px] lg:text-[52px] text-[#2B221D] font-light leading-[1.1]">
            {stopped ? ORDER_STATUS_LABEL[order.status] : "Thank You"}
          </h1>
          <p className="text-[#5A524B] font-sans text-[15px] mt-3">
            Order <span className="text-[#2B221D] font-semibold tracking-wide">{order.code}</span>
            {order.contactEmail ? <> · a confirmation was sent to {order.contactEmail}</> : null}
          </p>
        </div>

        {/* Status */}
        {stopped ? (
          <div className="bg-[#5D0925]/5 border border-[#5D0925]/20 text-[#5D0925] text-center py-5 px-6 mb-10 font-sans text-[15px]">
            This order has been {order.status === "refunded" ? "refunded — any payment will be returned to your card" : "cancelled"}.
          </div>
        ) : (
          <div className="flex items-center justify-between mb-12">
            {flow.map((step, i) => {
              const done = currentIndex >= 0 && i <= currentIndex;
              const active = i === currentIndex;
              return (
                <div key={step.status} className="flex-1 flex flex-col items-center text-center">
                  <div className="flex items-center w-full">
                    <div className={`h-[2px] flex-1 ${i === 0 ? "opacity-0" : done ? "bg-[#B08A3E]" : "bg-[#2A211C]/15"}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-[#B08A3E] text-[#F6F2EA]" : "bg-white border border-[#2A211C]/20 text-[#2A211C]/40"} ${active ? "ring-4 ring-[#B08A3E]/20" : ""}`}>
                      {done ? <Check className="h-4 w-4" /> : <span className="text-[12px]">{i + 1}</span>}
                    </div>
                    <div className={`h-[2px] flex-1 ${i === flow.length - 1 ? "opacity-0" : currentIndex > i ? "bg-[#B08A3E]" : "bg-[#2A211C]/15"}`} />
                  </div>
                  <span className={`mt-2 text-[11px] font-sans uppercase tracking-[0.1em] ${active ? "text-[#B08A3E] font-semibold" : "text-[#5A524B]"}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="bg-white border border-[#2A211C]/10 p-6 lg:p-8">
          <div className="flex justify-between items-baseline mb-4">
            <h2 className="font-serif text-[22px] text-[#2B221D] capitalize">{order.fulfilment}</h2>
            {order.prepTimeMin ? <span className="text-[#5A524B] text-[14px] font-sans">about {order.prepTimeMin} min</span> : null}
          </div>

          {order.fulfilment === "delivery" && address && (
            <p className="text-[#5A524B] font-sans text-[14px] mb-4">
              {[address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(", ")}
            </p>
          )}

          <ul className="divide-y divide-[#2A211C]/10 mb-4">
            {order.items.map((it, i) => (
              <li key={i} className="py-2.5 flex justify-between gap-4 text-[15px] font-sans">
                <span className="text-[#2B221D]">
                  {it.qty}× {it.name}
                  {it.modifiers.length > 0 && <span className="block text-[#5A524B] text-[12px]">{it.modifiers.map((m) => m.name).join(", ")}</span>}
                </span>
                <span className="text-[#2B221D] tabular-nums">{money(it.lineTotalPence)}</span>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-1.5 font-sans text-[14px] border-t border-[#2A211C]/10 pt-4">
            <div className="flex justify-between text-[#5A524B]"><dt>Subtotal</dt><dd className="tabular-nums">{money(order.subtotalPence)}</dd></div>
            {order.discountPence > 0 && <div className="flex justify-between text-[#3a6b2e]"><dt>Discount</dt><dd className="tabular-nums">−{money(order.discountPence)}</dd></div>}
            {order.fulfilment === "delivery" && <div className="flex justify-between text-[#5A524B]"><dt>Delivery</dt><dd className="tabular-nums">{money(order.deliveryFeePence)}</dd></div>}
            {order.giftCardPence > 0 && <div className="flex justify-between text-[#3a6b2e]"><dt>Gift card</dt><dd className="tabular-nums">−{money(order.giftCardPence)}</dd></div>}
            <div className="flex justify-between text-[#2B221D] text-[17px] font-medium pt-1.5 border-t border-[#2A211C]/10 mt-1"><dt>{order.giftCardPence > 0 ? "Paid by card" : "Total"}</dt><dd className="tabular-nums">{money(order.totalPence - order.giftCardPence)}</dd></div>
          </dl>
        </div>

        {!customer && (
          <div className="mt-8 bg-[#2A211C] text-[#F6F2EA] p-6 lg:p-8 text-center">
            <p className="font-serif text-[24px] mb-2">Create an account</p>
            <p className="text-[#F6F2EA]/70 font-sans text-[14px] mb-5">Track future orders, save your details, and reorder in a tap. We&apos;ll link this order to your account.</p>
            <Link href="/account/register" className="inline-flex items-center justify-center h-[48px] px-8 bg-[#B08A3E] text-[#2A211C] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#F6F2EA] transition-colors">
              Create account
            </Link>
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/order" className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-sans hover:text-[#B08A3E]">Order again</Link>
        </div>
      </div>
    </main>
  );
}
