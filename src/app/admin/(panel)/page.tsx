import { AlertTriangle, ShoppingBag, CalendarDays, Gift, Award } from "lucide-react";

import { getStaffContext } from "@/lib/auth/dal";
import { getDashboardData } from "@/lib/repositories/dashboard";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { BarChart } from "@/components/admin/reports/charts";
import { StatusBadge } from "@/components/admin/StatusBadge";

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;
const KIND_ICON = { order: ShoppingBag, reservation: CalendarDays, giftcard: Gift, loyalty: Award } as const;
const at = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const [{ denied }, ctx, data] = await Promise.all([
    searchParams,
    getStaffContext(),
    // eslint-disable-next-line react-hooks/purity -- request-time boundary in a Server Component
    getDashboardData(Date.now()),
  ]);
  const firstName = ctx?.fullName?.split(" ")[0] ?? null;

  return (
    <>
      <PageHeader title={firstName ? `Welcome back, ${firstName}` : "Dashboard"} description="Today's service and the month at a glance." />

      {denied && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>You don&apos;t have permission for that area. Ask a manager if you think you should.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today's revenue" value={gbp(data.todayRevenuePence)} />
        <Stat label="Today's orders" value={data.todayOrders} />
        <Stat label="Today's reservations" value={data.todayReservations} />
        <Stat label="Active covers" value={data.todayCovers} hint="booked today" />
        <Stat label="Monthly revenue" value={gbp(data.monthRevenuePence)} hint="last 30 days" />
        <Stat label="Returning customers" value={data.returningCustomers} hint="2+ orders" />
        <Stat label="Loyalty members" value={data.loyaltyMembers} />
        <Stat label="Gift card sales" value={gbp(data.giftCardSalesPence)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Revenue · last 30 days">
          <div className="p-5"><BarChart data={data.revenueByDay} format={gbp} height={200} /></div>
        </Panel>

        <Panel title="Recent activity">
          {data.activity.length === 0 ? (
            <p className="px-5 py-6 text-sm text-body">Nothing yet today. New orders, bookings, gift cards and rewards will appear here.</p>
          ) : (
            <ul className="divide-y divide-sand">
              {data.activity.map((a, i) => {
                const Icon = KIND_ICON[a.kind];
                return (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass/10 text-brass"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{a.title}</p>
                      <p className="truncate text-xs text-body">{a.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {a.status && (a.kind === "order" || a.kind === "reservation") && <StatusBadge kind={a.kind} status={a.status} />}
                      <span className="text-[11px] text-body/70">{at(a.at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
