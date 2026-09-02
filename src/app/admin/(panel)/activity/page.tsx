import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listRecentBaskets, listRecentEvents, listNotificationFailures } from "@/lib/repositories/orders";
import { PageHeader, Panel, Stat, Th, Td } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { money } from "@/lib/format";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/ordering/constants";

export const dynamic = "force-dynamic";

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const isTodayLondon = (iso: string) => {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(new Date(iso)) === f.format(new Date());
};

// Colour a status: paid/kitchen = green, abandoned = amber, cancelled/refunded = grey.
function statusTone(s: OrderStatus): string {
  if (s === "pending_payment") return "bg-amber-100 text-amber-800";
  if (s === "cancelled" || s === "refunded") return "bg-neutral-200 text-neutral-600";
  return "bg-emerald-100 text-emerald-800";
}

// Friendlier label for the event log.
const EVENT_LABEL: Record<string, string> = {
  ORDER_CREATED: "🛒 Basket → order started",
  PAYMENT_CONFIRMED: "✅ Payment confirmed",
  PAYMENT_FAILED: "❌ Payment failed",
  PAYMENT_AMOUNT_MISMATCH: "⚠️ Amount mismatch (flagged)",
  PAYMENT_REFUNDED: "↩️ Refunded",
  ORDER_STATUS_CHANGED: "🔄 Status changed",
  STAFF_ACKNOWLEDGED: "👨‍🍳 Staff accepted",
  TELEGRAM_NOTIFICATION_CREATED: "📲 Telegram queued",
  TELEGRAM_NOTIFICATION_SENT: "📲 Telegram sent",
  TELEGRAM_NOTIFICATION_FAILED: "📵 Telegram failed",
  GIFT_CARD_SHORTFALL: "⚠️ Gift-card shortfall",
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (<><PageHeader title="Activity" /><p className="text-sm text-body">No locations are assigned to your account yet.</p></>);
  }
  const locId = scoped.find((l) => l.slug === sp.loc || l.id === sp.loc)?.id ?? scoped[0].id;

  const [baskets, events, failures] = await Promise.all([
    listRecentBaskets(locId, 50),
    listRecentEvents(locId, 60),
    listNotificationFailures(locId),
  ]);

  const today = baskets.filter((b) => isTodayLondon(b.createdAt));
  const abandoned = baskets.filter((b) => b.abandoned);
  const paidish = baskets.filter((b) => !b.abandoned && b.status !== "cancelled" && b.status !== "refunded");
  const paymentIssues = events.filter((e) => e.type === "PAYMENT_FAILED" || e.type === "PAYMENT_AMOUNT_MISMATCH");
  const conversion = baskets.length ? Math.round((paidish.length / baskets.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Activity & logs"
        description="What visitors added to their basket, what completed, and anything going wrong."
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Baskets today" value={today.length} />
        <Stat label="Completed (paid+)" value={paidish.length} hint={`${conversion}% of recent baskets`} />
        <Stat label="Abandoned (unpaid)" value={abandoned.length} hint="Started checkout, never paid" />
        <Stat label="Issues" value={failures.length + paymentIssues.length} hint="Failed notifications + payment errors" />
      </div>

      {(failures.length > 0 || paymentIssues.length > 0) && (
        <Panel title="⚠️ Site issues" description="Fix these — they mean an order or alert didn't go through." className="mb-6">
          <div className="divide-y divide-sand">
            {paymentIssues.slice(0, 10).map((e, i) => (
              <div key={`p${i}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="text-text">Order {e.code} — {EVENT_LABEL[e.type] ?? e.type}</span>
                <span className="text-body/70">{time(e.createdAt)}</span>
              </div>
            ))}
            {failures.map((f, i) => (
              <div key={`f${i}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="text-text">Order {f.code} — {f.channel} alert failed ({f.attempts} tries)</span>
                <span className="max-w-[45%] truncate text-body/70" title={f.lastError ?? ""}>{f.lastError ?? "—"}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Recent baskets" description="Newest first. Amber = abandoned (added items, never paid)." className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-sand">
              <tr><Th>When</Th><Th>Status</Th><Th>Customer</Th><Th>Items added</Th><Th>Type</Th><Th className="text-right">Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {baskets.length === 0 && (
                <tr><Td className="text-body/70">No activity yet.</Td><Td /><Td /><Td /><Td /><Td /></tr>
              )}
              {baskets.map((b) => {
                const items = b.items.map((it) => `${it.qty}× ${it.name}`).join(", ");
                return (
                  <tr key={b.id}>
                    <Td className="whitespace-nowrap text-body">{time(b.createdAt)}</Td>
                    <Td><span className={`rounded px-2 py-0.5 text-xs font-medium ${statusTone(b.status)}`}>{b.abandoned ? "Abandoned" : ORDER_STATUS_LABEL[b.status]}</span></Td>
                    <Td className="whitespace-nowrap">{b.contactName ?? "—"}</Td>
                    <Td className="max-w-[320px]"><span className="line-clamp-2 text-body">{items || "—"}</span></Td>
                    <Td className="capitalize text-body">{b.fulfilment}</Td>
                    <Td className="text-right tabular-nums">{money(b.totalPence)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Event log" description="Raw order events, newest first — the technical trail.">
        <div className="max-h-[420px] divide-y divide-sand overflow-y-auto">
          {events.length === 0 && <p className="px-5 py-4 text-sm text-body/70">No events yet.</p>}
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
              <span className="text-text">{EVENT_LABEL[e.type] ?? e.type}</span>
              <span className="flex items-center gap-3 text-body/70">
                <span className="font-mono text-xs">{e.code}</span>
                <span className="whitespace-nowrap">{time(e.createdAt)}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
