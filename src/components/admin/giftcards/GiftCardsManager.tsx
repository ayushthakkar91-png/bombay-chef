"use client";

import { useActionState } from "react";

import type { AdminGiftCard } from "@/lib/repositories/admin-giftcards";
import { IDLE } from "@/lib/admin/validation";
import { gbp } from "@/lib/giftcards/constants";
import { resendGiftCardAction, disableGiftCardAction, refundGiftCardAction } from "@/app/admin/_actions/giftcards";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Button, EmptyState } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const TONE: Record<string, "neutral" | "on" | "off" | "accent"> = { pending: "accent", active: "on", redeemed: "neutral", void: "off" };
const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export function GiftCardsManager({ giftCards }: { giftCards: AdminGiftCard[] }) {
  if (giftCards.length === 0) return <EmptyState title="No gift cards" description="Purchased gift cards will appear here." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
      <table className="w-full border-collapse">
        <thead className="border-b border-sand bg-bg/40">
          <tr><Th>Code</Th><Th>Recipient</Th><Th className="text-right">Value</Th><Th className="text-right">Balance</Th><Th>Status</Th><Th>Created</Th><Th className="w-px" /></tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {giftCards.map((g) => (
            <tr key={g.id} className="hover:bg-bg/30">
              <Td><code className="rounded bg-bg px-1.5 py-0.5 text-xs">{g.code}</code></Td>
              <Td>
                <div className="text-sm">{g.recipientName ?? "—"}</div>
                <div className="text-xs text-body">{g.recipientEmail}</div>
              </Td>
              <Td className="text-right tabular-nums">{gbp(g.initialPence)}</Td>
              <Td className="text-right tabular-nums font-medium">{gbp(g.balancePence)}</Td>
              <Td><Badge tone={TONE[g.status] ?? "neutral"}>{g.status}</Badge></Td>
              <Td className="text-body">{dt(g.createdAt)}</Td>
              <Td className="text-right"><RowActions card={g} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({ card }: { card: AdminGiftCard }) {
  const canResend = card.status === "active" || card.status === "redeemed";
  const canDisable = card.status === "active" || card.status === "pending";
  const canRefund = card.status === "active" && card.balancePence > 0;
  return (
    <div className="flex justify-end gap-1">
      {canResend && <ActionForm action={resendGiftCardAction} id={card.id} label="Resend" />}
      {canRefund && <ActionForm action={refundGiftCardAction} id={card.id} label="Refund" variant="danger" confirm={`Refund the £${(card.balancePence / 100).toFixed(2)} balance and void this card?`} />}
      {canDisable && <ActionForm action={disableGiftCardAction} id={card.id} label="Disable" variant="ghost" confirm="Disable this gift card? It can no longer be redeemed." />}
    </div>
  );
}

function ActionForm({ action, id, label, variant = "ghost", confirm }: { action: (p: typeof IDLE, f: FormData) => Promise<typeof IDLE>; id: string; label: string; variant?: "ghost" | "danger"; confirm?: string }) {
  const [state, formAction] = useActionState(action, IDLE);
  useActionResult(state);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant={variant}>{label}</Button>
    </form>
  );
}
