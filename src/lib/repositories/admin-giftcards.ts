import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

/** Admin gift card reads + reporting (RLS: restaurant_manager+). */

export type AdminGiftCard = {
  id: string;
  code: string;
  initialPence: number;
  balancePence: number;
  status: string;
  recipientName: string | null;
  recipientEmail: string | null;
  senderName: string | null;
  deliverAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

export async function listGiftCards(status?: string): Promise<AdminGiftCard[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase
    .from("gift_cards")
    .select("id, code, initial_pence, balance_pence, status, recipient_name, recipient_email, sender_name, deliver_at, delivered_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []).map((g) => ({
    id: g.id as string,
    code: g.code as string,
    initialPence: g.initial_pence as number,
    balancePence: g.balance_pence as number,
    status: g.status as string,
    recipientName: (g.recipient_name as string | null) ?? null,
    recipientEmail: (g.recipient_email as string | null) ?? null,
    senderName: (g.sender_name as string | null) ?? null,
    deliverAt: (g.deliver_at as string | null) ?? null,
    deliveredAt: (g.delivered_at as string | null) ?? null,
    createdAt: g.created_at as string,
  }));
}

export type GiftCardStats = {
  soldCount: number;
  revenuePence: number;
  redeemedPence: number;
  outstandingPence: number;
};

/** Sold = paid cards; revenue = their face value; redeemed = spent; outstanding = live liability. */
export async function getGiftCardStats(): Promise<GiftCardStats> {
  const supabase = await getUserClient();
  if (!supabase) return { soldCount: 0, revenuePence: 0, redeemedPence: 0, outstandingPence: 0 };
  const { data } = await supabase.from("gift_cards").select("status, initial_pence, balance_pence").limit(10000);

  let soldCount = 0, revenue = 0, redeemed = 0, outstanding = 0;
  for (const g of data ?? []) {
    const status = g.status as string;
    if (status === "pending") continue; // not yet paid
    const init = (g.initial_pence as number) ?? 0;
    const bal = (g.balance_pence as number) ?? 0;
    soldCount++;
    if (status === "active" || status === "redeemed") {
      revenue += init;
      redeemed += init - bal;
      if (status === "active") outstanding += bal;
    }
    // 'void' (disabled/refunded) excluded from revenue + liability.
  }
  return { soldCount, revenuePence: revenue, redeemedPence: redeemed, outstandingPence: outstanding };
}
