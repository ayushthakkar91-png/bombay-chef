import { getStaffContext } from "@/lib/auth/dal";
import { roleAtLeast } from "@/lib/auth/roles";
import { parseRange } from "@/lib/reports/range";
import { getSalesReport, getReservationsReport, getCustomersReport } from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

function csv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((cell) => { const s = String(cell); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))
    .join("\r\n");
}

/** GET /api/admin/reports/export?report=sales|reservations|customers&days=&loc= */
export async function GET(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx || !roleAtLeast(ctx.grants, "restaurant_manager")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") ?? "sales";
  const range = parseRange(searchParams.get("days") ?? undefined);
  const loc = searchParams.get("loc") ?? undefined;

  let rows: (string | number)[][] = [];
  if (report === "reservations") {
    const r = await getReservationsReport(range, loc);
    rows = [["Day", "Bookings"], ...r.byDay.map((d) => [d.label, d.value])];
  } else if (report === "customers") {
    const c = await getCustomersReport(range);
    rows = [["Customer", "Lifetime spend (GBP)", "Orders"], ...c.topCustomers.map((t) => [t.label, (t.value / 100).toFixed(2), (t.sub ?? "").replace(/[^0-9]/g, "")])];
  } else {
    const s = await getSalesReport(range, loc);
    rows = [["Day", "Revenue (GBP)", "Orders"], ...s.byDay.map((d, i) => [d.label, (d.value / 100).toFixed(2), s.ordersByDay[i]?.value ?? 0])];
  }

  const body = csv(rows);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="report-${report}-${range.days}d.csv"`,
    },
  });
}
