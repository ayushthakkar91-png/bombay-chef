import Link from "next/link";

import { getOrderingMenu } from "@/lib/repositories/ordering-menu";
import { getCustomer } from "@/lib/auth/customer";
import { getMyFavouriteIds } from "@/lib/repositories/account";
import { MenuBrowser } from "@/components/order/MenuBrowser";

export default async function OrderMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  const menu = loc ? await getOrderingMenu(loc) : null;
  const customer = await getCustomer();
  const favouriteIds = customer ? await getMyFavouriteIds(customer.userId) : [];

  if (!menu) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Menu unavailable</p>
        <p className="text-[#5A524B] font-sans text-[15px] mb-8">Please choose a location to start your order.</p>
        <Link href="/order" className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">
          Start an order
        </Link>
      </main>
    );
  }

  return <MenuBrowser menu={menu} locationSlug={loc as string} favouriteIds={favouriteIds} />;
}
