"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { OrderDetail } from "@/lib/repositories/orders";
import type { OrderStatus } from "@/lib/ordering/constants";
import { EmptyState } from "@/components/admin/primitives";
import { useNow } from "@/components/admin/useNow";
import { OrderActions } from "./OrderActions";

import { money } from "@/lib/format";

/**
 * The kitchen queue.
 *
 * Staff are standing up, mid-service, glancing at this between tasks. It has to
 * answer one question in a single look: what do I do next. So orders are split
 * by the stage they are waiting on, oldest first within each stage, and
 * numbered in the order they should be worked. How long an order has been
 * waiting is the loudest thing on the card, because that is what turns a fine
 * service into a complaint.
 */

type Stage = "new" | "cooking" | "ready";

const STAGE: Record<Stage, { title: string; hint: string }> = {
  new: { title: "Accept these first", hint: "Paid — the customer is waiting to hear back." },
  cooking: { title: "In the kitchen", hint: "Accepted, being made now." },
  ready: { title: "Ready", hint: "Waiting for collection or a driver." },
};

function stageOf(status: OrderStatus): Stage {
  if (status === "paid") return "new";
  if (status === "accepted" || status === "preparing") return "cooking";
  return "ready";
}

/** Minutes since the order was placed. */
function waitedMinutes(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

/**
 * Escalation by wait: fine / getting on / chase it. Only three steps, because
 * anything finer is noise at a glance. An unaccepted order turns amber far
 * sooner than one already cooking — nobody minds waiting for food, they mind
 * silence.
 */
function urgency(mins: number, stage: Stage): { cls: string; late: boolean } {
  const limit = stage === "new" ? 5 : 20;
  if (mins >= limit * 3) return { cls: "bg-[#fbe9e7] text-[#8a2208] ring-1 ring-[#8a2208]/20", late: true };
  if (mins >= limit) return { cls: "bg-[#fdf1dd] text-[#7a5312] ring-1 ring-[#7a5312]/20", late: false };
  return { cls: "bg-sand text-body", late: false };
}

/**
 * A wait, in words someone can act on.
 *
 * "9577m · late" was on screen for orders left over from testing. A number
 * that large reads as a glitch, and a glitch is ignored — including on the
 * order that genuinely has been sitting for forty minutes.
 */
function waitLabel(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days`;
}

/** Date and time in full, for the details panel. */
function fullStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** One label/value row in the details panel. */
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right font-medium tabular-nums text-text">{value}</dd>
    </div>
  );
}

function clockLabel(iso: string): string {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(d);
  // The date only when it is not today. On a normal service every order is
  // from today and the date is noise; on a screen still holding last week's
  // orders, "20:01" alone is actively misleading.
  const today = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short" });
  if (today.format(d) === today.format(new Date())) return time;
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short" }).format(d)}, ${time}`;
}

export function LiveOrders({ orders, locationId }: { orders: OrderDetail[]; locationId: string }) {
  const router = useRouter();
  // null until mounted: the wait is measured against the viewer's clock, and
  // rendering it on the server would hydrate with a different number.
  const now = useNow();

  // Pull new orders in. Separate from the clock above: one is this screen
  // asking the server what changed, the other is time passing.
  useEffect(() => {
    const refresh = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(refresh);
  }, [router]);

  if (orders.length === 0) {
    return <EmptyState title="Nothing in the kitchen" description="Paid orders appear here the moment they arrive, oldest first." />;
  }

  // listLiveOrders already returns oldest first, which is the order to work in.
  const groups = (["new", "cooking", "ready"] as Stage[])
    .map((stage) => ({ stage, orders: orders.filter((o) => stageOf(o.status) === stage) }))
    .filter((g) => g.orders.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ stage, orders: group }) => (
        <section key={stage}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold text-text">{STAGE[stage].title}</h2>
            <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold tabular-nums text-body">{group.length}</span>
            <p className="hidden text-xs text-body sm:block">{STAGE[stage].hint}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {group.map((o, i) => {
              const address = o.deliveryAddress as { line1?: string; line2?: string; city?: string; postcode?: string } | null;
              const placed = o.placedAt ?? o.createdAt;
              const mins = now == null ? null : waitedMinutes(placed, now);
              const urg = mins == null ? null : urgency(mins, stage);
              const delivery = o.fulfilment === "delivery";

              return (
                <article key={o.id} className="flex flex-col rounded-lg border border-sand bg-surface">
                  <header className="flex items-start justify-between gap-3 px-4 pt-3">
                    <div className="flex items-center gap-2.5">
                      {/* Position in the queue. The number is the instruction. */}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold tabular-nums text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold tabular-nums text-text">{o.code}</p>
                        <p className="text-xs text-body">
                          <span className={delivery ? "font-semibold text-primary" : undefined}>{delivery ? "Delivery" : "Collection"}</span>
                          {" · "}
                          {clockLabel(placed)}
                        </p>
                      </div>
                    </div>
                    {urg && mins !== null && (
                      <span className={"shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums " + urg.cls}>
                        {waitLabel(mins)}{urg.late ? " · late" : ""}
                      </span>
                    )}
                  </header>

                  <div className="flex-1 px-4 py-3">
                    <ul className="flex flex-col gap-1.5">
                      {o.items.map((it, n) => (
                        <li key={n} className="flex gap-2 text-[15px] leading-snug">
                          <span className="min-w-[1.75rem] shrink-0 font-semibold tabular-nums text-primary">{it.qty}&times;</span>
                          <span className="text-text">
                            {it.name}
                            {it.modifiers.length > 0 && <span className="block text-xs text-body">{it.modifiers.map((m) => m.name).join(", ")}</span>}
                            {it.notes && <span className="block text-xs italic text-body">&ldquo;{it.notes}&rdquo;</span>}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {o.notes && <p className="mt-2.5 rounded-md bg-[#fdf1dd] px-2.5 py-1.5 text-xs text-[#7a5312]">Note: {o.notes}</p>}

                    <p className="mt-2.5 text-xs text-body">
                      {o.contactName}
                      {o.contactPhone ? " · " + o.contactPhone : ""}
                    </p>
                    {delivery && address && (
                      <p className="mt-0.5 text-xs text-body">{[address.line1, address.line2, address.city, address.postcode].filter(Boolean).join(", ")}</p>
                    )}

                    {/* The rest of the order, folded away.
                        The card is built for a glance mid-service, so the
                        breakdown and the email are not on it by default — but
                        they were nowhere at all, which left no way to answer
                        "what did they actually pay?" without the database.
                        <details> keeps that one tap away and costs no JS. */}
                    <details className="group mt-2.5">
                      <summary className="cursor-pointer list-none text-xs font-medium text-primary hover:underline">
                        <span className="group-open:hidden">Full order</span>
                        <span className="hidden group-open:inline">Hide details</span>
                      </summary>
                      <dl className="mt-2 flex flex-col gap-1 border-t border-sand pt-2 text-xs text-body">
                        <Line label="Placed" value={fullStamp(placed)} />
                        {o.contactEmail && <Line label="Email" value={o.contactEmail} />}
                        <Line label="Subtotal" value={money(o.subtotalPence)} />
                        {o.deliveryFeePence > 0 && <Line label="Delivery" value={money(o.deliveryFeePence)} />}
                        {o.discountPence > 0 && (
                          <Line label={`Discount${o.promoCode ? ` (${o.promoCode})` : ""}`} value={`−${money(o.discountPence)}`} />
                        )}
                        <Line label="Total" value={money(o.totalPence)} />
                        <Line label="Payment" value={o.isCash ? "Cash — not yet collected" : "Paid online"} />
                        <Line label="Status" value={o.status.replace(/_/g, " ")} />
                      </dl>
                    </details>
                  </div>

                  <footer className="flex items-center justify-between gap-2 border-t border-sand px-4 py-2.5">
                    {/* Whether the money is in. An order sitting at status
                        "paid" reads as already paid for, and that is how food
                        goes out of the door with the cash still in a pocket. */}
                    {o.isCash ? (
                      <span className="rounded-md bg-[#fdf1dd] px-2 py-1 text-sm font-semibold tabular-nums text-[#7a5312]">
                        Collect {money(o.totalPence)} cash
                      </span>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums text-text">{money(o.totalPence)} paid</span>
                    )}
                    <OrderActions order={{ id: o.id, locationId, status: o.status, fulfilment: o.fulfilment, totalPence: o.totalPence }} />
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
