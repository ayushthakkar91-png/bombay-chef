import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";
import { issueBirthdayVoucher } from "@/lib/loyalty/service";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { flags } from "@/lib/flags";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/loyalty — daily birthday rewards. Finds customers whose birthday
 * is today (London), mints a one-per-year birthday voucher, and emails it.
 * Protected by CRON_SECRET (same scheme as the reservations cron). Schedule once
 * a day. The email outbox is dispatched by the reservations cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!flags.loyalty) return NextResponse.json({ ok: true, skipped: "loyalty disabled" });

  const service = getServiceClient();
  if (!service) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const yearStartISO = new Date(`${year}-01-01T00:00:00Z`).toISOString();

  const { data: customers } = await service.from("customers").select("id, birthday").not("birthday", "is", null);

  let issued = 0;
  for (const c of customers ?? []) {
    const birthday = c.birthday as string; // yyyy-mm-dd
    const [, bm, bd] = birthday.split("-");
    if (bm !== month || bd !== day) continue;

    const code = await issueBirthdayVoucher(c.id as string, yearStartISO);
    if (!code) continue; // already issued this year

    const { data: u } = await service.auth.admin.getUserById(c.id as string);
    const email = u?.user?.email;
    if (!email) continue;
    const { data: p } = await service.from("profiles").select("full_name").eq("id", c.id).maybeSingle();

    await enqueueEmail({
      template: "loyalty_birthday",
      to: email,
      toName: (p?.full_name as string) ?? undefined,
      customerId: c.id as string,
      payload: { guestName: (p?.full_name as string) ?? undefined, code },
    });
    issued++;
  }

  return NextResponse.json({ ok: true, issued });
}
