import { requireRole } from "@/lib/auth/dal";
import { listGiftCards, getGiftCardStats } from "@/lib/repositories/admin-giftcards";
import { gbp } from "@/lib/giftcards/constants";
import { PageHeader, Stat } from "@/components/admin/ui";
import { GiftCardsManager } from "@/components/admin/giftcards/GiftCardsManager";

const FILTERS = ["all", "active", "redeemed", "pending", "void"];

export default async function AdminGiftCardsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status ?? "") ? (sp.status as string) : "all";
  const [cards, stats] = await Promise.all([listGiftCards(status), getGiftCardStats()]);

  return (
    <>
      <PageHeader title="Gift cards" description="Sold cards, balances, and outstanding liability." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Cards sold" value={stats.soldCount} />
        <Stat label="Revenue" value={gbp(stats.revenuePence)} hint="face value sold" />
        <Stat label="Redeemed" value={gbp(stats.redeemedPence)} />
        <Stat label="Outstanding liability" value={gbp(stats.outstandingPence)} hint="unredeemed balance" />
      </div>

      <form method="get" className="my-5 flex items-center gap-2">
        <label htmlFor="status" className="text-sm text-body">Show</label>
        <select id="status" name="status" defaultValue={status} className="rounded-md border border-sand bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
          {FILTERS.map((f) => <option key={f} value={f} className="capitalize">{f === "all" ? "All cards" : f}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-sand px-3 py-2 text-sm text-body hover:bg-sand/50">Apply</button>
        <span className="ml-auto text-sm text-body">{cards.length} cards</span>
      </form>

      <GiftCardsManager giftCards={cards} />
    </>
  );
}
