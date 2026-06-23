"use client";

import { useActionState, useState } from "react";

import { IDLE } from "@/lib/admin/validation";
import { setOrderStatus, refundOrder } from "@/app/admin/_actions/orders";
import type { OrderStatus, Fulfilment } from "@/lib/ordering/constants";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Button, Field, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";

type OrderLike = { id: string; locationId: string; status: OrderStatus; fulfilment: Fulfilment; totalPence: number };

function primaryAction(status: OrderStatus, fulfilment: Fulfilment): { label: string; next: OrderStatus } | null {
  switch (status) {
    case "paid": return { label: "Accept", next: "accepted" };
    case "accepted": return { label: "Start preparing", next: "preparing" };
    case "preparing":
      return fulfilment === "delivery"
        ? { label: "Out for delivery", next: "out_for_delivery" }
        : { label: "Mark ready", next: "ready_for_collection" };
    case "ready_for_collection":
    case "out_for_delivery":
      return { label: "Complete", next: "completed" };
    default:
      return null;
  }
}

const REFUNDABLE: OrderStatus[] = ["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"];

export function OrderActions({ order }: { order: OrderLike }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const primary = primaryAction(order.status, order.fulfilment);
  const canRefund = REFUNDABLE.includes(order.status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary && <StatusButton order={order} label={primary.label} next={primary.next} />}
      {canRefund && (
        <Button variant="danger" onClick={() => setRefundOpen(true)}>
          {order.status === "paid" ? "Reject & refund" : "Refund"}
        </Button>
      )}
      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Refund order" description="Issue a Stripe refund. Leave the amount blank for a full refund.">
        <RefundForm order={order} onDone={() => setRefundOpen(false)} />
      </Modal>
    </div>
  );
}

function StatusButton({ order, label, next }: { order: OrderLike; label: string; next: OrderStatus }) {
  const [state, action] = useActionState(setOrderStatus, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="locationId" value={order.locationId} />
      <input type="hidden" name="current" value={order.status} />
      <input type="hidden" name="status" value={next} />
      <SubmitButton pendingLabel="…">{label}</SubmitButton>
    </form>
  );
}

function RefundForm({ order, onDone }: { order: OrderLike; onDone: () => void }) {
  const [state, action] = useActionState(refundOrder, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="locationId" value={order.locationId} />
      <Field label="Amount (£)" htmlFor="amt" hint={`Blank = full refund of £${(order.totalPence / 100).toFixed(2)}.`}>
        <TextInput id="amt" name="amountGbp" type="number" step="0.01" min="0" placeholder={(order.totalPence / 100).toFixed(2)} />
      </Field>
      <Field label="Reason" htmlFor="rsn">
        <Textarea id="rsn" name="reason" placeholder="Why is this being refunded?" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <SubmitButton variant="danger" pendingLabel="Refunding…">Issue refund</SubmitButton>
      </div>
    </form>
  );
}
