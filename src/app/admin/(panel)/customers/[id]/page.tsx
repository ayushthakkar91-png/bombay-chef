import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { getCustomerProfile } from "@/lib/repositories/admin-customers";
import { ORDER_STATUS_LABEL } from "@/lib/ordering/constants";
import { STATUS_LABEL } from "@/lib/reservations/constants";
import { TIER_LABEL } from "@/lib/loyalty/constants";
import { formatInstantDate } from "@/lib/reservations/time";
import { flags } from "@/lib/flags";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { Badge } from "@/components/admin/primitives";
import { PointsAdjuster } from "@/components/admin/customers/PointsAdjuster";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export default async function AdminCustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("restaurant_manager");
  const { id } = await params;
  const c = await getCustomerProfile(id);

  if (!c) {
    return (<><PageHeader title="Customer" /><p className="text-sm text-body">Customer not found.</p></>);
  }

  const lifetime = c.orders.filter((o) => o.status !== "pending_payment" && o.status !== "cancelled").reduce((s, o) => s + o.totalPence, 0);

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-primary"><ArrowLeft className="h-4 w-4" /> All customers</Link>
      <PageHeader title={c.name ?? "Customer"} description={[c.email, c.phone].filter(Boolean).join(" · ")} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Stat label="Orders" value={c.orders.length} />
        <Stat label="Lifetime spend" value={money(lifetime)} />
        <Stat label="Reservations" value={c.reservations.length} />
        <Stat label="Addresses" value={c.addresses.length} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Marketing consent">
          <div className="flex gap-3 px-5 py-4">
            <Badge tone={c.marketingEmail ? "on" : "off"}>Email: {c.marketingEmail ? "Opted in" : "Not opted in"}</Badge>
            <Badge tone={c.marketingSms ? "on" : "off"}>SMS: {c.marketingSms ? "Opted in" : "Not opted in"}</Badge>
          </div>
        </Panel>

        {flags.loyalty && (
          <Panel title="Loyalty" description={c.loyalty ? `${TIER_LABEL[c.loyalty.tier]} · ${c.loyalty.pointsBalance} points (${c.loyalty.pointsLifetime} lifetime)` : "No points yet"}>
            <PointsAdjuster customerId={c.id} />
          </Panel>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Order history">
          {c.orders.length === 0 ? <p className="px-5 py-4 text-sm text-body">No orders.</p> : (
            <ul className="divide-y divide-sand">
              {c.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link href={`/admin/orders/history`} className="font-medium text-text hover:text-primary">{o.code}</Link>
                  <span className="text-body">{d(o.createdAt)} · {ORDER_STATUS_LABEL[o.status]} · {money(o.totalPence)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Reservation history">
          {c.reservations.length === 0 ? <p className="px-5 py-4 text-sm text-body">No reservations.</p> : (
            <ul className="divide-y divide-sand">
              {c.reservations.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-text">{r.locationName}</span>
                  <span className="text-body">{formatInstantDate(new Date(r.startsAt))} · party {r.partySize} · {STATUS_LABEL[r.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Saved addresses">
          {c.addresses.length === 0 ? <p className="px-5 py-4 text-sm text-body">No saved addresses.</p> : (
            <ul className="divide-y divide-sand">
              {c.addresses.map((a, i) => (
                <li key={i} className="px-5 py-3 text-sm text-text">
                  {[a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ")}
                  {a.isDefault && <Badge tone="accent">Default</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
