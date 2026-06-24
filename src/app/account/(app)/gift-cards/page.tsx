import { requireCustomer } from "@/lib/auth/customer";
import { listMyGiftCards } from "@/lib/repositories/account";
import { GiftCardWallet } from "@/components/account/GiftCardWallet";

export default async function AccountGiftCardsPage() {
  const ctx = await requireCustomer();
  const cards = await listMyGiftCards(ctx.userId, ctx.email);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[#5A524B] font-sans text-[15px]">Gift cards you&apos;ve bought or received — with live balances to spend at checkout.</p>
      <GiftCardWallet cards={cards} />
    </div>
  );
}
