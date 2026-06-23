"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { OrderDetail } from "@/lib/repositories/orders";
import { ORDER_STATUS_LABEL } from "@/lib/ordering/constants";
import { Badge, EmptyState } from "@/components/admin/primitives";
import { OrderActions } from "./OrderActions";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function LiveOrders({ orders, locationId }: { orders: OrderDetail[]; locationId: string }) {
  const router = useRouter();

  // Poll for new/changed orders.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [router]);

  if (orders.length === 0) {
    return <EmptyState title="No live orders" description="New paid orders will appear here automatically." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => {
        const address = o.deliveryAddress as { line1?: string; line2?: string; city?: string; postcode?: string } | null;
        return (
          <article key={o.id} className="flex flex-col rounded-lg border border-sand bg-surface">
            <header className="flex items-center justify-between gap-2 border-b border-sand px-4 py-3">
              <div>
                <p className="font-semibold text-text">{o.code}</p>
                <p className="text-xs text-body">{timeLabel(o.placedAt ?? o.createdAt)} · {o.fulfilment}</p>
              </div>
              <Badge tone={o.status === "paid" ? "off" : "accent"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
            </header>

            <div className="flex-1 px-4 py-3">
              <ul className="mb-3 flex flex-col gap-1.5 text-sm">
                {o.items.map((it, i) => (
                  <li key={i}>
                    <span className="font-medium text-text">{it.qty}× {it.name}</span>
                    {it.modifiers.length > 0 && <span className="block text-xs text-body">{it.modifiers.map((m) => m.name).join(", ")}</span>}
                    {it.notes && <span className="block text-xs italic text-body">“{it.notes}”</span>}
                  </li>
                ))}
              </ul>
              <div className="text-xs text-body">
                <p className="font-medium text-text">{o.contactName} · {o.contactPhone}</p>
                {o.fulfilment === "delivery" && address && (
                  <p className="mt-0.5">{[address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(", ")}</p>
                )}
                {o.notes && <p className="mt-1 italic">Note: {o.notes}</p>}
              </div>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-sand px-4 py-3">
              <span className="text-sm font-semibold tabular-nums text-text">{money(o.totalPence)}</span>
              <OrderActions order={{ id: o.id, locationId, status: o.status, fulfilment: o.fulfilment, totalPence: o.totalPence }} />
            </footer>
          </article>
        );
      })}
    </div>
  );
}
