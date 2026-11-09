import { requireCustomer } from "@/lib/auth/customer";
import { notFound } from "next/navigation";
import { flags } from "@/lib/flags";
import { listMyGiftCards } from "@/lib/repositories/account";
import { GiftCardWallet } from "@/components/account/GiftCardWallet";

export default async function AccountGiftCardsPage() {
  // Gift cards are switched off (NEXT_PUBLIC_FEATURE_GIFTCARDS). Hide the page
  // entirely rather than leaving a reachable URL for a product that is not for sale.
  if (!flags.giftCards) notFound();
  const ctx = await requireCustomer();
  const cards = await listMyGiftCards(ctx.userId, ctx.email);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[#5A524B] font-sans text-[15px]">Gift cards you&apos;ve bought or received — with live balances to spend at checkout.</p>
      <GiftCardWallet cards={cards} />
    </div>
  );
}
