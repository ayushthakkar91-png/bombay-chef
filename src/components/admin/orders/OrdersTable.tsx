"use client";

import type { Order } from "@/lib/repositories/orders";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/ordering/constants";
import { Badge, EmptyState } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";
import { OrderActions } from "./OrderActions";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

const TONE: Record<OrderStatus, "neutral" | "on" | "off" | "accent"> = {
  pending_payment: "off",
  paid: "accent",
  accepted: "accent",
  preparing: "accent",
  ready_for_collection: "accent",
  out_for_delivery: "accent",
  completed: "on",
  cancelled: "off",
  refunded: "off",
};

function dt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function OrdersTable({ orders, locationId }: { orders: Order[]; locationId: string }) {
  if (orders.length === 0) {
    return <EmptyState title="No orders" description="No orders match this filter yet." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
      <table className="w-full border-collapse">
        <thead className="border-b border-sand bg-bg/40">
          <tr>
            <Th>Order</Th><Th>Placed</Th><Th>Type</Th><Th>Customer</Th><Th className="text-right">Total</Th><Th>Status</Th><Th className="w-px" />
          </tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-bg/30">
              <Td className="font-medium">{o.code}</Td>
              <Td className="text-body">{dt(o.placedAt ?? o.createdAt)}</Td>
              <Td className="capitalize text-body">{o.fulfilment}</Td>
              <Td className="text-body">{o.contactName ?? "—"}</Td>
              <Td className="text-right tabular-nums">{money(o.totalPence)}</Td>
              <Td><Badge tone={TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></Td>
              <Td className="text-right">
                <OrderActions order={{ id: o.id, locationId, status: o.status, fulfilment: o.fulfilment, totalPence: o.totalPence }} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
