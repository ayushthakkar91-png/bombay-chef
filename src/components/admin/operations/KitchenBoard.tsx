"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { OrderDetail } from "@/lib/repositories/orders";
import { ORDER_STATUS_LABEL, type OrderStatus, type Fulfilment } from "@/lib/ordering/constants";
import { IDLE } from "@/lib/admin/validation";
import { setOrderStatus } from "@/app/admin/_actions/orders";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, EmptyState, SubmitButton, cx } from "@/components/admin/primitives";

function nextStep(status: OrderStatus, fulfilment: Fulfilment): { label: string; next: OrderStatus } | null {
  switch (status) {
    case "paid": return { label: "Accept", next: "accepted" };
    case "accepted": return { label: "Start preparing", next: "preparing" };
    case "preparing": return fulfilment === "delivery" ? { label: "Out for delivery", next: "out_for_delivery" } : { label: "Ready", next: "ready_for_collection" };
    case "ready_for_collection":
    case "out_for_delivery": return { label: "Complete", next: "completed" };
    default: return null;
  }
}

const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function KitchenBoard({ orders, locationId }: { orders: OrderDetail[]; locationId: string }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 12000);
    return () => clearInterval(id);
  }, [router]);

  if (orders.length === 0) return <EmptyState title="All clear" description="No live orders right now. New paid orders appear here automatically." />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => {
        const step = nextStep(o.status, o.fulfilment);
        return (
          <article key={o.id} className="flex flex-col rounded-xl border-2 border-sand bg-surface">
            <header className="flex items-center justify-between gap-2 border-b border-sand px-4 py-3">
              <div>
                <p className="text-lg font-bold text-text">{o.code}</p>
                <p className="text-xs text-body">{time(o.placedAt ?? o.createdAt)} · {o.fulfilment}</p>
              </div>
              <Badge tone={o.status === "paid" ? "off" : "accent"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
            </header>
            <ul className="flex-1 px-4 py-3 space-y-2">
              {o.items.map((it, i) => (
                <li key={i} className="text-[15px] leading-tight">
                  <span className="font-semibold text-text">{it.qty}×</span> <span className="text-text">{it.name}</span>
                  {it.modifiers.length > 0 && <span className="block pl-5 text-sm text-body">{it.modifiers.map((m) => m.name).join(", ")}</span>}
                  {it.notes && <span className="block pl-5 text-sm italic text-primary">“{it.notes}”</span>}
                </li>
              ))}
            </ul>
            {step && (
              <footer className="border-t border-sand p-3">
                <Advance order={{ id: o.id, locationId, status: o.status }} label={step.label} next={step.next} />
              </footer>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Advance({ order, label, next }: { order: { id: string; locationId: string; status: OrderStatus }; label: string; next: OrderStatus }) {
  const [state, action] = useActionState(setOrderStatus, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="locationId" value={order.locationId} />
      <input type="hidden" name="current" value={order.status} />
      <input type="hidden" name="status" value={next} />
      <SubmitButton className={cx("w-full !h-12 !text-base")} pendingLabel="…">{label}</SubmitButton>
    </form>
  );
}
